import { GoogleGenAI } from "@google/genai";
import { MenuItem, Restaurant } from "../types";

// NOTE: In a real production app, you should proxy these requests through your own backend.
// For this demo, we assume the key is in process.env.API_KEY.
// If the key is missing, the chat feature will gracefully show an error or mock mode.

export const getAIResponse = async (
  userPrompt: string, 
  menuItems: MenuItem[], 
  restaurants: Restaurant[],
  chatHistory: string[]
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "I'm sorry, I cannot connect to the brain right now (Missing API Key). But I recommend the Chicken Momos!";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a context-aware system instruction
    const menuContext = menuItems.map(item => 
      `- ${item.name} (${item.category}): ₹${item.price} at ${restaurants.find(r => r.id === item.restaurantId)?.name}`
    ).join('\n');

    const restaurantContext = restaurants.map(r => 
      `- ${r.name} (${r.cuisine}) located at ${r.location}`
    ).join('\n');

    const systemInstruction = `
      You are "Pulse AI", a helpful campus assistant for the PU Pulse app.
      Your goal is to help students find food or stationery to order.
      
      Here is the list of available Restaurants on campus:
      ${restaurantContext}

      Here is the detailed Menu:
      ${menuContext}

      Rules:
      1. Only recommend items that are on the menu.
      2. Keep responses short, friendly, and helpful.
      3. If a user asks for something not on the menu, suggest the closest alternative.
      4. If a user asks about stationery, guide them to the Stationery Depot items.
      5. Do not use markdown formatting like bold or italics excessively.
    `;

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemInstruction,
      },
      history: chatHistory.map((msg, index) => ({
        role: index % 2 === 0 ? "user" : "model",
        parts: [{ text: msg }],
      })),
    });

    const result = await chat.sendMessage({ message: userPrompt });
    return result.text || "";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having a bit of trouble connecting to the network. Try browsing the 'Popular' section!";
  }
};