import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
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

type RetryConfig = AxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
    refreshQueue.forEach((callback) => callback(token));
    refreshQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalConfig = error.config as RetryConfig | undefined;
        if (!originalConfig || originalConfig._retry) {
            return Promise.reject(error);
        }

        const status = error.response?.status;
        const isRefreshEndpoint = originalConfig.url?.includes('/auth/refresh-token');
        const refreshToken = storage.getRefreshToken();

        if (status !== 401 || isRefreshEndpoint) {
            return Promise.reject(error);
        }

        if (!refreshToken) {
            storage.clearAll();
            window.location.replace("/login");
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                refreshQueue.push((token) => {
                    if (!token) {
                        reject(error);
                        return;
                    }
                    originalConfig._retry = true;
                    originalConfig.headers = {
                        ...originalConfig.headers,
                        Authorization: `Bearer ${token}`,
                    };
                    resolve(api(originalConfig));
                });
            });
        }

        isRefreshing = true;
        originalConfig._retry = true;

        try {
            const refreshResponse = await axios.post(
                `${api.defaults.baseURL}/auth/refresh-token`,
                { refreshToken }
            );

            const newAccess = refreshResponse.data?.accessToken;
            const newRefresh = refreshResponse.data?.refreshToken;

            if (newAccess) {
                storage.setAccessToken(newAccess);
            }
            if (newRefresh) {
                storage.setRefreshToken(newRefresh);
            }

            processQueue(newAccess ?? null);

            originalConfig.headers = {
                ...originalConfig.headers,
                Authorization: `Bearer ${newAccess}`,
            };

            return api(originalConfig);
        } catch (refreshError) {
            processQueue(null);
            storage.clearAll();
            window.location.replace("/login");
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);
