import React, { useState, useEffect } from 'react';
import { NarratorStyle, TurnData } from '../types';
import { playTick, playTone } from '../utils/audio';
import { generateSketch, speakText } from '../services/geminiService';
import { Timer, Wand2, XCircle, Play } from 'lucide-react';

interface GameCardProps {
  turnData: TurnData;
  narratorStyle: NarratorStyle;
  onClose: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ turnData, narratorStyle, onClose }) => {
  const [timeLeft, setTimeLeft] = useState<number>(turnData.duration);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [isActive, setIsActive] = useState(false); // Manual start
  
  // Announce category on mount
  useEffect(() => {
    speakText(`La categoría es: ${turnData.category.name}`, narratorStyle);
  }, [turnData.category.name, narratorStyle]);

  // Timer logic
  useEffect(() => {
    let interval: number;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          
          if (next <= 10 && next > 0) {
             playTick();
          } else if (next === 0) {
             // Strong Buzzer Tone for end
             playTone(150, 'sawtooth', 1.0); 
             // Speak result
             speakText(`¡Tiempo fuera! La palabra era: ${turnData.word}`, narratorStyle);
          }

          return next;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, turnData.word, narratorStyle]);

  const handleGenerateSketch = async () => {
    setLoadingImage(true);
    const img = await generateSketch(turnData.word);
    setGeneratedImage(img);
    setLoadingImage(false);
  };

  const isUrgent = timeLeft <= 10;
  const isFinished = timeLeft === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-4">
      {/* Container restricted to max height of screen to prevent scrolling the page body, layout uses flex-col */}
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-full max-h-[95vh] flex flex-col overflow-hidden border-8 transition-colors duration-500 ${isUrgent && !isFinished ? 'border-red-500' : 'border-white'}`}>
        
        {/* Header - Compact */}
        <div className="bg-slate-100 p-4 text-center border-b border-slate-200 shrink-0">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold mb-1 block">Categoría</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight truncate" style={{ color: turnData.category.color || '#333' }}>
            {turnData.category.name}
          </h2>
        </div>

        {/* Scrollable Middle Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col items-center justify-start gap-4">
          
          {/* Timer & Controls */}
          <div className="flex flex-col items-center justify-center shrink-0">
             {!isActive && !isFinished && timeLeft === turnData.duration && (
               <button 
                 onClick={() => setIsActive(true)}
                 className="mb-2 px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-lg shadow-lg flex items-center gap-2 animate-bounce"
               >
                 <Play fill="currentColor" size={20} /> Comenzar Tiempo
               </button>
             )}

             <div className={`text-8xl md:text-9xl leading-none font-black font-mono tabular-nums transition-all duration-300 ${
               isUrgent && !isFinished ? 'text-red-600 scale-110' : 'text-slate-800'
             } ${isFinished ? 'text-slate-300' : ''}`}>
               {timeLeft}
             </div>
             
             {isUrgent && !isFinished && <p className="text-red-500 font-bold text-lg animate-pulse mt-1">¡TIEMPO!</p>}
             {isFinished && <div className="bg-red-100 text-red-600 px-6 py-2 rounded-full font-bold mt-2">TIEMPO AGOTADO</div>}
          </div>

          {/* Word Display */}
          <div className={`text-center w-full max-w-lg rounded-2xl p-4 border transition-all shrink-0 ${isFinished ? 'bg-yellow-100 border-yellow-400 scale-105 shadow-xl' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-slate-400 mb-1 uppercase tracking-widest text-[10px] font-bold">
              {isFinished ? 'La palabra era:' : 'Palabra a Dibujar'}
            </p>
            <div className={`text-3xl md:text-5xl font-black ${isFinished ? 'text-slate-900' : 'text-slate-800'}`}>
              {turnData.word}
            </div>
          </div>

          {/* AI Hint Section - Always Visible if Generated */}
          {(generatedImage || !isFinished) && (
            <div className="w-full flex justify-center py-2 shrink-0 pb-4">
               {generatedImage ? (
                  <div className="relative group w-full max-w-sm">
                    <img src={generatedImage} alt="AI Hint" className="w-full h-auto max-h-[250px] object-contain rounded-lg border-2 border-slate-200 shadow-lg bg-white" />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-medium">Boceto generado por IA</span>
                  </div>
               ) : (
                  !isFinished && (
                    <button 
                      onClick={handleGenerateSketch}
                      disabled={loadingImage}
                      className="flex items-center gap-2 px-5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full font-bold transition-colors text-sm"
                    >
                      {loadingImage ? <span className="animate-spin">✨</span> : <Wand2 className="w-4 h-4" />}
                      {loadingImage ? 'Dibujando...' : 'Pedir ayuda a la IA (Boceto)'}
                    </button>
                  )
               )}
            </div>
          )}
        </div>

        {/* Footer Actions - Always docked at bottom */}
        <div className="p-4 border-t border-slate-100 flex justify-center bg-white shrink-0">
          <button 
            onClick={onClose}
            className="w-full max-w-xs px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <XCircle size={24} />
            {isFinished ? 'Cerrar / Siguiente Ronda' : 'Cancelar Ronda'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GameCard;