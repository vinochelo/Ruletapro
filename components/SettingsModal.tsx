import React, { useState } from 'react';
import { Category } from '../types';
import { generateNewCategories, generateMoreWords, generateCategoryFromTopic } from '../services/geminiService';
import { Plus, Sparkles, Trash2, X, Search } from 'lucide-react';

interface SettingsModalProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ categories, setCategories, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [loadingWordFor, setLoadingWordFor] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loadingCustom, setLoadingCustom] = useState(false);

  const handleGenerateCategories = async () => {
    setLoading(true);
    const existingNames = categories.map(c => c.name);
    const newCats = await generateNewCategories(existingNames);
    setCategories([...categories, ...newCats]);
    setLoading(false);
  };

  const handleCustomCategory = async () => {
    if (!customTopic.trim()) return;
    setLoadingCustom(true);
    const newCat = await generateCategoryFromTopic(customTopic);
    if (newCat) {
      setCategories([...categories, newCat]);
      setCustomTopic('');
    }
    setLoadingCustom(false);
  };

  const handleAddWords = async (catId: string, catName: string, currentWords: string[]) => {
    setLoadingWordFor(catId);
    const newWords = await generateMoreWords(catName, currentWords);
    
    setCategories(prev => prev.map(c => {
      if (c.id === catId) {
        return { ...c, words: [...c.words, ...newWords] };
      }
      return c;
    }));
    setLoadingWordFor(null);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const deleteWord = (catId: string, wordToDelete: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id === catId) {
        return { ...c, words: c.words.filter(w => w !== wordToDelete) };
      }
      return c;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Sparkles className="text-purple-600" /> Configuración de Categorías
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-100">
          
          {/* Custom Topic Generator */}
          <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-semibold mb-2 text-slate-600">Crear Categoría Específica</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ej: Star Wars, Comida Italiana, Superhéroes..."
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCustomCategory()}
              />
              <button 
                onClick={handleCustomCategory}
                disabled={loadingCustom || !customTopic}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingCustom ? <span className="animate-spin">✨</span> : <Search size={18} />}
                {loadingCustom ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-lg text-slate-700">Categorías Activas</h3>
             <button 
                onClick={handleGenerateCategories}
                disabled={loading}
                className="text-sm px-4 py-2 rounded-lg border border-dashed border-purple-400 text-purple-600 hover:bg-purple-50 font-semibold flex items-center gap-2"
              >
                {loading ? 'Pensando...' : 'Sugerir al Azar (IA)'} <Plus size={16} />
              </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-all" style={{ borderLeftColor: cat.color }}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-xl text-slate-800">{cat.name}</h4>
                  <div className="flex gap-2">
                     <button 
                      onClick={() => handleAddWords(cat.id, cat.name, cat.words)}
                      disabled={loadingWordFor === cat.id}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-bold border border-blue-200"
                    >
                      {loadingWordFor === cat.id ? 'Generando...' : '+ IA'}
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {cat.words.map((w, i) => (
                    <span key={i} className="group text-sm bg-slate-50 pl-3 pr-1 py-1 rounded-full text-slate-700 border border-slate-200 flex items-center gap-1 hover:border-red-300 hover:bg-red-50 transition-colors">
                      {w}
                      <button 
                        onClick={() => deleteWord(cat.id, w)}
                        className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100"
                        title="Eliminar palabra"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                  {cat.words.length === 0 && <span className="text-slate-400 italic text-sm">Sin palabras</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;