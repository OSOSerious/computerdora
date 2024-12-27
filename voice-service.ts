import { writable } from 'svelte/store';

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
}

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private state = writable<VoiceState>({
    isListening: false,
    isSpeaking: false,
    error: null
  });

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize speech recognition
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
      }

      // Initialize speech synthesis
      this.synthesis = window.speechSynthesis;
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.state.update(s => ({ ...s, isListening: true, error: null }));
    };

    this.recognition.onerror = (event) => {
      this.state.update(s => ({ ...s, error: event.error }));
    };

    this.recognition.onend = () => {
      this.state.update(s => ({ ...s, isListening: false }));
    };
  }

  startListening(onResult: (text: string) => void) {
    if (!this.recognition) {
      this.state.update(s => ({ ...s, error: 'Speech recognition not supported' }));
      return;
    }

    this.recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      onResult(text);
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  async speak(text: string) {
    if (!this.synthesis) {
      this.state.update(s => ({ ...s, error: 'Speech synthesis not supported' }));
      return;
    }

    this.state.update(s => ({ ...s, isSpeaking: true }));

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onend = () => {
        this.state.update(s => ({ ...s, isSpeaking: false }));
        resolve();
      };

      this.synthesis.speak(utterance);
    });
  }

  getState() {
    let currentState: VoiceState;
    this.state.subscribe(value => { currentState = value; })();
    return currentState;
  }
}

export const voiceService = new VoiceService();
