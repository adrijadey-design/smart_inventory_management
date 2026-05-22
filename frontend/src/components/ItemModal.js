// frontend/src/components/ItemModal.js
import React, { useState, useEffect } from 'react';
import './Modal.css';

const CATS = ['Grocery', 'Stationery', 'Lab Supplies', 'Electronics', 'Clothing', 'Other'];
const EMPTY = { name: '', category: 'Grocery', barcode: '', qty: '', price: '', threshold: '' };

export default function ItemModal({ isOpen, item, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(item
        ? { name: item.name, category: item.category, barcode: item.barcode || '',
            qty: item.qty, price: item.price, threshold: item.threshold }
        : EMPTY
      );
    }
  }, [isOpen, item]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Item name is required'); return; }
    setSaving(true);
    try {
      await onSave({
        name:      form.name.trim(),
        category:  form.category,
        barcode:   form.barcode.trim() || `BC${Date.now()}`,
        qty:       parseInt(form.qty)       || 0,
        price:     parseFloat(form.price)   || 0,
        threshold: parseInt(form.threshold) || 5,
      });
      onClose();
    } catch (_) {
      /* toast already shown by context */
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal scale-in" onClick={e => e.stopPropagation()}>
        <h2>{item ? 'Edit Item' : 'Add New Item'}</h2>

        <div className="form-grid">
          <div className="form-group full">
            <label>Item Name</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Rice 1kg" autoFocus />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={set('category')}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Barcode No.</label>
            <input value={form.barcode} onChange={set('barcode')} placeholder="e.g. 8901234567890" />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" min="0" value={form.qty} onChange={set('qty')} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Price (₹)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Low-Stock Threshold</label>
            <input type="number" min="1" value={form.threshold} onChange={set('threshold')} placeholder="10" />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
