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
import { DynamicuiWorkerComponent } from "./utils/Components/DynamicuiWorkerComponent";
import { threeDUIComponent } from "./utils/Components/3dUIComponent";
import { twoDUIComponent } from "./utils/Components/2dUIComponent";
import { HybridUIComponent } from "./utils/Components/HybridUIComponent";
import { HybridCodeEditor } from "./utils/Components/HybridCodeEditor";
import { profiler } from "./utils/HybridRendererProfiler";
import { hybridWorkerManager } from "./utils/workers/HybridWorkerManager";

class Main {
  private entityManager: EntityManager;
  private maincController: MainController;
  private clock = new THREE.Clock();
  private bobCounter = 0; // Counter for unique Bob names
  private loadingSpinner: HTMLElement | null = null;
  private testHybridEntities: Entity[] = []; // Track test entities
  private profilingUI: HTMLElement | null = null; // UI element for showing stats
  private workerEnabled = false; // Track worker state
 
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
          modelpath: "models/gltf/Xbot.glb",
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
  
  
    private async createInitialUI(): Promise<void> {
      const dynamicuicomponent = new DynamicuiWorkerComponent("../pages/homepage.js");
      dynamicuicomponent.sticky = true;
      const h = async () => {
        let introui = new Entity();
        
        //      await introui.AddComponent(uicomponent);
        await introui.AddComponent(dynamicuicomponent);
  
        let res = await this.maincController.entitymanager.AddEntity(introui, "homepage");
        if (res == -1) {
          return;
        }
      };
  
      h();
     
    }
 
  private async init(): Promise<void> {
    // Show loading spinner
    this.showLoadingSpinner();
    
    this.entityManager = new EntityManager();
    this.maincController = new MainController(this.entityManager);
     // await this.createInitialUI()

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
      await LoadingManager.warmUp(false); // TRUE = Keep core assets permanently loaded (never reload), FALSE = Ultra aggressive disposal
    console.log("✅ Asset warm-up complete!");    
     this.maincController.initSound();
    console.log("LoadingManager initialized successfully");

    
    // Hide loading spinner
    this.hideLoadingSpinner();

    

 
    document.addEventListener('keydown', (event) => {
      if (event.key === 'b' || event.key === 'B') {
        //50% create bob or alice
        if  (Math.random()>0.5){ this.createBob();}
           else {
            this.createAlice()
           }
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
  
      

            // Add 'h' key to spawn UI elements WITHOUT worker optimization
      if (event.key === 'h' || event.key === 'H') {
        this.testHybridPerformanceWithoutWorker();
      }
      
      // Add 'j' key to spawn UI elements WITH worker optimization
      if (event.key === 'j' || event.key === 'J') {
        this.testHybridPerformanceWithWorker();
      }

      // Add 'c' key to clear hybrid test entities (in addition to the existing cleanup)
      if (event.key === 'c' || event.key === 'C') {
        // Clear test entities first
        if (this.testHybridEntities.length > 0) {
          this.clearTestEntities();
        } else {
          // If no test entities, run the original cleanup
          console.log('Forcing cleanup...');
          LoadingManager.forceCleanup();
          const stats = LoadingManager.getMemoryStats();
          console.log('Memory Stats after cleanup:', stats);
        }
      }
      
      // Add 'k' key to force 3D mode
      if (event.key === 'k' || event.key === 'K') {
        const hybridEntity = this.entityManager.Entities.find(e => e.name === "Hybrid CSS Renderer UI");
        if (hybridEntity) {
          const hybridComp = hybridEntity.getComponent("HybridUIComponent") as any;
          if (hybridComp) {
            console.log('🎯 Forcing 3D mode...');
            hybridComp.forceMode('3d');
          }
        }
      }
      
      // Add 'l' key to force 2D mode
      if (event.key === 'l' || event.key === 'L') {
        const hybridEntity = this.entityManager.Entities.find(e => e.name === "Hybrid CSS Renderer UI");
        if (hybridEntity) {
          const hybridComp = hybridEntity.getComponent("HybridUIComponent") as any;
          if (hybridComp) {
            console.log('🎯 Forcing 2D mode...');
            hybridComp.forceMode('2d');
          }
        }
      }

        if (event.key === 'o') {
          this.maincController.physicsmanager.debug = !this.maincController.physicsmanager.debug;
          console.log(`Physics debug mode: ${this.maincController.physicsmanager.debug}`);
        }
      
      // Add 'j' key to manually toggle hybrid mode
      if (event.key === 'j' || event.key === 'J') {
        const hybridEntity = this.entityManager.Entities.find(e => e.name === "Hybrid CSS Renderer UI");
        if (hybridEntity) {
          const hybridComp = hybridEntity.getComponent("HybridUIComponent") as any;
          if (hybridComp) {
            console.log('🔄 Manually toggling hybrid mode...');
            hybridComp.toggleMode();
          }
        }
      }
      
      // Add 'k' key to force 3D mode
      if (event.key === 'k' || event.key === 'K') {
        const hybridEntity = this.entityManager.Entities.find(e => e.name === "Hybrid CSS Renderer UI");
        if (hybridEntity) {
          const hybridComp = hybridEntity.getComponent("HybridUIComponent") as any;
          if (hybridComp) {
            console.log('🎯 Forcing 3D mode...');
            hybridComp.forceMode('3d');
          }
        }
      }
      
      // Add 'l' key to force 2D mode
      if (event.key === 'l' || event.key === 'L') {
        const hybridEntity = this.entityManager.Entities.find(e => e.name === "Hybrid CSS Renderer UI");
        if (hybridEntity) {
          const hybridComp = hybridEntity.getComponent("HybridUIComponent") as any;
          if (hybridComp) {
            console.log('🎯 Forcing 2D mode...');
            hybridComp.forceMode('2d');
          }
        }
      }
        
 
        
 
   
      // Add 'd' key to delete all hybrid test entities
      if (event.key === 'd' || event.key === 'D') {
        // Clear test entities first
        if (this.testHybridEntities.length > 0) {
          this.clearTestEntities();
          console.log('🗑️ Deleted all hybrid test entities');
        } else {
          // If no test entities, delete Bob/Alice entities (original behavior)
          const bobEntities = this.entityManager.Entities.filter(e => e.name.includes('Bob') || e.name.includes('alice'));
          if (bobEntities.length > 0) {
            const lastEntity = bobEntities[bobEntities.length - 1];
            console.log(`Deleting entity: ${lastEntity.name}`);
            this.entityManager.RemoveEntity(lastEntity);
          } else {
            console.log('No entities to delete');
          }
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

   // this.maincController.UIManager.toggleScrollmode();

    //add script entity environmentbot to the scene
  
   // this.maincController.UIManager.toggleScrollmode();

    this.animate();
    await this.minimalSceneSetup();


  }

  private async minimalSceneSetup(): Promise<void> {
    console.log('🏗️ Setting up minimal scene - only essential character...');
    
    // Add only the main character (Hamza)
    const hamza = new Entity();
    hamza.Position = new THREE.Vector3(0, 1, 6);
    const hbhc = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
      behaviourscriptname: "Hamza.js",
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
    await hamza.AddComponent(new KeyboardInput())
    await hamza.AddComponent(new AudioComponent());
    await this.entityManager.AddEntity(hamza, "Hamza Ben Hassen");

    // Components are already loaded, can send commands immediately
    await hbhc.face();
    this.maincController.MainEntity = hamza;

    await hamza.Broadcast({
        topic: "walk",
        data: { position: new THREE.Vector3(5, 0, -10) },
    })

    console.log("Hamza finished initialization");
    await hamza.Broadcast({
        topic: "walk",
        data: { position: new THREE.Vector3(-15, 0, 10) },
    })
    
    console.log('✅ Minimal scene setup complete - press H for UI elements, J for worker UI elements, D to delete all');
  }

  private async sceneSetup(): Promise<void> {
    
    // Initialize the scene without Bob initially

   // this.maincController.physicsmanager.debug = false;


    //add script entity environmentbot to the scene
    const hamza = new Entity();
    hamza.Position = new THREE.Vector3(0, 1, 6);
    const hbhc = new CharacterComponent({
      modelpath: "models/gltf/ybot2.glb",
      animationspathslist: this.maincController.animations,
      behaviourscriptname: "Hamza.js",
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
    await hamza.AddComponent(new KeyboardInput())
    await hamza.AddComponent(new AudioComponent());
   // await hamza.AddComponent(new KeyboardInput());
    await this.entityManager.AddEntity(hamza, "Hamza Ben Hassen");

    // Components are already loaded, can send commands immediately
    await hbhc.face();
    this.maincController.MainEntity = hamza;

    await hamza.Broadcast({
        topic: "walk",
        data: { position: new THREE.Vector3(5, 0, -10) },
    })

        console.log("Hamza finished initialization");
    await hamza.Broadcast({
        topic: "walk",
        data: { position: new THREE.Vector3(-15, 0, 10) },
    })
 

 
    // Hybrid UI Component Example - uses new CSS hybrid renderer
    const hybridelement = new Entity();
    hybridelement.Position = new THREE.Vector3(5, 4.1, -5);
    // Ok we found a way to not have to use the x track option. Just enable YouTube notification and pop ups.
    const youtube = `<iframe width="100%" height="100%"  src="https://www.youtube.com/embed/Y2snZMA7d7o?si=TwHoDmUL1_ViXZni&amp;start=423"  title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    const hybridHtml = `<div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); width: 100%; height: 100%; padding: 25px; border-radius: 20px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4); color: white;">
                 <h1 style="text-align: center; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🔄 Hybrid CSS Renderer</h1>
                 <p id="mode-display" style="text-align: center; margin-bottom: 20px; opacity: 0.9; font-weight: bold; font-size: 18px;">Current Mode: 3D (Auto-Switch: ON)</p>
                 <div style="text-align: center; margin-bottom: 20px;">
                   <button id="force-3d-btn" class="uk-button uk-button-primary" style="margin-right: 10px; background: rgba(255,255,255,0.2); border: 2px solid white; color: white;">Force 3D Mode</button>
                   <button id="force-2d-btn" class="uk-button uk-button-secondary" style="margin-right: 10px; background: rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.5); color: white;">Force 2D Mode</button>
                   <button id="toggle-auto-btn" class="uk-button uk-button-danger" style="background: rgba(255,0,0,0.3); border: 2px solid rgba(255,255,255,0.5); color: white;">Toggle Auto-Switch</button>
                 </div>
                 <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; backdrop-filter: blur(10px);">
                   <h3 style="margin-bottom: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Hybrid Renderer Features:</h3>
                   <ul style="margin: 0; opacity: 0.95; line-height: 1.6;">
                     <li>🎨 Single unified renderer for both modes</li>
                     <li>⚡ Zero component duplication</li>
                     <li>🔧 Built-in z-index management</li>
                     <li>🎯 Automatic mode detection</li>
                     <li>✨ Smooth element cloning & sync</li>
                   </ul>
                 </div>
                  <div style="margin-top: 20px; text-align: center;">
                    <h2>Embedded YouTube Video</h2>
                    ${youtube}
               </div>`;
    
    const hybridSize = new THREE.Vector2(400, 400);
    const hybridcomp = new HybridUIComponent(hybridHtml, hybridSize,10); // Switch at 8 unit distance
    hybridcomp.sticky = true; // Allow distance-based hiding
    await hybridelement.AddComponent(hybridcomp);
   // await this.entityManager.AddEntity(hybridelement, "Hybrid CSS Renderer UI");

    // hybridelement.Quaternion =      new THREE.Quaternion().setFromAxisAngle(
    //     new THREE.Vector3(1, 0, 0),
    //    - Math.PI / 2
    //   )
    // Add event listeners after a timeout to ensure DOM is ready
    setTimeout(() => {
      const modeDisplay = hybridcomp.htmlElement.querySelector('#mode-display');
      const force3DBtn = hybridcomp.htmlElement.querySelector('#force-3d-btn');
      const force2DBtn = hybridcomp.htmlElement.querySelector('#force-2d-btn');
      const toggleAutoBtn = hybridcomp.htmlElement.querySelector('#toggle-auto-btn');

      // Update mode display
      const updateModeDisplay = () => {
        if (modeDisplay) {
          const autoSwitchStatus = hybridcomp.getAutoSwitchEnabled() ? 'ON' : 'OFF';
          modeDisplay.textContent = `Current Mode: ${hybridcomp.getCurrentMode().toUpperCase()} (Auto-Switch: ${autoSwitchStatus})`;
        }
      };

      if (force3DBtn) {
        force3DBtn.addEventListener('click', () => {
          console.log('🎯 Forcing 3D mode');
          hybridcomp.forceMode('3d');
          setTimeout(updateModeDisplay, 100);
        });
      }

      if (force2DBtn) {
        force2DBtn.addEventListener('click', () => {
          console.log('🎯 Forcing 2D mode');
          hybridcomp.forceMode('2d');
          setTimeout(updateModeDisplay, 100);
        });
      }

      if (toggleAutoBtn) {
        toggleAutoBtn.addEventListener('click', () => {
          const newState = !hybridcomp.getAutoSwitchEnabled();
          hybridcomp.setAutoSwitch(newState);
          console.log(`🔄 Auto-switch ${newState ? 'enabled' : 'disabled'}`);
          setTimeout(updateModeDisplay, 100);
        });
      }

      // Initial display update
      updateModeDisplay();

      // Also add similar event listeners to the clone element after another timeout
      setTimeout(() => {
        const cloneForce3DBtn = hybridcomp.getCloneElement()?.querySelector('#force-3d-btn');
        const cloneForce2DBtn = hybridcomp.getCloneElement()?.querySelector('#force-2d-btn');
        const cloneToggleAutoBtn = hybridcomp.getCloneElement()?.querySelector('#toggle-auto-btn');

        if (cloneForce3DBtn) {
          cloneForce3DBtn.addEventListener('click', () => {
            console.log('🎯 Forcing 3D mode (from clone)');
            hybridcomp.forceMode('3d');
            setTimeout(updateModeDisplay, 100);
          });
        }

        if (cloneForce2DBtn) {
          cloneForce2DBtn.addEventListener('click', () => {
            console.log('🎯 Forcing 2D mode (from clone)');
            hybridcomp.forceMode('2d');
            setTimeout(updateModeDisplay, 100);
          });
        }

        if (cloneToggleAutoBtn) {
          cloneToggleAutoBtn.addEventListener('click', () => {
            const newState = !hybridcomp.getAutoSwitchEnabled();
            hybridcomp.setAutoSwitch(newState);
            console.log(`🔄 Auto-switch ${newState ? 'enabled' : 'disabled'} (from clone)`);
            setTimeout(updateModeDisplay, 100);
          });
        }
      }, 500);
    }, 1000);
    //add several more elements to test hybrid renderer  ( position and rotate them differently )
    //50 
    
    // // // Create 50 hybrid renderer elements with different positions and rotations
    for (let i = 0; i < 0; i++) {
      const hybridTestElement = new Entity();
      
      // Random position in a larger area
      const x = (Math.random() - 0.5) * 5; // -50 to 50
      const y = Math.random() * 10 + 0.1; // 0.1 to 10.1
      const z = (Math.random() - 0.5) * 5; // -50 to 50
      hybridTestElement.Position = new THREE.Vector3(x, y, z);
      
      // Random rotation
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;
      // hybridTestElement.Quaternion = new THREE.Quaternion()
      // .setFromEuler(new THREE.Euler(rotX, rotY, rotZ));
      
      // Varied content for each element
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
      const color = colors[i % colors.length];
      
      const testHtml = `<div style="background: linear-gradient(45deg, ${color}, #ffffff); width: 100%; height: 100%; padding: 15px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); color: #333;">
               <h2 style="text-align: center; margin-bottom: 10px;">Element #${i + 1}</h2>
               <p style="text-align: center; margin-bottom: 15px; font-size: 14px;">Position: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})</p>
               <div style="text-align: center;">
                 <button class="uk-button uk-button-primary" style="margin: 5px; font-size: 12px;">Test ${i + 1}</button>
               </div>
               <div style="background: rgba(255,255,255,0.3); padding: 10px; border-radius: 5px; margin-top: 10px;">
                 <p style="margin: 0; font-size: 12px; text-align: center;">Hybrid Renderer Test</p>
               </div>
               </div>`;
      
      // Varied sizes
      const width = 200 + (i % 5) * 50; // 200-400
      const height = 150 + (i % 4) * 50; // 150-300
      const testSize = new THREE.Vector2(width, height);
      
      // Varied switch distances
      const switchDistance =  8
      
      const testHybridComp = new HybridUIComponent(testHtml, testSize, switchDistance);
      testHybridComp.sticky = true
      //testHybridComp.sticky = Math.random() > 0.5; // Random sticky behavior
      
      await hybridTestElement.AddComponent(testHybridComp);
      await this.entityManager.AddEntity(hybridTestElement, `HybridTest-${i + 1}`);
      
 
    }
    
    console.log("🎯 Created 50 hybrid renderer test elements with varied positions, rotations, and properties!");

   
 
    // Hybrid Code Editor - horizontal layout
    const codeeditorentity = new Entity();
    codeeditorentity.Position = new THREE.Vector3(-5, 2.1, -5);
    // codeeditorentity.Quaternion = new THREE.Quaternion().setFromAxisAngle(
    //   new THREE.Vector3(1, 0, 0),
    //   -Math.PI / 2
    // );
    
    const codeEditorSize = new THREE.Vector2(500, 500); // Wider for horizontal layout
    const hybridCodeEditor = new HybridCodeEditor(codeEditorSize, 11); // Switch at 12 unit distance
    
    await codeeditorentity.AddComponent(hybridCodeEditor);
    await this.entityManager.AddEntity(codeeditorentity, "Hybrid Code Editor");
//
    // Add event listeners for the code editor after a timeout to ensure DOM is ready
    setTimeout(() => {
      // Add keyboard shortcuts for quick mode switching
      document.addEventListener('keydown', (event) => {
        // Ctrl+Shift+E to toggle editor mode
        if (event.ctrlKey && event.shiftKey && event.key === 'E') {
          hybridCodeEditor.toggleMode();
          event.preventDefault();
        }
        
        // Ctrl+Shift+1 to force 3D mode
        if (event.ctrlKey && event.shiftKey && event.key === '1') {
          hybridCodeEditor.forceMode('3d');
          event.preventDefault();
        }
        
        // Ctrl+Shift+2 to force 2D mode
        if (event.ctrlKey && event.shiftKey && event.key === '2') {
          hybridCodeEditor.forceMode('2d');
          event.preventDefault();
        }
      });
    }, 1000);
  
 

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
  }

  private async testHybridPerformanceWithoutWorker(): Promise<void> {
    console.log('🧪 Creating 20 UI elements WITHOUT Worker optimization...');
    
    // Clear previous test entities
    this.clearTestEntities();
    
    // Disable worker in manager
    this.workerEnabled = false;
    
    // Start profiling
    profiler.enable();
    profiler.reset();
    
    // Create 20 hybrid UI entities without worker
    await this.spawnUIElements(false);
    
    // Show profiling UI
    this.showProfilingUI();
    
    console.log(`✅ Created 20 hybrid entities WITHOUT worker optimization`);
  }

  private async testHybridPerformanceWithWorker(): Promise<void> {
    console.log('🚀 Creating 20 UI elements WITH Worker optimization...');
    
    // Clear previous test entities
    this.clearTestEntities();
    
    // Enable worker in manager
    this.workerEnabled = true;
    
    // Start profiling
    profiler.enable();
    profiler.reset();
    
    // Create 20 hybrid UI entities with worker
    await this.spawnUIElements(true);
    
    // Show profiling UI
    this.showProfilingUI();
    
    console.log(`✅ Created 20 hybrid entities WITH worker optimization`);
  }

  private async spawnUIElements(useWorker: boolean): Promise<void> {
    // Create the main hybrid UI element (similar to the one in sceneSetup)
    await this.createMainHybridUIElement();
    
    // Create the hybrid code editor
    await this.createHybridCodeEditor();
    
    // Create 20 test hybrid UI entities for performance testing
    for (let i = 0; i < 20; i++) {
      await this.createTestHybridEntity(i, useWorker);
    }
  }

  private async createMainHybridUIElement(): Promise<void> {
    const hybridelement = new Entity();
    hybridelement.Position = new THREE.Vector3(5, 4.1, -5);
    
    const youtube = `<iframe width="100%" height="100%"  src="https://www.youtube.com/embed/Y2snZMA7d7o?si=TwHoDmUL1_ViXZni&amp;start=423"  title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    const hybridHtml = `<div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); width: 100%; height: 100%; padding: 25px; border-radius: 20px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4); color: white;">
                 <h1 style="text-align: center; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🔄 Hybrid CSS Renderer</h1>
                 <p id="mode-display" style="text-align: center; margin-bottom: 20px; opacity: 0.9; font-weight: bold; font-size: 18px;">Current Mode: 3D (Auto-Switch: ON)</p>
                 <div style="text-align: center; margin-bottom: 20px;">
                   <button id="force-3d-btn" class="uk-button uk-button-primary" style="margin-right: 10px; background: rgba(255,255,255,0.2); border: 2px solid white; color: white;">Force 3D Mode</button>
                   <button id="force-2d-btn" class="uk-button uk-button-secondary" style="margin-right: 10px; background: rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.5); color: white;">Force 2D Mode</button>
                   <button id="toggle-auto-btn" class="uk-button uk-button-danger" style="background: rgba(255,0,0,0.3); border: 2px solid rgba(255,255,255,0.5); color: white;">Toggle Auto-Switch</button>
                 </div>
                 <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; backdrop-filter: blur(10px);">
                   <h3 style="margin-bottom: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Hybrid Renderer Features:</h3>
                   <ul style="margin: 0; opacity: 0.95; line-height: 1.6;">
                     <li>🎨 Single unified renderer for both modes</li>
                     <li>⚡ Zero component duplication</li>
                     <li>🔧 Built-in z-index management</li>
                     <li>🎯 Automatic mode detection</li>
                     <li>✨ Smooth element cloning & sync</li>
                   </ul>
                 </div>
                  <div style="margin-top: 20px; text-align: center;">
                    <h2>Embedded YouTube Video</h2>
                    ${youtube}
               </div>`;
    
    const hybridSize = new THREE.Vector2(400, 400);
    const hybridcomp = new HybridUIComponent(hybridHtml, hybridSize, 10);
    hybridcomp.sticky = true;
    await hybridelement.AddComponent(hybridcomp);
    await this.entityManager.AddEntity(hybridelement, "Main Hybrid CSS Renderer UI");
    
    // Track this entity
    this.testHybridEntities.push(hybridelement);
    
    // Add event listeners after a timeout
    setTimeout(() => {
      const modeDisplay = hybridcomp.htmlElement.querySelector('#mode-display');
      const force3DBtn = hybridcomp.htmlElement.querySelector('#force-3d-btn');
      const force2DBtn = hybridcomp.htmlElement.querySelector('#force-2d-btn');
      const toggleAutoBtn = hybridcomp.htmlElement.querySelector('#toggle-auto-btn');

      const updateModeDisplay = () => {
        if (modeDisplay) {
          const autoSwitchStatus = hybridcomp.getAutoSwitchEnabled() ? 'ON' : 'OFF';
          modeDisplay.textContent = `Current Mode: ${hybridcomp.getCurrentMode().toUpperCase()} (Auto-Switch: ${autoSwitchStatus})`;
        }
      };

      if (force3DBtn) {
        force3DBtn.addEventListener('click', () => {
          console.log('🎯 Forcing 3D mode');
          hybridcomp.forceMode('3d');
          setTimeout(updateModeDisplay, 100);
        });
      }

      if (force2DBtn) {
        force2DBtn.addEventListener('click', () => {
          console.log('🎯 Forcing 2D mode');
          hybridcomp.forceMode('2d');
          setTimeout(updateModeDisplay, 100);
        });
      }

      if (toggleAutoBtn) {
        toggleAutoBtn.addEventListener('click', () => {
          const newState = !hybridcomp.getAutoSwitchEnabled();
          hybridcomp.setAutoSwitch(newState);
          console.log(`🔄 Auto-switch ${newState ? 'enabled' : 'disabled'}`);
          setTimeout(updateModeDisplay, 100);
        });
      }

      updateModeDisplay();
    }, 1000);
  }

  private async createHybridCodeEditor(): Promise<void> {
    const codeeditorentity = new Entity();
    codeeditorentity.Position = new THREE.Vector3(-5, 2.1, -5);
    
    const codeEditorSize = new THREE.Vector2(500, 500);
    const hybridCodeEditor = new HybridCodeEditor(codeEditorSize, 11);
    
    await codeeditorentity.AddComponent(hybridCodeEditor);
    await this.entityManager.AddEntity(codeeditorentity, "Hybrid Code Editor");
    
    // Track this entity
    this.testHybridEntities.push(codeeditorentity);
  }

  private async createTestHybridEntity(index: number, useWorker: boolean): Promise<void> {
    const entity = new Entity();
    
    // Position entities in a grid pattern
    const gridSize = Math.ceil(Math.sqrt(20)); // 5x5 grid for 20 entities
    const spacing = 3;
    const x = (index % gridSize) * spacing - (gridSize * spacing) / 2;
    const z = Math.floor(index / gridSize) * spacing - (gridSize * spacing) / 2;
    entity.Position = new THREE.Vector3(x, 2, z);
    
    // Create simple HTML content for the test entity
    const testHtml = `<div style="background: linear-gradient(45deg, ${useWorker ? '#00ff00' : '#ff6600'}, #ffffff); width: 100%; height: 100%; padding: 15px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); color: #333;">
               <h2 style="text-align: center; margin-bottom: 10px;">Test #${index + 1}</h2>
               <p style="text-align: center; margin-bottom: 15px; font-size: 14px;">Worker: ${useWorker ? 'Enabled' : 'Disabled'}</p>
               <div style="text-align: center;">
                 <button class="uk-button uk-button-primary" style="margin: 5px; font-size: 12px;">Performance Test</button>
               </div>
               <div style="background: rgba(255,255,255,0.3); padding: 10px; border-radius: 5px; margin-top: 10px;">
                 <p style="margin: 0; font-size: 12px; text-align: center;">Grid Position: (${x.toFixed(1)}, ${z.toFixed(1)})</p>
               </div>
               </div>`;
    
    const testSize = new THREE.Vector2(200, 150);
    const testHybridComp = new HybridUIComponent(testHtml, testSize, 8);
    testHybridComp.sticky = true;
    
    try {
      await entity.AddComponent(testHybridComp);
      await this.entityManager.AddEntity(entity, `TestHybrid-${index + 1}`);
      
      // Track the entity
      this.testHybridEntities.push(entity);
      
    } catch (error) {
      console.error(`Failed to create test hybrid entity ${index + 1}:`, error);
    }
  }

  private clearTestEntities(): void {
    // Remove all test entities
    this.testHybridEntities.forEach(entity => {
      this.entityManager.RemoveEntity(entity);
    });
    this.testHybridEntities = [];
    
    // Hide profiling UI
    this.hideProfilingUI();
    
    console.log('🧹 Cleared all test entities');
  }

  private showProfilingUI(): void {
    if (this.profilingUI) {
      this.hideProfilingUI();
    }
    
    // Create profiling UI
    this.profilingUI = document.createElement('div');
    this.profilingUI.id = 'profiling-ui';
    this.profilingUI.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
    `;
    
    document.body.appendChild(this.profilingUI);
    
    // Update profiling UI every frame
    this.updateProfilingUI();
  }

  private updateProfilingUI(): void {
    if (!this.profilingUI) return;
    
    const stats = profiler.getStats();
    
    this.profilingUI.innerHTML = `
      <h3>🔍 Hybrid Renderer Performance</h3>
      <div><strong>Mode:</strong> ${this.workerEnabled ? 'WITH Worker' : 'WITHOUT Worker'}</div>
      <div><strong>Test Entities:</strong> ${this.testHybridEntities.length}</div>
      <hr>
      <div><strong>Current FPS:</strong> ${stats.fps ? stats.fps.toFixed(1) : 'N/A'}</div>
      ${stats.operations.render ? `<div><strong>Render Avg:</strong> ${stats.operations.render.avg.toFixed(2)}ms</div>` : ''}
      ${stats.operations.update ? `<div><strong>Update Avg:</strong> ${stats.operations.update.avg.toFixed(2)}ms</div>` : ''}
      <hr>
      <div><strong>Operation Samples:</strong></div>
      ${Object.entries(stats.operations).map(([op, data]: [string, any]) => 
        `<div style="font-size: 10px;">  ${op}: ${data.samples} samples</div>`
      ).join('')}
      <hr>
      <div><strong>Counters:</strong></div>
      ${Object.entries(stats.counters).map(([name, count]) => 
        `<div style="font-size: 10px;">  ${name}: ${count}</div>`
      ).join('')}
      <hr>
      <div style="font-size: 10px; opacity: 0.7;">
        Press H: Spawn UI elements (no worker)<br>
        Press J: Spawn UI elements (with worker)<br>
        Press D: Delete all UI elements<br>
        Press C: Clear test entities / cleanup
      </div>
    `;
    
    // Schedule next update
    requestAnimationFrame(() => this.updateProfilingUI());
  }

  private hideProfilingUI(): void {
    if (this.profilingUI) {
      document.body.removeChild(this.profilingUI);
      this.profilingUI = null;
    }
  }

  private async animate(): Promise<void> {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    await this.entityManager.Update(delta);
    await this.maincController.update(delta);
  }
}
new Main();