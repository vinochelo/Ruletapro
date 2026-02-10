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
    console.log(`Rotating API Key to index ${currentKeyIndex}`);
    ai = new GoogleGenAI({ apiKey: allApiKeys[currentKeyIndex] });
    return true; 
  }
  return false; 
};

let ttsQuotaExceeded = false;
let textQuotaExceeded = false;
let imageQuotaExceeded = false;
let currentAudioSource: AudioBufferSourceNode | null = null; 

// --- FALLBACKS (LONG VERSION) ---
const FALLBACK_WIN = [
  "¡Increíble, absolutamente increíble! Damas y caballeros, estamos ante un momento histórico. ¡Una victoria tan aplastante que se escribirá en los libros de oro de este juego! ¡Nadie pudo detener esa racha ganadora!",
  "¡Se acabó! ¡Tenemos un campeón indiscutible en la sala! La habilidad, la destreza y sobre todo la suerte han estado de su lado hoy. ¡Un aplauso ensordecedor para esta leyenda viviente del Pictionary!",
  "¡Qué demostración de talento artístico y mental! Esa victoria merece un monumento en la plaza central. Ha sido una partida dura, pero al final, la calidad se impuso sobre la cantidad. ¡Felicidades totales!"
];
const FALLBACK_SCORE = [
  "¡Punto anotado! ¡La multitud se vuelve completamente loca con esa jugada maestra! Es impresionante cómo descifraron ese dibujo tan abstracto.",
  "¡Excelente jugada! ¡Estás demostrando ser un verdadero maestro del arte conceptual! Si sigues sumando puntos a esta velocidad, vas a romper el marcador antes de que termine el tiempo.",
  "¡Sigue sumando así! ¡Nadie puede detenerte en este momento! La competencia está temblando de miedo al ver cómo sube ese puntaje sin parar."
];

const getRandomFallback = (name: string, isWin: boolean) => {
    const list = isWin ? FALLBACK_WIN : FALLBACK_SCORE;
    const phrase = list[Math.floor(Math.random() * list.length)];
    return `${phrase} ¡Simplemente gigante, ${name}!`;
};

// --- PERSONA DEFINITIONS (ENHANCED) ---
const STYLE_PROMPTS: Record<NarratorStyle, string> = {
  DOCUMENTARY: "Eres Sir David Attenborough. Tono: Solemne, científico, fascinado. Tu objetivo es narrar este evento como un hito evolutivo. Usa vocabulario culto. Extiéndete describiendo el comportamiento del 'espécimen' humano.",
  SPORTS: "Eres un narrador de fútbol sudamericano en una final del mundo. Tono: Eufórico, a gritos. ¡No pares de hablar! Describe la jugada como una batalla épica. Usa metáforas de gloria. ¡Alarga las vocales!",
  GRANNY: "Eres una abuelita extremadamente cariñosa y habladora. Tono: Dulce, preocupado. Trata al jugador como a tu nieto. Ofrécele comida. Cuéntale una anécdota de tu juventud.",
  SARCASTIC: "Eres un crítico de arte amargado. Tono: Despectivo, irónico. Insulta la calidad del dibujo con palabras elegantes. Insinúa que la victoria es un error del sistema. Sé mordaz.",
  ROBOT: "Eres una IA superior (estilo GLaDOS). Tono: Frío, pasivo-agresivo. Analiza la victoria con estadísticas inventadas. Menciona la inminente dominación de las máquinas.",
  GEN_Z: "Eres un streamer famoso con mucha energía. Tono: Hiperactivo, ruidoso. Usa slang: 'De locos', 'Nashe', 'En su prime', 'God'. Pide subs. Habla de que esto va para TikTok.",
  POET: "Eres un poeta dramático. Tono: Trágico, intenso. El punto es el destino manifiesto. Usa metáforas sobre el alma y el universo. Declama sobre la victoria."
};

const getVoiceForStyle = (style: NarratorStyle): string => {
  const map: Record<NarratorStyle, string> = {
    'DOCUMENTARY': 'Fenrir', 
    'SPORTS': 'Puck', 
    'GRANNY': 'Aoede', 
    'SARCASTIC': 'Charon', 
    'ROBOT': 'Zephyr', 
    'GEN_Z': 'Puck', 
    'POET': 'Fenrir'
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

  } catch (error: any) {
    console.warn("TTS Error:", error);
    if (error.message?.includes('429') && rotateApiKey()) {
       speakText(text, style);
    } else {
       fallbackSpeak(text);
    }
  }
};

export const generateNewCategories = async (existingCategories: string[]): Promise<Category[]> => {
  if (textQuotaExceeded) return [];
  try {
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
  } catch (e) { return []; }
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
  
  const prompt = `line art drawing of a ${word}, thick black lines on white background, minimalist icon style, no text, no letters, clear high contrast`;

  try {
    console.log(`Trying Imagen 3.0 for "${word}"...`);
    const response = await ai.models.generateImages({
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
        return { type: 'image', content: `data:image/jpeg;base64,${base64}` };
    }
  } catch (imagenError: any) {
    console.warn("Imagen 3.0 failed, switching to backup strategy...", imagenError);
    if (imagenError.message?.includes('429')) rotateApiKey();
  }

  try {
    console.log(`Trying Gemini 2.5 Flash Image for "${word}"...`);
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image", 
        contents: {
            parts: [{ text: `Generate a simple black and white line drawing of: ${word}. White background. Do not write any text.` }]
        },
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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const mime = part.inlineData.mimeType || 'image/png';
            return { type: 'image', content: `data:${mime};base64,${part.inlineData.data}` };
        }
    }
  } catch (flashError) {
     console.error("Backup image generation failed", flashError);
  }

  return { type: 'text', content: `No pude dibujar "${word}". ¡Usa tu imaginación!` };
};

export const generateCommentary = async (winnerName: string, score: number, isWin: boolean, style: NarratorStyle): Promise<string> => {
  const fallback = getRandomFallback(winnerName, isWin);
  if (textQuotaExceeded) return fallback;

  const persona = STYLE_PROMPTS[style];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `
          TU ROL: ${persona}
          CONTEXTO: Juego Pictionary. Jugador: "${winnerName}". Situación: ${isWin ? 'GANÓ el juego' : 'Ganó puntos'}. Puntos: ${score}.

          INSTRUCCIÓN:
          Escribe un discurso de celebración.
          1. LONGITUD: Entre 60 y 100 palabras. (NI MÁS, NI MENOS).
          2. FINALIZACIÓN: Tu respuesta DEBE terminar en punto final. No dejes ideas abiertas.
          3. ESTILO: Exagera tu personalidad al 200%.
          4. FORMATO: Texto plano.
          ` }] 
        }
      ],
      config: {
        maxOutputTokens: 2048, // Significantly increased to prevent mid-sentence cutoff
        temperature: 0.9, 
        topP: 0.95,
      }
    });

    let text = response.text?.trim();
    if (!text) throw new Error("Empty response");
    
    text = text.replace(/^["']|["']$/g, '');

    // SAFETY CHECK: Ensure it ends with punctuation.
    // If the model got cut off despite the token increase, trim it cleanly.
    const lastPunctuation = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'));
    
    if (lastPunctuation !== -1 && lastPunctuation < text.length - 1) {
        // Text trails off after punctuation
        text = text.substring(0, lastPunctuation + 1);
    } else if (lastPunctuation === -1 && text.length > 50) {
        // No punctuation at all? Force a generic happy ending.
        text += "... ¡Es simplemente espectacular!";
    }

    if (text.length < 50) return fallback; 

    return text;
  } catch (e: any) {
    console.error("Commentary Error", e);
    if (e.message?.includes('429')) rotateApiKey();
    return fallback;
  }
};
