
import { GoogleGenAI } from "@google/genai";
import { Tool } from '../types';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey: key.trim() });
    } catch (e) {
      console.warn("Failed to initialize Google GenAI SDK:", e);
      return null;
    }
  }
  return aiClient;
}

export const generateInventoryAnalysis = async (
  query: string,
  inventory: Tool[]
): Promise<string> => {
  try {
    const ai = getAIClient();
    if (!ai) {
      return "AI Assistant is currently unavailable because the Gemini API key is not configured. Please configure your GEMINI_API_KEY in the environment settings.";
    }

    const inventoryContext = JSON.stringify(inventory, null, 2);
    
    const systemInstruction = `
      You are an expert Inventory Manager assistant for SARBS Communications Ltd.
      You have access to the current tools inventory data provided below.
      
      Your goal is to answer questions about the tools, suggest maintenance, identify trends (like high breakage rates), 
      and help track who has what.

      Data Context:
      ${inventoryContext}

      Rules:
      1. Be professional, concise, and helpful.
      2. If asked about a specific tool, refer to its ID and Serial Number.
      3. If asked for a summary, provide counts and status breakdowns.
      4. Use formatting (bullet points, bold text) to make the response readable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.warn("Gemini API Error:", error?.message || error);
    return "Sorry, I encountered an error while processing your request. Please check your network connection and API key configuration.";
  }
};
