services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { CoreResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCoreReport = async (trigger: string, context?: any): Promise<CoreResponse> => {
  const contextStr = context ? `Current Cluster State: ${JSON.stringify(context)}` : "";
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As the OmniCore System Architect (SRE Senior AI), generate a technical status report or diagnostic for: "${trigger}". 
    ${contextStr}
    The tone should be highly technical, authoritative, and futuristic. Focus on scalability, latency, and high-availability metrics.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "Technical diagnostic message." },
          protocolType: { 
            type: Type.STRING, 
            enum: ["NEUTRAL", "CELEBRATION", "ALERT", "INFRASTRUCTURE"],
            description: "Category of the report."
          },
          timestamp: { type: Type.STRING, description: "Stellar ISO timestamp." },
          recommendation: { type: Type.STRING, description: "Suggested architectural optimization." }
        },
        required: ["message", "protocolType", "timestamp"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as CoreResponse;
};
