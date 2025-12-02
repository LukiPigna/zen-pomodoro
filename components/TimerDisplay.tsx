import React from 'react';
import { TimerMode } from '../types';

interface TimerDisplayProps {
  timeLeft: number;
  maxTime: number;
  mode: TimerMode;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ timeLeft, maxTime, mode }) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  // Progress calculation for the thin line
  const progressPercent = (timeLeft / maxTime) * 100;

  return (
    <div className="w-full flex flex-col items-center justify-center">
      
      {/* Massive Typographic Timer */}
      <div className="relative z-10 flex flex-col items-center select-none cursor-default">
        {/* Minutes */}
        <span className="text-[12rem] leading-[0.8] font-light tracking-tighter tabular-nums drop-shadow-2xl">
          {minutes < 10 ? `0${minutes}` : minutes}
        </span>
        
        {/* Seconds (Smaller, underneath) */}
        <span className="text-6xl font-light tracking-widest tabular-nums opacity-50 mt-4">
          {seconds < 10 ? `0${seconds}` : seconds}
        </span>
      </div>

      {/* Minimalist Progress Line */}
      <div className="w-64 h-1 bg-white/10 mt-12 rounded-full overflow-hidden">
        <div 
            className="h-full bg-current opacity-50 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
        />
      </div>

    </div>
  );
};