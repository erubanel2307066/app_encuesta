import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicVoting from './views/PublicVoting';
import Login from './views/admin/Login';
import AdminDashboard from './views/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  console.log("Render: App.tsx initialized");
  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Error Crítico de Enrutamiento</h1>
        <p className="text-red-500 mb-6">Revisa la consola para más detalles.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-red-600 text-white rounded-lg">Ir a Inicio</button>
      </div>
    }>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicVoting />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<PublicVoting />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
