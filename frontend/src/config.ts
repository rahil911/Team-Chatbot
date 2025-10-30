// Configuration for API and WebSocket URLs
// Uses environment variables from Vite (VITE_ prefix)

const getApiUrl = () => {
  // Use environment variable if set, otherwise use localhost for development
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return apiUrl;
};

const getWsUrl = () => {
  const apiUrl = getApiUrl();
  // Convert http/https to ws/wss
  return apiUrl.replace(/^http/, 'ws');
};

export const config = {
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl() + '/ws',
  apiEndpoint: getApiUrl() + '/api',
};

// For debugging
console.log('🔧 Config:', config);

