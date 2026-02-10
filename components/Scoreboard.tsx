import React from 'react';
import { Participant } from '../types';
import { Trophy, Plus, Minus } from 'lucide-react';

interface ScoreboardProps {
  participants: Participant[];
  drawerId: string | null;
  onAdjustScore: (id: string, delta: number) => void;
  onSetDrawer: (id: string) => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ participants, drawerId, onAdjustScore, onSetDrawer }) => {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white rounded-2xl p-4 w-full md:w-80 flex flex-col gap-2 shadow-xl border border-slate-200 h-full max-h-[calc(100vh-2rem)]">
      <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 pb-2 text-slate-800 shrink-0">
        <Trophy className="text-yellow-500 w-5 h-5" /> Marcador
      </h3>
      <p className="text-[10px] text-slate-400 text-center shrink-0">Toca un nombre para que dibuje</p>
      
      <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
        {sorted.map((p, idx) => {
          const isDrawer = p.id === drawerId;
          return (
            <div 
              key={p.id}
              className={`flex items-center justify-between p-2 rounded-xl transition-all border-2 ${
                isDrawer 
                  ? 'bg-purple-50 border-purple-500 shadow-sm' 
                  : 'bg-slate-50 border-transparent hover:border-slate-200'
              }`}
            >
              {/* Rank & Name Section - Clickable to set drawer */}
              <div 
                className="flex items-center gap-2 flex-1 cursor-pointer group"
                onClick={() => onSetDrawer(p.id)}
                title="Tocar para que este jugador dibuje"
              >
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-200 text-slate-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className={`font-bold text-sm truncate ${isDrawer ? 'text-purple-700' : 'text-slate-700'} group-hover:text-purple-600`}>
                      {p.name}
                  </span>
                  {isDrawer && <span className="text-[9px] uppercase font-bold text-purple-500 tracking-wider">Dibujando</span>}
                </div>
              </div>

              {/* Score Controls */}
              <div className="flex items-center gap-2">
                 <button 
                    onClick={() => onAdjustScore(p.id, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm"
                    title="Restar"
                >
                    <Minus size={18} strokeWidth={3} />
                </button>
                
                <span className="text-4xl font-black font-mono text-slate-800 w-12 text-center tracking-tighter">
                  {p.score}
                </span>

                <button 
                    onClick={() => onAdjustScore(p.id, 1)}
                    className="w-10 h-10 flex items-center justify-center bg-green-500 border border-green-600 rounded-lg text-white hover:bg-green-600 transition-all shadow-md active:scale-95"
                    title="Sumar"
                >
                    <Plus size={24} strokeWidth={4} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scoreboard;