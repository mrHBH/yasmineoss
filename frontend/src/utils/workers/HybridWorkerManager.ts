/**
 * Manager for the Hybrid Worker
 * Handles communication with the web worker and batching of requests
 */

interface WorkerRequest {
    id: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
}

export class HybridWorkerManager {
    private worker: Worker;
    private pendingRequests: Map<string, WorkerRequest> = new Map();
    private requestCounter = 0;
    private isInitialized = false;
    private objectBatch: any[] = [];
    private batchTimeout: number | null = null;
    private readonly BATCH_DELAY = 8; // Batch requests every ~8ms for 120fps
    private readonly MAX_BATCH_SIZE = 50;

    constructor() {
        this.initWorker();
    }

    private async initWorker(): Promise<void> {
        try {
            // Create worker from the worker file
            this.worker = new Worker('/src/utils/workers/hybridWorker.js');
            
            this.worker.onmessage = (e) => {
                const { type, data, requestId } = e.data;
                
                if (type === 'error') {
                    console.error('Hybrid Worker Error:', data);
                    const request = this.pendingRequests.get(requestId);
                    if (request) {
                        request.reject(new Error(data.error));
                        this.pendingRequests.delete(requestId);
                    }
                    return;
                }

                const request = this.pendingRequests.get(requestId);
                if (request) {
                    request.resolve(data);
                    this.pendingRequests.delete(requestId);
                }
            };

            this.worker.onerror = (error) => {
                console.error('Hybrid Worker Error:', error);
                // Reject all pending requests
                this.pendingRequests.forEach(request => {
                    request.reject(error);
                });
                this.pendingRequests.clear();
            };

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Hybrid Worker:', error);
            this.isInitialized = false;
        }
    }

    private generateRequestId(): string {
        return `req_${++this.requestCounter}_${Date.now()}`;
    }

    private sendMessage(type: string, data: any): Promise<any> {
        if (!this.isInitialized) {
            return Promise.reject(new Error('Worker not initialized'));
        }

        return new Promise((resolve, reject) => {
            const requestId = this.generateRequestId();
            
            this.pendingRequests.set(requestId, {
                id: requestId,
                resolve,
                reject,
                timestamp: performance.now()
            });

            // Clean up old requests (older than 5 seconds)
            this.cleanupOldRequests();

            this.worker.postMessage({
                type,
                data,
                requestId
            });
        });
    }

    private cleanupOldRequests(): void {
        const now = performance.now();
        const TIMEOUT = 5000; // 5 seconds

        this.pendingRequests.forEach((request, id) => {
            if (now - request.timestamp > TIMEOUT) {
                request.reject(new Error('Request timeout'));
                this.pendingRequests.delete(id);
            }
        });
    }

    // Add object to batch for processing
    public addObjectToBatch(objectData: any): void {
        this.objectBatch.push(objectData);

        // Process batch if it's full or start timer for partial batch
        if (this.objectBatch.length >= this.MAX_BATCH_SIZE) {
            this.processBatch();
        } else if (!this.batchTimeout) {
            this.batchTimeout = window.setTimeout(() => {
                this.processBatch();
            }, this.BATCH_DELAY);
        }
    }

    // Process current batch
    private async processBatch(): Promise<any> {
        if (this.objectBatch.length === 0) return null;

        // Clear timeout since we're processing now
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        const batch = [...this.objectBatch];
        this.objectBatch = [];

        try {
            return await this.sendMessage('processBatch', {
                objects: batch,
                timestamp: performance.now()
            });
        } catch (error) {
            console.error('Batch processing failed:', error);
            return null;
        }
    }

    // Force process current batch immediately
    public async flushBatch(): Promise<any> {
        return this.processBatch();
    }

    // Process mode switching decisions for multiple objects
    public async processObjectsBatch(objects: any[], camera: any): Promise<any> {
        try {
            return await this.sendMessage('processBatch', {
                objects,
                camera: {
                    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                    quaternion: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }
                },
                timestamp: performance.now()
            });
        } catch (error) {
            console.error('Objects batch processing failed:', error);
            return null;
        }
    }

    // Calculate 2D transforms for objects
    public async calculate2DTransforms(objects: any[], camera: any, viewProjectionMatrix: number[], width: number, height: number): Promise<any> {
        try {
            return await this.sendMessage('calculate2DTransforms', {
                objects,
                camera: {
                    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                    quaternion: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }
                },
                viewProjectionMatrix: Array.from(viewProjectionMatrix),
                width,
                height
            });
        } catch (error) {
            console.error('2D transforms calculation failed:', error);
            return null;
        }
    }

    // Check if worker is available
    public isAvailable(): boolean {
        return this.isInitialized;
    }

    // Get pending requests count for debugging
    public getPendingRequestsCount(): number {
        return this.pendingRequests.size;
    }

    // Terminate worker
    public terminate(): void {
        if (this.worker) {
            this.worker.terminate();
        }
        this.pendingRequests.clear();
        this.isInitialized = false;
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }
}

// Singleton instance
export const hybridWorkerManager = new HybridWorkerManager();
