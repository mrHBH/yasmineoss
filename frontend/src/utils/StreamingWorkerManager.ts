// Web Worker Manager for streaming operations
class StreamingWorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, { resolve: Function; reject: Function }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    // Disable worker for now due to setup complexity - use fallback methods
    console.log('StreamingWorkerManager: Using fallback methods (Web Worker disabled)');
    this.worker = null;
  }

  private postMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to main thread processing
        resolve(this.fallbackProcessing(type, data));
        return;
      }

      const messageId = ++this.messageId;
      this.pendingMessages.set(messageId, { resolve, reject });

      this.worker.postMessage({ type, data, messageId });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error('Worker timeout'));
        }
      }, 5000);
    });
  }

  async cleanupCache(cacheAccessTime: Record<string, number>, maxAge: number, maxEntries: number): Promise<string[]> {
    try {
      const result = await this.postMessage('CACHE_CLEANUP', {
        cacheAccessTime,
        maxAge,
        maxEntries
      });
      return result.keysToRemove || [];
    } catch (error) {
      console.warn('Cache cleanup worker failed, using fallback:', error);
      return this.fallbackCacheCleanup(cacheAccessTime, maxAge, maxEntries);
    }
  }

  async checkEntityStreaming(entities: any[], mainEntityPosition: any, disposalDistance: number, tileSize: number): Promise<number[]> {
    try {
      const entityData = entities.map(entity => ({
        id: entity.id,
        position: { x: entity.Position.x, y: entity.Position.y, z: entity.Position.z },
        name: entity.name,
        tileKey: entity._originTileKey
      }));

      const result = await this.postMessage('ENTITY_STREAMING', {
        entities: entityData,
        mainEntityPosition: { x: mainEntityPosition.x, y: mainEntityPosition.y, z: mainEntityPosition.z },
        disposalDistance,
        tileSize
      });
      return result.entitiesToDispose || [];
    } catch (error) {
      console.warn('Entity streaming worker failed, using fallback:', error);
      return this.fallbackEntityStreaming(entities, mainEntityPosition, disposalDistance);
    }
  }

  async calculateDistances(tiles: any[], playerPosition: any): Promise<Array<{tileKey: string, distance: number}>> {
    try {
      const result = await this.postMessage('DISTANCE_CALCULATIONS', {
        tiles: tiles.map(tile => ({ x: tile.x, z: tile.z, key: tile.key })),
        playerPosition: { x: playerPosition.x, z: playerPosition.z }
      });
      return result.results || [];
    } catch (error) {
      console.warn('Distance calculation worker failed, using fallback:', error);
      return this.fallbackDistanceCalculations(tiles, playerPosition);
    }
  }

  // Fallback methods for when worker is not available
  private fallbackProcessing(type: string, data: any): any {
    switch (type) {
      case 'CACHE_CLEANUP':
        return { keysToRemove: this.fallbackCacheCleanup(data.cacheAccessTime, data.maxAge, data.maxEntries) };
      case 'ENTITY_STREAMING':
        return { entitiesToDispose: this.fallbackEntityStreaming(data.entities, data.mainEntityPosition, data.disposalDistance) };
      case 'DISTANCE_CALCULATIONS':
        return { results: this.fallbackDistanceCalculations(data.tiles, data.playerPosition) };
      default:
        return {};
    }
  }

  private fallbackCacheCleanup(cacheAccessTime: Record<string, number>, maxAge: number, maxEntries: number): string[] {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (const [key, accessTime] of Object.entries(cacheAccessTime)) {
      if (now - accessTime > maxAge) {
        keysToRemove.push(key);
      }
    }
    
    return keysToRemove;
  }

  private fallbackEntityStreaming(entities: any[], mainEntityPosition: any, disposalDistance: number): number[] {
    const entitiesToDispose: number[] = [];
    
    // Add null checks and better error handling
    if (!entities || !Array.isArray(entities) || !mainEntityPosition) {
      console.warn('Invalid parameters for entity streaming fallback');
      return entitiesToDispose;
    }
    
    for (const entity of entities) {
      if (!entity || !entity.Position) {
        continue; // Skip invalid entities
      }
      
      try {
        const entityPos = entity.Position;
        const distance = Math.sqrt(
          Math.pow(entityPos.x - mainEntityPosition.x, 2) +
          Math.pow(entityPos.y - mainEntityPosition.y, 2) +
          Math.pow(entityPos.z - mainEntityPosition.z, 2)
        );
        
        if (distance > disposalDistance) {
          entitiesToDispose.push(entity.id);
        }
      } catch (error) {
        console.warn('Error processing entity in streaming fallback:', error, entity);
        continue;
      }
    }
    
    return entitiesToDispose;
  }

  private fallbackDistanceCalculations(tiles: any[], playerPosition: any): Array<{tileKey: string, distance: number}> {
    const results = [];
    
    for (const tile of tiles) {
      const distance = Math.sqrt(
        Math.pow(tile.x - playerPosition.x, 2) +
        Math.pow(tile.z - playerPosition.z, 2)
      );
      results.push({ tileKey: tile.key, distance });
    }
    
    return results;
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingMessages.clear();
  }
}

export { StreamingWorkerManager };