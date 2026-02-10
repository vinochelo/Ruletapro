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
  DOCUMENTARY: "Eres un narrador de documental de naturaleza legendario (estilo David Attenborough). Tu tono es solemne, majestuoso y profundamente serio. Analiza el puntaje como si fuera un evento crucial en la supervivencia de una especie. Usa oraciones completas y cultas. NO seas breve, sé descriptivo.",
  SPORTS: "Eres un narrador de fútbol latinoamericano en una final del mundial. GRITA con pasión. Usa oraciones completas llenas de adrenalina. Describe la jugada con emoción desbordante. ¡Celebra cada punto como el gol del siglo!",
  GRANNY: "Eres una abuelita extremadamente cariñosa. Habla con oraciones completas y dulces. Diles cuánto han crecido, ofréceles comida y diles que estás orgullosa de ellos. Usa diminutivos cariñosos en tus frases.",
  SARCASTIC: "Eres un comediante amargado y cínico. Habla con oraciones completas llenas de ironía. Haz un comentario ácido sobre cómo seguramente fue suerte y no habilidad. Búrlate inteligentemente de la situación.",
  ROBOT: "Eres una Inteligencia Artificial avanzada. Habla con oraciones completas y técnicas. Analiza la eficiencia de la victoria. Usa terminología de computación para describir el éxito humano.",
  GEN_Z: "Eres un streamer de moda. Habla con oraciones completas usando mucho slang de internet. Di que la jugada fue 'God', 'de locos' o 'basada'. Muestra mucho hype en tu comentario.",
  POET: "Eres un poeta dramático. Habla con oraciones completas, líricas y exageradas. Compara la victoria con el sol naciente o el amor eterno. Sé profundamente teatral."
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
  
  // STRATEGY: Prioritize Imagen 3.0 via generateImages. This is the correct way to generate images.
  // Fallback to Flash Image only if that fails.
  
  try {
    console.log(`Generating sketch for "${word}" with imagen-3.0-generate-001...`);
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: `simple black and white continuous line drawing of a ${word}, minimalist pictionary style, white background, no text, no shading, clean lines`,
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
    throw new Error("No image bytes returned from Imagen");

  } catch (imagenError: any) {
    console.warn("Imagen 3 generation failed, trying fallback to Flash...", imagenError);
    if (imagenError.message?.includes('429')) rotateApiKey();

    // Fallback: Gemini 2.5 Flash Image
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image", 
            contents: {
                parts: [
                { text: `draw a simple black outline sketch of a ${word} on white background` }
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
    } catch (flashError) {
        console.error("All image generation attempts failed", flashError);
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
      model: "gemini-3-flash-preview", 
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `SITUACIÓN: Juego de Pictionary. El jugador "${winnerName}" ${isWin ? `ha GANADO el juego` : `tiene ahora`} ${score} puntos.
          TAREA: Escribe una oración completa, divertida y con mucha personalidad (aprox 20-30 palabras) reaccionando a esto. NO uses solo una palabra. Muestra tu personaje.` }] 
        }
      ],
      config: {
        systemInstruction: { parts: [{ text: persona }] },
        maxOutputTokens: 150, // Increased to allow full sentences
        temperature: 0.9, // Slightly reduced to ensure coherence while maintaining creativity
        topP: 0.95,
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response");
    
    // Clean up quotes if the model adds them
    return text.replace(/^["']|["']$/g, '');
  } catch (e) {
    console.error("Commentary Error", e);
    return fallback;
  }
};
