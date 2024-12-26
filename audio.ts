interface AudioResponse {
    text: string;
    error?: string;
}

export class AudioService {
    private static readonly API_URL = 'https://api.groq.com/openai/v1';
    private static readonly API_KEY = import.meta.env.VITE_GROQ_API_KEY;

    static async transcribeAudio(audioBlob: Blob, language?: string): Promise<AudioResponse> {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('model', 'whisper-large-v3');
            
            if (language) {
                formData.append('language', language);
            }

            const response = await fetch(`${this.API_URL}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                text: data.text
            };
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return {
                text: '',
                error: 'Failed to transcribe audio. Please try again.'
            };
        }
    }

    static async translateAudio(audioBlob: Blob): Promise<AudioResponse> {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('model', 'whisper-large-v3');

            const response = await fetch(`${this.API_URL}/audio/translations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Translation failed: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                text: data.text
            };
        } catch (error) {
            console.error('Error translating audio:', error);
            return {
                text: '',
                error: 'Failed to translate audio. Please try again.'
            };
        }
    }

    static async startRecording(): Promise<MediaRecorder | null> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            return mediaRecorder;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            return null;
        }
    }

    static async stopRecording(mediaRecorder: MediaRecorder): Promise<Blob> {
        return new Promise((resolve) => {
            const chunks: BlobPart[] = [];
            
            mediaRecorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                resolve(blob);
            };
            
            mediaRecorder.stop();
        });
    }
}
