import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CallTimerProps {
  startTime?: string | null;
  isActive: boolean;
}

export const CallTimer: React.FC<CallTimerProps> = ({ startTime, isActive }) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const startMs = startTime ? new Date(startTime).getTime() : Date.now();

    const updateTimer = () => {
      const now = Date.now();
      setSecondsElapsed(Math.max(0, Math.floor((now - startMs) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-2 text-emerald-400 font-mono text-sm bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-inner">
      <Clock className="h-4 w-4 text-emerald-400 animate-spin-slow" />
      <span className="font-bold tracking-wider">{formatTime(secondsElapsed)}</span>
    </div>
  );
};
