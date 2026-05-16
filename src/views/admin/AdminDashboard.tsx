import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeStats } from '../../hooks/useRealtime';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Users, BarChart3, Clock, Settings, LogOut, 
  CheckCircle2, XCircle, ChevronRight, Loader2, RefreshCcw,
  Medal, TrendingUp, Filter, AlertCircle, Sparkles, Activity,
  Crown, ShieldCheck, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import CountUp from 'react-countup';
import { cn } from '../../lib/utils';
import ErrorBoundary from '../../components/ErrorBoundary';

const CATEGORY_LABELS: Record<string, string> = {
  best: "El/La Mejor",
  fun: "El Más Divertido",
  explains: "Explica Mejor",
  inspiring: "Inspiración",
  strict: "Más Estricto"
};

const CATEGORY_COLORS: Record<string, string> = {
  best: "#fbbf24", // Amber
  fun: "#ec4899", // Pink
  explains: "#3b82f6", // Blue
  inspiring: "#8b5cf6", // Purple
  strict: "#64748b" // Slate
};

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { stats, loading, refetch } = useRealtimeStats();
  const [isToggling, setIsToggling] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
    } finally {
      setIsToggling(false);
    }
  };

  const nullVotes = useMemo(() => 
    stats?.recentActivity?.filter(v => !v.maestro_oficial)?.length || 0
  , [stats]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060816]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative"
        >
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse-glow" />
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
        </motion.div>
        <p className="mt-8 text-slate-400 font-bold tracking-widest uppercase text-xs animate-pulse">Iniciando Sistemas...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#060816] text-white flex font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* BACKGROUND ORBS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-blob" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-purple-600/10 blur-[120px] rounded-full animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full animate-blob animation-delay-4000" />
      </div>

      {/* SIDEBAR */}
      <aside className="w-80 bg-[#050816] border-r border-white/5 hidden lg:flex flex-col relative z-20 overflow-hidden">
        {/* SIDEBAR BACKGROUND GLOW */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/5 blur-[100px] pointer-events-none" />
        
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          {/* HOLOGRAPHIC LOGO CONTAINER */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative group w-full"
          >
            {/* AMBIENT GLOW BEHIND */}
            <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full animate-pulse-glow" />
            
            {/* THE CAPSULE / PANEL */}
            <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000} className="relative">
              <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[3rem] p-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                {/* ENERGY PEDESTAL EFFECT */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-500/10 to-transparent" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-blue-400 blur-md opacity-50" />
                
                {/* LOGO IMAGE */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/40 blur-2xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-44 h-44 rounded-full bg-slate-200/90 flex items-center justify-center shadow-inner relative z-10">
                      <img 
                        src="/logomiguel.png" 
                        alt="Logo Oficial" 
                        className="w-36 h-36 object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                  </div>

                  {/* TEXT CONTENT */}
                  <div className="text-center space-y-2 relative z-10">
                    <h2 className="text-sm font-black text-white tracking-[0.3em] uppercase leading-tight">
                      Escuela Secundaria
                    </h2>
                    <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight leading-tight">
                      Miguel Hidalgo y Costilla
                    </h3>
                    <div className="pt-4">
                      <span className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] shadow-glow-purple">
                        Código Maestro
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Tilt>

            {/* SCANNING LINE EFFECT */}
            <motion.div 
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent pointer-events-none z-20"
            />
          </motion.div>
        </div>

        {/* LOGOUT AT BOTTOM */}
        <div className="p-8 border-t border-white/5 relative z-10">
          <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Operador</p>
            <p className="text-[11px] font-bold text-slate-400 truncate">{user?.email}</p>
          </div>
          <button 
            onClick={() => signOut().then(() => window.location.href = '/login')}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-slate-500 hover:text-white hover:bg-white/[0.05] rounded-2xl font-bold transition-all border border-transparent hover:border-red-500/20 group"
          >
            <LogOut size={18} className="group-hover:text-red-500 transition-colors" /> 
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen relative z-10 overflow-hidden">
        {/* HEADER */}
        <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-[#060816]/50 backdrop-blur-md relative z-30">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Dashboard <Sparkles className="text-blue-400 w-6 h-6" />
            </h1>
            <p className="text-slate-400 font-medium text-sm">Control central de votaciones oficiales</p>
          </motion.div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 pl-4 pr-2 py-1.5 rounded-full">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", stats.votingEnabled ? "bg-green-500 animate-pulse" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {stats.votingEnabled ? "Votación Live" : "Offline"}
                </span>
              </div>
              <button 
                onClick={toggleVoting}
                disabled={isToggling}
                className={cn(
                  "px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all border shadow-lg disabled:opacity-50",
                  stats.votingEnabled 
                    ? "bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white" 
                    : "bg-green-500/10 text-green-500 border-green-500/50 hover:bg-green-500 hover:text-white"
                )}
              >
                {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : stats.votingEnabled ? "Detener" : "Activar"}
              </button>
            </div>
            
            <button onClick={() => refetch()} className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all text-slate-400 hover:text-white">
              <RefreshCcw size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIStore 
              label="Votos Totales" 
              value={stats.totalVotes} 
              icon={<Users />} 
              accent="blue" 
              trend="+12%" 
            />
            <KPIStore 
              label="Votos Nulos" 
              value={nullVotes} 
              icon={<XCircle />} 
              accent="red" 
              trend="Bajo" 
            />
            <KPIStore 
              label="Categorías" 
              value={Object.keys(CATEGORY_LABELS).length} 
              icon={<Filter />} 
              accent="purple" 
              trend="Fijas" 
            />
            <KPIStore 
              label="Participación" 
              value={new Set(stats?.recentActivity?.map(v => v.maestro_oficial)).size || 0} 
              icon={<Zap />} 
              accent="cyan" 
              trend="Alta" 
              suffix="Maestros"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* MAIN CHART */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">Análisis de Participación</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Distribución por categoría</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black border border-blue-500/20">REALTIME</span>
                </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.votesByCategory.map(v => ({ name: CATEGORY_LABELS[v.id] || v.id, count: v.count, id: v.id }))}>
                    <defs>
                      {Object.keys(CATEGORY_COLORS).map(id => (
                        <linearGradient key={`grad-${id}`} id={`color-${id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CATEGORY_COLORS[id]} stopOpacity={0.8}/>
                          <stop offset="100%" stopColor={CATEGORY_COLORS[id]} stopOpacity={0.2}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 10}} />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{fill: 'rgba(255,255,255,0.03)'}}
                    />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={45}>
                      {stats.votesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#color-${entry.id})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* LIVE WINNERS */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[50px] rounded-full" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                  <Crown className="text-yellow-500" /> Podio Live
                </h2>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>

              <div className="space-y-4 flex-1">
                {stats?.winners?.length > 0 ? stats.winners.map((winner, idx) => (
                  <WinnerItem key={winner.category_id} winner={winner} rank={idx + 1} />
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50">
                    <Activity size={48} className="animate-pulse" />
                    <p className="font-black text-[10px] tracking-widest uppercase">Esperando Datos...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RECENT ACTIVITY TABLE */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0B1020]/50 border border-white/5 rounded-[2.5rem] overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Activity className="text-blue-500" /> Actividad Global
              </h2>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado del Stream</p>
                  <p className="text-xs font-bold text-green-500">Sincronizado</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Maestro Nominado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Categoría</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Razón de Voto</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats?.recentActivity?.length > 0 ? stats.recentActivity.map((vote, idx) => (
                    <tr key={vote.id || idx} className="hover:bg-white/[0.03] transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center text-lg",
                            vote.maestro_oficial ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {vote.maestro_oficial ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{vote.maestro_oficial || vote.teacher_name}</p>
                            <p className={cn("text-[9px] font-black uppercase tracking-widest", vote.maestro_oficial ? "text-blue-500/50" : "text-red-500/50")}>
                              {vote.maestro_oficial ? "Verificado" : "No Normalizado"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-4 py-1.5 bg-white/[0.05] text-slate-400 rounded-full text-[10px] font-black border border-white/5 uppercase tracking-tighter">
                          {CATEGORY_LABELS[vote.category_id] || vote.category_id}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-slate-500 max-w-xs truncate font-medium group-hover:text-slate-400 transition-colors">"{vote.reason}"</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-xs font-black text-slate-300">
                          {new Date(vote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-600">
                          {new Date(vote.created_at).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-slate-600">
                        <Activity className="mx-auto mb-4 opacity-20" size={48} />
                        <p className="font-black text-xs tracking-widest uppercase">Sin actividad reciente</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

// SUB-COMPONENTS

const SidebarItem = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all relative group",
      active 
        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
        : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
    )}
  >
    {active && <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-glow-blue" />}
    <span className={cn("transition-transform group-hover:scale-110", active && "text-blue-400")}>{icon}</span>
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const KPIStore = ({ label, value, icon, accent, trend, suffix }: any) => {
  const themes = {
    blue: "from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/20 text-blue-400",
    red: "from-red-500/20 via-red-500/5 to-transparent border-red-500/20 text-red-400",
    purple: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/20 text-purple-400",
    cyan: "from-cyan-500/20 via-cyan-500/5 to-transparent border-cyan-500/20 text-cyan-400",
  };

  return (
    <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} perspective={1000} scale={1.02} transitionSpeed={2000}>
      <div className={cn(
        "bg-white/[0.02] border rounded-[2rem] p-6 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.04]",
        themes[accent as keyof typeof themes].split(' border')[0]
      )}>
        <div className={cn("absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20", themes[accent as keyof typeof themes].split('text-')[1])} />
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className={cn("p-4 rounded-2xl bg-white/[0.05] border border-white/5", themes[accent as keyof typeof themes].split('text-')[1])}>
            {React.cloneElement(icon, { size: 24 })}
          </div>
          <div className="flex flex-col items-end">
            <span className="px-2.5 py-1 bg-white/[0.05] rounded-full text-[9px] font-black text-slate-500 uppercase tracking-tighter border border-white/5">
              {trend}
            </span>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black tracking-tighter text-white">
              <CountUp end={value} duration={2} separator="," />
            </p>
            {suffix && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{suffix}</span>}
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{label}</p>
        </div>
      </div>
    </Tilt>
  );
};

const WinnerItem = ({ winner, rank }: any) => {
  const isTop1 = rank === 1;
  const color = CATEGORY_COLORS[winner.category_id] || "#fff";
  
  return (
    <motion.div 
      whileHover={{ x: 5 }}
      className={cn(
        "p-5 rounded-3xl border transition-all relative group overflow-hidden",
        isTop1 
          ? "bg-yellow-500/10 border-yellow-500/50 shadow-glow-purple" 
          : "bg-white/[0.03] border-white/5 hover:border-white/10"
      )}
    >
      {isTop1 && (
        <div className="absolute top-0 right-0 p-2 text-yellow-500/20">
          <Trophy size={48} strokeWidth={1} />
        </div>
      )}
      <div className="flex items-center gap-5 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border",
          rank === 1 ? "bg-yellow-500 text-yellow-950 border-yellow-400" :
          rank === 2 ? "bg-slate-300 text-slate-900 border-slate-200" :
          "bg-orange-800 text-orange-100 border-orange-700"
        )}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: color }}>
            {CATEGORY_LABELS[winner.category_id] || winner.category_id}
          </p>
          <p className="font-black text-slate-100 truncate text-base leading-none">{winner.maestro_oficial}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white leading-none">{winner.votos}</p>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Votos</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, opacity: 0.5 }}
        />
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = CATEGORY_COLORS[data.id] || "#3b82f6";
    
    return (
      <div className="bg-[#0B1020]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
          <span className="text-xl font-black text-white">{payload[0].value} <span className="text-xs font-bold text-slate-400">Votos</span></span>
        </div>
      </div>
    );
  }
  return null;
};

export default AdminDashboard;
