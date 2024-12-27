import { OpenAI } from 'openai';
import { config } from '$lib/config';
import type { ScreenContent, AIResponse } from '$lib/types';

class AIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }

  async analyzeContent(content: ScreenContent): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that analyzes text and provides insights. Be concise and focused in your responses.'
          },
          {
            role: 'user',
            content: `Analyze this ${content.type}: ${content.text}`
          }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 256,
        stream: false
      });

      return {
        content: response.choices[0].message.content || 'No response generated',
        type: 'text'
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to analyze content');
    }
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        messages,
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 512,
        stream: false
      });

      return {
        content: response.choices[0].message.content || 'No response generated',
        type: 'text'
      };
    } catch (error) {
      console.error('AI response error:', error);
      throw new Error('Failed to generate response');
    }
  }
}

export const aiService = new AIService();
