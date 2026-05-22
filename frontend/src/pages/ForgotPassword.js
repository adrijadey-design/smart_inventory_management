// frontend/src/pages/ForgotPassword.js
import React, { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Steps: 1=enter username, 2=answer question, 3=new password, 4=success
export default function ForgotPassword({ onBack }) {
  const [step,     setStep]     = useState(1);
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [confirmPw,setConfirmPw]= useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Step 1 — get security question for username
  const handleGetQuestion = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter your username'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/auth/get-question`, { username: username.trim() });
      setQuestion(res.data.data.question);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Username not found or security question not set up.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify answer
  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) { setError('Please enter your answer'); return; }
    setStep(3);
    setError('');
  };

  // Step 3 — reset password
  const handleReset = async (e) => {
    e.preventDefault();
    if (!newPw.trim())      { setError('Please enter a new password'); return; }
    if (newPw.length < 6)   { setError('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw){ setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/auth/reset-password`, {
        username:     username.trim(),
        answer:       answer.trim(),
        new_password: newPw.trim(),
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Check your answer.');
      setStep(2); // go back to answer step
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
      </div>

      <div className="login-card fp-card">

        {/* Header */}
        <div className="login-logo">Stock<span>Flow</span><small>Password Recovery</small></div>

        {/* Progress steps */}
        <div className="fp-steps">
          {['Username', 'Question', 'New Password', 'Done'].map((label, i) => (
            <div key={i} className={`fp-step ${step > i ? 'done' : step === i+1 ? 'active' : ''}`}>
              <div className="fp-step-dot">{step > i+1 ? '✓' : i+1}</div>
              <div className="fp-step-label">{label}</div>
            </div>
          ))}
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        {/* ── Step 1: Username ── */}
        {step === 1 && (
          <form onSubmit={handleGetQuestion} className="login-form">
            <div className="fp-info">
              Enter your username and we'll show you your security question.
            </div>
            <div className="login-field">
              <label>Your Username</label>
              <div className="input-wrap">
                <span className="input-icon">👤</span>
                <input type="text" placeholder="Enter your username" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }} autoFocus/>
              </div>
            </div>
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? <><span className="btn-spinner"/> Checking…</> : 'Next →'}
            </button>
            <button type="button" className="fp-back-btn" onClick={onBack}>← Back to Login</button>
          </form>
        )}

        {/* ── Step 2: Security question ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyAnswer} className="login-form">
            <div className="fp-info">Answer your security question to continue.</div>
            <div className="fp-question-box">
              <span className="fp-q-icon">❓</span>
              <span className="fp-q-text">{question}</span>
            </div>
            <div className="login-field">
              <label>Your Answer</label>
              <div className="input-wrap">
                <span className="input-icon">💬</span>
                <input type="text" placeholder="Enter your answer" value={answer}
                  onChange={e => { setAnswer(e.target.value); setError(''); }} autoFocus/>
              </div>
            </div>
            <button className="login-btn" type="submit">Next →</button>
            <button type="button" className="fp-back-btn" onClick={() => { setStep(1); setError(''); }}>← Back</button>
          </form>
        )}

        {/* ── Step 3: New password ── */}
        {step === 3 && (
          <form onSubmit={handleReset} className="login-form">
            <div className="fp-info">Enter your new password.</div>
            <div className="login-field">
              <label>New Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input type={showPw?'text':'password'} placeholder="Min 6 characters" value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError(''); }} autoFocus/>
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v=>!v)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="login-field">
              <label>Confirm New Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input type={showPw?'text':'password'} placeholder="Re-enter password" value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(''); }}/>
              </div>
            </div>
            {/* Password strength */}
            {newPw && (
              <div className="pw-strength">
                <div className={`pw-bar ${newPw.length >= 8 ? 'strong' : newPw.length >= 6 ? 'medium' : 'weak'}`}/>
                <span>{newPw.length >= 8 ? '✅ Strong' : newPw.length >= 6 ? '⚠️ Medium' : '❌ Too short'}</span>
              </div>
            )}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? <><span className="btn-spinner"/> Resetting…</> : 'Reset Password →'}
            </button>
            <button type="button" className="fp-back-btn" onClick={() => { setStep(2); setError(''); }}>← Back</button>
          </form>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="fp-success">
            <div className="fp-success-icon">🎉</div>
            <h3>Password Reset Successfully!</h3>
            <p>Your password has been updated. You can now log in with your new password.</p>
            <button className="login-btn" onClick={onBack} style={{marginTop: 20}}>
              Go to Login →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
