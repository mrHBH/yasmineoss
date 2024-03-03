import { Entity } from "./Entity.ts";

class EntityManager {
    _ids: number;
    _entities: Entity[];
    _entitiesMap:   Map<number, Entity>;
    
    constructor() {
        this._ids = 0;
        this._entities = [];
        this._entitiesMap = new Map<number, Entity>();
    }

    get Entities() {
        return this._entities;
    }

    AddEntity(entity: Entity , name: string) {
        entity.name = name;           
        this._entities.push(entity);
        this._entitiesMap.set(this._ids, entity);
        this._ids++;
        entity.Initialize();
 
       
    }
 
    Update(deltaTime: number) {
        // Schedule each entity's update as a microtask, allowing the main thread to remain responsive
        this._entities.forEach(entity => {
            if (entity.alive) {
                queueMicrotask(() => {
                    entity.Update(deltaTime).catch(err => {
                        console.error("Error during entity update:", err);
                    });
                });
            }
        });
        // Now the updates are scheduled but not awaited here, allowing the rest of your game loop to continue
    }
}


export { EntityManager };
