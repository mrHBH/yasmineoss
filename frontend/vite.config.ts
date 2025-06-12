// vite.config.js

import { defineConfig } from 'vite';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'

const isObjectWithDefaultFunction = (module: unknown): module is { default: typeof monacoEditorPluginModule } => (
  module != null &&
  typeof module === 'object' &&
  'default' in module &&
  typeof module.default === 'function'
)

const monacoEditorPlugin = isObjectWithDefaultFunction(monacoEditorPluginModule)
  ? monacoEditorPluginModule.default
  : monacoEditorPluginModule

export default defineConfig({
  assetsInclude: ['**/*.keep'],

  resolve: {
    alias: {
       'three/examples/jsm': 'three/examples/jsm',
       'three/addons': 'three/examples/jsm',
       'three/tsl': 'three/webgpu',
      //  'three': 'three/webgpu',
        

    }
  },
  optimizeDeps: {
    exclude: ['latex.js']
  },
   
  plugins: [monacoEditorPlugin(
    {
      // languages: ['javascript', 'css', 'html', 'json'],
      // features: ['coreCommands', 'find', 'format', 'goToDefinition', 'goToTypeDefinition', 'hover', 'rename', 'suggest'],
      // themes: ['vs-dark', 'hc-black']
    }
  )],
 
});

 