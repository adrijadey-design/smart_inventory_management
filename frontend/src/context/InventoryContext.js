// frontend/src/context/InventoryContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/apiClient';
import { toastSuccess, toastError } from '../utils/toast';

const InventoryContext = createContext();

export function InventoryProvider({ children }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* ── Fetch ── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/items');
      setItems(res.data.data);
    } catch (e) {
      setError('Cannot reach the backend. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ── Add ── */
  const addItem = async (data) => {
    try {
      const res = await api.post('/items', data);
      setItems(p => [...p, res.data.data]);
      toastSuccess(`"${data.name}" added`);
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to add item');
      throw e;
    }
  };

  /* ── Update ── */
  const updateItem = async (id, data) => {
    try {
      const res = await api.put(`/items/${id}`, data);
      setItems(p => p.map(i => i.id === id ? res.data.data : i));
      toastSuccess(`"${data.name || 'Item'}" updated`);
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to update item');
      throw e;
    }
  };

  /* ── Delete ── */
  const deleteItem = async (id) => {
    const item = items.find(i => i.id === id);
    try {
      await api.delete(`/items/${id}`);
      setItems(p => p.filter(i => i.id !== id));
      toastSuccess(`"${item?.name}" deleted`);
    } catch (e) {
      toastError(e.response?.data?.error || 'Failed to delete item');
      throw e;
    }
  };

  /* ── Barcode lookup ── */
  const findByBarcode = async (barcode) => {
    try {
      const res = await api.get(`/items/barcode/${barcode}`);
      return res.data.data;
    } catch {
      return null;
    }
  };

  /* ── Restock ── */
  const restockItem = async (id, qty) => {
    try {
      const res = await api.patch(`/items/${id}/restock`, { qty });
      setItems(p => p.map(i => i.id === id ? res.data.data : i));
      toastSuccess('Stock updated');
    } catch (e) {
      toastError('Failed to update stock');
      throw e;
    }
  };

  /* ── Derived ── */
  const lowStockItems = items.filter(i => i.qty > 0 && i.qty <= i.threshold);
  const outOfStock    = items.filter(i => i.qty === 0);
  const totalValue    = items.reduce((s, i) => s + i.qty * i.price, 0);
  const categories    = [...new Set(items.map(i => i.category))].sort();

  return (
    <InventoryContext.Provider value={{
      items, loading, error,
      fetchItems, addItem, updateItem, deleteItem, findByBarcode, restockItem,
      lowStockItems, outOfStock, totalValue, categories,
      isOnline: true,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() { return useContext(InventoryContext); }
