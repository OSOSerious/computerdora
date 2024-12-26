import { writable } from 'svelte/store';

export interface VoiceSettings {
    language: string;
    voice: SpeechSynthesisVoice | null;
    pitch: number;
    rate: number;
    volume: number;
}

export interface RecordedAudio {
    blob: Blob;
    url: string;
    duration: number;
}

const SUPPORTED_LANGUAGES = {
    'es-ES': 'Spanish',
    'en-US': 'English',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-BR': 'Portuguese',
    'zh-CN': 'Chinese (Simplified)',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'ru-RU': 'Russian'
};

const defaultSettings: VoiceSettings = {
    language: 'es-ES',
    voice: null,
    pitch: 1,
    rate: 1,
    volume: 1
};

export const voiceSettings = writable<VoiceSettings>(defaultSettings);

class VoiceService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    constructor() {
        // Initialize voice settings when voices are loaded
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            this.updateVoice(defaultSettings.language);
        });
    }

    get supportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    async updateVoice(language: string) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === language) || voices.find(v => v.lang.startsWith(language.split('-')[0]));
        
        voiceSettings.update(settings => ({
            ...settings,
            language,
            voice
        }));
    }

    speak(text: string, settings: VoiceSettings): Promise<void> {
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            utterance.voice = settings.voice;
            utterance.pitch = settings.pitch;
            utterance.rate = settings.rate;
            utterance.volume = settings.volume;
            utterance.lang = settings.language;

            utterance.onend = () => resolve();
            utterance.onerror = (error) => reject(error);

            window.speechSynthesis.speak(utterance);
        });
    }

    async startRecording(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];

            this.mediaRecorder = new MediaRecorder(this.stream);
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('Failed to start recording');
        }
    }

    async stopRecording(): Promise<RecordedAudio> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No recording in progress'));
                return;
            }

            this.mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Get audio duration
                const audio = new Audio(audioUrl);
                audio.addEventListener('loadedmetadata', () => {
                    resolve({
                        blob: audioBlob,
                        url: audioUrl,
                        duration: audio.duration
                    });
                });
                audio.addEventListener('error', () => {
                    reject(new Error('Failed to load audio metadata'));
                });
            });

            this.mediaRecorder.stop();
            this.stream?.getTracks().forEach(track => track.stop());
        });
    }

    async enhanceSpeechRecognition(language: string): Promise<SpeechRecognition> {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        
        // Enhanced settings
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = language;

        // Add noise cancellation and enhancement if available
        if ('mediaDevices' in navigator) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                // Use the enhanced audio stream
                const audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(stream);
                
                // Add audio processing
                const processor = audioContext.createScriptProcessor(2048, 1, 1);
                source.connect(processor);
                processor.connect(audioContext.destination);
            } catch (error) {
                console.warn('Enhanced audio features not available:', error);
            }
        }

        return recognition;
    }
}

export const voiceService = new VoiceService();
