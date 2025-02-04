let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;
  let protocol = "wss://";
  this.hostname = window.location.hostname;
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

  const createCarControls = (parentElement) => {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "car-controls";
    controlsContainer.style.cssText =//start from the most left of container

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





  //this.uielement holds a floating div that follows the character. it should drive a dialogue with character.
  const initializeui = async () => {
    let initializeButton = this.uiElement.querySelector("#loadworkspace");
    if (initializeButton) {
      initializeButton.disabled = true;
      initializeButton.innerHTML = "Loading...";
      let spinner = document.createElement("span");
      spinner.classList.add("uk-margin-small-left");
      spinner.setAttribute("uk-spinner", "ratio: 0.6");
      initializeButton.appendChild(spinner);
    }
    if (!this.editor) {
      this.editor = new CodeEditor(mc);

      await this.editor.initEditor();
    }
    initializeButton.disabled = false;
    initializeButton.innerHTML = "Load Workspace";
    mc.UIManager.toggleScrollmode();

    //get the button
    initializeButton.addEventListener("click", async () => {
      let res = await this.editor.loadworkspace(
        this.uiElement.querySelector("#workspace").value
      );
      console.log(res);

      await this.editor.laodfiletree();
      await this.editor.renderFileTree();

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

        // Setup control button handlers
        controls.reload.addEventListener("click", async (event) => {
          element0.click();
          await new Promise((resolve) => setTimeout(resolve, 500));

          event.stopPropagation(); // Prevent triggering the file click event
          if (!this.carcomponent) {
            this.carcomponent = await mc.spawnCar();
          }
          let elementlocation =
            this.editor.component.getElementPositionByContent(
              "//------------------------------>CARSPAWNHERE"
            );

          if (!elementlocation) {
            elementlocation = this._entity.Position;
          }
          this.carcomponent.body.position.set(
            elementlocation.x,
            elementlocation.y + 1,
            elementlocation.z
          );
          this.carcomponent.body.quaternion.set(0, 0, 0, 1);
          this.carcomponent.body.velocity.set(0, 0, 0);
          this.carcomponent.body.angularVelocity.set(0, 0, 0);

          this.carcomponent.loadscript(this.editor.component.editor.getValue()); 
          this.carcomponent.startScript();
        });

        controls.stop.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          if (this.carcomponent) {
            this.carcomponent._entity.kill();
          }
          this.carcomponent = null;
        });
      }
      let element1 = document.getElementById("ttsbot.js");
      if (element1) {
        // Remove existing controls if any
        const existingControls = element1.querySelector(".ttsbot-controls");
        if (existingControls) {
          existingControls.remove();
        }

        // Add new controls
        const controls = createCarControls(element1);

        // Setup control button handlers
        controls.reload.addEventListener("click", async (event) => {
          element1.click();
          await new Promise((resolve) => setTimeout(resolve, 500));

          event.stopPropagation(); // Prevent triggering the file click event
          if (!this.charcompoent) {
            
            this.charcompoent = await mc.spawnchar("ttsbot" , "ybot");

          }
          let elementlocation =
            this.editor.component.getElementPositionByContent(
              "//------------------------------>TTSBOTSPAWNHERE"
            );

          if (!elementlocation) {
            elementlocation = this._entity.Position;
          }
          this.charcompoent.body.position.set(
            elementlocation.x,
            elementlocation.y + 1,
            elementlocation.z
          );
          this.charcompoent.body.quaternion.set(0, 0, 0, 1);
          this.charcompoent.body.velocity.set(0, 0, 0);
          this.charcompoent.body.angularVelocity.set(0, 0, 0);

          this.charcompoent.loadscript(this.editor.component.editor.getValue());
        });

        controls.stop.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent triggering the file click event
          if (this.charcompoent) {
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
  
            let elementlocation =   this.editor.component.getElementPositionByContent(
              "//------------------------------>CARSPAWNHERE"
            );
          
            if (!elementlocation) {
              elementlocation =    this.editor.component.getElementPosition(  controls.reload );
            }
  
            this.helicomponent._entity.Position = elementlocation;

            this.helicomponent.loadscript(  this.editor.component.editor.getValue());
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


    });

    mc.createWallsFromCamera();
  };

  let html0 = `
  <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
    <div class="uk-card-title">UI Tester</div>
    <p>step1: load workspace  </p>
    
    <input id="workspace" class="uk-input" type="text" placeholder="workspace name" value="uitester">
    <button id="loadworkspace" class="uk-button uk-button-secondary">Test UI</button>
  </div>
`;

  StaticCLI.typeWithCallbacks(this.uiElement, html0, {}, 0, true).then(() => {
    initializeui();
  });

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
