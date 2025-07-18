import * as THREE from "three";
import { Component } from "./Component";
import { EntityManager } from "./EntityManager";
class Entity {
    _name: string;
    id: number;
    _position: THREE.Vector3;
    _quaternion: THREE.Quaternion;
    _components: Component[] = [];
    _entityManager: EntityManager;
    _handlers: {
        [topic: string]: ((message: unknown) => void)[];
    } = {};
    //state can be used to store the state of the entity : Selected, Alive , Destroyed 
    _alive: boolean;
    objects: {}
    private _state: 'BUSY' | 'IDLE' = 'IDLE';
    private _updatePromise: Promise<void> | null = null; // Store the current update promise

    // Tile-based streaming properties
    _originTileKey: string | null = null; // The tile where this entity was originally created
    _isStreamedEntity: boolean = false; // Whether this entity should be managed by tile streaming
    _maxDistanceFromMainEntity: number = 200; // Distance threshold for disposal
    _entityState: any = null; // Stored state for restoration
    _componentCreationInfo: any[] = []; // Store component creation information for restoration


    constructor() {
        this._position = new THREE.Vector3();
        this._quaternion = new THREE.Quaternion();
        this._alive = true;

    }



    get name() {
        return this._name;
    }
    get Position() {
        return this._position;
    }


    get Quaternion() {
        return this._quaternion;
    }

    get alive() {
        return this._alive;
    }

   async kill() {
        this._alive = false;
        //resolve the promise when the entity is killed
        
    }

    set name(name: string) {
        this._name = name;
    }



    set Position(position: THREE.Vector3) {
         this._position = position;
        this.Broadcast({ topic: "position", data: this._position }).then(() => {
         }
        );


    }

    set Quaternion(quaternion: THREE.Quaternion) {
        this._quaternion = quaternion;
        this.Broadcast({ topic: "quaternion", data: this._quaternion });
    }


    async Initialize() {

        for (const component of this._components) {
            await component.InitEntity();
        }

    }

    async AddComponent(component: Component) {

        //check if componentname is not undefined
        if (!component._componentname) {
            component._componentname = component.constructor.name;
        }
        await component.InitComponent(this);
        this._components.push(component);
    }


    //remove components with provided classnames 
    async RemoveComponent( ...componentClassNames: string[]) {
        for (const componentClassName of componentClassNames) {
            //first destroy the component
            const component = this._components.find((component) => component.constructor.name === componentClassName);
            if (component) {
                 await component.Destroy();
                //remove the component from the list
                this._components = this._components.filter((component) => component.constructor.name !== componentClassName);
            }
           
        }
        return
    }

    getComponent(componentClassName: string) {
        return this._components.find((component) => component._componentname=== componentClassName);
    }





    //takes an object with the topic and the async function to be called
    _RegisterHandler(topic: string, h: (message: unknown) => void) {
        if (!(topic in this._handlers)) {
            this._handlers[topic] = [];
        }
        //check if the handler is already registered

        if (this._handlers[topic].indexOf(h) !== -1) {
            console.warn("Handler already registered");
            return;
        }

        this._handlers[topic].push(h);
    }

    async Broadcast(msg: { topic: string, data: unknown }) {

        //   console.log(this.name + msg.topic + msg.data);
        if (!(msg.topic in this._handlers)) {
            return;
        }
        for (const curHandler of this._handlers[msg.topic]) {
          await    curHandler(msg.data);
        }
    }




    async Update(deltaTime: number) {
        if (this._state === "BUSY") {
            return this._updatePromise; // Return the existing promise if still updating
        }
        this._state = "BUSY";
        this._updatePromise = (async () => {
            try {
                for (const component of this._components) {
                    await component.Update(deltaTime);
                }
            } catch (error) {
                console.error("Error updating entity components:", error);
                // Handle error appropriately here
            } finally {
                this._state = "IDLE"; // Ensure state is reset even if there's an error
            }
        })();

        return this._updatePromise;
    }

    async Destroy() {

        for (const component of this._components) {
         await   component.Destroy();
        }
    }

    // Tile streaming methods
    setOriginTile(tileKey: string, isStreamedEntity: boolean = true) {
        this._originTileKey = tileKey;
        this._isStreamedEntity = isStreamedEntity;
    }

    getOriginTileKey(): string | null {
        return this._originTileKey;
    }

    shouldBeDisposed(mainEntityPosition: THREE.Vector3): boolean {
        if (!this._isStreamedEntity) return false;
        const distance = this._position.distanceTo(mainEntityPosition);
        return distance > this._maxDistanceFromMainEntity;
    }

    saveEntityState(): any {
        const componentStates: any = {};
        const componentTypes: string[] = [];
        
        // Save component states and types
        for (const component of this._components) {
            componentTypes.push(component.constructor.name);
            if (typeof (component as any).getState === 'function') {
                componentStates[component._componentname] = (component as any).getState();
            }
        }

        return {
            name: this._name,
            position: {
                x: this._position.x,
                y: this._position.y,
                z: this._position.z
            },
            quaternion: {
                x: this._quaternion.x,
                y: this._quaternion.y,
                z: this._quaternion.z,
                w: this._quaternion.w
            },
            alive: this._alive,
            originTileKey: this._originTileKey,
            isStreamedEntity: this._isStreamedEntity,
            maxDistanceFromMainEntity: this._maxDistanceFromMainEntity,
            componentStates: componentStates,
            componentTypes: componentTypes,
            componentCreationInfo: this._componentCreationInfo
        };
    }

    async restoreEntityState(state: any): Promise<void> {
        this._name = state.name;
        this._position.set(state.position.x, state.position.y, state.position.z);
        this._quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
        this._alive = state.alive;
        this._originTileKey = state.originTileKey;
        this._isStreamedEntity = state.isStreamedEntity;
        this._maxDistanceFromMainEntity = state.maxDistanceFromMainEntity;
        this._componentCreationInfo = state.componentCreationInfo || [];

        // Note: Components need to be recreated by the EntityManager
        // This method just restores the entity's basic state
        
        // Store component states for later restoration after components are recreated
        this._entityState = state.componentStates;

        // Broadcast position and quaternion updates
        this.Broadcast({ topic: "position", data: this._position });
        this.Broadcast({ topic: "quaternion", data: this._quaternion });
    }

    async restoreComponentStates(): Promise<void> {
        if (!this._entityState) return;

        // Restore component states after components have been recreated
        for (const component of this._components) {
            const componentState = this._entityState[component._componentname];
            if (componentState && typeof (component as any).setState === 'function') {
                await (component as any).setState(componentState);
            }
        }

        // Clear the stored state
        this._entityState = null;
    }
}


export { Entity };

