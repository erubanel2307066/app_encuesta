import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface CountdownBannerProps {
  closingAt: Date | null;
  votingEnabled?: boolean;
}

export default function CountdownBanner({ closingAt, votingEnabled = true }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    hoursTotal: 0,
  });

  const calculateTimeLeft = useCallback(() => {
    if (!closingAt || !votingEnabled) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, hoursTotal: 0 };
    }

    const difference = closingAt.getTime() - Date.now();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, hoursTotal: 0 };
    }

    const hoursTotal = difference / (1000 * 60 * 60);

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isExpired: false,
      hoursTotal,
    };
  }, [closingAt, votingEnabled]);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const getTheme = () => {
    if (timeLeft.isExpired) {
      return {
        bg: 'bg-slate-400',
        border: 'border-slate-600',
        text: 'text-slate-900',
        iconBg: 'bg-white/20',
      };
    }

    if (timeLeft.hoursTotal < 24) {
      return {
        bg: 'bg-rose-500',
        border: 'border-rose-700',
        text: 'text-rose-50',
        iconBg: 'bg-white/30',
        pulse: 'animate-pulse',
      };
    }

    if (timeLeft.hoursTotal < 48) {
      return {
        bg: 'bg-orange-500',
        border: 'border-orange-700',
        text: 'text-orange-50',
        iconBg: 'bg-white/30',
      };
    }

    return {
      bg: 'bg-indigo-600',
      border: 'border-indigo-800',
      text: 'text-indigo-50',
      iconBg: 'bg-white/30',
    };
  };

  const theme = getTheme();

  if (timeLeft.isExpired) {
    return (
      <div className={`${theme.bg} ${theme.text} p-8 rounded-[2.5rem] border-b-8 ${theme.border} shadow-xl text-center flex flex-col items-center mb-8`}>
        <div className={`${theme.iconBg} p-4 rounded-full mb-4 shadow-inner`}>
          <CheckCircle2 size={40} strokeWidth={2.5} />
        </div>
        <span className="font-black text-2xl leading-tight drop-shadow-sm uppercase tracking-tight">
          Votación Finalizada
        </span>
        <p className="mt-2 font-bold opacity-80">Gracias por participar</p>
      </div>
    );
  }

  return (
    <div className={`${theme.bg} ${theme.text} p-8 rounded-[2.5rem] border-b-8 ${theme.border} shadow-xl transform transition-all duration-300 flex flex-col items-center text-center ${theme.pulse || ''} mb-8`}>
      <div className={`${theme.iconBg} p-4 rounded-full mb-4 shadow-inner`}>
        <Clock size={44} strokeWidth={2.5} />
      </div>

      <div className="mb-6">
        <h3 className="font-black text-2xl sm:text-4xl leading-tight drop-shadow-md uppercase tracking-tight">
          ¡Hay tiempo, vota!
        </h3>
        <p className="font-extrabold text-lg sm:text-xl opacity-90 mt-1">Falta:</p>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-4 w-full max-w-md">
        {[
          { value: timeLeft.days, label: 'Días' },
          { value: timeLeft.hours, label: 'Horas' },
          { value: timeLeft.minutes, label: 'Min' },
          { value: timeLeft.seconds, label: 'Seg' },
        ].map(block => (
          <div
            key={block.label}
            className="flex flex-col items-center bg-black/10 rounded-[1.5rem] py-4 border border-white/10 backdrop-blur-sm"
          >
            <span className="text-2xl sm:text-4xl font-black tabular-nums">{block.value}</span>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest opacity-60 mt-1">
              {block.label}
            </span>
          </div>
        ))}
      </div>

      {timeLeft.hoursTotal < 48 && (
        <div className="mt-6 flex items-center gap-2 px-5 py-2 bg-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-white/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          {timeLeft.hoursTotal < 24 ? '¡Corre, falta poco!' : '¡Menos de 48h!'}
        </div>
      )}
    </div>
  );
}
