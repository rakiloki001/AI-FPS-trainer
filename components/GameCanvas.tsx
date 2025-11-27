import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Target, GameStats, HandCursor } from '../types';
import { distance, randomRange } from '../utils/math';

interface GameCanvasProps {
  handCursor: React.MutableRefObject<HandCursor>;
  onGameOver: (stats: GameStats) => void;
  gameDuration?: number; // seconds
}

const TARGET_RADIUS_BASE = 40;
const CANVAS_WIDTH = 1280; // Internal resolution
const CANVAS_HEIGHT = 720;

const GameCanvas: React.FC<GameCanvasProps> = ({ handCursor, onGameOver, gameDuration = 30 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [timeLeft, setTimeLeft] = useState(gameDuration);

  // Game State Refs (Use refs for main loop to avoid re-renders)
  const targetsRef = useRef<Target[]>([]);
  const statsRef = useRef<GameStats>({
    score: 0,
    hits: 0,
    misses: 0,
    accuracy: 0,
    avgReactionTime: 0,
    bestStreak: 0
  });
  const gameStateRef = useRef({
    lastSpawn: 0,
    startTime: Date.now(),
    currentStreak: 0,
    reactionTimes: [] as number[],
    lastShotTime: 0,
    isPinchingPrevious: false,
    cursorX: CANVAS_WIDTH / 2,
    cursorY: CANVAS_HEIGHT / 2
  });

  // Sound effects (Simulated with Web Audio API for performance or simple Audio objects)
  const playSound = useCallback((type: 'hit' | 'miss') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  }, []);

  const spawnTarget = useCallback(() => {
    const margin = TARGET_RADIUS_BASE * 2;
    const newTarget: Target = {
      id: Date.now() + Math.random(),
      x: randomRange(margin, CANVAS_WIDTH - margin),
      y: randomRange(margin, CANVAS_HEIGHT - margin),
      radius: TARGET_RADIUS_BASE,
      spawnTime: Date.now(),
      lifeTime: 3000, // 3 seconds to hit
      isHit: false
    };
    targetsRef.current.push(newTarget);
  }, []);

  const update = useCallback((time: number) => {
    const state = gameStateRef.current;
    
    // 1. Update Cursor from Hand Tracking
    // Smooth the cursor movement slightly
    const rawX = handCursor.current.x * CANVAS_WIDTH;
    const rawY = handCursor.current.y * CANVAS_HEIGHT;
    
    // Simple Lerp for smoothness (0.2 factor)
    state.cursorX = state.cursorX + (rawX - state.cursorX) * 0.4;
    state.cursorY = state.cursorY + (rawY - state.cursorY) * 0.4;

    const isPinching = handCursor.current.isPinching;
    const didShoot = isPinching && !state.isPinchingPrevious;
    state.isPinchingPrevious = isPinching;

    // 2. Spawn Targets
    if (time - state.lastSpawn > 800) { // Spawn every 800ms
      spawnTarget();
      state.lastSpawn = time;
    }

    // 3. Check Collisions & Input
    const activeTargets = targetsRef.current.filter(t => !t.isHit && (time - t.spawnTime < t.lifeTime));
    
    if (didShoot) {
      let hitFound = false;
      // Check hits
      // Iterate backwards to hit top-most target first
      for (let i = activeTargets.length - 1; i >= 0; i--) {
        const target = activeTargets[i];
        const dist = distance(state.cursorX, state.cursorY, target.x, target.y);
        
        if (dist < target.radius) {
          // HIT!
          target.isHit = true;
          hitFound = true;
          playSound('hit');
          
          statsRef.current.score += 100 + (state.currentStreak * 10);
          statsRef.current.hits++;
          state.currentStreak++;
          if (state.currentStreak > statsRef.current.bestStreak) {
            statsRef.current.bestStreak = state.currentStreak;
          }

          const reaction = time - target.spawnTime;
          state.reactionTimes.push(reaction);
          break; // Only hit one target per shot
        }
      }

      if (!hitFound) {
        playSound('miss');
        statsRef.current.misses++;
        state.currentStreak = 0;
      }
    }

    // 4. Cleanup Targets (remove hit or expired)
    // We keep expired ones briefly for potential fade-out effects in draw, but logic-wise:
    targetsRef.current = targetsRef.current.filter(t => {
      const alive = (time - t.spawnTime < t.lifeTime) || t.isHit; // Keep hit ones for a frame to show explosion? 
      // Actually, let's just remove them instantly for this MVP loop or simple fade
      // If it expired naturally without hit, it's a "miss" technically if we want strict mode?
      // For now, only clicks count as misses to avoid frustration.
      return alive && !t.isHit;
    });

  }, [spawnTarget, handCursor, playSound]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid (Background aesthetics)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<=CANVAS_WIDTH; x+=80) { ctx.moveTo(x,0); ctx.lineTo(x, CANVAS_HEIGHT); }
    for(let y=0; y<=CANVAS_HEIGHT; y+=80) { ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH, y); }
    ctx.stroke();

    // Draw Targets
    const time = Date.now();
    targetsRef.current.forEach(target => {
      const age = time - target.spawnTime;
      const pulse = Math.sin(age * 0.01) * 5;
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner fill
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius - 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fill();
      
      // Center dot
      ctx.beginPath();
      ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // Draw Cursor
    const { cursorX, cursorY, isPinchingPrevious } = gameStateRef.current;
    
    ctx.beginPath();
    // Crosshair lines
    ctx.strokeStyle = isPinchingPrevious ? '#ff0055' : '#00ff66';
    ctx.lineWidth = 2;
    ctx.moveTo(cursorX - 15, cursorY);
    ctx.lineTo(cursorX + 15, cursorY);
    ctx.moveTo(cursorX, cursorY - 15);
    ctx.lineTo(cursorX, cursorY + 15);
    ctx.stroke();

    // Crosshair Circle
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 20, 0, Math.PI * 2);
    ctx.strokeStyle = isPinchingPrevious ? '#ff0055' : '#00ff66';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (isPinchingPrevious) {
        ctx.fillStyle = 'rgba(255, 0, 85, 0.5)';
        ctx.fill();
    }

  }, []);

  const tick = useCallback(() => {
    const time = Date.now();
    const elapsed = (time - gameStateRef.current.startTime) / 1000;
    const remaining = Math.max(0, gameDuration - elapsed);
    
    setTimeLeft(remaining);

    if (remaining <= 0) {
      // Game Over
      const totalShots = statsRef.current.hits + statsRef.current.misses;
      statsRef.current.accuracy = totalShots > 0 ? (statsRef.current.hits / totalShots) * 100 : 0;
      
      const totalReaction = gameStateRef.current.reactionTimes.reduce((a, b) => a + b, 0);
      statsRef.current.avgReactionTime = gameStateRef.current.reactionTimes.length > 0 
        ? totalReaction / gameStateRef.current.reactionTimes.length 
        : 0;

      onGameOver(statsRef.current);
      return; 
    }

    update(time);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(tick);
  }, [gameDuration, onGameOver, update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
      {/* HUD Layer */}
      <div className="absolute top-4 left-4 right-4 flex justify-between text-cyan-400 font-display z-10 pointer-events-none select-none">
        <div className="text-2xl">SCORE: {statsRef.current.score}</div>
        <div className={`text-4xl font-bold ${timeLeft < 5 ? 'text-red-500 animate-pulse' : ''}`}>
          {timeLeft.toFixed(1)}s
        </div>
        <div className="text-2xl">STREAK: {gameStateRef.current.currentStreak}</div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain border border-cyan-900/50 shadow-[0_0_30px_rgba(0,255,255,0.1)] bg-black/80"
      />
    </div>
  );
};

export default GameCanvas;
