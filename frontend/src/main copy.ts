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
import { AIInput } from "./utils/Components/AIInput";
import { KeyboardInput } from "./utils/Components/KeyboardInput";
 

class Main {
  private entityManager: EntityManager;
  private maincController: MainController;
  private clock = new THREE.Clock();
 
  constructor() {
    this.init().catch((error) => {
      console.error("Failed to initialize the scene:", error);
    });
  }
 // Function to create and add Bob to the scene
    private async createBob(): Promise<void> {
      const bob = new Entity();
      bob.Position = new THREE.Vector3( Math.random() * 10 - 5, 1, Math.random() * 10 - 5);

      const bobcontroller = new CharacterComponent({
        modelpath: "models/gltf/ybot2.glb",
        animationspathslist: this.maincController.animations,
        //  behaviourscriptname: "botbasicbehavior.js",
      });

      await bob.AddComponent(bobcontroller);
      await bob.AddComponent(new AIInput());
      // await bob.AddComponent(new KeyboardInput());
      await this.entityManager.AddEntity(bob, "Bob");
      
      console.log("Bob has been added to the scene!");
   
    }
  private async init(): Promise<void> {
    this.entityManager = new EntityManager();
    this.maincController = new MainController(this.entityManager);
    
    // Initialize LoadingManager with renderer and scene 
    LoadingManager.initialize(
      this.maincController.renderer, 
      {
        scene: this.maincController.webglscene,
        camera: this.maincController.camera
      }
    );
    
    // Add event listener for 'b' key press to create Bob
    document.addEventListener('keydown', (event) => {
      if (event.key === 'b' || event.key === 'B') {
        this.createBob();
      }
    });

   

    // Initialize the scene without Bob initially

  //   this.maincController.MainEntity = bob;

  //   //add script entity environmentbot to the scene
  //   const hamza = new Entity();
  //   hamza.Position = new THREE.Vector3(0, 1, 6);
  //   const hbhc = new CharacterComponent({
  //     modelpath: "models/gltf/ybot2.glb",
  //     animationspathslist: this.maincController.animations,
  //     behaviourscriptname: "Hamza02.js",
  //   });
  //   await hamza.AddComponent(hbhc);
  //   await hamza.AddComponent(new AIInput());
  //   await hamza.AddComponent(new KeyboardInput());
  //   await this.entityManager.AddEntity(hamza, "Hamza Ben Hassen");
  //   this.maincController.MainEntity = hamza;

  //   hbhc.face();
  //   hamza.Broadcast({
  //     topic: "walk",
  //     data: { position: new THREE.Vector3(5, 0, -10) },
  //   });

  //   const uitester2 = new Entity();
  //   uitester2.Position = new THREE.Vector3(0, 1, 9);
  //   const uitestercontroller3 = new CharacterComponent({
  //     modelpath: "models/gltf/ybot2.glb",
  //     animationspathslist: this.maincController.animations,
  //     behaviourscriptname: "uitester2.js",
  //   });
  //   await uitester2.AddComponent(uitestercontroller3);

  //   await uitester2.AddComponent(new AIInput());
  //   await uitester2.AddComponent(new KeyboardInput());

  //   //  await environmentbot2.AddComponent(new KeyboardInput());
  //   await this.entityManager.AddEntity(uitester2, "uitester6");
  //   uitestercontroller3.face();
  //   this.maincController.MainEntity = uitester2;

  //  // this.maincController.UIManager.toggleScrollmode();

  //   //add script entity environmentbot to the scene
  //   const letterCounterBot = new Entity();
  //   letterCounterBot.Position = new THREE.Vector3(0, 1, 39);
  //   const letterCounterBotcontroller2 = new CharacterComponent({
  //     modelpath: "models/gltf/ybot2.glb",
  //     animationspathslist: this.maincController.animations,
  //     behaviourscriptname: "letterCounterBot.js",
  //   });

  //   await letterCounterBot.AddComponent(letterCounterBotcontroller2);

  //   await letterCounterBot.AddComponent(new AIInput());
  //   await letterCounterBot.AddComponent(new KeyboardInput());

  //   //  await environmentbot2.AddComponent(new KeyboardInput());
  //   await this.entityManager.AddEntity(letterCounterBot, "lca");
  //   letterCounterBot.Broadcast({
  //     topic: "walk",
  //     data: { position: new THREE.Vector3(0, 0, 0) },
  //   });
  //   //add script entity environmentbot to the scene
  //   const uitesterbot = new Entity();
  //    const uitester6 = new CharacterComponent({
  //     modelpath: "models/gltf/ybot2.glb",
  //     animationspathslist: this.maincController.animations,
  //     behaviourscriptname: "uitester6.js",
  //   });

  //   await uitesterbot.AddComponent(uitester6);

  //   await uitesterbot.AddComponent(new AIInput());
  //   await uitesterbot.AddComponent(new KeyboardInput());

  //   //  await environmentbot2.AddComponent(new KeyboardInput());
  //   await this.entityManager.AddEntity(uitesterbot, "uitester66");
 
    
   // this.maincController.UIManager.toggleScrollmode();

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
