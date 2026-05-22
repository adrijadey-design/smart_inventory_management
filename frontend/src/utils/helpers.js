// frontend/src/utils/helpers.js

export function qtyClass(qty, threshold) {
  if (qty === 0)        return 'qty-cell qty-low';
  if (qty <= threshold) return 'qty-cell qty-mid';
  return 'qty-cell qty-ok';
}

export function stockStatus(qty, threshold) {
  if (qty === 0)        return { label: 'Out of Stock', dot: 'dot-red' };
  if (qty <= threshold) return { label: 'Low Stock',    dot: 'dot-yellow' };
  return                       { label: 'In Stock',     dot: 'dot-green' };
}

export function inr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
