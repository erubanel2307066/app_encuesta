import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Smile, Shield, BookOpen, ClipboardCheck, Send, ArrowLeft, Sparkles, MessageSquare, Medal, Crown, Loader2, AlertCircle, Search } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import CountdownBanner from './ui/components/CountdownBanner';


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
    .replace(/profe/gi, '')
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
  // winners: [{ category_id: string, maestro_oficial: string, votos: number }]
  const [winners, setWinners] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- LÓGICA DE AUTOCOMPLETE Y FUZZY SEARCH ---
  const suggestions = React.useMemo(() => {
    if (!teacherName.trim() || teacherName.length < 2) return [];

    const normalizedInput = normalizarNombre(teacherName);
    if (!normalizedInput) return [];

    return officialTeachers
      .map(t => {
        const officialName = t.nombre_oficial;
        const officialNorm = normalizarNombre(officialName);
        let score = 0;

        // 1. Coincidencia Exacta (puntos máximos)
        if (officialNorm === normalizedInput) score += 100;
        
        // 2. Empieza con el texto ingresado
        if (officialNorm.startsWith(normalizedInput)) score += 50;

        // 3. Contiene el texto ingresado
        if (officialNorm.includes(normalizedInput)) score += 20;

        // 4. Coincidencia por palabras individuales
        const inputWords = normalizedInput.split(' ').filter(w => w.length > 1);
        const officialWords = officialNorm.split(' ');
        
        inputWords.forEach(iw => {
          if (officialWords.some(ow => ow.startsWith(iw))) score += 15;
          else if (officialWords.some(ow => ow.includes(iw))) score += 5;
        });

        return { name: officialName, score };
      })
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6); // Mostrar hasta 6 sugerencias
  }, [teacherName, officialTeachers]);

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

  // --- CARGAR GANADORES DESDE LA VISTA category_winners ---
  const fetchWinners = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('category_winners')
        .select('*');
      
      if (error) throw error;
      
      console.log("Ganadores reales:", data);
      setWinners(data ?? []);
    } catch (error) {
      console.error('Error al recargar ganadores:', error);
    }
  }, []);

  // --- CARGA INICIAL: catálogo de maestros + ganadores ---
  const fetchInitialData = useCallback(async () => {
    setIsLoadingData(true);
    setDbError(null);
    try {
      // 1. Catálogo oficial de maestros
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('nombre_oficial');
      if (teachersError) throw teachersError;
      setOfficialTeachers(teachersData ?? []);

      // 2. Ganadores actuales
      await fetchWinners();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      setDbError('No pudimos conectar con la base de datos.');
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchWinners]);

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setIsLoadingData(false);
      return;
    }

    // Carga inicial
    fetchInitialData();

    // Suscribirse a nuevos votos en tiempo real
    const subscription = supabase
      .channel('realtime:teacher_votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'teacher_votes' },
        () => {
          // Refrescar ganadores desde la vista cuando llega un nuevo voto
          fetchWinners();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchInitialData, fetchWinners]);

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

      console.log("Fingerprint generado:", visitorId);

      const payload = { 
        teacher_name: originalName, 
        maestro_oficial: oficialMatch, // El nombre detectado (o fallback al original normalizado)
        category_id: selectedCategory.id, 
        reason: reason.trim(),
        device_fingerprint: visitorId
      };

      console.log("Payload enviado:", payload);

      const { error } = await supabase
        .from('teacher_votes')
        .insert([payload]);

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

  // Mapeo de IDs de categoría a etiquetas "bonitas"
  const CATEGORY_LABELS = {
    best: "El/La Mejor de Todos",
    fun: "El Más Divertido",
    explains: "Explica Mejor",
    inspiring: "Inspiración Total",
    strict: "El Más Estricto"
  };

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

        {/* --- CONTADOR DE CIERRE --- */}
        <div className="mb-12">
          <CountdownBanner />
        </div>

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
                    <div className="relative group">
                      <label className="block text-indigo-900 font-bold mb-2 ml-2 text-xl flex items-center gap-2">
                        <Search size={20} className="text-indigo-400" />
                        ¿A quién nominas?
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={teacherName}
                          onChange={(e) => {
                            setTeacherName(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => {
                            // Delay to allow clicking on suggestions
                            setTimeout(() => setShowSuggestions(false), 200);
                          }}
                          placeholder="Ej. Juan Pérez García"
                          className="w-full text-lg px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-indigo-300 font-semibold text-indigo-900 shadow-inner pr-12"
                          required
                          disabled={isSubmitting || !isConfigured}
                          autoComplete="off"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 group-focus-within:text-indigo-400 transition-colors">
                          <BookOpen size={24} />
                        </div>
                      </div>

                      {/* DROPDOWN DE SUGERENCIAS */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-[60] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Sugerencias encontradas</span>
                            <Sparkles size={14} className="text-indigo-300 mr-2" />
                          </div>
                          <ul className="max-h-60 overflow-y-auto py-1">
                            {suggestions.map((suggestion, idx) => (
                              <li key={idx}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTeacherName(suggestion.name);
                                    setShowSuggestions(false);
                                  }}
                                  className="w-full text-left px-5 py-3.5 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between group/item"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold text-indigo-900 group-hover/item:text-white transition-colors">
                                      {suggestion.name}
                                    </span>
                                    <span className="text-xs text-indigo-400 group-hover/item:text-indigo-100 font-medium">
                                      Maestro Oficial
                                    </span>
                                  </div>
                                  <Medal size={18} className="text-indigo-200 group-hover/item:text-yellow-300 transition-colors" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                      className={`w-full py-5 rounded-2xl font-black text-xl text-white ${selectedCategory.color} ${(isSubmitting || !isConfigured) ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'} transition-all shadow-lg flex items-center justify-center mt-6`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-3"><Loader2 size={24} className="animate-spin" /> Enviando...</span>
                      ) : (
                        <span className="flex items-center gap-3">¡Enviar Voto! <Send size={24} /></span>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* --- VIEW 3: RESULTADOS (GANADORES REALES) --- */}
            {currentView === 'results' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
                
                <div className="text-center mb-10">
                  <h2 className="text-3xl sm:text-4xl font-black text-indigo-900 mb-2">
                    🏆 Cuadro de Honor
                  </h2>
                  <p className="text-indigo-600 font-bold">Resultados oficiales basados en votos reales</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {CATEGORIES.map((cat, index) => {
                    const winnerData = winners.find(w => w.category_id === cat.id);
                    const Icon = cat.icon;
                    const isLast = index === CATEGORIES.length - 1;
                    
                    return (
                      <div 
                        key={cat.id} 
                        className={`bg-white rounded-[2.5rem] p-1 shadow-xl border-b-8 border-indigo-100 hover:border-indigo-200 transition-all group overflow-hidden flex flex-col ${isLast ? 'sm:col-span-2 sm:max-w-lg sm:mx-auto w-full' : ''}`}
                      >
                        {/* Header: Categoría y Icono */}
                        <div className={`${cat.color} ${cat.text} p-6 flex flex-col items-center justify-center text-center rounded-[2.2rem] m-2 shadow-sm`}>
                          <Icon size={32} strokeWidth={2.5} className="mb-2" />
                          <span className="font-black text-xs uppercase tracking-tighter leading-tight">
                            {CATEGORY_LABELS[cat.id] || cat.label}
                          </span>
                        </div>

                        {/* Content: Ganador y Votos */}
                        <div className="flex-1 p-6 flex flex-col items-center text-center justify-between gap-6">
                          <div>
                            {winnerData ? (
                              <>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Ganador(a) Actual</p>
                                <h3 className="text-xl sm:text-2xl font-black text-indigo-900 leading-tight px-2">
                                  {winnerData.maestro_oficial}
                                </h3>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-indigo-300 font-bold italic py-4">
                                <AlertCircle size={20} /> Sin nominaciones aún
                              </div>
                            )}
                          </div>

                          {winnerData && (
                            <div className="w-full pt-4 border-t border-indigo-50 flex items-center justify-center gap-4">
                              <div className="bg-indigo-50 px-5 py-3 rounded-2xl border-2 border-indigo-100 min-w-[90px] group-hover:scale-105 transition-transform">
                                <span className={`text-xl font-black ${cat.text}`}>{winnerData.votos}</span>
                                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest -mt-1">Votos</p>
                              </div>
                              <div className="bg-yellow-100 p-2.5 rounded-full shadow-inner border border-yellow-200">
                                <Trophy className="text-yellow-500 w-6 h-6" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {winners.length === 0 && (
                  <div className="bg-white/80 backdrop-blur-sm p-12 rounded-[3rem] text-center border-4 border-dashed border-indigo-100">
                    <p className="text-indigo-400 font-bold text-xl italic">
                      Esperando los primeros resultados... <br />
                      ¡Corre a votar por tu maestro favorito! 🚀
                    </p>
                  </div>
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
            <p className="text-indigo-600 font-bold text-lg mb-8">Tu nominación se ha registrado con éxito.</p>
            
            <div className="bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100 flex items-center justify-center gap-3 text-indigo-800 font-black text-xl shadow-sm">
              ¡Gracias por participar! <Medal size={24} className="text-yellow-500 fill-yellow-500" />
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
