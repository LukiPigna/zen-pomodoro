import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings2, CheckCircle2, Clock, Download, Share } from 'lucide-react';
import { TimerMode } from './types';
import { TimerDisplay } from './components/TimerDisplay';

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [cycles, setCycles] = useState<number>(0); // Counts completed FOCUS sessions
  
  // Settings
  const [baseFocusTime, setBaseFocusTime] = useState<number>(25); // Minutes
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  
  // Audio Context for Beep
  const audioContextRef = useRef<AudioContext | null>(null);

  // Derived durations based on "The Rule"
  const getDurations = useCallback(() => {
    const focusSeconds = baseFocusTime * 60;
    const shortBreakSeconds = Math.floor(focusSeconds * 0.2); 
    const longBreakSeconds = Math.floor(focusSeconds * 0.6); 
    
    return {
      [TimerMode.FOCUS]: focusSeconds,
      [TimerMode.SHORT_BREAK]: shortBreakSeconds,
      [TimerMode.LONG_BREAK]: longBreakSeconds,
    };
  }, [baseFocusTime]);

  const durations = getDurations();
  const maxTime = durations[mode];

  // --- Effects ---

  // Check if iOS
  useEffect(() => {
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);
  }, []);

  // PWA Install Event Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Timer Tick
  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Timer Finished
      setIsActive(false);
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Update title
  useEffect(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.title = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} - ZenPomodoro`;
  }, [timeLeft]);

  // Request Notification Permission on Mount (optional, better on user interaction)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
        // We wait for user interaction usually, but check availability here
    }
  }, []);

  // --- Handlers ---

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
            body: body,
            icon: './public/icon.svg', 
            silent: true // We handle sound via AudioContext
        });
      } catch (e) {
        console.error("Notification failed", e);
      }
    }
  };

  const playSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== 'closed') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); 
        gain.gain.setValueAtTime(0.05, ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.5); 
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
    }
  };

  const handleTimerComplete = () => {
    playSound();
    setIsFinished(true);
    
    let notifTitle = "Tiempo completado";
    let notifBody = "";

    if (mode === TimerMode.FOCUS) {
        notifTitle = "Sesión terminada";
        notifBody = "Es hora de tomar un descanso.";
        setCycles(prev => prev + 1); // Increment completed sessions ONLY when focus ends
    } else {
        notifTitle = "Descanso terminado";
        notifBody = "Es hora de volver a enfocar.";
    }

    sendNotification(notifTitle, notifBody);
  };

  const advanceCycle = () => {
    setIsFinished(false);
    
    // Logic to switch modes
    if (mode === TimerMode.FOCUS) {
      // Cycle count is incremented in handleTimerComplete to ensure it only counts finished sessions
      // Determine next break type based on current cycle count
      // Note: cycles state has already been incremented by 1 at this point
      if (cycles > 0 && cycles % 4 === 0) {
        switchMode(TimerMode.LONG_BREAK);
      } else {
        switchMode(TimerMode.SHORT_BREAK);
      }
    } else {
      switchMode(TimerMode.FOCUS);
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    const newDurations = getDurations();
    setTimeLeft(newDurations[newMode]);
    setIsActive(false);
    setIsFinished(false);
  };

  const toggleTimer = () => {
    if (isFinished) {
        advanceCycle();
        return;
    }
    
    // Request permission on first explicit start
    if (!isActive) {
        requestNotificationPermission();
    }
    
    setIsActive(!isActive);
    if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  // FULL RESET: Resets everything to initial state
  const resetSession = () => {
    setIsActive(false);
    setIsFinished(false);
    setCycles(0); // Reset session count
    setMode(TimerMode.FOCUS); // Back to Focus
    setTimeLeft(baseFocusTime * 60); // Reset time
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value, 10);
    setBaseFocusTime(newVal);
    // If currently in focus mode and paused, update immediately
    if (mode === TimerMode.FOCUS && !isActive) {
        setTimeLeft(newVal * 60);
    }
  };

  // --- Helpers for Display ---

  const getTotalStudyTime = () => {
    const totalMinutes = cycles * baseFocusTime;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // --- Visuals ---

  const getBackgroundClass = () => {
    switch (mode) {
      case TimerMode.FOCUS: return 'bg-zinc-950'; // Very dark grey/black
      case TimerMode.SHORT_BREAK: return 'bg-teal-950'; // Dark teal
      case TimerMode.LONG_BREAK: return 'bg-indigo-950'; // Dark indigo
      default: return 'bg-black';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
        case TimerMode.FOCUS: return 'Focus';
        case TimerMode.SHORT_BREAK: return 'Descanso';
        case TimerMode.LONG_BREAK: return 'Descanso Largo';
    }
  };

  const getAccentColor = () => {
     switch (mode) {
      case TimerMode.FOCUS: return 'text-white';
      case TimerMode.SHORT_BREAK: return 'text-teal-200';
      case TimerMode.LONG_BREAK: return 'text-indigo-200';
    }
  }

  return (
    <div className={`relative h-full w-full flex flex-col items-center transition-colors duration-1000 ease-in-out ${getBackgroundClass()} ${isFinished ? 'animate-finish' : ''}`}>
      
      {/* Header */}
      <header className="w-full p-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
            {/* Simple logo representation in header */}
            <div className={`w-3 h-3 rounded-full border border-current ${getAccentColor()}`}></div>
            <span className={`text-sm font-medium tracking-[0.2em] uppercase ${getAccentColor()}`}>Zen</span>
        </div>
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full hover:bg-white/5 transition-colors opacity-50 hover:opacity-100 ${getAccentColor()}`}
        >
            <Settings2 size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 z-10 pb-20">
        
        {showSettings ? (
            <div className="w-full animate-fade-in overflow-y-auto max-h-[80vh] no-scrollbar">
                <h2 className={`text-3xl font-light mb-12 text-center ${getAccentColor()}`}>Configuración</h2>
                
                <div className="mb-12">
                    <label className={`block text-xs font-medium mb-6 uppercase tracking-widest opacity-50 ${getAccentColor()}`}>
                        Tiempo de Estudio
                    </label>
                    <div className={`flex items-baseline justify-center gap-2 mb-8 ${getAccentColor()}`}>
                        <span className="text-6xl font-light">{baseFocusTime}</span>
                        <span className="text-xl opacity-50 font-light">min</span>
                    </div>
                    <input 
                        type="range" 
                        min="5" 
                        max="90" 
                        step="5"
                        value={baseFocusTime}
                        onChange={handleDurationChange}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-300"
                    />
                    <div className={`flex justify-between mt-4 text-xs opacity-30 ${getAccentColor()}`}>
                        <span>5m</span>
                        <span>90m</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <span className={`block text-xs uppercase tracking-wider opacity-40 mb-2 ${getAccentColor()}`}>Break Corto</span>
                        <span className={`text-xl font-light ${getAccentColor()}`}>{Math.floor(baseFocusTime * 0.2)}m</span>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <span className={`block text-xs uppercase tracking-wider opacity-40 mb-2 ${getAccentColor()}`}>Break Largo</span>
                        <span className={`text-xl font-light ${getAccentColor()}`}>{Math.floor(baseFocusTime * 0.6)}m</span>
                     </div>
                </div>

                {/* Install Button Logic */}
                {deferredPrompt ? (
                    <button 
                        onClick={handleInstallClick}
                        className={`w-full py-4 mb-4 bg-white text-black rounded-xl transition-all uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2`}
                    >
                        <Download size={16} />
                        Instalar App
                    </button>
                ) : (
                    // Manual Instructions
                    <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/5 text-left">
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 opacity-70 flex items-center gap-2 ${getAccentColor()}`}>
                            <Download size={12} />
                            ¿Cómo Instalar?
                        </h3>
                        {isIOS ? (
                             <p className={`text-xs opacity-60 leading-relaxed ${getAccentColor()}`}>
                                Para instalar en iPhone/iPad: toca el botón <span className="inline-flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded mx-1"><Share size={10} /> Compartir</span> en Safari y selecciona <span className="font-bold text-white/90">"Agregar al Inicio"</span>.
                            </p>
                        ) : (
                             <p className={`text-xs opacity-60 leading-relaxed ${getAccentColor()}`}>
                                Si el botón no aparece: toca los <span className="font-bold text-white/90">3 puntos</span> del menú de Chrome y elige <span className="font-bold text-white/90">"Instalar aplicación"</span>.
                            </p>
                        )}
                       
                    </div>
                )}

                <button 
                    onClick={() => {
                        setShowSettings(false);
                    }}
                    className={`w-full py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 ${getAccentColor()} rounded-xl transition-all uppercase tracking-widest text-xs font-bold`}
                >
                    Volver
                </button>
            </div>
        ) : (
            <>
                <TimerDisplay 
                    timeLeft={timeLeft} 
                    maxTime={maxTime} 
                    mode={mode}
                />
                
                <div className={`mt-16 text-sm font-medium tracking-[0.3em] uppercase opacity-40 ${getAccentColor()}`}>
                    {isFinished ? 'Completado' : getModeLabel()}
                </div>

                {/* Controls */}
                <div className="mt-12 flex items-center gap-12">
                    {!isFinished && (
                        <button 
                            onClick={resetSession}
                            className={`p-4 rounded-full hover:bg-white/5 transition-colors opacity-40 hover:opacity-100 ${getAccentColor()}`}
                            aria-label="Reiniciar Sesión"
                            title="Reiniciar toda la sesión"
                        >
                            <RotateCcw size={20} strokeWidth={1.5} />
                        </button>
                    )}
                    
                    <button 
                        onClick={toggleTimer}
                        className={`group relative flex items-center justify-center p-8 rounded-full border border-white/10 hover:border-white/30 transition-all active:scale-95 ${getAccentColor()}`}
                        aria-label={isActive ? "Pausar" : "Iniciar"}
                    >   
                        <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 transition-colors"></div>
                        {isFinished ? (
                             // Next icon
                            <Play size={32} fill="currentColor" className="ml-1 opacity-90" strokeWidth={0} />
                        ) : isActive ? (
                            <Pause size={32} fill="currentColor" className="opacity-90" strokeWidth={0} />
                        ) : (
                            <Play size={32} fill="currentColor" className="ml-1 opacity-90" strokeWidth={0} />
                        )}
                    </button>

                     {!isFinished && <div className="w-[52px]"></div>}
                </div>

                {/* Minimalist Session Indicators (Cycle) */}
                <div className="absolute bottom-12 flex gap-4 opacity-30">
                    {[0, 1, 2, 3].map((i) => (
                        <div 
                            key={i} 
                            className={`transition-all duration-700 rounded-full ${
                                (cycles % 4) > i 
                                    ? `w-1.5 h-1.5 ${getAccentColor().replace('text-', 'bg-')}` 
                                    : 'w-1.5 h-1.5 bg-white/20'
                            }`} 
                        />
                    ))}
                </div>

                {/* Total Time Counter (Bottom Left) */}
                <div className="absolute bottom-8 left-8 flex flex-col items-start gap-1 opacity-30">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${getAccentColor()}`}>Total</span>
                    <div className={`flex items-center gap-2 ${getAccentColor()}`}>
                        <Clock size={14} />
                        <span className="text-lg font-light tabular-nums">{getTotalStudyTime()}</span>
                    </div>
                </div>
            </>
        )}
      </main>
    </div>
  );
};

export default App;