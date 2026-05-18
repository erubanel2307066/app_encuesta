import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Smile, Shield, BookOpen, ClipboardCheck, Send, ArrowLeft, Sparkles, Medal, Crown, Loader2, AlertCircle, Search, Settings } from 'lucide-react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import CountdownBanner from '../ui/components/CountdownBanner';
import OfficialResultsScreen from '../ui/components/OfficialResultsScreen';
import { useVotingSettings } from '../hooks/useVotingSettings';
import { searchOfficialTeachers, type OfficialTeacher } from '../lib/teachers';
import { supabase } from '../lib/supabase';

// Categorías con colores vibrantes y divertidos
const CATEGORIES = [
  { id: 'best', label: 'El/La Mejor de Todos 👑', icon: Crown, color: 'bg-yellow-400', shadow: 'shadow-yellow-300', text: 'text-yellow-900', border: 'border-yellow-500', isFeatured: true },
  { id: 'fun', label: 'El más Divertido 😂', icon: Smile, color: 'bg-pink-400', shadow: 'shadow-pink-300', text: 'text-pink-900', border: 'border-pink-500' },
  { id: 'explains', label: 'El Cerebrito 🧠', icon: BookOpen, color: 'bg-cyan-400', shadow: 'shadow-cyan-300', text: 'text-cyan-900', border: 'border-cyan-500' },
  { id: 'inspiring', label: 'Inspiración Total ✨', icon: Sparkles, color: 'bg-amber-400', shadow: 'shadow-amber-300', text: 'text-amber-900', border: 'border-amber-500' },
  { id: 'strict', label: 'Estricto pero Justo ⚖️', icon: Shield, color: 'bg-violet-400', shadow: 'shadow-violet-300', text: 'text-violet-900', border: 'border-violet-500' },
];

const CATEGORY_LABELS: Record<string, string> = {
  best: "El/La Mejor de Todos",
  fun: "El Más Divertido",
  explains: "Explica Mejor",
  inspiring: "Inspiración Total",
  strict: "El Más Estricto"
};

// Función para normalizar nombres
function normalizarNombre(nombre: string) {
  if (!nombre) return '';
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/mtro\.?/gi, '')
    .replace(/mtra\.?/gi, '')
    .replace(/maestro/gi, '')
    .replace(/maestra/gi, '')
    .replace(/profr\.?/gi, '')
    .replace(/prof\.?/gi, '')
    .replace(/profe/gi, '')
    .replace(/profesor/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Función para coincidencia inteligente
const findOfficialTeacher = (inputName: string, officialTeachers: OfficialTeacher[]) => {
  const normalizedInput = normalizarNombre(inputName);
  if (!normalizedInput || !officialTeachers || officialTeachers.length === 0) return inputName.trim().replace(/\b\w/g, l => l.toUpperCase());

  let bestMatch = null;
  let maxScore = 0;
  const inputWords = normalizedInput.split(' ').filter(w => w.length > 2);

  for (const teacher of officialTeachers) {
    const officialNorm = normalizarNombre(teacher.officialName);
    let score = 0;

    if (officialNorm === normalizedInput) return teacher.officialName;
    if (officialNorm.includes(normalizedInput) || normalizedInput.includes(officialNorm)) score += 10;

    const officialWords = officialNorm.split(' ');
    let wordsMatched = 0;
    for (const word of inputWords) {
      if (officialWords.some(ow => ow.includes(word) || word.includes(ow))) wordsMatched++;
    }
    score += wordsMatched * 2;

    if (score > maxScore && score >= 2) {
      maxScore = score;
      bestMatch = teacher.officialName;
    }
  }
  return bestMatch || inputName.trim().replace(/\b\w/g, l => l.toUpperCase());
};

const PublicVoting: React.FC = () => {
  console.log("Render: PublicVoting initialized");
  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const { votingEnabled, closingAt, closingDate, closingTime, loading: loadingVoting } = useVotingSettings();

  const [teacherName, setTeacherName] = useState('');
  const [reason, setReason] = useState('');
  const [officialTeachers, setOfficialTeachers] = useState<OfficialTeacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [winners, setWinners] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setVisitorId(result.visitorId);
      } catch (error) {
        console.error("Error FingerprintJS:", error);
      }
    };
    initFingerprint();
  }, []);

  const fetchWinners = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('category_winners').select('*');
      if (error) throw error;
      setWinners(data ?? []);
    } catch (error) {
      console.error('Error winners:', error);
    }
  }, []);

  useEffect(() => {
    const loadWinners = async () => {
      setIsLoadingData(true);
      await fetchWinners();
      setIsLoadingData(false);
    };

    loadWinners();

    const channel = supabase.channel('public-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teacher_votes' }, () => fetchWinners())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ajustes' }, (payload: any) => {
        if (!payload.new.voting_enabled) fetchWinners();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchWinners]);

  useEffect(() => {
    const handler = window.setTimeout(async () => {
      if (!teacherName.trim() || teacherName.length < 2) {
        setOfficialTeachers([]);
        setTeachersLoading(false);
        return;
      }

      setTeachersLoading(true);
      try {
        const results = await searchOfficialTeachers(teacherName);
        setOfficialTeachers(results);
      } catch (error) {
        console.error('searchOfficialTeachers error:', error);
        setOfficialTeachers([]);
      } finally {
        setTeachersLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(handler);
    };
  }, [teacherName]);

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !reason.trim() || isSubmitting) return;

    if (!votingEnabled) {
      alert("La votación ha finalizado");
      return;
    }

    setIsSubmitting(true);
    try {
      if (visitorId) {
        const { data: existingVote } = await supabase.from('teacher_votes').select('id').eq('device_fingerprint', visitorId).limit(1);
        if (existingVote && existingVote.length > 0) {
          alert("Ya realizaste tu votación.");
          setIsSubmitting(false);
          return;
        }
      }

      const originalName = teacherName.trim().replace(/\b\w/g, l => l.toUpperCase());
      const oficialMatch = findOfficialTeacher(teacherName, officialTeachers);

      const { error } = await supabase.from('teacher_votes').insert([{ 
        teacher_name: originalName, 
        maestro_oficial: oficialMatch,
        category_id: selectedCategory.id, 
        reason: reason.trim(),
        device_fingerprint: visitorId
      }]);

      if (error) {
        if (error.message?.includes('VOTING_CLOSED') || error.code === 'P0001') {
          alert('La votación ha finalizado. Ya no se aceptan nuevos votos.');
          return;
        }
        throw error;
      }
      setShowSuccessModal(true);
      setTimeout(() => { setShowSuccessModal(false); setCurrentView('home'); }, 2500);
    } catch (error) {
      console.error("Save vote error:", error);
      alert("Error al enviar el voto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestions = React.useMemo(() => {
    if (!teacherName.trim() || teacherName.length < 2 || officialTeachers.length === 0) return [];
    const normalizedInput = normalizarNombre(teacherName);
    return officialTeachers
      .map((t) => {
        const name = t.officialName;
        const norm = normalizarNombre(name);
        let score = 0;

        if (norm === normalizedInput) score += 100;
        if (norm.startsWith(normalizedInput)) score += 60;
        if (norm.includes(normalizedInput)) score += 30;

        const inputWords = normalizedInput.split(' ').filter((w) => w.length > 1);
        for (const word of inputWords) {
          if (norm.includes(word)) score += 12;
          if (word.startsWith(norm) || norm.startsWith(word)) score += 8;
        }

        return { id: t.id, name, score };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [teacherName, officialTeachers]);

  return (
    <>
      {votingEnabled ? (
        <div className="min-h-screen bg-indigo-50 font-sans selection:bg-yellow-300 relative overflow-hidden pb-24">
          {/* Background Blobs */}
          <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
          <div className="absolute top-1/4 right-[-50px] w-56 h-56 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-cyan-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-4000"></div>

          <div className="max-w-xl mx-auto relative z-10 px-4 pt-8 sm:pt-12">
            <header className="text-center mb-8 sm:mb-12">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-2 bg-white rounded-2xl shadow-md border-2 border-indigo-100 transform -rotate-6 hover:rotate-0 transition-transform">
                  <img src="/logomiguel.png" alt="Logo" className="h-16 sm:h-20 w-auto" />
                </div>
                <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-lg border-4 border-indigo-400 transform rotate-6 hover:rotate-0 transition-transform">
                  <ClipboardCheck size={32} className="text-indigo-500 sm:w-10 sm:h-10" />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-900 tracking-tight drop-shadow-sm leading-tight" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
                  Premios <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">Día del Maestro</span>
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-indigo-600 uppercase tracking-widest bg-white/60 inline-block px-6 py-2 rounded-full shadow-sm border border-indigo-100">
                  Escuela Secundaria General <br/> <span className="text-lg sm:text-xl text-indigo-800">Miguel Hidalgo y Costilla</span>
                </h2>
              </div>
            </header>

            <div className="mb-12">
              <CountdownBanner
                closingAt={closingAt}
                votingEnabled={votingEnabled}
                loading={loadingVoting}
              />
            </div>

            {currentView !== 'voting' && (
              <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-full shadow-inner mb-8 sm:mb-12 max-w-sm mx-auto">
                <button onClick={() => setCurrentView('home')} className={`flex-1 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${currentView === 'home' ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-indigo-600 hover:bg-indigo-100'}`}>¡Votar Ahora!</button>
                <button onClick={() => setCurrentView('results')} className={`flex-1 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-1 ${currentView === 'results' ? 'bg-yellow-400 text-yellow-900 shadow-md transform scale-105' : 'text-indigo-600 hover:bg-indigo-100'}`}>Resultados 🏆</button>
              </div>
            )}

            {isLoadingData && currentView === 'results' ? (
              <div className="flex flex-col items-center justify-center py-20 text-indigo-600"><Loader2 size={48} className="animate-spin mb-4" /><p className="font-bold text-lg animate-pulse">Cargando resultados...</p></div>
            ) : dbError && currentView === 'results' ? (
              <div className="bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-200 text-center text-red-600 font-medium"><AlertCircle size={40} className="mx-auto mb-3 text-red-500" /><p className="text-lg">{dbError}</p></div>
            ) : (
              <div className="relative">
                {currentView === 'home' && (
                  <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <p className="text-center font-bold text-indigo-800 bg-white/50 py-3 rounded-2xl shadow-sm border border-indigo-100 text-lg">1. Selecciona un premio para otorgar 👇</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        return (
                          <button key={cat.id} onClick={() => { setSelectedCategory(cat); setCurrentView('voting'); setTeacherName(''); setReason(''); }}
                            className={`${cat.color} ${cat.text} p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-b-8 ${cat.border} shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all active:translate-y-1 active:border-b-0 flex flex-col items-center text-center ${cat.isFeatured ? 'sm:col-span-2' : ''}`}>
                            <div className="bg-white/30 p-4 rounded-full mb-4 shadow-inner"><Icon size={cat.isFeatured ? 48 : 40} strokeWidth={2.5} /></div>
                            <span className={`font-black leading-tight drop-shadow-sm ${cat.isFeatured ? 'text-2xl' : 'text-lg'}`}>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentView === 'voting' && selectedCategory && (
                  <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto">
                    <button onClick={() => setCurrentView('home')} className="mb-6 flex items-center text-indigo-600 font-bold hover:text-indigo-800 bg-white/50 px-4 py-2 rounded-full w-max shadow-sm transition-colors"><ArrowLeft size={20} className="mr-1" /> Cambiar premio</button>
                    <div className={`bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl border-4 ${selectedCategory.border} relative overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-full h-24 ${selectedCategory.color} flex items-center justify-center opacity-20`}></div>
                      <div className="relative z-10 flex flex-col items-center mb-8">
                        <div className={`${selectedCategory.color} ${selectedCategory.text} p-6 rounded-full shadow-xl -mt-16 sm:-mt-20 mb-4 border-8 border-white`}><selectedCategory.icon size={48} strokeWidth={2.5} /></div>
                        <h2 className={`text-3xl font-black text-center ${selectedCategory.text}`}>{selectedCategory.label}</h2>
                      </div>
                      <form onSubmit={handleSubmitVote} className="space-y-6">
                        <div className="relative group">
                          <label className="block text-indigo-900 font-bold mb-2 ml-2 text-xl flex items-center gap-2"><Search size={20} className="text-indigo-400" />¿A quién nominas?</label>
                          <div className="relative">
                            <input type="text" value={teacherName} onChange={(e) => { setTeacherName(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="Ej. Juan Pérez García"
                              className="w-full text-lg px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-indigo-300 font-semibold text-indigo-900 shadow-inner pr-12" required disabled={isSubmitting} autoComplete="off" />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 group-focus-within:text-indigo-400 transition-colors"><BookOpen size={24} /></div>
                          </div>
                          {teachersLoading && (
                            <p className="mt-2 text-sm text-indigo-400 font-medium flex items-center gap-2">
                              <Loader2 size={16} className="animate-spin" /> Cargando maestros...
                            </p>
                          )}
                          {showSuggestions && (
                            <div className="absolute z-[60] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                              {suggestions.length > 0 ? (
                                <ul className="max-h-60 overflow-y-auto py-1">
                                  {suggestions.map((suggestion) => (
                                    <li key={suggestion.id}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTeacherName(suggestion.name); setShowSuggestions(false); }} className="w-full text-left px-5 py-3.5 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between group/item">
                                      <div className="flex flex-col"><span className="font-bold text-indigo-900 group-hover/item:text-white transition-colors">{suggestion.name}</span><span className="text-xs text-indigo-400 group-hover/item:text-indigo-100 font-medium">Maestro Oficial</span></div>
                                      <Medal size={18} className="text-indigo-200 group-hover/item:text-yellow-300 transition-colors" />
                                    </button></li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="py-4 px-5 text-sm text-slate-600">No se encontró ningún maestro con ese nombre.</div>
                              )}
                            </div>
                          )}
                          {!teachersLoading && officialTeachers.length === 0 && teacherName.length >= 2 && (
                            <p className="mt-2 text-sm text-amber-600 font-medium">
                              No se encontraron maestros en la base de datos.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-indigo-900 font-bold mb-2 ml-2 text-xl">¿Por qué se lo merece?</label>
                          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Escribe algo chido... Ej. Sus clases son las mejores." rows={4}
                            className="w-full text-lg px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-indigo-300 resize-none font-semibold text-indigo-900 shadow-inner" required disabled={isSubmitting} />
                        </div>
                        <button type="submit" disabled={isSubmitting} className={`w-full py-5 rounded-2xl font-black text-xl text-white ${selectedCategory.color} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'} transition-all shadow-lg flex items-center justify-center mt-6`}>
                          {isSubmitting ? <span className="flex items-center gap-3"><Loader2 size={24} className="animate-spin" /> Enviando...</span> : <span className="flex items-center gap-3">¡Enviar Voto! <Send size={24} /></span>}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {currentView === 'results' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
                    <div className="text-center mb-10"><h2 className="text-3xl sm:text-4xl font-black text-indigo-900 mb-2">🏆 Cuadro de Honor</h2><p className="text-indigo-600 font-bold">Resultados oficiales basados en votos reales</p></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {CATEGORIES.map((cat, index) => {
                        const winnerData = winners.find(w => w.category_id === cat.id);
                        const Icon = cat.icon;
                        return (
                          <div key={cat.id} className={`bg-white rounded-[2.5rem] p-1 shadow-xl border-b-8 border-indigo-100 hover:border-indigo-200 transition-all group overflow-hidden flex flex-col ${index === CATEGORIES.length - 1 ? 'sm:col-span-2 sm:max-w-lg sm:mx-auto w-full' : ''}`}>
                            <div className={`${cat.color} ${cat.text} p-6 flex flex-col items-center justify-center text-center rounded-[2.2rem] m-2 shadow-sm`}><Icon size={32} strokeWidth={2.5} className="mb-2" /><span className="font-black text-xs uppercase tracking-tighter leading-tight">{CATEGORY_LABELS[cat.id] || cat.label}</span></div>
                            <div className="flex-1 p-6 flex flex-col items-center text-center justify-between gap-6">
                              <div>{winnerData ? (<><p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Ganador(a) Actual</p><h3 className="text-xl sm:text-2xl font-black text-indigo-900 leading-tight px-2">{winnerData.maestro_oficial}</h3></>) : (<div className="flex items-center gap-2 text-indigo-300 font-bold italic py-4"><AlertCircle size={20} /> Sin nominaciones aún</div>)}</div>
                              {winnerData && (<div className="w-full pt-4 border-t border-indigo-50 flex items-center justify-center gap-4"><div className="bg-indigo-50 px-5 py-3 rounded-2xl border-2 border-indigo-100 min-w-[90px] group-hover:scale-105 transition-transform"><span className={`text-xl font-black ${cat.text}`}>{winnerData.votos}</span><p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest -mt-1">Votos</p></div><div className="bg-yellow-100 p-2.5 rounded-full shadow-inner border border-yellow-200"><Trophy className="text-yellow-500 w-6 h-6" /></div></div>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <footer className="mt-16 sm:mt-24 text-center text-indigo-900/40 pb-12 px-4 border-t border-indigo-200/50 pt-8">
              <p className="text-sm font-black mb-6 uppercase tracking-[0.2em] text-indigo-900/60">Desarrollado por</p>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border-2 border-indigo-100 transform hover:scale-105 transition-transform"><img src="/logomestro.png" alt="Logo Maestro" className="h-40 sm:h-64 w-auto" /></div>
              </div>
              
              {/* Admin access icon */}
              <div className="mt-8">
                <a href="/login" className="inline-flex p-3 bg-white/50 text-indigo-300 hover:text-indigo-600 hover:bg-white rounded-full transition-all border border-indigo-100/50 shadow-sm" title="Admin">
                  <Settings size={18} />
                </a>
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <OfficialResultsScreen
          categories={CATEGORIES}
          categoryLabels={CATEGORY_LABELS}
          closingDate={closingDate}
          closingTime={closingTime}
        />
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.2)] animate-in zoom-in duration-300 transform scale-110 border-4 border-green-400">
            <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-white"><span className="text-6xl animate-bounce">🎉</span></div>
            <h3 className="text-3xl font-black text-indigo-900 mb-3">¡Voto Registrado!</h3>
            <p className="text-indigo-600 font-bold text-lg mb-8">Tu nominación se ha registrado con éxito.</p>
            <div className="bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100 flex items-center justify-center gap-3 text-indigo-800 font-black text-xl shadow-sm">¡Gracias por participar! <Medal size={24} className="text-yellow-500 fill-yellow-500" /></div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicVoting;
