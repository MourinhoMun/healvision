import { create } from 'zustand';
import { activate as activateApi, getBalance as getBalanceApi } from '../api/license';
interface AuthState {
  token: string | null;
  deviceId: string;
  balance: number;
  isActivated: boolean;
  loading: boolean;

  activate: (code: string) => Promise<void>;
  recharge: (code: string) => Promise<void>;
  checkBalance: () => Promise<void>;
  logout: () => void;
  init: () => Promise<void>;
}

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('pengip_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pengip_device_id', id);
  }
  return id;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('pengip_token'),
  deviceId: getOrCreateDeviceId(),
  balance: 0,
  isActivated: !!localStorage.getItem('pengip_token'),
  loading: false,

  activate: async (code: string) => {
    const { deviceId } = get();
    const res = await activateApi(code, deviceId);
    if (res.token) {
      localStorage.setItem('pengip_token', res.token);
      set({ token: res.token, balance: res.balance, isActivated: true });
    }
  },

  recharge: async (code: string) => {
    const { deviceId } = get();
    const res = await activateApi(code, deviceId);
    if (res.balance !== undefined) {
      set({ balance: res.balance });
      if (res.token) {
        localStorage.setItem('pengip_token', res.token);
        set({ token: res.token, isActivated: true });
      }
    }
  },

  checkBalance: async () => {
    try {
      const res = await getBalanceApi();
      set({ balance: res.balance });
    } catch {
      // If 401/403, token is invalid
      get().logout();
    }
  },

  logout: () => {
    localStorage.removeItem('pengip_token');
    set({ token: null, balance: 0, isActivated: false });
  },

  init: async () => {
    set({ loading: true });
    // 优先尝试从主站 cookie 换取新 token（同域请求，cookie 自动携带）
    try {
      const res = await fetch('/api/v1/user/token');
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('pengip_token', data.token);
          set({
            token: data.token,
            balance: data.user?.balance ?? 0,
            isActivated: true,
            loading: false,
          });
          return;
        }
      }
    } catch { /* 主站不可达时降级 */ }

    // 降级：使用本地已存 token
    const token = localStorage.getItem('pengip_token');
    if (token) {
      set({ token, isActivated: true, loading: false });
      get().checkBalance();
    } else {
      set({ loading: false });
    }
  },
}));
