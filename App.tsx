import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, Participant, Category, TurnData, ParticipantType, NarratorStyle } from './types';
import Wheel from './components/Wheel';
import Scoreboard from './components/Scoreboard';
import SettingsModal from './components/SettingsModal';
import GameCard from './components/GameCard';
import { generateCommentary, speakText, stopAudio } from './services/geminiService';
import { Settings, Users, User, Play, RotateCcw, PenTool, Mic, Radio } from 'lucide-react';

// Default Data
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Acciones', color: '#EF476F', words: ['Saltar', 'Correr', 'Dormir', 'Llorar', 'Reír', 'Bailar', 'Nadar'] },
  { id: '2', name: 'Objetos', color: '#118AB2', words: ['Silla', 'Portátil', 'Plátano', 'Espada', 'Taza', 'Coche'] },
  { id: '3', name: 'Animales', color: '#FFD166', words: ['León', 'Elefante', 'Gato', 'Perro', 'Jirafa', 'Pingüino'] },
  { id: '4', name: 'Difícil', color: '#06D6A0', words: ['Filosofía', 'Gravedad', 'Internet', 'Sueño', 'Viento', 'Alma'] },
  { id: '5', name: 'Películas', color: '#9D4EDD', words: ['Titanic', 'Avatar', 'Shrek', 'Matrix', 'Coco'] },
  { id: '6', name: 'Comida', color: '#FF9F1C', words: ['Pizza', 'Sushi', 'Taco', 'Hamburguesa', 'Paella'] },
];

// Helper to get local storage
const getSavedSettings = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('pictio_settings_v1');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error("Error loading settings", e);
    return {};
  }
};

const NARRATOR_LABELS: Record<NarratorStyle, string> = {
    'DOCUMENTARY': 'Documentalista',
    'SPORTS': 'Deportivo',
    'GRANNY': 'Abuelita',
    'GEN_Z': 'Gen Z',
    'ROBOT': 'Robot',
    'SARCASTIC': 'Sarcástico',
    'POET': 'Poeta'
};

function App() {
  const savedSettings = getSavedSettings();

  // Game State
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const gameSessionRef = useRef<number>(Date.now()); // Tracks the current game session
  const winLockRef = useRef<boolean>(false); // Prevents multiple API calls for the same win
  
  // Initialize from storage or defaults
  const [participants, setParticipants] = useState<Participant[]>(savedSettings.participants || []);
  
  // Category Persistence Logic
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCats = localStorage.getItem('pictio_categories_v1');
      return savedCats ? JSON.parse(savedCats) : DEFAULT_CATEGORIES;
    }
    return DEFAULT_CATEGORIES;
  });

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [turnData, setTurnData] = useState<TurnData | null>(null);
  
  // UI State
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [winCommentary, setWinCommentary] = useState<string | null>(null);
  
  const [winningScore, setWinningScore] = useState(savedSettings.winningScore || 20);
  const [timerDuration, setTimerDuration] = useState<30 | 60 | 90 | 120>(savedSettings.timerDuration || 60);

  // Setup Inputs
  const [newPlayerName, setNewPlayerName] = useState('');
  const [mode, setMode] = useState<ParticipantType>(savedSettings.mode || 'INDIVIDUAL');
  const [narratorStyle, setNarratorStyle] = useState<NarratorStyle>(savedSettings.narratorStyle || 'DOCUMENTARY');

  // Persistence Effects
  useEffect(() => {
    const settings = {
      participants,
      winningScore,
      timerDuration,
      mode,
      narratorStyle
    };
    localStorage.setItem('pictio_settings_v1', JSON.stringify(settings));
  }, [participants, winningScore, timerDuration, mode, narratorStyle]);

  useEffect(() => {
    localStorage.setItem('pictio_categories_v1', JSON.stringify(categories));
  }, [categories]);

  // Trigger TTS when notification changes
  useEffect(() => {
    if (notification) {
      speakText(notification, narratorStyle);
    }
  }, [notification, narratorStyle]);

  // Trigger TTS when win commentary changes
  useEffect(() => {
    if (winCommentary) {
      speakText(winCommentary, narratorStyle);
    }
  }, [winCommentary, narratorStyle]);

  const addParticipant = () => {
    if (!newPlayerName.trim()) return;
    setParticipants([...participants, {
      id: Date.now().toString() + Math.random(),
      name: newPlayerName,
      score: 0
    }]);
    setNewPlayerName('');
  };

  const startGame = () => {
    if (participants.length < 2) return alert("¡Se necesitan al menos 2 jugadores/equipos!");
    setDrawerId(participants[0].id); // Default to first player
    gameSessionRef.current = Date.now(); // Start new session ID
    setPhase('SPIN');
  };

  const handleSpin = () => {
    if (isSpinning) return;
    if (!drawerId) {
      alert("¡Por favor selecciona quién va a dibujar en el marcador!");
      return;
    }
    setIsSpinning(true);
  };

  const onSpinEnd = (category: Category) => {
    setIsSpinning(false);
    
    // Pick random word
    const randomWord = category.words[Math.floor(Math.random() * category.words.length)];
    
    if (!drawerId) return;

    setTurnData({
      participantId: drawerId,
      category,
      word: randomWord,
      duration: timerDuration
    });
    
    setTimeout(() => setPhase('PLAY'), 1000);
  };

  const updateScore = (participantId: string, delta: number) => {
    // 1. Optimistic Update (Immediate UI response)
    let updatedParticipants = [...participants];
    const playerIndex = participants.findIndex(p => p.id === participantId);
    if (playerIndex === -1) return;

    const oldScore = updatedParticipants[playerIndex].score;
    const newScore = Math.max(0, oldScore + delta);
    
    updatedParticipants[playerIndex].score = newScore;
    setParticipants(updatedParticipants);

    // 2. Logic Check
    if (delta > 0) {
      const currentSessionId = gameSessionRef.current; // Capture current session
      
      // Check for Game Winner
      if (newScore >= winningScore) {
        // CRITICAL FIX: Check if we already processed the win to avoid double AI calls
        if (winLockRef.current) return;
        
        winLockRef.current = true; // Lock immediately
        setPhase('WINNER');
        
        // Async call for commentary
        generateCommentary(participants[playerIndex].name, newScore, true, narratorStyle)
          .then(commentary => {
             // Only update if we are still in the same game session
             if (gameSessionRef.current === currentSessionId) {
                setWinCommentary(commentary);
             }
          });
        return;
      }

      // Check for Leader Notification every 5 total points
      const totalPoints = updatedParticipants.reduce((sum, p) => sum + p.score, 0);
      
      if (totalPoints > 0 && totalPoints % 5 === 0) {
        const leader = [...updatedParticipants].sort((a, b) => b.score - a.score)[0];
        
        // Async call for commentary
        generateCommentary(leader.name, leader.score, false, narratorStyle)
          .then(commentary => {
             if (gameSessionRef.current === currentSessionId) {
                setNotification(commentary);
                setTimeout(() => {
                   // Ensure we don't clear someone else's notification if session changed (unlikely for timeout but good practice)
                   if (gameSessionRef.current === currentSessionId) {
                      setNotification(null);
                   }
                }, 8000);
             }
          });
      }
    }
  };

  const handleCardClose = () => {
    setTurnData(null);
    setPhase('SPIN');
  };

  const resetGame = () => {
    // REMOVED: stopAudio(); -> Allowing audio to continue in background while setting up new game.
    gameSessionRef.current = Date.now(); // Invalidate any pending async commentaries from previous game
    winLockRef.current = false; // Release the win lock for the new game

    setPhase('SETUP');
    // Reset scores but keep players for better UX with persistence
    setParticipants(participants.map(p => ({ ...p, score: 0 })));
    setWinCommentary(null);
    setNotification(null);
  };

  // Render Setup
  if (phase === 'SETUP') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 overflow-y-auto max-h-[95vh]">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text mb-2">
              PictioRoulette
            </h1>
            <p className="text-slate-500 font-medium">Edición IA</p>
          </div>
          
          <div className="space-y-6">
            
            {/* Narrator Selection */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-purple-700 flex items-center gap-2">
                 <Mic size={14} /> Estilo del Narrador (IA)
              </label>
              <select 
                value={narratorStyle}
                onChange={(e) => setNarratorStyle(e.target.value as NarratorStyle)}
                className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="DOCUMENTARY">Documentalista (Morgan Freeman)</option>
                <option value="SPORTS">Comentarista Deportivo (Eufórico)</option>
                <option value="GRANNY">Abuela Cariñosa</option>
                <option value="GEN_Z">Gen Z (Streamer)</option>
                <option value="ROBOT">Robot Futurista</option>
                <option value="SARCASTIC">Comediante Sarcástico</option>
                <option value="POET">Poeta Dramático</option>
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <label className="block text-xs uppercase tracking-wider font-bold mb-3 text-slate-500">Modo de Juego</label>
              <div className="flex bg-slate-200 rounded-lg p-1">
                <button 
                  onClick={() => setMode('INDIVIDUAL')}
                  className={`flex-1 py-2 rounded-md transition-all font-semibold ${mode === 'INDIVIDUAL' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <User className="inline w-4 h-4 mr-1" /> Individual
                </button>
                <button 
                  onClick={() => setMode('TEAM')}
                  className={`flex-1 py-2 rounded-md transition-all font-semibold ${mode === 'TEAM' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Users className="inline w-4 h-4 mr-1" /> Equipos
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">
                {mode === 'INDIVIDUAL' ? 'Jugadores' : 'Equipos'}
              </label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                  className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder={mode === 'INDIVIDUAL' ? "Nombre Jugador" : "Nombre Equipo"}
                />
                <button 
                  onClick={addParticipant}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all hover:scale-105"
                >
                  Añadir
                </button>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {participants.length === 0 && <p className="text-center text-slate-400 italic py-2">Sin participantes aún</p>}
                {participants.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">{p.name}</span>
                    <button 
                      onClick={() => setParticipants(participants.filter(x => x.id !== p.id))}
                      className="text-red-400 hover:text-red-600 text-sm font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Meta (Puntos)</label>
                <select 
                    value={winningScore} 
                    onChange={(e) => setWinningScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-700"
                  >
                    <option value={5}>5 Puntos</option>
                    <option value={10}>10 Puntos</option>
                    <option value={15}>15 Puntos</option>
                    <option value={20}>20 Puntos</option>
                    <option value={25}>25 Puntos</option>
                    <option value={30}>30 Puntos</option>
                  </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Tiempo</label>
                <select 
                  value={timerDuration} 
                  onChange={(e) => setTimerDuration(Number(e.target.value) as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-700"
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                </select>
              </div>
            </div>

            <button 
              onClick={startGame}
              disabled={participants.length < 2}
              className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transform transition-all ${participants.length < 2 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 text-white'}`}
            >
              <Play fill="currentColor" /> ¡JUGAR!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Layout
  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch p-4 gap-4 max-w-[1600px] mx-auto bg-slate-50/50 overflow-hidden">
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          categories={categories} 
          setCategories={setCategories} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-bounce w-full max-w-lg px-4 pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-full font-bold shadow-2xl flex items-center justify-center gap-3 text-lg border-2 border-white text-center">
             🎙️ "{notification}"
          </div>
        </div>
      )}

      {/* Play Mode */}
      {phase === 'PLAY' && turnData && (
        <GameCard 
          turnData={turnData}
          onClose={handleCardClose}
          narratorStyle={narratorStyle}
        />
      )}

      {/* Winner Mode */}
      {phase === 'WINNER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-md overflow-hidden">
          <div className="text-center p-8 max-w-2xl w-full flex flex-col max-h-screen">
            <h1 className="text-5xl md:text-7xl font-black text-yellow-500 mb-6 drop-shadow-sm animate-pulse shrink-0">¡VICTORIA!</h1>
            <div className="text-3xl md:text-5xl text-slate-800 font-bold mb-8 shrink-0">
              {/* FIX: Use a safe copy of participants to sort, avoiding in-place mutation of state during render */}
              ¡{[...participants].sort((a,b) => b.score - a.score)[0]?.name} es el campeón!
            </div>
            
            {/* Scrollable text container to prevent clipping on small screens or with long text */}
            <div className="bg-purple-100 p-6 md:p-8 rounded-3xl max-w-lg mx-auto mb-10 border-4 border-purple-200 shadow-xl overflow-y-auto max-h-[40vh] custom-scrollbar">
              <p className="text-xl md:text-2xl italic text-purple-800 font-serif leading-relaxed">"{winCommentary || '...'}"</p>
            </div>
            
            <button 
              onClick={resetGame}
              className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full hover:scale-110 transition-transform flex items-center gap-3 mx-auto shadow-2xl text-xl shrink-0"
            >
              <RotateCcw size={24} /> Jugar de Nuevo
            </button>
          </div>
        </div>
      )}

      {/* Left Column: Wheel Area */}
      <div className="flex-[2] flex flex-col items-center justify-center relative bg-white/40 rounded-3xl border border-slate-100 shadow-sm p-4">
        
        {/* Active Narrator Badge */}
        <div className="absolute top-4 left-4 z-30">
           <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-slate-500">
              <Radio className="w-3 h-3 text-red-500 animate-pulse" />
              <span>Narrador: {NARRATOR_LABELS[narratorStyle]}</span>
           </div>
        </div>

        {/* Settings Button */}
        <div className="absolute top-4 right-4 z-30">
           <button 
            onClick={() => setShowSettings(true)}
            className="p-3 bg-white hover:bg-slate-50 rounded-full transition-colors shadow-sm border border-slate-200 text-slate-600"
            title="Gestionar Categorías"
           >
             <Settings className="w-6 h-6" />
           </button>
        </div>

        {/* Wheel Container */}
        <div className="w-full h-full flex items-center justify-center">
           <Wheel 
             categories={categories} 
             isSpinning={isSpinning} 
             onSpinEnd={onSpinEnd}
             onSpinClick={handleSpin}
           />
        </div>
        
        {!isSpinning && (
          <p className="absolute bottom-8 text-slate-400 text-sm font-medium animate-pulse">
            Toca la ruleta para girar
          </p>
        )}
      </div>

      {/* Right Column: Scoreboard */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full">
        <Scoreboard 
          participants={participants} 
          drawerId={drawerId} 
          onAdjustScore={updateScore}
          onSetDrawer={setDrawerId}
        />
      </div>
    </div>
  );
}

export default App;