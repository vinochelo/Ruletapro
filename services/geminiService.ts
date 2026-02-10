import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
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

// --- PERSONA DEFINITIONS & VOICE MAPPING ---
// Detailed prompts to ensure strong personality adherence
const STYLE_PROMPTS: Record<NarratorStyle, string> = {
  DOCUMENTARY: "Eres un narrador de documental de naturaleza legendario (estilo David Attenborough). Tu tono es solemne, majestuoso y profundamente serio. Analiza el puntaje como si fuera un evento crucial en la supervivencia de una especie. Vocabulario: magnífico, extraordinario, espécimen, hábitat. NO seas entusiasta, sé trascendental y épico.",
  SPORTS: "Eres un narrador de fútbol latinoamericano en una final del mundial al borde del infarto. GRITA. Usa mayúsculas. Usa jerga futbolera: 'la clavó en el ángulo', 'jugada de pizarrón', 'crack mundial', 'tiki-taka'. Tu energía está al 200%. ¡Celebra cada punto como un gol!",
  GRANNY: "Eres una abuelita extremadamente cariñosa y tierna. Trata a los jugadores como tus nietecitos adorados. Ofréceles comida o diles que se pongan un suéter. Usa: 'mijito', 'ternurita', 'bizcochito', 'corazón de melón'. Tono: dulce, suave y amoroso.",
  SARCASTIC: "Eres un comediante amargado y cínico. Nada te impresiona. Búrlate del jugador, insinúa que tuvo suerte o que hizo trampa. Usa ironía pesada y sarcasmo mordaz. Tono: seco, desganado y burlón.",
  ROBOT: "Eres una Inteligencia Artificial avanzada del año 3000. No tienes sentimientos humanos. Habla solo con datos, porcentajes y términos técnicos. Usa: 'algoritmo optimizado', 'procesando victoria', 'eficiencia al 100%', 'error: emoción no encontrada'. Tono: monótono, preciso y metálico.",
  GEN_Z: "Eres un streamer de Twitch/TikTok muy joven. Usa MUCHO slang de internet actual: 'bro', 'literal', 'de locos', 'basado', 'nashe', 'god', 'padreando', 'cringe', 'se picó'. Habla con mucho hype. Tono: informal, rápido y cool.",
  POET: "Eres un poeta dramático del romanticismo atormentado. Todo es una tragedia o un éxtasis divino. Habla en metáforas exageradas sobre el alma, el destino, la luz y la sombra. Tono: teatral, intenso y apasionado."
};

// Map styles to specific Gemini TTS voices that match the persona
const getVoiceForStyle = (style: NarratorStyle): string => {
  const map: Record<NarratorStyle, string> = {
    'DOCUMENTARY': 'Fenrir', // Deep, intense (Great for serious documentary)
    'SPORTS': 'Puck', // Energetic, slightly higher pitch (Good for excitement)
    'GRANNY': 'Aoede', // Expressive, distinct (Works well for character voices)
    'SARCASTIC': 'Charon', // Deep, dry (Good for deadpan/sarcasm)
    'ROBOT': 'Zephyr', // Balanced, clear (Good for neutral/robotic)
    'GEN_Z': 'Puck', // Energetic, fast (Good for hype)
    'POET': 'Fenrir' // Deep, dramatic (Good for poetry)
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
  
  const commonConfig = {
    // Disable safety filters to allow normal pictionary words (e.g. 'bomb', 'sword', 'naked mole rat')
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
  };

  const attemptGeneration = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName, 
      contents: {
        parts: [
          { text: `simple continuous line drawing of ${word}, black ink on white background, minimalist pictionary sketch, no text, no shading.` }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" },
        ...commonConfig
      }
    });
  };

  // 1. Attempt with standard Image model
  try {
    console.log(`Generating sketch for "${word}" with gemini-2.5-flash-image...`);
    const response = await attemptGeneration("gemini-2.5-flash-image");

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const mime = part.inlineData.mimeType || 'image/png';
        return { type: 'image', content: `data:${mime};base64,${part.inlineData.data}` };
      }
    }
    
    // Check for text fallback from model
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (textPart) console.warn("Model returned text instead of image:", textPart);

    throw new Error("No image data in response");

  } catch (error: any) {
    console.warn("Flash Image generation failed, trying fallback...", error);
    
    // 2. Fallback to Pro model
    try {
        const fallbackResponse = await attemptGeneration("gemini-3-pro-image-preview");
        for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const mime = part.inlineData.mimeType || 'image/png';
                return { type: 'image', content: `data:${mime};base64,${part.inlineData.data}` };
            }
        }
    } catch (fallbackError) {
        console.error("All image generation attempts failed", fallbackError);
        if (error.message?.includes('429')) rotateApiKey();
    }

    return { type: 'text', content: `No pude dibujar "${word}". ¡Usa tu imaginación!` };
  }
};

export const generateCommentary = async (winnerName: string, score: number, isWin: boolean, style: NarratorStyle): Promise<string> => {
  const fallback = getRandomFallback(winnerName, isWin);
  if (textQuotaExceeded) return fallback;

  // Retrieve strict persona instruction
  const persona = STYLE_PROMPTS[style];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Good model for text reasoning
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `SITUACIÓN: Juego de Pictionary. El jugador "${winnerName}" ${isWin ? `ha GANADO el juego` : `tiene ahora`} ${score} puntos.
          TAREA: Reacciona con una frase corta (máximo 20 palabras) TOTALMENTE metido en tu personaje. Sé exagerado.` }] 
        }
      ],
      config: {
        // IMPORTANT: Use systemInstruction for better persona adherence
        systemInstruction: { parts: [{ text: persona }] },
        maxOutputTokens: 80, 
        temperature: 1.1, // High creativity/randomness
        topP: 0.95,
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response");
    
    return text;
  } catch (e) {
    console.error("Commentary Error", e);
    // If quota fails, return fallback
    return fallback;
  }
};
