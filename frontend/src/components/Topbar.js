// frontend/src/components/Topbar.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import UserBadge from './UserBadge';
import './Topbar.css';

export default function Topbar({ title, onAdd, onScan, addLabel ="Add Item" }) {
  const { can } = useAuth();

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {onScan && (
          <button className="btn btn-ghost" onClick={onScan}>📷 Scan Barcode</button>
        )}
        {onAdd && can('add_item') && (
          <button className="btn btn-primary" onClick={onAdd}>+ {addLabel}</button>
        )}
        
        <UserBadge />
      </div>
    </header>
  );
}
