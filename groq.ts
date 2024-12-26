import type { Language } from '$lib/stores/language';
import { PUBLIC_GROQ_API_KEY } from '$env/static/public';

const GROQ_API_URL = 'https://api.groq.com/v1/chat/completions';
const FALLBACK_API_URL = 'https://api.openai.com/v1/chat/completions';

// Model configurations
const MODELS = {
  TRANSLATION: 'mixtral-8x7b-32768', // Best for translations due to multilingual capabilities
  CONVERSATION: 'mixtral-8x7b-32768', // Best for general conversation and explanations
  ANALYSIS: 'llama2-70b-4096',       // Good for in-depth analysis and complex reasoning
  QUICK_RESPONSE: 'gemma-7b-it',     // Fast responses for simple queries
} as const;

interface ChatOptions {
  mode?: 'conversation' | 'code' | 'translation' | 'exercise';
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface TranslationResponse {
  translation: string;
  definition?: string;
  error?: string;
}

// Rate limiting configuration
const RATE_LIMIT = 5000; // Groq's TPM limit
const RATE_WINDOW = 60000; // 1 minute in ms
let tokenUsage = 0;
let lastReset = Date.now();

function resetTokenUsage() {
  const now = Date.now();
  if (now - lastReset >= RATE_WINDOW) {
    tokenUsage = 0;
    lastReset = now;
  }
}

function checkRateLimit(estimatedTokens: number): number {
  resetTokenUsage();
  if (tokenUsage + estimatedTokens > RATE_LIMIT) {
    const remainingTime = RATE_WINDOW - (Date.now() - lastReset);
    return remainingTime;
  }
  tokenUsage += estimatedTokens;
  return 0;
}

async function withRateLimit<T>(
  estimatedTokens: number,
  fn: () => Promise<T>
): Promise<T> {
  const waitTime = checkRateLimit(estimatedTokens);
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return withRateLimit(estimatedTokens, fn);
  }
  return fn();
}

async function makeGroqRequest(messages: ChatMessage[]) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}) {
  const model = options.model || MODELS.CONVERSATION;
  
  try {
    const response = await makeGroqRequest(messages);
    
    return response;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

// Translation memory cache
const translationMemory = new Map<string, {
  translation: string;
  context: string;
  timestamp: number;
}>();

// Memory retention time (24 hours)
const MEMORY_RETENTION = 24 * 60 * 60 * 1000;

function getMemoryKey(text: string, fromLang: string, toLang: string): string {
  return `${text}:${fromLang}:${toLang}`;
}

function cleanupMemory() {
  const now = Date.now();
  for (const [key, value] of translationMemory.entries()) {
    if (now - value.timestamp > MEMORY_RETENTION) {
      translationMemory.delete(key);
    }
  }
}

export async function translateText(
  text: string, 
  fromLang: string = 'auto', 
  toLang: string = 'en',
  context: string = ''
): Promise<TranslationResponse> {
  if (!text?.trim()) {
    return { translation: '', definition: '', error: null };
  }

  // Clean up old memories periodically
  cleanupMemory();

  // Check translation memory
  const memoryKey = getMemoryKey(text, fromLang, toLang);
  const memorizedTranslation = translationMemory.get(memoryKey);
  
  if (memorizedTranslation && context === memorizedTranslation.context) {
    console.log('Using cached translation');
    return {
      translation: memorizedTranslation.translation,
      definition: '',
      error: null
    };
  }

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a translation assistant. Translate the given text from ${fromLang} to ${toLang}. Also provide a brief definition or explanation if the text contains any complex terms.`
      },
      {
        role: 'user',
        content: text
      }
    ];

    const response = await makeGroqRequest(messages);
    
    // Parse the response to extract translation and definition
    const parts = response.split('\n\nDefinition:');
    const result = {
      translation: parts[0].trim(),
      definition: parts[1]?.trim()
    };

    // Store in translation memory
    translationMemory.set(memoryKey, {
      translation: result.translation,
      context,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    return {
      translation: text,
      error: error instanceof Error ? error.message : 'Translation failed'
    };
  }
}

export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch('https://api.groq.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        voice: 'alloy',
        speed: 1.0
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Speech generation error:', error);
    throw error;
  }
}

export async function generateExplanation(text: string, language: Language): Promise<string> {
  return withRateLimit(100, async () => {
    const messages = [
      {
        role: 'system',
        content: `You are a language learning assistant. Provide a clear, concise explanation of the following text in ${language}. Focus on meaning, cultural context, and usage.`
      },
      { role: 'user', content: text }
    ];

    return chat(messages, {
      model: MODELS.ANALYSIS,
      temperature: 0.5,
      max_tokens: 150
    });
  });
}

export async function getQuickDefinition(word: string, language: Language): Promise<string> {
  return withRateLimit(50, async () => {
    const messages = [
      {
        role: 'system',
        content: `Provide a brief definition of the word in ${language}. Keep it concise and clear.`
      },
      { role: 'user', content: word }
    ];

    return chat(messages, {
      model: MODELS.QUICK_RESPONSE,
      temperature: 0.3,
      max_tokens: 50
    });
  });
}

interface CursorContext {
  position: { x: number; y: number };
  selectedText: string;
  elementType: string;
}

export async function cursorAIAssist(query: string, options: { context?: CursorContext } = {}) {
  return withRateLimit(100, async () => {
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant integrated into a cursor-based translation tool. 
        You help users understand text they hover over and can provide translations, definitions, and contextual information.
        Be concise and natural in your responses. Focus on being helpful and clear.`
      },
      {
        role: 'user',
        content: options.context ? 
          `Context: ${JSON.stringify(options.context)}\n\nQuery: ${query}` :
          query
      }
    ];

    return chat(messages, {
      model: MODELS.CONVERSATION,
      temperature: 0.5,
      max_tokens: 150
    });
  });
}

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese'
} as const;
