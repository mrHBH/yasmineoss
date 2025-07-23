# CSS Hybrid Renderer Documentation

The CSS Hybrid Renderer is a revolutionary new approach to UI rendering in 3D environments that combines CSS2D and CSS3D rendering capabilities into a single, seamless renderer.

## Overview

Unlike traditional approaches that require separate components for 2D and 3D UI, the CSS Hybrid Renderer automatically handles both modes within a single renderer, providing:

- **Unified Rendering**: Single renderer handles both 2D and 3D modes
- **Automatic Mode Switching**: Seamlessly transitions based on camera distance
- **Element Cloning**: Maintains synchronized content between modes
- **Z-Index Management**: Automatic renderer priority adjustment
- **Zero Duplication**: No need for separate 2D/3D components

## Architecture

### CSSHybridObject

The `CSSHybridObject` extends Three.js `Object3D` and manages:

- **Primary Element**: The main HTML element for 3D mode
- **Clone Element**: Synchronized copy for 2D mode  
- **Mode State**: Current rendering mode ('2d' or '3d')
- **Transition Logic**: Smooth switching between modes
- **Distance Monitoring**: Automatic threshold detection

### CSSHybridRenderer

The `CSSHybridRenderer` provides:

- **Dual Containers**: Separate DOM containers for 2D and 3D elements
- **Unified Rendering**: Single render call handles both modes
- **Camera Synchronization**: Proper matrix calculations for both modes
- **Z-Ordering**: Automatic depth sorting for 2D elements
- **Event Integration**: Callbacks for z-index management

## Usage

### Basic Implementation

```typescript
import { HybridUIComponent } from "./utils/Components/HybridUIComponent";
import { Entity } from "./utils/Entity";
import * as THREE from "three";

// Create entity
const entity = new Entity();
entity.Position = new THREE.Vector3(0, 1, 0);

// Define HTML content
const html = `
  <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); padding: 20px; border-radius: 15px;">
    <h1>Hybrid UI Element</h1>
    <p>This automatically switches between 2D and 3D rendering modes!</p>
    <button onclick="alert('Interactive!')">Click Me</button>
  </div>
`;

// Create hybrid component
const size = new THREE.Vector2(1800, 1200);
const hybridUI = new HybridUIComponent(html, size, 8); // 8 units threshold

// Add to entity
await entity.AddComponent(hybridUI);
await entityManager.AddEntity(entity, "Hybrid UI");
```

### Advanced Configuration

```typescript
// Custom threshold and settings
const hybridUI = new HybridUIComponent(html, size, 12); // 12 units threshold

// Configure behavior
hybridUI.sticky = false; // Allow distance-based hiding
hybridUI.zoomThreshold = 15; // Update threshold
hybridUI.setAutoSwitch(true); // Enable/disable auto-switching

// Manual mode control
await hybridUI.toggleMode(); // Switch modes manually
console.log(hybridUI.isIn2DMode); // Check current mode
```

## Technical Details

### Rendering Pipeline

1. **Scene Traversal**: Renderer finds all `CSSHybridObject` instances
2. **Distance Calculation**: Measures camera distance to each object
3. **Mode Evaluation**: Compares distance against threshold
4. **Transition Handling**: Manages smooth mode switches
5. **Content Synchronization**: Updates clone elements
6. **DOM Management**: Handles element positioning and visibility

### Element Synchronization

When switching modes, the renderer:

1. **Content Sync**: Copies innerHTML from active to inactive element
2. **Transition Out**: Fades out current mode element
3. **Z-Index Update**: Adjusts renderer priorities via callback
4. **Transition In**: Fades in new mode element
5. **Event Handling**: Maintains pointer event states

### Performance Optimizations

- **Lazy Clone Creation**: Clone elements created only when needed
- **Throttled Distance Checks**: Distance calculations limited to prevent excessive updates
- **Cached Transformations**: Matrix calculations cached per frame
- **Selective Updates**: Only transitioning elements are animated

## Integration with MainController

The hybrid renderer integrates with the existing MainController:

```typescript
// Auto-initialization in HybridUIComponent
if (!mc.hybridRenderer) {
  mc.hybridRenderer = new CSSHybridRenderer({
    onZIndexChange: (mode: string) => {
      mc.setRendererZIndex(mode as '2d-priority' | '3d-priority' | 'default');
    }
  });
  
  // Setup DOM integration
  mc.hybridRenderer.setSize(window.innerWidth, window.innerHeight);
  mc.hybridRenderer.domElement.style.zIndex = "5"; // Highest priority
  document.body.appendChild(mc.hybridRenderer.domElement);
}
```

## Benefits Over Traditional Approach

### Before (Separate Components)

```typescript
// Required separate 2D and 3D components
const ui3D = new threeDUIComponent(html, size);
const ui2D = new twoDUIComponent(html, size);

// Manual mode switching logic
if (distance < threshold) {
  ui3D.hide();
  ui2D.show();
} else {
  ui2D.hide();
  ui3D.show();
}

// Manual z-index management
mc.html3dRenderer.domElement.style.zIndex = "5";
mc.html2dRenderer.domElement.style.zIndex = "2";
```

### After (Hybrid Renderer)

```typescript
// Single component handles everything
const hybrid = new HybridUIComponent(html, size, threshold);

// Automatic mode switching
// Automatic z-index management
// Automatic content synchronization
// Zero manual intervention required
```

## Events and Callbacks

The hybrid renderer supports various events:

```typescript
// Component events
entity._RegisterHandler("zoom", async () => await hybrid.zoom());
entity._RegisterHandler("toggleMode", async () => await hybrid.toggleMode());
entity._RegisterHandler("setSize", async (data) => await hybrid.setSizeSmoothly(data.size));

// Renderer callbacks
const hybridRenderer = new CSSHybridRenderer({
  onZIndexChange: (mode) => {
    console.log(`Switched to ${mode} priority`);
    mainController.setRendererZIndex(mode);
  }
});
```

## Browser Compatibility

The CSS Hybrid Renderer leverages:

- **CSS 3D Transforms**: For 3D positioning and perspective
- **CSS 2D Transforms**: For 2D overlay positioning  
- **CSS Transitions**: For smooth mode switching
- **DOM Cloning**: For element synchronization
- **WeakMap Caching**: For performance optimization

Compatible with all modern browsers that support:
- CSS3 transforms
- WebGL
- ES6+ features
- Three.js

## Future Enhancements

Planned improvements include:

- **Animation Sync**: Maintain CSS animations during mode switches
- **Custom Transitions**: Configurable transition effects
- **Batch Processing**: Multiple object transitions in single frame
- **Memory Optimization**: Advanced cleanup and recycling
- **Touch Gestures**: Mobile-specific interaction handling

## Examples

### Interactive Dashboard

```typescript
const dashboardHTML = `
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              padding: 30px; border-radius: 20px; color: white;">
    <h1>🎛️ Hybrid Dashboard</h1>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
        <h3>System Status</h3>
        <p>✅ Hybrid Rendering Active</p>
        <p>📊 Auto-Switch: ${hybridUI.isIn2DMode ? '2D' : '3D'} Mode</p>
      </div>
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
        <h3>Performance</h3>
        <p>⚡ Zero Duplication Overhead</p>
        <p>🎯 Smart Distance Detection</p>
      </div>
    </div>
    <button onclick="toggleMode()" class="uk-button uk-button-primary">
      Toggle Mode Manually
    </button>
  </div>
`;

const dashboard = new HybridUIComponent(dashboardHTML, new THREE.Vector2(2000, 1400), 10);
```

This revolutionary approach eliminates the complexity of managing separate 2D and 3D UI systems while providing a seamless, performant user experience that automatically adapts to user interaction patterns.
