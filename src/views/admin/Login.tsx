import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Lock, Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';

  useEffect(() => {
    if (!authLoading && session) {
      navigate(from, { replace: true });
    }
  }, [authLoading, session, from, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const activeSession = data.session ?? (await supabase.auth.getSession()).data.session;
      if (!activeSession) {
        throw new Error('No se pudo establecer la sesión. Intenta de nuevo.');
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="max-w-md w-full relative z-10">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 flex items-center text-indigo-600 font-bold hover:text-indigo-800 transition-colors group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Volver a la votación
        </button>

        <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl shadow-lg mb-6 transform -rotate-3">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-indigo-900 mb-2">Panel Admin</h1>
            <p className="text-indigo-600/70 font-medium">Solo personal autorizado</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-indigo-900 font-bold ml-2 text-sm uppercase tracking-wider">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={20} />
                </div>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border-2 border-indigo-50 focus:border-indigo-400 outline-none transition-all font-semibold text-indigo-900 shadow-sm"
                  placeholder="admin@escuela.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-indigo-900 font-bold ml-2 text-sm uppercase tracking-wider">Contraseña</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border-2 border-indigo-50 focus:border-indigo-400 outline-none transition-all font-semibold text-indigo-900 shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-lg text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-indigo-50 text-center">
            <p className="text-xs text-indigo-900/40 font-bold uppercase tracking-widest">
              Acceso restringido • Sistema de Auditoría Activo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
