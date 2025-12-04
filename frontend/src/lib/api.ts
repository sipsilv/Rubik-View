import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1', //update later with the nginx one
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second default timeout
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors silently
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      // Return a rejected promise but don't log to console
      return Promise.reject(error);
    }
    // For other errors, pass them through
    return Promise.reject(error);
  }
);

export default api;
