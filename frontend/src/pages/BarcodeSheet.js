// frontend/src/pages/BarcodeSheet.js
// Printable barcode sheet for all inventory items

import React, { useEffect, useRef, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import Topbar from '../components/Topbar';
import './BarcodeSheet.css';

function BarcodeLabel({ item }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !item.barcode) return;
    const draw = async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        // CODE128 accepts any string — no checksum issues
        JsBarcode(svgRef.current, item.barcode, {
          format:       'CODE128',
          width:        1.8,
          height:       55,
          displayValue: true,
          fontSize:     11,
          margin:       6,
          background:   '#ffffff',
          lineColor:    '#000000',
          textMargin:   3,
        });
      } catch (e) {
        console.warn('[Barcode] render failed for', item.barcode, e.message);
      }
    };
    draw();
  }, [item.barcode]);

  if (!item.barcode) {
    return (
      <div className="bc-label bc-no-barcode">
        <div className="bc-name">{item.name}</div>
        <div className="bc-no-code">No barcode</div>
        <div className="bc-price">₹{item.price}</div>
      </div>
    );
  }

  return (
    <div className="bc-label">
      <div className="bc-name" title={item.name}>{item.name}</div>
      <svg ref={svgRef} className="bc-svg" />
      <div className="bc-meta">
        <span className="bc-cat">{item.category}</span>
        <span className="bc-price">₹{item.price}</span>
      </div>
    </div>
  );
}

export default function BarcodeSheet() {
  const { items, loading } = useInventory();
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [cols,      setCols]      = useState(4);

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  const filtered = items.filter(i => {
    const ms = !search    || i.name.toLowerCase().includes(search.toLowerCase()) || (i.barcode || '').includes(search);
    const mc = !catFilter || i.category === catFilter;
    return ms && mc;
  });

  const handlePrint = () => window.print();

  return (
    <>
      <Topbar title="Barcode Sheet" />
      <div className="content-wrap">

        {/* Controls — hidden on print */}
        <div className="bc-controls no-print">
          <div className="bc-controls-left">
            <input
              className="search-input"
              placeholder="Search item or barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={cols} onChange={e => setCols(Number(e.target.value))}>
              <option value={2}>2 per row</option>
              <option value={3}>3 per row</option>
              <option value={4}>4 per row</option>
              <option value={5}>5 per row</option>
            </select>
          </div>
          <div className="bc-controls-right">
            <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
              {filtered.length} label{filtered.length !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print All Barcodes
            </button>
          </div>
        </div>

        {/* Print header — only visible on print */}
        <div className="bc-print-header print-only">
          <strong>StockFlow — Inventory Barcode Sheet</strong>
          <span>{new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</span>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏷️</div>
            <p>No items match your filter.</p>
          </div>
        ) : (
          <div
            className="bc-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {filtered.map(item => (
              <BarcodeLabel key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
