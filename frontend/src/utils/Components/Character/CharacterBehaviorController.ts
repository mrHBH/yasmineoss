export class CharacterBehaviorController {
  public worker: Worker;
  public workerloop: any = null;
  public AIinputkeys_: any;
  public behaviourscriptname: string;

  // Callbacks for communication with main character component
  public onInputReceived: (input: any) => void;
  public onJSSetup: (js: string) => any;
  public onSetupDialogue: (js: string) => void;

  constructor(behaviourscriptname: string = "") {
    this.behaviourscriptname = behaviourscriptname;
  }

  fetch(url: string) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
    });
  }

  loadScript(script: string) {
    this.worker?.terminate();
    let blob = new Blob([script], { type: "application/javascript" });
    let url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
    this.worker.onmessage = (e) => {
      if (e.data.type === "input") {
        if (this.onInputReceived) {
          this.onInputReceived({ _keys: e.data.input });
        }
      }
      if (e.data.type === "jssetup") {
        try {
          if (this.onJSSetup) {
            let res = this.onJSSetup(e.data.js);
            console.log(res);
            this.worker.postMessage({
              type: "feedback",
              data: res,
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    };
  }

  LoadWorker(scriptname: string) {
    // Send stop command to worker if it is running
    if (this.worker) {
      this.worker.postMessage({
        type: "stop",
      });
    }

    this.worker = new Worker("./workers/dynamicloader.js?" + Date.now());

    this.worker.onmessage = (e) => {
      if (e.data.type === "setupdialogue") {
        console.log("setupdialogue");
        try {
          if (this.onSetupDialogue) {
            this.onSetupDialogue(e.data.js);
          }
        } catch (error) {
          console.error(error);
        }
      }
      if (e.data.type === "boot") {
        this.worker.postMessage({
          type: "init",
          filename: scriptname ? scriptname : "botbasicbehavior.js",
          watch: true,
        });
      }

      if (e.data.type === "input") {
        if (this.onInputReceived) {
          this.onInputReceived({ _keys: e.data.input });
        }
      }

      if (e.data.type === "jssetup") {
        try {
          if (this.onJSSetup) {
            let res = this.onJSSetup(e.data.js);
            console.log(res);
            this.worker.postMessage({
              type: "feedback",
              data: res,
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    };
  }

  StopScript() {
    if (this.worker) {
      this.worker.postMessage({
        type: "stop",
      });
    }
    this.workerloop = null;
  }

  Reset(scriptname?: string) {
    const scriptToLoad = scriptname || this.behaviourscriptname;
    
    if (!this.worker && scriptToLoad !== "") {
      this.LoadWorker(scriptToLoad);
    }
    
    this.worker?.postMessage({
      type: "reload",
      filename: scriptToLoad,
    });

    if (this.workerloop) {
      this.workerloop = null;
    }
  }

  sendUpdate(data: {
    position: any;
    quaternion: number[];
    target: any;
    state: string;
    dt: number;
  }) {
    if (this.worker) {
      this.worker.postMessage({
        type: "update",
        ...data,
      });
    }
  }

  destroy() {
    // Stop any worker if running
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.workerloop = null;
  }
}
