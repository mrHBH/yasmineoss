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

  this.threedobjects = [];
  this.phycisobjects = [];

  this.workerloop = function () {
    for (let i = 0; i < this.threedobjects.length; i++) {
      this.threedobjects[i].position.copy(this.phycisobjects[i].position);
      this.threedobjects[i].quaternion.copy(this.phycisobjects[i].quaternion);
    }
  };

  let dialogueSteps = [
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">Hello!</h3>
          <p class="content">I am a Character Component, ready to showcase my abilities!</p>
        </div>
      `,
      action: async (callbacks) => { }, // No action needed for intro
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">Movement</h3>
          <p class="content">I can walk to specific positions. Let's try walking to a random spot.</p>
          <button id="walkButton" class="uk-button uk-button-default">Walk!</button>
        </div>
      `,
      action: async (callbacks) => {
        callbacks["walkButton"] = async (element) => {
          let walkButton = this.uiElement.querySelector("#walkButton");
          walkButton.onclick = () => {
            let targetPosition = new THREE.Vector3(
              Math.random() * 20 - 10,
              0,
              Math.random() * 20 - 10
            );
            this._entity.Broadcast("walk", { position: targetPosition });
            StaticCLI.typeSync(this.uiElement, `<p class="content">Walking...</p>`, 1, false);
          };
        };
      },
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">Animations</h3>
          <p class="content">I have various animations. Let's see me jump!</p>
          <button id="jumpButton" class="uk-button uk-button-default">Jump!</button>
        </div>
      `,
      action: async (callbacks) => {
        callbacks["jumpButton"] = async (element) => {
          let jumpButton = this.uiElement.querySelector("#jumpButton");
          jumpButton.onclick = () => {
            this.Input._keys.space = true; // Simulate spacebar press for jump
            setTimeout(() => {
              this.Input._keys.space = false; // Release spacebar
            }, 500); // Hold for a short duration
            StaticCLI.typeSync(this.uiElement, `<p class="content">Jumping!</p>`, 1, false);
          };
        };
      },
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">Camera Control</h3>
          <p class="content">You can control the camera to focus on me. Try zooming in!</p>
          <button id="zoomButton" class="uk-button uk-button-default">Zoom!</button>
        </div>
      `,
      action: async (callbacks) => {
        callbacks["zoomButton"] = async (element) => {
          let zoomButton = this.uiElement.querySelector("#zoomButton");
          zoomButton.onclick = () => {
            this._entity.Broadcast("zoom", {});
            StaticCLI.typeSync(this.uiElement, `<p class="content">Zooming in!</p>`, 1, false);
          };
        };
      },
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">Facing</h3>
          <p class="content">Make the camera face me directly.</p>
          <button id="faceButton" class="uk-button uk-button-default">Face Me!</button>
        </div>
      `,
      action: async (callbacks) => {
        callbacks["faceButton"] = async (element) => {
          let faceButton = this.uiElement.querySelector("#faceButton");
          faceButton.onclick = () => {
            this._entity.Broadcast("face", {});
            StaticCLI.typeSync(this.uiElement, `<p class="content">Facing you!</p>`, 1, false);
          };
        };
      },
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">Dynamic Scripting</h3>
          <p class="content">I can load and execute scripts dynamically. Resetting my script now...</p>
          <button id="resetScriptButton" class="uk-button uk-button-default">Reset Script</button>
        </div>
      `,
      action: async (callbacks) => {
        callbacks["resetScriptButton"] = async (element) => {
          let resetScriptButton = this.uiElement.querySelector("#resetScriptButton");
          resetScriptButton.onclick = () => {
            this.Reset();
            StaticCLI.typeSync(this.uiElement, `<p class="content">Script Reset!</p>`, 1, false);
          };
        };
      },
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">API Reference for LLMs</h3>
          <p class="content">Here's a guide for controlling me via script:</p>
          <ul class="uk-list uk-list-bullet" id="apiReferenceList">
            <li><b>Broadcast Handlers:</b></li>
            <ul>
              <li><b>"walk":</b> <code>_entity.Broadcast("walk", { position: THREE.Vector3 })</code> - Make me walk to a position.</li>
              <li><b>"zoom":</b> <code>_entity.Broadcast("zoom", {})</code> - Zoom camera to focus on me.</li>
              <li><b>"face":</b> <code>_entity.Broadcast("face", {})</code> - Make camera face me.</li>
              <li><b>"loadscript":</b> <code>_entity.Broadcast("loadscript", { scriptname: string })</code> - Load a new behavior script.</li>
              <li><b>"position":</b> <code>_entity.Broadcast("position", THREE.Vector3)</code> - Set my position directly.</li>
              <li><b>"quaternion":</b> <code>_entity.Broadcast("quaternion", THREE.Quaternion)</code> - Set my rotation directly.</li>
            </ul>
            <li><b>Component Functions (accessible within script context):</b></li>
            <ul>
              <li><b><code>walkToPos(THREE.Vector3, timeout?: number): Promise<boolean></code></b> - Asynchronously walk to a position with optional timeout.</li>
              <li><b><code>Reset(): void</code></b> - Reset my behavior script and inputs.</li>
              <li><b><code>respond(message: string): void</code></b> - Display a chat message in my UI.</li>
              <li><b><code>loadscript(script: string): void</code></b> - Load and execute a javascript code directly.</li>
              <li><b><code>StopScript(): void</code></b> - Stop the currently running script.</li>
              <li><b><code>mountvehicle(vehicle: any): Promise<void></code></b> - Mount a vehicle component.</li>
              <li><b><code>unmountvehicle(): Promise<void></code></b> - Unmount from a vehicle.</li>
            </ul>
            <li><b>Input Control (within script's <code>workerloop</code> or event handlers):</b></li>
            <ul>
              <li>Access and modify <code>this.Input._keys</code> object to simulate key presses (e.g., <code>this.Input._keys.forward = true;</code>).
                Keys available: <code>forward, backward, left, right, space, shift, attack1</code>.
              </li>
            </ul>
          </ul>
          <button id="copyApiButton" class="uk-button uk-button-default uk-margin-top">Copy Reference</button>
        </div>
      `,
      action: async (callbacks) => {
        callbacks["copyApiButton"] = async (element) => {
          let copyApiButton = this.uiElement.querySelector("#copyApiButton");
          copyApiButton.onclick = () => {
            const apiReferenceText = this.uiElement.querySelector("#apiReferenceList").textContent;
            navigator.clipboard.writeText(apiReferenceText).then(() => {
              StaticCLI.typeSync(this.uiElement, `<p class="content">API Reference Copied to Clipboard!</p>`, 1, false);
              copyApiButton.textContent = "Copied!";
              setTimeout(() => {
                copyApiButton.textContent = "Copy Reference";
              }, 2000);
            }).catch(err => {
              console.error("Failed to copy API reference: ", err);
              StaticCLI.typeSync(this.uiElement, `<p class="content">Failed to copy API Reference.</p>`, 1, false);
            });
          };
        };
      },
    },
    {
      html: /*html*/ `
        <div class="uk-card uk-card-secondary uk-card-body">
          <h3 class="uk-card-title">End of Demo</h3>
          <p class="content">This concludes the demonstration of my capabilities. Feel free to explore!</p>
        </div>
      `,
      action: async (callbacks) => { }, // End slide - no action
    },
  ];

  let currentStep = 0;

  const runDialogueStep = async (stepIndex) => { // Make runDialogueStep async
    if (stepIndex >= 0 && stepIndex < dialogueSteps.length) {
      currentStep = stepIndex;
      const step = dialogueSteps[currentStep];
      let navigationHTML = /*html*/`
        <div style="display:flex; justify-content: space-between; margin-top: 20px;">
          <button id="prevButton" class="uk-button uk-button-default" style="visibility: ${currentStep > 0 ? 'visible' : 'hidden'};">Back</button>
          <button id="nextButton" class="uk-button uk-button-primary" style="visibility: ${currentStep < dialogueSteps.length - 1 ? 'visible' : 'hidden'};">Next</button>
        </div>
      `;

      let callbacks = {}; 
      callbacks["prevButton"] = async (element) => {
        runDialogueStep(currentStep - 1);
      };
      callbacks["nextButton"] = async (element) => {
        runDialogueStep(currentStep + 1);
      }
     
 

      await StaticCLI.typeWithCallbacks(this.uiElement, step.html, callbacks, 1, true); // Await typeWithCallbacks

      await Promise.resolve(StaticCLI.typeSync(this.uiElement, navigationHTML, 1, false)); // Await typeSync

      const nextButton = this.uiElement.querySelector("#nextButton");
      const prevButton = this.uiElement.querySelector("#prevButton");

      if (nextButton) {
        nextButton.onclick = () => {
          runDialogueStep(currentStep + 1);
        };
      }
      if (prevButton) {
        prevButton.onclick = () => {
          runDialogueStep(currentStep - 1);
        };
      }

    }
  };

  runDialogueStep(currentStep);


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