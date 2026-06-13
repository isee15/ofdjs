import React, { useState, useRef, useCallback } from 'react';
import { readOfd, renderPageToCanvas, getPageCount, getPageDimensions } from '@sharp9/ofdjs';

export default function App() {
  const [ofd, setOfd] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [dims, setDims] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const ofdData = await readOfd(file);
      const count = getPageCount(ofdData);
      const dimensions = await getPageDimensions(ofdData, 0);

      setOfd(ofdData);
      setPageCount(count);
      setPageIndex(0);
      setDims(dimensions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Render the current page whenever pageIndex or ofd changes
  React.useEffect(() => {
    if (!ofd || !canvasRef.current) return;

    (async () => {
      try {
        const currentDims = await getPageDimensions(ofd, pageIndex);
        setDims(currentDims);
        await renderPageToCanvas(ofd, pageIndex, canvasRef.current, { dpi: 150, scale: 1 });
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [ofd, pageIndex]);

  const goPrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPageIndex((i) => Math.min(pageCount - 1, i + 1));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h2>OFD Viewer — React</h2>

      <input
        type="file"
        accept=".ofd"
        onChange={handleFile}
        disabled={loading}
      />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {ofd && (
        <>
          <div style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={goPrev} disabled={pageIndex === 0}>Prev</button>
            <span>
              Page {pageIndex + 1} / {pageCount}
              {dims && ` — ${dims.width.toFixed(1)}×${dims.height.toFixed(1)} mm`}
            </span>
            <button onClick={goNext} disabled={pageIndex >= pageCount - 1}>Next</button>
          </div>

          <canvas
            ref={canvasRef}
            style={{ border: '1px solid #ccc', maxWidth: '100%' }}
          />
        </>
      )}
    </div>
  );
}
