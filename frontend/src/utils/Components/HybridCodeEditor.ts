import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { HybridUIComponent } from "./HybridUIComponent";

// Add Monaco Editor type declarations
declare global {
  const monaco: any;
}

class HybridCodeEditor extends Component {
  private hybridComponent: HybridUIComponent;
  private hostname: string;
  private protocol: string;
  private currentWorkspace: any;
  private currentFilePath: any;
  private editor: any; // Monaco editor instance

  constructor(size?: THREE.Vector2, zoomThreshold?: number) {
    super();
    this._componentname = "HybridCodeEditor";
    
    // Setup WebSocket connection parameters
    this.hostname = "localhost:8000";
    this.protocol = "ws://";

    if (window.location.hostname !== "localhost") {
      this.protocol = "wss://";
      this.hostname = "llm.ben-hassen.com";
    }

    // Create the HTML content for the code editor
    const editorHtml = this.createEditorHTML();
    
    // Create the hybrid component with the editor HTML
    this.hybridComponent = new HybridUIComponent(
      editorHtml, 
      size || new THREE.Vector2(2500, 1500), 
      zoomThreshold || 10
    );
    this.hybridComponent.sticky = true;
  }

  private createEditorHTML(): string {
    return `
      <div class="hybrid-code-editor" style="
        background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%); 
        width: 100%; 
        height: 100%; 
        border-radius: 15px; 
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: row;
        overflow: hidden;
        color: #ffffff;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      ">
        <!-- File Sidebar -->
        <div id="file-sidebar" style="
          width: 280px; 
          background: #252526; 
          border-right: 1px solid #3e3e42; 
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <!-- Sidebar Header -->
          <div style="
            padding: 12px 16px; 
            border-bottom: 1px solid #3e3e42; 
            background: #2d2d30;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
          ">
            <h3 style="margin: 0; color: #cccccc; font-size: 14px; font-weight: 600;">EXPLORER</h3>
            <div style="display: flex; gap: 8px;">
              <button id="new-file-btn" style="
                background: none; 
                border: none; 
                color: #cccccc; 
                cursor: pointer; 
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
              " title="New File">📄</button>
              <button id="new-folder-btn" style="
                background: none; 
                border: none; 
                color: #cccccc; 
                cursor: pointer; 
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
              " title="New Folder">📁</button>
              <button id="refresh-btn" style="
                background: none; 
                border: none; 
                color: #cccccc; 
                cursor: pointer; 
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
              " title="Refresh">🔄</button>
            </div>
          </div>
          
          <!-- File Tree -->
          <div id="file-tree" style="
            flex: 1; 
            overflow-y: auto; 
            padding: 8px 0;
          "></div>
        </div>

        <!-- Editor Area -->
        <div style="flex: 1; display: flex; flex-direction: column;">
          <!-- Editor Header -->
          <div id="editor-header" style="
            background: #2d2d30; 
            border-bottom: 1px solid #3e3e42; 
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 35px;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span id="current-file" style="color: #cccccc; font-size: 14px;">No file selected</span>
              <div id="mode-indicator" style="
                background: rgba(0, 122, 204, 0.1); 
                color: #007acc; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 12px;
                border: 1px solid rgba(0, 122, 204, 0.3);
              ">Hybrid Mode</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="save-btn" style="
                background: #007acc; 
                border: none; 
                color: white; 
                padding: 6px 12px; 
                border-radius: 4px; 
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
              ">💾 Save</button>
              <button id="toggle-mode-btn" style="
                background: rgba(255, 255, 255, 0.1); 
                border: 1px solid rgba(255, 255, 255, 0.2); 
                color: #cccccc; 
                padding: 6px 12px; 
                border-radius: 4px; 
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
              ">🔄 Toggle View</button>
            </div>
          </div>

          <!-- Monaco Editor Container -->
          <div id="monaco-editor" style="
            flex: 1; 
            background: #1e1e1e;
          "></div>

          <!-- Status Bar -->
          <div id="status-bar" style="
            background: #007acc; 
            color: white; 
            padding: 4px 16px; 
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 22px;
          ">
            <div id="status-left">Ready</div>
            <div id="status-right">Hybrid Code Editor</div>
          </div>
        </div>
      </div>
    `;
  }

  get htmlElement() {
    return this.hybridComponent.htmlElement;
  }

  get Size() {
    return this.hybridComponent.Size;
  }

  set Size(size: THREE.Vector2) {
    this.hybridComponent.Size = size;
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    
    // Initialize the hybrid component
    await this.hybridComponent.InitComponent(entity);
    
    // Setup the editor after the hybrid component is ready
    setTimeout(() => {
      this.setupCodeEditor();
    }, 100);
  }

  async InitEntity(): Promise<void> {
    // Initialize the hybrid component's entity
    await this.hybridComponent.InitEntity();
    
    // Setup additional event handlers
    this._entity._RegisterHandler("zoom", async () => {
      await this.hybridComponent.zoom();
    });

    this._entity._RegisterHandler("toggleMode", async () => {
      await this.hybridComponent.toggleMode();
    });
  }

  private async setupCodeEditor(): Promise<void> {
    try {
      // Setup file sidebar functionality
      this.setupFileSidebar();
      
      // Initialize Monaco Editor
      await this.initializeMonacoEditor();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load default workspace
      await this.loadWorkspace("default");
      
    } catch (error) {
      console.error("Error setting up code editor:", error);
    }
  }

  private setupFileSidebar(): void {
    const refreshBtn = this.htmlElement.querySelector("#refresh-btn");
    const newFileBtn = this.htmlElement.querySelector("#new-file-btn");
    const newFolderBtn = this.htmlElement.querySelector("#new-folder-btn");

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshFileTree());
    }

    if (newFileBtn) {
      newFileBtn.addEventListener("click", () => this.createNewFile());
    }

    if (newFolderBtn) {
      newFolderBtn.addEventListener("click", () => this.createNewFolder());
    }
  }

  private async initializeMonacoEditor(): Promise<void> {
    const container = this.htmlElement.querySelector("#monaco-editor") as HTMLElement;
    if (!container) return;

    // Check if Monaco is available
    if (typeof monaco === 'undefined') {
      await this.loadMonaco();
    }

    // Create Monaco editor instance
    this.editor = monaco.editor.create(container, {
      value: '// Welcome to Hybrid Code Editor\n// This editor can switch between 2D and 3D modes\n\nconsole.log("Hello, Hybrid World!");',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      }
    });

    // Setup save keybinding
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveCurrentFile();
    });

    this.updateStatus("Monaco Editor initialized");
  }

  private async loadMonaco(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof monaco !== 'undefined') {
        resolve();
        return;
      }

      // Monaco should already be loaded by the main application
      // If not, we'll wait a bit and check again
      const checkMonaco = (attempts: number = 0) => {
        if (typeof monaco !== 'undefined') {
          resolve();
        } else if (attempts < 50) {
          setTimeout(() => checkMonaco(attempts + 1), 100);
        } else {
          reject(new Error('Monaco Editor not available'));
        }
      };
      
      checkMonaco();
    });
  }

  private setupEventListeners(): void {
    // Save button
    const saveBtn = this.htmlElement.querySelector("#save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => this.saveCurrentFile());
    }

    // Toggle mode button
    const toggleModeBtn = this.htmlElement.querySelector("#toggle-mode-btn");
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener("click", () => {
        this.hybridComponent.toggleMode();
        this.updateModeDisplay();
      });
    }

    // Update mode display periodically
    setInterval(() => {
      this.updateModeDisplay();
    }, 1000);
  }

  private updateModeDisplay(): void {
    const modeIndicator = this.htmlElement.querySelector("#mode-indicator");
    if (modeIndicator && this.hybridComponent) {
      const currentMode = this.hybridComponent.getCurrentMode();
      const autoSwitch = this.hybridComponent.getAutoSwitchEnabled();
      modeIndicator.textContent = `${currentMode.toUpperCase()} Mode ${autoSwitch ? '(Auto)' : '(Manual)'}`;
    }
  }

  private updateStatus(message: string): void {
    const statusLeft = this.htmlElement.querySelector("#status-left");
    if (statusLeft) {
      statusLeft.textContent = message;
    }
  }

  private updateCurrentFile(filename: string): void {
    const currentFile = this.htmlElement.querySelector("#current-file");
    if (currentFile) {
      currentFile.textContent = filename || "No file selected";
    }
  }

  // File operations
  private async loadFileContent(workspace: string, filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const encodedPath = encodeURIComponent(filepath);
      const websocket = new WebSocket(
        `${this.protocol}${this.hostname}/ws/workspace/${workspace}/file/${encodedPath}`
      );

      websocket.onopen = () => {
        websocket.send(JSON.stringify({ action: "read" }));
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
  }

  private async saveFileContent(workspace: string, filepath: string, content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const encodedPath = encodeURIComponent(filepath);
      const websocket = new WebSocket(
        `${this.protocol}${this.hostname}/ws/workspace/${workspace}/file/${encodedPath}`
      );

      websocket.onopen = () => {
        websocket.send(JSON.stringify({
          action: "write",
          content: content
        }));
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
  }

  private async refreshFileTree(): Promise<void> {
    if (!this.currentWorkspace) return;

    const fileTree = this.htmlElement.querySelector("#file-tree") as HTMLElement;
    if (!fileTree) return;

    this.updateStatus("Refreshing file tree...");

    const websocket = new WebSocket(
      `${this.protocol}${this.hostname}/ws/workspace/${this.currentWorkspace}/directory/`
    );

    websocket.onopen = () => {
      websocket.send(JSON.stringify({}));
    };

    websocket.onmessage = (event) => {
      const result = JSON.parse(event.data);
      if (result.error) {
        this.updateStatus(`Error: ${result.error}`);
      } else {
        fileTree.innerHTML = "";
        this.renderFileTree(result.structure, fileTree, 0);
        this.updateStatus("File tree refreshed");
      }
      websocket.close();
    };
  }

  private renderFileTree(items: any[], container: HTMLElement, level: number = 0): void {
    items.forEach(item => {
      const itemElement = this.createFileTreeItem(item, level);
      container.appendChild(itemElement);
    });
  }

  private createFileTreeItem(item: any, level: number): HTMLElement {
    const itemDiv = document.createElement("div");
    itemDiv.style.cssText = `
      padding: 4px 8px 4px ${level * 16 + 8}px;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #cccccc;
      font-size: 13px;
      transition: background-color 0.2s;
    `;

    const icon = item.type === "directory" ? "📁" : this.getFileIcon(item.name);
    itemDiv.innerHTML = `<span style="margin-right: 6px;">${icon}</span><span>${item.name}</span>`;

    // Hover effects
    itemDiv.addEventListener("mouseenter", () => {
      itemDiv.style.backgroundColor = "#2a2d2e";
    });

    itemDiv.addEventListener("mouseleave", () => {
      itemDiv.style.backgroundColor = "transparent";
    });

    // Click handler for files
    if (item.type === "file") {
      itemDiv.addEventListener("click", async () => {
        try {
          this.updateStatus(`Loading ${item.name}...`);
          this.currentFilePath = item.path;
          const content = await this.loadFileContent(this.currentWorkspace, item.path);
          
          if (this.editor) {
            this.editor.setValue(content);
            const language = this.getFileLanguage(item.name);
            monaco.editor.setModelLanguage(this.editor.getModel(), language);
          }
          
          this.updateCurrentFile(item.name);
          this.updateStatus(`Loaded ${item.name}`);
        } catch (error) {
          this.updateStatus(`Error loading file: ${error}`);
        }
      });
    }

    return itemDiv;
  }

  private getFileIcon(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      js: "📜", ts: "📜", jsx: "⚛️", tsx: "⚛️",
      html: "🌐", css: "🎨", scss: "🎨", sass: "🎨",
      json: "📋", md: "📝", txt: "📄",
      py: "🐍", java: "☕", cpp: "⚙️", c: "⚙️",
      php: "🐘", rb: "💎", go: "🐹", rs: "🦀"
    };
    return iconMap[extension || ""] || "📄";
  }

  private getFileLanguage(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
      html: "html", css: "css", scss: "scss", sass: "sass",
      json: "json", md: "markdown", txt: "plaintext",
      py: "python", java: "java", cpp: "cpp", c: "c",
      php: "php", rb: "ruby", go: "go", rs: "rust"
    };
    return languageMap[extension || ""] || "plaintext";
  }

  private async saveCurrentFile(): Promise<void> {
    if (!this.currentWorkspace || !this.currentFilePath || !this.editor) {
      this.updateStatus("No file to save");
      return;
    }

    try {
      this.updateStatus("Saving file...");
      const content = this.editor.getValue();
      await this.saveFileContent(this.currentWorkspace, this.currentFilePath, content);
      this.updateStatus("File saved successfully");
    } catch (error) {
      this.updateStatus(`Error saving file: ${error}`);
    }
  }

  private async createNewFile(): Promise<void> {
    const filename = prompt("Enter filename:");
    if (!filename || !this.currentWorkspace) return;

    try {
      await this.saveFileContent(this.currentWorkspace, filename, "");
      await this.refreshFileTree();
      this.updateStatus(`Created ${filename}`);
    } catch (error) {
      this.updateStatus(`Error creating file: ${error}`);
    }
  }

  private async createNewFolder(): Promise<void> {
    // Implement folder creation if backend supports it
    this.updateStatus("Folder creation not implemented");
  }

  private async loadWorkspace(name: string): Promise<void> {
    this.currentWorkspace = name;
    this.updateStatus(`Loading workspace: ${name}`);

    const websocket = new WebSocket(
      `${this.protocol}${this.hostname}/ws/workspace/create/`
    );

    websocket.onopen = () => {
      websocket.send(JSON.stringify({ workspace_name: name }));
    };

    websocket.onmessage = async (event) => {
      const result = JSON.parse(event.data);
      if (result.error) {
        this.updateStatus(`Error: ${result.error}`);
      } else {
        this.updateStatus(`Workspace ${name} loaded`);
        await this.refreshFileTree();
      }
      websocket.close();
    };
  }

  // Hybrid component delegation methods
  public async toggleMode(): Promise<void> {
    await this.hybridComponent.toggleMode();
  }

  public async forceMode(mode: '2d' | '3d'): Promise<void> {
    await this.hybridComponent.forceMode(mode);
  }

  public getCurrentMode(): string {
    return this.hybridComponent.getCurrentMode();
  }

  public setAutoSwitch(enabled: boolean): void {
    this.hybridComponent.setAutoSwitch(enabled);
  }

  async Update(deltaTime: number): Promise<void> {
    // Update the hybrid component
    await this.hybridComponent.Update(deltaTime);
  }

  async Destroy(): Promise<void> {
    // Dispose Monaco editor
    if (this.editor) {
      this.editor.dispose();
    }
    
    // Destroy hybrid component
    await this.hybridComponent.Destroy();
  }
}

export { HybridCodeEditor };
