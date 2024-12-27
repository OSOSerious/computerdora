import { writable } from 'svelte/store';

interface InteractionData {
    type: 'cursor' | 'chat' | 'feedback';
    timestamp: number;
    data: any;
    metadata: {
        url: string;
        title: string;
        platform: string;
        browser: string;
        viewport: {
            width: number;
            height: number;
        };
    };
}

interface BatchConfig {
    maxSize: number;
    maxWaitTime: number;
}

class DataCollectionService {
    private static instance: DataCollectionService;
    private batchConfig: BatchConfig = {
        maxSize: 100,
        maxWaitTime: 5000 // 5 seconds
    };
    
    private currentBatch: InteractionData[] = [];
    private batchTimer: number | null = null;
    private apiEndpoint = 'http://localhost:8000/collect';
    private store = writable<InteractionData[]>([]);
    private processingBatch = false;
    private lastUpdate = Date.now();

    private constructor() {
        this.setupBatchProcessing();
        this.setupStorageListener();
    }

    public static getInstance(): DataCollectionService {
        if (!DataCollectionService.instance) {
            DataCollectionService.instance = new DataCollectionService();
        }
        return DataCollectionService.instance;
    }

    private async getPageMetadata() {
        const metadata = {
            url: window.location.href,
            title: document.title,
            platform: navigator.platform,
            browser: 'Chrome',
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        return metadata;
    }

    private setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.failedBatches) {
                this.retryFailedBatches();
            }
        });
    }

    private setupBatchProcessing() {
        // Use requestAnimationFrame for better performance
        const processBatch = () => {
            if (this.currentBatch.length >= this.batchConfig.maxSize || 
                (this.currentBatch.length > 0 && Date.now() - this.lastUpdate >= this.batchConfig.maxWaitTime)) {
                this.flushBatch();
            }
            this.batchTimer = requestAnimationFrame(processBatch);
        };
        
        this.batchTimer = requestAnimationFrame(processBatch);
    }

    private async flushBatch() {
        if (this.currentBatch.length === 0 || this.processingBatch) return;

        this.processingBatch = true;
        const batchToSend = [...this.currentBatch];
        this.currentBatch = [];

        try {
            // Send to background script to handle cross-origin requests
            chrome.runtime.sendMessage({
                type: 'send_batch',
                batch: batchToSend
            }, async (response) => {
                if (response.success) {
                    // Update store
                    this.store.update(data => [...data, ...batchToSend]);
                } else {
                    // Store failed batch
                    await this.storeFailedBatch(batchToSend);
                }
                this.processingBatch = false;
            });
        } catch (error) {
            console.error('Error sending batch:', error);
            await this.storeFailedBatch(batchToSend);
            this.processingBatch = false;
        }
    }

    private async storeFailedBatch(batch: InteractionData[]) {
        const timestamp = Date.now();
        await chrome.storage.local.set({
            [`failed_batch_${timestamp}`]: {
                timestamp,
                data: batch
            }
        });
    }

    public async logInteraction(type: 'cursor' | 'chat' | 'feedback', data: any) {
        const metadata = await this.getPageMetadata();
        
        const interaction: InteractionData = {
            type,
            timestamp: Date.now(),
            data,
            metadata
        };

        // Add to current batch
        this.currentBatch.push(interaction);
        this.lastUpdate = Date.now();
    }

    public async logCursorMovement(position: { x: number; y: number }, element: Element | null) {
        const elementData = element ? {
            tag: element.tagName.toLowerCase(),
            classes: Array.from(element.classList),
            id: element.id,
            text: element.textContent?.trim().substring(0, 100),
            attributes: this.getElementAttributes(element)
        } : null;

        await this.logInteraction('cursor', {
            cursorPosition: position,
            element: elementData,
            context: this.getContextualText(element)
        });
    }

    private getElementAttributes(element: Element): Record<string, string> {
        const attributes: Record<string, string> = {};
        const safeAttributes = ['id', 'class', 'role', 'aria-label', 'type', 'name'];
        
        for (const attr of element.attributes) {
            if (safeAttributes.includes(attr.name)) {
                attributes[attr.name] = attr.value;
            }
        }
        return attributes;
    }

    private getContextualText(element: Element | null): string {
        if (!element) return '';

        // Get surrounding text content safely
        const range = 100; // characters
        const fullText = element.textContent || '';
        const cursorIndex = fullText.length / 2;

        const start = Math.max(0, cursorIndex - range);
        const end = Math.min(fullText.length, cursorIndex + range);

        return fullText.substring(start, end);
    }

    public async logChatInteraction(userMessage: string, assistantMessage: string) {
        await this.logInteraction('chat', {
            userMessage,
            assistantMessage,
            timestamp: Date.now()
        });
    }

    public async logFeedback(rating: number, category: string, comment: string) {
        await this.logInteraction('feedback', {
            rating,
            category,
            comment,
            timestamp: Date.now()
        });
    }

    public async retryFailedBatches() {
        if (this.processingBatch) return;

        const storage = await chrome.storage.local.get(null);
        const failedBatches = Object.entries(storage)
            .filter(([key]) => key.startsWith('failed_batch_'))
            .sort(([a], [b]) => parseInt(a.split('_')[2]) - parseInt(b.split('_')[2]));

        for (const [key, batch] of failedBatches) {
            if (this.processingBatch) break;

            try {
                chrome.runtime.sendMessage({
                    type: 'send_batch',
                    batch: batch.data
                }, async (response) => {
                    if (response.success) {
                        // Remove successful batch
                        await chrome.storage.local.remove(key);
                        // Update store
                        this.store.update(data => [...data, ...batch.data]);
                    }
                });
            } catch (error) {
                console.error('Error retrying batch:', error);
            }
        }
    }

    public destroy() {
        if (this.batchTimer !== null) {
            cancelAnimationFrame(this.batchTimer);
        }
        this.flushBatch();
    }
}

export const dataCollectionService = DataCollectionService.getInstance();
