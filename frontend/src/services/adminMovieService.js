import api from './api';

/**
 * Lấy phần `data` từ body chuẩn { success, message, data } của backend.
 * Nếu backend trả thẳng object/array thì dùng luôn.
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Các field hợp lệ cho POST/PUT /api/admin/movies (loại bỏ id và field thừa). */
export const MOVIE_FIELDS = [
  'title',
  'description',
  'durationMinutes',
  'updateFutureShowtimes',
  'rating',
  'active',
  'posterUrl',
  'heroBannerUrl',
  'trailerUrl',
  'director',
  'actors',
  'genre',
  'releaseDate',
  'language',
  'rated',
  'streamProvider',
  'streamKey',
  'status',
];

/** Chỉ giữ lại các field backend nhận, ép kiểu số cho durationMinutes/rating. */
export const toMoviePayload = (form) => {
  const payload = {};
  for (const key of MOVIE_FIELDS) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = form[key];
  }
  if (payload.durationMinutes !== undefined) payload.durationMinutes = Number(payload.durationMinutes);
  if (payload.rating !== undefined) payload.rating = Number(payload.rating);
  if (form.active !== undefined) payload.active = Boolean(form.active);
  return payload;
};

export const adminMovieService = {
  /** GET /api/admin/movies — danh sách phim */
  list: () => api.get('/api/admin/movies').then(unwrap),

  /** GET /api/admin/movies/{movieId} — chi tiết 1 phim */
  getById: (movieId) => api.get(`/api/admin/movies/${movieId}`).then(unwrap),

  /** POST /api/admin/movies — tạo phim mới */
  create: (form) => api.post('/api/admin/movies', toMoviePayload(form)).then(unwrap),

  /** Upload file phim trực tiếp lên S3 bằng presigned URL rồi trả về object key. */
  uploadStream: async (movieId, file) => {
    const contentType = file.type || 'video/mp4';
    const uploadData = await api
      .get(`/api/admin/movies/${movieId}/stream-upload-url`, {
        params: { fileName: file.name, contentType },
      })
      .then(unwrap);

    const response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Upload S3 thất bại (${response.status})`);
    }
    return uploadData.streamKey;
  },

  /** Upload ngay khi admin chọn file, không cần tạo movie trước. */
  uploadStreamFile: async (file, onProgress) => {
    const contentType = file.type || 'video/mp4';
    const uploadData = await api
      .get('/api/admin/movies/stream-upload-url', {
        params: { fileName: file.name, contentType },
      })
      .then(unwrap);

    await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', uploadData.uploadUrl);
      request.setRequestHeader('Content-Type', contentType);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded * 100) / event.total));
        }
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress?.(100);
          resolve();
        } else {
          reject(new Error(`Upload S3 thất bại (${request.status})`));
        }
      };
      request.onerror = () => reject(new Error('Không thể kết nối tới S3 để upload phim'));
      request.onabort = () => reject(new Error('Upload phim đã bị hủy'));
      request.send(file);
    });
    return uploadData.streamKey;
  },

  /** PUT /api/admin/movies/{movieId} — cập nhật phim */
  update: (movieId, form) => api.put(`/api/admin/movies/${movieId}`, toMoviePayload(form)).then(unwrap),

  /** DELETE /api/admin/movies/{movieId} — xóa phim */
  remove: (movieId) => api.delete(`/api/admin/movies/${movieId}`).then(unwrap),
};

export default adminMovieService;
