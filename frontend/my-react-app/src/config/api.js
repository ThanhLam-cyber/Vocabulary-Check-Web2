// API Configuration
const API_CONFIG = {
  // Development
  development: {
    baseURL: 'http://localhost:4000',
  },
  // Production (Render)
  production: {
    baseURL: 'https://vocabulary-check-web.onrender.com',
  }
};

// Get current environment
const isDevelopment = import.meta.env.DEV;
const currentConfig = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// API Endpoints
export const API_ENDPOINTS = {
  // Real-time transcription
  realtimeTranscribe: `${currentConfig.baseURL}/api/realtime-transcribe`,
  
  // Pronunciation assessment
  pronunciationAssess: `${currentConfig.baseURL}/api/pronunciation-assess`,
  
  // Practice sentence generation
  generatePracticeSentence: `${currentConfig.baseURL}/api/generate-practice-sentence`,
  
  // AssemblyAI transcription
  assemblyaiTranscribe: `${currentConfig.baseURL}/api/assemblyai-transcribe`,
  
  // RapidAPI ASR
  rapidAsr: `${currentConfig.baseURL}/api/rapid-asr`,
  
  // Health check
  health: `${currentConfig.baseURL}/api/health`,
};

// Helper function to get API URL
export const getApiUrl = (endpoint) => {
  return `${currentConfig.baseURL}${endpoint}`;
};

// Export current config
export const API_BASE_URL = currentConfig.baseURL;

export default API_ENDPOINTS;
