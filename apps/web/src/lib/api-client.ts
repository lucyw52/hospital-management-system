import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Try to get token from localStorage first (after refresh)
    let token = localStorage.getItem('token');
    
    // If not in localStorage, try to get from auth-storage (zustand persist)
    if (!token) {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed.state?.token;
        }
      } catch (e) {
        console.error('Failed to parse auth-storage:', e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (no response) — show friendly message
    if (!error.response) {
      if (typeof window !== 'undefined') {
        console.error('Network error: could not reach API', error);
        toast.error('Network error: cannot reach API — start the backend at http://localhost:3001');
      }
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
