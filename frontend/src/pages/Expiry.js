// frontend/src/pages/Expiry.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/apiClient';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toast';
import './Expiry.css';

export default function Expiry() {
  const { can } = useAuth();
  const [overview,  setOverview]  = useState(null);
  const [allItems,  setAllItems]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState({ expiry_date: '', batch_number: '' });
  const [saving,    setSaving]    = useState(false);
  const [daysAhead, setDaysAhead] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, items] = await Promise.all([
        api.get(`/expiry?days=${daysAhead}`),
        api.get('/expiry/items'),
      ]);
      setOverview(ov.data.data);
      setAllItems(items.data.data);
    } catch { toastError('Failed to load expiry data'); }
    finally { setLoading(false); }
  }, [daysAhead]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ expiry_date: item.expiry_date || '', batch_number: item.batch_number || '' });
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await api.patch(`/expiry/items/${editItem.id}`, form);
      toastSuccess(`Expiry updated for "${editItem.name}"`);
      setEditItem(null);
      load();
    } catch (e) { toastError(e.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const pillClass = (status) => {
    if (status === 'expired')       return { label: 'Expired',       cls: 'exp-pill-expired' };
    if (status === 'expiring_soon') return { label: 'Expiring Soon', cls: 'exp-pill-soon'    };
    if (status === 'healthy')       return { label: 'Good',          cls: 'exp-pill-good'    };
    return                                 { label: 'No Date Set',   cls: 'exp-pill-nodate'  };
  };

  const daysLeft = (expiry_date) => {
    if (!expiry_date) return null;
    return Math.ceil((new Date(expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const stats = overview?.stats || {};

  const STAT_CARDS = [
    { label: 'Expired',       val: stats.expired_count       || 0, cls: 'red',    icon: '❌' },
    { label: 'Expiring Soon', val: stats.expiring_soon_count || 0, cls: 'orange', icon: '⚠️' },
    { label: 'Healthy',       val: stats.healthy_count       || 0, cls: 'green',  icon: '✅' },
    { label: 'No Date Set',   val: stats.no_expiry_count     || 0, cls: 'gray',   icon: '📅' },
  ];

  return (
    <>
      <Topbar title="Expiry Tracking" />
      <div className="content-wrap">

        {/* Stat cards */}
        <div className="exp-stats">
          {STAT_CARDS.map((s, i) => (
            <div key={i} className={`exp-stat-card ${s.cls}`}>
              <span className="exp-stat-icon">{s.icon}</span>
              <span className="exp-stat-val">{s.val}</span>
              <span className="exp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Days ahead control */}
        <div className="exp-controls">
          <span style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Alert threshold:</span>
          <select className="filter-select" value={daysAhead}
            onChange={e => setDaysAhead(parseInt(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="exp-tabs">
          {[
            { key: 'overview', label: `⚠️ Alerts (${(overview?.expired?.length || 0) + (overview?.expiring_soon?.length || 0)})` },
            { key: 'all',      label: `📋 All Items (${allItems.length})` },
          ].map(t => (
            <button key={t.key}
              className={`exp-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : activeTab === 'overview' ? (

          <div className="exp-overview">
            {/* Expired */}
            {overview?.expired?.length > 0 && (
              <div className="exp-section">
                <h3 className="exp-section-title exp-expired-title">
                  ❌ Expired Items ({overview.expired.length})
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>Item</th><th>Category</th><th>Batch</th>
                      <th>Stock</th><th>Expired On</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {overview.expired.map(item => (
                        <tr key={item.id} className="exp-row-expired">
                          <td>
                            <div className="item-name-cell">{item.name}</div>
                            <div className="mono" style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{item.barcode}</div>
                          </td>
                          <td>{item.category}</td>
                          <td><span className="mono" style={{ fontSize: '.8rem' }}>{item.batch_number || '—'}</span></td>
                          <td><span className={item.qty === 0 ? 'qty-red' : 'qty-warn'}>{item.qty}</span></td>
                          <td><span className="exp-date expired">{item.expiry_date}</span></td>
                          <td>
                            {can('edit_item') && (
                              <button className="btn btn-warn btn-sm" onClick={() => openEdit(item)}>Update</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Expiring soon */}
            {overview?.expiring_soon?.length > 0 && (
              <div className="exp-section">
                <h3 className="exp-section-title exp-soon-title">
                  ⚠️ Expiring Within {daysAhead} Days ({overview.expiring_soon.length})
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>Item</th><th>Category</th><th>Batch</th>
                      <th>Stock</th><th>Expiry Date</th><th>Days Left</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {overview.expiring_soon.map(item => {
                        const dl = daysLeft(item.expiry_date);
                        return (
                          <tr key={item.id} className="exp-row-soon">
                            <td>
                              <div className="item-name-cell">{item.name}</div>
                              <div className="mono" style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{item.barcode}</div>
                            </td>
                            <td>{item.category}</td>
                            <td><span className="mono" style={{ fontSize: '.8rem' }}>{item.batch_number || '—'}</span></td>
                            <td>{item.qty}</td>
                            <td><span className="exp-date soon">{item.expiry_date}</span></td>
                            <td>
                              <span className={`days-left ${dl <= 7 ? 'critical' : 'warn'}`}>{dl}d</span>
                            </td>
                            <td>
                              {can('edit_item') && (
                                <button className="btn btn-warn btn-sm" onClick={() => openEdit(item)}>Update</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!overview?.expired?.length && !overview?.expiring_soon?.length && (
              <div className="exp-empty">
                <div className="exp-empty-icon">✅</div>
                <p>No expired or expiring items within {daysAhead} days!</p>
              </div>
            )}
          </div>

        ) : (
          /* All items tab */
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Item</th><th>Category</th><th>Batch No.</th><th>Stock</th>
                <th>Expiry Date</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {allItems.map(item => {
                  const { label, cls } = pillClass(item.expiry_status);
                  const dl = daysLeft(item.expiry_date);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="item-name-cell">{item.name}</div>
                        <div className="mono" style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{item.barcode}</div>
                      </td>
                      <td>{item.category}</td>
                      <td><span className="mono" style={{ fontSize: '.8rem' }}>{item.batch_number || '—'}</span></td>
                      <td>{item.qty}</td>
                      <td>
                        {item.expiry_date
                          ? <span className={`exp-date ${item.expiry_status === 'expired' ? 'expired' : item.expiry_status === 'expiring_soon' ? 'soon' : 'good'}`}>
                              {item.expiry_date}
                            </span>
                          : <span style={{ color: 'var(--muted)' }}>—</span>
                        }
                      </td>
                      <td>
                        <span className={`exp-status-pill ${cls}`}>{label}</span>
                        {dl !== null && dl > 0 && item.expiry_status !== 'expired' && (
                          <span className="days-label">{dl}d left</span>
                        )}
                      </td>
                      <td>
                        {can('edit_item') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                            {item.expiry_date ? 'Edit' : 'Set Date'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT EXPIRY MODAL */}
      {editItem && (
        <div className="modal-overlay open" onClick={() => setEditItem(null)}>
          <div className="modal scale-in" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2>Set Expiry — {editItem.name}</h2>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Expiry Date</label>
              <input type="date" value={form.expiry_date}
                onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Batch Number</label>
              <input value={form.batch_number} placeholder="e.g. BATCH-2024-01"
                onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditItem(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
