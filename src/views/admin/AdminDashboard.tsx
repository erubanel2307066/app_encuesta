import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeStats } from '../../hooks/useRealtime';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Users, BarChart3, Clock, Settings, LogOut, 
  CheckCircle2, XCircle, ChevronRight, Loader2, RefreshCcw,
  Medal, TrendingUp, Filter, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import ErrorBoundary from '../../components/ErrorBoundary';

const CATEGORY_LABELS: Record<string, string> = {
  best: "El/La Mejor",
  fun: "El Más Divertido",
  explains: "Explica Mejor",
  inspiring: "Inspiración",
  strict: "Más Estricto"
};

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6'];

const AdminDashboard: React.FC = () => {
  React.useEffect(() => { console.log("Render: AdminDashboard mounted"); }, []);
  const { user, signOut } = useAuth();
  const { stats, loading, refetch } = useRealtimeStats();
  const [isToggling, setIsToggling] = useState(false);

  const toggleVoting = async () => {
    setIsToggling(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ voting_enabled: !stats.votingEnabled })
        .eq('id', (await supabase.from('settings').select('id').single()).data?.id);
      
      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error toggling voting:', error);
      alert('Error al cambiar el estado de la votación');
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-600 font-bold">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  const nullVotes = stats?.recentActivity?.filter(v => !v.maestro_oficial)?.length || 0;

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <span className="font-black text-xl text-slate-900 tracking-tight">AdminPanel</span>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold transition-all">
            <BarChart3 size={20} /> Dashboard
          </a>
          {/* Future sections could go here */}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl mb-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Usuario</p>
            <p className="text-sm font-bold text-slate-700 truncate">{user?.email}</p>
          </div>
          <button 
            onClick={() => {
              console.log("Action: Logging out...");
              signOut().then(() => {
                window.location.href = '/login';
              });
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard de Votación</h1>
            <p className="text-slate-500 font-medium text-sm">Monitoreo en tiempo real de los resultados</p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${stats.votingEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <div className={`w-2 h-2 rounded-full ${stats.votingEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {stats.votingEnabled ? 'Votación Abierta' : 'Votación Cerrada'}
            </div>
            
            <button 
              onClick={toggleVoting}
              disabled={isToggling}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${stats.votingEnabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'} disabled:opacity-50`}
            >
              {isToggling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings size={20} />}
              {stats.votingEnabled ? 'Cerrar Votación' : 'Abrir Votación'}
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              label="Total de Votos" 
              value={stats.totalVotes} 
              icon={<Users className="text-indigo-600" />} 
              trend="+12% vs ayer"
              color="indigo"
            />
            <StatCard 
              label="Votos Nulos" 
              value={nullVotes} 
              icon={<XCircle className="text-slate-400" />} 
              trend="Baja incidencia"
              color="slate"
            />
            <StatCard 
              label="Categorías" 
              value={Object.keys(CATEGORY_LABELS).length} 
              icon={<Filter className="text-pink-600" />} 
              trend="Todas activas"
              color="pink"
            />
            <StatCard 
              label="Maestros Nominados" 
              value={new Set(stats?.recentActivity?.map(v => v.maestro_oficial)).size || 0} 
              icon={<TrendingUp className="text-cyan-600" />} 
              trend="Crecimiento constante"
              color="cyan"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart: Votos por Categoría */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-black text-xl text-slate-900">Distribución de Votos</h2>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 border border-slate-100">
                    <Clock size={12} /> Últimas 24h
                  </div>
                </div>
              </div>
              <div className="h-[300px] min-h-[300px] w-full block">
                <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-red-500 font-bold">Error al cargar la gráfica</div>}>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-2">
                      <Loader2 className="animate-spin" />
                      <p className="font-bold text-sm">Cargando estadísticas...</p>
                    </div>
                  ) : stats?.votesByCategory?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        key={`chart-${stats.votesByCategory.length}`}
                        data={stats.votesByCategory.map(v => ({ name: CATEGORY_LABELS[v.id] || v.id, count: v.count }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 font-bold">
                      <AlertCircle className="mr-2" /> No hay suficientes datos para la gráfica
                    </div>
                  )}
                </ErrorBoundary>
              </div>
            </div>

            {/* Ganadores Actuales */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
              <h2 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2">
                <Medal className="text-yellow-500" /> Ganadores (Live)
              </h2>
              <div className="flex-1 space-y-4">
                {stats?.winners?.length > 0 ? stats.winners.map((winner, idx) => (
                  <div key={`winner-${winner.category_id || idx}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                        {CATEGORY_LABELS[winner.category_id] || winner.category_id}
                      </p>
                      <p className="font-bold text-slate-900 truncate">{winner.maestro_oficial}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{winner.votos}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Votos</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                    <AlertCircle size={32} />
                    <p className="font-bold">No hay datos aún</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <Clock className="text-indigo-500" /> Actividad en Tiempo Real
              </h2>
              <button 
                onClick={() => refetch()}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <RefreshCcw size={20} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Maestro</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Motivo</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Fecha/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.recentActivity?.length > 0 ? stats.recentActivity.map((vote, idx) => (
                    <tr key={`activity-${vote.id || idx}`} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${vote.maestro_oficial ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {vote.maestro_oficial ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{vote.maestro_oficial || vote.teacher_name}</p>
                            {!vote.maestro_oficial && <p className="text-[10px] font-bold text-red-500 uppercase">Sin Normalizar</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                          {CATEGORY_LABELS[vote.category_id] || vote.category_id}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-slate-500 max-w-xs truncate font-medium">{vote.reason}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-xs font-black text-slate-400">
                          {new Date(vote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-300">
                          {new Date(vote.created_at).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-8 text-center text-slate-400 font-bold">
                        <AlertCircle className="mx-auto mb-2" size={24} />
                        No hay actividad reciente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
              <button className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-2 mx-auto">
                Ver todos los registros <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  color: 'indigo' | 'slate' | 'pink' | 'cyan';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, color }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 border-indigo-100',
    slate: 'bg-slate-50 border-slate-200',
    pink: 'bg-pink-50 border-pink-100',
    cyan: 'bg-cyan-50 border-cyan-100'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]} transition-colors group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white" />
          ))}
        </div>
        <span className="text-[10px] font-bold text-slate-500">{trend}</span>
      </div>
    </div>
  );
};

export default AdminDashboard;
