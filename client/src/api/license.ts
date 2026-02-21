import api from './client';

export interface ActivateResponse {
  success: boolean;
  token: string;
  balance: number;
  message?: string;
}

export interface BalanceResponse {
  balance: number;
}

export async function activate(code: string, deviceId: string): Promise<ActivateResponse> {
  const { data } = await api.post('/license/activate', { code, deviceId });
  return data;
}

export async function getBalance(): Promise<BalanceResponse> {
  const { data } = await api.get('/license/balance');
  return data;
}
