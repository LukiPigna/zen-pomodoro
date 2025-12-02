import { GoogleGenAI } from "@google/genai";
import { TimerMode } from '../types';

const quoteCache = {
  [TimerMode.FOCUS]: [
    "El éxito depende del esfuerzo.",
    "Concéntrate en el ahora.",
    "Cada minuto cuenta.",
    "Hazlo con excelencia.",
    "Sigue adelante."
  ],
  [TimerMode.SHORT_BREAK]: [
    "Respira profundo.",
    "Estira las piernas.",
    "Bebe agua.",
    "Relaja los hombros.",
    "Descansa la vista."
  ],
  [TimerMode.LONG_BREAK]: [
    "Descanso merecido.",
    "Recarga energías.",
    "Desconecta un momento.",
    "Gran trabajo.",
    "Relájate."
  ]
};

// Fallback logic in case API Key is missing or request fails
const getRandomFallbackQuote = (mode: TimerMode): string => {
    const quotes = quoteCache[mode];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

export const getMotivationalQuote = async (mode: TimerMode): Promise<string> => {
    if (!process.env.API_KEY) {
        console.warn("No API_KEY found, using fallback quotes.");
        return getRandomFallbackQuote(mode);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let prompt = "";
        if (mode === TimerMode.FOCUS) {
            prompt = "Genera una frase corta, poderosa, minimalista y motivadora en Español para alguien que está a punto de estudiar profundamente. Máximo 15 palabras. No uses comillas.";
        } else if (mode === TimerMode.SHORT_BREAK) {
            prompt = "Genera una frase corta y relajante en Español para alguien tomando un descanso de 5 minutos del estudio. Enfocada en respirar o estirar. Máximo 15 palabras. No uses comillas.";
        } else {
            prompt = "Genera una frase alentadora en Español para alguien que ha completado 4 sesiones de estudio y toma un descanso largo. Máximo 15 palabras. No uses comillas.";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        return text ? text.trim() : getRandomFallbackQuote(mode);

    } catch (error) {
        console.error("Gemini API Error:", error);
        return getRandomFallbackQuote(mode);
    }
};