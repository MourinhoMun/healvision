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
  init: () => void;
}

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('hv_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('hv_device_id', id);
  }
  return id;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('hv_token'),
  deviceId: getOrCreateDeviceId(),
  balance: 0,
  isActivated: !!localStorage.getItem('hv_token'),
  loading: false,

  activate: async (code: string) => {
    const { deviceId } = get();
    const res = await activateApi(code, deviceId);
    if (res.token) {
      localStorage.setItem('hv_token', res.token);
      set({ token: res.token, balance: res.balance, isActivated: true });
    }
  },

  recharge: async (code: string) => {
    const { deviceId } = get();
    const res = await activateApi(code, deviceId);
    if (res.balance !== undefined) {
      set({ balance: res.balance });
      if (res.token) {
        localStorage.setItem('hv_token', res.token);
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
    localStorage.removeItem('hv_token');
    set({ token: null, balance: 0, isActivated: false });
  },

  init: () => {
    const token = localStorage.getItem('hv_token');
    if (token) {
      set({ token, isActivated: true });
      get().checkBalance();
    }
  },
}));
