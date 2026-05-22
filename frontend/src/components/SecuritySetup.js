// frontend/src/components/SecuritySetup.js
// Shown after login if security question is not set up yet
import React, { useState } from 'react';
import axios from 'axios';
import { toastSuccess, toastError } from '../utils/toast';
import './Modal.css';
import './SecuritySetup.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PRESET_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the name of your primary school?",
  "What is your oldest sibling's middle name?",
  "What was your childhood nickname?",
  "What is your favourite sports team?",
  "What was the make of your first car?",
];

export default function SecuritySetup({ isOpen, onClose, onSaved }) {
  const [question, setQuestion] = useState('');
  const [custom,   setCustom]   = useState('');
  const [answer,   setAnswer]   = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);

  const finalQuestion = question === 'custom' ? custom : question;

  const handleSave = async () => {
    if (!finalQuestion.trim()) { toastError('Please select or enter a security question'); return; }
    if (!answer.trim())        { toastError('Please enter an answer'); return; }
    if (answer !== confirm)    { toastError('Answers do not match'); return; }

    setSaving(true);
    try {
      await axios.post(`${API}/auth/setup-security`, {
        question: finalQuestion.trim(),
        answer:   answer.trim(),
      });
      toastSuccess('Security question saved! You can now use Forgot Password.');
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to save security question');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal sec-modal scale-in" onClick={e => e.stopPropagation()}>
        <div className="sec-header">
          <span className="sec-icon">🛡️</span>
          <div>
            <h2>Set Up Security Question</h2>
            <p>This lets you reset your password if you forget it.</p>
          </div>
        </div>

        <div className="form-group" style={{marginBottom: 14}}>
          <label>Select a Security Question</label>
          <select value={question} onChange={e => setQuestion(e.target.value)}>
            <option value="">-- Choose a question --</option>
            {PRESET_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            <option value="custom">✏️ Write my own question</option>
          </select>
        </div>

        {question === 'custom' && (
          <div className="form-group" style={{marginBottom: 14}}>
            <label>Your Custom Question</label>
            <input value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="e.g. What is your lucky number?"/>
          </div>
        )}

        {finalQuestion && finalQuestion !== 'custom' && (
          <div className="sec-question-preview">❓ {finalQuestion}</div>
        )}

        <div className="form-group" style={{marginBottom: 14}}>
          <label>Your Answer</label>
          <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder="Enter your answer (case-insensitive)"/>
        </div>

        <div className="form-group" style={{marginBottom: 20}}>
          <label>Confirm Answer</label>
          <input type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter your answer"/>
        </div>

        <div className="sec-note">
          💡 Your answer is stored securely. It is case-insensitive.
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Skip for now</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '🛡️ Save Security Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
