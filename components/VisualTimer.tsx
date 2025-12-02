import React, { useRef, useEffect, useMemo } from 'react';
import { TimerMode } from '../types';

interface VisualTimerProps {
  timeLeft: number;
  maxTime: number;
  mode: TimerMode;
  isActive: boolean;
}

export const VisualTimer: React.FC<VisualTimerProps> = ({ timeLeft, maxTime, mode, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Color configuration
  const colors = useMemo(() => {
    switch (mode) {
      case TimerMode.FOCUS: return ['#ffffff', '#52525b']; // White / Zinc-600
      case TimerMode.SHORT_BREAK: return ['#5eead4', '#115e59']; // Teal-300 / Teal-800
      case TimerMode.LONG_BREAK: return ['#a5b4fc', '#3730a3']; // Indigo-300 / Indigo-800
      default: return ['#ffffff', '#a1a1aa'];
    }
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Wave drawing helper
    const drawWave = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      radius: number,
      level: number, // 0 to 1 (0 = bottom, 1 = top)
      time: number,
      amplitude: number,
      frequency: number,
      phase: number,
      color: string
    ) => {
      ctx.fillStyle = color;
      ctx.beginPath();

      // The water level Y coordinate (inverted because Y grows downwards)
      // Level 0 -> y = cy + radius
      // Level 1 -> y = cy - radius
      const waterY = (cy + radius) - (level * (radius * 2));

      // Draw the wave across the width of the bounding box
      const startX = cx - radius;
      const endX = cx + radius;
      const step = 2; // Pixel step for smoothness

      ctx.moveTo(startX, cy + radius); // Bottom left corner

      for (let x = startX; x <= endX; x += step) {
        // Calculate Y based on sine wave
        // We modulate amplitude based on how close we are to the center to keep it contained roughly
        const distance = x - startX;
        const wave = Math.sin((distance * frequency) + time + phase) * amplitude;
        
        // Damping the wave at the very top and bottom to avoid clipping weirdness
        // (Optional, but makes it look cleaner when full/empty)
        let y = waterY + wave;
        
        ctx.lineTo(x, y);
      }

      ctx.lineTo(endX, cy + radius); // Bottom right corner
      ctx.lineTo(startX, cy + radius); // Close loop
      ctx.fill();
    };

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.45; // Size of the container

      // Physics params
      timeRef.current += isActive ? 0.05 : 0.02; // Faster waves when active
      const amplitude = isActive ? 8 : 4; 
      
      // Calculate Progress (Filling Up)
      // If timeLeft = maxTime, progress = 0 (Empty)
      // If timeLeft = 0, progress = 1 (Full)
      const progress = 1 - (timeLeft / maxTime);
      
      // Smooth interpolation for visual level could be added here, 
      // but direct mapping feels more responsive for a timer.

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Container Ring (The Glass)
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // 2. Create Circular Mask for the Liquid
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip(); // Everything drawn after this stays inside the circle

      // 3. Draw Background Liquid (Darker/Back wave)
      drawWave(
        ctx, cx, cy, radius,
        progress,
        timeRef.current,
        amplitude * 0.8,
        0.02, // Frequency
        0,    // Phase
        colors[1] // Secondary color
      );

      // 4. Draw Foreground Liquid (Brighter/Front wave)
      drawWave(
        ctx, cx, cy, radius,
        progress,
        timeRef.current,
        amplitude,
        0.025, // Slightly different frequency
        2,     // Phase offset
        colors[0] // Primary color
      );

      ctx.restore(); // Remove clip

      // 5. Optional: Progress Text/Percentage inside if desired? 
      // For now, keeping it purely visual minimal as requested.

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [timeLeft, maxTime, isActive, colors]);

  return (
    <div ref={containerRef} className="w-full h-64 md:h-96 flex items-center justify-center animate-fade-in select-none pointer-events-none">
        <canvas ref={canvasRef} />
    </div>
  );
};