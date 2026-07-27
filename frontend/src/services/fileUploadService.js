import api from './api';

const unwrap = (response) => (response?.data?.data !== undefined ? response.data.data : response?.data);

export const uploadFile = async (file, folder, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/files/upload', formData, {
    params: folder ? { folder } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
    },
  });

  return unwrap(response);
};

export default uploadFile;
