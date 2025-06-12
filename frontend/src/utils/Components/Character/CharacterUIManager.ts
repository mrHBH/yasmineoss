import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { StaticCLI } from "../../../SimpleCLI";
import { Entity } from "../../Entity";

export class CharacterUIManager {
  private _entity: Entity;
  private _titlebar: HTMLElement;
  public uiElement: HTMLDivElement;
  private _css2dgroup: THREE.Group;

  // Callbacks for external systems
  public onToggleDropdown: () => void;
  public onReset: () => void;
  public onFace: () => void;
  public onLoadWorker: (scriptname: string) => void;
  public onKillEntity: () => void;
  public onPlayMusic: () => Promise<boolean>;
  public behaviourscriptname: string;

  constructor(entity: Entity, css2dgroup: THREE.Group, behaviourscriptname: string = "") {
    this._entity = entity;
    this._css2dgroup = css2dgroup;
    this.behaviourscriptname = behaviourscriptname;
  }

  createNameTag() {
    const nameTag = document.createElement("div");
    nameTag.className = "name-tag";
  
    const status = document.createElement("div");
    status.className = "name";
    status.style.fontSize = "12px";
    // nameElement.style.fontWeight = "bold";
    status.style.color = "white";
    status.textContent =  "status";
    status.id = "name";
    // status.style.cursor = "pointer";
  
    const Name = document.createElement("div");
    Name.className = "status";
    Name.style.fontSize = "12px";
    Name.style.fontWeight = "regular";
    Name.style.color = "#666";
    Name.style.marginTop = "-2px";
    Name.textContent =  this._entity.name;
      Name.style.cursor = "pointer";

    nameTag.appendChild(status);
   nameTag.appendChild(Name);

    this._titlebar = document.createElement("div");
    this._titlebar.style.display = "flex";
    this._titlebar.style.flexDirection = "column";
    this._titlebar.style.alignItems = "flex-start";
    this._titlebar.appendChild(nameTag);
    this._titlebar.style.transition = "opacity 0.5s";
  
    const cliContainer = document.createElement("div");
    cliContainer.id = "clicontainer";
    cliContainer.style.display = "none";
    cliContainer.style.position = "absolute";
    cliContainer.style.bottom = "100%";
    cliContainer.style.left = " 0%";
    cliContainer.style.minWidth = "40vw";
    cliContainer.style.maxWidth = "80vw";
    cliContainer.style.maxHeight = "50vh";
    cliContainer.style.overflowY = " auto";
    cliContainer.style.borderRadius = "5px";
    cliContainer.style.scrollbarWidth = "none";
    cliContainer.style.transition = "opacity 0.3s ease-in-out";
  
    const inlineContainer = document.createElement("div");
    inlineContainer.className = "uk-inline";
    inlineContainer.style.display = "flex";
    inlineContainer.style.alignItems = "left";

    const dropIcon = document.createElement("span");
    dropIcon.id = "dropIcon";
    dropIcon.className = "uk-icon";
    dropIcon.setAttribute("uk-icon", "icon: chevron-down; ratio: 0.8");
    dropIcon.style.marginRight = "5px";
    inlineContainer.appendChild(dropIcon);

    const resetIcon = document.createElement("span");
    resetIcon.id = "resetIcon";
    resetIcon.className = "uk-icon";
    resetIcon.setAttribute("uk-icon", "icon: refresh; ratio: 0.8");
    resetIcon.style.marginRight = "5px";
    inlineContainer.appendChild(resetIcon);

    const musicIcon = document.createElement("span");
    musicIcon.id = "musicIcon";
    musicIcon.className = "uk-icon";
    musicIcon.setAttribute("uk-icon", "icon: play; ratio: 0.8");
    musicIcon.style.marginRight = "5px";
    musicIcon.style.cursor = "pointer";
    musicIcon.style.color = "#4a90e2";
    musicIcon.title = "Play positional music";
    inlineContainer.appendChild(musicIcon);

    const killicon = document.createElement("span");
    killicon.id = "killicon";
    killicon.className = "uk-icon";
    killicon.setAttribute("uk-icon", "icon: close; ratio: 0.8");
    killicon.style.marginRight = "5px";
    killicon.style.cursor = "pointer";
    killicon.style.color = "red";

    // const nameElement = document.createElement("div");
    // nameElement.id = "name";
    // nameElement.style.cursor = "pointer";
    // nameElement.style.fontSize = "smaller";
    // nameElement.textContent = this._entity.name;
    inlineContainer.appendChild(killicon);
    inlineContainer.appendChild(status);
    this._titlebar.appendChild(inlineContainer);
    this._titlebar.appendChild(cliContainer);

    this.uiElement = cliContainer;
    this.uiElement.addEventListener('update', this.updatePosition.bind(this));

    const label = new CSS2DObject(this._titlebar);
    label.position.set(0, 2, -1.5);
    this._css2dgroup.add(label);
  
    if (Name && dropIcon && resetIcon && musicIcon) {
      Name.addEventListener("click", () => {
        if (this.onFace) {
          this.onFace();
        }
        if (this.onLoadWorker && this.behaviourscriptname) {
          this.onLoadWorker(this.behaviourscriptname);
        }
        this.toggleDropdown();
      });

      resetIcon.addEventListener("click", () => {
        if (this.onReset) {
          this.onReset();
        }
      });
  
      dropIcon.addEventListener("click", () => {
        this.toggleDropdown();
      });

      musicIcon.addEventListener("click", async () => {
        // Visual feedback - change color to indicate loading
        const originalColor = musicIcon.style.color;
        musicIcon.style.color = "#ffa500"; // Orange for loading
        musicIcon.title = "Initializing audio...";
        
        if (this.onPlayMusic) {
          try {
            const success = await this.onPlayMusic();
            if (success) {
              musicIcon.style.color = "#00ff00"; // Green for success
              musicIcon.title = "Music playing";
              setTimeout(() => {
                musicIcon.style.color = originalColor;
                musicIcon.title = "Play positional music";
              }, 2000);
            } else {
              musicIcon.style.color = "#ff0000"; // Red for error
              musicIcon.title = "Audio initialization failed";
              setTimeout(() => {
                musicIcon.style.color = originalColor;
                musicIcon.title = "Play positional music";
              }, 3000);
            }
          } catch (error) {
            musicIcon.style.color = "#ff0000"; // Red for error
            musicIcon.title = "Audio error";
            setTimeout(() => {
              musicIcon.style.color = originalColor;
              musicIcon.title = "Play positional music";
            }, 3000);
          }
        }
      });
    }
    
    if (killicon) {
      killicon.addEventListener("click", () => {
        if (this.onKillEntity) {
          this.onKillEntity();
        }
      });
    }
    
    this.resetConsole();
  }

  updatePosition() {
    if (this.uiElement && this._titlebar) {
      const rect = this._titlebar.getBoundingClientRect();
      const uiRect = this.uiElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
  
      // Reset transforms and positions
      this.uiElement.style.transform = '';
      this.uiElement.style.top = '';
      this.uiElement.style.bottom = '100%';  // Default position above the name tag
  
      // Check if there's enough horizontal space
      if (rect.left + uiRect.width > viewportWidth) {
        // Not enough horizontal space, position below the name tag
        this.uiElement.style.top = '100%';
        this.uiElement.style.bottom = 'auto';
      }
  
      // After positioning, check for any remaining overflow
      const updatedRect = this.uiElement.getBoundingClientRect();
  
      // Adjust horizontal position if needed
      if (updatedRect.right > viewportWidth) {
        const overflowX = updatedRect.right - viewportWidth;
        this.uiElement.style.transform = `translateX(-${overflowX}px)`;
      } else if (updatedRect.left < 0) {
        this.uiElement.style.transform = `translateX(${Math.abs(updatedRect.left)}px)`;
      }
  
      // Adjust vertical position if needed
      if (updatedRect.top < 0) {
        this.uiElement.style.top = '0';
        this.uiElement.style.bottom = 'auto';
      } else if (updatedRect.bottom > viewportHeight) {
        const overflowY = updatedRect.bottom - viewportHeight;
        if (this.uiElement.style.top === '100%') {
          // If it's below the name tag, move it up
          this.uiElement.style.top = `calc(100% - ${overflowY}px)`;
        } else {
          // If it's above the name tag, move it down
          this.uiElement.style.bottom = `calc(100% + ${overflowY}px)`;
        }
      }

      // Ensure the icons container is always on top of the CLI container
      const inlineContainer = this._titlebar.querySelector('.uk-inline');
      if (inlineContainer) {
        (inlineContainer as HTMLElement).style.position = 'relative';
        (inlineContainer as HTMLElement).style.zIndex = '10'; // High z-index to keep it above the CLI container
      }
    }
  }

  resetConsole() {
    let inithtml = /*html*/ `
    <div class="uk-card uk-card-secondary uk-card-body">
      <h3 class="uk-card-title">Greetings !</h3>
      <p class="content">I am your personal coder.</p>
      <button id="loadEnvironment" class="uk-button-default uk-margin-small-right">
        Load Script
    </div>
    `;
  
    StaticCLI.typeSync(this.uiElement, inithtml, 5, true);
  
    let button = this.uiElement.querySelector("#loadEnvironment");
    if (button) {
      button.addEventListener("click", () => {
        if (this.onReset) {
          this.onReset();
        }
      });
    }
  }
  
  toggleDropdown() {
    let dropIcon = this._titlebar.querySelector("#dropIcon");
    if (this.uiElement.style.display === "none") {
      this.uiElement.style.display = "block";
      this.uiElement.style.opacity = "0";
      setTimeout(() => {
        this.uiElement.style.opacity = "1";
      }, 0);
      if (dropIcon) {
        dropIcon.setAttribute("uk-icon", "icon: chevron-up; ratio: 0.8");
      }
    } else {
      this.uiElement.style.opacity = "0";
      setTimeout(() => {
        this.uiElement.style.display = "none";
      }, 300);
      if (dropIcon) {
        dropIcon.setAttribute("uk-icon", "icon: chevron-down; ratio: 0.8");
      }
    }
  }

  respond(message: string) {
    StaticCLI.typeSync(this.uiElement, message, 1, false);
  }

  updateVisibility(distance: number) {
    if (this._titlebar) {
      if (distance > 35) {
        this._titlebar.style.opacity = "0";
        this._titlebar.style.pointerEvents = "none";
      } else {
        this._titlebar.style.opacity = "1";
        this._titlebar.style.pointerEvents = "auto";
        this.uiElement.dispatchEvent(new Event('update'));
      }
    }
  }

  destroy() {
    // Clean up UI elements and event listeners
    if (this._titlebar) {
      // Remove any event listeners from UI elements by replacing them
      const dropIcon = this._titlebar.querySelector("#dropIcon");
      if (dropIcon) {
        dropIcon.removeAttribute("uk-icon");
        const newDropIcon = dropIcon.cloneNode(true);
        if (dropIcon.parentNode) {
          dropIcon.parentNode.replaceChild(newDropIcon, dropIcon);
        }
      }
      
      const resetIcon = this._titlebar.querySelector("#resetIcon");
      if (resetIcon) {
        resetIcon.removeAttribute("uk-icon");
        const newResetIcon = resetIcon.cloneNode(true);
        if (resetIcon.parentNode) {
          resetIcon.parentNode.replaceChild(newResetIcon, resetIcon);
        }
      }
      
      const killIcon = this._titlebar.querySelector("#killicon");
      if (killIcon) {
        killIcon.removeAttribute("uk-icon");
        const newKillIcon = killIcon.cloneNode(true);
        if (killIcon.parentNode) {
          killIcon.parentNode.replaceChild(newKillIcon, killIcon);
        }
      }
      
      // Remove button event listeners
      const loadButton = this.uiElement?.querySelector("#loadEnvironment");
      if (loadButton) {
        const newButton = loadButton.cloneNode(true);
        if (loadButton.parentNode) {
          loadButton.parentNode.replaceChild(newButton, loadButton);
        }
      }
      
      // Remove the title bar from its parent
      if (this._titlebar.parentNode) {
        this._titlebar.parentNode.removeChild(this._titlebar);
      }
      this._titlebar = null;
    }
    
    if (this.uiElement) {
      // Remove event listeners
      this.uiElement.removeEventListener('update', this.updatePosition);
      
      // Clear any HTML content to release potential memory
      this.uiElement.innerHTML = '';
      
      // Remove from DOM if it's still there
      if (this.uiElement.parentNode) {
        this.uiElement.parentNode.removeChild(this.uiElement);
      }
      this.uiElement = null;
    }
  }
}
