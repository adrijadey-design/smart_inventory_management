// frontend/src/pages/Export.js
import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import Topbar from '../components/Topbar';
import { stockStatus, inr, downloadBlob } from '../utils/helpers';
import './Export.css';

const API = process.env.REACT_APP_API_URL || null;

export default function Export() {
  const { items, loading, lowStockItems, outOfStock, totalValue } = useInventory();

  /* ── CSV (client-side fallback when API offline) ── */
  const handleCSV = async () => {
    if (API) {
      window.open(`${API}/export/csv`, '_blank');
      return;
    }
    const header = 'Name,Category,Barcode,Qty,Price(Rs),Threshold,Status';
    const rows   = items.map(i =>
      `"${i.name}","${i.category}","${i.barcode || ''}",${i.qty},${i.price},${i.threshold},"${stockStatus(i.qty, i.threshold).label}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    downloadBlob(blob, `stockflow_${Date.now()}.csv`);
  };

  /* ── Excel via API ── */
  const handleExcel = () => {
    if (API) { window.open(`${API}/export/excel`, '_blank'); return; }
    alert('Excel export requires the Flask backend to be running.');
  };

  /* ── Text report (client-side) ── */
  const handleReport = () => {
    if (API) { window.open(`${API}/export/report`, '_blank'); return; }
    const now = new Date().toLocaleString('en-IN');
    let txt = `STOCKFLOW INVENTORY REPORT\nGenerated: ${now}\n${'─'.repeat(60)}\n\n`;
    txt += `SUMMARY\n  Total Items  : ${items.length}\n  Low Stock    : ${lowStockItems.length}\n`;
    txt += `  Out of Stock : ${outOfStock.length}\n  Total Value  : ${inr(totalValue)}\n\n`;
    txt += `${'─'.repeat(60)}\nITEM DETAILS\n\n`;
    items.forEach(i => {
      txt += `  ${i.name}\n    Category: ${i.category} | Barcode: ${i.barcode || 'N/A'}\n`;
      txt += `    Qty: ${i.qty} | Price: ${inr(i.price)} | Threshold: ${i.threshold}\n`;
      txt += `    Status: ${stockStatus(i.qty, i.threshold).label}\n\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    downloadBlob(blob, `stockflow_report_${Date.now()}.txt`);
  };

  /* Preview */
  const preview = useMemo(() => {
    const header = 'Name,Category,Barcode,Qty,Price(Rs),Threshold,Status';
    const rows   = items.map(i =>
      `${i.name},${i.category},${i.barcode || ''},${i.qty},${i.price},${i.threshold},${stockStatus(i.qty, i.threshold).label}`
    );
    return [header, ...rows].join('\n');
  }, [items]);

  return (
    <>
      <Topbar title="Export Data" />
      <div className="content-wrap">

        {/* Cards */}
        <div className="export-cards">
          <div className="export-card">
            <span className="export-icon">📄</span>
            <div className="export-info">
              <h3>CSV Export</h3>
              <p>Download all inventory records as a comma-separated file. Works with Excel, Google Sheets & accounting tools.</p>
            </div>
            <button className="btn btn-ghost" onClick={handleCSV} disabled={loading}>↓ CSV</button>
          </div>

          <div className="export-card">
            <span className="export-icon">📊</span>
            <div className="export-info">
              <h3>Excel Export</h3>
              <p>Download a formatted .xlsx spreadsheet with auto-sized columns. Requires Flask backend.</p>
            </div>
            <button className="btn btn-ghost" onClick={handleExcel} disabled={loading || !API}>
              {API ? '↓ Excel' : 'Needs Backend'}
            </button>
          </div>

          <div className="export-card highlight">
            <span className="export-icon">📋</span>
            <div className="export-info">
              <h3>Full Report</h3>
              <p>Formatted text report with summary stats and per-item breakdown. Print-ready.</p>
            </div>
            <button className="btn btn-primary" onClick={handleReport} disabled={loading}>↓ Report</button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="export-stats">
          {[
            { label: 'Total Records',   val: items.length                   },
            { label: 'Low Stock',       val: lowStockItems.length           },
            { label: 'Out of Stock',    val: outOfStock.length              },
            { label: 'Inventory Value', val: inr(totalValue)                },
          ].map((s, i) => (
            <div key={i} className="export-stat">
              <span className="es-val">{s.val}</span>
              <span className="es-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="preview-panel">
          <div className="preview-header">
            <h3>CSV Preview</h3>
            <span className="preview-meta">{items.length} rows · {API ? '🟢 Backend connected' : '🟡 Offline mode'}</span>
          </div>
          {loading
            ? <div className="spinner-wrap"><div className="spinner" /></div>
            : <pre className="preview-body">{preview}</pre>
          }
        </div>

      </div>
    </>
  );
}
