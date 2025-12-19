import axios from 'axios';
import { storage } from './storage';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
    withCredentials: true,
});

api.interceptors.request.use((config: any) => {
    const token = storage.getAccessToken();
    if(token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});