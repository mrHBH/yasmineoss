import { Entity } from './Entity';
class Component {
    _entity: Entity;
    _componentname: string;

    constructor() {



    }

    

    Update(deltaTime: number) {
        //Update the component
    }


    async Destroy() {
        //Destroy the component
    }

    async InitComponent(entity: Entity) {
        this._entity = entity;
        console.log("InitComponent " + this._componentname);


    }

    async InitEntity() {
        console.log("InitEntity BasicComponent");

    }


    Broadcast(m: { topic: string, data: unknown }) {
        this._entity.Broadcast(m);
    }

    // Optional state methods for tile streaming
    getState(): any {
        // Override in subclasses to provide state data
        return {};
    }

    async setState(state: any): Promise<void> {
        // Override in subclasses to restore state data
    }
}
export { Component };




