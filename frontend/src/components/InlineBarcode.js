// frontend/src/components/InlineBarcode.js
// Renders a small inline SVG barcode for the inventory table
import React, { useEffect, useRef } from 'react';

export default function InlineBarcode({ value, width = 1.4, height = 36 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    const draw = async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        // Always use CODE128 — works with any string, no checksum required
        JsBarcode(svgRef.current, value, {
          format:       'CODE128',
          width,
          height,
          displayValue: false,   // we show the number in text below
          margin:       2,
          background:   'transparent',
          lineColor:    'currentColor',
        });
      } catch (e) {
        console.warn('[Barcode] render failed for', value, e.message);
      }
    };
    draw();
  }, [value, width, height]);

  if (!value) return <span style={{ color: 'var(--muted)', fontSize: '.72rem' }}>—</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg ref={svgRef} style={{ maxWidth: '100%' }} />
      <span style={{ fontFamily: 'monospace', fontSize: '.65rem', color: 'var(--muted)', letterSpacing: '.02em' }}>
        {value}
      </span>
    </div>
  );
}
