// frontend/src/components/Sidebar.js
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const ROLE_STYLE = {
  admin: { color:'var(--accent)',  bg:'rgba(0,229,160,.08)',   border:'rgba(0,229,160,.2)',   label:'Administrator' },
  staff: { color:'var(--accent3)', bg:'rgba(108,143,255,.08)', border:'rgba(108,143,255,.2)', label:'Staff Member'  },
  owner: { color:'var(--warn)',    bg:'rgba(255,197,66,.08)',  border:'rgba(255,197,66,.2)',  label:'Shop Owner'    },
};

// Transaction sub-items
const TRANSACTION_ITEMS = [
  { to: '/sales',     icon: '🛒', label: 'Sales',     action: 'view_sales'     },
  { to: '/purchases', icon: '📦', label: 'Purchases', action: 'view_purchases' },
  { to: '/expiry',    icon: '📅', label: 'Expiry',    action: 'view_inventory' },
];

// Main nav (excluding transactions)
const NAV = [
  { to:'/',          icon:'▦',  label:'Dashboard', action:'view_dashboard' },
  { to:'/inventory', icon:'⊞',  label:'Inventory', action:'view_inventory' },
  { to:'/alerts',    icon:'⚠',  label:'Alerts',    action:'view_alerts'    },
  { to:'/suppliers', icon:'🏭', label:'Suppliers', action:'view_inventory' },
  { to:'/employees', icon:'👥', label:'Employees', action:'view_employees' },
  { to:'/export',    icon:'↓',  label:'Export',    action:'export_data'    },
];

export default function Sidebar() {
  const { lowStockItems, outOfStock, isOnline } = useInventory();
  const { user, can } = useAuth();
  const location = useLocation();
  const alertCount = lowStockItems.length + outOfStock.length;
  const rs = user ? (ROLE_STYLE[user.role] || ROLE_STYLE.staff) : null;

  // Check if any transaction sub-route is active
  const txnPaths = ['/sales', '/purchases', '/expiry'];
  const txnActive = txnPaths.some(p => location.pathname.startsWith(p));

  // Open dropdown if a transaction route is active, otherwise closed by default
  const [txnOpen, setTxnOpen] = useState(txnActive);

  // Check if user has access to any transaction sub-item
  const visibleTxn = TRANSACTION_ITEMS.filter(n => can(n.action));

  return (
    <nav className="sidebar">
      <div className="logo">
        Stock<span className="logo-accent">Flow</span>
        <small>Inventory Tracker</small>
      </div>

      {user && rs && (
        <div className="role-strip" style={{ background: rs.bg, borderBottom: `1px solid ${rs.border}` }}>
          <div className="rs-label" style={{ color: rs.color }}>{rs.label}</div>
        </div>
      )}

      <div className="nav-links">

        {/* Regular nav items before Transactions */}
        {NAV.slice(0, 3).filter(n => can(n.action)).map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
            {label === 'Alerts' && alertCount > 0 && (
              <span className="nav-badge">{alertCount}</span>
            )}
          </NavLink>
        ))}

        {/* Transactions dropdown — only show if user has access to at least one sub-item */}
        {visibleTxn.length > 0 && (
          <div className="nav-group">
            <button
              className={`nav-item nav-group-btn${txnActive ? ' active' : ''}`}
              onClick={() => setTxnOpen(o => !o)}
            >
              <span className="nav-icon">💳</span>
              Transactions
              <span className={`nav-arrow${txnOpen ? ' open' : ''}`}>›</span>
            </button>

            {txnOpen && (
              <div className="nav-sub">
                {visibleTxn.map(({ to, icon, label }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) => `nav-sub-item${isActive ? ' active' : ''}`}>
                    <span className="nav-sub-icon">{icon}</span>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remaining nav items */}
        {NAV.slice(3).filter(n => can(n.action)).map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}

      </div>

      <div className="sidebar-footer">
        <div className={`conn-status ${isOnline ? 'online' : 'offline'}`}>
          <span className="conn-dot" />
          {isOnline ? 'Live — Python API' : 'Offline — localStorage'}
        </div>
        <div className="footer-brand">CodeFlare Labs</div>
      </div>
    </nav>
  );
}
