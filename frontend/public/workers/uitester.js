let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;
  let protocol = "wss://";

  if (this.hostname == "localhost") {
    protocol = "ws://";
    this.hostname = "localhost:8000";
  } else {
    this.hostname = "llm.ben-hassen.com";
  }

  //----------------------------------->UITESERDYNHERE
  this.threedobjects = [];
  this.phycisobjects = [];
  this.currentSlide = 0;

  this.workerloop = function () {
    for (let i = 0; i < this.threedobjects.length; i++) {
      this.threedobjects[i].position.copy(this.phycisobjects[i].position);
      this.threedobjects[i].quaternion.copy(this.phycisobjects[i].quaternion);
    }
  };
 

  const testContent = `
      <div class="editor-container" style="display: flex; width: 100%; height: 100%; max-width: 100vw; max-height: 100vh;">
         <div id="sidebar-container" style="position: relative;">  </div>
        <div id="monaco-editor" style="flex-grow: 1; height: 100%; overflow-y: auto;">
        </div>
        
      </div>
    `;

  this.currentSlide = 0;
  const callbacks = {
    "arrow-left": (element) => {
      this.currentSlide--;
      if (this.currentSlide < 0) {
        this.currentSlide = 0;
      }
      this.updateSlide();
    },
    "arrow-right": (element) => {
      this.currentSlide++;
      this.updateSlide();
    },
  };

  let component = null;

  this.currentWorkspace = null;

  const createTreeItem = (item, level = 0) => {
    const container = document.createElement("div");
    container.style.paddingLeft = `${level * 16}px`;
    container.className = "tree-item";
    container.id = item.name;
    container.style.padding = "4px";
    container.style.paddingLeft = `${level * 16 + 8}px`;
    container.style.cursor = "pointer";
    container.style.display = "flex";
    container.style.alignItems = "center";

    const icon = document.createElement("span");
    icon.id = item.name;
    icon.style.marginRight = "8px";
    icon.innerHTML = item.type === "directory" ? "📁" : getFileIcon(item.name);
    container.appendChild(icon);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = item.name;
    container.appendChild(nameSpan);

    container.addEventListener("mouseover", () => {
      container.style.backgroundColor = "#2d2d2d";
    });

    container.addEventListener("mouseout", () => {
      container.style.backgroundColor = "transparent";
    });

    if (item.type === "file") {
      container.addEventListener("click", async () => {
        try {
          this.currentFilePath = item.path; // Store the current file path
          const content = await loadFileContent(
            this.currentWorkspace,
            item.path
          );
          component.editor.setValue(content);
          const extension = item.name.split(".").pop().toLowerCase();
          const languageMap = {
            py: "python",
            js: "javascript",
            html: "html",
            css: "css",
            json: "json",
          };
          const language = languageMap[extension] || "plaintext";
          component.editor.getModel().setLanguage(language);

          // Add status bar item to show current file
          updateStatusBar(item.name);
        } catch (error) {
          alert(`Error loading file: ${error}`);
        }
      });
    }

    return container;
  };

  const createCarControls = (parentElement) => {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "car-controls";
    controlsContainer.style.cssText = 
    //start from the most left of container

      "position: relative;  display: flex; justify-content: left; align-items: left; margin-top: 8px;"; // Changed to flex and removed relative positioning
  
    let buttoncontainer = document.createElement("div");
    buttoncontainer.className = "uk-iconnav";
    buttoncontainer.style.cssText = "display: flex; margin-left: 0;"; // Changed to flex and removed relative positioning
  
    let reloadBtn = document.createElement("li");
    reloadBtn.innerHTML = `<a href="#" uk-icon="icon: play"></a>`;
    reloadBtn.title = "Reload Script";
    reloadBtn.style.marginBottom = "8px";
  
    let stopBtn = document.createElement("li");
    stopBtn.innerHTML = `<a href="#" uk-icon="icon: ban"></a>`;
    stopBtn.title = "Stop Script";
    stopBtn.style.marginBottom = "8px";
  
    buttoncontainer.appendChild(reloadBtn);
    buttoncontainer.appendChild(stopBtn);
  
    controlsContainer.appendChild(buttoncontainer);
    parentElement.appendChild(controlsContainer);
  
    return {
      reload: reloadBtn,
      stop: stopBtn,
    };
  };
  const updateStatusBar = (filename) => {
    let statusBar = component.HtmlElement.querySelector("#editor-status-bar");
    if (!statusBar) {
      statusBar = document.createElement("div");
      statusBar.id = "editor-status-bar";
      statusBar.style.cssText =
        "position: absolute; bottom: 0; left: 0; right: 0; background: #007ACC; color: white; padding: 4px 8px; font-size: 12px; display: flex; justify-content: space-between; z-index: 1000;";
      component.HtmlElement.querySelector("#monaco-editor").appendChild(
        statusBar
      );
    }
    statusBar.innerHTML = `
      <div>Current File: ${filename}</div>
      <div>Press Ctrl+S to save</div>
    `;
  };
  const setupEditorKeybindings = () => {
    if (this.component && this.component.editor) {
      //  component.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,

      let h = async () => {
        if (this.currentWorkspace && this.currentFilePath) {
          try {
            const content = component.editor.getValue();
            await this.saveFileContent(
              this.currentWorkspace,
              this.currentFilePath,
              content
            );

            // Show save feedback
            const statusBar =
              component.HtmlElement.querySelector("#editor-status-bar");
            const originalText = statusBar.innerHTML;
            statusBar.innerHTML =
              '<div style="color: #4CAF50;">File saved successfully!</div>';
            setTimeout(() => {
              statusBar.innerHTML = originalText;
            }, 2000);
          } catch (error) {
            const statusBar =
              component.HtmlElement.querySelector("#editor-status-bar");
            const originalText = statusBar.innerHTML;
            statusBar.innerHTML =
              '<div style="color: #f44336;">Error saving file!</div>';
            setTimeout(() => {
              statusBar.innerHTML = originalText;
            }, 2000);
          }
        } else {
          alert("No file is currently open");
        }
      };
      component.assignsave(h.bind(this));
    }
  };

  // Modified file handling functions to properly handle nested paths
  const loadFileContent = async (workspace, filepath) => {
    return new Promise((resolve, reject) => {
      // Ensure filepath is properly encoded for the URL
      const encodedPath = encodeURIComponent(filepath);
      const websocket = new WebSocket(
        `${protocol}${this.hostname}/ws/workspace/${workspace}/file/${encodedPath}`
      );

      websocket.onopen = () => {
        websocket.send(
          JSON.stringify({
            action: "read",
          })
        );
      };

      websocket.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.error) {
          reject(result.error);
        } else {
          resolve(result.content);
        }
        websocket.close();
      };

      websocket.onerror = (error) => {
        reject(error);
      };
    });
  };

  this.saveFileContent = async (workspace, filepath, content) => {
    return new Promise((resolve, reject) => {
      // Ensure filepath is properly encoded for the URL
      const encodedPath = encodeURIComponent(filepath);
      const websocket = new WebSocket(
        `${protocol}${this.hostname}/ws/workspace/${workspace}/file/${encodedPath}`
      );

      websocket.onopen = () => {
        websocket.send(
          JSON.stringify({
            action: "write",
            content: content,
          })
        );
      };

      websocket.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.error) {
          reject(result.error);
        } else {
          resolve(result.message);
        }
        websocket.close();
      };

      websocket.onerror = (error) => {
        reject(error);
      };
    });
  };

  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    const iconMap = {
      py: "🐍",
      js: "📜",
      html: "🌐",
      css: "🎨",
      json: "📋",
      md: "📝",
      txt: "📄",
    };
    return iconMap[extension] || "📄";
  };

  const renderFileTree = async () => {
    const fileTree = component.HtmlElement.querySelector("#file-tree");
    if (!fileTree || !this.currentWorkspace) return;
    console.log(this.hostname);
    const websocket = new WebSocket(
      `${protocol}${this.hostname}/ws/workspace/${this.currentWorkspace}/directory/`
    );

    websocket.onopen = () => {
      websocket.send(JSON.stringify({}));
    };

    websocket.onmessage = (event) => {
      const result = JSON.parse(event.data);
      if (result.error) {
        alert(result.error);
      } else {
        fileTree.innerHTML = "";
        const renderItems = (items, level) => {
          items.forEach((item) => {
            const itemElement = createTreeItem(item, level);
            //wati 2 seconds
            //animate opacity
            itemElement.style.opacity = 0;
            itemElement.style.transition = "opacity 0.5s";
            setTimeout(() => {
              itemElement.style.opacity = 1;
            }, 150);

            fileTree.appendChild(itemElement);
            if (item.type === "directory" && item.children) {
              renderItems(item.children, level + 1);
            }
          });
        };
        renderItems(result.structure, 0);
      }
      websocket.close();
    };
  };
 
  
  const calculateScreenDimensions = (camera, targetDistance) => {
    // Get camera FOV in radians
    const fovRad = camera.fov * Math.PI / 180;
    
    // Calculate height at target distance using full FOV
    const height = 2 * Math.tan(fovRad / 2) * targetDistance;
    
    // Calculate width using aspect ratio
    const width = height * camera.aspect;
    
    return { width, height };
};

const createPhysicalWall = (width, height, depth, position, rotation) => {
    // Create Three.js mesh
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x484040, 
        transparent: true, 
        opacity: 0.3,
        wireframe: true 
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.copy(position);
    if (rotation) {
        wall.rotation.copy(rotation);
    }
    mc.webgpuscene.add(wall);
    this.threedobjects.push(wall);

    // Create physics body
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0, // Static body
        position: new CANNON.Vec3(position.x, position.y, position.z),
        shape: shape
    });
    
    // Apply rotation to physics body if provided
    if (rotation) {
        body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    }
    
    physicsworld.addBody(body);
    this.phycisobjects.push(body);

    return { mesh: wall, body: body };
};

const createWallsFromCamera = function() {
    const camera = mc.camera;
    const targetDistance = camera.position.y; // Distance to ground plane
    
    // Get screen dimensions at target distance
    const dimensions = calculateScreenDimensions(camera, targetDistance);
    
    // Wall parameters
    const wallThickness = 0.5;
    const wallHeight = camera.position.y * 2; // Double the camera height
    
    // Calculate actual visible width and depth at ground level
    const visibleWidth = dimensions.width;
    const visibleDepth = dimensions.height;
    
    // Add margin to ensure walls are just outside view but not too far
    const margin = 0.9; // 10% margin
    const wallWidth = visibleWidth * margin;
    const wallDepth = visibleDepth * margin;
    
    // Create four walls to form a box
    // Left wall
    createPhysicalWall(
        wallThickness, 
        wallHeight, 
        wallDepth,
        new THREE.Vector3(-wallWidth/2, wallHeight/2, 0),
        new THREE.Euler(0, 0, 0)
    );
    
    // Right wall
    createPhysicalWall(
        wallThickness, 
        wallHeight, 
        wallDepth,
        new THREE.Vector3(wallWidth/2, wallHeight/2, 0),
        new THREE.Euler(0, 0, 0)
    );
    
    // Front wall
    createPhysicalWall(
        wallWidth, 
        wallHeight, 
        wallThickness,
        new THREE.Vector3(0, wallHeight/2, -wallDepth/2),
        new THREE.Euler(0, 0, 0)
    );
    
    // Back wall
    createPhysicalWall(
        wallWidth, 
        wallHeight, 
        wallThickness,
        new THREE.Vector3(0, wallHeight/2, wallDepth/2),
        new THREE.Euler(0, 0, 0)
    );

    console.log('Created camera-aligned walls with dimensions:', {
        visibleWidth,
        visibleDepth,
        wallWidth,
        wallDepth,
        wallHeight,
        cameraHeight: camera.position.y,
        cameraFOV: camera.fov
    });
};

  const initializeui = async () => {
    let initializeButton = this.uiElement.querySelector("#generate-page");
    if (initializeButton) {
      initializeButton.disabled = true;
      initializeButton.innerHTML = "Loading...";
      let spinner = document.createElement("span");
      spinner.classList.add("uk-margin-small-left");
      spinner.setAttribute("uk-spinner", "ratio: 0.6");
      initializeButton.appendChild(spinner);
    }

    let pos = new THREE.Vector3(0, 0.05, 0);
    let availableScreenSize = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight
    );

    let startpos = pos.clone().add(new THREE.Vector3(0, 4.19, 0));
    let endpos = pos.clone().add(new THREE.Vector3(0, 4.2, 0));
    let contactFlow = [startpos, endpos];
    let lookatFlow = [new THREE.Vector3(0, -1, 0)];
    mc.UIManager.lookatPath = lookatFlow;
    mc.UIManager.splinePath.points = contactFlow;

    mc.UIManager.updateSplineObject();
    mc.UIManager.cubePosition = 0.1;
    mc.UIManager.moveCubeAlongPath(0);
    

    mc.CameraControls.setPosition(pos.x, pos.y + 9, pos.z, true);
    mc.CameraControls.rotatePolarTo(0, true);
    mc.CameraControls.rotateAzimuthTo(0, true);

    component = await mc.UIManager.adduiElement(
      "horizontalui",
      testContent,
      pos,
      availableScreenSize,
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2
      )
    );
    let html0 = `<div class="uk-card uk-card-secondary uk-card-body">
      <h3 class="uk-card-title">Setting up the UI</h3>
      <p>Setting up the UI for testing...</p>
      <progress class="uk-progress" value="0" max="100"></progress>
    </div>`;

    this.component = component;
    mc.UIManager.toggleScrollmode();
    await StaticCLI.typeWithCallbacks(
      this.uiElement,
       html0,
      callbacks,
      20,
      true
    );

       
    //create walls
    createWallsFromCamera()
    

    mc.UIManager.currentUIelement = component;

    let filetree = `
      <div id="sidebar-container" style="position: relative;">
      <div id="file-sidebar" style="width: 250px; height: 100%; background: #1e1e1e; border-right: 1px solid #333; overflow-y: auto; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; transition: width 0.3s ease;">
   <div style="padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
     <ul class="uk-iconnav" style="display: flex; flex-direction: row; align-items: right;">
              

       <li style="margin-bottom: 8px;"><a href="#" id="new-file-btn" uk-icon="icon: plus; ratio: 0.8" title="New File"></a></li>
       <li style="margin-bottom: 8px;"><a href="#" id="new-folder-btn" uk-icon="icon: folder; ratio: 0.8" title="New Folder"></a></li>
       <li style="margin-bottom: 8px;"><a href="#" id="refresh-btn" uk-icon="icon: refresh; ratio: 0.8" title="Refresh"></a></li>
     </ul>
   </div>
   <div id="file-tree" style="padding: 8px;"> 
   
       </div>
   </div>
   `;
    let sidebarz = component.HtmlElement.querySelector("#sidebar-container");
    if (sidebarz) {
      await StaticCLI.typeWithCallbacks(sidebarz, filetree, callbacks, 12, true);
 

      const workspaceName = "uitester";

      this.currentWorkspace = workspaceName;
      const websocket = new WebSocket(
        

        `${protocol}${this.hostname}/ws/workspace/create/ `
      );
      websocket.onopen = () => {
        websocket.send(JSON.stringify({ workspace_name: workspaceName }));
      };
      websocket.onmessage = async (event) => {
        const result = JSON.parse(event.data);
        console.log(result);
        if (result.error) {
          console.error(result.error);
        }
        websocket.close();
      };
    }
 
    const newFileBtn = component.HtmlElement.querySelector("#new-file-btn");
    newFileBtn.addEventListener("click", async () => {
      const filename = prompt("Enter file name:");
      if (filename && this.currentWorkspace) {
        const websocket = new WebSocket(
          `${protocol}${this.hostname}/ws/workspace/${this.currentWorkspace}/file/${filename}`
        );
        websocket.onopen = () => {
          websocket.send(
            JSON.stringify({
              action: "write",
              content: "",
            })
          );
        };
        websocket.onmessage = async (event) => {
          const result = JSON.parse(event.data);
          if (result.error) {
            alert(result.error);
          } else {
            await renderFileTree();
          }
          websocket.close();
        };
      }
    });

    const refreshBtn = component.HtmlElement.querySelector("#refresh-btn");
    refreshBtn.addEventListener("click", async () => {
      await renderFileTree();
    });

    await renderFileTree();

    let container = component.HtmlElement.querySelector("#monaco-editor");
    if (container) {
      component.initMonacoEditor(container);

      // Initial Python program
      const initialProgram = ` 
    
            window.alert("Hello, World!");
                `;
      component.editor.setValue(initialProgram);
      component.editor.getModel().setLanguage("javascript");
      setupEditorKeybindings();
    }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      let element0 = document.getElementById("car.js");
      if (element0) {
        // Remove existing controls if any
        const existingControls = element0.querySelector(".car-controls");
        if (existingControls) {
          existingControls.remove();
        }

        // Add new controls
        const controls = createCarControls(element0);
 
        // Walk to the controls
        const elementPosition = component.getElementPosition(element0);
        if (elementPosition) {
          // await mc.mainEntity.Broadcast({
          //   topic: "walk",
          //   data: { position: elementPosition }
          // });
        }

        // Setup control button handlers
        controls.reload.addEventListener("click", async (event) => {
          element0.click();
          await new Promise((resolve) => setTimeout(resolve, 500));

          event.stopPropagation(); // Prevent triggering the file click event
          if (!this.carcomponent) {
            this.carcomponent = await mc.spawnCar();
          }
          let elementlocation = component.getElementPositionByContent(
            "//------------------------------>CARSPAWNHERE"
          );
        
          if (!elementlocation) {
          elementlocation =  this._entity.Position
          }
          this.carcomponent.body.position.set(
            elementlocation.x,
            elementlocation.y + 1,
            elementlocation.z
          );
          this.carcomponent.body.quaternion.set(0, 0, 0, 1);
          this.carcomponent.body.velocity.set(0, 0, 0);
          this.carcomponent.body.angularVelocity.set(0, 0, 0);

          this.carcomponent.loadscript(component.editor.getValue());
        });

        controls.stop.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          if (this.carcomponent) {
            this.carcomponent._entity.kill();
  
          }
          this.carcomponent = null;

          
        });

      } 

      let element1 = document.getElementById("uitester.js");
      if (element1) {
        // Remove existing controls if any
        const existingControls = element1.querySelector(".car-controls");
        if (existingControls) {
          existingControls.remove();
        }

        // Add new controls
        const controls = createCarControls(element1);

 
        

        // Setup control button handlers
        controls.reload.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          element1.click();
          await new Promise((resolve) => setTimeout(resolve, 500));


          if (!this.charcompoent) {
            this.charcompoent = await mc.spawnchar("uitesterdyn" , "xbot");
          }   

          let elementlocation = component.getElementPositionByContent(
            "//------------------------------>CARSPAWNHERE"
          );
        
          if (!elementlocation) {
            elementlocation =  component.getElementPosition(  controls.reload );
          }

          this.charcompoent._entity.Position = elementlocation;
 


      
          this.charcompoent.loadscript(component.editor.getValue());
        });


        controls.stop.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          if ( this.charcompoent) {
            this.charcompoent._entity.kill();
  
          }
          this.charcompoent = null;

          
        });

      } 


      let element2 = document.getElementById("heli.js");
      if (element2) {
        // Remove existing controls if any
        const existingControls = element2.querySelector(".car-controls");
        if (existingControls) {
          existingControls.remove();
        }

        // Add new controls
        const controls = createCarControls(element2);

 
        

        // Setup control button handlers
        controls.reload.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          element2.click();
          await new Promise((resolve) => setTimeout(resolve, 500));
            
            if (!this.helicomponent) {
              this.helicomponent = await mc.spawnHeli();
              this.carcomponent =  this.helicomponent;
            }   
  
            let elementlocation = component.getElementPositionByContent(
              "//------------------------------>CARSPAWNHERE"
            );
          
            if (!elementlocation) {
              elementlocation =  component.getElementPosition(  controls.reload );
            }
  
            this.helicomponent._entity.Position = elementlocation;

            this.helicomponent.loadscript(component.editor.getValue());
        } );

        controls.stop.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          if ( this.helicomponent) {
            this.helicomponent._entity.kill();
  
          }
          this.helicomponent = null;

          
        }
        );

      }


       
   
   

    this.currentSlide = 2;
    await this.updateSlide();
  };
  this.updateSlide = async function () {
    let html0 = `undefined`;
    let h = async () => {};

    switch (this.currentSlide) {
      case 0:
       
        
          callbacks["generate-page"] = initializeui.bind(this);

          html0 = `
            <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
              <div class="uk-card-title">UI Tester</div>
              <p>Ready to test UI?</p>
              <button id="generate-page" class="uk-button uk-button-secondary">Test UI</button>
            </div>
          `;

          await StaticCLI.typeWithCallbacks(
            this.uiElement,
            html0,
            callbacks,
            2,
            true
          );
 
        break;
 
      case 2:
   

          this.currentSlide++;
          this.updateSlide();
        
 

        html0 = `
            <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
              <div class="uk-card-title">carsim</div>
              <p>lets make a car! </p>
              <button id="create-car" class="uk-button uk-button-secondary uk-margin-small-right">Create</button>
              <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
              <button id="arrow-right" class="uk-button uk-button-secondary" uk-icon="icon: arrow-right"> </button>
            </div>
          `;

        await StaticCLI.typeWithCallbacks(
          this.uiElement,
          html0,
          callbacks,
          2,
          true
        );
        break;

      case 5:
        html0 = `
      <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
        <div class="uk-card-title">open door</div>
         
        <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
        <button id="arrow-right" class="uk-button uk-button-secondary" uk-icon="icon: arrow-right"> </button>
      </div>
    `;

        await StaticCLI.typeWithCallbacks(
          this.uiElement,
          html0,
          callbacks,
          2,
          true
        );
        if (this.carcomponent) {
          this.carcomponent.openDoor();
        }
        break;
    }
  };
  mc.spawnCar().then((helicomponent) => {


  this.carcomponent =   helicomponent
  helicomponent._entity.Position = new THREE.Vector3(3, 0, 0);
  
  });

  mc.spawnHeli().then((helicomponent) => {

    this.helicomponent =   helicomponent
    helicomponent._entity.Position = new THREE.Vector3(15, 0, 0);
    
    });
  this.updateSlide();

  this.clearEnvironment = () => {
    if (this.threedobjects) {
      this.threedobjects.forEach((obj) => {
        mc.webgpuscene.remove(obj);
      });
    }
    if (this.phycisobjects) {
      this.phycisobjects.forEach((obj) => {
        physicsworld.removeBody(obj);
      });
    }
    this.threedobjects = [];
    this.phycisobjects = [];

    const chatContainer = document.querySelector("#chatContainer");
    if (chatContainer) chatContainer.innerHTML = "";
  };
};
self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};
