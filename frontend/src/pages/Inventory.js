// frontend/src/pages/Inventory.js
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Topbar      from '../components/Topbar';
import ItemModal   from '../components/ItemModal';
import ScanModal   from '../components/ScanModal';
import InlineBarcode from '../components/InlineBarcode';
import { inr, qtyClass, stockStatus } from '../utils/helpers';

// ── Table row ─────────────────────────────────────────────────────────────
function ItemRow({ item, onEdit, onDelete, onRestock }) {
  const { label, dot } = stockStatus(item.qty, item.threshold ?? item.min_qty ?? 5);
  return (
    <tr>
      <td>
        <div className="item-name">{item.name}</div>
        <div className="item-barcode" style={{ fontSize: '.7rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
          {item.category}
        </div>
      </td>
      <td style={{ minWidth: 130, maxWidth: 160 }}>
        <InlineBarcode value={item.barcode} height={38} width={1.4} />
      </td>
      <td><span className="category-tag">{item.category}</span></td>
      <td><span className={qtyClass(item.qty, item.threshold ?? item.min_qty ?? 5)}>{item.qty}</span></td>
      <td>
        <span className="mono" style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
          {item.threshold ?? item.min_qty ?? '—'}
        </span>
      </td>
      <td className="price-cell">{inr(item.price)}</td>
      <td>
        <span className="status-dot">
          <span className={`dot ${dot}`} />{label}
        </span>
      </td>
      <td>
        <div className="actions">
          {onEdit    && <button className="btn btn-warn   btn-sm" onClick={() => onEdit(item.id)}>Edit</button>}
          {onDelete  && <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Del</button>}
          {onRestock && <button className="btn btn-warn   btn-sm" onClick={() => onRestock(item.id)}>Restock</button>}
          {!onEdit && !onDelete && !onRestock && (
            <span style={{ fontSize: '.7rem', color: 'var(--muted)', fontFamily: 'monospace' }}>View only</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const colors = {
    green:  '#00e5a0',
    orange: '#ff6b4a',
    blue:   '#6c8fff',
    yellow: '#ffc542',
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderBottom: `3px solid ${c}`, borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: c, fontFamily: 'monospace', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginTop: 4 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Inventory() {
  const { items, loading, error, addItem, updateItem, deleteItem, categories } = useInventory();
  const { can }    = useAuth();
  const navigate   = useNavigate();

  const [addOpen,     setAddOpen]     = useState(false);
  const [scanOpen,    setScanOpen]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [prefillBC,   setPrefillBC]   = useState('');
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const openEdit           = (id) => setEditItem(items.find(i => i.id === id));
  const openAddWithBarcode = (bc) => { setPrefillBC(bc); setAddOpen(true); };

  const handleSave = (data) => {
    if (editItem) return updateItem(editItem.id, data);
    return addItem({ ...data, barcode: prefillBC || data.barcode });
  };

  const handleDelete = (id) => {
    if (window.confirm(`Delete "${items.find(i => i.id === id)?.name}"?`)) deleteItem(id);
  };

  // Stats
  const stats = useMemo(() => ({
    totalItems:  items.length,
    outOfStock:  items.filter(i => i.qty === 0).length,
    lowStock:    items.filter(i => i.qty > 0 && i.qty <= (i.threshold ?? i.min_qty ?? 5)).length,
    totalValue:  items.reduce((s, i) => s + (i.qty * (i.price || 0)), 0),
  }), [items]);

  const fmtVal = v => v >= 100000
    ? `₹${(v / 100000).toFixed(1)}L`
    : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const filtered = items.filter(i => {
    const t   = i.threshold ?? i.min_qty ?? 5;
    const mq  = !search      || i.name.toLowerCase().includes(search.toLowerCase()) || (i.barcode || '').includes(search);
    const mc  = !catFilter   || i.category === catFilter;
    const ms  = !stockFilter
      || (stockFilter === 'low' && i.qty > 0  && i.qty <= t)
      || (stockFilter === 'out' && i.qty === 0)
      || (stockFilter === 'ok'  && i.qty > t);
    return mq && mc && ms;
  });

  const editFn    = can('edit_item')    ? openEdit     : null;
  const deleteFn  = can('delete_item')  ? handleDelete : null;
  const restockFn = !can('edit_item') && can('restock_item') ? openEdit : null;

  return (
    <>
      <Topbar
        title="Inventory"
        onAdd={can('add_item') ? () => setAddOpen(true) : null}
        onScan={() => setScanOpen(true)}
      />
      <div className="content-wrap">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* Stat cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total Items"   value={stats.totalItems}      sub="products tracked"   color="green"  />
            <StatCard label="Low Stock"     value={stats.lowStock}        sub="need reordering"    color="orange" />
            <StatCard label="Total Value"   value={fmtVal(stats.totalValue)} sub="inventory worth" color="blue"   />
            <StatCard label="Out of Stock"  value={stats.outOfStock}      sub="items unavailable"  color="yellow" />
          </div>
        )}

        {/* Table header */}
        <div className="table-header">
          <h2>
            All Items
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '.8rem' }}> ({filtered.length})</span>
          </h2>
          <div className="search-bar">
            <input className="search-input" placeholder="Search name or barcode…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
              <option value="">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="ok">In Stock</option>
            </select>
            {/* Barcode sheet button */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/barcodes')}
              title="View & print all barcodes"
              style={{ whiteSpace: 'nowrap' }}
            >
              🏷️ Barcode Sheet
            </button>
          </div>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Threshold</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8">
                    <div className="empty-state">
                      <div className="empty-icon">📦</div>
                      <p>No items found</p>
                    </div>
                  </td></tr>
                ) : filtered.map(i => (
                  <ItemRow
                    key={i.id}
                    item={i}
                    onEdit={editFn}
                    onDelete={deleteFn}
                    onRestock={restockFn}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(can('add_item') || can('edit_item') || can('restock_item')) && (
        <ItemModal
          isOpen={addOpen || !!editItem}
          item={editItem || (prefillBC ? { barcode: prefillBC } : null)}
          onSave={handleSave}
          onClose={() => { setAddOpen(false); setEditItem(null); setPrefillBC(''); }}
        />
      )}
      <ScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        onEdit={openEdit}
        onAddWithBarcode={openAddWithBarcode}
      />
    </>
  );
}
