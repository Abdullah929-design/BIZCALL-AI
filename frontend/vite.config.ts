import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
        // Required for Server-Sent Events: disable response buffering
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Signal to the upstream that we want a streaming response
            if (req.url?.includes('/stream')) {
              proxyReq.setHeader('Accept', 'text/event-stream');
              proxyReq.setHeader('Cache-Control', 'no-cache');
            }
          });
        },
      }
    }
  }
})

