import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AgriculturalDashboard from './components/AgriculturalDashboard';
import ImpoundDashboard from './components/ImpoundDashboard';
import PrivateRoute from './components/PrivateRoute';
import UnauthorizedPage from './components/UnauthorizedPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Super Admin Dashboard */}
            <Route 
              path="/superadmin-dashboard" 
              element={
                <PrivateRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Agricultural Dashboard */}
            <Route 
              path="/agricultural-dashboard" 
              element={
                <PrivateRoute allowedRoles={['agricultural_admin']}>
                  <AgriculturalDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Impound Dashboard */}
            <Route 
              path="/impound-dashboard" 
              element={
                <PrivateRoute allowedRoles={['impound_admin']}>
                  <ImpoundDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch all other routes */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; 