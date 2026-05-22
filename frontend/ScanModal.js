// frontend/src/components/ScanModal.js
// Real camera barcode scanning using react-zxing
// Install: npm install react-zxing

import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { stockStatus, inr } from '../utils/helpers';
import './Modal.css';
import './ScanModal.css';

// Try to import react-zxing — gracefully fall back if not installed
let useZxing;
try {
  useZxing = require('react-zxing').useZxing;
} catch {
  useZxing = null;
}

// ── Camera scanner sub-component ─────────────────────────────────────────────
function CameraScanner({ onDetected, onError }) {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onDetected(result.getText());
    },
    onError(err) {
      if (!err?.message?.includes('NotFoundException')) {
        onError('Camera error: ' + err?.message);
      }
    },
    constraints: {
      video: {
        facingMode: 'environment',
        width:  { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    timeBetweenDecodingAttempts: 300,
  });

  return (
    <div className="camera-wrap">
      <video ref={ref} className="camera-video" />
      <div className="camera-overlay">
        <div className="scan-frame">
          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />
        </div>
        <p className="camera-hint">Point camera at a barcode</p>
      </div>
    </div>
  );
}

// ── Main ScanModal ────────────────────────────────────────────────────────────
export default function ScanModal({ isOpen, onClose, onEdit, onAddWithBarcode }) {
  const { findByBarcode } = useInventory();

  const [mode,    setMode]    = useState('manual');
  const [barcode, setBarcode] = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [camErr,  setCamErr]  = useState('');
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef(null);

  const hasCamera = !!useZxing;

  useEffect(() => {
    if (isOpen) {
      setBarcode(''); setResult(null); setCamErr(''); setScanned(false);
      setMode('manual');
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const lookup = async (bc) => {
    if (!bc.trim()) { setResult(null); return; }
    setLoading(true);
    const found = await findByBarcode(bc.trim());
    setResult(found || false);
    setLoading(false);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setBarcode(val);
    lookup(val);
  };

  const handleDetected = (bc) => {
    if (scanned) return;
    setScanned(true);
    setBarcode(bc);
    setMode('manual');
    lookup(bc);
    setTimeout(() => setScanned(false), 2000);
  };

  if (!isOpen) return null;

  const { label, dot } = result ? stockStatus(result.qty, result.threshold) : {};
  const dotColor = dot === 'dot-red' ? 'danger' : dot === 'dot-yellow' ? 'warn' : 'accent';

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal modal-scan scale-in" onClick={e => e.stopPropagation()}>

        <div className="scan-header">
          <h2>📷 Barcode Scanner</h2>
          {hasCamera && (
            <div className="scan-mode-toggle">
              <button className={`mode-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>⌨️ Manual</button>
              <button className={`mode-btn${mode === 'camera' ? ' active' : ''}`} onClick={() => { setMode('camera'); setCamErr(''); }}>📷 Camera</button>
            </div>
          )}
        </div>

        {mode === 'camera' && hasCamera && (
          <div>
            {camErr ? (
              <div className="cam-error">⚠️ {camErr}<br /><small>Allow camera access in your browser.</small></div>
            ) : (
              <CameraScanner onDetected={handleDetected} onError={setCamErr} />
            )}
            {scanned && barcode && (
              <div className="scan-detected">✅ Detected: <strong>{barcode}</strong></div>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <>
            <p className="scan-hint">
              {hasCamera ? 'Type a barcode manually, or switch to Camera mode to scan.' : 'Type or paste a barcode number below.'}
            </p>
            <div className="form-group">
              <label>Barcode Number</label>
              <input ref={inputRef} value={barcode} onChange={handleInput} placeholder="e.g. 8901234000001" autoFocus />
            </div>
          </>
        )}

        {loading && <p className="scan-hint" style={{ marginTop: 12 }}>🔍 Searching…</p>}

        {!loading && result && (
          <div className="scan-result scan-found">
            <div className="scan-name">{result.name}</div>
            <div className="scan-meta">
              <span>{result.category}</span>
              <span>Qty: <b style={{ color: `var(--${dotColor})` }}>{result.qty}</b></span>
              <span>Price: {inr(result.price)}</span>
            </div>
            <span className="status-dot" style={{ marginBottom: 10 }}>
              <span className={`dot ${dot}`} />{label}
            </span>
            <button className="btn btn-warn btn-sm" onClick={() => { onClose(); onEdit(result.id); }}>✏️ Update Stock</button>
          </div>
        )}

        {!loading && result === false && barcode && (
          <div className="scan-result scan-notfound">
            <p>No item found for barcode <strong>{barcode}</strong></p>
            <button className="btn btn-primary btn-sm" onClick={() => { onClose(); onAddWithBarcode(barcode.trim()); }}>+ Add as New Item</button>
          </div>
        )}

        <div className="modal-footer">
          {mode === 'camera' && <button className="btn btn-ghost" onClick={() => setMode('manual')}>← Back to Manual</button>}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        {!hasCamera && (
          <p className="install-hint">💡 To enable camera scanning, run: <code>npm install react-zxing</code></p>
        )}

      </div>
    </div>
  );
}
