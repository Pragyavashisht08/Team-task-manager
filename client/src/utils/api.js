import axios from 'axios';

// In production the React app is served by the same Express server, so we use
// a relative path. For local dev with `vite`, the dev server proxies /api → :5000.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use(
    (config) => {
        const stored = localStorage.getItem('userInfo');
        const userInfo = stored ? JSON.parse(stored) : null;
        if (userInfo && userInfo.token) {
            config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('userInfo');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
