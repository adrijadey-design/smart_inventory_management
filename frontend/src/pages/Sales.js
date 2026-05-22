// frontend/src/pages/Sales.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/apiClient';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toast';
import './Sales.css';

const PAYMENT_METHODS = [
  { value: 'Cash',          label: '💵 Cash'                },
  { value: 'UPI',           label: '📱 UPI (GPay / PhonePe)' },
  { value: 'Debit Card',    label: '💳 Debit Card'           },
  { value: 'Credit Card',   label: '💳 Credit Card'          },
  { value: 'Mobile Wallet', label: '📲 Mobile Wallet'        },
  { value: 'Net Banking',   label: '🏦 Net Banking'          },
  { value: 'Cheque',        label: '📄 Cheque'               },
];

const EMPTY_FORM = {
  customer_name: '', customer_phone: '',
  payment_method: 'Cash', payment_status: 'Paid',
  discount: 0, notes: '',
};

// ─── Invoice Generator ─────────────────────────────────────────────────────
function generateInvoiceHTML(sale) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const d   = new Date(sale.created_at);
  const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isPaid  = sale.payment_status === 'Paid' || !sale.payment_status;

  const rows = (sale.items || []).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;font-size:13px;">${i + 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;font-size:13px;">
        <div style="font-weight:500;color:#1a1a2e">${item.item_name}</div>
        ${item.barcode ? `<div style="font-size:11px;color:#546E7A;font-family:monospace">${item.barcode}</div>` : ''}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;font-size:13px;">₹${fmt(item.unit_price)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;font-size:13px;">${item.qty}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;font-size:13px;text-align:right;font-weight:500;">₹${fmt(item.total_price)}</td>
    </tr>`).join('');

  const discountRow = sale.discount > 0 ? `
    <tr>
      <td style="padding:4px 0;color:#e65100;font-size:13px">Discount (${sale.discount}%)</td>
      <td style="padding:4px 0;color:#e65100;font-size:13px;text-align:right">− ₹${fmt(sale.discount_amount)}</td>
    </tr>` : '';

  const notesSection = sale.notes ? `
    <div style="background:#f0f7ff;border-left:3px solid #2E75B6;padding:10px 14px;border-radius:4px;font-size:13px;color:#546E7A;margin-top:20px;">
      📝 Note: ${sale.notes}
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${sale.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#1a1a2e; background:#fff; }
    @media print {
      body { padding:0; }
      @page { margin:16mm; size:A4; }
    }
  </style>
</head>
<body>
<div style="max-width:680px;margin:0 auto;padding:40px 48px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #2E75B6;">
    <div>
      <div style="font-size:28px;font-weight:700;color:#1F3864;letter-spacing:-0.5px;">StockFlow</div>
      <div style="font-size:12px;color:#546E7A;margin-top:2px;">Inventory Management System</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#546E7A;margin-bottom:2px;">Invoice Number</div>
      <div style="font-size:20px;font-weight:700;color:#2E75B6;">${sale.invoice_number}</div>
      <div style="font-size:12px;color:#546E7A;margin-top:6px;line-height:1.6;">${dateStr}<br>${timeStr}</div>
      <span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-top:6px;
        ${isPaid ? 'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7' : 'background:#fff8e1;color:#f57f17;border:1px solid #ffe082'}">
        ${isPaid ? '✓ Paid' : '⏳ Pending'}
      </span>
    </div>
  </div>
  <div style="margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#546E7A;font-weight:600;margin-bottom:10px;">Customer Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;background:#f8fafc;padding:14px 16px;border-radius:8px;">
      <div><div style="font-size:11px;color:#546E7A;">Customer Name</div><div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;">${sale.customer_name || 'Walk-in Customer'}</div></div>
      <div><div style="font-size:11px;color:#546E7A;">Contact Number</div><div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;">${sale.customer_phone || '—'}</div></div>
      <div><div style="font-size:11px;color:#546E7A;">Payment Method</div><div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;">${sale.payment_method}</div></div>
      <div><div style="font-size:11px;color:#546E7A;">Transaction ID</div><div style="font-size:13px;font-weight:500;color:#1a1a2e;font-family:monospace;margin-top:2px;">${sale.invoice_number}</div></div>
    </div>
  </div>
  <div style="margin-bottom:20px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#546E7A;font-weight:600;margin-bottom:10px;">Items Purchased</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#1F3864;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#fff;font-weight:600;">#</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#fff;font-weight:600;">Item Name</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#fff;font-weight:600;">Unit Price (₹)</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#fff;font-weight:600;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;color:#fff;font-weight:600;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:20px;">
    <table style="width:260px;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#546E7A;font-size:13px">Subtotal</td><td style="padding:4px 0;color:#546E7A;font-size:13px;text-align:right">₹${fmt(sale.subtotal)}</td></tr>
      ${discountRow}
      <tr><td colspan="2" style="border-top:2px solid #1F3864;padding-top:8px;"></td></tr>
      <tr><td style="padding:4px 0;font-size:16px;font-weight:700;color:#1F3864">Grand Total</td><td style="padding:4px 0;font-size:16px;font-weight:700;color:#1F3864;text-align:right">₹${fmt(sale.total)}</td></tr>
      <tr><td style="padding:4px 0;color:#546E7A;font-size:12px">Paid via</td><td style="padding:4px 0;color:#1a1a2e;font-size:12px;font-weight:500;text-align:right">${sale.payment_method}</td></tr>
    </table>
  </div>
  ${notesSection}
  <div style="margin-top:40px;text-align:center;padding-top:18px;border-top:1px solid #eef1f5;">
    <div style="font-size:18px;font-weight:600;color:#1F3864;margin-bottom:6px;">🙏 Thank you for shopping with us!</div>
    <div style="font-size:12px;color:#546E7A;">StockFlow IMS &nbsp;•&nbsp; Generated on ${dateStr} at ${timeStr}</div>
  </div>
</div>
</body>
</html>`;
}

// ─── Download Invoice as PDF (via print dialog) ────────────────────────────
function downloadInvoice(sale) {
  const html = generateInvoiceHTML(sale);
  const win  = window.open('', '_blank', 'width=800,height=900');
  if (!win) { toastError('Allow popups to download invoice'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 800);
}

// ─── Invoice View Modal ────────────────────────────────────────────────────
function InvoicePreview({ sale, onClose, onDownload }) {
  const fmt = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const d   = new Date(sale.created_at);
  const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isPaid  = sale.payment_status === 'Paid' || !sale.payment_status;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal invoice-modal scale-in" onClick={e => e.stopPropagation()}>
        <div className="inv-header">
          <div className="inv-brand">
            <div className="inv-brand-name">StockFlow</div>
            <div className="inv-brand-sub">Inventory Management System</div>
          </div>
          <div className="inv-meta">
            <div className="inv-meta-label">Invoice Number</div>
            <div className="inv-num">{sale.invoice_number}</div>
            <div className="inv-date">{dateStr}<br />{timeStr}</div>
            <span className={`inv-status-badge ${isPaid ? 'paid' : 'pending'}`}>
              {isPaid ? '✓ Paid' : '⏳ Pending'}
            </span>
          </div>
        </div>
        <div className="inv-section">
          <div className="inv-section-label">Customer Details</div>
          <div className="inv-customer-grid">
            <div><div className="inv-field-label">Customer Name</div><div className="inv-field-val">{sale.customer_name || 'Walk-in Customer'}</div></div>
            <div><div className="inv-field-label">Contact Number</div><div className="inv-field-val">{sale.customer_phone || '—'}</div></div>
            <div><div className="inv-field-label">Payment Method</div><div className="inv-field-val">{sale.payment_method}</div></div>
            <div><div className="inv-field-label">Transaction ID</div><div className="inv-field-val" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{sale.invoice_number}</div></div>
          </div>
        </div>
        <div className="inv-section">
          <div className="inv-section-label">Items Purchased</div>
          <table className="inv-items-table">
            <thead>
              <tr>
                <th>#</th><th>Item Name</th><th>Unit Price (₹)</th><th>Qty</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(sale.items || []).map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.item_name}</div>
                    {item.barcode && <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>{item.barcode}</div>}
                  </td>
                  <td>₹{fmt(item.unit_price)}</td>
                  <td>{item.qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inv-totals">
          <div className="inv-total-row"><span>Subtotal</span><span>₹{fmt(sale.subtotal)}</span></div>
          {sale.discount > 0 && (
            <div className="inv-total-row" style={{ color: '#e65100' }}>
              <span>Discount ({sale.discount}%)</span>
              <span>− ₹{fmt(sale.discount_amount)}</span>
            </div>
          )}
          <div className="inv-total-row grand"><span>Grand Total</span><span>₹{fmt(sale.total)}</span></div>
          <div className="inv-total-row" style={{ fontSize: '12px', color: 'var(--muted)' }}>
            <span>Paid via</span><span>{sale.payment_method}</span>
          </div>
        </div>
        {sale.notes && <div className="inv-notes">📝 {sale.notes}</div>}
        <div className="inv-footer-msg">
          <div className="inv-footer-main">🙏 Thank you for shopping with us!</div>
          <div className="inv-footer-sub">StockFlow IMS • Generated on {dateStr} at {timeStr}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={() => onDownload(sale)}>📥 Download PDF</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Sales Page ───────────────────────────────────────────────────────
export default function Sales() {
  const { can } = useAuth();
  const [sales,        setSales]        = useState([]);
  const [stats,        setStats]        = useState({});
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);          // ← NEW
  const [modalOpen,    setModalOpen]    = useState(false);
  const [previewSale,  setPreviewSale]  = useState(null);
  const [confirmSale,  setConfirmSale]  = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [cart,         setCart]         = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [itemSearch,   setItemSearch]   = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── KEY FIX: use Promise.allSettled so one failing endpoint
  //    doesn't crash the whole page ─────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, statsRes, itemsRes] = await Promise.allSettled([
        api.get('/sales'),
        api.get('/sales/stats'),
        api.get('/items'),
      ]);

      if (salesRes.status === 'fulfilled') {
        setSales(salesRes.value.data?.data || []);
      } else {
        console.error('Sales list error:', salesRes.reason);
        setSales([]);
        // If it's a 401/403 the interceptor already redirected; for other errors show msg
        const status = salesRes.reason?.response?.status;
        if (status && status !== 401 && status !== 403) {
          setError('Could not load sales list. ' + (salesRes.reason?.response?.data?.error || ''));
        }
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || {});
      } else {
        console.error('Sales stats error:', statsRes.reason);
        setStats({});
      }

      if (itemsRes.status === 'fulfilled') {
        setItems(itemsRes.value.data?.data || []);
      } else {
        console.error('Items list error:', itemsRes.reason);
        setItems([]);
      }

    } catch (e) {
      console.error('Sales load unexpected error:', e);
      setError('Unexpected error loading sales page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const filteredItems = items.filter(i =>
    itemSearch.length > 0 && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.barcode || '').includes(itemSearch)
    )
  );

  const addToCart = (item) => {
    if (item.qty <= 0) { toastError(`"${item.name}" is out of stock`); return; }
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) return prev.map(c => c.item_id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, {
        item_id: item.id, item_name: item.name,
        barcode: item.barcode, qty: 1,
        unit_price: item.price, max_qty: item.qty,
      }];
    });
    setItemSearch('');
    setShowDropdown(false);
  };

  const updateQty      = (id, qty) => { if (qty <= 0) removeFromCart(id); else setCart(p => p.map(c => c.item_id === id ? { ...c, qty } : c)); };
  const updatePrice    = (id, price) => setCart(p => p.map(c => c.item_id === id ? { ...c, unit_price: parseFloat(price) || 0 } : c));
  const removeFromCart = (id) => setCart(p => p.filter(c => c.item_id !== id));

  const subtotal    = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
  const discountAmt = subtotal * (parseFloat(form.discount) || 0) / 100;
  const total       = subtotal - discountAmt;

  const handleConfirm = () => {
    if (cart.length === 0) { toastError('Add at least one item to cart'); return; }
    for (const c of cart) {
      if (c.qty > c.max_qty) { toastError(`Only ${c.max_qty} units available for "${c.item_name}"`); return; }
      if (c.qty <= 0)        { toastError(`Invalid quantity for "${c.item_name}"`); return; }
    }
    setConfirmSale({ form, cart, subtotal, discountAmt, total });
  };

  const handleSave = async () => {
    if (!confirmSale) return;
    setSaving(true);
    try {
      const res = await api.post('/sales', {
        ...confirmSale.form,
        items: confirmSale.cart.map(c => ({
          item_id: c.item_id, qty: c.qty, unit_price: c.unit_price,
        })),
      });
      const newSale = res.data.data;
      toastSuccess(`Sale recorded — ${newSale.invoice_number}`);
      setConfirmSale(null);
      setModalOpen(false);
      setCart([]);
      setForm(EMPTY_FORM);
      load();
      setTimeout(() => setPreviewSale(newSale), 400);
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sale) => {
    if (!window.confirm(`Delete sale ${sale.invoice_number}? Stock will be restored.`)) return;
    try {
      await api.delete(`/sales/${sale.id}`);
      toastSuccess('Sale deleted, stock restored');
      load();
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const fmtDate = s => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = s => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const filtered = sales.filter(s =>
    !search ||
    s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.customer_phone || '').includes(search)
  );

  const STATS = [
    { label: 'Monthly Sales',   val: stats.monthly_sales  || 0,   cls: 'blue'   },
    { label: 'Monthly Revenue', val: `₹${Number(stats.monthly_revenue || 0).toLocaleString('en-IN')}`, cls: 'green'  },
    { label: 'Weekly Sales',    val: stats.weekly_sales   || 0,   cls: 'purple' },
    { label: 'Weekly Revenue',  val: `₹${Number(stats.weekly_revenue  || 0).toLocaleString('en-IN')}`, cls: 'orange' },
    { label: "Today's Sales",   val: stats.today_sales    || 0,   cls: 'teal'   },
    { label: 'Total Revenue',   val: `₹${Number(stats.total_revenue   || 0).toLocaleString('en-IN')}`, cls: 'pink'   },
  ];

  return (
    <>
      <Topbar
        title="Sales"
        onAdd={can('create_sale') ? () => { setCart([]); setForm(EMPTY_FORM); setModalOpen(true); } : null}
        addLabel=' Add Sales'
      />
      <div className="content-wrap">

        {/* Stat cards */}
        <div className="sal-stats">
          {STATS.map((s, i) => (
            <div key={i} className={`ssc ${s.cls}`}>
              <span className="ssc-val">{s.val}</span>
              <span className="ssc-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#ff000022', border: '1px solid #ff4444',
            color: '#ff6666', borderRadius: 8, padding: '12px 16px',
            marginBottom: 16, fontSize: '14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>⚠ {error}</span>
            <button onClick={load} style={{
              background: 'transparent', border: '1px solid #ff6666',
              color: '#ff6666', borderRadius: 6, padding: '4px 12px',
              cursor: 'pointer', fontSize: '13px'
            }}>Retry</button>
          </div>
        )}

        {/* Table header */}
        <div className="table-header">
          <h2>All Transactions <span className="count-badge">({filtered.length})</span></h2>
          <input
            className="search-input"
            placeholder="Search invoice ID, customer name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Transactions table */}
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date &amp; Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment Method</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Download Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8">
                    <div className="empty-state">
                      <div className="empty-icon">🧾</div>
                      <p>No sales recorded yet. Click + Add Sale to get started.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(sale => (
                  <tr key={sale.id}>
                    <td><span className="txn-id">{sale.invoice_number}</span></td>
                    <td>
                      <div className="txn-date">{fmtDate(sale.created_at)}</div>
                      <div className="txn-time">{fmtTime(sale.created_at)}</div>
                    </td>
                    <td>
                      <div className="cust-name">{sale.customer_name || 'Walk-in'}</div>
                      <div className="cust-phone">{sale.customer_phone || '—'}</div>
                    </td>
                    <td><span className="badge-pill">{sale.items?.length || 0} item(s)</span></td>
                    <td><span className="pay-pill">{sale.payment_method}</span></td>
                    <td><span className="amount-text">₹{Number(sale.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                    <td>
                      <span className={`status-pill ${(sale.payment_status === 'Paid' || !sale.payment_status) ? 'active' : 'inactive'}`}>
                        {sale.payment_status || 'Paid'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-invoice" onClick={() => setPreviewSale(sale)} title="View Invoice">
                          🧾 View
                        </button>
                        <button className="btn-invoice btn-invoice-dl" onClick={() => downloadInvoice(sale)} title="Download PDF">
                          📥 PDF
                        </button>
                        {can('manage_sales') && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sale)} title="Delete sale">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── NEW SALE MODAL ── */}
      {modalOpen && !confirmSale && (
        <div className="modal-overlay open" onClick={() => setModalOpen(false)}>
          <div className="modal sale-modal scale-in" onClick={e => e.stopPropagation()}>
            <h2>🛒 New Sale</h2>
            <div className="sale-layout">

              {/* Left: Cart */}
              <div className="sale-left">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Search &amp; Add Items</label>
                  <input
                    className="search-input"
                    placeholder="Type item name or barcode…"
                    value={itemSearch}
                    autoComplete="off"
                    onChange={e => { setItemSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {!itemSearch && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>
                      💡 Start typing to search from {items.length} items in inventory
                    </div>
                  )}
                  {itemSearch && showDropdown && (
                    <div className="item-dropdown">
                      {filteredItems.length === 0 ? (
                        <div className="item-option" style={{ color: 'var(--muted)', cursor: 'default' }}>
                          No items match "{itemSearch}"
                        </div>
                      ) : filteredItems.slice(0, 8).map(item => (
                        <div
                          key={item.id}
                          className={`item-option${item.qty <= 0 ? ' item-out' : ''}`}
                          onClick={() => addToCart(item)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{item.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                              {item.barcode || 'No barcode'} &nbsp;|&nbsp; {item.category}
                            </div>
                          </div>
                          <div className="item-opt-right">
                            <span className={item.qty <= 0 ? 'out-badge' : 'stock-badge'}>
                              {item.qty <= 0 ? 'Out of Stock' : `Stock: ${item.qty}`}
                            </span>
                            <span className="price-badge">₹{item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="cart-wrap">
                  {cart.length === 0 ? (
                    <div className="cart-empty">🛒 No items added yet — search above to add items</div>
                  ) : cart.map(c => (
                    <div key={c.item_id} className="cart-item">
                      <div className="cart-item-top">
                        <span className="cart-item-name">{c.item_name}</span>
                        <button className="cart-remove" onClick={() => removeFromCart(c.item_id)}>✕</button>
                      </div>
                      <div className="cart-item-controls">
                        <div className="cart-field">
                          <label>Qty</label>
                          <div className="cart-qty">
                            <button onClick={() => updateQty(c.item_id, c.qty - 1)}>−</button>
                            <input type="number" value={c.qty} min={1} max={c.max_qty}
                              onChange={e => updateQty(c.item_id, parseInt(e.target.value) || 1)} />
                            <button onClick={() => updateQty(c.item_id, c.qty + 1)}>+</button>
                          </div>
                        </div>
                        <div className="cart-field">
                          <label>Unit Price (₹)</label>
                          <input className="cart-price-input" type="number" value={c.unit_price} step="0.01"
                            onChange={e => updatePrice(c.item_id, e.target.value)} />
                        </div>
                        <div className="cart-field">
                          <label>Total</label>
                          <span className="cart-line-total">
                            ₹{(c.qty * c.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      {c.qty > c.max_qty && (
                        <div className="cart-warn">⚠ Only {c.max_qty} units in stock</div>
                      )}
                    </div>
                  ))}
                </div>

                {cart.length > 0 && (
                  <div className="cart-totals">
                    <div className="ct-row"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    {discountAmt > 0 && (
                      <div className="ct-row discount">
                        <span>Discount ({form.discount}%)</span>
                        <span>− ₹{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="ct-row grand">
                      <span>Grand Total</span>
                      <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Customer + Payment */}
              <div className="sale-right">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input value={form.customer_name} onChange={set('customer_name')} placeholder="Leave blank for Walk-in" />
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input value={form.customer_phone} onChange={set('customer_phone')} placeholder="Phone number" />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={form.payment_method} onChange={set('payment_method')}>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select value={form.payment_status} onChange={set('payment_status')}>
                    <option value="Paid">✓ Paid</option>
                    <option value="Pending">⏳ Pending</option>
                    <option value="Partial">◑ Partial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount (%)</label>
                  <input type="number" value={form.discount} min={0} max={100} step={0.5}
                    onChange={set('discount')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={set('notes')} placeholder="Any remarks…" rows={3} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={cart.length === 0}>
                Review &amp; Confirm →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmSale && (
        <div className="modal-overlay open">
          <div className="modal confirm-modal scale-in">
            <h2>Confirm Sale</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: '.9rem' }}>
              Review below. Stock will be deducted immediately upon confirmation.
            </p>
            <table className="inv-items-table">
              <thead><tr><th>Item</th><th>Unit Price</th><th>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
              <tbody>
                {confirmSale.cart.map((c, i) => (
                  <tr key={i}>
                    <td>{c.item_name}</td>
                    <td>₹{Number(c.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>{c.qty}</td>
                    <td style={{ textAlign: 'right' }}>₹{(c.qty * c.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cart-totals" style={{ marginTop: 12 }}>
              <div className="ct-row"><span>Subtotal</span><span>₹{confirmSale.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              {confirmSale.discountAmt > 0 && (
                <div className="ct-row discount">
                  <span>Discount ({confirmSale.form.discount}%)</span>
                  <span>− ₹{confirmSale.discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="ct-row grand">
                <span>Grand Total</span>
                <span>₹{confirmSale.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: '.88rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
              <span><b style={{ color: 'var(--text)' }}>Customer:</b> {confirmSale.form.customer_name || 'Walk-in'}</span>
              <span><b style={{ color: 'var(--text)' }}>Payment:</b> {confirmSale.form.payment_method}</span>
              <span><b style={{ color: 'var(--text)' }}>Status:</b> {confirmSale.form.payment_status}</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmSale(null)} disabled={saving}>← Back</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Recording…' : '✓ Confirm & Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICE PREVIEW MODAL ── */}
      {previewSale && (
        <InvoicePreview
          sale={previewSale}
          onClose={() => setPreviewSale(null)}
          onDownload={downloadInvoice}
        />
      )}
    </>
  );
}
