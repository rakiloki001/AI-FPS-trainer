import React, { useState, useRef, useEffect } from 'react';
import { GameState, GameStats, HandCursor } from './types';
import HandTracker from './components/HandTracker';
import GameCanvas from './components/GameCanvas';
import { getCoachFeedback } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Crosshair, Trophy, Activity, Zap, Play, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [stats, setStats] = useState<GameStats | null>(null);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  
  // Hand cursor shared ref
  const cursorRef = useRef<HandCursor>({ x: 0.5, y: 0.5, isPinching: false });

  const handleCursorUpdate = (cursor: HandCursor) => {
    cursorRef.current = cursor;
  };

  const startGame = () => {
    setGameState('playing');
    setStats(null);
    setAiFeedback(null);
  };

  const handleGameOver = async (finalStats: GameStats) => {
    setStats(finalStats);
    setGameState('summary');
    
    // Fetch AI Feedback
    setIsLoadingFeedback(true);
    const feedback = await getCoachFeedback(finalStats);
    setAiFeedback(feedback);
    setIsLoadingFeedback(false);
  };

  return (
    <div className="w-full h-screen bg-neutral-950 text-white overflow-hidden relative font-sans selection:bg-cyan-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#111827_0%,_#000000_100%)] -z-10"></div>
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Always run tracker in bg when app is loaded, but maybe hide UI in menu? 
          Actually, keeping it visible helps user verify camera working. */}
      <HandTracker onCursorUpdate={handleCursorUpdate} />

      {/* Main Content Router */}
      {gameState === 'menu' && (
        <div className="flex flex-col items-center justify-center h-full z-10 animate-fade-in space-y-8">
           <div className="text-center space-y-2">
             <h1 className="text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
               NEON SIGHT
             </h1>
             <p className="text-cyan-200/60 font-mono text-lg tracking-widest uppercase">
               Neural Link Initiated // Gesture Control Active
             </p>
           </div>
           
           <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                   <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                     <span className="font-bold">1</span>
                   </div>
                   <p>Raise your hand to move the cursor.</p>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                   <div className="w-8 h-8 rounded-full bg-pink-900/50 flex items-center justify-center border border-pink-500/30">
                     <span className="font-bold">2</span>
                   </div>
                   <p>Pinch index & thumb to shoot.</p>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group mt-8 w-full relative overflow-hidden rounded-lg bg-cyan-600 p-4 text-center font-bold text-white transition-transform active:scale-95 hover:bg-cyan-500"
              >
                <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]"></div>
                <span className="flex items-center justify-center gap-2 text-xl font-display uppercase tracking-widest">
                  <Play size={24} fill="currentColor" /> Initialize Sim
                </span>
              </button>
           </div>
        </div>
      )}

      {gameState === 'playing' && (
        <GameCanvas 
          handCursor={cursorRef} 
          onGameOver={handleGameOver} 
          gameDuration={30} // 30 second rounds
        />
      )}

      {gameState === 'summary' && stats && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Col: Stats */}
            <div className="space-y-6">
              <h2 className="text-4xl font-display font-bold text-white mb-8 border-l-4 border-cyan-500 pl-4">
                MISSION DEBRIEF
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Trophy className="text-yellow-400" />} label="Score" value={stats.score} />
                <StatCard icon={<Crosshair className="text-red-400" />} label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
                <StatCard icon={<Activity className="text-green-400" />} label="Hits / Misses" value={`${stats.hits} / ${stats.misses}`} />
                <StatCard icon={<Zap className="text-blue-400" />} label="Reaction" value={`${stats.avgReactionTime.toFixed(0)} ms`} />
              </div>

              <div className="h-64 bg-gray-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-wider">Performance Metrics</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Hits', val: stats.hits, fill: '#06b6d4' },
                      { name: 'Misses', val: stats.misses, fill: '#ef4444' },
                      { name: 'Streak', val: stats.bestStreak, fill: '#eab308' },
                    ]}>
                      <XAxis dataKey="name" tick={{fill:'#666', fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px'}}
                        itemStyle={{color: '#fff'}}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      <Bar dataKey="val" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
            </div>

            {/* Right Col: AI Coach */}
            <div className="flex flex-col space-y-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-1 border border-cyan-500/20 shadow-2xl h-full flex flex-col">
                <div className="bg-black/40 p-4 rounded-t-xl flex items-center justify-between border-b border-white/5">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     <span className="font-mono text-sm text-cyan-400">AI COMMANDER LINK</span>
                   </div>
                   <div className="text-xs text-gray-500 font-mono">GEMINI-2.5-FLASH</div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-center">
                  {isLoadingFeedback ? (
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-mono text-sm animate-pulse">Analyzing tactical data...</p>
                    </div>
                  ) : aiFeedback ? (
                    <div className="space-y-6 animate-fade-in-up">
                      <div className="flex items-center justify-between">
                         <h3 className="text-2xl font-bold text-white">{aiFeedback.rank}</h3>
                         <span className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded border border-cyan-500/30 font-mono">RANK ASSIGNED</span>
                      </div>
                      
                      <div className="p-4 bg-cyan-900/10 border-l-2 border-cyan-500 rounded-r-lg">
                        <p className="italic text-gray-300">"{aiFeedback.summary}"</p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Tactical Recommendations</h4>
                        <ul className="space-y-2">
                          {aiFeedback.tips.map((tip: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0"></span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-red-400">
                      Connection to HQ lost. Cannot retrieve analysis.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4">
                 <button 
                  onClick={startGame}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white p-4 rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                 >
                   <RotateCcw size={20} /> Retry Mission
                 </button>
                 <button 
                  onClick={() => setGameState('menu')}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-4 rounded-xl font-bold uppercase tracking-wider transition-colors"
                 >
                   Main Menu
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{icon: React.ReactNode, label: string, value: string | number}> = ({ icon, label, value }) => (
  <div className="bg-gray-800/40 p-4 rounded-xl border border-white/5 flex items-center space-x-4">
    <div className="p-3 bg-black/30 rounded-lg">{icon}</div>
    <div>
      <p className="text-xs text-gray-400 font-mono uppercase">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
    </div>
  </div>
);

export default App;
