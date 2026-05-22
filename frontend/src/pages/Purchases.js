// frontend/src/pages/Purchases.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/apiClient';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toast';
import './Purchases.css';

const PAYMENT_METHODS = [
  { value: 'Cash',          label: '💵 Cash' },
  { value: 'UPI',           label: '📱 UPI' },
  { value: 'Net Banking',   label: '🏦 Net Banking' },
  { value: 'Mobile Wallet', label: '📲 Mobile Wallet' },
  { value: 'Credit Card',   label: '💳 Credit Card' },
  { value: 'Debit Card',    label: '💳 Debit Card' },
];

const ORDER_STATUSES = [
  { value: 'draft',     label: '📝 Draft'     },
  { value: 'ordered',   label: '🛒 Ordered'   },
  { value: 'received',  label: '✅ Received'  },
  { value: 'cancelled', label: '❌ Cancelled' },
];

const STATUS_TABS = ['all', 'draft', 'ordered', 'received', 'cancelled'];

const EMPTY_FORM = {
  supplier_id: '', supplier_name: '', invoice_number: '',
  payment_method: 'Cash', payment_status: 'Pending',
  paid_amount: 0, order_status: 'ordered', notes: '',
};

const EMPTY_CART_ITEM = {
  expiry_date: '', batch_number: '', damaged_qty: 0, damaged_remarks: '',
};

// ─── PO Preview / Print Modal ─────────────────────────────────────────────
function POModal({ purchase, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=820,height=900');
    win.document.write(`<!DOCTYPE html><html><head><title>PO ${purchase.purchase_number}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:40px 48px;color:#1a1a2e;background:#fff}
      .po-header-block{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6c8fff;padding-bottom:18px;margin-bottom:24px}
      .po-brand-name{font-size:28px;font-weight:700;color:#1F3864;letter-spacing:-.5px}
      .po-brand-sub{font-size:12px;color:#546E7A;margin-top:2px}
      .po-meta-block{text-align:right}
      .po-meta-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#546E7A;margin-bottom:2px}
      .po-number{font-size:20px;font-weight:700;color:#6c8fff}
      .po-datetime{font-size:12px;color:#546E7A;margin-top:6px;line-height:1.6}
      .po-info-section{margin-bottom:20px}
      .po-info-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#546E7A;font-weight:600;margin-bottom:10px}
      .po-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 24px;background:#f8fafc;padding:14px 16px;border-radius:8px}
      .po-field-lbl{font-size:11px;color:#546E7A}
      .po-field-val{font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#1F3864;color:#fff;padding:9px 12px;font-size:12px;text-align:left;font-weight:600}
      td{padding:9px 12px;border-bottom:1px solid #eef1f5;font-size:13px;color:#1a1a2e}
      tr:nth-child(even) td{background:#f8fafc}
      .tot-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:5px;margin-bottom:20px}
      .tot-row{display:flex;gap:56px;font-size:13px;color:#546E7A}
      .tot-grand{font-size:16px;font-weight:700;color:#1F3864;border-top:2px solid #1F3864;padding-top:8px;margin-top:4px}
      .notes-box{background:#f0f4ff;border-left:3px solid #6c8fff;padding:10px 14px;border-radius:4px;font-size:13px;color:#546E7A;margin-bottom:20px}
      .po-footer{text-align:center;border-top:1px solid #eef1f5;padding-top:16px;font-size:12px;color:#546E7A;margin-top:32px}
      @media print{@page{margin:16mm;size:A4}}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 700);
  };

  const fmt    = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const d      = new Date(purchase.created_at);
  const dateS  = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeS  = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const osMeta = ORDER_STATUSES.find(o => o.value === purchase.order_status) || ORDER_STATUSES[1];
  const payBadgeCls = purchase.payment_status === 'Paid' ? 'paid'
    : purchase.payment_status === 'Partial' ? 'partial' : 'pending';

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal po-modal scale-in" onClick={e => e.stopPropagation()}>
        <div ref={printRef}>

          {/* Header: brand left, PO number right */}
          <div className="po-header-block">
            <div>
              <div className="po-brand-name">StockFlow</div>
              <div className="po-brand-sub">Inventory Management System</div>
            </div>
            <div className="po-meta-block">
              <div className="po-meta-label">Purchase Order</div>
              <div className="po-number">{purchase.purchase_number}</div>
              <div className="po-datetime">{dateS}<br />{timeS}</div>
              <span className={`pur-status-badge ${purchase.order_status}`}
                style={{ marginTop: 6, display: 'inline-block' }}>
                {osMeta.label}
              </span>
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="po-info-section">
            <div className="po-info-label">Order Details</div>
            <div className="po-info-grid">
              <div>
                <div className="po-field-lbl">Supplier</div>
                <div className="po-field-val">{purchase.supplier_name || '—'}</div>
              </div>
              <div>
                <div className="po-field-lbl">Supplier Invoice</div>
                <div className="po-field-val" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {purchase.invoice_number || '—'}
                </div>
              </div>
              <div>
                <div className="po-field-lbl">Payment Method</div>
                <div className="po-field-val">{purchase.payment_method}</div>
              </div>
              <div>
                <div className="po-field-lbl">Payment Status</div>
                <span className={`pur-status-badge ${payBadgeCls}`}
                  style={{ marginTop: 4, display: 'inline-block' }}>
                  {purchase.payment_status}
                </span>
              </div>
              {purchase.paid_amount > 0 && (
                <div>
                  <div className="po-field-lbl">Amount Paid</div>
                  <div className="po-field-val" style={{ color: 'var(--accent)' }}>
                    ₹{fmt(purchase.paid_amount)}
                  </div>
                </div>
              )}
              {purchase.paid_amount > 0 && purchase.payment_status !== 'Paid' && (
                <div>
                  <div className="po-field-lbl">Balance Due</div>
                  <div className="po-field-val" style={{ color: '#ff6b4a' }}>
                    ₹{fmt(purchase.total - purchase.paid_amount)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="po-info-section">
            <div className="po-info-label">Items Purchased</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#1F3864' }}>
                  {['#', 'Item', 'Batch', 'Expiry', 'Qty', 'Dmg', 'Cost Price', 'Total'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 12, color: '#fff' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(purchase.items || []).map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                      {item.barcode && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{item.barcode}</div>
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'monospace' }}>{item.batch_number || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{item.expiry_date || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{item.qty}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, color: item.damaged_qty > 0 ? '#ff6b4a' : 'var(--muted)' }}>
                      {item.damaged_qty > 0 ? item.damaged_qty : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>₹{fmt(item.cost_price)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>₹{fmt(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 56, fontSize: 13, color: 'var(--muted)' }}>
              <span>Subtotal</span><span>₹{fmt(purchase.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', gap: 56, fontSize: 16, fontWeight: 700, color: '#6c8fff', borderTop: '2px solid #6c8fff', paddingTop: 8, marginTop: 4 }}>
              <span>Grand Total</span><span>₹{fmt(purchase.total)}</span>
            </div>
            {purchase.paid_amount > 0 && (
              <div style={{ display: 'flex', gap: 56, fontSize: 13, color: 'var(--accent)' }}>
                <span>Amount Paid</span><span>₹{fmt(purchase.paid_amount)}</span>
              </div>
            )}
            {purchase.paid_amount > 0 && purchase.payment_status !== 'Paid' && (
              <div style={{ display: 'flex', gap: 56, fontSize: 13, color: '#ff6b4a' }}>
                <span>Balance Due</span><span>₹{fmt(purchase.total - purchase.paid_amount)}</span>
              </div>
            )}
          </div>

          {purchase.notes && (
            <div style={{ background: 'rgba(108,143,255,.08)', borderLeft: '3px solid #6c8fff', padding: '10px 14px', borderRadius: 4, fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              📝 {purchase.notes}
            </div>
          )}

          <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 16, fontSize: 12, color: 'var(--muted)', marginTop: 24 }}>
            Purchase Order — StockFlow Inventory System
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print / Save PDF</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Purchases Page ──────────────────────────────────────────────────
export default function Purchases() {
  const { can } = useAuth();
  const [purchases,    setPurchases]    = useState([]);
  const [stats,        setStats]        = useState({});
  const [items,        setItems]        = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [poModal,      setPOModal]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [cart,         setCart]         = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [itemSearch,   setItemSearch]   = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab,    setActiveTab]    = useState('all');
  const [invoiceFile,  setInvoiceFile]  = useState(null);
  const [lastPrices,   setLastPrices]   = useState({});

  // ── Load data ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, st, it, sup] = await Promise.allSettled([
        api.get('/purchases'),
        api.get('/purchases/stats'),
        api.get('/items'),
        api.get('/suppliers'),
      ]);
      if (p.status   === 'fulfilled') setPurchases(p.value.data?.data   || []);
      if (st.status  === 'fulfilled') setStats(st.value.data?.data      || {});
      if (it.status  === 'fulfilled') setItems(it.value.data?.data      || []);
      if (sup.status === 'fulfilled') setSuppliers((sup.value.data?.data || []).filter(s => s.status === 'active'));
    } catch (e) {
      console.error('Purchases load error:', e);
      toastError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Build last-price lookup from purchase history ─────────────────────
  useEffect(() => {
    if (purchases.length === 0) return;
    const priceMap = {};
    const sorted = [...purchases].sort((a, b) => a.created_at > b.created_at ? 1 : -1);
    sorted.forEach(pur => {
      (pur.items || []).forEach(pi => {
        priceMap[pi.item_id] = pi.cost_price;
      });
    });
    setLastPrices(priceMap);
  }, [purchases]);

  // ── Form helpers ──────────────────────────────────────────────────────
  const setF = field => e => {
    const val = e.target.value;
    if (field === 'supplier_id') {
      const sup = suppliers.find(s => String(s.id) === String(val));
      setForm(p => ({ ...p, supplier_id: val, supplier_name: sup ? sup.company_name : '' }));
    } else {
      setForm(p => ({ ...p, [field]: val }));
    }
  };

  // ── Cart helpers ──────────────────────────────────────────────────────
  const filteredItems = items.filter(i =>
    itemSearch.length > 0 && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.barcode || '').includes(itemSearch)
    )
  );

  const addToCart = item => {
    setCart(prev => {
      if (prev.find(c => c.item_id === item.id)) {
        return prev.map(c => c.item_id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        item_id: item.id, item_name: item.name, barcode: item.barcode || '',
        qty: 1, cost_price: item.price || 0,
        ...EMPTY_CART_ITEM,
      }];
    });
    setItemSearch('');
    setShowDropdown(false);
  };

  const updateCart     = (id, field, value) => setCart(p => p.map(c => c.item_id === id ? { ...c, [field]: value } : c));
  const removeFromCart = id => setCart(p => p.filter(c => c.item_id !== id));
  const total          = cart.reduce((s, c) => s + (c.qty || 0) * (c.cost_price || 0), 0);

  // ── Save purchase ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (cart.length === 0) { toastError('Add at least one item'); return; }
    setSaving(true);
    try {
      const res = await api.post('/purchases', {
        ...form,
        items: cart.map(c => ({
          item_id:         c.item_id,
          qty:             c.qty,
          cost_price:      c.cost_price,
          expiry_date:     c.expiry_date     || '',
          batch_number:    c.batch_number    || '',
          damaged_qty:     c.damaged_qty     || 0,
          damaged_remarks: c.damaged_remarks || '',
        })),
      });
      toastSuccess(`Purchase recorded — ${res.data.data.purchase_number}`);
      setModalOpen(false);
      setCart([]);
      setForm(EMPTY_FORM);
      setInvoiceFile(null);
      load();
      setTimeout(() => setPOModal(res.data.data), 400);
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to record purchase');
    } finally {
      setSaving(false);
    }
  };

  // ── Update order / payment status ─────────────────────────────────────
  const handleStatusUpdate = async (pur, patch) => {
    try {
      await api.patch(`/purchases/${pur.id}/payment`, patch);
      toastSuccess('Status updated');
      load();
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to update');
    }
  };

  // ── Delete / Revert ───────────────────────────────────────────────────
  const handleDelete = async pur => {
    const msg = pur.order_status === 'received'
      ? `Delete ${pur.purchase_number}?\n\nThis will REMOVE the received stock from inventory.`
      : `Delete ${pur.purchase_number}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/purchases/${pur.id}`);
      toastSuccess(`${pur.purchase_number} deleted${pur.order_status === 'received' ? ' & stock reversed' : ''}`);
      load();
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to delete');
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = purchases.filter(p => {
    const matchTab    = activeTab === 'all' || p.order_status === activeTab;
    const matchSearch = !search ||
      p.purchase_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier_name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.invoice_number || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = tab => tab === 'all' ? purchases.length
    : purchases.filter(p => p.order_status === tab).length;

  const fmtDate = s => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const STATS_CARDS = [
    { label: 'Total Purchases',  val: stats.total_purchases || 0,  cls: 'blue'   },
    { label: 'Total Spent',      val: `₹${Number(stats.total_spent    || 0).toLocaleString('en-IN')}`, cls: 'green'  },
    { label: 'Pending Payments', val: stats.pending_payments || 0, cls: 'orange' },
    { label: 'Pending Amount',   val: `₹${Number(stats.pending_amount || 0).toLocaleString('en-IN')}`, cls: 'purple' },
  ];

  // ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar
        title="Purchases"
        onAdd={can('create_purchase') ? () => { setCart([]); setForm(EMPTY_FORM); setModalOpen(true); } : null}
        addLabel=" Add Purchase"
      />
      <div className="content-wrap">

        {/* Stat cards */}
        <div className="sal-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS_CARDS.map((s, i) => (
            <div key={i} className={`ssc ${s.cls}`}>
              <span className="ssc-val">{s.val}</span>
              <span className="ssc-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="pur-tabs">
          {STATUS_TABS.map(tab => (
            <button key={tab} className={`pur-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'all' ? '📋 All' : tab === 'draft' ? '📝 Draft' : tab === 'ordered' ? '🛒 Ordered' : tab === 'received' ? '✅ Received' : '❌ Cancelled'}
              <span className="pur-tab-count">{tabCount(tab)}</span>
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="table-header">
          <h2>
            {activeTab === 'all' ? 'All Purchases' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            <span className="count-badge"> ({filtered.length})</span>
          </h2>
          <input className="search-input" placeholder="Search PO, supplier, invoice…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Invoice</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="9">
                    <div className="empty-state">
                      <div className="empty-icon">📦</div>
                      <p>No purchases {activeTab !== 'all' ? `with status "${activeTab}"` : 'recorded yet'}.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(pur => {
                  const osMeta = ORDER_STATUSES.find(o => o.value === pur.order_status) || ORDER_STATUSES[1];
                  return (
                    <tr key={pur.id}>
                      <td><span className="txn-id" style={{ color: '#6c8fff' }}>{pur.purchase_number}</span></td>
                      <td><span style={{ fontWeight: 600, fontSize: '.88rem' }}>{pur.supplier_name || '—'}</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--muted)' }}>{pur.invoice_number || '—'}</span></td>
                      <td><span className="badge-pill" style={{ background: 'rgba(108,143,255,.15)', color: '#6c8fff' }}>{pur.items?.length || 0} item(s)</span></td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#6c8fff', fontFamily: 'monospace' }}>
                          ₹{Number(pur.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {pur.payment_status === 'Partial' && pur.paid_amount > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 2 }}>
                            Paid: ₹{Number(pur.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className={`pur-status-badge ${pur.payment_status === 'Paid' ? 'paid' : pur.payment_status === 'Partial' ? 'partial' : 'pending'}`}>
                            {pur.payment_status}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{pur.payment_method}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`pur-status-badge ${pur.order_status}`}>{osMeta.label}</span>
                      </td>
                      <td><span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{fmtDate(pur.created_at)}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <button className="btn-invoice" onClick={() => setPOModal(pur)} title="View PO">🧾 PO</button>
                          {can('create_purchase') && pur.order_status === 'ordered' && (
                            <button className="btn-invoice"
                              style={{ background: 'rgba(0,229,160,.1)', color: 'var(--accent)', borderColor: 'rgba(0,229,160,.3)' }}
                              onClick={() => handleStatusUpdate(pur, { order_status: 'received', payment_status: pur.payment_status })}>
                              ✅ Receive
                            </button>
                          )}
                          {can('create_purchase') && pur.payment_status !== 'Paid' && (
                            <button className="btn-invoice"
                              style={{ background: 'rgba(0,229,160,.1)', color: 'var(--accent)', borderColor: 'rgba(0,229,160,.3)' }}
                              onClick={() => handleStatusUpdate(pur, { payment_status: 'Paid', order_status: pur.order_status })}>
                              💳 Mark Paid
                            </button>
                          )}
                          {can('manage_sales') && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(pur)}
                              title={pur.order_status === 'received' ? 'Revert & delete — stock removed' : 'Delete purchase'}>
                              {pur.order_status === 'received' ? '↩ Revert' : '✕ Del'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── NEW PURCHASE MODAL ── */}
      {modalOpen && (
        <div className="modal-overlay open" onClick={() => setModalOpen(false)}>
          <div className="modal pur-modal scale-in" onClick={e => e.stopPropagation()}>
            <h2>📦 New Purchase Order</h2>
            <div className="sale-layout">

              {/* LEFT: Items */}
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
                      💡 Start typing to search {items.length} inventory items
                    </div>
                  )}
                  {itemSearch && showDropdown && (
                    <div className="item-dropdown">
                      {filteredItems.length === 0 ? (
                        <div className="item-option" style={{ color: 'var(--muted)', cursor: 'default' }}>
                          No items match "{itemSearch}"
                        </div>
                      ) : filteredItems.slice(0, 8).map(item => {
                        const lastP = lastPrices[item.id];
                        return (
                          <div key={item.id} className="item-option" onClick={() => addToCart(item)}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{item.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                                {item.barcode || 'No barcode'} | {item.category}
                              </div>
                            </div>
                            <div className="item-opt-right">
                              <span className="stock-badge">Stock: {item.qty}</span>
                              <span className="price-badge">MRP ₹{item.price}</span>
                              {lastP !== undefined && (
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Last: ₹{Number(lastP).toLocaleString('en-IN')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cart */}
                <div className="cart-wrap">
                  {cart.length === 0 ? (
                    <div className="cart-empty">📦 No items added yet — search above</div>
                  ) : cart.map(c => {
                    const lastP     = lastPrices[c.item_id];
                    const priceHike = lastP !== undefined && c.cost_price > lastP * 1.05;
                    return (
                      <div key={c.item_id} className={`cart-item${priceHike ? ' price-hike' : ''}`}>
                        <div className="cart-item-top">
                          <span className="cart-item-name">{c.item_name}</span>
                          <button className="cart-remove" onClick={() => removeFromCart(c.item_id)}>✕</button>
                        </div>

                        {lastP !== undefined && (
                          <div className={`pur-price-hint${priceHike ? ' hike' : ''}`}>
                            {priceHike
                              ? `⚠ Price hike! Last purchased at ₹${Number(lastP).toLocaleString('en-IN')}`
                              : `✓ Last purchased at ₹${Number(lastP).toLocaleString('en-IN')}`}
                          </div>
                        )}

                        <div className="pur-cart-grid">
                          <div className="cart-field">
                            <label>Qty</label>
                            <div className="cart-qty">
                              <button onClick={() => updateCart(c.item_id, 'qty', Math.max(1, (c.qty || 1) - 1))}>−</button>
                              <input type="number" value={c.qty} min={1}
                                onChange={e => updateCart(c.item_id, 'qty', parseInt(e.target.value) || 1)} />
                              <button onClick={() => updateCart(c.item_id, 'qty', (c.qty || 1) + 1)}>+</button>
                            </div>
                          </div>

                          <div className="cart-field">
                            <label>Cost Price (₹)</label>
                            <input className="cart-price-input" type="number" value={c.cost_price} step="0.01" min={0}
                              onChange={e => updateCart(c.item_id, 'cost_price', parseFloat(e.target.value) || 0)} />
                          </div>

                          <div className="cart-field">
                            <label>Total</label>
                            <span className="cart-line-total" style={{ color: '#6c8fff' }}>
                              ₹{((c.qty || 0) * (c.cost_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="cart-field">
                            <label>Batch No.</label>
                            <input className="cart-price-input" value={c.batch_number} placeholder="e.g. B-2024-01"
                              onChange={e => updateCart(c.item_id, 'batch_number', e.target.value)} />
                          </div>

                          <div className="cart-field">
                            <label>Expiry Date <span style={{ color: 'var(--muted)', fontSize: '10px' }}>(optional)</span></label>
                            <input className="cart-price-input" type="date" value={c.expiry_date}
                              onChange={e => updateCart(c.item_id, 'expiry_date', e.target.value)} />
                          </div>

                          <div className="cart-field">
                            <label>Damaged Units</label>
                            <input className="cart-price-input" type="number" value={c.damaged_qty || 0} min={0} max={c.qty}
                              onChange={e => updateCart(c.item_id, 'damaged_qty', parseInt(e.target.value) || 0)} />
                          </div>
                        </div>

                        {(c.damaged_qty || 0) > 0 && (
                          <div className="cart-field" style={{ marginTop: 8 }}>
                            <label>Damaged Remarks</label>
                            <input className="cart-price-input" style={{ width: '100%' }}
                              value={c.damaged_remarks} placeholder="Describe damage…"
                              onChange={e => updateCart(c.item_id, 'damaged_remarks', e.target.value)} />
                          </div>
                        )}
                        {(c.damaged_qty || 0) > 0 && (
                          <div className="cart-warn">
                            ⚠ {c.damaged_qty} damaged unit(s) — only {(c.qty || 0) - (c.damaged_qty || 0)} usable units will be added to stock
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cart.length > 0 && (
                  <div className="cart-totals">
                    <div className="ct-row grand" style={{ color: '#6c8fff' }}>
                      <span>Grand Total</span>
                      <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* Invoice upload */}
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>📎 Upload Invoice / Bill <span style={{ color: 'var(--muted)', fontSize: '11px' }}>(PDF or image — for your records)</span></label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="pur-file-input"
                    onChange={e => setInvoiceFile(e.target.files[0] || null)} />
                  {invoiceFile && (
                    <div className="pur-file-preview">
                      📄 {invoiceFile.name}
                      {invoiceFile.type.startsWith('image/') && (
                        <img src={URL.createObjectURL(invoiceFile)} alt="invoice preview"
                          style={{ maxHeight: 120, maxWidth: '100%', marginTop: 8, borderRadius: 6, display: 'block' }} />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Supplier + Payment */}
              <div className="sale-right">
                <div className="form-group">
                  <label>Supplier</label>
                  <select value={form.supplier_id} onChange={setF('supplier_id')}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Supplier Invoice No.</label>
                  <input value={form.invoice_number} onChange={setF('invoice_number')} placeholder="e.g. SI-2024-001" />
                </div>

                <div className="form-group">
                  <label>Order Status</label>
                  <select value={form.order_status} onChange={setF('order_status')}>
                    {ORDER_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {form.order_status === 'received' && (
                    <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: 4 }}>✅ Stock will be added immediately</div>
                  )}
                  {form.order_status === 'draft' && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>📝 Draft — no stock changes yet</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={form.payment_method} onChange={setF('payment_method')}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Status</label>
                  <select value={form.payment_status} onChange={setF('payment_status')}>
                    <option value="Pending">⏳ Pending</option>
                    <option value="Partial">◑ Partial</option>
                    <option value="Paid">✓ Paid</option>
                  </select>
                </div>

                {form.payment_status === 'Partial' && (
                  <div className="form-group">
                    <label>Amount Paid (₹)</label>
                    <input type="number" value={form.paid_amount} min={0} step="0.01"
                      onChange={setF('paid_amount')} placeholder="Enter amount paid so far" />
                    {form.paid_amount > 0 && total > 0 && (
                      <div style={{ fontSize: '12px', color: '#ffc542', marginTop: 4 }}>
                        Balance due: ₹{Math.max(0, total - parseFloat(form.paid_amount || 0))
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={setF('notes')} placeholder="Any remarks…" rows={3} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || cart.length === 0}>
                {saving ? 'Recording…' : '✓ Record Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {poModal && <POModal purchase={poModal} onClose={() => setPOModal(null)} />}
    </>
  );
}
