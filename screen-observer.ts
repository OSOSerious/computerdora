import { writable } from 'svelte/store';
import type { CursorPosition, ScreenContent } from '$lib/types';
import { aiService } from './ai';

interface ElementInfo {
  tag: string;
  classes: string[];
  id: string;
  text: string | null;
}

export class ScreenObserverService {
  public cursorPosition = writable<CursorPosition>({ x: 0, y: 0 });
  public screenContent = writable<ScreenContent | null>(null);
  private isTracking = false;
  private throttleTimeout: number | null = null;
  private lastEvent: MouseEvent | null = null;
  private readonly THROTTLE_MS = 16; // ~60fps
  private isTrackingEnabled = true;

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;
    
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleResize);

    // Initial position
    const event = new MouseEvent('mousemove', {
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    });
    this.handleMouseMove(event);
  }

  stopTracking() {
    if (!this.isTracking) return;
    this.isTracking = false;

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.isTrackingEnabled) return;

    this.lastEvent = event;
    if (this.throttleTimeout) return;

    this.throttleTimeout = window.setTimeout(() => {
      if (!this.lastEvent) return;

      const { clientX, clientY } = this.lastEvent;
      this.cursorPosition.set({
        x: clientX,
        y: clientY
      });

      // Get text content under cursor
      const element = document.elementFromPoint(clientX, clientY);
      if (element) {
        const elementInfo = this.getElementInfo(element);
        this.screenContent.set({
          text: elementInfo.text || '',
          element: elementInfo
        });
      }

      this.throttleTimeout = null;
    }, this.THROTTLE_MS);
  };

  private handleScroll = () => {
    if (this.lastEvent) {
      this.handleMouseMove(this.lastEvent);
    }
  };

  private handleResize = () => {
    if (this.lastEvent) {
      this.handleMouseMove(this.lastEvent);
    }
  };

  private getElementInfo(element: Element): ElementInfo {
    return {
      tag: element.tagName.toLowerCase(),
      classes: Array.from(element.classList),
      id: element.id,
      text: element.textContent?.trim() || null
    };
  }

  toggleTracking(enabled: boolean) {
    this.isTrackingEnabled = enabled;
  }

  getCursorPosition() {
    return this.cursorPosition;
  }

  getScreenContent() {
    return this.screenContent;
  }
}

export const screenObserver = new ScreenObserverService();
