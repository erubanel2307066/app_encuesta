import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy load de todas las rutas — cada vista se descarga solo cuando se visita
const PublicVoting   = lazy(() => import('./views/PublicVoting'));
const Login          = lazy(() => import('./views/admin/Login'));
const AdminDashboard = lazy(() => import('./views/admin/AdminDashboard'));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#060816]">
    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
    <p className="text-slate-500 font-bold text-xs tracking-widest uppercase">Cargando...</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Error Crítico</h1>
        <p className="text-slate-400 mb-6">Revisa la consola para más detalles.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-red-600 text-white rounded-xl">
          Ir a Inicio
        </button>
      </div>
    }>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"      element={<PublicVoting />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<PublicVoting />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
