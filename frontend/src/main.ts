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
import { KeyboardInput } from "./utils/Components/KeyboardInput";
import { AudioComponent } from "./utils/Components/AudioComponent";
// Add this import statement
import { LoadingManager } from "./utils/LoadingManager";
import {  CarComponent } from "./utils/Components/CarComponent";
import { MinimapComponent } from "./utils/Components/MinimapComponent";

class Main {
  private entityManager: EntityManager;
  private maincController: MainController;
  private clock = new THREE.Clock();
  private bobCounter = 0; // Counter for unique Bob names
  private loadingSpinner: HTMLElement | null = null;
 
  constructor() {
    this.init().catch((error) => {
      console.error("Failed to initialize the scene:", error);
    });
  }

  private showLoadingSpinner(): void {
    // Create loading spinner element
    this.loadingSpinner = document.createElement('div');
    this.loadingSpinner.id = 'loading-spinner';
    this.loadingSpinner.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        text-align: center;
        z-index: 9999;
      ">
        <div style="
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        "></div>
        <div>Loading assets...</div>
      </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.loadingSpinner);
  }

  private hideLoadingSpinner(): void {
    if (this.loadingSpinner) {
      document.body.removeChild(this.loadingSpinner);
      this.loadingSpinner = null;
    }
  }

  // Helper method to wait for behavior script to be fully initialized
  private async waitForBehaviorScriptReady(characterComponent: any): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        // Check if behavior script exists and is ready to receive commands
        if (characterComponent.behaviorScript && 
            characterComponent.behaviorScript.ready !== false) {
          console.log('Behavior script is ready for commands');
          resolve();
        } else {
          setTimeout(checkReady, 100); // Check every 100ms
        }
      };
      checkReady();
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
        this.maincController.webglrenderer, 
        {
          scene: this.maincController.webglscene,
          camera: this.maincController.camera
        }
      );
    }
    const bobcontroller = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
        behaviourscriptname: "botbasicbehavior.js",
    });

    // Store component creation info for restoration
    bob._componentCreationInfo = [
      { 
        type: 'CharacterComponent', 
        config: {
          modelpath: "models/gltf/ybot2.glb",
          animationspathslist: this.maincController.animations,
          behaviourscriptname: "botbasicbehavior.js",
        }
      },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];

    await bob.AddComponent(bobcontroller);
    await bob.AddComponent(new AudioComponent());
    // await bob.AddComponent(new KeyboardInput());
    
    // Give Bob a unique name
    this.bobCounter++;
    const bobName = `Bob-${this.bobCounter}`;
    await this.entityManager.AddEntity(bob, bobName); // Now automatically streamable
    
    console.log(`${bobName} has been added to the scene!`);
  }

    private async createAlice(): Promise<void> {
    const alice = new Entity();
    alice.Position = new THREE.Vector3(Math.random() * 10 - 5, 1, Math.random() * 10 - 5);

    // Make sure LoadingManager is initialized before using it
    if (!LoadingManager.assets) {
      console.warn("LoadingManager not initialized before creating Bob");
      LoadingManager.initialize(
        this.maincController.webglrenderer, 
        {
          scene: this.maincController.webglscene,
          camera: this.maincController.camera
        }
      );
    }
    const alicecontroller = new CharacterComponent({
      modelpath: "models/gltf/Xbot.glb",
      animationspathslist: this.maincController.animations,
        behaviourscriptname: "botbasicbehavior.js",
    });

    // Store component creation info for restoration
    alice._componentCreationInfo = [
      { 
        type: 'CharacterComponent', 
        config: {
          modelpath: "models/gltf/ybot2.glb",
          animationspathslist: this.maincController.animations,
          behaviourscriptname: "botbasicbehavior.js",
        }
      },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];

    await alice.AddComponent(alicecontroller);
    await alice.AddComponent(new AudioComponent());
    // await bob.AddComponent(new KeyboardInput());
    
    // Give Bob a unique name
    this.bobCounter++;
    const bobName = `alice-${this.bobCounter}`;
    await this.entityManager.AddEntity(alice, bobName); // Now automatically streamable
    
    console.log(`${bobName} has been added to the scene!`);
  }
  
  
 
  private async init(): Promise<void> {
    // Show loading spinner
    this.showLoadingSpinner();
    
    this.entityManager = new EntityManager();
    this.maincController = new MainController(this.entityManager);
    
    // Initialize LoadingManager with renderer and scene 
    // This needs to happen before any assets are loaded
    LoadingManager.initialize(
      this.maincController.webglrenderer, 
      {
        scene: this.maincController.webglscene,
        camera: this.maincController.camera
      }
    );
    
    // Optional: Warm up LoadingManager with core assets for better performance
    // Comment out the next 3 lines if you want no preloading at all
    console.log("🔥 Starting asset warm-up...");
  await LoadingManager.warmUp(true); // TRUE = Keep core assets permanently loaded (never reload), FALSE = Ultra aggressive disposal
    console.log("✅ Asset warm-up complete!");
    
   // this.maincController.initSound();
    console.log("LoadingManager initialized successfully");

    // Wait a bit for MainController to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Hide loading spinner
    this.hideLoadingSpinner();

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
    
    // Store component creation info for streaming
    hamza._componentCreationInfo = [
      { 
        type: 'CharacterComponent', 
        config: {
          modelpath: "models/gltf/ybot2.glb",
          animationspathslist: this.maincController.animations,
          behaviourscriptname: "Hamza02.js",
        }
      },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];
    
    await hamza.AddComponent(hbhc);
    await hamza.AddComponent(new AudioComponent());
   // await hamza.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(hamza, "Hamza Ben Hassen");

    // Components are already loaded, can send commands immediately
    await hbhc.face();
   await  hamza.Broadcast({
        topic: "walk",
        data: { position: new THREE.Vector3(5, 0, -10) },
      });
  //   // Wait a bit for the face animation to complete and behavior script to fully initialize
  //   setTimeout(() => {
  //     hamza.Broadcast({
  //       topic: "walk",
  //       data: { position: new THREE.Vector3(5, 0, -10) },
  //     });
  //   }, 1000); // Delay to ensure face animation is ready

  //   const uitester2 = new Entity();
  //   uitester2.Position = new THREE.Vector3(0, 1, 9);
  //   const uitestercontroller3 = new CharacterComponent({
  //     modelpath: "models/gltf/ybot2.glb",
  //     animationspathslist: this.maincController.animations,
  //     behaviourscriptname: "uitester2.js",
  //   });
    

  //   // Store component creation info for streaming
  //   uitester2._componentCreationInfo = [
  //     { 
  //       type: 'CharacterComponent', 
  //       config: {
  //         modelpath: "models/gltf/ybot2.glb",
  //         animationspathslist: this.maincController.animations,
  //         behaviourscriptname: "uitester2.js",
  //       }
  //     },
  //     { type: 'KeyboardInput', config: {} },
  //     { 
  //       type: 'AudioComponent', 
  //       config: {
  //         audioConfig: {},
  //         visualizerConfig: { enabled: true }
  //       }
  //     }
  //   ];
    
  //   await uitester2.AddComponent(uitestercontroller3);
  //   await uitester2.AddComponent(new KeyboardInput());
  //   await uitester2.AddComponent(new AudioComponent());

  //   //     const car = new Entity();
  //   // const carcontroller = new CarComponent({

  //   // });
  //   // car.Position = new THREE.Vector3(0, 1, 0);
  //   // await car.AddComponent(carcontroller);
  //   // // const keyboardinput = new KeyboardInput();
  //   // await car.AddComponent( new KeyboardInput());

  //   // await this.entityManager.AddEntity(car, "Car");

     

  //   //  await environmentbot2.AddComponent(new KeyboardInput());
  //   await this.entityManager.AddEntity(uitester2, "uitester6");
  //       this.maincController.MainEntity = uitester2;
  //       const musicstreamerenity = new Entity();
  //       const musicstreamerenitycontrol = new CharacterComponent({
  //         modelpath: "models/gltf/Xbot.glb",
  //         animationspathslist: this.maincController.animations,
  //         behaviourscriptname: "musicStreamer.js",
  //       });
  //       musicstreamerenity.Position = new THREE.Vector3(-2, 1, 0);
        
  //       // Store component creation info for streaming
  //       musicstreamerenity._componentCreationInfo = [
  //         { 
  //           type: 'CharacterComponent', 
  //           config: {
  //             modelpath: "models/gltf/Xbot.glb",
  //             animationspathslist: this.maincController.animations,
  //             behaviourscriptname: "musicStreamer.js",
  //           }
  //         },
  //         { type: 'AIInput', config: {} },
  //         { 
  //           type: 'AudioComponent', 
  //           config: {
  //             audioConfig: {},
  //             visualizerConfig: { enabled: true }
  //           }
  //         }
  //       ];
        
  //       await musicstreamerenity.AddComponent(musicstreamerenitycontrol);
  //       await musicstreamerenity.AddComponent(new AudioComponent());
  //     //  await musicstreamerenity.AddComponent(new KeyboardInput());
  //       await this.entityManager.AddEntity(musicstreamerenity, "musicstreamerenity");
    
  //   this.maincController.UIManager.toggleBirdEyemode();

//   const letterCounterBot = new Entity();
//     letterCounterBot.Position = new THREE.Vector3(0, 1, 39);
//     const letterCounterBotcontroller2 = new CharacterComponent({
//       modelpath: "models/gltf/ybot2.glb",
//       animationspathslist: this.maincController.animations,
//       behaviourscriptname: "letterCounterBot.js",
//     });

//     // Store component creation info for streaming
//     letterCounterBot._componentCreationInfo = [
//       { 
//         type: 'CharacterComponent', 
//         config: {
//           modelpath: "models/gltf/ybot2.glb",
//           animationspathslist: this.maincController.animations,
//           behaviourscriptname: "letterCounterBot.js",
//         }
//       },
//       { 
//         type: 'AudioComponent', 
//         config: {
//           audioConfig: {},
//           visualizerConfig: { enabled: true }
//         }
//       }
//     ];

//     await letterCounterBot.AddComponent(letterCounterBotcontroller2);
//     //await letterCounterBot.AddComponent(new AIInput());
//     await letterCounterBot.AddComponent(new AudioComponent());
//  //   await letterCounterBot.AddComponent(new KeyboardInput());

//     //  await environmentbot2.AddComponent(new KeyboardInput());
//     await this.entityManager.AddEntity(letterCounterBot, "lca");
    
//     // Component is already loaded, can send commands immediately
//     letterCounterBot.Broadcast({
//       topic: "walk",
//       data: { position: new THREE.Vector3(0, 0, 0) },
//     });
//     //add script entity environmentbot to the scene
//     const uitesterbot = new Entity();
//      const uitester6 = new CharacterComponent({
//       modelpath: "models/gltf/ybot2.glb",
//       animationspathslist: this.maincController.animations,
//       behaviourscriptname: "uitester6.js",
//     });

//     await uitesterbot.AddComponent(uitester6);

     
//     await uitesterbot.AddComponent(new KeyboardInput());

//     await uitesterbot.AddComponent(new KeyboardInput());
//     await this.entityManager.AddEntity(uitesterbot, "uitester66"); // Commented out test entity
    
    

 
    document.addEventListener('keydown', (event) => {
      if (event.key === 'b' || event.key === 'B') {
        //50% create bob or alice
        if  (Math.random()>0.5){ this.createBob();}
           else {
            this.createAlice()
           }
      }
      
     
      
      // Add 'c' key to force cleanup
      if (event.key === 'c' || event.key === 'C') {
        console.log('Forcing cleanup...');
        LoadingManager.forceCleanup();
        const stats = LoadingManager.getMemoryStats();
        //resetphysics debug if active
    
        console.log('Memory Stats after cleanup:', stats);
      }
      
      // Add 'r' key to complete reset
      if (event.key === 'r' || event.key === 'R') {
        console.log('Performing complete LoadingManager reset...');
        LoadingManager.completeReset();
        const stats = LoadingManager.getMemoryStats();
        console.log('Memory Stats after reset:', stats);
      }
      
      // Add 's' key to show streaming stats
      if (event.key === 's' || event.key === 'S') {
        const allEntities = this.entityManager.Entities;
        const streamedEntities = allEntities.filter(e => e._isStreamedEntity);
        const nonStreamedEntities = allEntities.filter(e => !e._isStreamedEntity);
        const totalStreamedStates = (this.entityManager as any)._streamedEntityStates.size;
        
        console.log('=== ENTITY STREAMING STATS ===');
        console.log(`Total entities: ${allEntities.length}`);
        console.log(`Streamable entities: ${streamedEntities.length}`);
        console.log(`Non-streamable entities: ${nonStreamedEntities.length}`);
        console.log(`Cached tile states: ${totalStreamedStates}`);
        console.log(`Main entity position: ${this.maincController.MainEntity?.Position.x.toFixed(1)}, ${this.maincController.MainEntity?.Position.z.toFixed(1)}`);
        
        // Show non-streamable entities (usually system entities)
        if (nonStreamedEntities.length > 0) {
          console.log('\nNon-streamable entities:');
          nonStreamedEntities.forEach(entity => {
            console.log(`  ${entity.name} (System entity)`);
          });
        }
        
        // Show streamable entity positions
        if (streamedEntities.length > 0) {
          console.log('\nStreamable entities:');
          streamedEntities.forEach(entity => {
            const distance = this.maincController.MainEntity ? 
              entity.Position.distanceTo(this.maincController.MainEntity.Position) : 0;
            console.log(`  ${entity.name}: (${entity.Position.x.toFixed(1)}, ${entity.Position.z.toFixed(1)}) - Distance: ${distance.toFixed(1)} - Tile: ${entity._originTileKey}`);
          });
        }
        console.log('===============================');
      }
  
      

        if (event.key === 'o') {
          this.maincController.physicsmanager.debug = !this.maincController.physicsmanager.debug;
          console.log(`Physics debug mode: ${this.maincController.physicsmanager.debug}`);
        }
        
 
        
 
   
      // Add 'd' key to delete the most recent Bob or Alice entity
      if (event.key === 'd' || event.key === 'D') {
        const bobEntities = this.entityManager.Entities.filter(e => e.name.includes('Bob') || e.name.includes('alice'));
        if (bobEntities.length > 0) {
          const lastEntity = bobEntities[bobEntities.length - 1];
          console.log(`Deleting entity: ${lastEntity.name}`);
          this.entityManager.RemoveEntity(lastEntity);
        } else {
          console.log('No Bob or Alice entities to delete');
        }
      }
      
      // Add 'e' key to test entity streaming disposal
      if (event.key === 'e' || event.key === 'E') {
        console.log('Testing entity streaming disposal...');
        const streamingStats = this.entityManager.getStreamingStats();
        console.log('Entity streaming stats:', streamingStats);
        
        // List all entities and their distances
        if (this.maincController.MainEntity) {
          const mainPos = this.maincController.MainEntity.Position;
          console.log('All entities and distances:');
          this.entityManager.Entities.forEach(entity => {
            const distance = entity.Position.distanceTo(mainPos);
            console.log(`  ${entity.name}: Distance ${distance.toFixed(1)}, Streamable: ${entity._isStreamedEntity}, MaxDistance: ${entity._maxDistanceFromMainEntity}`);
          });
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
    
    // Store component creation info for streaming
    car._componentCreationInfo = [
      { type: 'CarComponent', config: {} },
      { type: 'KeyboardInput', config: {} }
    ];
    
    const h = async () => {
      await car.AddComponent(carcontroller);
       
      // const keyboardinput = new KeyboardInput();
      await car.AddComponent(new KeyboardInput());
      await this.entityManager.AddEntity(car, "Car");
      this.maincController.MainEntity = car;
     
    };
    h();

      }
    });
    
 
    // //  await environmentbot2.AddComponent(new KeyboardInput());
    // await this.entityManager.AddEntity(uitester2, "uitester6", false); // Main entity should not be streamable
    // uitestercontroller3.face();
    // this.maincController.MainEntity = uitester2;

   // this.maincController.UIManager.toggleScrollmode();

    //add script entity environmentbot to the scene
  
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