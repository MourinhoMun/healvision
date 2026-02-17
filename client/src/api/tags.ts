import api from './client';
import type { Tag } from '@healvision/shared';

export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get('/tags');
  return data;
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const { data } = await api.post('/tags', { name, color });
  return data;
}

export async function updateTag(id: string, body: { name?: string; color?: string }): Promise<Tag> {
  const { data } = await api.put(`/tags/${id}`, body);
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/tags/${id}`);
}

export async function assignTags(caseId: string, tagIds: string[]): Promise<void> {
  await api.post(`/cases/${caseId}/tags`, { tag_ids: tagIds });
}
