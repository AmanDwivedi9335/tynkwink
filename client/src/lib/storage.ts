const ACCESS_KEY = 'accessToken';
const REFRESH_kEY = 'refreshToken';

export const storage= {
    getAccessToken(): string | null {
        return localStorage.getItem(ACCESS_KEY);
    },
    setAccessToken(token: string){
        localStorage.setItem(ACCESS_KEY, token);
    },
    clearAccessToken(){
        localStorage.removeItem(ACCESS_KEY);
    },

    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_kEY);
    },
    setRefreshToken(token: string){
        localStorage.setItem(REFRESH_kEY, token);
    },
    clearRefreshToken(){
        localStorage.removeItem(REFRESH_kEY);
    },

    clearAll(){
        this.clearAccessToken();
        this.clearRefreshToken();
    }   
};