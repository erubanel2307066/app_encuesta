import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Smile, Shield, BookOpen, ClipboardCheck, Send, ArrowLeft, Sparkles, MessageSquare, Medal, Crown, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// --- CONFIGURACIÓN DE SUPABASE (PRODUCCIÓN) ---
// Vite usa import.meta.env para leer las variables del archivo .env o de Render
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;

// Verificamos si las llaves existen para no romper la app si falta configurarlas
if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL_HERE') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isConfigured = true;
  } catch (error) {
    console.error("Error al inicializar Supabase. Revisa tus llaves en el archivo .env", error);
  }
}

// Categorías con colores vibrantes y divertidos
const CATEGORIES = [
  { id: 'best', label: 'El/La Mejor de Todos 👑', icon: Crown, color: 'bg-yellow-400', shadow: 'shadow-yellow-300', text: 'text-yellow-900', border: 'border-yellow-500', isFeatured: true },
  { id: 'fun', label: 'El más Divertido 😂', icon: Smile, color: 'bg-pink-400', shadow: 'shadow-pink-300', text: 'text-pink-900', border: 'border-pink-500' },
  { id: 'explains', label: 'El Cerebrito 🧠', icon: BookOpen, color: 'bg-cyan-400', shadow: 'shadow-cyan-300', text: 'text-cyan-900', border: 'border-cyan-500' },
  { id: 'inspiring', label: 'Inspiración Total ✨', icon: Sparkles, color: 'bg-amber-400', shadow: 'shadow-amber-300', text: 'text-amber-900', border: 'border-amber-500' },
  { id: 'strict', label: 'Estricto pero Justo ⚖️', icon: Shield, color: 'bg-violet-400', shadow: 'shadow-violet-300', text: 'text-violet-900', border: 'border-violet-500' },
];

// Función para normalizar nombres (Elimina títulos, paréntesis y estandariza texto)
function normalizarNombre(nombre) {
  if (!nombre) return '';
  return nombre
    .toLowerCase()
    .replace(/mtro\.?/gi, '')
    .replace(/mtra\.?/gi, '')
    .replace(/maestro/gi, '')
    .replace(/maestra/gi, '')
    .replace(/profr\.?/gi, '')
    .replace(/prof\.?/gi, '')
    .replace(/profesor/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Función para coincidencia inteligente (Fuzzy Matching)
const findOfficialTeacher = (inputName, officialTeachers) => {
  const normalizedInput = normalizarNombre(inputName);
  if (!normalizedInput || !officialTeachers || officialTeachers.length === 0) return normalizedInput;

  let bestMatch = null;
  let maxScore = 0;

  const inputWords = normalizedInput.split(' ').filter(w => w.length > 2);

  for (const teacher of officialTeachers) {
    const officialNorm = normalizarNombre(teacher.nombre_oficial);
    let score = 0;

    // 1. Coincidencia Exacta (después de normalizar)
    if (officialNorm === normalizedInput) {
      return teacher.nombre_oficial;
    }

    // 2. Coincidencia por Inclusión (ej. "Mauro Lorenzo" en "Mauro Lorenzo Morales")
    if (officialNorm.includes(normalizedInput) || normalizedInput.includes(officialNorm)) {
      score += 10;
    }

    // 3. Coincidencia por Palabras
    const officialWords = officialNorm.split(' ');
    let wordsMatched = 0;
    for (const word of inputWords) {
      if (officialWords.some(ow => ow.includes(word) || word.includes(ow))) {
        wordsMatched++;
      }
    }
    
    score += wordsMatched * 2;

    // Umbral de confianza
    if (score > maxScore && score >= 2) {
      maxScore = score;
      bestMatch = teacher.nombre_oficial;
    }
  }

  // Si hay una buena coincidencia, usar el nombre oficial. Si no, regresar el texto original.
  return bestMatch || inputName.trim().replace(/\b\w/g, l => l.toUpperCase());
};

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // home, voting, results
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // Formulario
  const [teacherName, setTeacherName] = useState('');
  const [reason, setReason] = useState('');
  
  // Datos de Supabase
  const [officialTeachers, setOfficialTeachers] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [votes, setVotes] = useState([]); // Mantenemos para 'reasons' si la vista no lo tiene

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Antifraude
  const [visitorId, setVisitorId] = useState(null);

  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setVisitorId(result.visitorId);
        console.log("Fingerprint:", result.visitorId);
      } catch (error) {
        console.error("Error inicializando FingerprintJS:", error);
      }
    };
    initFingerprint();
  }, []);

  // --- ESCUCHAR DATOS EN TIEMPO REAL DESDE SUPABASE ---
  const fetchData = async () => {
    setIsLoadingData(true);
    setDbError(null);
    try {
      // 1. Catálogo Oficial
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('nombre_oficial');
      if (teachersError) throw teachersError;
      setOfficialTeachers(teachersData || []);

      // 2. Ranking General (agrupado por maestro_oficial en Supabase)
      const { data: rankingData, error: rankingError } = await supabase
        .from('teacher_ranking')
        .select('*')
        .order('puntos', { ascending: false });
      if (rankingError) throw rankingError;
      
      console.log("Datos reales del ranking:", rankingData); // Para debug
      
      setRanking(rankingData || []);

      // 3. Ranking por Categorías (agrupado por maestro_oficial en Supabase)
      const { data: catRankingData, error: catRankingError } = await supabase
        .from('category_ranking')
        .select('*')
        .order('votos', { ascending: false });
      
      // Si la vista aún no existe, no rompemos la app, solo atrapamos el error
      if (catRankingError) {
        console.warn("Vista category_ranking no encontrada, se usará cálculo local.", catRankingError);
      } else {
        setCategoryRanking(catRankingData || []);
      }

      // 4. Votos individuales (necesario para las justificaciones / reasons si la vista no lo tiene)
      const { data: votesData, error: votesError } = await supabase
        .from('teacher_votes')
        .select('*');
      if (votesError) throw votesError;
      setVotes(votesData || []);

    } catch (error) {
      console.error("Error al cargar datos:", error);
      setDbError("No pudimos conectar con la base de datos.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setIsLoadingData(false);
      return;
    }

    fetchData();

    // 3. Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('public:teacher_votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teacher_votes' }, payload => {
        setVotes(currentVotes => [...currentVotes, payload.new]);
        // Recargar el ranking para que se actualice la vista
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Iniciar flujo de votación
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setCurrentView('voting');
    setTeacherName('');
    setReason('');
  };

  // Enviar el voto a Supabase
  const handleSubmitVote = async (e) => {
    e.preventDefault();
    if (!teacherName.trim() || !reason.trim() || isSubmitting) return;

    if (!isConfigured || !supabase) {
       alert("Error: La base de datos no está conectada. Revisa tu archivo .env");
       return;
    }

    setIsSubmitting(true);

    try {
      // Validación Antifraude
      if (visitorId) {
        const { data: existingVote, error: checkError } = await supabase
          .from('teacher_votes')
          .select('id')
          .eq('device_fingerprint', visitorId)
          .eq('category_id', selectedCategory.id)
          .limit(1);

        if (checkError) {
          console.error("Error validando voto previo:", checkError);
        } else if (existingVote && existingVote.length > 0) {
          alert("Ya realizaste una votación en esta categoría.");
          setIsSubmitting(false);
          return;
        }
      }

      // Nombre original escrito por el usuario
      const originalName = teacherName.trim().replace(/\b\w/g, l => l.toUpperCase());
      
      // Coincidencia inteligente contra el catálogo oficial
      const oficialMatch = findOfficialTeacher(teacherName, officialTeachers);

      const { error } = await supabase
        .from('teacher_votes')
        .insert([
          { 
            teacher_name: originalName, 
            maestro_oficial: oficialMatch, // El nombre detectado (o fallback al original normalizado)
            category_id: selectedCategory.id, 
            reason: reason.trim(),
            device_fingerprint: visitorId
          }
        ]);

      if (error) throw error;

      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
        setCurrentView('home');
      }, 2500);

    } catch (error) {
      console.error("Error al guardar el voto:", error);
      alert("Hubo un error al enviar el voto. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- PREPARAR GANADORES POR CATEGORÍA PARA RENDERIZADO ---
  // Combinamos la configuración de CATEGORIES con los datos pre-agrupados de Supabase
  const categoryWinners = CATEGORIES.map(cat => {
    // Buscar si hay datos en la vista category_ranking para esta categoría
    // Asumimos que categoryRanking trae: { category_id, maestro_oficial, votos }
    const catData = categoryRanking.find(cr => cr.category_id === cat.id);
    
    return {
      ...cat,
      winner: catData ? { name: catData.maestro_oficial } : null,
      topVotes: catData ? catData.votos : 0,
      topReasons: [] // Si tienes razones agrupadas en la vista, ponlas aquí (ej: catData.reasons)
    };
  });

  return (
    <div className="min-h-screen bg-indigo-50 font-sans selection:bg-yellow-300 relative overflow-hidden pb-24">
      
      {/* Alerta si falta configurar .env */}
      {!isConfigured && (
        <div className="bg-red-500 text-white p-3 text-sm text-center font-bold flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50">
          <AlertCircle size={20} className="shrink-0" /> 
          <span>Falta conectar la base de datos. Crea tu archivo <b>.env</b> con tus llaves de Supabase.</span>
        </div>
      )}

      {/* Elementos de fondo */}
      <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
      <div className="absolute top-1/4 right-[-50px] w-56 h-56 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-cyan-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="max-w-xl mx-auto relative z-10 px-4 pt-8 sm:pt-12">
        
        {/* --- HEADER --- */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-2 bg-white rounded-2xl shadow-md border-2 border-indigo-100 transform -rotate-6 hover:rotate-0 transition-transform">
              <img src="/logomiguel.png" alt="Logo Escuela" className="h-16 sm:h-20 w-auto" />
            </div>
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-lg border-4 border-indigo-400 transform rotate-6 hover:rotate-0 transition-transform">
              <ClipboardCheck size={32} className="text-indigo-500 sm:w-10 sm:h-10" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-900 tracking-tight drop-shadow-sm leading-tight" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
              Premios <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
                Día del Maestro
              </span>
            </h1>
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-bold text-indigo-600 uppercase tracking-widest bg-white/60 inline-block px-6 py-2 rounded-full shadow-sm border border-indigo-100">
                Escuela Secundaria General
                <br/>
                <span className="text-lg sm:text-xl text-indigo-800">Miguel Hidalgo y Costilla</span>
              </h2>
            </div>
          </div>
        </header>

        {/* --- NAVEGACIÓN --- */}
        {currentView !== 'voting' && (
          <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-full shadow-inner mb-8 sm:mb-12 max-w-sm mx-auto">
            <button 
              onClick={() => setCurrentView('home')}
              className={`flex-1 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${currentView === 'home' ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-indigo-600 hover:bg-indigo-100'}`}
            >
              ¡Votar Ahora!
            </button>
            <button 
              onClick={() => setCurrentView('results')}
              className={`flex-1 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-1 ${currentView === 'results' ? 'bg-yellow-400 text-yellow-900 shadow-md transform scale-105' : 'text-indigo-600 hover:bg-indigo-100'}`}
            >
              Resultados 🏆
              {/* Indicador de conexión en vivo */}
              {currentView === 'results' && isConfigured && !dbError && (
                <span className="flex h-2 w-2 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>
        )}

        {/* Manejo de estados de carga y error */}
        {isLoadingData && currentView === 'results' ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
             <Loader2 size={48} className="animate-spin mb-4" />
             <p className="font-bold text-lg animate-pulse">Cargando resultados...</p>
          </div>
        ) : dbError && currentView === 'results' ? (
          <div className="bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-200 text-center text-red-600 font-medium">
            <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-lg">{dbError}</p>
          </div>
        ) : (
          <>
            {/* --- VIEW 1: HOME --- */}
            {currentView === 'home' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <p className="text-center font-bold text-indigo-800 bg-white/50 py-3 rounded-2xl shadow-sm border border-indigo-100 text-lg">
                  1. Selecciona un premio para otorgar 👇
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat)}
                        className={`${cat.color} ${cat.text} p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-b-8 ${cat.border} shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all active:translate-y-1 active:border-b-0 flex flex-col items-center text-center ${cat.isFeatured ? 'sm:col-span-2' : ''}`}
                      >
                        <div className="bg-white/30 p-4 rounded-full mb-4 shadow-inner">
                          <Icon size={cat.isFeatured ? 48 : 40} strokeWidth={2.5} />
                        </div>
                        <span className={`font-black leading-tight drop-shadow-sm ${cat.isFeatured ? 'text-2xl' : 'text-lg'}`}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- VIEW 2: VOTAR --- */}
            {currentView === 'voting' && selectedCategory && (
              <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="mb-6 flex items-center text-indigo-600 font-bold hover:text-indigo-800 bg-white/50 px-4 py-2 rounded-full w-max shadow-sm transition-colors"
                >
                  <ArrowLeft size={20} className="mr-1" /> Cambiar premio
                </button>

                <div className={`bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl border-4 ${selectedCategory.border} relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 w-full h-24 ${selectedCategory.color} flex items-center justify-center opacity-20`}></div>
                  
                  <div className="relative z-10 flex flex-col items-center mb-8">
                    <div className={`${selectedCategory.color} ${selectedCategory.text} p-6 rounded-full shadow-xl -mt-16 sm:-mt-20 mb-4 border-8 border-white`}>
                      <selectedCategory.icon size={48} strokeWidth={2.5} />
                    </div>
                    <h2 className={`text-3xl font-black text-center ${selectedCategory.text}`}>
                      {selectedCategory.label}
                    </h2>
                  </div>

                  <form onSubmit={handleSubmitVote} className="space-y-6">
                    <div>
                      <label className="block text-indigo-900 font-bold mb-2 ml-2 text-xl">¿A quién nominas?</label>
                      <input 
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Ej. Juan Pérez García"
                        className="w-full text-lg px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-indigo-300 font-semibold text-indigo-900 shadow-inner"
                        required
                        disabled={isSubmitting || !isConfigured}
                      />
                    </div>

                    <div>
                      <label className="block text-indigo-900 font-bold mb-2 ml-2 text-xl">¿Por qué se lo merece?</label>
                      <textarea 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Escribe algo chido... Ej. Sus clases son las mejores."
                        rows={4}
                        className="w-full text-lg px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-indigo-300 resize-none font-semibold text-indigo-900 shadow-inner"
                        required
                        disabled={isSubmitting || !isConfigured}
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting || !isConfigured}
                      className={`w-full py-5 rounded-2xl font-black text-xl text-white ${selectedCategory.color} ${(isSubmitting || !isConfigured) ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'} transition-all shadow-lg flex items-center justify-center gap-3 mt-6`}
                    >
                      {isSubmitting ? <><Loader2 size={24} className="animate-spin" /> Enviando...</> : '¡Enviar Voto!'} 
                      {!isSubmitting && <Send size={24} />}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* --- VIEW 3: RESULTADOS --- */}
            {currentView === 'results' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom duration-500">
                
                {/* Top 3 General */}
                <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl border-4 border-indigo-200">
                  <h2 className="text-2xl sm:text-3xl font-black text-indigo-900 mb-8 flex items-center justify-center gap-3">
                    <Trophy className="text-yellow-400 fill-yellow-400 w-8 h-8 sm:w-10 sm:h-10" /> TOP MAESTROS <Trophy className="text-yellow-400 fill-yellow-400 w-8 h-8 sm:w-10 sm:h-10" />
                  </h2>

                  <div className="space-y-6">
                    {ranking.slice(0, 5).map((teacher, idx) => (
                      <div key={teacher.maestro_oficial || idx} className="relative flex items-center p-4 sm:p-5 bg-indigo-50 rounded-[2rem] overflow-hidden group border border-indigo-100">
                        <div 
                          className="absolute left-0 top-0 h-full bg-indigo-200/50 transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((teacher.puntos / (ranking[0]?.puntos || 1)) * 100, 100)}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex items-center w-full">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl mr-4 shadow-md shrink-0
                            ${idx === 0 ? 'bg-yellow-400 text-yellow-900 border-4 border-white' : 
                              idx === 1 ? 'bg-slate-300 text-slate-700 border-4 border-white' : 
                              idx === 2 ? 'bg-amber-600 text-amber-100 border-4 border-white' : 
                              'bg-indigo-200 text-indigo-700'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-lg sm:text-xl text-indigo-900 truncate">{teacher.maestro_oficial}</h3>
                          </div>
                          <div className="text-right ml-3 shrink-0 bg-white px-4 py-2 rounded-2xl shadow-md border border-indigo-100">
                            <span className="font-black text-xl text-indigo-600">{teacher.puntos}</span>
                            <span className="text-xs font-bold text-indigo-400 ml-1">PTS</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {ranking.length === 0 && (
                      <p className="text-center text-indigo-400 font-bold py-10 text-lg italic">¡Nadie ha votado todavía! Sé el primero en nominar. 🚀</p>
                    )}
                  </div>
                </div>

                {/* Ganadores por Categoría */}
                {ranking.length > 0 && (
                  <>
                    <h2 className="text-2xl font-black text-center text-indigo-900 mt-16 mb-6 bg-white/50 py-3 rounded-full inline-block px-10 w-full shadow-md border border-indigo-100">
                      Ganadores por Categoría 🌟
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {categoryWinners.map(cat => {
                        const Icon = cat.icon;
                        return (
                          <div key={cat.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border-2 border-indigo-100 flex flex-col">
                            <div className={`${cat.color} p-5 flex items-center justify-between shadow-sm`}>
                              <div className="flex items-center gap-3">
                                <div className="bg-white/30 p-2.5 rounded-2xl shadow-inner">
                                  <Icon size={28} className={cat.text} strokeWidth={2.5} />
                                </div>
                                <h3 className={`font-black text-lg sm:text-xl ${cat.text}`}>{cat.label}</h3>
                              </div>
                            </div>
                            
                            <div className="p-6 flex-1 flex flex-col">
                              {cat.winner ? (
                                <div className="flex-1 flex flex-col">
                                  <div className="flex items-end justify-between mb-6 border-b-2 border-indigo-50 pb-6">
                                    <div className="max-w-[75%]">
                                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Nominado principal</p>
                                      <h4 className="text-2xl font-black text-indigo-900 leading-tight">{cat.winner.name}</h4>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className={`text-3xl font-black ${cat.text}`}>{cat.topVotes}</span>
                                      <span className="text-xs font-bold text-indigo-400 block -mt-1 tracking-tighter">VOTOS</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3 flex-1">
                                    <p className="text-xs font-bold text-indigo-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                      <MessageSquare size={14} className="text-indigo-300" /> ¿Qué dicen los alumnos?
                                    </p>
                                    {cat.topReasons.map((r, i) => (
                                      <div key={i} className="bg-indigo-50/50 rounded-[1.5rem] p-4 text-sm sm:text-base text-indigo-800 italic relative border border-indigo-100 leading-relaxed shadow-sm">
                                        "{r}"
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                  <div className="bg-indigo-50 p-4 rounded-full mb-3">
                                    <AlertCircle size={32} className="text-indigo-200" />
                                  </div>
                                  <p className="text-indigo-300 font-bold italic">Nadie ha sido nominado aún.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* --- FOOTER --- */}
        <footer className="mt-16 sm:mt-24 text-center text-indigo-900/40 pb-12 px-4 border-t border-indigo-200/50 pt-8">
          <p className="text-sm font-black mb-6 uppercase tracking-[0.2em] text-indigo-900/60">Desarrollado por</p>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border-2 border-indigo-100 transform hover:scale-105 transition-transform">
              <img src="/logomestro.png" alt="Logo Maestro" className="h-40 sm:h-64 w-auto" />
            </div>
          </div>
        </footer>

      </div>

      {/* MODAL DE ÉXITO */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.2)] animate-in zoom-in duration-300 transform scale-110 border-4 border-green-400">
            <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-white">
              <span className="text-6xl animate-bounce">🎉</span>
            </div>
            <h3 className="text-3xl font-black text-indigo-900 mb-3">¡Voto Registrado!</h3>
            <p className="text-indigo-600 font-bold text-lg mb-8">Tus puntos se han sumado al profesor con éxito.</p>
            
            <div className="bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100 flex items-center justify-center gap-3 text-indigo-800 font-black text-xl shadow-sm">
              +10 Puntos Generales <Medal size={24} className="text-yellow-500 fill-yellow-500" />
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}} />
    </div>
  );
}
