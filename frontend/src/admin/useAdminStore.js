import { useCallback, useEffect, useState } from 'react';
import { adminMovieService } from '../services/adminMovieService';
import { adminTheaterService } from '../services/adminTheaterService';
import { adminRoomService } from '../services/adminRoomService';
import { adminShowtimeService } from '../services/adminShowtimeService';
import { adminService } from '../services/adminService';

const uid = () => Date.now() + Math.floor(Math.random() * 1000);

const initialGenres = [
  { id: 1, name: 'Hành động', slug: 'action', movieCount: 12 },
  { id: 2, name: 'Tình cảm', slug: 'romance', movieCount: 8 },
  { id: 3, name: 'Khoa học viễn tưởng', slug: 'sci-fi', movieCount: 5 },
  { id: 4, name: 'Hoạt hình', slug: 'animation', movieCount: 6 },
];

const initialActors = [
  { id: 1, name: 'Tom Holland', nationality: 'Mỹ', movieCount: 4 },
  { id: 2, name: 'Zendaya', nationality: 'Mỹ', movieCount: 3 },
  { id: 3, name: 'Leonardo DiCaprio', nationality: 'Mỹ', movieCount: 6 },
];

const initialTrailers = [
  { id: 1, movieId: 1, movieTitle: 'Bangkok Traffic', fileName: 'bangkok-trailer.mp4', size: '48 MB', status: 'ready' },
  { id: 2, movieId: 2, movieTitle: 'Siam Love Story', fileName: null, size: null, status: 'missing' },
];

export function useAdminStore() {
  // Phim: lấy từ API /api/admin/movies (không còn dùng seed local)
  const [movieList, setMovieList] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [moviesError, setMoviesError] = useState(null);

  const loadMovies = useCallback(async () => {
    setMoviesLoading(true);
    setMoviesError(null);
    try {
      const data = await adminMovieService.list();
      setMovieList(Array.isArray(data) ? data : []);
    } catch (err) {
      setMoviesError(err.message || 'Không tải được danh sách phim');
      setMovieList([]);
    } finally {
      setMoviesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Tải phim từ API khi mở trang admin (fetch-on-mount, không phải đồng bộ state nội bộ)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovies();
  }, [loadMovies]);

  // Người dùng: lấy từ API /api/admin/users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await adminService.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsersError(err.message || 'Không tải được danh sách người dùng');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Dashboard: số liệu tổng quan /api/admin/dashboard
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      setDashboardData(await adminService.getDashboard());
    } catch (err) {
      setDashboardError(err.message || 'Không tải được số liệu tổng quan');
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Hồ sơ admin đang đăng nhập /api/admin/me
  const [me, setMe] = useState(null);
  const loadMe = useCallback(async () => {
    try {
      setMe(await adminService.getMe());
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount cho users + dashboard + hồ sơ admin
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
    loadDashboard();
    loadMe();
  }, [loadUsers, loadDashboard, loadMe]);

  const [genres, setGenres] = useState(initialGenres);
  const [actors, setActors] = useState(initialActors);
  const [trailers, setTrailers] = useState(initialTrailers);
  const [theaters, setTheaters] = useState([]);
  const [theatersLoading, setTheatersLoading] = useState(false);
  const [theatersError, setTheatersError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [showtimesError, setShowtimesError] = useState(null);

  // Rạp chiếu: lấy từ API /api/admin/theaters
  const loadTheaters = useCallback(async () => {
    setTheatersLoading(true);
    setTheatersError(null);
    try {
      const data = await adminTheaterService.list();
      setTheaters(Array.isArray(data) ? data : []);
    } catch (err) {
      setTheatersError(err.message || 'Không tải được danh sách rạp');
      setTheaters([]);
    } finally {
      setTheatersLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTheaters();
  }, [loadTheaters]);

  // Phòng chiếu: lấy từ API /api/admin/rooms
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const data = await adminRoomService.list();
      // Map API response sang đúng field cho UI
      const mapped = (Array.isArray(data) ? data : []).map(room => ({
        ...room,
        rowsCount: room.rowsCount ?? room.rows,
        seatsPerRow: room.seatsPerRow ?? room.cols,
      }));
      setRooms(mapped);
    } catch (err) {
      setRoomsError(err.message || 'Không tải được danh sách phòng');
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRooms();
  }, [loadRooms]);

  // Suất chiếu: lấy từ API /api/admin/showtimes
  const loadShowtimes = useCallback(async () => {
    setShowtimesLoading(true);
    setShowtimesError(null);
    try {
      const data = await adminShowtimeService.list();
      setShowtimes(Array.isArray(data) ? data : []);
    } catch (err) {
      setShowtimesError(err.message || 'Không tải được danh sách suất chiếu');
      setShowtimes([]);
    } finally {
      setShowtimesLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadShowtimes();
  }, [loadShowtimes]);

  const crud = {
    movies: {
      list: movieList,
      loading: moviesLoading,
      error: moviesError,
      reload: loadMovies,
      // Lấy chi tiết 1 phim từ API (dùng khi mở form sửa để có dữ liệu mới nhất)
      getById: (id) => adminMovieService.getById(id),
      add: async (row) => {
        await adminMovieService.create(row);
        await loadMovies();
      },
      update: async (id, row) => {
        await adminMovieService.update(id, row);
        await loadMovies();
      },
      // Xóa mềm: chỉ chuyển active = false (không xóa cứng khỏi DB)
      remove: async (id) => {
        const row = movieList.find((m) => m.id === id);
        await adminMovieService.update(id, { ...row, active: false });
        await loadMovies();
      },
      // Khôi phục phim đã ẩn
      restore: async (id) => {
        const row = movieList.find((m) => m.id === id);
        await adminMovieService.update(id, { ...row, active: true });
        await loadMovies();
      },
    },
    genres: {
      list: genres,
      add: (row) => setGenres((s) => [...s, { ...row, id: uid(), movieCount: 0 }]),
      update: (id, row) => setGenres((s) => s.map((x) => (x.id === id ? { ...x, ...row } : x))),
      remove: (id) => setGenres((s) => s.filter((x) => x.id !== id)),
    },
    actors: {
      list: actors,
      add: (row) => setActors((s) => [...s, { ...row, id: uid(), movieCount: 0 }]),
      update: (id, row) => setActors((s) => s.map((x) => (x.id === id ? { ...x, ...row } : x))),
      remove: (id) => setActors((s) => s.filter((x) => x.id !== id)),
    },
    trailers: {
      list: trailers,
      upload: (movieId, fileName) =>
        setTrailers((s) =>
          s.map((t) =>
            t.movieId === movieId
              ? { ...t, fileName, size: '52 MB', status: 'ready' }
              : t
          )
        ),
      linkMovie: (movieId, movieTitle) =>
        setTrailers((s) => [...s, { id: uid(), movieId, movieTitle, fileName: null, size: null, status: 'missing' }]),
    },
    theaters: {
      list: theaters,
      loading: theatersLoading,
      error: theatersError,
      reload: loadTheaters,
      // Lấy chi tiết 1 rạp từ API (dùng khi mở form sửa để có dữ liệu mới nhất)
      getById: (id) => adminTheaterService.getById(id),
      add: async (row) => {
        await adminTheaterService.create(row);
        await loadTheaters();
      },
      update: async (id, row) => {
        await adminTheaterService.update(id, row);
        await loadTheaters();
      },
      remove: async (id) => {
        await adminTheaterService.remove(id);
        await loadTheaters();
      },
    },
    rooms: {
      list: rooms,
      loading: roomsLoading,
      error: roomsError,
      reload: loadRooms,
      getById: (id) => adminRoomService.getById(id),
      getSeatMap: (id) => adminRoomService.getSeatMap(id),
      add: async (row) => {
        await adminRoomService.create(row);
        await loadRooms();
      },
      update: async (id, row) => {
        await adminRoomService.update(id, row);
        await loadRooms();
      },
      updateRoom: async (id, row) => {
        // PUT /api/admin/rooms/{roomId} — chỉ name + status
        await adminRoomService.updateRoom(id, row);
        await loadRooms();
      },
      remove: async (id) => {
        await adminRoomService.remove(id);
        await loadRooms();
      },
      // Seats
      getSeatById: (id) => adminRoomService.getSeatById(id),
      getSeatsByRoom: (roomId) => adminRoomService.getSeatsByRoom(roomId),
      createSeat: async (row) => {
        await adminRoomService.createSeat(row);
      },
      updateSeat: async (seatId, row) => {
        await adminRoomService.updateSeat(seatId, row);
      },
      removeSeat: async (seatId) => {
        await adminRoomService.removeSeat(seatId);
      },
    },
    showtimes: {
      list: showtimes,
      loading: showtimesLoading,
      error: showtimesError,
      reload: loadShowtimes,
      getById: (id) => adminShowtimeService.getById(id),
      suggestions: (movieId, fromDate) => adminShowtimeService.suggestions(movieId, fromDate),
      add: async (row) => {
        await adminShowtimeService.create(row);
        await loadShowtimes();
        await loadDashboard();
      },
      update: async (id, row) => {
        await adminShowtimeService.update(id, row);
        await loadShowtimes();
      },
      updateShowtime: async (id, row) => {
        // PUT /api/admin/showtimes/{id} — chỉ status
        await adminShowtimeService.updateShowtime(id, row);
        await loadShowtimes();
      },
      remove: async (id) => {
        await adminShowtimeService.remove(id);
        await loadShowtimes();
        await loadDashboard();
      },
    },
    users: {
      list: users,
      loading: usersLoading,
      error: usersError,
      reload: loadUsers,
      // Lấy chi tiết 1 người dùng từ API (GET /api/admin/users/{userId})
      getById: (id) => adminService.getUser(id),
      setRole: async (id, role) => {
        await adminService.setRole(id, role);
        await loadUsers();
      },
      enable: async (id) => {
        await adminService.enableUser(id);
        await loadUsers();
      },
      disable: async (id) => {
        await adminService.disableUser(id);
        await loadUsers();
      },
      updateAccess: async (id, payload) => {
        await adminService.updateAccess(id, payload);
        await loadUsers();
      },
    },
  };

  const dashboard = {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    reload: loadDashboard,
  };

  const getTheaterName = useCallback((id) => theaters.find((t) => t.id === id)?.name || '—', [theaters]);

  return { crud, dashboard, me, getTheaterName, movieList };
}
