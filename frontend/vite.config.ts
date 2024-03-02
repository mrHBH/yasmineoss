// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
//   resolve: {
//     alias: {
//       // Set up any necessary aliases here
//       '@': path.resolve(__dirname, './src'),
//     },
//   },
  // If using React
  // esbuild: {
  //   jsxInject: `import React from 'react'`
  // },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  
  build: {
    target: 'esnext', // Ensure the build targets modern environments
    commonjsOptions: {
        esmExternals: true 
     },
  },
});
