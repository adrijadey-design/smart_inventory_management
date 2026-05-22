// frontend/src/components/ItemRow.js
import React from 'react';
import { qtyClass, stockStatus, inr } from '../utils/helpers';

export default function ItemRow({ item, showThreshold = false, onEdit, onDelete, editLabel = 'Edit' }) {
  const { label, dot } = stockStatus(item.qty, item.threshold);

  return (
    <tr>
      <td>
        <div className="item-name">{item.name}</div>
        <div className="item-barcode">{item.barcode || '—'}</div>
      </td>
      <td><span className="mono" style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{item.barcode || '—'}</span></td>
      <td><span className="category-tag">{item.category}</span></td>
      <td><span className={qtyClass(item.qty, item.threshold)}>{item.qty}</span></td>
      {showThreshold && (
        <td><span className="mono" style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{item.threshold}</span></td>
      )}
      <td className="price-cell">{inr(item.price)}</td>
      <td>
        <span className="status-dot">
          <span className={`dot ${dot}`} />
          {label}
        </span>
      </td>
      <td>
        <div className="actions">
          <button className="btn btn-warn btn-sm" onClick={() => onEdit(item.id)}>{editLabel}</button>
          {onDelete && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Del</button>
          )}
        </div>
      </td>
    </tr>
  );
}
