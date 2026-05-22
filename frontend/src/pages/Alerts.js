// frontend/src/pages/Alerts.js
import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Topbar    from '../components/Topbar';
import ItemModal from '../components/ItemModal';
import { inr, qtyClass, stockStatus } from '../utils/helpers';
import './Alerts.css';

const TABS = [
  { key:'low', label:'Low Stock'    },
  { key:'out', label:'Out of Stock' },
];

function AlertRow({ item, onRestock, canRestock }) {
  const { label, dot } = stockStatus(item.qty, item.threshold);
  return (
    <tr>
      <td>
        <div className="item-name">{item.name}</div>
        <div className="item-barcode">{item.barcode||'—'}</div>
      </td>
      <td><span className="category-tag">{item.category}</span></td>
      <td><span className={qtyClass(item.qty, item.threshold)}>{item.qty}</span></td>
      <td><span className="mono" style={{fontSize:'.75rem',color:'var(--muted)'}}>{item.threshold}</span></td>
      <td className="price-cell">{inr(item.price)}</td>
      <td><span className="status-dot"><span className={`dot ${dot}`}/>{label}</span></td>
      <td>
        {canRestock
          ? <button className="btn btn-warn btn-sm" onClick={() => onRestock(item.id)}>Restock</button>
          : <span style={{fontSize:'.7rem',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>View only</span>
        }
      </td>
    </tr>
  );
}

export default function Alerts() {
  const { items, loading, error, lowStockItems, outOfStock, updateItem } = useInventory();
  const { can } = useAuth();
  const [tab,      setTab]      = useState('low');
  const [editItem, setEditItem] = useState(null);

  const openEdit = (id) => setEditItem(items.find(i => i.id === id));
  const data = tab === 'low' ? lowStockItems : outOfStock;

  // Only admin and staff can restock
  const canRestock = can('restock_item');

  return (
    <>
      <Topbar title="Low-Stock Alerts"/>
      <div className="content-wrap">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* Summary strip */}
        <div className="alert-summary">
          {[
            { label:'Low Stock',    val:lowStockItems.length, cls:'warn'   },
            { label:'Out of Stock', val:outOfStock.length,    cls:'danger' },
            { label:'Healthy',      val:items.length-lowStockItems.length-outOfStock.length, cls:'ok' },
          ].map((s,i) => (
            <div key={i} className={`summary-stat ${s.cls}`}>
              <span className="ss-val">{s.val}</span>
              <span className="ss-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.key} className={`tab${tab===t.key?' active':''}`} onClick={()=>setTab(t.key)}>
              {t.label}
              <span className="tab-count">{t.key==='low'?lowStockItems.length:outOfStock.length}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner"/></div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✅</div><p>No alerts — stock levels look good!</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Item Name</th><th>Category</th><th>Qty</th>
                <th>Threshold</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {data.map(i => (
                  <AlertRow key={i.id} item={i} onRestock={openEdit} canRestock={canRestock}/>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canRestock && (
        <ItemModal
          isOpen={!!editItem}
          item={editItem}
          onSave={(data) => updateItem(editItem.id, data)}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  );
}
