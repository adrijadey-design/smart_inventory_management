// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored     = localStorage.getItem('sf_token');
    const storedUser = localStorage.getItem('sf_user');
    if (stored && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser({ ...u, token: stored });
        axios.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
      } catch {
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res  = await axios.post(`${API}/auth/login`, { username, password });
      const data = res.data.data;
      localStorage.setItem('sf_token', data.token);
      localStorage.setItem('sf_user', JSON.stringify({
        username:  data.username,
        role:      data.role,
        full_name: data.full_name,
      }));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser({ username: data.username, role: data.role, full_name: data.full_name, token: data.token });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed.' };
    }
  };

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`); } catch {}
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const PERMISSIONS = {
    admin: [
      'view_dashboard','view_inventory','view_alerts','view_stats',
      'add_item','edit_item','delete_item','restock_item',
      'export_data','view_employees','manage_employees',
      'view_sales','create_sale','manage_sales',
      'view_purchases','create_purchase','manage_purchases',
    ],
    staff: [
      'view_dashboard','view_inventory','view_alerts','view_stats',
      'restock_item','export_data',
      'view_sales','create_sale',
      'view_purchases','create_purchase',
    ],
    owner: [
      'view_dashboard','view_inventory','view_alerts','view_stats',
      'export_data','view_employees',
      'view_sales','view_purchases',
    ],
  };

  const can = (action) => {
    if (!user) return false;
    return (PERMISSIONS[user.role] || []).includes(action);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
