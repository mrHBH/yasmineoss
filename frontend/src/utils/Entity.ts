import * as THREE from "three";
import { Component } from "./Component";
class Entity {
    _name: string;
    _position: THREE.Vector3;
    _rotation: THREE.Quaternion;
    _components: Component[] = [];
    _handlers: {
        [topic: string]: ((message: unknown) => void)[];
    } = {};
    //state can be used to store the state of the entity : Selected, Alive , Destroyed 
    _alive: boolean;
    private _state: 'BUSY' | 'IDLE' = 'IDLE';
    private _updatePromise: Promise<void> | null = null; // Store the current update promise


    constructor() { 
        this._position = new THREE.Vector3();
        this._rotation = new THREE.Quaternion();
        this._alive = true;

    }
    get name() {
        return this._name;
    }
    get position() {
        return this._position;
    }

    get rotation() {
        return this._rotation;
    }

    get alive() {
        return this._alive;
    }

    set name(name: string) {
        this._name = name;
    }



    set position(position: THREE.Vector3) {
        this._position = position;
    }

    set rotation(rotation: THREE.Quaternion) {
        this._rotation = rotation;
    }


    Initialize() {

        for (const component of this._components) {
            component.InitEntity();
        }
       
    }

    AddComponent(component: Component) {        
        component.InitComponent( this); 
        this._components.push(component);
    }




    _RegisterHandler(topic: string, h: (m: unknown) => void) {
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

    Broadcast(msg: { topic: string, data: unknown }) {

        //  console.log(this.Name + msg);
        if (!(msg.topic in this._handlers)) {
            return;
        }
        for (const curHandler of this._handlers[msg.topic]) {
            curHandler(msg);
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
    
    Destroy() {
        this._alive = false;
    }



}


export { Entity };

