import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  formatClosingDisplay,
  formatDateForInput,
  formatTimeForInput,
} from '../../lib/votingSettings';
import CountdownBanner from './CountdownBanner';

interface AdminVotingScheduleProps {
  ajustesId: string;
  closingDate: string | null;
  closingTime: string | null;
  closingAt: Date | null;
  votingEnabled: boolean;
  onSaved: () => void;
}

export default function AdminVotingSchedule({
  ajustesId,
  closingDate,
  closingTime,
  closingAt,
  votingEnabled,
  onSaved,
}: AdminVotingScheduleProps) {
  const [date, setDate] = useState(formatDateForInput(closingDate));
  const [time, setTime] = useState(formatTimeForInput(closingTime));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDate(formatDateForInput(closingDate));
    setTime(formatTimeForInput(closingTime));
  }, [closingDate, closingTime]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ajustes')
        .update({
          closing_date: date,
          closing_time: `${time}:00`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ajustesId);

      if (error) throw error;
      onSaved();
    } catch (err) {
      console.error('Error guardando cierre:', err);
      alert('No se pudo guardar la fecha de cierre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Calendar className="text-blue-400" size={22} />
            Cierre Automático
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            La votación se cerrará sola al llegar esta fecha y hora (hora de México).
          </p>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-3">
            Programado: {formatClosingDisplay(date, time)}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                votingEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {votingEnabled ? 'Votación activa' : 'Votación cerrada'}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha de cierre</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500/50 outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Clock size={12} /> Hora de cierre
            </span>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500/50 outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 text-center">
          Contador regresivo en vivo
        </p>
        <CountdownBanner closingAt={closingAt} votingEnabled={votingEnabled} />
      </div>
    </motion.div>
  );
}
