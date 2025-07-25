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
 
import { HybridUIComponent } from "./utils/Components/HybridUIComponent";
import { HybridCodeEditor } from "./utils/Components/HybridCodeEditor";
import { CodeEditor } from "./utils/Components/CodeEditor";
import { CarComponent } from "./utils/Components/CarComponent";

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
  
      

            // Add 'h' key to test hybrid UI modes manually
      if (event.key === 'h' || event.key === 'H') {
        const hybridEntity = this.entityManager.Entities.find(e => e.name === "Hybrid CSS Renderer UI");
        if (hybridEntity) {
          const hybridComp = hybridEntity.getComponent("HybridUIComponent") as any;
          if (hybridComp) {
            console.log('=== HYBRID UI DEBUG INFO ===');
            console.log(`Current Mode: ${hybridComp.getCurrentMode()}`);
            console.log(`Auto-Switch Enabled: ${hybridComp.getAutoSwitchEnabled()}`);
            console.log(`Zoom Threshold: ${hybridComp.zoomThreshold}`);
            console.log(`Entity Position: ${hybridEntity.Position.x.toFixed(2)}, ${hybridEntity.Position.y.toFixed(2)}, ${hybridEntity.Position.z.toFixed(2)}`);
            
            if (this.maincController.camera) {
              const distance = hybridEntity.Position.distanceTo(this.maincController.camera.position);
              console.log(`Distance to Camera: ${distance.toFixed(2)}`);
              console.log(`Should be 2D: ${distance < hybridComp.zoomThreshold}`);
            }
            console.log('============================');
          }
        }
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

   // this.maincController.UIManager.toggleScrollmode();

    //add script entity environmentbot to the scene
  
   // this.maincController.UIManager.toggleScrollmode();

    this.animate();
    await this.sceneSetup();


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
    const youtube = `<iframe width="1000" height="800"  src="https://www.youtube.com/embed/Y2snZMA7d7o?si=TwHoDmUL1_ViXZni&amp;start=423"  title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    const hybridHtml = ` 
                    ${youtube}
               `;
    
    const hybridSize = new THREE.Vector2(1400, 1000);
    const hybridcomp = new HybridUIComponent(youtube, hybridSize,10); // Switch at 8 unit distance
    hybridcomp.sticky = true; // Allow distance-based hiding
    await hybridelement.AddComponent(hybridcomp);
   await this.entityManager.AddEntity(hybridelement, "Hybrid CSS Renderer UI");

    // hybridelement.Quaternion =      new THREE.Quaternion().setFromAxisAngle(
    //     new THREE.Vector3(1, 0, 0),
    //    - Math.PI / 2
    //   )
    // Add event listeners after a timeout to ensure DOM is ready
    // setTimeout(() => {
    //   const modeDisplay = hybridcomp.htmlElement.querySelector('#mode-display');
    //   const force3DBtn = hybridcomp.htmlElement.querySelector('#force-3d-btn');
    //   const force2DBtn = hybridcomp.htmlElement.querySelector('#force-2d-btn');
    //   const toggleAutoBtn = hybridcomp.htmlElement.querySelector('#toggle-auto-btn');

    //   // Update mode display
    //   const updateModeDisplay = () => {
    //     if (modeDisplay) {
    //       const autoSwitchStatus = hybridcomp.getAutoSwitchEnabled() ? 'ON' : 'OFF';
    //       modeDisplay.textContent = `Current Mode: ${hybridcomp.getCurrentMode().toUpperCase()} (Auto-Switch: ${autoSwitchStatus})`;
    //     }
    //   };

    //   if (force3DBtn) {
    //     force3DBtn.addEventListener('click', () => {
    //       console.log('🎯 Forcing 3D mode');
    //       hybridcomp.forceMode('3d');
    //       setTimeout(updateModeDisplay, 100);
    //     });
    //   }

    //   if (force2DBtn) {
    //     force2DBtn.addEventListener('click', () => {
    //       console.log('🎯 Forcing 2D mode');
    //       hybridcomp.forceMode('2d');
    //       setTimeout(updateModeDisplay, 100);
    //     });
    //   }

    //   if (toggleAutoBtn) {
    //     toggleAutoBtn.addEventListener('click', () => {
    //       const newState = !hybridcomp.getAutoSwitchEnabled();
    //       hybridcomp.setAutoSwitch(newState);
    //       console.log(`🔄 Auto-switch ${newState ? 'enabled' : 'disabled'}`);
    //       setTimeout(updateModeDisplay, 100);
    //     });
    //   }

    //   // Initial display update
    //   updateModeDisplay();

    //   // Also add similar event listeners to the clone element after another timeout
    //   setTimeout(() => {
    //     const cloneForce3DBtn = hybridcomp.getCloneElement()?.querySelector('#force-3d-btn');
    //     const cloneForce2DBtn = hybridcomp.getCloneElement()?.querySelector('#force-2d-btn');
    //     const cloneToggleAutoBtn = hybridcomp.getCloneElement()?.querySelector('#toggle-auto-btn');

    //     if (cloneForce3DBtn) {
    //       cloneForce3DBtn.addEventListener('click', () => {
    //         console.log('🎯 Forcing 3D mode (from clone)');
    //         hybridcomp.forceMode('3d');
    //         setTimeout(updateModeDisplay, 100);
    //       });
    //     }

    //     if (cloneForce2DBtn) {
    //       cloneForce2DBtn.addEventListener('click', () => {
    //         console.log('🎯 Forcing 2D mode (from clone)');
    //         hybridcomp.forceMode('2d');
    //         setTimeout(updateModeDisplay, 100);
    //       });
    //     }

    //     if (cloneToggleAutoBtn) {
    //       cloneToggleAutoBtn.addEventListener('click', () => {
    //         const newState = !hybridcomp.getAutoSwitchEnabled();
    //         hybridcomp.setAutoSwitch(newState);
    //         console.log(`🔄 Auto-switch ${newState ? 'enabled' : 'disabled'} (from clone)`);
    //         setTimeout(updateModeDisplay, 100);
    //       });
    //     }
    //   }, 500);
    // }, 1000);
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
    codeeditorentity.Position = new THREE.Vector3(-5, 3.1, -5);
    // codeeditorentity.Quaternion = new THREE.Quaternion().setFromAxisAngle(
    //   new THREE.Vector3(1, 0, 0),
    //   -Math.PI / 2
    // );
    
    const codeEditorSize = new THREE.Vector2(2500, 1600); // Wider for horizontal layout
    const hybridCodeEditor = new HybridCodeEditor(codeEditorSize, 11); // Switch at 12 unit distance
    
    await codeeditorentity.AddComponent(hybridCodeEditor);
     await this.entityManager.AddEntity(codeeditorentity, "Hybrid Code Editor");



    //add another coder editor bbut apply rotation to it
    const codeeditorentity2 = new Entity();
    codeeditorentity2.Position = new THREE.Vector3(-15, 0.01, -15);
    codeeditorentity2.Quaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2
    );
    const hybridCodeEditor2 = new HybridCodeEditor(codeEditorSize, 11); // Switch at 12 unit distance
    await codeeditorentity2.AddComponent(hybridCodeEditor2);
    await this.entityManager.AddEntity(codeeditorentity2, "Hybrid Code Editor 2");
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


 

    // oldcodeeditor.Quaternion = new THREE.Quaternion().setFromAxisAngle
  
 

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

  private async animate(): Promise<void> {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    await this.entityManager.Update(delta);
    await this.maincController.update(delta);
  }
}
new Main();