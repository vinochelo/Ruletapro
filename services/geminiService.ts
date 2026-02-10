import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, NarratorStyle } from "../types";

// --- API KEY ROTATION LOGIC ---
const getApiKeys = () => {
  let keysString = '';
  try {
    keysString = import.meta.env?.VITE_API_KEY || '';
  } catch (e) {
    keysString = '';
  }
  return keysString.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
};

const allApiKeys = getApiKeys();
let currentKeyIndex = 0;
let ai = new GoogleGenAI({ apiKey: allApiKeys[0] || 'dummy_key' });

const rotateApiKey = (): boolean => {
  if (currentKeyIndex < allApiKeys.length - 1) {
    currentKeyIndex++;
    ai = new GoogleGenAI({ apiKey: allApiKeys[currentKeyIndex] });
    return true; 
  }
  return false; 
};

let ttsQuotaExceeded = false;
let textQuotaExceeded = false;
let imageQuotaExceeded = false;
let currentAudioSource: AudioBufferSourceNode | null = null; // Track current audio

// --- FALLBACKS ---
const FALLBACK_WIN = ["¡Ganaste!", "¡Increíble!", "¡Campeón!"];
const FALLBACK_SCORE = ["¡Punto!", "¡Bien!", "¡Sigue así!"];
const getRandomFallback = (name: string, isWin: boolean) => {
    const list = isWin ? FALLBACK_WIN : FALLBACK_SCORE;
    return `${list[Math.floor(Math.random() * list.length)]} ${name}`;
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

const getVoiceForStyle = (style: NarratorStyle): string => {
  const map: Record<NarratorStyle, string> = {
    'DOCUMENTARY': 'Orus', 'SPORTS': 'Puck', 'GRANNY': 'Kore',
    'SARCASTIC': 'Charon', 'ROBOT': 'Zephyr', 'GEN_Z': 'Puck', 'POET': 'Kore'
  };
  return map[style] || 'Puck';
};

const fallbackSpeak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop previous
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    window.speechSynthesis.speak(u);
};

// --- EXPORTED FUNCTIONS ---

export const stopAudio = () => {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
      currentAudioSource.disconnect();
    } catch (e) {
      // ignore
    }
    currentAudioSource = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const speakText = async (text: string, style: NarratorStyle = 'DOCUMENTARY') => {
  stopAudio(); // Stop any currently playing audio before starting new one
  
  if (ttsQuotaExceeded) { fallbackSpeak(text); return; }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceForStyle(style) } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio");

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const buffer = decodePCMAudioData(base64Audio, ctx, 24000);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      if (currentAudioSource === source) {
        currentAudioSource = null;
      }
    };
    
    currentAudioSource = source;
    source.start();

  } catch (error: any) {
    if (error.message?.includes('429') && rotateApiKey()) {
       speakText(text, style); // Retry once with new key
    } else {
       console.warn("TTS Failed, using fallback", error);
       fallbackSpeak(text);
    }
  }
};

export const generateNewCategories = async (existingCategories: string[]): Promise<Category[]> => {
  if (textQuotaExceeded) return [];
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `JSON: 3 categorias Pictionary divertidas (5 palabras c/u). Evitar: ${existingCategories.join(',')}.`,
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
  } catch (e) { console.error(e); return []; }
};

export const generateCategoryFromTopic = async (topic: string): Promise<Category | null> => {
  try {
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
  } catch (e) { return null; }
};

export const generateMoreWords = async (catName: string, existing: string[]): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `JSON: 5 palabras nuevas para categoría "${catName}". Evitar: ${existing.join(',')}.`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) { return []; }
};

export const generateSketch = async (word: string): Promise<{type: 'image' | 'text', content: string} | null> => {
  if (imageQuotaExceeded) return null;
  
  // STRATEGY: Try Gemini 2.5 Flash Image first. If it returns text or fails, try Imagen 3.0.
  
  // 1. Attempt with Gemini 2.5 Flash Image
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", 
      contents: {
        parts: [
          // Prompt optimized for direct image generation (noun phrase, not instruction)
          { text: `illustration of a ${word}, simple black outline sketch on white background, pictionary style, minimal.` }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    // Check for image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { type: 'image', content: `data:image/png;base64,${part.inlineData.data}` };
      }
    }

    // If we are here, Gemini returned text or nothing. Save the text just in case we need it as a fallback.
    const textFallback = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;

    // 2. Fallback Attempt with Imagen 3.0 (Dedicated Image Model)
    try {
        console.log("Switching to Imagen 3.0 fallback...");
        const imagenResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: `simple line drawing of ${word}, black ink on white background, minimalist sketch`,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
                outputMimeType: 'image/jpeg'
            }
        });

        const base64 = imagenResponse.generatedImages?.[0]?.image?.imageBytes;
        if (base64) {
            return { type: 'image', content: `data:image/jpeg;base64,${base64}` };
        }
    } catch (imagenError) {
        console.warn("Imagen 3.0 fallback failed:", imagenError);
    }

    // 3. Return text hint if available and both image gens failed
    if (textFallback) {
        return { type: 'text', content: textFallback };
    }

    return null;

  } catch (error: any) {
    console.error("Sketch Error", error);
    if (error.message?.includes('429')) rotateApiKey();
    return null;
  }
};

export const generateCommentary = async (winnerName: string, score: number, isWin: boolean, style: NarratorStyle): Promise<string> => {
  // Optimized prompt for speed (fewer tokens)
  const fallback = getRandomFallback(winnerName, isWin);
  if (textQuotaExceeded) return fallback;

  try {
    const prompt = `
      Rol: Comentarista estilo ${style}.
      Contexto: Pictionary. Jugador "${winnerName}" ${isWin ? `GANÓ con ${score} pts` : `tiene ${score} pts`}.
      Tarea: Frase CORTA y graciosa (max 10 palabras).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 30, // Limit output for speed
      }
    });

    return response.text || fallback;
  } catch (e) { return fallback; }
};