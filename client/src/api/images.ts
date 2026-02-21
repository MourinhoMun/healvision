import api from './client';

export async function uploadImages(caseId: string, files: File[], dayNumber: number): Promise<any[]> {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));
  formData.append('day_number', String(dayNumber));

  const { data } = await api.post(`/cases/${caseId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getImageBase64(imageId: string): Promise<{ base64: string; mime_type: string }> {
  const { data } = await api.get(`/images/${imageId}/base64`);
  return data;
}

export function getImageUrl(imageId: string): string {
  return `/healvision/api/images/${imageId}`;
}

export function getThumbnailUrl(imageId: string): string {
  return `/healvision/api/images/${imageId}/thumbnail`;
}

export async function updateImage(imageId: string, body: { day_number?: number; protection_zones?: any[] }): Promise<any> {
  const { data } = await api.put(`/images/${imageId}`, body);
  return data;
}

export async function deleteImage(imageId: string): Promise<void> {
  await api.delete(`/images/${imageId}`);
}
