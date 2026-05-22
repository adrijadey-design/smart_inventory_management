// frontend/src/pages/EmployeesTemp.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/apiClient';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toast';
import './EmployeesTemp.css';

const EMPTY = {
  emp_number:'', full_name:'', gender:'', dob:'', phone:'', email:'',
  address:'', doj:'', user_type:'staff', salary:'', username:'', password:'', status:'active',
};

const RS = {
  admin: { bg:'rgba(0,229,160,.12)',  border:'rgba(0,229,160,.35)',  color:'var(--accent)',  icon:'👑', label:'Admin'  },
  staff: { bg:'rgba(108,143,255,.12)',border:'rgba(108,143,255,.35)',color:'var(--accent3)', icon:'🧑‍💼', label:'Staff'  },
  owner: { bg:'rgba(255,197,66,.12)', border:'rgba(255,197,66,.35)', color:'var(--warn)',    icon:'🏪', label:'Owner' },
};

export default function Employees() {
  const { can } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [stats,     setStats]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [roleFilter,setRoleFilter]= useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmp,   setEditEmp]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [viewEmp,   setViewEmp]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([
        api.get('/employees'),
        api.get('/employees/stats'),
      ]);
      setEmployees(e.data.data);
      setStats(s.data.data);
    } catch { toastError('Failed to load employees'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditEmp(null); setForm({...EMPTY}); setShowPw(false); setModalOpen(true); };
  const openEdit = (emp) => {
    setEditEmp(emp);
    setForm({ emp_number:emp.emp_number, full_name:emp.full_name, gender:emp.gender,
              dob:emp.dob, phone:emp.phone, email:emp.email, address:emp.address||'',
              doj:emp.doj, user_type:emp.user_type, salary:emp.salary,
              username:emp.username, password:'', status:emp.status });
    setShowPw(false); setModalOpen(true);
  };

  const set = f => e => setForm(p => ({...p, [f]: e.target.value}));

  const handleSave = async () => {
    if (!form.emp_number.trim()) { toastError('Employee number required'); return; }
    if (!form.full_name.trim())  { toastError('Full name required'); return; }
    if (!form.gender)            { toastError('Gender required'); return; }
    if (!form.dob)               { toastError('Date of birth required'); return; }
    if (!form.phone.trim())      { toastError('Phone required'); return; }
    if (!form.email.trim())      { toastError('Email required'); return; }
    if (!form.doj)               { toastError('Date of joining required'); return; }
    if (!form.username.trim())   { toastError('Username required'); return; }
    if (!editEmp && !form.password.trim()) { toastError('Password required'); return; }
    setSaving(true);
    try {
      if (editEmp) {
        await api.put(`/employees/${editEmp.id}`, form);
        toastSuccess(`${form.full_name} updated`);
      } else {
        await api.post('/employees', form);
        toastSuccess(`${form.full_name} added`);
      }
      setModalOpen(false); load();
    } catch (e) { toastError(e.response?.data?.error || 'Failed to save'); }
    finally     { setSaving(false); }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Remove "${emp.full_name}"?`)) return;
    try {
      await api.delete(`/employees/${emp.id}`);
      toastSuccess(`${emp.full_name} removed`);
      load();
    } catch (e) { toastError(e.response?.data?.error || 'Failed to delete'); }
  };

  const filtered = employees.filter(e =>
    (!search     || e.full_name.toLowerCase().includes(search.toLowerCase()) ||
                    e.emp_number.toLowerCase().includes(search.toLowerCase()) ||
                    e.email.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || e.user_type === roleFilter)
  );

  const STATS = [
    { label:'Total',    val: stats.total    || 0, cls:'blue'   },
    { label:'Active',   val: stats.active   || 0, cls:'green'  },
    { label:'Inactive', val: stats.inactive || 0, cls:'orange' },
    { label:'Admins',   val: (stats.by_role||{}).admin || 0, cls:'teal'   },
    { label:'Staff',    val: (stats.by_role||{}).staff || 0, cls:'purple' },
    { label:'Owners',   val: (stats.by_role||{}).owner || 0, cls:'yellow' },
  ];

  return (
    <>
      <Topbar title="Employee Management" onAdd={can('manage_employees') ? openAdd : null} addLabel='Add Employee' />
      <div className="content-wrap">

        <div className="emp-stats">
          {STATS.map((s,i) => (
            <div key={i} className={`esc ${s.cls}`}>
              <span className="esc-val">{s.val}</span>
              <span className="esc-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="table-header">
          <h2>All Employees <span style={{color:'var(--muted)',fontWeight:400,fontSize:'.8rem'}}>({filtered.length})</span></h2>
          <div className="search-bar">
            <input className="search-input" placeholder="Search name, ID or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="filter-select" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>

        {loading ? <div className="spinner-wrap"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Emp No.</th><th>Name</th><th>Role</th><th>Contact</th>
                <th>Email</th><th>D.O.J</th><th>Salary</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="9"><div className="empty-state"><div className="empty-icon">👥</div><p>No employees found</p></div></td></tr>
                ) : filtered.map(emp => {
                  const rs = RS[emp.user_type] || RS.staff;
                  return (
                    <tr key={emp.id}>
                      <td><span className="mono emp-num">{emp.emp_number}</span></td>
                      <td>
                        <div className="emp-name">{emp.full_name}</div>
                        <div className="emp-uname mono">@{emp.username}</div>
                      </td>
                      <td>
                        <span className="role-pill" style={{background:rs.bg,border:`1px solid ${rs.border}`,color:rs.color}}>
                          {rs.icon} {rs.label}
                        </span>
                      </td>
                      <td><span className="mono">{emp.phone}</span></td>
                      <td><span style={{fontSize:'.78rem'}}>{emp.email}</span></td>
                      <td><span className="mono">{emp.doj}</span></td>
                      <td><span className="mono">₹{Number(emp.salary).toLocaleString('en-IN')}</span></td>
                      <td>
                        <span className={`status-pill ${emp.status}`}>
                          {emp.status === 'active' ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-ghost btn-sm" onClick={()=>setViewEmp(emp)}>View</button>
                          {can('manage_employees') && <>
                            <button className="btn btn-warn btn-sm" onClick={()=>openEdit(emp)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(emp)}>Del</button>
                          </>}
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

      {/* ADD/EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay open" onClick={()=>setModalOpen(false)}>
          <div className="modal emp-modal scale-in" onClick={e=>e.stopPropagation()}>
            <h2>{editEmp ? 'Edit Employee' : 'Add New Employee'}</h2>
            <div className="emp-form-grid">
              <div className="form-group"><label>Employee Number *</label><input value={form.emp_number} onChange={set('emp_number')} placeholder="e.g. EMP002"/></div>
              <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={set('full_name')} placeholder="Full name"/></div>
              <div className="form-group"><label>Gender *</label>
                <select value={form.gender} onChange={set('gender')}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group"><label>Date of Birth *</label><input type="date" value={form.dob} onChange={set('dob')}/></div>
              <div className="form-group"><label>Phone *</label><input value={form.phone} onChange={set('phone')} placeholder="10-digit number"/></div>
              <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com"/></div>
              <div className="form-group full"><label>Address</label><input value={form.address} onChange={set('address')} placeholder="Full address"/></div>
              <div className="form-group"><label>Date of Joining *</label><input type="date" value={form.doj} onChange={set('doj')}/></div>
              <div className="form-group"><label>Role / User Type *</label>
                <select value={form.user_type} onChange={set('user_type')}>
                  <option value="admin">👑 Admin</option>
                  <option value="staff">🧑‍💼 Staff</option>
                  <option value="owner">🏪 Owner</option>
                </select>
              </div>
              <div className="form-group"><label>Salary (₹)</label><input type="number" value={form.salary} onChange={set('salary')} placeholder="0" min="0"/></div>
              <div className="form-group"><label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="full emp-divider"><span>Login Credentials</span></div>
              <div className="form-group"><label>Username *</label><input value={form.username} onChange={set('username')} placeholder="Login username" autoComplete="off"/></div>
              <div className="form-group"><label>{editEmp ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <div className="pw-field">
                  <input type={showPw?'text':'password'} value={form.password} onChange={set('password')}
                    placeholder={editEmp ? 'Leave blank to keep' : 'Min 6 characters'} autoComplete="new-password"/>
                  <button type="button" className="pw-toggle" onClick={()=>setShowPw(v=>!v)} tabIndex={-1}>
                    {showPw?'🙈':'👁️'}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editEmp ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewEmp && (() => {
        const rs = RS[viewEmp.user_type] || RS.staff;
        return (
          <div className="modal-overlay open" onClick={()=>setViewEmp(null)}>
            <div className="modal emp-view scale-in" onClick={e=>e.stopPropagation()}>
              <div className="view-top">
                <div className="view-avatar" style={{background:rs.bg,border:`2px solid ${rs.border}`}}>
                  <span>{rs.icon}</span>
                </div>
                <div>
                  <div className="view-name">{viewEmp.full_name}</div>
                  <span className="role-pill" style={{background:rs.bg,border:`1px solid ${rs.border}`,color:rs.color}}>
                    {rs.icon} {rs.label}
                  </span>
                </div>
              </div>
              <div className="view-grid">
                {[
                  ['Employee No.', viewEmp.emp_number],
                  ['Username',     `@${viewEmp.username}`],
                  ['Gender',       viewEmp.gender],
                  ['Date of Birth',viewEmp.dob],
                  ['Phone',        viewEmp.phone],
                  ['Email',        viewEmp.email],
                  ['Date of Join', viewEmp.doj],
                  ['Salary',       `₹${Number(viewEmp.salary).toLocaleString('en-IN')}`],
                  ['Status',       viewEmp.status.charAt(0).toUpperCase()+viewEmp.status.slice(1)],
                  ['Address',      viewEmp.address || '—'],
                ].map(([l,v]) => (
                  <div key={l} className="vf">
                    <span className="vf-label">{l}</span>
                    <span className="vf-val">{v}</span>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                {can('manage_employees') && (
                  <button className="btn btn-warn" onClick={()=>{ setViewEmp(null); openEdit(viewEmp); }}>Edit</button>
                )}
                <button className="btn btn-ghost" onClick={()=>setViewEmp(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
