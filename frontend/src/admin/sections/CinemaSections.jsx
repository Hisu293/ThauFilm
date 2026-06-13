import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SectionHeader from '../components/SectionHeader';
import StatusChip from '../components/StatusChip';

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };

export const TheatersSection = ({ crud }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', phoneNumber: '', status: 1 });

  const save = async () => {
    try {
      if (dialog === 'add') await crud.add(form);
      else await crud.update(dialog, form);
      setDialog(null);
      setForm({ name: '', address: '', city: '', phoneNumber: '', status: 1 });
    } catch (err) {
      console.error('Lỗi khi lưu rạp:', err);
    }
  };

  if (crud.loading) {
    return (
      <>
        <SectionHeader title="Quản lý rạp" subtitle="Thêm · Sửa · Xóa rạp chiếu" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Đang tải...</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title="Quản lý rạp" subtitle="Thêm · Sửa · Xóa rạp chiếu" onAction={() => { setForm({ name: '', address: '', city: '', phoneNumber: '', status: 1 }); setDialog('add'); }} actionLabel="Thêm rạp" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          {crud.error}
          <Button size="small" onClick={crud.reload} sx={{ ml: 2 }}>Thử lại</Button>
        </Box>
      </>
    );
  }

  const getStatusLabel = (status) => status === 1 ? 'Hoạt động' : 'Bảo trì';

  return (
    <>
      <SectionHeader title="Quản lý rạp" subtitle="Thêm · Sửa · Xóa rạp chiếu" onAction={() => { setForm({ name: '', address: '', city: '', phoneNumber: '', status: 1 }); setDialog('add'); }} actionLabel="Thêm rạp" />
      {crud.list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Chưa có rạp nào. Nhấn "Thêm rạp" để tạo mới.
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {crud.list.map((t) => (
            <Box key={t.id} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': '#22c55e' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography fontWeight={700} variant="h6">
                    {t.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t.address}
                  </Typography>
                  {t.city && (
                    <Typography variant="body2" color="text.secondary">
                      {t.city}
                    </Typography>
                  )}
                  {t.phoneNumber && (
                    <Typography variant="body2" color="text.secondary">
                      📞 {t.phoneNumber}
                    </Typography>
                  )}
                </Box>
                <StatusChip status={t.status} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => { setForm(t); setDialog(t.id); }}>
                  Sửa
                </Button>
                <Button size="small" color="error" startIcon={<DeleteRoundedIcon />} onClick={() => crud.remove(t.id)}>
                  Xóa
                </Button>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
      <CrudDialog open={!!dialog} title={dialog === 'add' ? 'Thêm rạp' : 'Sửa rạp'} onClose={() => setDialog(null)} onSave={save}>
        <TextField label="Tên rạp" fullWidth margin="dense" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Địa chỉ" fullWidth margin="dense" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <TextField label="Thành phố" fullWidth margin="dense" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <TextField label="Số điện thoại" fullWidth margin="dense" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
        <TextField select label="Trạng thái" fullWidth margin="dense" value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
          <MenuItem value={1}>Hoạt động</MenuItem>
          <MenuItem value={0}>Bảo trì</MenuItem>
        </TextField>
      </CrudDialog>
    </>
  );
};

export const RoomsSection = ({ crud, theaters, getTheaterName }) => {
  const [dialog, setDialog] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [form, setForm] = useState({ theaterId: '', name: '', rowsCount: 8, seatsPerRow: 10, status: 1 });

  // Chỉ hiện rạp đang hoạt động (status === 1)
  const activeTheaters = theaters.filter(t => t.status === 1);
  const activeTheaterIds = new Set(activeTheaters.map((t) => t.id));
  // Chỉ hiện phòng thuộc rạp đang hoạt động
  const visibleRooms = crud.list.filter((r) => activeTheaterIds.has(r.theaterId));

  const save = async () => {
    try {
      if (dialog === 'add') {
        await crud.add({ theaterId: String(form.theaterId), name: form.name, rowsCount: form.rowsCount, seatsPerRow: form.seatsPerRow, status: form.status ?? 1 });
      } else {
        // PUT /api/admin/rooms/{roomId} — chỉ gửi name + status
        await crud.updateRoom(dialog, { name: form.name, status: form.status });
      }
      setDialog(null);
      setForm({ theaterId: activeTheaters[0]?.id || '', name: '', rowsCount: 8, seatsPerRow: 10, status: 1 });
    } catch (err) {
      console.error('Lỗi khi lưu phòng:', err);
    }
  };

  if (crud.loading) {
    return (
      <>
        <SectionHeader title="Phòng chiếu" subtitle="Thêm phòng và cấu hình ghế" onAction={() => { setForm({ theaterId: activeTheaters[0]?.id || '', name: '', rowsCount: 8, seatsPerRow: 10, status: 1 }); setDialog('add'); }} actionLabel="Thêm phòng" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Đang tải...</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title="Phòng chiếu" subtitle="Thêm phòng và cấu hình ghế" onAction={() => { setForm({ theaterId: activeTheaters[0]?.id || '', name: '', rowsCount: 8, seatsPerRow: 10, status: 1 }); setDialog('add'); }} actionLabel="Thêm phòng" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          {crud.error}
          <Button size="small" onClick={crud.reload} sx={{ ml: 2 }}>Thử lại</Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Phòng chiếu" subtitle="Thêm phòng và cấu hình ghế" onAction={() => { setForm({ theaterId: activeTheaters[0]?.id || '', name: '', rowsCount: 8, seatsPerRow: 10, status: 1 }); setDialog('add'); }} actionLabel="Thêm phòng" />
      <Box className="admin-panel admin-animate-in" sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '40px' }} />
                <TableCell sx={thSx}>Phòng</TableCell>
                <TableCell sx={thSx}>Rạp</TableCell>
                <TableCell sx={thSx}>Hàng ghế</TableCell>
                <TableCell sx={thSx}>Ghế/hàng</TableCell>
                <TableCell sx={thSx}>Tổng ghế</TableCell>
                <TableCell align="right" sx={thSx} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                    Chưa có phòng nào. Nhấn "Thêm phòng" để tạo mới.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRooms.map((r) => (
                  <React.Fragment key={r.id}>
                    <TableRow className="admin-table-row">
                      <TableCell sx={{ width: '40px' }}>
                        <IconButton size="small" onClick={() => setExpandedRoom(expandedRoom === r.id ? null : r.id)} sx={{ p: 0.5 }}>
                          <ExpandMoreRoundedIcon fontSize="small" sx={{ transform: expandedRoom === r.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{r.name}</Typography>
                      </TableCell>
                      <TableCell>{getTheaterName(r.theaterId)}</TableCell>
                      <TableCell>{r.rowsCount}</TableCell>
                      <TableCell>{r.seatsPerRow}</TableCell>
                      <TableCell>{(r.rowsCount || 0) * (r.seatsPerRow || 0)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => { setForm({ ...r, status: r.status ?? 1 }); setDialog(r.id); }}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => crud.remove(r.id)} sx={{ color: '#f87171' }}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    {expandedRoom === r.id && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                          <SeatMapInline room={r} crud={crud} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <CrudDialog open={!!dialog} title={dialog === 'add' ? 'Thêm phòng' : 'Sửa phòng'} onClose={() => setDialog(null)} onSave={save}>
        {dialog === 'add' ? (
          <>
            <TextField select label="Rạp" fullWidth margin="dense" value={String(form.theaterId || '')} onChange={(e) => setForm({ ...form, theaterId: String(e.target.value) })}>
              {activeTheaters.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Tên phòng" fullWidth margin="dense" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField label="Số hàng ghế" type="number" margin="dense" value={form.rowsCount} onChange={(e) => setForm({ ...form, rowsCount: Number(e.target.value) })} sx={{ flex: 1 }} />
              <TextField label="Ghế mỗi hàng" type="number" margin="dense" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: Number(e.target.value) })} sx={{ flex: 1 }} />
            </Stack>
          </>
        ) : (
          <>
            <TextField label="Tên phòng" fullWidth margin="dense" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField select label="Trạng thái" fullWidth margin="dense" value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <MenuItem value={1}>Hoạt động</MenuItem>
              <MenuItem value={0}>Bảo trì</MenuItem>
            </TextField>
          </>
        )}
      </CrudDialog>
    </>
  );
};

// ─── Inline Seat Map ─────────────────────────────────────────────────────────

const SeatMapInline = ({ room, crud }) => {
  const [seats, setSeats] = useState([]);
  const [seatDialog, setSeatDialog] = useState(null);
  const [seatForm, setSeatForm] = useState({ type: 'STANDARD', status: 'ACTIVE' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await crud.getSeatsByRoom(room.id);
        setSeats(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi tải ghế:', err);
        setSeats([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [room.id, crud]);

  const handleUpdateSeat = async (seatId) => {
    try {
      // PATCH /api/admin/rooms/seats/{id} — chỉ gửi type + status
      await crud.updateSeat(seatId, { type: seatForm.type, status: seatForm.status });
      const data = await crud.getSeatsByRoom(room.id);
      setSeats(Array.isArray(data) ? data : []);
      setSeatDialog(null);
      setSeatForm({ type: 'STANDARD', status: 'ACTIVE' });
    } catch (err) {
      alert('Lỗi: ' + (err.message || String(err)));
    }
  };

  const handleDeleteSeat = async (seatId) => {
    try {
      await crud.removeSeat(seatId);
      setSeats(seats.filter((s) => s.id !== seatId));
    } catch (err) {
      alert('Lỗi: ' + (err.message || String(err)));
    }
  };

  const getTypeColor = (type) => (type === 'VIP' ? '#fbbf24' : '#94a3b8');

  return (
    <Box sx={{ bgcolor: 'rgba(0,0,0,0.25)', py: 2, px: 3 }}>
      {loading ? (
        <Typography variant="body2" color="text.secondary">Đang tải ghế...</Typography>
      ) : seats.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Chưa có ghế nào.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {seats.map((s) => (
            <Box
              key={s.id}
              onClick={() => { setSeatForm({ type: s.type || 'STANDARD', status: s.status || 'ACTIVE' }); setSeatDialog(s.id); }}
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: s.status === 'INACTIVE' ? 'rgba(255,255,255,0.1)' : getTypeColor(s.type),
                color: s.status === 'INACTIVE' ? 'rgba(255,255,255,0.3)' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.15)',
                '&:hover': { opacity: 0.8 },
              }}
            >
              {s.rowName}{s.seatNumber}
            </Box>
          ))}
        </Box>
      )}

      {/* Edit dialog — chỉ có type + status */}
      <Dialog open={!!seatDialog} onClose={() => setSeatDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Sửa ghế</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Loại ghế" fullWidth value={seatForm.type} onChange={(e) => setSeatForm({ ...seatForm, type: e.target.value })}>
              <MenuItem value="STANDARD">Standard</MenuItem>
              <MenuItem value="VIP">VIP</MenuItem>
            </TextField>
            <TextField select label="Trạng thái" fullWidth value={seatForm.status} onChange={(e) => setSeatForm({ ...seatForm, status: e.target.value })}>
              <MenuItem value="ACTIVE">Hoạt động</MenuItem>
              <MenuItem value="INACTIVE">Khóa</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSeatDialog(null)}>Hủy</Button>
          <Button variant="contained" onClick={() => handleUpdateSeat(seatDialog)}>Lưu</Button>
          <Button color="error" onClick={() => { handleDeleteSeat(seatDialog); setSeatDialog(null); }}>Xóa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Showtimes ───────────────────────────────────────────────────────────────

export const ShowtimesSection = ({ crud, movies, theaters, rooms }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({
    movieId: '',
    cinemaRoomId: '',
    startTime: '',
    endTime: '',
    status: 0,
  });

  const save = async () => {
    try {
      if (dialog === 'add') {
        await crud.add({
          movieId: String(form.movieId),
          cinemaRoomId: String(form.cinemaRoomId),
          startTime: form.startTime,
          endTime: form.endTime,
          status: 0,
        });
      } else {
        await crud.updateShowtime(dialog, { status: form.status });
      }
      setDialog(null);
      setForm({ movieId: '', cinemaRoomId: '', startTime: '', endTime: '', status: 0 });
    } catch (err) {
      console.error('Lỗi khi lưu suất chiếu:', err);
    }
  };

  // Chỉ hiện rạp đang hoạt động (status === 1)
  const activeTheaters = theaters.filter((t) => t.status === 1);
  const activeTheaterIds = new Set(activeTheaters.map((t) => t.id));
  // Chỉ hiện phòng thuộc rạp đang hoạt động
  const activeRooms = rooms.filter((r) => activeTheaterIds.has(r.theaterId));

  const getMovieTitle = (id) => movies.find((m) => m.id === id)?.title || '—';
  const getTheaterName = (id) => activeTheaters.find((t) => t.id === id)?.name || '—';
  const getCinemaRoomName = (id) => activeRooms.find((r) => r.id === id || r.cinemaRoomId === id)?.name || '—';

  if (crud.loading) {
    return (
      <>
        <SectionHeader title="Suất chiếu" subtitle="Tạo suất và phân công phòng chiếu" onAction={() => setDialog('add')} actionLabel="Tạo suất chiếu" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Đang tải...</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title="Suất chiếu" subtitle="Tạo suất và phân công phòng chiếu" onAction={() => setDialog('add')} actionLabel="Tạo suất chiếu" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          {crud.error}
          <Button size="small" onClick={crud.reload} sx={{ ml: 2 }}>Thử lại</Button>
        </Box>
      </>
    );
  }

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <SectionHeader title="Suất chiếu" subtitle="Tạo suất và phân công phòng chiếu" onAction={() => setDialog('add')} actionLabel="Tạo suất chiếu" />
      <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Phim</TableCell>
                <TableCell sx={thSx}>Phòng chiếu</TableCell>
                <TableCell sx={thSx}>Giờ bắt đầu</TableCell>
                <TableCell sx={thSx}>Giờ kết thúc</TableCell>
                <TableCell sx={thSx}>Trạng thái</TableCell>
                <TableCell align="right" sx={thSx} />
              </TableRow>
            </TableHead>
            <TableBody>
              {crud.list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                    Chưa có suất chiếu nào. Nhấn "Tạo suất chiếu" để tạo mới.
                  </TableCell>
                </TableRow>
              ) : (
              crud.list.map((s) => {
                const statusMap = { 0: 'SCHEDULED', 1: 'ACTIVE', 2: 'COMPLETED', 3: 'CANCELLED' };
                const statusStr = statusMap[s.status] ?? String(s.status ?? 'SCHEDULED');
                return (
                  <TableRow key={s.id} className="admin-table-row">
                    <TableCell>
                      <Typography fontWeight={600}>{s.movie?.title || getMovieTitle(s.movieId)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.room?.name || getCinemaRoomName(s.cinemaRoomId || s.roomId)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getTheaterName(s.theaterId || s.room?.theaterId)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDateTime(s.startTime)}</TableCell>
                    <TableCell>{formatDateTime(s.endTime)}</TableCell>
                    <TableCell>
                      <StatusChip status={statusStr} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setForm({ ...s, status: s.status ?? 0 }); setDialog(s.id); }}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => crud.remove(s.id)} sx={{ color: '#f87171' }}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <CrudDialog open={!!dialog} title={dialog === 'add' ? 'Tạo suất chiếu' : 'Sửa suất chiếu'} onClose={() => setDialog(null)} onSave={save}>
        {dialog === 'add' ? (
          <>
            <TextField select label="Phim" fullWidth margin="dense" value={form.movieId || ''} onChange={(e) => setForm({ ...form, movieId: String(e.target.value) })}>
              {movies.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Phòng chiếu" fullWidth margin="dense" value={form.cinemaRoomId || ''} onChange={(e) => setForm({ ...form, cinemaRoomId: String(e.target.value) })}>
              {activeRooms.map((r) => (
                <MenuItem key={r.id} value={r.cinemaRoomId || r.id}>
                  {r.name} — {getTheaterName(r.theaterId)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Giờ bắt đầu" type="datetime-local" fullWidth margin="dense" InputLabelProps={{ shrink: true }} value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <TextField label="Giờ kết thúc" type="datetime-local" fullWidth margin="dense" InputLabelProps={{ shrink: true }} value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </>
        ) : (
          <TextField select label="Trạng thái" fullWidth margin="dense" value={form.status ?? 0} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
            <MenuItem value={0}>Lên lịch</MenuItem>
            <MenuItem value={1}>Đang chiếu</MenuItem>
            <MenuItem value={2}>Hoàn thành</MenuItem>
            <MenuItem value={3}>Hủy</MenuItem>
          </TextField>
        )}
      </CrudDialog>
    </>
  );
};

const CrudDialog = ({ open, title, onClose, onSave, children }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose}>Hủy</Button>
      <Button variant="contained" onClick={onSave}>
        Lưu
      </Button>
    </DialogActions>
  </Dialog>
);
