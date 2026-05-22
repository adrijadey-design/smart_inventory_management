// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar       from './components/Sidebar';
import Toast         from './components/Toast';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Inventory     from './pages/Inventory';
import Alerts        from './pages/Alerts';
import Export        from './pages/Export';
import Employees     from './pages/EmployeesTemp';
import Suppliers     from './pages/Suppliers';
import Sales         from './pages/Sales';
import Purchases     from './pages/Purchases';
import Expiry        from './pages/Expiry';
import BarcodeSheet  from './pages/BarcodeSheet';
import './index.css';

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <InventoryProvider>
      <div className="page-layout">
        <Sidebar />
        <div className="main-area">
          <Routes>
            <Route path="/"           element={<Dashboard />}    />
            <Route path="/inventory"  element={<Inventory />}    />
            <Route path="/barcodes"   element={<BarcodeSheet />} />
            <Route path="/alerts"     element={<Alerts />}       />
            <Route path="/suppliers"  element={<Suppliers />}    />
            <Route path="/sales"      element={<Sales />}        />
            <Route path="/purchases"  element={<Purchases />}    />
            <Route path="/expiry"     element={<Expiry />}       />
            <Route path="/employees"  element={<Employees />}    />
            <Route path="/export"     element={<Export />}       />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <Toast />
    </InventoryProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
