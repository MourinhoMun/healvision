import api from './client';
import type { Case, CreateCaseRequest } from '@healvision/shared';

export async function getCases(): Promise<Case[]> {
  const { data } = await api.get('/cases');
  return data;
}

export async function getCase(id: string): Promise<Case & { source_images: any[]; generated_images: any[]; tags: any[] }> {
  const { data } = await api.get(`/cases/${id}`);
  return data;
}

export async function createCase(body: CreateCaseRequest): Promise<Case> {
  const { data } = await api.post('/cases', body);
  return data;
}

export async function updateCase(id: string, body: Partial<CreateCaseRequest>): Promise<Case> {
  const { data } = await api.put(`/cases/${id}`, body);
  return data;
}

export async function deleteCase(id: string): Promise<void> {
  await api.delete(`/cases/${id}`);
}

export async function cloneCaseFromImage(imageId: string): Promise<Case> {
  const { data } = await api.post(`/cases/clone-from-image/${imageId}`);
  return data;
}
