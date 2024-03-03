import { Entity } from "../Entity";
import { Component } from "../Component";


class BasicComponent  extends Component {

    constructor() {
        super();
        //name of the component is the class name
        this._name = "BasicComponent";
    }


   

    async Update(deltaTime: number) {
        //wait 2 seconds and print the name of the component
        await new Promise(r => setTimeout(r, 2500));
        let time = new Date();
        console.log(  time.getSeconds() + " " + time.getMilliseconds() + " " + this._name);
  

      
    }
    Destroy() {
        //Destroy the component
    }

    InitComponent() {
        console.log("InitComponent BasicComponent");
    }

    InitEntity() {
        console.log("InitEntity BasicComponent");
    }

    
    
}

export { BasicComponent };