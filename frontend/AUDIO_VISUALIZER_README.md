# 🎵 Interactive Character Audio Visualizer

A sophisticated real-time audio visualization system for 3D characters that transforms the activation circle into an interactive visualizer when audio is playing.

## ✨ Features

### Core Functionality
- **Real-time Frequency Analysis**: Uses Web Audio API AnalyserNode for live audio processing
- **Interactive Circular Visualizer**: Dynamic 3D visualization with spinning seeker
- **Spatial Audio Integration**: Seamlessly works with THREE.PositionalAudio
- **Automatic Activation**: Visualizer appears when audio starts, disappears when stopped
- **Configurable Parameters**: Customizable colors, sizes, and behavior

### Visual Components
1. **Main Circle**: Cyan-to-blue gradient that reacts to audio intensity
2. **Frequency Bars**: 32 bars around the circle, height driven by frequency data
3. **Spinning Seeker**: Orange sphere that rotates based on playback progress
4. **Active Bar Highlighting**: Yellow highlighting for high-intensity frequencies
5. **Pulsing Effects**: Subtle scaling effects for dynamic visual appeal

## 🏗️ Architecture

### Files Modified
- `CharacterAudioManager.ts` - Core audio visualizer implementation
- `CharacterComponentRefactored.ts` - Integration with character system
- New interfaces and configuration options

### Key Classes and Interfaces

#### `AudioVisualizerConfig`
```typescript
interface AudioVisualizerConfig {
  enabled?: boolean;
  circleRadius?: number;
  seekerRadius?: number;
  barCount?: number;
  barHeight?: number;
  colors?: {
    circle?: number;
    seeker?: number;
    bars?: number;
    activeBar?: number;
  };
}
```

#### `CharacterAudioManager` (Enhanced)
- **New Properties**: Visualizer components, audio analysis, configuration
- **New Methods**: 
  - `initializeVisualizer()` - Creates 3D visualizer components
  - `updateVisualizer()` - Real-time update loop
  - `startVisualization()` / `stopVisualization()` - Control methods
  - `updateVisualizerConfig()` - Runtime configuration updates

## 🎮 Usage

### Basic Integration
The visualizer automatically activates when characters play music:

```typescript
// Character plays music (existing functionality)
await character.playPositionalMusic("sounds/music.mp3");

// Visualizer automatically:
// 1. Replaces activation circle
// 2. Connects to audio source
// 3. Starts real-time visualization
// 4. Stops when audio ends
```

### Configuration
```typescript
const audioManager = new CharacterAudioManager(
  webgpuGroup, 
  audioListener,
  audioConfig, // Standard audio config
  {             // New visualizer config
    enabled: true,
    circleRadius: 3,
    barCount: 32,
    colors: {
      circle: 0x00ffff,
      seeker: 0xff6600,
      bars: 0x4444ff,
      activeBar: 0xffff00
    }
  }
);
```

### Runtime Control
```typescript
// Check visualizer status
if (audioManager.hasVisualizer()) {
  console.log("Visualizer available");
}

if (audioManager.isVisualizationActive()) {
  console.log("Currently visualizing audio");
}

// Update configuration
audioManager.updateVisualizerConfig({
  barCount: 64,
  colors: { seeker: 0xff0000 }
});
```

## 🎨 Visual Design

### Color Scheme
- **Circle**: `0x00ffff` (Cyan) → Dynamic blue gradient based on intensity
- **Seeker**: `0xff6600` (Orange) → Rotating playback indicator
- **Bars**: `0x4444ff` (Blue) → Frequency visualization
- **Active Bars**: `0xffff00` (Yellow) → High-intensity frequency highlighting

### Animation Details
- **Seeker Rotation**: Full 360° rotation over audio duration
- **Frequency Bars**: Scale vertically (0.05 to 1.5 units) based on frequency
- **Circle Intensity**: Opacity and color shift based on average audio amplitude
- **Pulsing Effect**: Seeker scales with subtle sine wave animation

## 🔧 Technical Implementation

### Web Audio Pipeline
```
Audio Source → AnalyserNode → Frequency Data → Visualization
                    ↓
              Visual Updates (60fps)
```

### THREE.js Integration
- Uses `THREE.Group` for organized component management
- `THREE.CircleGeometry` for main circle visualization
- `THREE.BoxGeometry` for frequency bars
- `THREE.SphereGeometry` for seeker indicator
- Proper material disposal and memory management

### Performance Optimizations
- Efficient frequency data mapping (128 FFT → 32 bars)
- Material reuse and smart updates
- Conditional rendering based on audio state
- Memory cleanup on destruction

## 🎯 Integration Points

### Character Activation System
The visualizer intelligently integrates with the existing activation circle:

1. **No Audio**: Shows standard yellow activation circle
2. **Audio Playing**: Hides activation circle, shows interactive visualizer
3. **Audio Stops**: Hides visualizer, restores activation circle

### UI Integration
- Music button in character UI triggers visualizer
- Visual feedback during audio loading
- Automatic state management

## 🚀 Getting Started

### For Developers
1. **Audio Setup**: Ensure `THREE.AudioListener` is properly configured
2. **Character Creation**: Use standard character creation workflow
3. **Music Playback**: Click music button in character UI or call `playPositionalMusic()`
4. **Enjoy**: Visualizer automatically handles the rest!

### For Artists/Designers
The visualizer is fully configurable through the `AudioVisualizerConfig`:
- Adjust colors to match character themes
- Scale components for different character sizes
- Modify bar count for performance vs. detail trade-offs

## 🎵 Audio Format Support
- **Recommended**: MP3, WAV, OGG
- **Requirements**: Web Audio API compatible formats
- **Performance**: Smaller files load faster, larger files provide longer visualization

## 🔍 Debugging

### Common Issues
1. **No Visualizer**: Check audio manager initialization and browser audio permissions
2. **No Animation**: Verify audio is actually playing and AnalyserNode connection
3. **Performance**: Reduce `barCount` or `barHeight` for lower-end devices

### Console Logging
The system provides detailed console output for debugging:
- Audio manager initialization status
- Visualizer creation and cleanup
- Audio loading and playback events

## 🎉 Result

When complete, characters in your 3D world will have:
- **Immersive Audio**: Spatial 3D audio that responds to distance and position
- **Visual Feedback**: Beautiful real-time visualization that reacts to music
- **Interactive Elements**: Spinning seeker shows playback progress
- **Automatic Behavior**: No manual control needed - works seamlessly with existing systems

The visualizer transforms the simple activation circle into a dynamic, interactive audio experience that enhances the character's presence in the 3D world!
