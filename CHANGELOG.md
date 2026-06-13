# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2024-06-13

### Added

- OFD (Open Fixed Document, GB/T 33190-2016) ZIP archive parsing via JSZip
- Document.xml, PublicRes.xml, DocumentRes.xml parsing
- Page.xml content parsing (PathObject, TextObject, ImageObject)
- Canvas2D rendering of parsed OFD pages
- Text rendering with full OFD positioning support:
  - ReadDirection (0=LTR, 90=vertical/竖排, 180=RTL, 270=reverse-vertical)
  - CharDirection (0/90/180/270 individual character rotation)
  - DeltaX/DeltaY per-character spacing with "g N X" notation
  - DeltaY in LTR mode for vertical stacking (e.g. "密码区" labels)
  - HScale (horizontal scaling), Weight, Italic, Alpha, CTM
  - Per-character stroke rendering (matching fill layout)
- PathObject rendering (rectangle from Boundary)
- ImageObject rendering (PNG/JPG from ZIP resources)
- Template page rendering (Background/Foreground ZOrder)
- Annotation/stamp rendering
- `readOfd()` — parse OFD from File, Blob, ArrayBuffer, or URL
- `renderPageToCanvas()` — render a page to HTML Canvas
- `renderOfdToCanvas()` — render all pages sequentially
- `exportOfdToPng()` — export page as PNG
- `getPageCount()` / `getPageDimensions()` — page metadata queries
- `initDOMParser()` — Node.js ESM DOMParser initialization
- Browser support (native Canvas + DOMParser)
- Node.js support (node-canvas + linkedom polyfill)
