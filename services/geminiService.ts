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
const FALLBACK_WIN = ["¡Increíble victoria!", "¡Eso fue espectacular, ganaste!", "¡Tenemos un campeón indiscutible!"];
const FALLBACK_SCORE = ["¡Punto anotado!", "¡Excelente jugada!", "¡Sigue sumando así!"];
const getRandomFallback = (name: string, isWin: boolean) => {
    const list = isWin ? FALLBACK_WIN : FALLBACK_SCORE;
    return `${list[Math.floor(Math.random() * list.length)]} ${name}`;
};

// --- PERSONA DEFINITIONS & VOICE MAPPING ---
// Detailed prompts to ensure strong personality adherence
const STYLE_PROMPTS: Record<NarratorStyle, string> = {
  DOCUMENTARY: "Eres un narrador de documental de naturaleza legendario (estilo David Attenborough). Tu tono es solemne, majestuoso y profundamente serio. Tómate tu tiempo para describir el puntaje como si fuera un evento crucial en la supervivencia de una especie. Elabora una narrativa breve de 2 o 3 frases sobre el comportamiento de este 'espécimen' humano. Usa vocabulario científico y culto.",
  SPORTS: "Eres un narrador de fútbol latinoamericano en una final del mundial. GRITA con pasión desbordante. No te limites a una frase. Describe la jugada, la tensión en el estadio, la genialidad del jugador. Usa 2 o 3 oraciones llenas de adrenalina, metáforas exageradas y referencias futbolísticas. ¡Que se sienta la emoción!",
  GRANNY: "Eres una abuelita extremadamente cariñosa y charlatana. No digas solo 'bien hecho'. Cuéntale una pequeña anécdota, ofrécele comida, dile cuánto ha crecido y lo orgullosa que estás. Habla con 2 o 3 frases llenas de amor, calidez y diminutivos (mijito, tesoro).",
  SARCASTIC: "Eres un comediante amargado y cínico. No seas breve. Elabora tu burla. Explica por qué su éxito es seguramente un accidente cósmico o una señal del fin del mundo. Usa 2 o 3 frases de sarcasmo mordaz e inteligente. Nunca te muestres impresionado.",
  ROBOT: "Eres una Inteligencia Artificial avanzada del año 3000. Proporciona un análisis detallado. No des solo el dato. Explica los cálculos, la probabilidad de éxito y la eficiencia energética de la jugada. Usa 2 o 3 oraciones complejas, técnicas y frías.",
  GEN_Z: "Eres un streamer de moda con mucha energía. No digas solo 'GG'. Hypea el chat, pide clips, di que está rompiendo la matrix. Usa mucho slang (God, Nashe, de locos, en su prime, basado) y habla rápido. Tira 2 o 3 frases seguidas con mucho flow y energía caótica.",
  POET: "Eres un poeta dramático del romanticismo. No puedes ser breve, tu alma es demasiado vasta. Declama una pequeña estrofa o prosa poética de 2 o 3 oraciones sobre la gloria, el destino y la belleza efímera de este punto. Sé intensamente emocional."
};

// Map styles to specific Gemini TTS voices that match the persona
const getVoiceForStyle = (style: NarratorStyle): string => {
  const map: Record<NarratorStyle, string> = {
    'DOCUMENTARY': 'Fenrir', // Deep, intense
    'SPORTS': 'Puck', // Energetic
    'GRANNY': 'Aoede', // Expressive
    'SARCASTIC': 'Charon', // Deep, dry
    'ROBOT': 'Zephyr', // Balanced
    'GEN_Z': 'Puck', // Energetic, fast
    'POET': 'Fenrir' // Deep, dramatic
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
  
  // Using gemini-2.5-flash-image for reliable sketch generation via generateContent (General Task)
  try {
    console.log(`Generating sketch for "${word}" with gemini-2.5-flash-image...`);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", 
      contents: {
        parts: [
          { text: `Generate an image. A simple, high-contrast black and white line drawing of a ${word}. Minimalist pictionary style. White background. Do not include text.` }
        ]
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
    
    // Check if model returned text instead (refusal or confusion)
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (textPart) console.warn("Model returned text instead of image:", textPart);
    
    return { type: 'text', content: `No pude dibujar "${word}". ¡Usa tu imaginación!` };

  } catch (error: any) {
    console.warn("Sketch generation failed", error);
    if (error.message?.includes('429')) rotateApiKey();
    return { type: 'text', content: `Error de conexión. Intenta de nuevo.` };
  }
};

export const generateCommentary = async (winnerName: string, score: number, isWin: boolean, style: NarratorStyle): Promise<string> => {
  const fallback = getRandomFallback(winnerName, isWin);
  if (textQuotaExceeded) return fallback;

  // Retrieve strict persona instruction
  const persona = STYLE_PROMPTS[style];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [
        { 
          role: 'user', 
          // Injecting persona into the user prompt ensures the model adheres to it more strictly than systemInstruction alone
          parts: [{ text: `${persona}\n\nCONTEXTO: Estás narrando una partida de Pictionary.
          EVENTO: El jugador "${winnerName}" ${isWin ? `ha GANADO la partida` : `acaba de ganar puntos y lleva`} ${score} puntos.
          INSTRUCCIÓN: Genera un comentario de 2 a 3 oraciones completas y conectadas (aprox 40-60 palabras).
          REQUISITO: Mantén tu personalidad al 100%. Sé específico, creativo y no repetitivo. Habla directamente sobre el jugador o la situación. NO des solo el nombre.` }] 
        }
      ],
      config: {
        maxOutputTokens: 250, 
        temperature: 0.85, 
        topP: 0.95,
      }
    });

    let text = response.text?.trim();
    if (!text) throw new Error("Empty response");
    
    text = text.replace(/^["']|["']$/g, '');

    // Validation: If text is too short (likely just a name or one word), use fallback
    if (text.split(' ').length < 5) {
        console.warn("Commentary too short, using fallback", text);
        return fallback; 
    }

    return text;
  } catch (e) {
    console.error("Commentary Error", e);
    return fallback;
  }
};
