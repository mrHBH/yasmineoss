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
    this.editor = new CodeEditor(mc)
    
    await this.editor.initEditor()
    mc.UIManager.toggleScrollmode();
 
       let html0 = `
        <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
          <div class="uk-card-title">UI Tester</div>
          <p>step1: load workspace  </p>
          
          <input id="workspace" class="uk-input" type="text" placeholder="workspace name" value="uitester">
          <button id="generate-page" class="uk-button uk-button-secondary">Test UI</button>
        </div>
      `;

      await StaticCLI.typeWithCallbacks(
        this.uiElement,
        html0,
         {} ,
         2,
        true
      );
      //get the button
      initializeButton = this.uiElement.querySelector("#generate-page");
      initializeButton.addEventListener("click", async () => {

      let res= await this.editor.loadworkspace( this.uiElement.querySelector("#workspace").value)
          console.log(res)
   
      await this.editor.laodfiletree()

     
      }
      )
  


    mc.createWallsFromCamera()



  };

 initializeui();

 
  
 
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
