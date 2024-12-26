import { setTranslation } from '../stores/translationStore';

const GROQ_API_KEY = import.meta.env.PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export class TranslationService {
    private static async translate(text: string, targetLang: string): Promise<string> {
        try {
            const prompt = `Translate the following text to ${targetLang}. Only respond with the translation, no additional text:
${text}`;

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'mixtral-8x7b-32768',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional translator. Provide accurate and natural-sounding translations.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000,
                }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again in a moment.');
                }
                throw new Error(`Translation API error: ${response.status}`);
            }

            const data: GroqResponse = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Translation error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to translate text');
        }
    }

    public static async translateText(text: string, targetLang: string): Promise<void> {
        try {
            setTranslation({ isTranslating: true, error: null });
            const translatedText = await this.translate(text, targetLang);
            setTranslation({ 
                translatedText,
                isTranslating: false,
                sourceText: text,
                targetLanguage: targetLang
            });
        } catch (error) {
            setTranslation({ 
                isTranslating: false,
                error: error instanceof Error ? error.message : 'Translation failed'
            });
        }
    }
}
