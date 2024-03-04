
import { Entity } from './Entity';
class Component {	
    _entity:  Entity;
    _name: string;

    constructor( ) {

        
        
    }


    Update(deltaTime: number) {
        //Update the component
    }


    async Destroy() {
        //Destroy the component
    }

    async InitComponent(entity : Entity ) {
        this._entity = entity;
        console.log("InitComponent " + this._name);
      
        
    }

	async InitEntity() {
        console.log("InitEntity BasicComponent");

    }


    Broadcast(m : {topic: string , data: unknown}) {
		this._entity.Broadcast(m);
	}

    
}
export { Component };



 
