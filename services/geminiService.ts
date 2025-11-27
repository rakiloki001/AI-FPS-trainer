import { GoogleGenAI, Type } from "@google/genai";
import { GameStats } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getCoachFeedback = async (stats: GameStats) => {
  if (!apiKey) {
    console.warn("No API Key available for Gemini");
    return {
      summary: "Mission complete, soldier. No comms link to HQ (API Key missing).",
      tips: ["Check your API configuration.", "Practice makes perfect."],
      rank: "Recruit"
    };
  }

  const prompt = `
    Analyze the following FPS aim training session stats:
    Score: ${stats.score}
    Hits: ${stats.hits}
    Misses: ${stats.misses}
    Accuracy: ${stats.accuracy.toFixed(2)}%
    Average Reaction Time: ${stats.avgReactionTime.toFixed(0)}ms
    Best Streak: ${stats.bestStreak}

    Provide output in JSON format with the following structure:
    {
      "summary": "A brief, immersive comment from a sci-fi drill sergeant persona.",
      "tips": ["Tip 1", "Tip 2", "Tip 3"],
      "rank": "One word rank based on performance (e.g. Bronze, Cyber-Elite, Apex Predator)"
    }
    Keep the tips actionable and specific to improving aim (e.g. if accuracy is low, suggest slowing down; if reaction is slow, suggest pre-aiming).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            rank: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      summary: "Data corruption in transmission. Good shooting, regardless.",
      tips: ["Keep your hand steady.", "Focus on the center of the target."],
      rank: "Unknown"
    };
  }
};
