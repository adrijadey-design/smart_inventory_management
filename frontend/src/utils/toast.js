// frontend/src/utils/toast.js
// Minimal toast system — no extra library needed.

let _setToasts = null;

export function registerToastSetter(fn) {
  _setToasts = fn;
}

let _id = 0;
export function toast(message, type = 'info') {
  if (!_setToasts) return;
  const id = ++_id;
  _setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    _setToasts(prev => prev.filter(t => t.id !== id));
  }, 3000);
}

export const toastSuccess = (msg) => toast(msg, 'success');
export const toastError   = (msg) => toast(msg, 'error');
export const toastInfo    = (msg) => toast(msg, 'info');
