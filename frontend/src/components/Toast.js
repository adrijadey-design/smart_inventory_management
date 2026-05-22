// frontend/src/components/Toast.js
import React, { useState, useEffect } from 'react';
import { registerToastSetter } from '../utils/toast';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { registerToastSetter(setToasts); }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{ICONS[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
