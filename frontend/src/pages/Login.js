// frontend/src/pages/Login.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPw,   setShowPw]     = useState(false);
  const [error,    setError]      = useState('');
  const [loading,  setLoading]    = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await login(username.trim(), password.trim());
    if (!res.success) {
      setError(res.error || 'Invalid credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="login-root">

      {/* ── Left panel ── */}
      <div className="login-left">
        <div className="login-left-inner">

          {/* Logo */}
          <div className="login-logo">
            <span className="login-logo-stock">Stock</span><span className="login-logo-flow">Flow</span>
          </div>
          <div className="login-logo-sub">INVENTORY MANAGEMENT SYSTEM</div>

          {/* Headline */}
          <h1 className="login-headline">
            Manage Your<br />
            <span className="login-headline-accent">Inventory Smarter</span>
          </h1>
          <p className="login-tagline">
            A complete inventory solution for small businesses — track stock,
            manage sales, monitor purchases and get expiry alerts all in one place.
          </p>

          {/* Feature bullets */}
          <ul className="login-features">
            <li><span className="lf-dot" />Real-time stock tracking</li>
            <li><span className="lf-dot" />Sales & purchase management</li>
            <li><span className="lf-dot" />Barcode scanner support</li>
            <li><span className="lf-dot" />Expiry date alerts</li>
            <li><span className="lf-dot" />Analytics & reports</li>
          </ul>

          {/* Stats row */}
          <div className="login-stats">
            <div className="login-stat">
              <div className="login-stat-val">100+</div>
              <div className="login-stat-lbl">Items Tracked</div>
            </div>
            <div className="login-stat-divider" />
            <div className="login-stat">
              <div className="login-stat-val">Real-time</div>
              <div className="login-stat-lbl">Stock Updates</div>
            </div>
            <div className="login-stat-divider" />
            <div className="login-stat">
              <div className="login-stat-val">24/7</div>
              <div className="login-stat-lbl">Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-right">
        <div className="login-form-card">

          <div className="login-form-header">
            <h2 className="login-form-title">Welcome Back</h2>
            <p className="login-form-sub">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" autoComplete="off">

            {/* Username */}
            <div className="lf-group">
              <label className="lf-label">USERNAME</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">👤</span>
                <input
                  className="lf-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="lf-group">
              <label className="lf-label">PASSWORD</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">🔒</span>
                <input
                  className="lf-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="lf-eye"
                  onClick={() => setShowPw(p => !p)}
                  tabIndex={-1}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="lf-forgot-row">
              <button type="button" className="lf-forgot" onClick={() => setForgotOpen(true)}>
                Forgot Password?
              </button>
            </div>

            {/* Error */}
            {error && <div className="lf-error">⚠ {error}</div>}

            {/* Submit */}
            <button type="submit" className="lf-submit" disabled={loading}>
              {loading ? (
                <span className="lf-submit-loading"><span className="lf-spinner" /> Signing in…</span>
              ) : (
                'Sign In →'
              )}
            </button>

          </form>

          <p className="lf-contact">Contact your administrator if you need an account.</p>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {forgotOpen && (
        <ForgotModal onClose={() => setForgotOpen(false)} />
      )}
    </div>
  );
}

// ── Forgot Password ───────────────────────────────────────────────────────
function ForgotModal({ onClose }) {
  const [step,     setStep]     = useState(1); // 1=username, 2=question, 3=new pw
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const getQuestion = async () => {
    if (!username.trim()) { setError('Enter your username'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/auth/get-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'User not found'); }
      else { setQuestion(d.data.question); setStep(2); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (!answer.trim() || !newPw.trim()) { setError('Fill all fields'); return; }
    if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, answer, new_password: newPw }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Reset failed'); }
      else { setSuccess('Password reset! You can now log in.'); setStep(3); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="lf-modal-overlay" onClick={onClose}>
      <div className="lf-modal" onClick={e => e.stopPropagation()}>
        <h3 className="lf-modal-title">Reset Password</h3>

        {step === 1 && (
          <>
            <p className="lf-modal-sub">Enter your username to get your security question.</p>
            <div className="lf-group">
              <label className="lf-label">USERNAME</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">👤</span>
                <input className="lf-input" value={username}
                  onChange={e => setUsername(e.target.value)} placeholder="Your username" />
              </div>
            </div>
            {error && <div className="lf-error">⚠ {error}</div>}
            <button className="lf-submit" onClick={getQuestion} disabled={loading}>
              {loading ? 'Looking up…' : 'Continue →'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="lf-question-box">🔐 {question}</div>
            <div className="lf-group">
              <label className="lf-label">YOUR ANSWER</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">💬</span>
                <input className="lf-input" value={answer}
                  onChange={e => setAnswer(e.target.value)} placeholder="Security answer" />
              </div>
            </div>
            <div className="lf-group">
              <label className="lf-label">NEW PASSWORD</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">🔒</span>
                <input className="lf-input" type="password" value={newPw}
                  onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
              </div>
            </div>
            {error && <div className="lf-error">⚠ {error}</div>}
            <button className="lf-submit" onClick={resetPassword} disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password →'}
            </button>
          </>
        )}

        {step === 3 && (
          <div className="lf-success">✅ {success}</div>
        )}

        <button className="lf-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
