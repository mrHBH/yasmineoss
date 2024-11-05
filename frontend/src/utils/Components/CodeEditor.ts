import { StaticCLI } from "../../SimpleCLI";
import { Entity } from "../Entity";
import { MainController } from "../MainController";
import { twoDUIComponent } from "./2dUIComponent";
import * as THREE from "three";

class CodeEditor  {

    uientity: Entity;
    component: twoDUIComponent;
    mc: MainController;
  hostname: string;
  protocol: string;
  currentWorkspace: any;
  currentFilePath: any;
    constructor(mc) {
        this.mc = mc;
          this.hostname == "localhost" 
            this.protocol = "ws://";
            this.hostname = "localhost:8000";
           
            if (window.location.hostname !== "localhost") {
            this.protocol = "wss://";
            this.hostname = "llm.ben-hassen.com";
          }
        
    
    }
      // Modified file handling functions to properly handle nested paths
   loadFileContent = async (workspace, filepath) => {
    return new Promise((resolve, reject) => {
      // Ensure filepath is properly encoded for the URL
      const encodedPath = encodeURIComponent(filepath);
      const websocket = new WebSocket(
        `${this.protocol}${this.hostname}/ws/workspace/${workspace}/file/${encodedPath}`
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
  saveFileContent = async (workspace, filepath, content) => {
    return new Promise((resolve, reject) => {
      // Ensure filepath is properly encoded for the URL
      const encodedPath = encodeURIComponent(filepath);
      const websocket = new WebSocket(
        `${this.protocol}${this.hostname}/ws/workspace/${workspace}/file/${encodedPath}`
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
    async initEditor() {
        
      this.uientity  = new Entity();
       const testContent = `
          <div class="editor-container" style="display: flex; width: 100%; height: 100%; max-width: 100vw; max-height: 100vh;">
              <div id="sidebar-container" style="position: relative;">  </div>
          <div id="monaco-editor" style="flex-grow: 1; height: 100%; overflow-y: auto;">
          </div>
          
          </div>
      `;
    
   
    
        let pos = new THREE.Vector3(0, 0.05, 0);
   
    
        let startpos = pos.clone().add(new THREE.Vector3(0, 4.19, 0));
        let endpos = pos.clone().add(new THREE.Vector3(0, 4.2, 0));
        let contactFlow = [startpos, endpos];
        let lookatFlow = [new THREE.Vector3(0, -1, 0)];
       this.mc.UIManager.lookatPath = lookatFlow;
       this.mc.UIManager.splinePath.points = contactFlow;
    
       this.mc.UIManager.updateSplineObject();
       this.mc.UIManager.cubePosition = 0.1;
       this.mc.UIManager.moveCubeAlongPath(0);
        
    
       this.mc.CameraControls.setPosition(pos.x, pos.y + 9, pos.z, true);
       this.mc.CameraControls.rotatePolarTo(0, true);
       this.mc.CameraControls.rotateAzimuthTo(0, true);


       this.component = new twoDUIComponent(
        "testContent",
         new THREE.Vector2(window.innerWidth, window.innerHeight),
   

      );
      this.component.sticky = true;

      await this.uientity.AddComponent(this.component);

      await this.mc.entitymanager.AddEntity(this.uientity, "CodeEditor");
 
      this.uientity.Position = pos;
      this.uientity.Quaternion =     new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2
      );
    
  
    
        this.mc.UIManager.currentUIelement = this.component;
    
          // await new Promise((resolve) => setTimeout(resolve, 1000));
          // let element0 = document.getElementById("car.js");
          // if (element0) {
          //   // Remove existing controls if any
          //   const existingControls = element0.querySelector(".car-controls");
          //   if (existingControls) {
          //     existingControls.remove();
          //   }
    
          //   // Add new controls
          //   const controls = createCarControls(element0);
     
          //   // Walk to the controls
          //   const elementPosition = component.getElementPosition(element0);
          //   if (elementPosition) {
          //     // awaitthis.mc.mainEntity.Broadcast({
          //     //   topic: "walk",
          //     //   data: { position: elementPosition }
          //     // });
          //   }
    
          //   // Setup control button handlers
          //   controls.reload.addEventListener("click", async (event) => {
          //     element0.click();
          //     await new Promise((resolve) => setTimeout(resolve, 500));
    
          //     event.stopPropagation(); // Prevent triggering the file click event
          //     if (!this.carcomponent) {
          //       this.carcomponent = awaitthis.mc.spawnCar();
          //     }
          //     let elementlocation = component.getElementPositionByContent(
          //       "//------------------------------>CARSPAWNHERE"
          //     );
            
          //     if (!elementlocation) {
          //     elementlocation =  this._entity.Position
          //     }
          //     this.carcomponent.body.position.set(
          //       elementlocation.x,
          //       elementlocation.y + 1,
          //       elementlocation.z
          //     );
          //     this.carcomponent.body.quaternion.set(0, 0, 0, 1);
          //     this.carcomponent.body.velocity.set(0, 0, 0);
          //     this.carcomponent.body.angularVelocity.set(0, 0, 0);
    
          //     this.carcomponent.loadscript(component.editor.getValue());
          //   });
    
          //   controls.stop.addEventListener("click", async (event) => {
          //     event.stopPropagation(); // Prevent triggering the file click event
          //     if (this.carcomponent) {
          //       this.carcomponent._entity.kill();
      
          //     }
          //     this.carcomponent = null;
    
              
          //   });
    
          // } 
    
          // let element1 = document.getElementById("uitester.js");
          // if (element1) {
          //   // Remove existing controls if any
          //   const existingControls = element1.querySelector(".car-controls");
          //   if (existingControls) {
          //     existingControls.remove();
          //   }
    
          //   // Add new controls
          //   const controls = createCarControls(element1);
    
     
            
    
          //   // Setup control button handlers
          //   controls.reload.addEventListener("click", async (event) => {
          //     event.stopPropagation(); // Prevent triggering the file click event
          //     element1.click();
          //     await new Promise((resolve) => setTimeout(resolve, 500));
    
    
          //     if (!this.charcompoent) {
          //       this.charcompoent = awaitthis.mc.spawnchar("uitesterdyn" , "xbot");
          //     }   
    
          //     let elementlocation = component.getElementPositionByContent(
          //       "//------------------------------>CARSPAWNHERE"
          //     );
            
          //     if (!elementlocation) {
          //       elementlocation =  component.getElementPosition(  controls.reload );
          //     }
    
          //     this.charcompoent._entity.Position = elementlocation;
     
    
    
          
          //     this.charcompoent.loadscript(component.editor.getValue());
          //   });
    
    
          //   controls.stop.addEventListener("click", async (event) => {
          //     event.stopPropagation(); // Prevent triggering the file click event
          //     if ( this.charcompoent) {
          //       this.charcompoent._entity.kill();
      
          //     }
          //     this.charcompoent = null;
    
              
          //   });
    
          // } 
    
    
          // let element2 = document.getElementById("heli.js");
          // if (element2) {
          //   // Remove existing controls if any
          //   const existingControls = element2.querySelector(".car-controls");
          //   if (existingControls) {
          //     existingControls.remove();
          //   }
    
          //   // Add new controls
          //   const controls = createCarControls(element2);
    
     
            
    
          //   // Setup control button handlers
          //   controls.reload.addEventListener("click", async (event) => {
          //     event.stopPropagation(); // Prevent triggering the file click event
          //     element2.click();
          //     await new Promise((resolve) => setTimeout(resolve, 500));
                
          //       if (!this.helicomponent) {
          //         this.helicomponent = awaitthis.mc.spawnHeli();
          //         this.carcomponent =  this.helicomponent;
          //       }   
      
          //       let elementlocation = component.getElementPositionByContent(
          //         "//------------------------------>CARSPAWNHERE"
          //       );
              
          //       if (!elementlocation) {
          //         elementlocation =  component.getElementPosition(  controls.reload );
          //       }
      
          //       this.helicomponent._entity.Position = elementlocation;
    
          //       this.helicomponent.loadscript(component.editor.getValue());
          //   } );
    
          //   controls.stop.addEventListener("click", async (event) => {
          //     event.stopPropagation(); // Prevent triggering the file click event
          //     if ( this.helicomponent) {
          //       this.helicomponent._entity.kill();
      
          //     }
          //     this.helicomponent = null;
    
              
          //   }
          //   );
    
          // }
    
    
           
       
          await StaticCLI.typeWithCallbacks(this.component.HtmlElement, testContent, {}, 15 , true);  
 
          
      };

    async laodfiletree() {
        const filetree = `
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
        let sidebarz = this.component.HtmlElement.querySelector("#sidebar-container") as HTMLElement;
        if (sidebarz) {
        await StaticCLI.typeWithCallbacks(sidebarz, filetree, {}, 12, true);
        }
                 //      
        const refreshBtn = this.component.HtmlElement.querySelector("#refresh-btn");
        refreshBtn.addEventListener("click", async () => {
              await this.renderFileTree();
        });
         

      }
    createTreeItem = (item, level = 0) => {
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
        icon.innerHTML = item.type === "directory" ? "📁" : this.getFileIcon(item.name);
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
              const content = await this.loadFileContent(
                this.currentWorkspace,
                item.path
              ) as string;
              this.component.editor.setValue(content);
              const extension = item.name.split(".").pop().toLowerCase();
              const languageMap = {
                py: "python",
                js: "javascript",
                html: "html",
                css: "css",
                json: "json",
              };
              const language = languageMap[extension] || "plaintext";
              this.component.editor.getModel().setLanguage(language);
    
              // Add status bar item to show current file
              this.updateStatusBar(item.name);
            } catch (error) {
              alert(`Error loading file: ${error}`);
            }
          });
        }
    
        return container;
      };
    
     createCarControls = (parentElement) => {
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
       updateStatusBar = (filename) => {
        let statusBar = this.component.HtmlElement.querySelector("#editor-status-bar") as HTMLElement;
        if (!statusBar) {
          statusBar = document.createElement("div") as HTMLElement;
          statusBar.id = "editor-status-bar";
          statusBar.style.cssText =
            "position: absolute; bottom: 0; left: 0; right: 0; background: #007ACC; color: white; padding: 4px 8px; font-size: 12px; display: flex; justify-content: space-between; z-index: 1000;";
          this.component.HtmlElement.querySelector("#monaco-editor").appendChild(
            statusBar
          );
        }
        statusBar.innerHTML = `
          <div>Current File: ${filename}</div>
          <div>Press Ctrl+S to save</div>
        `;
      };
      setupEditorKeybindings = () => {
        if (this.component && this.component.editor) {
          //  component.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    
          let h = async () => {
            if (this.currentWorkspace && this.currentFilePath) {
              try {
                const content = this.component.editor.getValue();
                await this.saveFileContent(
                  this.currentWorkspace,
                  this.currentFilePath,
                  content
                );
    
                // Show save feedback
                const statusBar =
                  this.component.HtmlElement.querySelector("#editor-status-bar");
                const originalText = statusBar.innerHTML;
                statusBar.innerHTML =
                  '<div style="color: #4CAF50;">File saved successfully!</div>';
                setTimeout(() => {
                  statusBar.innerHTML = originalText;
                }, 2000);
              } catch (error) {
                const statusBar =
                  this.component.HtmlElement.querySelector("#editor-status-bar");
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
          this.component.assignsave(h.bind(this));
        }
      };


     getFileIcon = (filename) => {
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
    
      renderFileTree = async () => {
        const fileTree = this.component.HtmlElement.querySelector("#file-tree");
        if (!fileTree || !this.currentWorkspace) return;
        console.log(this.hostname);
        const websocket = new WebSocket(
          `${this.protocol}${this.hostname}/ws/workspace/${this.currentWorkspace}/directory/`
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
                const itemElement = this.createTreeItem(item, level);
                //wati 2 seconds
                //animate opacity
                itemElement.style.opacity = "0";
                itemElement.style.transition = "opacity 0.5s";
                setTimeout(() => {
                  itemElement.style.opacity = "1";
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
     

      async loadworkspace(name) {
        this.currentWorkspace = name;
        const websocket = new WebSocket(
          `${this.protocol}${this.hostname}/ws/workspace/create/ `
        );
        websocket.onopen = () => {
          websocket.send(JSON.stringify({ workspace_name: name }));
        };
        websocket.onmessage = async (event) => {
          const result = JSON.parse(event.data);
          console.log(result);
          let container = this.component.HtmlElement.querySelector("#monaco-editor") as HTMLElement;
          if (container) {
           await this.component.initMonacoEditor(container);
      
            // Initial Python program
            const initialProgram = ` 
          
                  window.alert("Hello, World!");
                      `;
            this.component.editor.setValue(initialProgram);
            this.component.editor.getModel().setLanguage("javascript");
            this.setupEditorKeybindings();
          }
    
          if (result.error) {
            console.error(result.error);
          }
          websocket.close();
        };
      }



}
export { CodeEditor };

 
 
  
       

 



// let filetree = `
// <div id="sidebar-container" style="position: relative;">
// <div id="file-sidebar" style="width: 250px; height: 100%; background: #1e1e1e; border-right: 1px solid #333; overflow-y: auto; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; transition: width 0.3s ease;">
// <div style="padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
// <ul class="uk-iconnav" style="display: flex; flex-direction: row; align-items: right;">
        

//  <li style="margin-bottom: 8px;"><a href="#" id="new-file-btn" uk-icon="icon: plus; ratio: 0.8" title="New File"></a></li>
//  <li style="margin-bottom: 8px;"><a href="#" id="new-folder-btn" uk-icon="icon: folder; ratio: 0.8" title="New Folder"></a></li>
//  <li style="margin-bottom: 8px;"><a href="#" id="refresh-btn" uk-icon="icon: refresh; ratio: 0.8" title="Refresh"></a></li>
// </ul>
// </div>
// <div id="file-tree" style="padding: 8px;"> 

//  </div>
// </div>
// `;
// let sidebarz = component.HtmlElement.querySelector("#sidebar-container");
// if (sidebarz) {
// await StaticCLI.typeWithCallbacks(sidebarz, filetree, callbacks, 12, true);


// const workspaceName = "uitester";

// this.currentWorkspace = workspaceName;
// const websocket = new WebSocket(
  

//   `${protocol}${this.hostname}/ws/workspace/create/ `
// );
// websocket.onopen = () => {
//   websocket.send(JSON.stringify({ workspace_name: workspaceName }));
// };
// websocket.onmessage = async (event) => {
//   const result = JSON.parse(event.data);
//   console.log(result);
//   if (result.error) {
//     console.error(result.error);
//   }
//   websocket.close();
// };
// }

// const newFileBtn = component.HtmlElement.querySelector("#new-file-btn");
// newFileBtn.addEventListener("click", async () => {
// const filename = prompt("Enter file name:");
// if (filename && this.currentWorkspace) {
//   const websocket = new WebSocket(
//     `${protocol}${this.hostname}/ws/workspace/${this.currentWorkspace}/file/${filename}`
//   );
//   websocket.onopen = () => {
//     websocket.send(
//       JSON.stringify({
//         action: "write",
//         content: "",
//       })
//     );
//   };
//   websocket.onmessage = async (event) => {
//     const result = JSON.parse(event.data);
//     if (result.error) {
//       alert(result.error);
//     } else {
//       await renderFileTree();
//     }
//     websocket.close();
//   };
// }
// });

// const refreshBtn = component.HtmlElement.querySelector("#refresh-btn");
// refreshBtn.addEventListener("click", async () => {
// await renderFileTree();
// });

// await renderFileTree();

// let container = component.HtmlElement.querySelector("#monaco-editor");
// if (container) {
// component.initMonacoEditor(container);

// // Initial Python program
// const initialProgram = ` 

//       window.alert("Hello, World!");
//           `;
// component.editor.setValue(initialProgram);
// component.editor.getModel().setLanguage("javascript");
// setupEditorKeybindings();
// }
