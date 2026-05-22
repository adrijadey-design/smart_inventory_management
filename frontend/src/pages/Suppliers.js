// frontend/src/pages/Suppliers.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/apiClient';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toast';
import './Suppliers.css';

const PAYMENT_TERMS = ['Net 7','Net 15','Net 30','Net 45','Net 60','Immediate','COD'];
const CATEGORIES    = ['Grocery','Stationery','Lab Supplies','Electronics','Clothing','Furniture','Medical','Other'];

const EMPTY = {
  supplier_number:'', company_name:'', contact_person:'', phone:'',
  gst_number:'', category:'General', payment_terms:'Net 30', status:'active',
};

export default function Suppliers() {
  const { can } = useAuth();
  const isAdmin = can('manage_employees');

  const [suppliers,    setSuppliers]    = useState([]);
  const [stats,        setStats]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editSup,      setEditSup]      = useState(null);
  const [viewSup,      setViewSup]      = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search)       params.search = search;
      const [s, st] = await Promise.all([
        api.get('/suppliers', { params }),
        api.get('/suppliers/stats'),
      ]);
      setSuppliers(s.data.data);
      setStats(st.data.data);
    } catch { toastError('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditSup(null); setForm({...EMPTY}); setModalOpen(true); };
  const openEdit = (s) => {
    setEditSup(s);
    setForm({
      supplier_number: s.supplier_number, company_name: s.company_name,
      contact_person:  s.contact_person,  phone:         s.phone,
      gst_number:      s.gst_number,      category:      s.category,
      payment_terms:   s.payment_terms,   status:        s.status,
    });
    setViewSup(null);
    setModalOpen(true);
  };

  const set = f => e => setForm(p => ({...p, [f]: e.target.value}));

  const handleSave = async () => {
    if (!form.supplier_number.trim()) { toastError('Supplier number required'); return; }
    if (!form.company_name.trim())    { toastError('Company name required');    return; }
    if (!form.phone.trim())           { toastError('Phone required');           return; }
    setSaving(true);
    try {
      if (editSup) {
        await api.put(`/suppliers/${editSup.id}`, form);
        toastSuccess(`${form.company_name} updated`);
      } else {
        await api.post('/suppliers', form);
        toastSuccess(`${form.company_name} added`);
      }
      setModalOpen(false); load();
    } catch (e) { toastError(e.response?.data?.error || 'Failed to save'); }
    finally     { setSaving(false); }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(`Remove "${sup.company_name}"?`)) return;
    try {
      await api.delete(`/suppliers/${sup.id}`);
      toastSuccess(`${sup.company_name} removed`);
      load();
    } catch (e) { toastError(e.response?.data?.error || 'Failed to delete'); }
  };

  const STAT_CARDS = [
    { label:'Total',      val: stats.total      || 0, cls:'blue'   },
    { label:'Active',     val: stats.active     || 0, cls:'green'  },
    { label:'Inactive',   val: stats.inactive   || 0, cls:'orange' },
    { label:'Categories', val: stats.categories || 0, cls:'purple' },
  ];

  return (
    <>
      <Topbar title="Supplier Management" onAdd={isAdmin ? openAdd : null} addLabel='Add Supplier'/>
      <div className="content-wrap">

        {/* Stat cards */}
        <div className="sup-stats">
          {STAT_CARDS.map((s,i) => (
            <div key={i} className={`ssc ${s.cls}`}>
              <span className="ssc-val">{s.val}</span>
              <span className="ssc-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="table-header">
          <h2>All Suppliers <span className="count-badge">({suppliers.length})</span></h2>
          <div className="search-bar">
            <input
              className="search-input"
              placeholder="Search name, number, GST, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="spinner-wrap"><div className="spinner"/></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Sup. No.</th><th>Company</th><th>Contact</th>
                <th>Phone</th><th>GST No.</th><th>Category</th>
                <th>Payment Terms</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr><td colSpan="9">
                    <div className="empty-state">
                      <div className="empty-icon">🏭</div>
                      <p>No suppliers found</p>
                    </div>
                  </td></tr>
                ) : suppliers.map(sup => (
                  <tr key={sup.id}>
                    <td><span className="mono sup-num">{sup.supplier_number}</span></td>
                    <td><div className="sup-name">{sup.company_name}</div></td>
                    <td><span>{sup.contact_person || '—'}</span></td>
                    <td><span className="mono">{sup.phone}</span></td>
                    <td><span className="mono gst">{sup.gst_number || '—'}</span></td>
                    <td><span className="cat-pill">{sup.category}</span></td>
                    <td><span className="terms-pill">{sup.payment_terms}</span></td>
                    <td>
                      <span className={`status-pill ${sup.status}`}>
                        {sup.status === 'active' ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewSup(sup)}>View</button>
                        {isAdmin && <>
                          <button className="btn btn-warn btn-sm" onClick={() => openEdit(sup)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sup)}>Del</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay open" onClick={() => setModalOpen(false)}>
          <div className="modal sup-modal scale-in" onClick={e => e.stopPropagation()}>
            <h2>{editSup ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <div className="sup-form-grid">
              <div className="form-group">
                <label>Supplier Number *</label>
                <input value={form.supplier_number} onChange={set('supplier_number')}
                  placeholder="e.g. SUP001" disabled={!!editSup}/>
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <input value={form.company_name} onChange={set('company_name')} placeholder="Company name"/>
              </div>
              <div className="form-group">
                <label>Contact Person</label>
                <input value={form.contact_person} onChange={set('contact_person')} placeholder="Contact name"/>
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input value={form.phone} onChange={set('phone')} placeholder="Phone number"/>
              </div>
              <div className="form-group">
                <label>GST / Tax Number</label>
                <input value={form.gst_number} onChange={set('gst_number')} placeholder="GST number"/>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <select value={form.payment_terms} onChange={set('payment_terms')}>
                  {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editSup ? 'Update Supplier' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewSup && (
        <div className="modal-overlay open" onClick={() => setViewSup(null)}>
          <div className="modal sup-view scale-in" onClick={e => e.stopPropagation()}>
            <div className="view-top">
              <div className="view-avatar sup-avatar">🏭</div>
              <div>
                <div className="view-name">{viewSup.company_name}</div>
                <span className="terms-pill">{viewSup.payment_terms}</span>
              </div>
            </div>
            <div className="view-grid">
              {[
                ['Supplier No.',   viewSup.supplier_number],
                ['Contact Person', viewSup.contact_person || '—'],
                ['Phone',          viewSup.phone],
                ['GST Number',     viewSup.gst_number || '—'],
                ['Category',       viewSup.category],
                ['Payment Terms',  viewSup.payment_terms],
                ['Status',         viewSup.status.charAt(0).toUpperCase()+viewSup.status.slice(1)],
                ['Added On',       viewSup.created_at?.slice(0,10) || '—'],
              ].map(([l,v]) => (
                <div key={l} className="vf">
                  <span className="vf-label">{l}</span>
                  <span className="vf-val">{v}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              {isAdmin && (
                <button className="btn btn-warn" onClick={() => openEdit(viewSup)}>Edit</button>
              )}
              <button className="btn btn-ghost" onClick={() => setViewSup(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
