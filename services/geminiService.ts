import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, NarratorStyle } from "../types";

// --- API KEY ROTATION LOGIC ---
const getApiKeys = () => {
  let keysString = '';
  
  try {
    // Attempt to access import.meta.env.VITE_API_KEY safely.
    // In a proper Vite build, this string is statically replaced.
    // We access it directly to ensure replacement works.
    // The optional chaining (?.) prevents crash if import.meta.env is missing at runtime (e.g. unit tests or bad builds).
    keysString = import.meta.env?.VITE_API_KEY || '';
  } catch (e) {
    console.error("Environment variable access failed:", e);
    // Fallback for safety
    keysString = '';
  }

  const keyList = keysString.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keyList.length === 0) {
    console.error("❌ NO API KEYS FOUND. Ensure VITE_API_KEY is set in Vercel/Environment settings.");
  } else {
    console.log(`✅ Loaded ${keyList.length} API Key(s)`);
  }
  
  return keyList;
};

const allApiKeys = getApiKeys();
let currentKeyIndex = 0;
// Initialize securely, fallback to empty string or dummy to prevent crash, but warn user
let ai = new GoogleGenAI({ apiKey: allApiKeys[0] || 'dummy_key_missing_configuration' });

const rotateApiKey = (): boolean => {
  if (currentKeyIndex < allApiKeys.length - 1) {
    currentKeyIndex++;
    console.log(`⚠️ Quota exceeded. Switching to API Key #${currentKeyIndex + 1}`);
    ai = new GoogleGenAI({ apiKey: allApiKeys[currentKeyIndex] });
    return true; // Rotation successful
  }
  return false; // No more keys available
};

// --- QUOTA STATE ---
// Flags reset on page reload, allowing daily retries naturally.
let ttsQuotaExceeded = false;
let textQuotaExceeded = false;
let imageQuotaExceeded = false;

// --- FALLBACK PHRASES ---
const FALLBACK_WIN_PHRASES = [
  "¡Increíble victoria de {name}!",
  "¡{name} se lleva la corona hoy!",
  "¡Qué final! {name} es el campeón indiscutible.",
  "¡Victoria aplastante de {name}!",
  "¡Felicidades a {name} por ganar la partida!",
  "¡{name} ha demostrado ser el mejor artista!",
  "¡Impresionante desempeño de {name}!"
];

const FALLBACK_SCORE_PHRASES = [
  "¡Puntos para {name}!",
  "¡{name} sigue sumando!",
  "¡Buen trabajo {name}, sigues avanzando!",
  "¡El marcador sube para {name}!",
  "¡{name} está en racha!",
  "¡Excelente jugada de {name}!",
  "¡{name} se acerca a la meta!"
];

const getRandomFallback = (name: string, isWin: boolean) => {
    const list = isWin ? FALLBACK_WIN_PHRASES : FALLBACK_SCORE_PHRASES;
    const template = list[Math.floor(Math.random() * list.length)];
    return template.replace('{name}', name);
};

// --- AUDIO HELPERS ---
const decodePCMAudioData = (base64String: string, audioContext: AudioContext, sampleRate: number = 24000) => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const bufferLength = bytes.length;
  const length = bufferLength - (bufferLength % 2);
  const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, length / 2);
  const numChannels = 1;
  const frameCount = dataInt16.length;
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

const getVoiceForStyle = (style: NarratorStyle): string => {
  switch (style) {
    case 'DOCUMENTARY': return 'Orus'; 
    case 'SPORTS': return 'Puck'; 
    case 'GRANNY': return 'Kore'; 
    case 'SARCASTIC': return 'Charon'; 
    case 'ROBOT': return 'Zephyr'; 
    case 'GEN_Z': return 'Puck';
    case 'POET': return 'Kore';
    default: return 'Puck';
  }
};

const fallbackSpeak = (text: string, style: NarratorStyle) => {
    // Basic browser speech synthesis fallback
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    
    switch (style) {
      case 'DOCUMENTARY': utterance.pitch = 0.7; utterance.rate = 0.85; break;
      case 'SPORTS': utterance.pitch = 1.1; utterance.rate = 1.2; break;
      case 'GRANNY': utterance.pitch = 1.3; utterance.rate = 0.8; break;
      case 'ROBOT': utterance.pitch = 0.5; utterance.rate = 0.9; break;
      case 'GEN_Z': utterance.pitch = 1.1; utterance.rate = 1.1; break;
      case 'POET': utterance.pitch = 0.9; utterance.rate = 0.7; break;
      default: utterance.pitch = 1.0; utterance.rate = 1.0;
    }

    // Try to find a Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const preferredGender = ['GRANNY', 'POET', 'ROBOT'].includes(style) ? 'Female' : 'Male';
    const bestVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes(preferredGender)) 
                   || voices.find(v => v.lang.startsWith('es'));
    
    if (bestVoice) utterance.voice = bestVoice;
    window.speechSynthesis.speak(utterance);
};

// --- EXPORTED FUNCTIONS ---

export const speakText = async (text: string, style: NarratorStyle = 'DOCUMENTARY') => {
  // Only skip if we have explicitly marked TTS as dead across ALL keys
  if (ttsQuotaExceeded) {
    fallbackSpeak(text, style);
    return;
  }

  // Try current key, if fails rotate, repeat until no keys left
  while (true) {
    try {
      const voiceName = getVoiceForStyle(style);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName }, 
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data");

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const audioBuffer = decodePCMAudioData(base64Audio, audioContext, 24000);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      // Success! Break loop
      return; 

    } catch (error: any) {
      const isQuotaError = error.message?.includes('429') || error.status === 429 || JSON.stringify(error).includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
        // Try to rotate
        if (rotateApiKey()) {
          // If rotation successful, loop continues and retries with new key
          continue;
        } else {
          // No more keys. Mark TTS as dead for this session.
          console.warn("All API Keys exhausted for TTS. Switching to browser fallback.");
          ttsQuotaExceeded = true;
          fallbackSpeak(text, style);
          return;
        }
      } else {
        // Non-quota error (network, etc), fallback but don't disable future attempts necessarily
        console.error("TTS Error:", error);
        fallbackSpeak(text, style);
        return;
      }
    }
  }
};

export const generateNewCategories = async (existingCategories: string[]): Promise<Category[]> => {
  if (textQuotaExceeded) return [];

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera 3 categorías distintas y divertidas para jugar Pictionary con 5 palabras cada una. 
        Categorías existentes: ${existingCategories.join(', ')}. 
        Responde estrictamente en JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                words: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "words"]
            }
          }
        }
      });

      const rawData = response.text;
      if (!rawData) return [];
      const data = JSON.parse(rawData);
      
      const colors = ['#e11d48', '#0891b2', '#d97706', '#65a30d', '#7c3aed', '#db2777'];
      
      return data.map((item: any, index: number) => ({
        id: `gen-${Date.now()}-${index}`,
        name: item.name,
        words: item.words,
        color: colors[index % colors.length]
      }));

    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
        if (rotateApiKey()) continue;
        textQuotaExceeded = true;
        console.warn("All API Keys exhausted for Text.");
      } else {
        console.error("Gemini Text Error:", error);
      }
      return [];
    }
  }
};

export const generateCategoryFromTopic = async (topic: string): Promise<Category | null> => {
  if (textQuotaExceeded) return null;

  while(true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera una lista de 10 palabras para Pictionary basadas específicamente en el tema: "${topic}".
        Las palabras deben ser visuales y divertidas.
        Responde estrictamente en JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nombre corto y divertido para la categoría" },
              words: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "words"]
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      const data = JSON.parse(text);

      return {
        id: `custom-${Date.now()}`,
        name: data.name,
        words: data.words,
        color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
      };
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
          if (rotateApiKey()) continue;
          textQuotaExceeded = true;
      }
      return null;
    }
  }
};

export const generateMoreWords = async (categoryName: string, existingWords: string[]): Promise<string[]> => {
  if (textQuotaExceeded) return [];

  while(true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera 10 palabras nuevas para la categoría "${categoryName}".
        Palabras existentes: ${existingWords.join(', ')}.
        Responde estrictamente en un array JSON de strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      const text = response.text;
      return text ? JSON.parse(text) : [];
    } catch (error: any) {
       if (error.message?.includes('429') || error.status === 429) {
          if (rotateApiKey()) continue;
          textQuotaExceeded = true;
      }
      return [];
    }
  }
};

export const generateSketch = async (word: string): Promise<string | null> => {
  if (imageQuotaExceeded) return null;
  
  while(true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { text: `Dibujo de línea negra minimalista sobre fondo blanco de: "${word}". Estilo Pictionary simple, trazos claros.` }
          ]
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
          if (rotateApiKey()) continue;
          imageQuotaExceeded = true;
          console.warn("All API Keys exhausted for Image.");
      }
      return null;
    }
  }
};

export const generateCommentary = async (winnerName: string, score: number, isGameWon: boolean, style: NarratorStyle = 'DOCUMENTARY'): Promise<string> => {
  const fallback = getRandomFallback(winnerName, isGameWon);
  
  if (textQuotaExceeded) return fallback;

  while(true) {
    try {
      let personaPrompt = "";
      
      switch (style) {
        case 'DOCUMENTARY':
          personaPrompt = "Actúa como un narrador de documentales de la naturaleza (estilo Morgan Freeman en Español), voz profunda, sabia y solemne.";
          break;
        case 'SPORTS':
          personaPrompt = "Actúa como un comentarista de fútbol argentino o mexicano muy joven y eufórico. Grita, usa signos de exclamación y palabras como '¡GOLAZO!', '¡INCREÍBLE!'.";
          break;
        case 'GRANNY':
          personaPrompt = "Actúa como una abuelita muy dulce y consentidora. Usa diminutivos (hijito, mi vida, corazoncito), habla de comida o de lo mucho que han crecido.";
          break;
        case 'SARCASTIC':
          personaPrompt = "Actúa como un comediante de Stand Up cínico y sarcástico. Haz chistes secos, no te impresiones por nada. Estilo Daria o Dr. House.";
          break;
        case 'ROBOT':
          personaPrompt = "Actúa como un Robot o IA clásica. Usa palabras como 'PROCESANDO', 'DATOS', 'HUMANO DETECTADO'. Habla en oraciones cortas y mecánicas. Di 'BEEP BOOP' al inicio.";
          break;
        case 'GEN_Z':
          personaPrompt = "Actúa como un adolescente de la Generación Z. Usa slang actual de internet (F en el chat, de una, basado, cringe, god, nashe). Eres un streamer.";
          break;
        case 'POET':
          personaPrompt = "Actúa como un poeta dramático del siglo XIX. Habla en rimas o prosa muy florida y exageradamente romántica o trágica.";
          break;
        default:
          personaPrompt = "Actúa como un presentador de juegos entusiasta.";
      }

      const context = isGameWon 
        ? `FELICITACIÓN DE VICTORIA: El jugador "${winnerName}" ha GANADO el juego con ${score} puntos.`
        : `ACTUALIZACIÓN DE PUNTAJE: El jugador "${winnerName}" va ganando o ha avanzado a ${score} puntos.`;

      const prompt = `
        Rol: ${personaPrompt}
        Tarea: Genera un comentario breve en Español (máximo 2 oraciones) basado en el contexto.
        Contexto: ${context}
        Restricción: Mantén el personaje estrictamente.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      return response.text || fallback;

    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
          if (rotateApiKey()) continue;
          console.warn("All API Keys exhausted for Text (Commentary).");
          textQuotaExceeded = true;
      }
      return fallback;
    }
  }
};