const ACCESS = 'sms_access_token';
const REFRESH = 'sms_refresh_token';

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH),
  setTokens: (access: string, refresh?: string | null) => {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
    else localStorage.removeItem(REFRESH);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
