import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Category, NarratorStyle } from "../types";
import { getLocalCommentary, PhraseType } from "../data/narratorPhrases";

// --- API KEY MANAGEMENT & ROTATION ---
// Sanitize keys to remove accidental whitespace from copy-pasting
const sanitizeKey = (k: string) => k ? k.trim().replace(/["']/g, "") : "";

const RAW_KEYS = sanitizeKey(process.env.API_KEY || '');
const API_KEYS = RAW_KEYS.includes(',') 
  ? RAW_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0)
  : [RAW_KEYS].filter(k => k.length > 0);

// Dedicated Image Key (Optional) - Prioritize this for images
const IMAGE_API_KEY = sanitizeKey(process.env.IMAGE_API_KEY || '');

// --- DEBUG LOGGING (Safe) ---
// This runs once on load to help verify Vercel configuration in browser console
console.log("🔧 Configuración de API:");
console.log(`- API Keys Principales: ${API_KEYS.length} disponibles.`);
console.log(`- API Key Imágenes (Independiente): ${IMAGE_API_KEY && IMAGE_API_KEY.length > 5 ? `Configurada (${IMAGE_API_KEY.substring(0, 4)}...)` : 'No configurada (Usará pool principal)'}.`);

let currentKeyIndex = 0;
let ttsQuotaExceeded = false;
let currentAudioSource: AudioBufferSourceNode | null = null; 

// Helper: Get Client with current key (General Use)
const getAIClient = (): GoogleGenAI | null => {
  if (API_KEYS.length === 0) return null;
  const key = API_KEYS[currentKeyIndex];
  return new GoogleGenAI({ apiKey: key });
};

// Helper: Rotate to next key
const rotateKey = () => {
  if (API_KEYS.length <= 1) return;
  const prevIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`⚠️ API Quota limit or error. Rotating key index: ${prevIndex} -> ${currentKeyIndex}`);
};

// Helper: Retry Wrapper for API calls
async function withRotationRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  if (API_KEYS.length === 0) throw new Error("MISSING_API_KEY");
  const maxAttempts = Math.max(2, API_KEYS.length);
  let lastError: any;

  for (let i = 0; i < maxAttempts; i++) {
    const ai = getAIClient();
    if (!ai) throw new Error("MISSING_API_KEY");

    try {
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      const errMsg = error.message || error.toString();
      if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('403')) {
        rotateKey();
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// --- PERSONA TO VOICE MAPPING ---
const getVoiceForStyle = (style: NarratorStyle): string => {
  const map: Record<NarratorStyle, string> = {
    'DOCUMENTARY': 'Algenib',
    'SPORTS': 'Puck',
    'GRANNY': 'Aoede',
    'SARCASTIC': 'Charon',
    'ROBOT': 'Zephyr',
    'GEN_Z': 'Puck',
    'POET': 'Algieba',
    'TELENOVELA': 'Orus'
  };
  return map[style] || 'Puck';
};

// --- AUDIO HELPERS ---
const decodePCMAudioData = (base64String: string, audioContext: AudioContext, sampleRate: number = 24000) => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const buffer = audioContext.createBuffer(1, bytes.length / 2, sampleRate);
  const channelData = buffer.getChannelData(0);
  const dataInt16 = new Int16Array(bytes.buffer);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

const fallbackSpeak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
};

export const stopAudio = () => {
  if (currentAudioSource) {
    try { currentAudioSource.stop(); currentAudioSource.disconnect(); } catch (e) {}
    currentAudioSource = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
};

export const speakText = async (text: string, style: NarratorStyle = 'DOCUMENTARY') => {
  stopAudio();
  if (ttsQuotaExceeded) { fallbackSpeak(text); return; }

  try {
    await withRotationRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceForStyle(style) } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data");

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const buffer = decodePCMAudioData(base64Audio, ctx, 24000);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => { if (currentAudioSource === source) currentAudioSource = null; };
      currentAudioSource = source;
      source.start();
    });

  } catch (error: any) {
    console.warn("TTS Error (Falling back to browser voice):", error);
    if (error.message === 'MISSING_API_KEY' || error.message?.includes('429')) {
       ttsQuotaExceeded = true;
    }
    fallbackSpeak(text);
  }
};

// --- TEXT GENERATION (Strictly Local for Commentary) ---
export const generateCommentary = (name: string, score: number, type: PhraseType, style: NarratorStyle): Promise<string> => {
  console.log(`🎤 Generating LOCAL commentary for style: ${style}, Type: ${type}`);
  const text = getLocalCommentary(style, type, name, score);
  return Promise.resolve(text);
};

// --- GAME LOGIC GENERATION ---

export const generateNewCategories = async (existingCategories: string[]): Promise<Category[]> => {
  try {
    return await withRotationRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `JSON: 3 categorias Pictionary únicas y divertidas (5 palabras c/u). Evitar: ${existingCategories.join(',')}.`,
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
      return JSON.parse(response.text || '[]').map((item: any, i: number) => ({
        id: `gen-${Date.now()}-${i}`,
        name: item.name,
        words: item.words,
        color: ['#e11d48', '#0891b2', '#d97706'][i % 3]
      }));
    });
  } catch (e) { return []; }
};

export const generateCategoryFromTopic = async (topic: string): Promise<Category | null> => {
  try {
    return await withRotationRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `JSON: Lista 10 palabras Pictionary sobre: "${topic}".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, words: { type: Type.ARRAY, items: { type: Type.STRING } } },
            required: ["name", "words"]
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      return { id: `custom-${Date.now()}`, name: data.name, words: data.words || [], color: '#7c3aed' };
    });
  } catch (e) { return null; }
};

export const generateMoreWords = async (catName: string, existing: string[]): Promise<string[]> => {
  try {
    return await withRotationRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `JSON: 5 palabras nuevas para categoría "${catName}". Evitar: ${existing.join(',')}.`,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
      });
      return JSON.parse(response.text || '[]');
    });
  } catch (e) { return []; }
};

// Helper: Generate a text hint when image generation fails
const generateTextHint = async (word: string): Promise<{type: 'text', content: string}> => {
    try {
        const ai = getAIClient(); 
        if (!ai) return { type: 'text', content: `No pude dibujar "${word}" (Error de conexión). Intenta adivinar.` };
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Juego Pictionary: Dame una descripción visual breve y críptica para que adivinen la palabra "${word}". ¡NO menciones la palabra "${word}" ni su raíz! Máximo 20 palabras.`,
        });
        const text = response.text;
        return { type: 'text', content: text || `Pista: Intenta adivinar "${word}".` };
    } catch (e) {
        return { type: 'text', content: `No pude dibujar "${word}".` };
    }
};

export const generateSketch = async (word: string): Promise<{type: 'image' | 'text', content: string} | null> => {
  // --- STRATEGY: Quadruple Fallback ---
  // 1. Dedicated Key + Gemini 2.5
  // 2. Main Key + Gemini 2.5
  // 3. Dedicated Key + Imagen 3 (New fallback model)
  // 4. Main Key + Imagen 3
  // 5. Text Hint

  const prompt = `Draw a simple, minimalist, black and white line art sketch representing the concept: "${word}". Style: Pictionary drawing on white background. High contrast. No text.`;

  // Method 1: Gemini 2.5 Flash Image (Content Generation)
  const tryGemini25 = async (client: GoogleGenAI, debugLabel: string) => {
      console.log(`🎨 [${debugLabel}] Trying Gemini 2.5 Flash Image for "${word}"...`);
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash-image", 
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: { aspectRatio: "1:1" },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        }
    });
    // Extract Image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
          const mime = part.inlineData.mimeType || 'image/png';
          return { type: 'image' as const, content: `data:${mime};base64,${part.inlineData.data}` };
      }
    }
    throw new Error("No image data in Gemini 2.5 response");
  };

  // Method 2: Imagen 3 (Image Generation)
  const tryImagen3 = async (client: GoogleGenAI, debugLabel: string) => {
    console.log(`🎨 [${debugLabel}] Trying Imagen 3.0 for "${word}"...`);
    const response = await client.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '1:1',
            outputMimeType: 'image/jpeg'
        }
    });
    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
        return { type: 'image' as const, content: `data:image/jpeg;base64,${base64}` };
    }
    throw new Error("No image data in Imagen 3.0 response");
  };

  try {
      let result;
      
      // 1. Dedicated Key + Gemini 2.5
      if (IMAGE_API_KEY.length > 5) {
          try {
             const ai = new GoogleGenAI({ apiKey: IMAGE_API_KEY });
             result = await tryGemini25(ai, "DEDICATED_KEY");
             return result;
          } catch (e: any) { console.warn(`⚠️ Dedicated/Gemini2.5 failed: ${e.message}`); }
      }

      // 2. Main Key + Gemini 2.5
      if (API_KEYS.length > 0) {
          try {
            await withRotationRetry(async (ai) => {
                result = await tryGemini25(ai, "MAIN_KEY_POOL");
            });
            if (result) return result;
          } catch(e: any) { console.warn(`⚠️ Main/Gemini2.5 failed: ${e.message}`); }
      }

      // 3. Dedicated Key + Imagen 3 (Fallback)
      if (IMAGE_API_KEY.length > 5) {
        try {
           const ai = new GoogleGenAI({ apiKey: IMAGE_API_KEY });
           result = await tryImagen3(ai, "DEDICATED_KEY_IMAGEN");
           return result;
        } catch (e: any) { console.warn(`⚠️ Dedicated/Imagen3 failed: ${e.message}`); }
      }

      // 4. Main Key + Imagen 3 (Fallback)
      if (API_KEYS.length > 0) {
        try {
            await withRotationRetry(async (ai) => {
                result = await tryImagen3(ai, "MAIN_KEY_POOL_IMAGEN");
            });
            if (result) return result;
        } catch(e: any) { console.error(`❌ Main/Imagen3 failed: ${e.message}`); }
      }

      throw new Error("All image generation attempts failed.");

  } catch (error: any) {
     console.error("❌ Fatal Image Generation Error. Falling back to text hint.", error);
     return generateTextHint(word);
  }
};