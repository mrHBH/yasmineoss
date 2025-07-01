import * as THREE from "three";
import { Entity } from "./Entity.ts";
import { MainController } from "./MainController.ts";

class EntityManager {
    _ids: number;
    _entities: Entity[];
    _entitiesMap:   Map<number, Entity>;
    _mc: MainController;

    // Entity streaming state
    private _streamedEntityStates: Map<string, any[]> = new Map(); // tileKey -> array of entity states
    private _streamingCheckInterval: number = 1000; // ms
    private _lastStreamingCheck: number = 0;

    
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

        if (!this._mc || !this._mc.MainEntity) {
            return;
        }

        const mainEntityPos = this._mc.MainEntity.Position;
        
        // Check for entities that should be disposed
        const entitiesToDispose: Entity[] = [];
        for (const entity of this._entities) {
            if (entity.shouldBeDisposed(mainEntityPos)) {
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
        
        // Remove entity
        this.RemoveEntity(entity);
    }

    private finishEntityDisposal(entitiesToDispose: Entity[]): void {
        // Only log if entities were actually disposed
        if (entitiesToDispose.length > 0) {
            console.log(`Entity Streaming: Disposed ${entitiesToDispose.length} entities. Total cached tiles: ${this._streamedEntityStates.size}`);
        }
    }

    private restoreEntitiesForNearbyTiles(mainEntityPos: THREE.Vector3): void {
        const TILE_SIZE = 50; // Match the tile size from StreamingWorld
        
        // Calculate which tiles are nearby
        const baseTilePos = mainEntityPos.clone();
        baseTilePos.divideScalar(TILE_SIZE);
        baseTilePos.round();
        baseTilePos.multiplyScalar(TILE_SIZE);

        const NUM_TILES = 3; // Smaller range than visual tiles
        for (let x = -NUM_TILES; x <= NUM_TILES; x++) {
            for (let z = -NUM_TILES; z <= NUM_TILES; z++) {
                const offset = new THREE.Vector3(x, 0, z);
                offset.multiplyScalar(TILE_SIZE);
                const tilePos = baseTilePos.clone().add(offset);
                const tileKey = tilePos.x + '/' + tilePos.z;
                
                // Check if this tile has saved entities and we're close enough
                if (this._streamedEntityStates.has(tileKey)) {
                    const distance = mainEntityPos.distanceTo(tilePos);
                    if (distance <= 150) { // Restore entities when within 150 units
                        this.restoreEntitiesForTile(tileKey);
                    }
                }
            }
        }
    }

    private async restoreEntitiesForTile(tileKey: string): Promise<void> {
        const entityStates = this._streamedEntityStates.get(tileKey);
        if (!entityStates) return;

        for (const state of entityStates) {
            // Check if entity with this name already exists
            const existingEntity = this._entities.find(e => e._name === state.name);
            if (existingEntity) continue;
            
            // Create new entity and restore its state
            const entity = new Entity();
            await entity.restoreEntityState(state);
            
            // Recreate components based on stored creation info
            await this.recreateEntityComponents(entity, state.componentCreationInfo || []);
            
            // Add to entity manager
            entity.id = this._ids;          
            this._entities.push(entity);
            entity._entityManager = this;
            this._entitiesMap.set(this._ids, entity);
            this._ids++;
            
            // Initialize the entity
            await entity.Initialize();
            
            // Restore component states after initialization
            await entity.restoreComponentStates();
        }
        
        // Remove the states as they've been restored
        this._streamedEntityStates.delete(tileKey);
    }

    private async recreateEntityComponents(entity: Entity, componentCreationInfo: any[]): Promise<void> {
        // Import components dynamically to avoid circular dependencies
        for (const compInfo of componentCreationInfo) {
            let component = null;
            
            try {
                switch (compInfo.type) {
                    case 'CharacterComponent':
                        const { CharacterComponent } = await import("./Components/CharacterComponentRefactored");
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

    // Utility method to register an entity for tile streaming
    registerStreamedEntity(entity: Entity, position: THREE.Vector3): void {
        const TILE_SIZE = 50;
        const tilePos = position.clone();
        tilePos.divideScalar(TILE_SIZE);
        tilePos.round();
        tilePos.multiplyScalar(TILE_SIZE);
        const tileKey = tilePos.x + '/' + tilePos.z;
        
        entity.setOriginTile(tileKey, true);
    }

    // Helper method to store component creation info for streaming entities
    storeComponentCreationInfo(entity: Entity, componentInfos: Array<{type: string, config: any}>): void {
        entity._componentCreationInfo = componentInfos;
    }
}


export { EntityManager };
