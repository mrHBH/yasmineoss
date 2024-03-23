import "./style.css";
import UIkit from "uikit";
import Icons from "uikit/dist/js/uikit-icons";
import "uikit/dist/css/uikit.css";
UIkit.use(Icons);

import * as THREE from "three";
import { Entity } from "./utils/Entity";
import { CharacterComponent } from "./utils/Components/CharacterComponent";
import { EntityManager } from "./utils/EntityManager";
import { MainController } from "./utils/MainController";
import { twoDUIComponent } from "./utils/Components/2dUIComponent";
import { threeDUIComponent } from "./utils/Components/3dUIComponent";
import { StaticCLI } from "./SimpleCLI";
// InfiniteGridHelper class definition ends here

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
    //   let jsoncmd = JSON.stringify({cmd: "gen" , topic : "random fact about programming"}) ;
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

    const bob = new Entity();
    const bobcontroller = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspath: "animations/gltf/ybot2@walking.glb",
    });

    const sydney = new Entity();
    sydney.position.set(2, 0, 2);
    //rotate sydney 90 degrees
    sydney.rotation.set(0, Math.PI / 2, 0, 1);
    const sydneycontroller = new CharacterComponent({
      modelpath: "models/gltf/Xbot.glb",
      animationspath: "animations/gltf/ybot2@walking.glb",
    });

    const html = /*html*/ `
    <div class="uk-container-expand" style="  background-color: #f2f2f2;   box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2); transition: 0.3s; margin: 10px ;height: 500px; width: 1000px  ">
    <div class="uk-child-width-1-1 uk-grid-match" uk-grid>
        <div>
            <div class="uk-child-width-1-2@m uk-grid-match" uk-grid>
                <div class="uk-width-3-5">
                    <div class="uk-card uk-card-default uk-card-body" >
                        <h3 class="uk-card-title">YASMINE OS OS BUILD 5</h3>
                        <p class="inner-text uk-text-lead">UI Component</p>
                </div>
           
        </div>
     
    </div>
    
    
    </div>`;

const html2 = /*html*/ `
 
  
 <div class="uk-container-expand" style="  background-color: #f2f2f2;  height: 500px; width: 1000px  ">
    <div class="uk-child-width-1-1 uk-grid-match" uk-grid>
        <div>
            <div class="uk-child-width-1-2@m uk-grid-match" uk-grid>
                <div class="uk-width-3-5">
                    <div class="uk-card uk-card-default uk-card-body" >
                        <h3 class="uk-card-title">YASMINE OS OS BUILD 5</h3>
                        <p class="inner-text uk-text-lead">UI Component</p>
                </div>
           
        </div>
     
    </div>

</div>`;
    const introui = new Entity();
    introui.position.set(0, 0.1, 5);
    introui.rotation.set(-Math.PI / 2, 0, 0, 1);
    const uicomponent = new twoDUIComponent(html, new THREE.Vector2(1000, 600));

    await introui.AddComponent(uicomponent);
    await this.entityManager.AddEntity(introui, "UI");

    const introui2 = new Entity();
    introui2.position.set(0, 0.1, 0);
     introui2.rotation.set(-Math.PI / 2,0, 0, 1);
    const uicomponent2 = new threeDUIComponent(html2, new THREE.Vector2(1000, 600));

    await introui2.AddComponent(uicomponent2);
    await this.entityManager.AddEntity(introui2, "UI2");


    // setInterval(
    //   () => {
    //     // tween({
    //     //   from: {
    //     //     x: introui.position.x,
    //     //     y: introui.position.y,
    //     //     z: introui.position.z,
    //     //   },
    //     //   to: {
    //     //     x: Math.random() * 5,
    //     //     y: Math.random() * 5,
    //     //     z: Math.random() * 5,
    //     //   },
    //     //   duration: 100000,
    //     //   easing: "cubicInOut",
    //     //   render: (state) => {
    //     //     // Here ensure all state values are treated as numbers explicitly
    //     //     introui.position.set(
    //     //       Number(state.x),
    //     //       Number(state.y),
    //     //       Number(state.z)
    //     //     );
    //     //   },
    //     // });
    //     // this.inferencewebsocket = new WebSocket(backends.pythonbackendws);
    //     //     this.inferencewebsocket.onopen = function open() {
    //     //       // setInterval(() => {
    //     //       // ws2.send('something for python');
    //     //       // } , 1000);
    //     //       // ws2.send('hello from the frontend');
    //     //       let jsoncmd = JSON.stringify({cmd: "gen" , topic : "random fact about programming"}) ;
    //     //       this.send(jsoncmd);
    //     //     };

    //     //     this.inferencewebsocket.onmessage = function incoming(event) {

    //     //       //load json
    //     //       let json = JSON.parse(event.data);
    //     //       console.log(json);
    //     //       if (json.command === "token") {
    //     //            StaticCLI.typeInside(
    //     //                   uicomponent.htmlElement,
    //     //                   "inner-text",
    //     //                   json.text,
    //     //                   10,
    //     //                   false
    //     //                 );
    //     //       }

    //     //       if (json.command === "finalans")
    //     //       {
    //     //         //remove tje event listener
    //     //         this.inferencewebsocket.removeEventListener("message",  this.inferencewebsocket.onmessage);
    //     //         //close the websocket
    //     //         this.inferencewebsocket.close();
    //     //       }
    //     //       //check if json
    //     //     }.bind(this);
    //     StaticCLI.typeInside(
    //       uicomponent.htmlElement,
    //       "uk-card-title",
    //       "YASMINE OS OS BUILD 5",
    //       60,
    //       true
    //     );
    //   },

    //   5000
    // );

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

    //   let randomui = new UIComponent(
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

    // //   setInterval(() => {

    // //   select a random entity , and zoom to it
    // //   let randomentity = this.entityManager.Entities[
    // //     Math.floor(Math.random() * this.entityManager.Entities.length)
    // //   ];

    // //   randomentity.Broadcast({
    // //     topic: "zoom",
    // //     data: {},
    // //   });
    // //   randomentity.Broadcast({
    // //     topic: "setSize",
    // //     data: {
    // //       size: new THREE.Vector2(
    // //         Math.random() * 250 + 150,
    // //         Math.random() * 150 + 150
    // //       ),
    // //     },
    // //   });
    // // }
    // // ,2000);

    await sydney.AddComponent(sydneycontroller);
    await this.entityManager.AddEntity(sydney, "Sydney");

    await bob.AddComponent(bobcontroller);
    await this.entityManager.AddEntity(bob, "Bob");

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
  }

  private async animate(): Promise<void> {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    await this.entityManager.Update(delta);
    await this.maincController.update(delta);
  }
}
new Main();
