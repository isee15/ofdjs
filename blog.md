# 用 JavaScript 打开中国的版式文档：@sharp9/ofdjs 诞生记

## OFD 是什么？

如果你在中国做过电子发票、政务系统或者企业文档管理，你一定见过 `.ofd` 文件。OFD（Open Fixed Document，开放版式文档）是中国版式文档国家标准 **GB/T 33190-2016**，定位类似于 PDF——一种固定排版、不可编辑的电子文档格式。

现实中，OFD 已经广泛用于：

- 🧾 **电子发票**——中国全面数字化发票改革后，大量发票以 OFD 格式下发
- 🏛 **政务文档**——公文、审批单、证照等
- 📋 **商业表单**——合同、报表、签章文件

但和 PDF 不同的是，OFD 在 JavaScript 生态中几乎没有可用的解析库。开发者面对一堆 OFD 文件，要么用 Java/C# 的官方 SDK，要么手动解压 ZIP 看 XML——**浏览器里什么也做不了**。

这就是 `@sharp9/ofdjs` 要解决的问题。

---

## 设计目标

三个核心原则驱动了这个库的设计：

### 1. 浏览器优先，Node.js 兼容

OFD 文件最常见的场景是用户在浏览器里上传/预览。所以 Canvas2D 是渲染的核心路径。Node.js 路径通过 `node-canvas` + `linkedom` polyfill 实现，用于服务端批量导出 PNG。

### 2. ESM-only，零构建

没有 webpack rollup babel。源码就是 ES Module，浏览器直接 `<script type="module">` 加载，Vite/Webpack 项目直接 import。整个库 **8 个文件，无构建步骤**：

```
src/
  index.js         — 公开 API 入口
  ofd.js           — OFD.xml 根节点解析
  document.js      — Document.xml + 资源解析
  elements.js      — 页面元素类型
  page.js          — Page.xml 解析
  render.js        — Canvas2D 渲染
  types.js         — 坐标辅助（mm→px、Box、Color、Matrix）
  xml-parser.js    — DOMParser 多态填充 + XML 工具
  path-resolver.js — ZIP 路径解析
```

### 3. API 极简

不暴露 XML 解析细节，不暴露中间数据结构。用户只需要知道 7 个函数：

```js
import { readOfd, renderPageToCanvas, getPageCount, getPageDimensions } from '@sharp9/ofdjs';
```

---

## OFD 文件内部结构

一个 `.ofd` 文件本质是一个 **ZIP 压缩包**，内部是 XML 描述 + 嵌入资源：

```
invoice.ofd (ZIP)
├── OFD.xml              — 根入口，指向 DocBody
├── Doc_0/
│   ├── Document.xml     — 文档元数据 + 页面列表
│   ├── PublicRes.xml    — 公共字体资源
│   ├── DocumentRes.xml  — 图片/多媒体资源
│   ├── Pages/
│   │   ├── Page_0.xml   — 第 1 页内容
│   │   └── Page_1.xml   — 第 2 页内容
│   ├── Signs/
│   │   └── Sign_0.xml   — 签章/印章
│   └── Res/             — 嵌入图片 (PNG/JPG)
│       ├── image1.png
│       └── seal.jpg
│   └── Template/
│       └── Content.xml  — 模板页面（表格背景）
```

解析管线：

```
readOfd(file)
  → JSZip.loadAsync()     // 解压 ZIP
  → parseOfdXml()          // OFD.xml → DocBody → DocRoot
  → parseDocumentXml()     // Document.xml → 页面列表 + 资源引用
  → parsePublicResXml()    // 字体定义
  → parseDocumentResXml()  // 图片资源索引
  → preloadImages()        // 提取 ZIP 中的图片，创建 Image 对象
  → 返回 Ofd 对象
```

所有图片在解析阶段就预加载到 `Ofd.images` Map 中，渲染阶段是纯同步操作——不会在 Canvas 绘制中途异步等待图片加载。

---

## 渲染：从 OFD XML 到 Canvas 像素

OFD 页面由三种视觉元素组成：

### TextObject——文字

这是最复杂的部分。OFD 的文字定位不是简单的「左上角 + 字号」，而是包含：

| 属性 | 说明 |
|------|------|
| `Boundary` | 文字区域边界（mm 单位） |
| `ReadDirection` | 阅读方向：0=从左到右，90=竖排，180=从右到左 |
| `CharDirection` | 单字符旋转角度 |
| `DeltaX/DeltaY` | 逐字符偏移量，支持 `g N X` 批量缩写语法 |
| `HScale` | 水平缩放比例 |
| `Weight` | 字重（粗体） |
| `Italic` | 斜体 |
| `Alpha` | 透明度 |
| `CTM` | 坐标变换矩阵 |
| `Stroke` | 描边属性（颜色 + 线宽） |

一个典型的竖排发票文字块：

```xml
<TextObject ReadDirection="90" Boundary="28.5 52.08 5.95 40.18">
  <TextCode X="0" Y="0" DeltaY="g 6 5.95">密码区文字</TextCode>
</TextObject>
```

`DeltaY="g 6 5.95"` 意思是：接下来的 6 个字符，每个 Y 偏移 5.95mm（竖排逐字换行）。这种 `g N X` 批量缩写是 OFD 规范独有的，解析器必须正确展开。

渲染时，我们逐字符计算位置：

```js
// render.js 核心逻辑（简化）
for (let i = 0; i < text.length; i++) {
  const dx = expandDelta(deltaX, i);  // 展开 "g N X" 语法
  const dy = expandDelta(deltaY, i);
  x += dx * (readDir === 90 ? -1 : 1);
  y += dy * (readDir === 90 ? 1 : -1);
  ctx.fillText(text[i], px(x), px(y));
}
```

### PathObject——路径/图形

当前版本将 PathObject 渲染为基于 `Boundary` 的矩形。OFD 规范中的 `AbbreviatedData`（类似 SVG path 的命令序列）尚未解析，这是后续版本的改进方向。

### ImageObject——图片

从 ZIP 中提取 PNG/JPG 二进制数据，创建 Image 对象后绘制到 Canvas：

```js
ctx.drawImage(img, boundaryX, boundaryY, boundaryW, boundaryH);
```

---

## 模板页面：表单的秘密

OFD 文档大量使用**模板页面**（Template Page）来实现表格布局。一张发票的背景表格线通常是模板层，实际数据是内容层，通过 `ZOrder` 决定叠加顺序：

```xml
<Page>
  <Template TemplateID="0" ZOrder="Background"/>
  <Content Layer="...">
    <TextObject ...>开票日期</TextObject>
    <TextObject ...>金额</TextObject>
  </Content>
</Page>
```

渲染时，先画模板（表格线），再画内容（文字数据），这和真实发票的视觉层次完全一致。

---

## 快速上手

### 安装

```bash
npm install @sharp9/ofdjs
```

Node.js 渲染还需要可选依赖：

```bash
npm install canvas linkedom   # 服务端渲染
```

### 浏览器使用

```html
<script src="https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js"></script>

<script type="module">
  import { readOfd, renderPageToCanvas, getPageCount } from '@sharp9/ofdjs';

  const fileInput = document.querySelector('#ofd-file');
  const canvas = document.querySelector('#ofd-canvas');

  fileInput.addEventListener('change', async (e) => {
    const ofd = await readOfd(e.target.files[0]);
    await renderPageToCanvas(ofd, 0, canvas, { dpi: 150 });
  });
</script>
```

7 行代码，一个 OFD 预览器。

### Node.js 使用

```js
import { initDOMParser } from '@sharp9/ofdjs/xml-parser.js';
import { readOfd, renderPageToCanvas, exportOfdToPng } from '@sharp9/ofdjs';
import { createCanvas } from 'canvas';
import fs from 'fs';

await initDOMParser();  // 初始化 DOMParser polyfill

const buffer = fs.readFileSync('发票.ofd');
const ofd = await readOfd(new Uint8Array(buffer));

const dims = await getPageDimensions(ofd, 0);
const canvas = createCanvas(
  Math.round(dims.width * 96 / 25.4),
  Math.round(dims.height * 96 / 25.4)
);
await renderPageToCanvas(ofd, 0, canvas, { dpi: 96 });

fs.writeFileSync('page0.png', canvas.toBuffer('image/png'));
```

### React 示例

```jsx
import { useState, useRef } from 'react';
import { readOfd, renderPageToCanvas, getPageCount, getPageDimensions } from '@sharp9/ofdjs';

function OfdViewer() {
  const [ofd, setOfd] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const canvasRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ofdData = await readOfd(file);
    setOfd(ofdData);
    setPageIndex(0);
  };

  React.useEffect(() => {
    if (ofd && canvasRef.current) {
      renderPageToCanvas(ofd, pageIndex, canvasRef.current, { dpi: 150 });
    }
  }, [ofd, pageIndex]);

  return (
    <div>
      <input type="file" accept=".ofd" onChange={handleFile} />
      <canvas ref={canvasRef} />
    </div>
  );
}
```

### Vue 3 示例

```vue
<template>
  <input type="file" accept=".ofd" @change="handleFile" />
  <canvas ref="canvasRef" />
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { readOfd, renderPageToCanvas } from '@sharp9/ofdjs';

const ofd = ref(null);
const canvasRef = ref(null);

async function handleFile(e) {
  ofd.value = await readOfd(e.target.files[0]);
}

watch(ofd, async () => {
  if (!ofd.value) return;
  await nextTick();  // 等 Vue 完成 DOM 更新
  await renderPageToCanvas(ofd.value, 0, canvasRef.value, { dpi: 150 });
});
</script>
```

> ⚠️ Vue 的注意点：由于 `<canvas>` 通过 `v-if` 条件渲染，watch 触发时 DOM 可能还未挂载。必须用 `await nextTick()` 等 Vue 完成 DOM 更新后再渲染。

---

## API 一览

| 函数 | 说明 |
|------|------|
| `readOfd(source)` | 解析 OFD 文件，source 支持 File、Blob、ArrayBuffer 或 URL |
| `renderPageToCanvas(ofd, pageIndex, canvas, options?)` | 渲染指定页到 Canvas |
| `renderOfdToCanvas(ofd, canvas, options?)` | 依次渲染所有页 |
| `exportOfdToPng(ofd, pageIndex?, options?)` | 导出页为 PNG Blob |
| `getPageCount(ofd)` | 获取页数 |
| `getPageDimensions(ofd, pageIndex?)` | 获取页面尺寸（mm） |
| `initDOMParser()` | Node.js ESM 环境 DOMParser 初始化 |

渲染选项：

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `dpi` | 97 | 每英寸点数，用于 mm → px 转换 |
| `scale` | 1 | 附加缩放因子 |

---

## 当前限制与路线图

这是一个 v0.1.0——能用的，但还没做到完美：

| 限制 | 计划 |
|------|------|
| `AbbreviatedData` 未解析，PathObject 仅渲染矩形 | v0.2：完整 SVG-like 路径解析 |
| CTM 未应用于 PathObject | v0.2：矩阵变换支持 |
| JBIG2/TIFF/BMP 图片不支持 | 后续：格式扩展 |
| 仅支持 ESM，不支持 CJS/require() | 考虑提供 CJS bundle |
| Node.js 中文字体回退 sans-serif | 建议用户自行注册字体路径 |

---

## 为什么做这个库？

中国的电子发票全面推广后，OFD 格式的使用量急剧增长。但开发者在 JavaScript 生态中面对 OFD 文件几乎束手无策——没有可用的解析库，没有可用的渲染方案，浏览器里打不开，Node.js 里导不出来。

`@sharp9/ofdjs` 的目标是填补这个空白：**让 OFD 在 JavaScript 世界里和 PDF 一样容易处理**。

一行安装，七行代码，浏览器里就能看到发票。

---

## 链接

- 📦 npm: [https://www.npmjs.com/package/@sharp9/ofdjs](https://www.npmjs.com/package/@sharp9/ofdjs)
- 🐙 GitHub: [https://github.com/isee15/ofdjs](https://github.com/isee15/ofdjs)
- 📖 OFD 标准: GB/T 33190-2016

---

*如果这个库对你有帮助，欢迎在 GitHub 上 star ⭐ 和反馈 issue。OFD 的完整规范非常庞大，社区的力量可以让覆盖面更广。*
