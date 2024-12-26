import Groq from 'groq-sdk';
import { writable } from 'svelte/store';

// Create a Groq client with the provided API key
const groq = new Groq({
  apiKey: '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'
});

export class AIService {
  // Store for conversation history
  private conversationHistory = writable<{role: string, content: string}[]>([
    {
      role: 'system', 
      content: 'You are a helpful AI assistant that provides context-aware insights about the user\'s screen and cursor interactions.'
    }
  ]);

  // Chat method with enhanced error handling and streaming support
  async chat(userMessage: string, options: {
    model?: string, 
    temperature?: number, 
    maxTokens?: number
  } = {}) {
    const {
      model = 'llama3-8b-8192', 
      temperature = 0.7, 
      maxTokens = 1024
    } = options;

    try {
      // Update conversation history
      this.conversationHistory.update(history => [
        ...history, 
        { role: 'user', content: userMessage }
      ]);

      // Prepare messages for Groq API
      let messages;
      this.conversationHistory.subscribe(history => { messages = history; })();

      // Create chat completion
      const chatCompletion = await groq.chat.completions.create({
        messages: messages,
        model: model,
        temperature: temperature,
        max_tokens: maxTokens
      });

      // Extract assistant's response
      const assistantResponse = chatCompletion.choices[0]?.message?.content || '';

      // Update conversation history with assistant's response
      this.conversationHistory.update(history => [
        ...history, 
        { role: 'assistant', content: assistantResponse }
      ]);

      return assistantResponse;
    } catch (error) {
      console.error('Groq API Error:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  // Extract contextual information about the current screen and cursor
  async extractContextualInfo() {
    try {
      const screenState = await this.getScreenState();
      
      const contextPrompt = `
        Analyze the following screen context:
        - Timestamp: ${screenState.timestamp}
        - Cursor Position: (${screenState.cursorPosition.x}, ${screenState.cursorPosition.y})
        - Active Window: ${screenState.activeWindow}
        - Screen Content Snippet: ${screenState.screenContent}

        Provide a concise, insightful summary of the context, highlighting any potential areas of interest or actionable insights.
      `;

      return await this.chat(contextPrompt, { 
        temperature: 0.5,
        maxTokens: 256 
      });
    } catch (error) {
      console.error('Context extraction error:', error);
      return 'Unable to extract contextual information.';
    }
  }

  // Simulate getting screen state (replace with actual implementation)
  private async getScreenState() {
    return {
      timestamp: Date.now(),
      cursorPosition: { x: 0, y: 0 },
      activeWindow: 'Unknown',
      screenContent: 'No content captured'
    };
  }

  // Generate market research insights based on screen content
  async generateMarketResearch(content: string) {
    const researchPrompt = `
      Perform a market research analysis on the following content:
      ${content}

      Provide insights including:
      - Potential market trends
      - Competitive landscape
      - Emerging opportunities
      - Potential challenges
    `;

    return await this.chat(researchPrompt, {
      temperature: 0.7,
      maxTokens: 512
    });
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory.set([
      {
        role: 'system', 
        content: 'You are a helpful AI assistant that provides context-aware insights about the user\'s screen and cursor interactions.'
      }
    ]);
  }
}

// Export a singleton instance
export const aiService = new AIService();
