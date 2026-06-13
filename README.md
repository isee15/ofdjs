# @sharp9/ofdjs

JavaScript OFD (开放版式文档, Open Fixed Document) reader — parse and render OFD documents to Canvas.

OFD is China's national standard for fixed-layout electronic documents (GB/T 33190-2016), widely used for **电子发票 (e-invoices)**, government documents, and business forms.

**[English](README.en.md)** | **[中文](README.zh.md)**

## Features

- ✅ Parse OFD ZIP archives (OFD.xml → Document.xml → Page.xml)
- ✅ Render OFD pages to HTML5 Canvas2D
- ✅ Text rendering with full positioning support (DeltaX/DeltaY, ReadDirection, CharDirection, HScale, CTM)
- ✅ Vertical text (竖排) layout via DeltaY or ReadDirection=90
- ✅ Per-character stroke rendering matching fill layout
- ✅ Path rendering (rectangles from Boundary)
- ✅ Image rendering (PNG/JPG from embedded resources)
- ✅ Template pages (Background/Foreground layers for form layouts)
- ✅ Annotation/stamp (印章) rendering
- ✅ Works in both **browser** and **Node.js**

![example](ofd.png)
## Install

```bash
npm install @sharp9/ofdjs
```

Node.js users who need server-side rendering should also install canvas:

```bash
npm install canvas linkedom   # optional, for Node.js rendering
```

Browser users can load JSZip via CDN — no npm packages are needed beyond the library itself.

## Usage

### Browser

```html
<!-- Load JSZip from CDN (required dependency) -->
<script src="https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js"></script>

<script type="module">
  import { readOfd, renderPageToCanvas, getPageCount } from '@sharp9/ofdjs';

  const fileInput = document.querySelector('#ofd-file');
  const canvas = document.querySelector('#ofd-canvas');

  fileInput.addEventListener('change', async (e) => {
    const ofd = await readOfd(e.target.files[0]);
    const pageCount = getPageCount(ofd);
    await renderPageToCanvas(ofd, 0, canvas, { dpi: 150 });
  });
</script>
```

### Node.js

```js
import { initDOMParser } from '@sharp9/ofdjs/xml-parser.js';
import { readOfd, renderPageToCanvas, getPageCount, getPageDimensions } from '@sharp9/ofdjs';
import { createCanvas } from 'canvas';
import fs from 'fs';

// Initialize DOMParser polyfill for Node.js ESM
await initDOMParser();

const buffer = fs.readFileSync('invoice.ofd');
const ofd = await readOfd(new Uint8Array(buffer));

const dims = await getPageDimensions(ofd, 0);
const canvas = createCanvas(
  Math.round(dims.width * 96 / 25.4),
  Math.round(dims.height * 96 / 25.4)
);
await renderPageToCanvas(ofd, 0, canvas, { dpi: 96 });

const pngBuffer = canvas.toBuffer('image/png');
fs.writeFileSync('page0.png', pngBuffer);
```

## API

| Function | Description |
|----------|-------------|
| `readOfd(source)` | Parse an OFD file. `source`: File, Blob, ArrayBuffer, or URL string |
| `renderPageToCanvas(ofd, pageIndex, canvas, options?)` | Render a page to HTML Canvas |
| `renderOfdToCanvas(ofd, canvas, options?)` | Render all pages sequentially |
| `exportOfdToPng(ofd, pageIndex?, options?)` | Export page as PNG Blob |
| `getPageCount(ofd)` | Get number of pages |
| `getPageDimensions(ofd, pageIndex?)` | Get page dimensions in mm |
| `initDOMParser()` | Initialize DOMParser for Node.js ESM (call before other functions) |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `dpi` | 97 | Dots per inch for mm→px conversion |
| `scale` | 1 | Additional scale factor |

## Dependencies

| Package | Required | Environment | Purpose |
|---------|----------|-------------|---------|
| jszip | Yes | Both | ZIP archive parsing (OFD files are ZIP) |
| linkedom | Optional | Node.js | DOMParser polyfill for XML parsing |
| @xmldom/xmldom | Optional | Node.js | Alternative DOMParser polyfill |
| canvas | Optional | Node.js | Server-side Canvas rendering (node-canvas) |

In the **browser**, JSZip can be loaded via `<script>` CDN tag. No npm packages are needed.

In **Node.js**, `linkedom` or `@xmldom/xmldom` provides DOMParser, and `canvas` provides the Canvas2D API. These are optional — if not installed, the library will still parse OFD files but cannot render pages.

## Supported OFD Features

- **TextObject**: Full positioning with DeltaX/DeltaY, ReadDirection (LTR/RTL/vertical), CharDirection, HScale, Weight, Italic, Alpha, CTM, Stroke
- **PathObject**: Rectangle rendering from Boundary (with fill/stroke)
- **ImageObject**: PNG/JPG embedded image rendering
- **Template pages**: Background/Foreground layer merging
- **Annotations**: Stamp/seal rendering
- **Color**: RGB integer format, hex format, with alpha

## Limitations

- **AbbreviatedData** (SVG-like path commands in PathObject) not parsed — paths rendered as rectangles
- **CTM** not applied to PathObject
- **JBIG2, TIFF, BMP** image formats not supported
- **CJS/require()** not supported — this is an ESM-only package
- Chinese fonts (楷体, 宋体, 黑体) may not be available in Node.js canvas — falls back to sans-serif

## Project Structure

```
src/
  index.js         — Public API entry point
  ofd.js           — OFD.xml root parsing
  document.js      — Document.xml + resource parsing
  elements.js      — Page element types (TextObject, PathObject, etc.)
  page.js          — Page.xml parsing
  render.js        — Canvas2D rendering implementations
  types.js         — Coordinate helpers (Box, Color, Matrix, mmtopx)
  xml-parser.js    — DOMParser polyfill + XML parsing utilities
  path-resolver.js — ZIP path resolution
test/
  test-browser.html — Browser demo/test page
  fixtures/         — Sample OFD files for testing
```

## Development

```bash
# Install dependencies
npm install

# Run a quick import test
npm test

# Try rendering a sample OFD file in Node.js
node -e "
  import('./src/index.js').then(m => console.log('Exports:', Object.keys(m).join(', ')));
"
```

For browser testing, serve `test/test-browser.html` with a local web server and open it in a browser.

## License
Apache
