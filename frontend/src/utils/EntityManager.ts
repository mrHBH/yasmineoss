import * as THREE from "three";
import { Entity } from "./Entity.ts";
import { MainController } from "./MainController.ts";
import { STREAMING_CONSTANTS } from "./StreamingConstants";

class EntityManager {
    _ids: number;
    _entities: Entity[];
    _entitiesMap: Map<number, Entity>;
    _mc: MainController;

    // Entity streaming state
    private _streamedEntityStates: Map<string, any[]> = new Map(); // tileKey -> array of entity states
    private _streamingCheckInterval: number = STREAMING_CONSTANTS.ENTITY_STREAMING_CHECK_INTERVAL; // ms
    private _lastStreamingCheck: number = 0;
    
    // Entity restoration batching to prevent stutters
    private _entityRestorationQueue: Array<{tileKey: string, entityState: any}> = [];
    private _isProcessingRestorationQueue: boolean = false;
    private _lastRestorationTime: number = 0;
    private _entitiesBeingRestored: Set<string> = new Set(); // Track entities being restored
    
    // Streaming configuration - update this to match your streaming world tile size
    private static readonly STREAMING_TILE_SIZE = STREAMING_CONSTANTS.ENTITY_STREAMING_TILE_SIZE;
    private static readonly DISPOSAL_DISTANCE_MULTIPLIER = STREAMING_CONSTANTS.ENTITY_DISPOSAL_DISTANCE_MULTIPLIER; // Entities disposed at 1x tile size
    private static readonly RESTORE_DISTANCE_MULTIPLIER = STREAMING_CONSTANTS.ENTITY_RESTORE_DISTANCE_MULTIPLIER; // Entities restored at 1x tile size

    
    constructor() {
        this._ids = 0;
        this._entities = [];
        this._entitiesMap = new Map<number, Entity>();

       
    }

    get Entities() {
        return this._entities;
    }

    async AddEntity(entity: Entity , name: string, makeStreamable: boolean = true) {
        //check if entity with the same name already exists
        let existingEntity = this._entities.find(e => e._name === name);
        if (existingEntity) {
            console.log("Entity with name", name, "already exists");
            return -1;
        }
        entity._name = name;
        entity.id = this._ids;          
        this._entities.push(entity);
        entity._entityManager = this;
        this._entitiesMap.set(this._ids, entity);
        this._ids++;
        
        // Automatically register for streaming unless explicitly disabled
        if (makeStreamable && !entity._isStreamedEntity) {
            this.registerStreamedEntity(entity, entity.Position);
        }
        
        await entity.Initialize();
    }

    async RemoveEntity(entity: Entity) {
       await entity.Destroy().then(() => {
            this._entities = this._entities.filter(e => e !== entity);
            this._entitiesMap.delete(entity.id);
        }
        );
    }
 
    Update(deltaTime: number) {
        // Process entity restoration queue in batches to prevent stutters
        this.processEntityRestorationQueue();

        // Schedule each entity's update as a microtask, allowing the main thread to remain responsive
        this._entities.forEach(entity => {
            if (entity.alive) {
                // queueMicrotask(() => {
                //     entity.Update(deltaTime).catch(err => {
                //         console.error("Error during entity update:", err);
                //     });
                // });
                entity.Update(deltaTime).catch(err => {
                    console.error("Error during entity update:", err);
                });
            }

            else {
                queueMicrotask(() => {
                    entity.Destroy().catch(err => {
                        console.error("Error during entity destruction:", err);
                    }).then(() => {
                        //get the entity id
                        
                        this._entities = this._entities.filter(e => e !== entity);
                        this._entitiesMap.delete(entity.id);
                    }   );
                   

                       
                });
            }
        });
        // Now the updates are scheduled but not awaited here, allowing the rest of your game loop to continue
        
        // Check for entity streaming
        this.updateEntityStreaming();
    }

    private updateEntityStreaming(): void {
        const now = Date.now();
        if (now - this._lastStreamingCheck < this._streamingCheckInterval) {
            return;
        }
        this._lastStreamingCheck = now;

        if (!this._mc) {
            return;
        }
        // use MainEntity if set, otherwise fallback to camera position
        const mainEntityPos = this._mc.MainEntity ? this._mc.MainEntity.Position : this._mc.camera.position;

    // Check for entities that should be disposed
    const entitiesToDispose: Entity[] = [];
        for (const entity of this._entities) {
            if (entity.shouldBeDisposed(mainEntityPos) && !this._entitiesBeingRestored.has(entity.name)) {
                entitiesToDispose.push(entity);
            }
        }

        // Dispose entities and save their states
        for (const entity of entitiesToDispose) {
            this.disposeStreamedEntity(entity);
        }

        // Log disposal stats
        this.finishEntityDisposal(entitiesToDispose);

        // Check if we need to restore entities for nearby tiles
        this.restoreEntitiesForNearbyTiles(mainEntityPos);
    }

    private disposeStreamedEntity(entity: Entity): void {
        const tileKey = entity.getOriginTileKey();
        if (!tileKey) return;

        // Remove from restoration tracking if it was being restored
        this._entitiesBeingRestored.delete(entity.name);

        // Save entity state
        const entityState = entity.saveEntityState();
        
        if (!this._streamedEntityStates.has(tileKey)) {
            this._streamedEntityStates.set(tileKey, []);
        }
        
        const tileStates = this._streamedEntityStates.get(tileKey)!;
        // Check if we already have state for this entity (by name)
        const existingIndex = tileStates.findIndex(state => state.name === entity.name);
        if (existingIndex >= 0) {
            tileStates[existingIndex] = entityState;
        } else {
            tileStates.push(entityState);
        }

        console.log(`Disposing streamed entity ${entity.name} from tile ${tileKey}`);
        
        // Remove entity immediately but handle cleanup gracefully
        this.RemoveEntity(entity);
    }

    private finishEntityDisposal(entitiesToDispose: Entity[]): void {
        // Only log if entities were actually disposed
        if (entitiesToDispose.length > 0) {
            console.log(`Entity Streaming: Disposed ${entitiesToDispose.length} entities. Total cached tiles: ${this._streamedEntityStates.size}`);
        }
    }

    private restoreEntitiesForNearbyTiles(mainEntityPos: THREE.Vector3): void {
        const TILE_SIZE = EntityManager.STREAMING_TILE_SIZE;
        
        // Calculate which tiles are nearby
        const baseTilePos = mainEntityPos.clone();
        baseTilePos.divideScalar(TILE_SIZE);
        baseTilePos.round();
        baseTilePos.multiplyScalar(TILE_SIZE);

        const NUM_TILES = STREAMING_CONSTANTS.ENTITY_NUM_TILES; // Smaller range than visual tiles
        for (let x = -NUM_TILES; x <= NUM_TILES; x++) {
            for (let z = -NUM_TILES; z <= NUM_TILES; z++) {
                const offset = new THREE.Vector3(x, 0, z);
                offset.multiplyScalar(TILE_SIZE);
                const tilePos = baseTilePos.clone().add(offset);
                const tileKey = tilePos.x + '/' + tilePos.z;
                
                // Check if this tile has saved entities and we're close enough
                if (this._streamedEntityStates.has(tileKey)) {
                    const distance = mainEntityPos.distanceTo(tilePos);
                    if (distance <= TILE_SIZE * EntityManager.RESTORE_DISTANCE_MULTIPLIER) {
                        this.queueEntityRestoration(tileKey);
                    }
                }
            }
        }
    }

    private queueEntityRestoration(tileKey: string): void {
        const entityStates = this._streamedEntityStates.get(tileKey);
        if (!entityStates) return;

        // Check if we already have queued restoration for this tile
        const alreadyQueued = this._entityRestorationQueue.some(item => item.tileKey === tileKey);
        if (alreadyQueued) return;

        // Queue all entities from this tile for restoration
        for (const entityState of entityStates) {
            // Check if entity with this name already exists or is being restored
            const existingEntity = this._entities.find(e => e._name === entityState.name);
            const beingRestored = this._entitiesBeingRestored.has(entityState.name);
            if (!existingEntity && !beingRestored) {
                this._entityRestorationQueue.push({ tileKey, entityState });
            }
        }

        console.log(`Queued ${entityStates.length} entities for restoration from tile ${tileKey}`);
    }

    private processEntityRestorationQueue(): void {
        const now = Date.now();
        
        // Skip if we're already processing or haven't waited long enough between batches
        if (this._isProcessingRestorationQueue || 
            (now - this._lastRestorationTime < STREAMING_CONSTANTS.ENTITY_RESTORATION_FRAME_DELAY)) {
            return;
        }

        if (this._entityRestorationQueue.length === 0) {
            return;
        }

        this._isProcessingRestorationQueue = true;
        this._lastRestorationTime = now;

        // Process a batch of entities
        const batchSize = STREAMING_CONSTANTS.MAX_ENTITIES_RESTORED_PER_FRAME;
        const batch = this._entityRestorationQueue.splice(0, batchSize);

        // Process batch asynchronously to prevent blocking
        queueMicrotask(async () => {
            try {
                const restoredTiles = new Set<string>();
                
                for (const { tileKey, entityState } of batch) {
                    await this.restoreEntity(entityState);
                    restoredTiles.add(tileKey);
                }

                // Clean up restored tile states
                for (const tileKey of restoredTiles) {
                    // Only remove if all entities from this tile have been processed
                    const remainingFromTile = this._entityRestorationQueue.filter(item => item.tileKey === tileKey);
                    if (remainingFromTile.length === 0) {
                        this._streamedEntityStates.delete(tileKey);
                    }
                }

                if (batch.length > 0) {
                    console.log(`Restored batch of ${batch.length} entities. Queue remaining: ${this._entityRestorationQueue.length}`);
                }
            } catch (error) {
                console.error("Error processing entity restoration queue:", error);
            } finally {
                this._isProcessingRestorationQueue = false;
            }
        });
    }

    private async restoreEntity(entityState: any): Promise<void> {
        // Track entity being restored to prevent disposal during restoration
        this._entitiesBeingRestored.add(entityState.name);
        
        try {
            // Create new entity and restore its state
            const entity = new Entity();
            await entity.restoreEntityState(entityState);
            
            // Add to entity manager first (before component loading to prevent duplicates)
            entity.id = this._ids;          
            this._entities.push(entity);
            entity._entityManager = this;
            this._entitiesMap.set(this._ids, entity);
            this._ids++;
            
            // Recreate components based on stored creation info (non-blocking)
            if (STREAMING_CONSTANTS.ASYNC_COMPONENT_LOADING) {
                // Load components asynchronously without awaiting
                this.recreateEntityComponentsAsync(entity, entityState.componentCreationInfo || [])
                    .then(async () => {
                        // Initialize and restore after components are loaded
                        await entity.Initialize();
                        await entity.restoreComponentStates();
                        
                        // For CharacterComponent, ensure physics and UI are properly setup
                        const charComponent = entity.getComponent('CharacterComponent') as any;
                        if (charComponent && typeof charComponent.isFullyLoaded === 'function') {
                            // Wait a bit for async loading to complete
                            const waitForFullLoad = () => {
                                if (charComponent.isFullyLoaded()) {
                                    console.log(`Entity ${entity.name} fully loaded and ready`);
                                    // Remove from restoration tracking
                                    this._entitiesBeingRestored.delete(entity.name);
                                } else {
                                    setTimeout(waitForFullLoad, 50);
                                }
                            };
                            setTimeout(waitForFullLoad, 50);
                        } else {
                            // Remove from restoration tracking for non-character entities
                            this._entitiesBeingRestored.delete(entity.name);
                        }
                    })
                    .catch(error => {
                        console.error(`Error loading components for entity ${entity.name}:`, error);
                        // Remove from restoration tracking even on error
                        this._entitiesBeingRestored.delete(entity.name);
                    });
            } else {
                await this.recreateEntityComponents(entity, entityState.componentCreationInfo || []);
                await entity.Initialize();
                await entity.restoreComponentStates();
                // Remove from restoration tracking
                this._entitiesBeingRestored.delete(entity.name);
            }
        } catch (error) {
            console.error(`Error restoring entity ${entityState.name}:`, error);
            // Remove from restoration tracking even on error
            this._entitiesBeingRestored.delete(entityState.name);
        }
    }

    private async recreateEntityComponents(entity: Entity, componentCreationInfo: any[]): Promise<void> {
        // Import components dynamically to avoid circular dependencies
        for (const compInfo of componentCreationInfo) {
            let component = null;
            
            try {
                switch (compInfo.type) {
                    case 'CharacterComponent':
                        const { CharacterComponent } = await import("./Components/CharacterComponent.ts");
                        component = new CharacterComponent(compInfo.config);
                        break;
                    case 'AIInput':
                        const { AIInput } = await import("./Components/AIInput");
                        component = new AIInput();
                        break;
                    case 'KeyboardInput':
                        const { KeyboardInput } = await import("./Components/KeyboardInput");
                        component = new KeyboardInput();
                        break;
                    case 'CarComponent':
                        const { CarComponent } = await import("./Components/CarComponent");
                        component = new CarComponent(compInfo.config);
                        break;
                    case 'AudioComponent':
                        const { AudioComponent } = await import("./Components/AudioComponent");
                        component = new AudioComponent(compInfo.config?.audioConfig, compInfo.config?.visualizerConfig);
                        break;
                
                    default:
                        console.warn(`Unknown component type: ${compInfo.type}`);
                        continue;
                }
                
                if (component) {
                    await entity.AddComponent(component);
                }
            } catch (error) {
                console.error(`Failed to recreate component ${compInfo.type}:`, error);
            }
        }
    }

    private async recreateEntityComponentsAsync(entity: Entity, componentCreationInfo: any[]): Promise<void> {
        // Process components in smaller batches to prevent blocking
        const batchSize = 1; // Create one component at a time
        
        for (let i = 0; i < componentCreationInfo.length; i += batchSize) {
            const batch = componentCreationInfo.slice(i, i + batchSize);
            
            // Process this batch
            for (const compInfo of batch) {
                let component = null;
                
                try {
                    switch (compInfo.type) {
                        case 'CharacterComponent':
                            const { CharacterComponent } = await import("./Components/CharacterComponent.ts");
                            component = new CharacterComponent(compInfo.config);
                            break;
                        case 'AIInput':
                            const { AIInput } = await import("./Components/AIInput");
                            component = new AIInput();
                            break;
                        case 'KeyboardInput':
                            const { KeyboardInput } = await import("./Components/KeyboardInput");
                            component = new KeyboardInput();
                            break;
                        case 'CarComponent':
                            const { CarComponent } = await import("./Components/CarComponent");
                            component = new CarComponent(compInfo.config);
                            break;
                        case 'AudioComponent':
                            const { AudioComponent } = await import("./Components/AudioComponent");
                            component = new AudioComponent(compInfo.config?.audioConfig, compInfo.config?.visualizerConfig);
                            break;
                    
                        default:
                            console.warn(`Unknown component type: ${compInfo.type}`);
                            continue;
                    }
                    
                    if (component) {
                        await entity.AddComponent(component);
                    }
                } catch (error) {
                    console.error(`Failed to recreate component ${compInfo.type}:`, error);
                }
            }
            
            // Yield control to prevent blocking the main thread
            if (i + batchSize < componentCreationInfo.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    }

    // Utility method to register an entity for tile streaming
    registerStreamedEntity(entity: Entity, position: THREE.Vector3): void {
        const TILE_SIZE = EntityManager.STREAMING_TILE_SIZE;
        const tilePos = position.clone();
        tilePos.divideScalar(TILE_SIZE);
        tilePos.round();
        tilePos.multiplyScalar(TILE_SIZE);
        const tileKey = tilePos.x + '/' + tilePos.z;
        
        entity.setOriginTile(tileKey, true);
        entity._maxDistanceFromMainEntity = TILE_SIZE * EntityManager.DISPOSAL_DISTANCE_MULTIPLIER;
    }

    // Helper method to store component creation info for streaming entities
    storeComponentCreationInfo(entity: Entity, componentInfos: Array<{type: string, config: any}>): void {
        entity._componentCreationInfo = componentInfos;
    }

    // Clear restoration tracking for entities that may have gotten stuck
    public clearRestorationTracking(): void {
        console.log(`Clearing restoration tracking for ${this._entitiesBeingRestored.size} entities`);
        this._entitiesBeingRestored.clear();
    }

    // Get status of entity streaming
    public getStreamingStats(): any {
        return {
            entitiesBeingRestored: this._entitiesBeingRestored.size,
            restorationQueueLength: this._entityRestorationQueue.length,
            cachedTiles: this._streamedEntityStates.size,
            totalEntities: this._entities.length
        };
    }
}


export { EntityManager };
