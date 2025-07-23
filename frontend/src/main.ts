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

    const threedelement = new Entity(); 
    threedelement.Position = new THREE.Vector3(0, 1, 0);
    const html = `<div style="background-color: rgba(255, 255, 255, 0.8); width: 100%; height: 100%; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
                 <h1 style="text-align: center; color: #333;">Welcome to the 3D UI!</h1>
                 <p style="text-align: center; color: #666;">This is a 3D UI element that can be positioned anywhere in the scene.</p>
                 <div style="text-align: center; margin-top: 20px;">
                   <button class="uk-button uk-button-primary" style="margin-right: 10px;">Click Me!</button>
                   <button class="uk-button uk-button-secondary">Another Button</button>
                 </div>
                   <h2>3D UI Example</h2>
                   <p>This is a 3D UI element.</p>
                 </div>`;
    const size = new THREE.Vector2(2000, 1000);
    const trdcomp = new threeDUIComponent( html, size);
    trdcomp.sticky = false; // Set to false for non-sticky behavior
    trdcomp.Size = size; // Set the size of the 3D UI element
    await threedelement.AddComponent(trdcomp);
   // await this.entityManager.AddEntity(threedelement, "3D UI Element"); 


    const twodelement = new Entity();
    twodelement.Position = new THREE.Vector3(5, 1, 5);
        const size2 = new THREE.Vector2(2000, 1000);

    const twocomp = new twoDUIComponent( html, size2);
     twocomp.sticky = true; // Set to true for sticky behavior
     await twodelement.AddComponent(twocomp);
   // await this.entityManager.AddEntity(twodelement,  "Sticky 2D UI Element");

    // Modern UI Component Example - automatically switches between 3D and 2D
    const modernelement = new Entity();
    modernelement.Position = new THREE.Vector3(-5, 1, 0);
    
    const modernHtml = `<div style="background-color: rgba(32, 164, 243, 0.9); width: 100%; height: 100%; padding: 20px; border-radius: 15px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);">
                 <h1 style="text-align: center; color: white; margin-bottom: 20px;">🚀 Modern UI</h1>
                 <p style="text-align: center; color: rgba(255, 255, 255, 0.9); margin-bottom: 20px;">This component automatically switches between 3D and 2D modes based on camera distance!</p>
                 <div style="text-align: center; margin-bottom: 20px;">
                   <button class="uk-button uk-button-primary" style="margin-right: 10px; background: white; color: #20a4f3;">Zoom In/Out to Test</button>
                   <button class="uk-button uk-button-secondary" style="background: rgba(255,255,255,0.2); color: white;">Double-Click to Toggle</button>
                 </div>
                 <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
                   <h3 style="color: white; margin-bottom: 10px;">Features:</h3>
                   <ul style="color: rgba(255, 255, 255, 0.9); margin: 0;">
                     <li>🎯 Auto 3D ↔ 2D switching</li>
                     <li>✨ Smooth transitions</li>
                     <li>🎛️ Dynamic z-index management</li>
                     <li>👆 Manual toggle support</li>
                   </ul>
                 </div>
               </div>`;
    
    //const modernSize = new THREE.Vector2(1800, 1200);
  //  const moderncomp = new ModernUIComponent(modernHtml, modernSize, 2); // Switch at 8 units distance
    //moderncomp.sticky = true; // Allow distance-based hiding
    //await modernelement.AddComponent(moderncomp);
   // await this.entityManager.AddEntity(modernelement, "Modern Adaptive UI Element");

    // Hybrid UI Component Example - uses new CSS hybrid renderer
    const hybridelement = new Entity();
    hybridelement.Position = new THREE.Vector3(5, 1, -5);
    
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
               </div>`;
    
    const hybridSize = new THREE.Vector2(2000, 1400);
    const hybridcomp = new HybridUIComponent(hybridHtml, hybridSize, 8); // Switch at 8 unit distance
    hybridcomp.sticky = true; // Allow distance-based hiding
    await hybridelement.AddComponent(hybridcomp);
    await this.entityManager.AddEntity(hybridelement, "Hybrid CSS Renderer UI");

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