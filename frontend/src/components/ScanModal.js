// frontend/src/components/ScanModal.js
// Barcode scanning powered by QuaggaJS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInventory } from '../context/InventoryContext';
import { stockStatus, inr } from '../utils/helpers';
import './Modal.css';
import './ScanModal.css';

// ─── QuaggaJS Camera Scanner ──────────────────────────────────────────────
function QuaggaScanner({ onDetected, onError }) {
  const scannerRef = useRef(null);
  const quaggaRef  = useRef(null);
  const lastCode   = useRef('');
  const lastTime   = useRef(0);

  useEffect(() => {
    let Quagga;
    let started = false;

    const init = async () => {
      try {
        // Dynamically import so app doesn't crash if not installed
        const mod = await import('quagga');
        Quagga = mod.default || mod;
        quaggaRef.current = Quagga;

        Quagga.init(
          {
            inputStream: {
              name: 'Live',
              type: 'LiveStream',
              target: scannerRef.current,
              constraints: {
                facingMode:  'environment',
                width:  { ideal: 1280 },
                height: { ideal: 720  },
              },
            },
            locator: {
              patchSize:    'medium',
              halfSample:   true,
            },
            numOfWorkers:   navigator.hardwareConcurrency > 2 ? 2 : 1,
            frequency:      10,
            decoder: {
              readers: [
                'ean_reader',        // EAN-13 / EAN-8  ← most grocery products
                'ean_8_reader',
                'code_128_reader',
                'code_39_reader',
                'upc_reader',
                'upc_e_reader',
              ],
            },
            locate: true,
          },
          (err) => {
            if (err) {
              console.error('[Quagga] init error:', err);
              onError(err?.message || 'Camera init failed');
              return;
            }
            Quagga.start();
            started = true;
          }
        );

        // Only fire when the same code is detected twice in a row (reduces false positives)
        Quagga.onDetected((data) => {
          const code = data?.codeResult?.code;
          if (!code) return;
          const now = Date.now();
          if (code === lastCode.current && now - lastTime.current < 1500) {
            onDetected(code);
            lastCode.current = '';
          } else {
            lastCode.current = code;
            lastTime.current = now;
          }
        });

        // Draw red box on detected barcode position
        Quagga.onProcessed((result) => {
          const ctx = Quagga.canvas?.ctx?.overlay;
          const canvas = Quagga.canvas?.dom?.overlay;
          if (!ctx || !canvas) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (result?.boxes) {
            result.boxes
              .filter(b => b !== result.box)
              .forEach(box => {
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, ctx, {
                  color: 'rgba(0,229,160,0.4)', lineWidth: 1,
                });
              });
          }
          if (result?.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
              color: '#00e5a0', lineWidth: 2,
            });
          }
          if (result?.codeResult?.code) {
            Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, ctx, {
              color: '#ff6b4a', lineWidth: 3,
            });
          }
        });

      } catch (e) {
        console.error('[Quagga] import error:', e);
        onError('QuaggaJS not installed. Run: npm install quagga');
      }
    };

    init();

    return () => {
      if (quaggaRef.current && started) {
        try { quaggaRef.current.stop(); } catch {}
      }
    };
  }, [onDetected, onError]);

  return (
    <div className="quagga-wrap">
      <div ref={scannerRef} className="quagga-viewport">
        <canvas className="drawingBuffer" />
      </div>
      {/* Scan-frame overlay */}
      <div className="scan-frame-overlay">
        <div className="scan-frame">
          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />
          <div className="scan-line" />
        </div>
        <p className="camera-hint">Align barcode within the frame</p>
      </div>
    </div>
  );
}

// ─── Main ScanModal ───────────────────────────────────────────────────────
export default function ScanModal({ isOpen, onClose, onEdit, onAddWithBarcode }) {
  const { findByBarcode } = useInventory();

  const [mode,      setMode]      = useState('manual');
  const [barcode,   setBarcode]   = useState('');
  const [result,    setResult]    = useState(null);   // null=idle, false=not found, obj=found
  const [loading,   setLoading]   = useState(false);
  const [camErr,    setCamErr]    = useState('');
  const [flash,     setFlash]     = useState(false);  // green flash on successful scan
  const [lastScan,  setLastScan]  = useState('');
  const inputRef  = useRef(null);
  const debounceRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setBarcode(''); setResult(null); setCamErr('');
      setFlash(false); setLastScan(''); setMode('manual');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Lookup with 300ms debounce
  const lookup = useCallback(async (bc) => {
    const clean = bc.trim();
    if (!clean) { setResult(null); return; }
    setLoading(true);
    try {
      const found = await findByBarcode(clean);
      setResult(found || false);
    } catch {
      setResult(false);
    } finally {
      setLoading(false);
    }
  }, [findByBarcode]);

  const schedLookup = (val) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookup(val), 300);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setBarcode(val);
    setResult(null);
    schedLookup(val);
  };

  // Called by QuaggaScanner when a barcode is confidently detected
  const handleDetected = useCallback((bc) => {
    if (bc === lastScan) return;   // avoid duplicate fires
    setLastScan(bc);
    setBarcode(bc);
    setFlash(true);
    setMode('manual');             // switch to result view
    lookup(bc);
    setTimeout(() => setFlash(false), 600);
  }, [lastScan, lookup]);

  const switchToCamera = () => {
    setCamErr('');
    setResult(null);
    setBarcode('');
    setLastScan('');
    setMode('camera');
  };

  const switchToManual = () => {
    setMode('manual');
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  if (!isOpen) return null;

  const stockInfo = result ? stockStatus(result.qty, result.threshold ?? result.min_qty ?? 5) : {};
  const dotColor  = stockInfo.dot === 'dot-red' ? 'danger'
    : stockInfo.dot === 'dot-yellow' ? 'warn' : 'accent';

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div
        className={`modal modal-scan scale-in${flash ? ' scan-flash' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="scan-header">
          <h2>📷 Barcode Scanner</h2>
          <div className="scan-mode-toggle">
            <button
              className={`mode-btn${mode === 'manual' ? ' active' : ''}`}
              onClick={switchToManual}
            >⌨️ Manual</button>
            <button
              className={`mode-btn${mode === 'camera' ? ' active' : ''}`}
              onClick={switchToCamera}
            >📷 Camera</button>
          </div>
        </div>

        {/* ── Camera mode ── */}
        {mode === 'camera' && (
          <div>
            {camErr ? (
              <div className="cam-error">
                <div className="cam-error-icon">📵</div>
                <div>{camErr}</div>
                <small>Allow camera access in your browser, then try again.</small>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
                  onClick={() => { setCamErr(''); }}>
                  🔄 Retry
                </button>
              </div>
            ) : (
              <QuaggaScanner onDetected={handleDetected} onError={setCamErr} />
            )}
            {lastScan && (
              <div className="scan-detected">
                ✅ Detected: <strong>{lastScan}</strong> — looking up…
              </div>
            )}
          </div>
        )}

        {/* ── Manual / result mode ── */}
        {mode === 'manual' && (
          <>
            <p className="scan-hint">
              Type or paste a barcode, or switch to 📷 Camera to scan live.
            </p>
            <div className="form-group">
              <label>Barcode Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  value={barcode}
                  onChange={handleInput}
                  placeholder="e.g. 8901234000001"
                  style={{ paddingRight: barcode ? 36 : 12 }}
                  onKeyDown={e => { if (e.key === 'Enter') lookup(barcode); }}
                />
                {barcode && (
                  <button
                    onClick={() => { setBarcode(''); setResult(null); inputRef.current?.focus(); }}
                    style={{
                      position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      color: 'var(--muted)', cursor: 'pointer', fontSize: 16,
                    }}
                  >✕</button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="scan-searching">
            <div className="spinner-sm" />
            <span>Searching inventory…</span>
          </div>
        )}

        {/* ── Found ── */}
        {!loading && result && (
          <div className="scan-result scan-found">
            <div className="scan-found-top">
              <div className="scan-found-icon">📦</div>
              <div>
                <div className="scan-name">{result.name}</div>
                <div className="scan-barcode-display">{barcode}</div>
              </div>
            </div>
            <div className="scan-meta-grid">
              <div className="scan-meta-item">
                <span className="scan-meta-lbl">Category</span>
                <span className="scan-meta-val">{result.category}</span>
              </div>
              <div className="scan-meta-item">
                <span className="scan-meta-lbl">In Stock</span>
                <span className="scan-meta-val" style={{ color: `var(--${dotColor})`, fontWeight: 700 }}>
                  {result.qty}
                </span>
              </div>
              <div className="scan-meta-item">
                <span className="scan-meta-lbl">Price</span>
                <span className="scan-meta-val">{inr(result.price)}</span>
              </div>
              <div className="scan-meta-item">
                <span className="scan-meta-lbl">Status</span>
                <span className="scan-meta-val">
                  <span className={`dot ${stockInfo.dot}`} style={{ marginRight: 4 }} />
                  {stockInfo.label}
                </span>
              </div>
            </div>
            <button
              className="btn btn-warn"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => { onClose(); onEdit(result.id); }}
            >
              ✏️ Edit / Restock Item
            </button>
          </div>
        )}

        {/* ── Not found ── */}
        {!loading && result === false && barcode.trim() && (
          <div className="scan-result scan-notfound">
            <div className="scan-notfound-icon">🔍</div>
            <p>No item found for</p>
            <code className="scan-barcode-display">{barcode}</code>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => { onClose(); onAddWithBarcode(barcode.trim()); }}
            >
              + Add as New Item
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="modal-footer">
          {mode === 'camera' && (
            <button className="btn btn-ghost" onClick={switchToManual}>⌨️ Manual</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        {/* Install hint shown in cam error or first visit */}
        {camErr?.includes('npm') && (
          <div className="install-hint">
            💡 Install QuaggaJS: <code>npm install quagga</code>
          </div>
        )}
      </div>
    </div>
  );
}
