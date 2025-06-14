import "./style.css";
import UIkit from "uikit";
import Icons from "uikit/dist/js/uikit-icons";
import "uikit/dist/css/uikit.css";
UIkit.use(Icons);

import * as THREE from "three";
import { Entity } from "./utils/Entity";
import { CharacterComponent } from "./utils/Components/CharacterComponentRefactored";

import { EntityManager } from "./utils/EntityManager";
import { MainController } from "./utils/MainController";
import { AIInput } from "./utils/Components/AIInput";
import { KeyboardInput } from "./utils/Components/KeyboardInput";
// Add this import statement
import { LoadingManager } from "./utils/LoadingManager";
import {  CarComponent } from "./utils/Components/CarComponent";

class Main {
  private entityManager: EntityManager;
  private maincController: MainController;
  private clock = new THREE.Clock();
  private bobCounter = 0; // Counter for unique Bob names
 
  constructor() {
    this.init().catch((error) => {
      console.error("Failed to initialize the scene:", error);
    });
  }
  // Function to create and add Bob to the scene
  private async createBob(): Promise<void> {
    const bob = new Entity();
    bob.Position = new THREE.Vector3(Math.random() * 10 - 5, 1, Math.random() * 10 - 5);

    // Make sure LoadingManager is initialized before using it
    if (!LoadingManager.assets) {
      console.warn("LoadingManager not initialized before creating Bob");
      LoadingManager.initialize(
        this.maincController.webgpu, 
        {
          scene: this.maincController.webgpuscene,
          camera: this.maincController.camera
        }
      );
    }
    const bobcontroller = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
        behaviourscriptname: "botbasicbehavior.js",
    });

    await bob.AddComponent(bobcontroller);
    await bob.AddComponent(new AIInput());
    // await bob.AddComponent(new KeyboardInput());
    
    // Give Bob a unique name
    this.bobCounter++;
    const bobName = `Bob-${this.bobCounter}`;
    await this.entityManager.AddEntity(bob, bobName);
    
    console.log(`${bobName} has been added to the scene!`);
  }
  
  private async init(): Promise<void> {
    this.entityManager = new EntityManager();
    this.maincController = new MainController(this.entityManager);
    
    // Initialize LoadingManager with renderer and scene 
    // This needs to happen before any assets are loaded
    LoadingManager.initialize(
      this.maincController.webgpu, 
      {
        scene: this.maincController.webgpuscene,
        camera: this.maincController.camera
      }
    );
      this.maincController.initSound() 
    console.log("LoadingManager initialized successfully");

        // Initialize the scene without Bob initially

   // this.maincController.physicsmanager.debug = false;


    //add script entity environmentbot to the scene
    const hamza = new Entity();
    hamza.Position = new THREE.Vector3(0, 1, 6);
    const hbhc = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
      behaviourscriptname: "Hamza02.js",
    });
    await hamza.AddComponent(hbhc);
    await hamza.AddComponent(new AIInput());
    await hamza.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(hamza, "Hamza Ben Hassen");
    this.maincController.MainEntity = hamza;

    hbhc.face();
    hamza.Broadcast({
      topic: "walk",
      data: { position: new THREE.Vector3(5, 0, -10) },
    });

    const uitester2 = new Entity();
    uitester2.Position = new THREE.Vector3(0, 1, 9);
    const uitestercontroller3 = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
      behaviourscriptname: "uitester2.js",
    });
    await uitester2.AddComponent(uitestercontroller3);

    await uitester2.AddComponent(new AIInput());
    await uitester2.AddComponent(new KeyboardInput());

    //     const car = new Entity();
    // const carcontroller = new CarComponent({

    // });
    // car.Position = new THREE.Vector3(0, 1, 0);
    // await car.AddComponent(carcontroller);
    // // const keyboardinput = new KeyboardInput();
    // await car.AddComponent( new KeyboardInput());

    // await this.entityManager.AddEntity(car, "Car");

     

    //  await environmentbot2.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(uitester2, "uitester6");
        const musicstreamerenity = new Entity();
        const musicstreamerenitycontrol = new CharacterComponent({
          modelpath: "models/gltf/Xbot.glb",
          animationspathslist: this.maincController.animations,
          behaviourscriptname: "musicStreamer.js",
        });
        musicstreamerenity.Position = new THREE.Vector3(-2, 1, 0);
        await musicstreamerenity.AddComponent(musicstreamerenitycontrol);
        await musicstreamerenity.AddComponent(new AIInput());
        await musicstreamerenity.AddComponent(new KeyboardInput());
        await this.entityManager.AddEntity(musicstreamerenity, "musicstreamerenity");
    

   // this.maincController.UIManager.toggleScrollmode();

    
    // Add event listener for 'b' key press to create Bob
    document.addEventListener('keydown', (event) => {
      if (event.key === 'b' || event.key === 'B') {
        this.createBob();
      }
      
      // Add 'm' key to check memory stats
      if (event.key === 'm' || event.key === 'M') {
        const stats = LoadingManager.getMemoryStats();
        console.log('=== MEMORY STATS ===');
        console.log(`WebGL Textures: ${stats.textures}`);
        console.log(`WebGL Geometries: ${stats.geometries}`);
        console.log(`Cached GLTF Assets: ${stats.assets}`);
        console.log(`Cached Animations: ${stats.animations}`);
        console.log(`Total entities: ${this.entityManager.Entities.length}`);
        console.log('Asset Reference Counts:', stats.assetRefCounts);
        console.log('Animation Reference Counts:', stats.animationRefCounts);
        console.log('===================');
      }
      
      // Add 'c' key to force cleanup
      if (event.key === 'c' || event.key === 'C') {
        console.log('Forcing cleanup...');
        LoadingManager.forceCleanup();
        const stats = LoadingManager.getMemoryStats();
        //resetphysics debug if active
    
        console.log('Memory Stats after cleanup:', stats);
      }
      
      //if f1 key is pressed,     if (this.maincController.physicsmanager.debug) {
        //   this.maincController.physicsmanager.debug = false;
        //   this.maincController.physicsmanager.debug = true;
        // }

        if (event.key === 'F1') {
          this.maincController.physicsmanager.debug = !this.maincController.physicsmanager.debug;
          console.log(`Physics debug mode: ${this.maincController.physicsmanager.debug}`);
        }
        
      // Add 'v' key to test visualizer
      if (event.key === 'v' || event.key === 'V') {
        console.log('Testing audio visualizer...');
        const mainEntity = this.maincController.MainEntity;
        if (mainEntity) {
          const characterComponent = mainEntity.getComponent('CharacterComponent') as any;
          if (characterComponent && characterComponent.getAudioManager) {
            const audioManager = characterComponent.getAudioManager();
            if (audioManager && typeof audioManager.testVisualizer === 'function') {
              audioManager.testVisualizer();
              console.log('Visualizer test triggered!');
            } else {
              console.log('AudioManager or testVisualizer method not available');
            }
          } else {
            console.log('Character component not found');
          }
        } else {
          console.log('No main entity found');
        }
      }
      
      // Add 'p' key to play music and test visualizer
      if (event.key === 'p' || event.key === 'P') {
        console.log('Playing music to test visualizer...');
        const mainEntity = this.maincController.MainEntity;
        if (mainEntity) {
          const characterComponent = mainEntity.getComponent('CharacterComponent') as any;
          if (characterComponent && typeof characterComponent.playPositionalMusic === 'function') {
            characterComponent.playPositionalMusic().then((success: boolean) => {
              if (success) {
                console.log('Music playing! Visualizer should be active now.');
              } else {
                console.log('Failed to play music');
              }
            });
          } else {
            console.log('Character component or playPositionalMusic method not found');
          }
        } else {
          console.log('No main entity found');
        }
      }
      // Add 'd' key to delete the most recent Bob entity
      if (event.key === 'd' || event.key === 'D') {
        const bobEntities = this.entityManager.Entities.filter(e => e.name.includes('Bob'));
        if (bobEntities.length > 0) {
          const lastBob = bobEntities[bobEntities.length - 1];
          console.log(`Deleting entity: ${lastBob.name}`);
          this.entityManager.RemoveEntity(lastBob);
        } else {
          console.log('No Bob entities to delete');
        }
      }
    });

    //if i is pressed ; spawn car
    document.addEventListener('keydown', (event) => {
      if (event.key === 'i' || event.key === 'I') {
           const car = new Entity();

    const carcontroller = new CarComponent({

    });
    car.Position = new THREE.Vector3(0, 1, 0);
    const h = async () => {
      await car.AddComponent(carcontroller);
       
      // const keyboardinput = new KeyboardInput();
      await car.AddComponent(new KeyboardInput());
      await this.entityManager.AddEntity(car, "Car");

     
    };
    h();

      }
    });
    
 
    //  await environmentbot2.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(uitester2, "uitester6");
    uitestercontroller3.face();
    this.maincController.MainEntity = uitester2;

   // this.maincController.UIManager.toggleScrollmode();

    //add script entity environmentbot to the scene
    const letterCounterBot = new Entity();
    letterCounterBot.Position = new THREE.Vector3(0, 1, 39);
    const letterCounterBotcontroller2 = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
      behaviourscriptname: "letterCounterBot.js",
    });

    await letterCounterBot.AddComponent(letterCounterBotcontroller2);

    await letterCounterBot.AddComponent(new AIInput());
    await letterCounterBot.AddComponent(new KeyboardInput());

    //  await environmentbot2.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(letterCounterBot, "lca");
    letterCounterBot.Broadcast({
      topic: "walk",
      data: { position: new THREE.Vector3(0, 0, 0) },
    });
    //add script entity environmentbot to the scene
    const uitesterbot = new Entity();
     const uitester6 = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
      behaviourscriptname: "uitester6.js",
    });

    await uitesterbot.AddComponent(uitester6);

    await uitesterbot.AddComponent(new AIInput());
    await uitesterbot.AddComponent(new KeyboardInput());

    //  await environmentbot2.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(uitesterbot, "uitester66");
 
    
   // this.maincController.UIManager.toggleScrollmode();

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