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
    private _state: 'BUSY' | 'IDLE' = 'IDLE';
    private _updatePromise: Promise<void> | null = null; // Store the current update promise


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

    kill() {
        this._alive = false;
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

    async getComponent(componentClassName: string) {
        return this._components.find((component) => component.constructor.name === componentClassName);
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

        //  console.log(this.Name + msg);
        if (!(msg.topic in this._handlers)) {
            return;
        }
        for (const curHandler of this._handlers[msg.topic]) {
            await curHandler(msg.data);
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
            component.Destroy();
        }
    }



}


export { Entity };

