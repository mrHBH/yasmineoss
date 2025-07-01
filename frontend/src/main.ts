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
      { type: 'AIInput', config: {} },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];

    await bob.AddComponent(bobcontroller);
    await bob.AddComponent(new AIInput());
    await bob.AddComponent(new AudioComponent());
    // await bob.AddComponent(new KeyboardInput());
    
    // Give Bob a unique name
    this.bobCounter++;
    const bobName = `Bob-${this.bobCounter}`;
    await this.entityManager.AddEntity(bob, bobName); // Now automatically streamable
    
    console.log(`${bobName} has been added to the scene!`);
  }
  
  // Helper method to create test entities at various distances
  private async createTestEntities(): Promise<void> {
    console.log('Creating test entities at various distances...');
    const mainPos = this.maincController.MainEntity?.Position || new THREE.Vector3(0, 0, 0);
    
    // Create entities at different distances
    const distances = [50, 100, 150, 250, 300];
    for (const distance of distances) {
      const angle = Math.random() * Math.PI * 2;
      const x = mainPos.x + Math.cos(angle) * distance;
      const z = mainPos.z + Math.sin(angle) * distance;
      
      const testEntity = new Entity();
      testEntity.Position = new THREE.Vector3(x, 1, z);
      
      const testController = new CharacterComponent({
        modelpath: "models/gltf/ybot2.glb",
        animationspathslist: this.maincController.animations,
        behaviourscriptname: "botbasicbehavior.js",
      });
      
      testEntity._componentCreationInfo = [
        { 
          type: 'CharacterComponent', 
          config: {
            modelpath: "models/gltf/ybot2.glb",
            animationspathslist: this.maincController.animations,
            behaviourscriptname: "botbasicbehavior.js",
          }
        },
        { type: 'AIInput', config: {} },
        { 
          type: 'AudioComponent', 
          config: {
            audioConfig: {},
            visualizerConfig: { enabled: true }
          }
        }
      ];
      
      await testEntity.AddComponent(testController);
      await testEntity.AddComponent(new AIInput());
      await testEntity.AddComponent(new AudioComponent());
      
      const testName = `TestEntity-${distance}m`;
      await this.entityManager.AddEntity(testEntity, testName); // Now automatically streamable
      
      console.log(`Created ${testName} at distance ${distance}m`);
    }
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

    // Wait a bit for MainController to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));

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
      { type: 'AIInput', config: {} },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];
    
    await hamza.AddComponent(hbhc);
    await hamza.AddComponent(new AIInput());
    await hamza.AddComponent(new AudioComponent());
   // await hamza.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(hamza, "Hamza Ben Hassen");
   // this.maincController.MainEntity = hamza;

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
    
    // Store component creation info for streaming
    uitester2._componentCreationInfo = [
      { 
        type: 'CharacterComponent', 
        config: {
          modelpath: "models/gltf/ybot2.glb",
          animationspathslist: this.maincController.animations,
          behaviourscriptname: "uitester2.js",
        }
      },
      { type: 'AIInput', config: {} },
      { type: 'KeyboardInput', config: {} },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];
    
    await uitester2.AddComponent(uitestercontroller3);
    await uitester2.AddComponent(new AIInput());
    await uitester2.AddComponent(new KeyboardInput());
    await uitester2.AddComponent(new AudioComponent());

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
        
        // Store component creation info for streaming
        musicstreamerenity._componentCreationInfo = [
          { 
            type: 'CharacterComponent', 
            config: {
              modelpath: "models/gltf/Xbot.glb",
              animationspathslist: this.maincController.animations,
              behaviourscriptname: "musicStreamer.js",
            }
          },
          { type: 'AIInput', config: {} },
          { 
            type: 'AudioComponent', 
            config: {
              audioConfig: {},
              visualizerConfig: { enabled: true }
            }
          }
        ];
        
        await musicstreamerenity.AddComponent(musicstreamerenitycontrol);
        await musicstreamerenity.AddComponent(new AIInput());
        await musicstreamerenity.AddComponent(new AudioComponent());
      //  await musicstreamerenity.AddComponent(new KeyboardInput());
        await this.entityManager.AddEntity(musicstreamerenity, "musicstreamerenity");
    
    // Initialize minimap system after all entities are created
    // Note: MinimapComponent can work standalone, no need for separate entity
    const minimapEntity = new Entity();
    const minimapComponent = new MinimapComponent();
    await minimapEntity.AddComponent(minimapComponent);
    await this.entityManager.AddEntity(minimapEntity, "MinimapSystem", false); // Not streamable - it's a system
    console.log("Minimap system initialized");

    console.log("🌐 Entity Streaming System: All entities are now automatically streamable!");
    console.log("📊 Use 's' key to view streaming stats, 't' key to create test entities");

   // this.maincController.UIManager.toggleScrollmode();

    
    // Add event listener for 'b' key press to create Bob
    // Key bindings:
    // - 'b'/'B': Create a new Bob entity
    // - 'm'/'M': Show memory stats 
    // - 'c'/'C': Force cleanup
    // - 's'/'S': Show entity streaming stats
    // - 't'/'T': Create test entities at various distances
    // - 'F1': Toggle physics debug mode
    // - 'o': Toggle minimap visibility
    // - '[': Zoom in minimap
    // - ']': Zoom out minimap
    // - ';': Narrow view cone angle (45°)
    // - "'": Reset minimap zoom and position
    // - 'p'/'P': Play music and start visualizer
    // - 'd'/'D': Delete most recent Bob entity
    // - 'i'/'I': Spawn car entity
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
        
        // Also log physics stats
        const physicsStats = this.maincController.getPhysicsStats();
        console.log('=== PHYSICS STATS ===');
        console.log(`Total Bodies: ${physicsStats.totalBodies}`);
        console.log(`Dynamic Bodies: ${physicsStats.dynamicBodies}`);
        console.log(`Static Bodies: ${physicsStats.staticBodies}`);
        console.log(`Constraints: ${physicsStats.constraints}`);
        console.log(`Contacts: ${physicsStats.contacts}`);
        console.log(`Streaming Tiles: ${physicsStats.streamingTiles}`);
        console.log(`Streaming Objects: ${physicsStats.streamingObjects}`);
        console.log('====================');
      }
      
      // Add 'c' key to force cleanup
      if (event.key === 'c' || event.key === 'C') {
        console.log('Forcing cleanup...');
        LoadingManager.forceCleanup();
        const stats = LoadingManager.getMemoryStats();
        //resetphysics debug if active
    
        console.log('Memory Stats after cleanup:', stats);
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
      
      // Add 't' key to create test entities at various distances
      if (event.key === 't' || event.key === 'T') {
        this.createTestEntities();
      }
      
      //if f1 key is pressed,     if (this.maincController.physicsmanager.debug) {
        //   this.maincController.physicsmanager.debug = false;
        //   this.maincController.physicsmanager.debug = true;
        // }

        if (event.key === 'F1') {
          this.maincController.physicsmanager.debug = !this.maincController.physicsmanager.debug;
          console.log(`Physics debug mode: ${this.maincController.physicsmanager.debug}`);
        }
        
        // Add 'M' key to toggle minimap - disabled since minimap system is commented out
       
        if (event.key === 'o') {
          const minimapEntity = this.entityManager.Entities.find(e => e.name === 'MinimapSystem');
          if (minimapEntity) {
            const minimapComponent = minimapEntity.getComponent('MinimapComponent') as any;
            if (minimapComponent && typeof minimapComponent.toggleVisibility === 'function') {
              minimapComponent.toggleVisibility();
              console.log('Minimap visibility toggled');
            }
          }
        }
        
        
    //    Add '[' and ']' keys to adjust view cone size
      //  View cone size and angle adjustment controls (disabled with MinimapSystem)
         
        if (event.key === '[') {
          const minimapEntity = this.entityManager.Entities.find(e => e.name === 'MinimapSystem');
          if (minimapEntity) {
            const minimapComponent = minimapEntity.getComponent('MinimapComponent') as any;
            if (minimapComponent && typeof minimapComponent.zoomIn === 'function') {
              minimapComponent.zoomIn();
              console.log('Minimap zoom increased');
            }
          }
        }
        
        if (event.key === ']') {
          const minimapEntity = this.entityManager.Entities.find(e => e.name === 'MinimapSystem');
          if (minimapEntity) {
            const minimapComponent = minimapEntity.getComponent('MinimapComponent') as any;
            if (minimapComponent && typeof minimapComponent.zoomOut === 'function') {
              minimapComponent.zoomOut();
              console.log('Minimap zoom decreased');
            }
          }
        }
        
       // Add ';' and ''' keys to adjust view cone angle
        if (event.key === ';') {
          const minimapEntity = this.entityManager.Entities.find(e => e.name === 'MinimapSystem');
          if (minimapEntity) {
            const minimapComponent = minimapEntity.getComponent('MinimapComponent') as any;
            if (minimapComponent && typeof minimapComponent.setViewConeAngle === 'function') {
              minimapComponent.setViewConeAngle(45); // Narrower cone
              console.log('View cone angle decreased to 45°');
            }
          }
        }
        
        if (event.key === "'") {
          const minimapEntity = this.entityManager.Entities.find(e => e.name === 'MinimapSystem');
          if (minimapEntity) {
            const minimapComponent = minimapEntity.getComponent('MinimapComponent') as any;
            if (minimapComponent && typeof minimapComponent.resetZoom === 'function') {
              minimapComponent.resetZoom();
              console.log('Minimap zoom and position reset');
            }
          }
        }
        
        
      // Add 'p' key to play music
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
    
 
    //  await environmentbot2.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(uitester2, "uitester6", false); // Main entity should not be streamable
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

    // Store component creation info for streaming
    letterCounterBot._componentCreationInfo = [
      { 
        type: 'CharacterComponent', 
        config: {
          modelpath: "models/gltf/ybot2.glb",
          animationspathslist: this.maincController.animations,
          behaviourscriptname: "letterCounterBot.js",
        }
      },
      { type: 'AIInput', config: {} },
      { 
        type: 'AudioComponent', 
        config: {
          audioConfig: {},
          visualizerConfig: { enabled: true }
        }
      }
    ];

    await letterCounterBot.AddComponent(letterCounterBotcontroller2);
    await letterCounterBot.AddComponent(new AIInput());
    await letterCounterBot.AddComponent(new AudioComponent());
 //   await letterCounterBot.AddComponent(new KeyboardInput());

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
    // await this.entityManager.AddEntity(uitesterbot, "uitester66"); // Commented out test entity
 
    
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