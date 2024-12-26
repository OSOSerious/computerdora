import { writable } from 'svelte/store';
import { csvConverter } from './csv-converter';

interface ScreenObserverState {
  timestamp: number;
  cursorPosition: { x: number, y: number };
  activeWindow: string;
  screenContent: string;
  capturedImage?: string;
}

export class ScreenObserverService {
  private observationHistory: ScreenObserverState[] = [];
  private state = writable<ScreenObserverState>({
    timestamp: Date.now(),
    cursorPosition: { x: 0, y: 0 },
    activeWindow: '',
    screenContent: '',
  });

  constructor() {
    this.initObservers();
  }

  private initObservers() {
    // Cursor tracking
    document.addEventListener('mousemove', (event) => {
      const newState: ScreenObserverState = {
        timestamp: Date.now(),
        cursorPosition: { x: event.clientX, y: event.clientY },
        activeWindow: this.getActiveWindowName(),
        screenContent: this.captureScreenContent()
      };

      this.updateState(newState);
      this.recordObservation(newState);
    });

    // Active window tracking
    this.trackActiveWindow();

    // Screen content capture
    this.captureScreenContent();
  }

  private getActiveWindowName(): string {
    // Placeholder for active window detection
    return document.title || 'Unknown Window';
  }

  private captureScreenContent(): string {
    // Basic screen content capture
    return document.body.innerText.slice(0, 500); // Limit to first 500 characters
  }

  private trackActiveWindow() {
    // TODO: Implement cross-platform active window detection
    // This will require platform-specific native bindings
  }

  private async captureScreenContentAsync() {
    // TODO: Implement screen capture using native APIs
    // Consider using electron-screenshot or platform-specific libraries
  }

  updateState(newState: Partial<ScreenObserverState>) {
    this.state.update(current => ({ ...current, ...newState }));
  }

  private recordObservation(observation: ScreenObserverState) {
    this.observationHistory.push(observation);
    
    // Optionally limit history size
    if (this.observationHistory.length > 1000) {
      this.observationHistory.shift();
    }
  }

  getState() {
    let currentState;
    this.state.subscribe(value => { currentState = value; })();
    return currentState;
  }

  // Method to capture screenshot
  async takeScreenshot() {
    // Placeholder for screenshot logic
    console.log('Taking screenshot...');
  }

  // Export observation history to CSV
  exportObservationsToCsv(filename: string = 'screen_observations.csv') {
    return csvConverter.convertScreenObservationToCSV(this.observationHistory);
  }

  // Clear observation history
  clearObservationHistory() {
    this.observationHistory = [];
  }
}

export const screenObserver = new ScreenObserverService();
