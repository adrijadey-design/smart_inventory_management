// frontend/src/components/UserBadge.js
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SecuritySetup from './SecuritySetup';
import { toastSuccess, toastError } from '../utils/toast';
import './UserBadge.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ROLE_COLORS = { admin:'var(--accent)', staff:'var(--accent3)', owner:'var(--warn)' };
const ROLE_ICONS  = { admin:'👑', staff:'🧑‍💼', owner:'🏪' };

export default function UserBadge() {
  const { user, logout } = useAuth();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [secOpen,     setSecOpen]     = useState(false);
  const [changePwOpen,setChangePwOpen]= useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw,setConfPw]= useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (!oldPw || !newPw)   { toastError('All fields required'); return; }
    if (newPw !== confPw)   { toastError('Passwords do not match'); return; }
    if (newPw.length < 6)   { toastError('Min 6 characters'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/auth/change-password`, { old_password: oldPw, new_password: newPw });
      toastSuccess('Password changed successfully');
      setChangePwOpen(false); setOldPw(''); setNewPw(''); setConfPw('');
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to change password');
    } finally { setSaving(false); }
  };

  return (
    <div className="user-badge-wrap">
      <div className="user-badge" onClick={() => setMenuOpen(o => !o)}>
        <span className="user-avatar" style={{background: ROLE_COLORS[user.role]}}>
          {ROLE_ICONS[user.role]}
        </span>
        <div className="user-info">
          <span className="user-name">{user.full_name || user.username}</span>
          <span className="user-role" style={{color: ROLE_COLORS[user.role]}}>
            {user.role.toUpperCase()}
          </span>
        </div>
        <span className="badge-chevron">{menuOpen ? '▲' : '▼'}</span>
      </div>

      {menuOpen && (
        <div className="user-menu" onClick={() => setMenuOpen(false)}>
          <div className="user-menu-divider"/>
          <button className="user-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setChangePwOpen(true); }}>
            Change Password
          </button>
          <button className="user-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSecOpen(true); }}>
            Security Question
          </button>
          <div className="user-menu-divider"/>
          <button className="user-menu-item logout" onClick={logout}>
           Sign Out
          </button>
        </div>
      )}

      {/* Security Question Setup */}
      <SecuritySetup isOpen={secOpen} onClose={() => setSecOpen(false)} />

      {/* Change Password Modal */}
      {changePwOpen && (
        <div className="modal-overlay open" onClick={() => setChangePwOpen(false)}>
          <div className="modal scale-in" style={{maxWidth:420}} onClick={e => e.stopPropagation()}>
            <h2>🔑 Change Password</h2>
            <form onSubmit={handleChangePw}>
              <div className="form-grid" style={{gridTemplateColumns:'1fr', gap:14, marginBottom:20}}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={oldPw} onChange={e=>setOldPw(e.target.value)} placeholder="Enter current password" autoFocus/>
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min 6 characters"/>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={confPw} onChange={e=>setConfPw(e.target.value)} placeholder="Re-enter new password"/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setChangePwOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
