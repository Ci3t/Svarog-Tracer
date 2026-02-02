
import { AI_CONFIG } from './src/config/ai.config.js';
import handler from './api/ai-analyze-warp.js';

console.log('Config loaded:', AI_CONFIG.MODEL);
console.log('Handler loaded:', typeof handler);
