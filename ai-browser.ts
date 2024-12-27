import { writable } from 'svelte/store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class AIService {
  private messages = writable<Message[]>([]);
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(content: string): Promise<void> {
    // Add user message
    this.messages.update(msgs => [...msgs, { role: 'user', content }]);

    try {
      const response = await fetch('https://api.groq.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
          model: 'mixtral-8x7b-32768',
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      // Add assistant message
      this.messages.update(msgs => [...msgs, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  getMessages() {
    return this.messages;
  }

  clearMessages() {
    this.messages.set([]);
  }
}

// Use the PUBLIC_ prefixed environment variable for client-side code
export const aiService = new AIService(import.meta.env.PUBLIC_GROQ_API_KEY || '');
