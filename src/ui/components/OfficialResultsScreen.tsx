import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, Star, Users, Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Winner {
  category_id: string;
  maestro_oficial: string;
  votos: number;
}

interface OfficialResultsScreenProps {
  categories: any[];
  categoryLabels: Record<string, string>;
}

const OfficialResultsScreen: React.FC<OfficialResultsScreenProps> = ({ categories, categoryLabels }) => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [closingDate, setClosingDate] = useState<string>('');

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        // 1. Obtener ganadores desde la vista (o calcularlos)
        const { data: winnersData, error: winnersError } = await supabase
          .from('category_winners')
          .select('*');
        
        if (winnersError) throw winnersError;
        setWinners(winnersData || []);

        // 2. Obtener total de votos
        const { count, error: countError } = await supabase
          .from('teacher_votes')
          .select('*', { count: 'exact', head: true });
        
        if (!countError) setTotalVotes(count || 0);

        // 3. Obtener fecha de cierre desde settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('updated_at')
          .single();
        
        if (settingsData?.updated_at) {
          setClosingDate(new Date(settingsData.updated_at).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }));
        }
      } catch (error) {
        console.error('Error fetching official results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
          <p className="text-indigo-400 font-black tracking-widest uppercase animate-pulse">Calculando Resultados...</p>
        </div>
      </div>
    );
  }

  const sortedWinners = [...winners].sort((a, b) => b.votos - a.votos);
  const topWinner = sortedWinners[0];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 relative overflow-hidden pb-24 selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
      <div className="absolute top-1/4 right-[-100px] w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>

      <div className="max-w-4xl mx-auto relative z-10 px-4 pt-12">
        {/* Header Section */}
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-500/10 backdrop-blur-xl rounded-full border border-indigo-500/20 text-indigo-400 font-black text-xs tracking-widest uppercase mb-8 shadow-2xl shadow-indigo-500/10"
          >
            <CheckCircle2 size={16} /> Votación Finalizada
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-tight mb-4"
          >
            Resultados <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 drop-shadow-sm">Oficiales</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-400 font-bold max-w-2xl mx-auto"
          >
            Premios <span className="text-indigo-400">Día del Maestro 2026</span>. Reconocimiento a la excelencia y dedicación docente en nuestra comunidad escolar.
          </motion.p>
        </header>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16"
        >
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-colors">
            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Participación Total</p>
              <p className="text-2xl font-black text-white">{totalVotes} Votos</p>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-colors">
            <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cierre de Resultados</p>
              <p className="text-2xl font-black text-white">{closingDate || '15 Mayo 2026'}</p>
            </div>
          </div>
        </motion.div>

        {winners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top 1 Highlight Card */}
            {topWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="md:col-span-2"
              >
                <div className="relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 blur-[50px] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3rem] border-2 border-amber-500/30 relative z-10 shadow-2xl flex flex-col items-center text-center overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                    
                    <div className="relative mb-8">
                      <div className="w-32 h-32 bg-amber-500/10 rounded-full flex items-center justify-center border-4 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-pulse">
                        <Crown size={64} className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                      </div>
                      <div className="absolute -top-4 -right-4 bg-white text-slate-900 font-black text-xs px-3 py-1 rounded-full shadow-xl uppercase tracking-tighter transform rotate-12">
                        Top 1 Votos
                      </div>
                    </div>

                    <p className="text-amber-400 font-black text-xs tracking-[0.3em] uppercase mb-2">
                      {categoryLabels[topWinner.category_id] || 'Reconocimiento Especial'}
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-6 leading-tight">
                      {topWinner.maestro_oficial}
                    </h2>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-black text-white">{topWinner.votos}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Votos Recibidos</p>
                      </div>
                      <div className="w-px h-10 bg-white/10"></div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-amber-400">#1</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Posición Global</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other Winners Grid */}
            <AnimatePresence>
              {sortedWinners.slice(1).map((winner, idx) => {
                const category = categories.find(c => c.id === winner.category_id);
                const Icon = category?.icon || Trophy;
                
                return (
                  <motion.div
                    key={winner.category_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}
                    className="group"
                  >
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-xl hover:bg-white/10 transition-all hover:border-white/20 flex flex-col h-full relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 text-indigo-500/20">
                        <Icon size={80} />
                      </div>

                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                          <Icon size={28} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Categoría Ganada</p>
                          <h3 className="text-sm font-black text-white uppercase tracking-tight">
                            {categoryLabels[winner.category_id] || winner.category_id}
                          </h3>
                        </div>
                      </div>

                      <div className="flex-1 mb-8">
                        <p className="text-2xl font-black text-white leading-tight">
                          {winner.maestro_oficial}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-black text-xs text-indigo-400 border border-white/10">
                            {idx + 2}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Posición</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-white">{winner.votos}</span>
                          <span className="text-[10px] font-black text-slate-500 uppercase ml-2">Votos</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 text-center"
          >
            <AlertCircle size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-xl font-bold text-slate-400">No hay resultados disponibles todavía.</p>
            <p className="text-sm text-slate-500 mt-2 tracking-widest uppercase font-black">La ceremonia de premiación comenzará pronto</p>
          </motion.div>
        )}

        <footer className="mt-24 text-center">
          <div className="inline-flex items-center gap-6 p-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 pr-6">
            <div className="bg-white p-2 rounded-full">
              <img src="/logomiguel.png" alt="Logo" className="h-10 w-auto" />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
              © 2026 Secundaria Miguel Hidalgo
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default OfficialResultsScreen;
