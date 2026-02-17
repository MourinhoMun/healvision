import api from './client';

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(body: { default_language?: string; watermark_enabled?: boolean }): Promise<void> {
  await api.put('/settings', body);
}

export async function verifyDevPassword(password: string): Promise<string> {
  const { data } = await api.post('/settings/dev/verify', { password });
  return data.token;
}

export async function getDevConfig(token: string): Promise<{ api_endpoint: string; api_key_masked: string; api_key_set: boolean }> {
  const { data } = await api.get('/settings/dev/config', {
    headers: { 'x-dev-token': token },
  });
  return data;
}

export async function updateDevConfig(token: string, body: { api_endpoint?: string; api_key?: string; new_password?: string }): Promise<void> {
  await api.put('/settings/dev/config', body, {
    headers: { 'x-dev-token': token },
  });
}
