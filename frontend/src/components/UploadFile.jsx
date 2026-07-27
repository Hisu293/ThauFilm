import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import uploadFile from '../services/fileUploadService';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov'];
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE = 200 * 1024 * 1024;

const extensionOf = (name = '') => name.split('.').pop()?.toLowerCase() || '';

export default function UploadFile({
  label,
  folder = 'images',
  value = '',
  onChange,
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [localPreview, setLocalPreview] = useState('');
  const objectUrlRef = useRef('');

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    if (!value && objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
      setLocalPreview('');
    }
  }, [value]);

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const extension = extensionOf(file.name);
    const isImage = IMAGE_EXTENSIONS.includes(extension);
    const isVideo = VIDEO_EXTENSIONS.includes(extension);
    const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
    if ((!isImage && !isVideo) || file.size > maxSize) {
      setError(isVideo ? 'Video phải là MP4 hoặc MOV và không vượt quá 200MB.' : 'Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 5MB.');
      return;
    }
    if (folder === 'posters' && !isImage) {
      setError('Poster chỉ được phép là file ảnh.');
      return;
    }
    if (folder === 'trailers' && !isVideo) {
      setError('Trailer chỉ được phép là file MP4 hoặc MOV.');
      return;
    }

    setError('');
    setLoading(true);
    setProgress(0);
    if (isImage) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      setLocalPreview(objectUrlRef.current);
    }

    try {
      const uploaded = await uploadFile(file, folder, setProgress);
      onChange?.(uploaded.fileUrl, uploaded);
    } catch (uploadError) {
      setError(uploadError.message || 'Upload file thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const preview = localPreview || value;
  const isImageValue = Boolean(preview) && !folder.includes('trailer');

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Button
        variant="outlined"
        component="label"
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={16} /> : <CloudUploadRoundedIcon />}
        sx={{ justifyContent: 'flex-start' }}
      >
        {loading ? `Đang upload ${progress}%...` : label}
        <input hidden type="file" accept={accept} onChange={selectFile} />
      </Button>
      {loading && <LinearProgress variant="determinate" value={progress} />}
      {error && <Alert severity="error">{error}</Alert>}
      {isImageValue && (
        <Box component="img" src={preview} alt="Preview" sx={{ width: 110, height: 150, objectFit: 'cover', borderRadius: 1.5 }} />
      )}
      {value && (
        <Typography variant="caption" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
          URL: {value}
        </Typography>
      )}
    </Box>
  );
}
