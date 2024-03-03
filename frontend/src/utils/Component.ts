
import { Entity } from './Entity';
class Component {	
    _entity:  Entity;
    _name: string;

    constructor( ) {

        
        
    }


    Update(deltaTime: number) {
        //Update the component
    }


    Destroy() {
        //Destroy the component
    }

    InitComponent(entity : Entity ) {
        this._entity = entity;
    }

	InitEntity() {
        console.log("InitEntity BasicComponent");

    }


    Broadcast(m : {topic: string , data: unknown}) {
		this._entity.Broadcast(m);
	}

    
}
export { Component };



 
