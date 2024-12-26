import type { LessonContent } from '../stores/lessons';

// Mock lesson data for development
const mockLessons: Record<string, LessonContent> = {
    '1': {
        id: '1',
        title: 'Basic Conversations',
        description: 'Learn everyday phrases and greetings',
        level: 'Beginner',
        sections: [
            {
                id: 'vocab-1',
                type: 'vocabulary',
                title: 'Essential Greetings',
                content: {
                    words: [
                        {
                            word: 'Hola',
                            translation: 'Hello',
                            example: 'Hola, ¿cómo estás?',
                            notes: 'Used as a friendly greeting any time of day'
                        },
                        {
                            word: 'Buenos días',
                            translation: 'Good morning',
                            example: 'Buenos días, ¿qué tal?',
                            notes: 'Used in the morning until noon'
                        }
                    ]
                }
            },
            {
                id: 'dialogue-1',
                type: 'dialogue',
                title: 'Morning Greetings',
                content: {
                    scenario: 'Two friends meeting in the morning',
                    exchanges: [
                        {
                            speaker: 'A',
                            text: 'Buenos días, ¿cómo estás?',
                            translation: 'Good morning, how are you?'
                        },
                        {
                            speaker: 'B',
                            text: 'Muy bien, gracias. ¿Y tú?',
                            translation: 'Very well, thanks. And you?'
                        }
                    ]
                }
            }
        ]
    },
    '2': {
        id: '2',
        title: 'Travel Essentials',
        description: 'Essential vocabulary for traveling',
        level: 'Intermediate',
        sections: [
            {
                id: 'vocab-1',
                type: 'vocabulary',
                title: 'Transportation',
                content: {
                    words: [
                        {
                            word: 'El tren',
                            translation: 'Train',
                            example: '¿A qué hora sale el tren?',
                            notes: 'Used for both subway and regular trains'
                        },
                        {
                            word: 'El aeropuerto',
                            translation: 'Airport',
                            example: '¿Cómo llego al aeropuerto?',
                            notes: 'Important for travel conversations'
                        }
                    ]
                }
            }
        ]
    }
};

export async function generateLessonContent(
    language: string,
    level: 'Beginner' | 'Intermediate' | 'Advanced',
    topic: string
): Promise<LessonContent> {
    // For development, return mock data
    const lessonId = topic === 'Basic Conversations' ? '1' : 
                    topic === 'Travel Essentials' ? '2' : '1';
                    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(mockLessons[lessonId]);
        }, 500); // Simulate network delay
    });
}

export async function checkExercise(
    question: any,
    userAnswer: string,
    language: string
): Promise<{
    isCorrect: boolean;
    feedback: string;
    score: number;
}> {
    // For development, provide mock feedback
    return new Promise((resolve) => {
        setTimeout(() => {
            const isCorrect = Math.random() > 0.5; // Randomly determine if answer is correct
            resolve({
                isCorrect,
                feedback: isCorrect 
                    ? '¡Excelente! Your answer is correct!' 
                    : 'Good try! Consider reviewing the lesson material.',
                score: isCorrect ? 1.0 : 0.5
            });
        }, 300);
    });
}
