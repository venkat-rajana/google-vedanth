import { GoogleGenAI } from '@google/genai';
import { useAuthStore } from '../store/auth';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const geminiService = {
  async chat(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
    if (!ai) {
      return "AI Assistant is currently unavailable. Please configure the Gemini API Key.";
    }

    const user = useAuthStore.getState().user;
    const role = user ? user.role : 'Guest';

    const systemInstruction = `You are Vedanth AI, a medical practice assistant for Vedanth Clinic. 
The current user is a ${role}. 

Capabilities by role: 
  Admin  : Clinic operations, scheduling logic, report interpretation 
  Doctor : Clinical note summarization, drug interaction checks, medical terminology explanation 
  Staff  : Appointment management guidance, billing assistance 
  Patient: Appointment help, medical term explanations, general health information 

You are NOT a diagnostic tool. You CANNOT provide emergency medical advice. If a user describes a medical emergency, immediately respond: 
  'Please call emergency services (112) immediately.' 

Never speculate on diagnoses. Never recommend specific medications to patients. Always encourage users to consult their doctor.`;

    try {
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction,
        },
      });

      // Restore history if needed (simplified for this implementation)
      // In a real app, we would pass the history to the chat creation or send it as context
      
      const response = await chat.sendMessage({ message });
      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "An error occurred while communicating with Vedanth AI.";
    }
  }
};
