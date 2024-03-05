import './style.css';
import * as THREE from 'three';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

 import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { InfiniteGridHelper } from "./utils/InfiniteGridHelper";
 import { Entity } from './utils/Entity';
import { BasicComponent } from './utils/Components/BasicComponent';
import { CharacterComponent } from './utils/Components/CharacterComponent';
import { EntityManager } from './utils/EntityManager';
 // InfiniteGridHelper class definition ends here
 import TWEEN from '@tweenjs/tween.js'

 //define a structire that holds the address of the backends. it is a collection of ports and addresses
  let backends ;
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
  private camera: THREE.PerspectiveCamera;
  private sceneMain: THREE.Scene;
  private renderer: WebGPURenderer;
  private clock: THREE.Clock;
  private entityManager: EntityManager;
  grid: InfiniteGridHelper;
  orbitcontrols: OrbitControls;


  constructor() {
    this.init().catch((error) => {
      console.error('Failed to initialize the scene:', error);
    });
  }

  private async init(): Promise<void> {
    this.entityManager = new EntityManager();
  
    this.sceneMain = new THREE.Scene();
    this.sceneMain.background = new THREE.Color(0x222222);



    const bob = new Entity();
    const bobcontroller = new CharacterComponent({
      modelpath: 'models/gltf/ybot2.glb',
      animationspath: 'animations/gltf/ybot2@walking.glb',
      scene: this.sceneMain
    
    });

    const sydney = new Entity();
    sydney.position.set(2, 0, 2);
    const sydneycontroller = new CharacterComponent({
      modelpath: 'models/gltf/Xbot.glb',
      animationspath: 'animations/gltf/ybot2@walking.glb',
      scene: this.sceneMain
    });


    await sydney.AddComponent(sydneycontroller);
    await this.entityManager.AddEntity(sydney, "Sydney");

    await bob.AddComponent(bobcontroller);
    await this.entityManager.AddEntity(bob, "Bob");

    // //add 50 random entities at random positions either bob or sydney all walking
    // for (let i = 0; i < 100; i++) {
    //   let entity = new Entity();
    //   let randoemclass = Math.random() < 0.5 ? 'models/gltf/ybot2.glb' :  'models/gltf/Xbot.glb';
    //   let randomposition = new THREE.Vector3(Math.random() * 20, 0, Math.random() * 50);
    //   let randomcontroller = new CharacterComponent({
    //     modelpath: randoemclass,
    //     animationspath: 'animations/gltf/ybot2@walking.glb',
    //     scene: this.sceneMain
    //   });
    //   entity.position.set(randomposition.x, randomposition.y, randomposition.z);
    //   await entity.AddComponent(randomcontroller);
    //   await this.entityManager.AddEntity(entity, "RandomEntity" + i);
    //   let deathtimeout = Math.random() * 16000 +2000
    //   setTimeout(() => {
    //     entity.kill()
    //   } , deathtimeout);
    // }





 
    




    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2000);
    this.camera.position.set(2.5, 1, 3);
    this.camera.position.multiplyScalar(0.8);
    this.camera.lookAt(0, 1, 0);




    this.clock = new THREE.Clock();

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(0, 1, 5);
    this.sceneMain.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
    this.sceneMain.add(light);
 

    this.renderer = new WebGPURenderer({ antialias: true });
    await this.renderer.init();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.grid= new InfiniteGridHelper(  this.camera , 10, 100, new THREE.Color(0x888888), new THREE.Color(0x444444));
    this.sceneMain.add(this.grid);
    document.body.appendChild(this.renderer.domElement);
    this.orbitcontrols = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitcontrols.target.set(0, 1, 0);
    this.orbitcontrols.update();
    window.addEventListener('resize', () => this.onWindowResize());

    document.addEventListener('dblclick', (event) => this.onDoubleClick(event) , false);
    this.animate();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private async animate(): Promise<void> {
    requestAnimationFrame(() => this.animate());
    TWEEN.update();

    const delta = this.clock.getDelta(); 

    await this.entityManager.Update(delta);
    await this.renderer.renderAsync(this.sceneMain, this.camera);

  }

  private onDoubleClick(event: MouseEvent): void {
    console.log('double click');
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera( 
      new THREE.Vector2(
        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
      ),
       
        this.camera
    )
     const intersects = raycaster.intersectObjects(this.sceneMain.children, true)

    if (intersects.length > 0) {
      const p = intersects[0].point
      console.log('point:', p)

      new TWEEN.Tween(this.orbitcontrols.target)
          .to(
              {
                  x: p.x,
                  y: p.y,
                  z: p.z,
              },
              500
          )
          .easing(TWEEN.Easing.Cubic.Out).onUpdate(() => {
              this.orbitcontrols.update();
          })
          .start().onComplete
          (() => {
              console.log('done')
          })


      new TWEEN.Tween(this.camera.position)
          .to(
              {
                  x: p.x + 2,
                  y: p.y + 2,
                  z: p.z + 2,
              },
              500
          )
          .easing(TWEEN.Easing.Cubic.Out).onUpdate(() => {
              this.orbitcontrols.update();
          })
          .start().onComplete
          (() => {
              console.log('done')
          })

          


  }
}



  


}
new Main();
 