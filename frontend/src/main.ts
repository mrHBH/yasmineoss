import "./style.css";
import UIkit from "uikit";
import Icons from "uikit/dist/js/uikit-icons";
import "uikit/dist/css/uikit.css";
UIkit.use(Icons);

import * as THREE from "three";
import { Entity } from "./utils/Entity";
import { CharacterComponent} from "./utils/Components/CharacterComponent";
import { AIInput } from "./utils/Components/AIInput";
import { KeyboardInput } from "./utils/Components/KeyboardInput";
import { EntityManager } from "./utils/EntityManager";
import { MainController } from "./utils/MainController";
 import {CarComponent} from "./utils/Components/CarComponent";
import { StaticCLI } from "./SimpleCLI";
// InfiniteGridHelper class definition ends here
import { tween } from "shifty";
import { HelicopterComponent } from "./utils/Components/HelicopterComponent";

//define a structire that holds the address of the backends. it is a collection of ports and addresses
let backends;
let protocol = window.location.protocol;
if (window.location.hostname === "localhost") {
  backends = {
    rustbackend: "http://localhost:8420",
    pythonbackend: "http://localhost:8000",
    pythonbackendws: "ws://localhost:8000/ws/rtd/",
    cppbackend: "http://localhost:8080",
    cppbackendws: "ws://localhost:8080/ ",
    tsbackend: "http://localhost:8089",
    tsbackendws: "ws://localhost:8089",
  };
} else {
  let hostname = window.location.hostname;
  //check if secure or not
  if (window.location.protocol === "http:") {
    backends = {
      rustbackend: "http://" + hostname + ":8420",
      pythonbackend: "http://" + hostname + ":8000",
      pythonbackendws: "ws://" + hostname + ":8000/ws/rtd/",
      cppbackend: "http://" + hostname + ":8080",
      cppbackendws: "ws://" + hostname + ":8080/ ",
      tsbackend: "http://" + hostname + ":8089",
      tsbackendws: "ws://" + hostname + ":8089",
    };
  } else {
    backends = {
      rustbackend: "https://" + hostname + ":8420",
      pythonbackend: "https://" + hostname + ":8000",
      pythonbackendws: "wss://" + hostname + ":8000/ws/rtd/",
      cppbackend: "https://" + hostname + ":8080",
      cppbackendws: "wss://" + hostname + ":8080/ ",
      tsbackend: "https://" + hostname + ":8089",
      tsbackendws: "wss://" + hostname + ":8089",
    };
  }
}

//   //create to ts backend , over websockets and send periodic messages to the backend
//   const ws = new WebSocket(backends.tsbackendws);

//   ws.onopen = function open() {
//     setInterval(() => {
//     ws.send('something for ts');
//     } , 1500);

//   };
//   ws.onmessage = function incoming(event) {
//     console.log('received from ts backend :', event.data);

//   }

//  const ws3 = new WebSocket(backends.cppbackendws);
//   ws3.onopen = function open() {
//     setInterval(() => {
//     ws3.send('something for cpp');
//     } , 1000);
//   }
//   ws3.onmessage = function incoming(event) {
//     console.log('received from cpp backend:', event.data);
//   }

class Main {
  private entityManager: EntityManager;
  private maincController: MainController;
  private clock = new THREE.Clock();
  private inferencewebsocket: WebSocket;

  constructor() {
    this.init().catch((error) => {
      console.error("Failed to initialize the scene:", error);
    });
  }

  private async init(): Promise<void> {
    this.entityManager = new EntityManager();
    this.maincController = new MainController(this.entityManager);
    this.maincController.physicsmanager.debug = true;
    // const ws2 = new WebSocket(backends.pythonbackendws);
    //   ws2.onopen = function open() {
    //     // setInterval(() => {
    //     // ws2.send('something for python');
    //     // } , 1000);
    //     ws2.send('hello from the frontend');
    //     let jsoncmd = JSON.stringify({cmd: "gen" , topic : "random fact about programming"});
    //     ws2.send(jsoncmd);
    //   };
    //   ws2.onmessage = function incoming(event) {
    //     console.log('received from python backend:', event.data);
    //   }

    // this.inferencewebsocket = new WebSocket(backends.pythonbackendws);
    // this.inferencewebsocket.onopen = function open() {
    //   // setInterval(() => {
    //   // ws2.send('something for python');
    //   // } , 1000);
    //   // ws2.send('hello from the frontend');
    //   let jsoncmd = JSON.stringify({cmd: "gen" , topic : "random fact about llm"}) ;
    //   this.send(jsoncmd);
    // };

    // this.inferencewebsocket.onmessage = function incoming(event) {

    //   //load json
    //   let json = JSON.parse(event.data);
    //   console.log(json);
    //   if (json.command === "token") {
    //     console.log(json.text );
    //   }
    //   //check if json
    // }
    const animations = [
      { url: "animations/gltf/ybot2@BackwardWalking.glb", skipTracks: [1] },
     //s { url: "animations/gltf/ybot2@BackwardWalkingM.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@bigjump.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@Driving.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@Drumming.glb", skipTracks: [1] },
      { url: "animations/gltf/ybot2@DyingForward.glb" , skipTracks: [  1 ] },
      { url: "animations/gltf/ybot2@DyingForward2.glb" , skipTracks: [ 1] },
      // { url: "animations/gltf/ybot2@EnteringCar.glb",  },
      // { url: "animations/gltf/ybot2@ExitingCar.glb", skipTracks: [0, 2] },
      { url: "animations/gltf/ybot2@Falling.glb", skipTracks: [0] },
      { url: "animations/gltf/ybot2@Ideling.glb" },
      { url: "animations/gltf/ybot2@JumpingFromStill.glb" },
      { url: "animations/gltf/ybot2@JumpingFromWalk.glb", skipTracks: [ 1 ,0] },
      // { url: "animations/gltf/ybot2@Jumping.glb" },
      { url: "animations/gltf/ybot2@JumpingFromRun.glb", skipTracks: [0] },
      // { url: "animations/gltf/ybot2@Kickedfall.glb", skipTracks: [1] },
      { url: "animations/gltf/ybot2@Landing.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@Pain.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@PlayingGuitar.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@PlayingPiano.glb", skipTracks: [0] },
      // { url: "animations/gltf/ybot2@Praying.glb" },
      // { url: "animations/gltf/ybot2@Pushing.glb" },
       { url: "animations/gltf/ybot2@Running.glb" },
      { url: "animations/gltf/ybot2@StoppingRunning.glb", skipTracks: [1] },
      // { url: "animations/gltf/ybot2@Salute.glb" },
      { url: "animations/gltf/ybot2@SlowWalking.glb" },
      { url: "animations/gltf/ybot2@UndyingForward.glb" },
      { url: "animations/gltf/ybot2@Walking.glb" },
      { url: "animations/gltf/ybot2@TurningLeft.glb" },
      { url: "animations/gltf/ybot2@TurningRight.glb" },
     ];
    const bob = new Entity();
    const bobcontroller = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: animations,
    });
   

    await bob.AddComponent(bobcontroller);
     await bob.AddComponent(new AIInput());
    await this.entityManager.AddEntity(bob, "Bob");
    this.maincController.MainEntity = bob;
    setInterval(() => {
      let pos = this.maincController.UIManager.attentionCursor.position;
      bob.Broadcast({
        topic: "walk",
        data: { position: new THREE.Vector3( pos.x, 0, pos.z) },
      });
    }
    , 1000);
//check if  the attention cursor
    if (this.maincController.UIManager.cubePosition > 0.5 && this.maincController.UIManager.cubePosition < 0.8) {
      bob.Broadcast({
        topic: "showui",
        data: {},
      });
    }  

   


    // const car = new Entity();
    // const carcontroller = new CarComponent({
      
    // });
    // car.Position = new THREE.Vector3(0, 1, 0);
    // await car.AddComponent(carcontroller);
    // const keyboardinput = new KeyboardInput();
    // await car.AddComponent(keyboardinput);
 

    // await this.entityManager.AddEntity(car, "Car");
    // carcontroller.Reset()


    // const heli = new Entity();
   
    // const helicontroller = new HelicopterComponent ({});
    // heli.Position = new THREE.Vector3(10 , 2.5,10);
    // heli.Quaternion = new THREE.Quaternion(0, 0, 0, 1);
    // await heli.AddComponent(helicontroller);
    // const keyboardinput = new KeyboardInput();
    // await heli.AddComponent(keyboardinput);
    // await this.entityManager.AddEntity(heli, "Heli");
    
    const sydney = new Entity();
    sydney.Position= new THREE.Vector3(0, 6, 0);
    //rotate sydney 90 degrees
    sydney.Quaternion = new THREE.Quaternion(0, 0, 0, 1);
    const sydneycontroller = new CharacterComponent({
      modelpath: "models/gltf/Xbot.glb",
      animationspathslist: animations,
    });




    setTimeout(() => {
    
      const h = async () => {
        // await car.AddComponent(carcontroller);
        // await this.entityManager.AddEntity(car, "Car");
    
        const keyboardinput = new KeyboardInput();

        await sydney.AddComponent(sydneycontroller);
        await sydney.AddComponent(keyboardinput);

        await this.entityManager.AddEntity(sydney, "Sydney");
        // setTimeout(() => {
        //     sydney.RemoveComponent("KeyboardInput").then(() => {
        //       console.log("removed keyboard input");
        //     } );
        // } , 5000);
      };
      //create 60 more random entities , and animate them in a random fashion
      // for (let i = 0; i < 6; i++) {
      //   let entity = new Entity();
      //   let randoemclass =
      //     Math.random() < 0.5 ? "models/gltf/ybot2.glb" : "models/gltf/Xbot.glb";
      //   let randomposition = new THREE.Vector3(
      //     Math.random() * 200,
      //     0,
      //     Math.random() * 500
      //   );
      //   let randomcontroller = new CharacterComponent({
      //     modelpath: randoemclass,
      //     animationspathslist: animations,
      //   });
      //   entity.position.set(randomposition.x, randomposition.y, randomposition.z);
      //   entity.AddComponent(randomcontroller).then(() => {
      //   this.entityManager.AddEntity(entity, "RandomEntity" + i);
      //   })
      //   let deathtimeout = Math.random() * 32000 + 2000;
      //   setTimeout(() => {
      //    // entity.kill();
      //   }, deathtimeout);
      // }
      h();
    }, 1000);

    //add an entity every 5 seconds and zoom to it
    // setInterval(() => {
    //   const h = async () => {
    //     //       for (let i = 0; i < 60; i++) {
    //     //   let entity = new Entity();
    //     //   let randoemclass =
    //     //     Math.random() < 0.5 ? "models/gltf/ybot2.glb" : "models/gltf/Xbot.glb";
    //     //   let randomposition = new THREE.Vector3(
    //     //     Math.random() * 200,
    //     //     0,
    //     //     Math.random() * 500
    //     //   );
    //     //   let randomcontroller = new CharacterComponent({
    //     //     modelpath: randoemclass,
    //     //     animationspathslist: animations,
    //     //   });
    //     //   entity.position.set(randomposition.x, randomposition.y, randomposition.z);
    //     //   entity.AddComponent(randomcontroller).then(() => {
    //     //   this.entityManager.AddEntity(entity, "RandomEntity" + i);
    //     //   })
    //     //   let deathtimeout = Math.random() * 32000 + 2000;
    //     //   setTimeout(() => {
    //     //    // entity.kill();
    //     //   }, deathtimeout);
    //     // }

    //     let entity = new Entity();
    //     let randoemclass =
    //       Math.random() < 0.5
    //         ? "models/gltf/ybot2.glb"
    //         : "models/gltf/Xbot.glb";
    //     let randomposition = new THREE.Vector3(
    //       Math.random() * 200,
    //       0,
    //       Math.random() * 500
    //     );
    //     let randomcontroller = new CharacterComponent({
    //       modelpath: randoemclass,
    //       animationspathslist: animations,
    //     });
    //     entity.position.set(
    //       randomposition.x,
    //       randomposition.y,
    //       randomposition.z
    //     );

    //     await entity.AddComponent(randomcontroller);
    //     await this.entityManager.AddEntity(
    //       entity,
    //       "RandomEntity" + Math.random() * 1000
    //     );
    //   };
    //   h();
    // }, 8000);

    // //create 60 more random entities , and animate them in a random fashion
    // for (let i = 0; i < 60; i++) {
    //   let entity = new Entity();
    //   let randoemclass =
    //     Math.random() < 0.5 ? "models/gltf/ybot2.glb" : "models/gltf/Xbot.glb";
    //   let randomposition = new THREE.Vector3(
    //     Math.random() * 200,
    //     0,
    //     Math.random() * 500
    //   );
    //   let randomcontroller = new CharacterComponent({
    //     modelpath: randoemclass,
    //     animationspathslist: animations,
    //   });
    //   entity.position.set(randomposition.x, randomposition.y, randomposition.z);
    //   entity.AddComponent(randomcontroller).then(() => {
    //   this.entityManager.AddEntity(entity, "RandomEntity" + i);
    //   })
    //   let deathtimeout = Math.random() * 32000 + 2000;
    //   setTimeout(() => {
    //    // entity.kill();
    //   }, deathtimeout);
    // }

  

    //   setInterval(
    //     () => {
    //       // tween({
    //       //   from: {
    //       //     x: introui.position.x,
    //       //     y: introui.position.y,
    //       //     z: introui.position.z,
    //       //   },
    //       //   to: {
    //       //     x: Math.random() * 5,
    //       //     y: Math.random() * 5,
    //       //     z: Math.random() * 5,
    //       //   },
    //       //   duration: 100000,
    //       //   easing: "cubicInOut",
    //       //   render: (state) => {
    //       //     // Here ensure all state values are treated as numbers explicitly
    //       //     introui.position.set(
    //       //       Number(state.x),
    //       //       Number(state.y),
    //       //       Number(state.z)
    //       //     );
    //       //   },
    //       // });
    //       // this.inferencewebsocket = new WebSocket(backends.pythonbackendws);
    //       //     this.inferencewebsocket.onopen = function open() {
    //       //       // setInterval(() => {
    //       //       // ws2.send('something for python');
    //       //       // } , 1000);
    //       //       // ws2.send('hello from the frontend');
    //       //       let jsoncmd = JSON.stringify({cmd: "gen" , topic : "random fact about programming"}) ;
    //       //       this.send(jsoncmd);
    //       //     };

    //       //     this.inferencewebsocket.onmessage = function incoming(event) {

    //       //       //load json
    //       //       let json = JSON.parse(event.data);
    //       //       console.log(json);
    //       //       if (json.command === "token") {
    //       //            StaticCLI.typeInside(
    //       //                   uicomponent.htmlElement,
    //       //                   "inner-text",
    //       //                   json.text,
    //       //                   10,
    //       //                   false
    //       //                 );
    //       //       }

    //       //       if (json.command === "finalans")
    //       //       {
    //       //         //remove tje event listener
    //       //         this.inferencewebsocket.removeEventListener("message",  this.inferencewebsocket.onmessage);
    //       //         //close the websocket
    //       //         this.inferencewebsocket.close();
    //       //       }
    //       //       //check if json
    //       //     }.bind(this);
    //       StaticCLI.typeInside(
    //         uicomponent.htmlElement,
    //         "uk-card-title",
    //         "YASMINE OS OS BUILD 5",
    //         60,
    //         true
    //       );
    //     },

    //     5000
    //   );

    // //create 50  ui elements , and animate them in a random fashion , and change the text inside them in a random fashion
    // let randomuirules = [
    //   " a good ui is to be felt not seen",
    //   " fps is the most important thing in a ui",
    //   " programming language? all you need is computing power",
    //   " the best ui is the one that is not there",
    //   " main rendering thread : shall not be disturbed",
    //   " cards cards cards",
    //   " hyper smooth transitions , fight the jank",
    //   " 60 fps or bust",
    //   " fonts : max resolution",
    // ];

    // let randomprogrammingtips = [
    //   " always use a linter , respect the linter , obey the linter",
    // ];

    // let randomfacts = [
    //   " human attention span is 8 seconds , quite short , huh?",
    //   " the average person spends a huge amount clicking on things and moving the mouse",
    // ];

    // let randomtitles = [
    //   " Dynamically Generated UI",
    //   "Random UI",
    //   "Random ui rules",
    //   "random programming tips",
    //   "random facts",
    //   "random titles",];

    //   //combine all the random facts and rules
    //   randomfacts = randomfacts.concat(randomuirules).concat(randomprogrammingtips)
    // for (let i = 0; i < 50; i++) {
    //   let randomsize =  new THREE.Vector2( Math.random() * 100 + 250, Math.random() * 100 + 250);
    //    let entity = new Entity();
    //   let randomposition = new THREE.Vector3(
    //     Math.random() * 204,
    //     Math.random() * 209,
    //     Math.random() * 206
    //   );

    //   let randomrotation = new THREE.Quaternion(
    //    0,
    //     Math.random() * 2 * Math.PI,
    //     0,
    //     1
    //   );

    //   let randomui = new twoDUIComponent(
    //     '<div class="uk-card uk-card-default uk-card-body " > <h3 class="uk-card-title">Hello World</h3> <p class="inner-text">UI Component</p> </div>',
    //     randomsize
    //     );

    //   entity.position.set(randomposition.x, randomposition.y, randomposition.z);
    //  entity. rotation.set(randomrotation.x, randomrotation.y, randomrotation.z, randomrotation.w);
    //   await entity.AddComponent(randomui);
    //   await this.entityManager.AddEntity(entity, "UI" + i);
    //   StaticCLI.typeInside(
    //     randomui.htmlElement,
    //     "uk-card-title",
    //     randomtitles[Math.floor(Math.random() * randomtitles.length)],
    //     25,
    //     true
    //   );
    //     StaticCLI.typeInside(
    //     randomui.htmlElement,
    //     "inner-text",
    //     randomfacts[Math.floor(Math.random() * randomfacts.length)],
    //     250,
    //     true
    //   );
    //   let deathtimeout = Math.random() * 32000 + 2000;
    //   let randommobility = Math.random() * 6 + 1;
    //   if (randommobility  > 6.5) {
    //     setInterval(
    //       () => {
    //         tween({
    //           from: {
    //             x: entity.position.x,
    //             y: entity.position.y,
    //             z: entity.position.z,
    //           },
    //           to: {
    //             x: Math.random() * 200,
    //             y: Math.random() * 200,
    //             z: Math.random() * 200,
    //           },
    //           duration: 1000000,
    //           easing: "cubicInOut",
    //           render: (state) => {
    //             // Here ensure all state values are treated as numbers explicitly
    //             entity.position.set(
    //               Number(state.x),
    //               Number(state.y),
    //               Number(state.z)
    //             );
    //           },
    //         });
    //         // tween({
    //         //   from: {
    //         //     x: randomui.Size.x,
    //         //     y: randomui.Size.y,
    //         //   },
    //         //   to: {
    //         //     x: Math.random() * 200 + 250,
    //         //     y: Math.random() * 200 + 250,
    //         //   },
    //         //   duration: 2000,
    //         //   easing: "cubicInOut",
    //         //   render: (state) => {
    //         //     // Here ensure all state values are treated as numbers explicitly
    //         //     randomui.Size = new THREE.Vector2(
    //         //       Number(state.x),
    //         //       Number(state.y)
    //         //     );
    //         //   },
    //         // });

    //         this.inferencewebsocket.send(
    //           JSON.stringify({ cmd: "gen", topic: "random fact about programming" })
    //         );
    //         StaticCLI.typeInside(
    //                   randomui.htmlElement,
    //                   "uk-card-title",
    //                   " Dynamically Generated UI",
    //                   25,
    //                   true
    //                 );

    //         this.inferencewebsocket.onmessage = function incoming(event) {
    //           //load json
    //           let json = JSON.parse(event.data);

    //           console.log(json);
    //           if (json.command === "token") {
    //             console.log(json.text);

    //             StaticCLI.typeInside(
    //               randomui.htmlElement,
    //               "inner-text",
    //               json.text,
    //               55,
    //               true
    //             );
    //           }
    //           (json.command === "finalans")
    //           {
    //             //remove tje event listener
    //             this.inferencewebsocket.removeEventListener("message",  this.inferencewebsocket.onmessage);
    //           }
    //           //check if json
    //         }.bind(this);
    //         StaticCLI.typeInside(
    //           randomui.htmlElement,
    //           "uk-card-title",
    //           "YASMINE OS OS BUILD 9",
    //           25,
    //           true
    //         );
    //         StaticCLI.typeInside(
    //           randomui.htmlElement,
    //           "inner-text",
    //           randomfacts[Math.floor(Math.random() * randomfacts.length)],
    //           55,
    //           true
    //         );
    //       },

    //       8000
    //     );
    //   }
    //   else {

    //     StaticCLI.typeInside(
    //       randomui.htmlElement,
    //       "uk-card-title",
    //       "YASMINE OS OS BUILD 5",
    //       25,
    //       true
    //     );
    //     StaticCLI.typeInside(
    //       randomui.htmlElement,
    //       "inner-text",
    //       randomfacts[Math.floor(Math.random() * randomfacts.length)],
    //       55,
    //       true
    //     );
    //   }

    //   setTimeout(() => {
    //   //  entity.kill();
    //   }, deathtimeout);
    // }

    //    setInterval(() => {

    //   //select a random entity , and zoom to it
    //   let randomentity = this.entityManager.Entities[
    //     Math.floor(Math.random() * this.entityManager.Entities.length)
    //   ];

    //   randomentity.Broadcast({
    //     topic: "zoom",
    //     data: {},
    //   });
    //   randomentity.Broadcast({
    //     topic: "panaround",
    //     data: {
    //       size: new THREE.Vector2(
    //         Math.random() * 250 + 150,
    //         Math.random() * 150 + 150
    //       ),
    //     },
    //   });
    // }
    // ,4500);

    // //add 50 random entities at random positions either bob or sydney all walking
    // for (let i = 0; i < 50; i++) {
    //   let entity = new Entity();
    //   let randoemclass =
    //     Math.random() < 0.5 ? "models/gltf/ybot2.glb" : "models/gltf/Xbot.glb";
    //   let randomposition = new THREE.Vector3(
    //     Math.random() * 20,
    //     0,
    //     Math.random() * 50
    //   );
    //   let randomcontroller = new CharacterComponent({
    //     modelpath: randoemclass,
    //     animationspath: "animations/gltf/ybot2@walking.glb",
    //   });
    //   entity.position.set(randomposition.x, randomposition.y, randomposition.z);
    //   await entity.AddComponent(randomcontroller);
    //   await this.entityManager.AddEntity(entity, "RandomEntity" + i);
    //   let deathtimeout = Math.random() * 32000 + 2000;
    //   setTimeout(() => {
    //     entity.kill();
    //   }, deathtimeout);
    // }

    this.animate();

    //for every animation frame
  }

  private async animate(): Promise<void> {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    await this.entityManager.Update(delta);
    await this.maincController.update(delta);
  }


  
}
new Main();
