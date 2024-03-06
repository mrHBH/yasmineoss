import './style.css';
import UIkit from 'uikit';
import Icons from 'uikit/dist/js/uikit-icons';
import 'uikit/dist/css/uikit.css';
UIkit.use(Icons);


import * as THREE from 'three';
import { Entity } from './utils/Entity';
import { CharacterComponent } from './utils/Components/CharacterComponent';
import { EntityManager } from './utils/EntityManager';
import { MainController } from './utils/MainController';
// InfiniteGridHelper class definition ends here

//define a structire that holds the address of the backends. it is a collection of ports and addresses
let backends;
let protocol = window.location.protocol;
if (window.location.hostname === "localhost") {
  backends = {
    "rustbackend": "http://localhost:8420",
    "pythonbackend": "http://localhost:8000",
    "pythonbackendws": "ws://localhost:8000/ws/rtd/",
    "cppbackend": "http://localhost:8080",
    "cppbackendws": "ws://localhost:8080/ ",
    "tsbackend": "http://localhost:8089",
    "tsbackendws": "ws://localhost:8089"
  }
} else {
  let hostname = window.location.hostname;
  //check if secure or not
  if (window.location.protocol === "http:") {

    backends = {
      "rustbackend": "http://" + hostname + ":8420",
      "pythonbackend": "http://" + hostname + ":8000",
      "pythonbackendws": "ws://" + hostname + ":8000/ws/rtd/",
      "cppbackend": "http://" + hostname + ":8080",
      "cppbackendws": "ws://" + hostname + ":8080/ ",
      "tsbackend": "http://" + hostname + ":8089",
      "tsbackendws": "ws://" + hostname + ":8089"
    }
  }
  else {
    backends = {
      "rustbackend": "https://" + hostname + ":8420",
      "pythonbackend": "https://" + hostname + ":8000",
      "pythonbackendws": "wss://" + hostname + ":8000/ws/rtd/",
      "cppbackend": "https://" + hostname + ":8080",
      "cppbackendws": "wss://" + hostname + ":8080/ ",
      "tsbackend": "https://" + hostname + ":8089",
      "tsbackendws": "wss://" + hostname + ":8089"
    }

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

//   const ws2 = new WebSocket(backends.pythonbackendws);
//   ws2.onopen = function open() {
//     setInterval(() => {
//     ws2.send('something for python');
//     } , 1000);
//   };
//   ws2.onmessage = function incoming(event) {
//     console.log('received from python backend:', event.data);
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


  constructor() {
    this.init().catch((error) => {
      console.error('Failed to initialize the scene:', error);
    });
  }

  private async init(): Promise<void> {
    this.entityManager = new EntityManager();
    this.maincController = new MainController(this.entityManager);



    const bob = new Entity();
    const bobcontroller = new CharacterComponent({
      modelpath: 'models/gltf/ybot2.glb',
      animationspath: 'animations/gltf/ybot2@walking.glb',
      scene: this.maincController.webgpuScene

    });

    const sydney = new Entity();
    sydney.position.set(2, 0, 2);
    const sydneycontroller = new CharacterComponent({
      modelpath: 'models/gltf/Xbot.glb',
      animationspath: 'animations/gltf/ybot2@walking.glb',
      scene: this.maincController.webgpuScene
    });


    await sydney.AddComponent(sydneycontroller);
    await this.entityManager.AddEntity(sydney, "Sydney");

    await bob.AddComponent(bobcontroller);
    await this.entityManager.AddEntity(bob, "Bob");

    //add 50 random entities at random positions either bob or sydney all walking
    for (let i = 0; i < 100; i++) {
      let entity = new Entity();
      let randoemclass = Math.random() < 0.5 ? 'models/gltf/ybot2.glb' : 'models/gltf/Xbot.glb';
      let randomposition = new THREE.Vector3(Math.random() * 20, 0, Math.random() * 50);
      let randomcontroller = new CharacterComponent({
        modelpath: randoemclass,
        animationspath: 'animations/gltf/ybot2@walking.glb',
        scene: this.maincController.webgpuScene
      });
      entity.position.set(randomposition.x, randomposition.y, randomposition.z);
      await entity.AddComponent(randomcontroller);
      await this.entityManager.AddEntity(entity, "RandomEntity" + i);
      let deathtimeout = Math.random() * 16000 + 2000
      setTimeout(() => {
        entity.kill()
      }, deathtimeout);
    }



















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
