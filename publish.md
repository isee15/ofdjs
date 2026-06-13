# 发布到 npm 仓库指南

## 前置条件

1. 安装 Node.js >= 18
2. 注册 npm 账号：https://www.npmjs.com/signup
3. 确认包名可用（未被他人占用）

```bash
# 查看包名是否已被占用
npm view ofdjs
# 如果返回 404，说明包名可用
```

## 发布流程

### 1. 登录 npm

```bash
npm login
# 输入用户名、密码、邮箱
# 验证 OTP（如启用了两步验证）
```

### 2. 确认发布内容

```bash

# 确保依赖已安装且模块加载正常
npm install
npm test

# 预览 npm pack 将打包哪些文件（不实际生成 tarball）
npm pack --dry-run
```

输出应只包含以下 13 个文件：

```
CHANGELOG.md
LICENSE
README.md
package.json
src/document.js
src/elements.js
src/index.js
src/ofd.js
src/page.js
src/path-resolver.js
src/render.js
src/types.js
src/xml-parser.js
```

**确认没有**以下文件：`.npmrc`、`test/`、`node_modules/`、`.gitignore`、`package-lock.json`、`render-patched.js`、`ofd-rfc标准.txt`。

这由 `package.json` 中的 `"files"` 白名单控制：

```json
"files": [
  "src/",
  "README.md",
  "LICENSE",
  "CHANGELOG.md"
]
```

### 3. 发布

```bash
# 首次发布
npm publish --access public
```

### 4. 验证发布成功

```bash
# 查看已发布的包信息
npm view ofdjs

# 在另一个目录尝试安装
mkdir /tmp/test-install && cd /tmp/test-install
npm install ofdjs
```

## 版本更新发布

遵循语义化版本 (SemVer)：`MAJOR.MINOR.PATCH`

- **PATCH** (0.1.x)：bug 修复，向后兼容
- **MINOR** (0.x.0)：新增功能，向后兼容
- **MAJOR** (x.0.0)：破坏性变更

```bash
# 更新版本号（自动修改 package.json 并创建 git tag）
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0

# 发布新版本
npm publish
```

每次发布新版本前，必须更新 `CHANGELOG.md`。

## 撤回发布

npm 不允许删除已发布超过 72 小时的版本。72 小时内可以撤销：

```bash
# 撤回特定版本（仅在发布 72 小时内有效）
npm unpublish ofdjs@0.1.0

# 撤回整个包（仅在发布 72 小时内有效）
npm unpublish ofdjs --force
```

## npm 镜像源切换

本项目 `.npmrc` 默认使用国内镜像 `npmmirror.com`，**发布时必须切换到官方源**：

```bash
# 切换到 npm 官方源（发布必需）
npm config set registry https://registry.npmjs.org/

# 发布完成后可切换回国内镜像（加速日常安装）
npm config set registry https://registry.npmmirror.com/
```

或者临时使用官方源发布，不修改全局配置：

```bash
npm publish --registry https://registry.npmjs.org/
```

## 发布 checklist

| 步骤 | 命令 | 状态 |
|------|------|------|
| 依赖安装 | `npm install` | |
| 模块加载测试 | `npm test` | |
| pack 内容检查 | `npm pack --dry-run` | |
| npm 源切换 | `npm config set registry https://registry.npmjs.org/` | |
| 登录 | `npm login` | |
| 发布 | `npm publish --access public` | |
| 验证 | `npm view ofdjs` | |
| 源切换回 | `npm config set registry https://registry.npmmirror.com/` | |

## GitHub 仓库发布

如需同步发布到 GitHub：

```bash
# 初始化 git（在 js/ 目录）
git init
git add .
git commit -m "v0.1.0: initial release of ofdjs"

# 关联远程仓库（先在 GitHub 创建仓库）
git remote add origin https://github.com/isee15/ofdjs.git
git branch -M main
git push -u origin main

# 发布版本 tag
git tag v0.1.0
git push origin v0.1.0
```
