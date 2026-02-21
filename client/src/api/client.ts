import axios from 'axios';

const api = axios.create({
  baseURL: '/healvision/api',
  timeout: 120000, // 2 min for AI generation
});

// Request interceptor: attach Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message || 'Unknown error';

    if (status === 401 || status === 403) {
      // Token invalid, clear and reload to show activation page
      localStorage.removeItem('hv_token');
      window.location.reload();
      return Promise.reject(new Error('授权已失效，请重新激活'));
    }

    if (status === 402) {
      // Insufficient credits - let the caller handle with specific message
      const balance = error.response?.data?.balance ?? 0;
      return Promise.reject(new Error(`积分不足（当前余额: ${balance}），请充值后再使用。如需购买充值码，请添加鹏哥微信：peng_ip`));
    }

    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  },
);

export const FILES_BASE = '/healvision/files';

export default api;
