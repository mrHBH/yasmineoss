import { Entity } from "./Entity.ts";
import { MainController } from "./MainController.ts";

class EntityManager {
    _ids: number;
    _entities: Entity[];
    _entitiesMap:   Map<number, Entity>;
    _mc: MainController;

    
    constructor() {
        this._ids = 0;
        this._entities = [];
        this._entitiesMap = new Map<number, Entity>();

       
    }

    get Entities() {
        return this._entities;
    }

    async AddEntity(entity: Entity , name: string) {
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
        await entity.Initialize();
 
       
    }

    async RemoveEntity(entity: Entity) {
       entity.Destroy().then(() => {
            this._entities = this._entities.filter(e => e !== entity);
            this._entitiesMap.delete(entity.id);
        }
        );
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
    }
}


export { EntityManager };
