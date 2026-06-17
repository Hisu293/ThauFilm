import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import SectionHeader from '../components/SectionHeader';
import StatusChip from '../components/StatusChip';
import { fromUTCToLocal } from '../../services/adminShowtimeService';

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };

export const TheatersSection = ({ crud }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', phoneNumber: '', status: 1 });
  const [search, setSearch] = useState('');

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

  const q = search.trim().toLowerCase();
  const filteredTheaters = q
    ? crud.list.filter((t) =>
        [t.name, t.address, t.city, t.phoneNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : crud.list;

  return (
    <>
      <SectionHeader title="Quản lý rạp" subtitle="Thêm · Sửa · Xóa rạp chiếu" onAction={() => { setForm({ name: '', address: '', city: '', phoneNumber: '', status: 1 }); setDialog('add'); }} actionLabel="Thêm rạp" />

      {/* Bộ lọc tìm kiếm rạp */}
      <Box className="admin-panel admin-animate-in" sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Tìm theo tên, địa chỉ, thành phố hoặc SĐT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', ml: 'auto' }}>
          {filteredTheaters.length}/{crud.list.length} rạp
        </Typography>
      </Box>

      {crud.list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Chưa có rạp nào. Nhấn "Thêm rạp" để tạo mới.
        </Box>
      ) : filteredTheaters.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Không tìm thấy rạp khớp từ khóa "{search}".
        </Box>
      ) : (
        <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Rạp</TableCell>
                  <TableCell sx={thSx}>Địa chỉ</TableCell>
                  <TableCell sx={thSx}>Thành phố</TableCell>
                  <TableCell sx={thSx}>Số điện thoại</TableCell>
                  <TableCell sx={thSx}>Trạng thái</TableCell>
                  <TableCell align="right" sx={thSx} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTheaters.map((t) => (
                  <TableRow key={t.id} className="admin-table-row">
                    <TableCell>
                      <Typography fontWeight={600}>{t.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{t.address || '—'}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{t.city || '—'}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{t.phoneNumber || '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={t.status} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setForm(t); setDialog(t.id); }} title="Sửa">
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => crud.remove(t.id)} sx={{ color: '#f87171' }} title="Xóa">
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <CrudDialog open={!!dialog} title={dialog === 'add' ? 'Thêm rạp' : 'Sửa rạp'} onClose={() => setDialog(null)} onSave={save}>
        <TextField label="Tên rạp" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Địa chỉ" fullWidth value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <TextField label="Thành phố" fullWidth value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <TextField label="Số điện thoại" fullWidth value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
        <TextField select label="Trạng thái" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
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
                  <RoomRow
                    key={r.id}
                    room={r}
                    crud={crud}
                    theaterName={getTheaterName(r.theaterId)}
                    expanded={expandedRoom === r.id}
                    onToggle={() => setExpandedRoom(expandedRoom === r.id ? null : r.id)}
                    onEdit={() => { setForm({ ...r, status: r.status ?? 1 }); setDialog(r.id); }}
                    onDelete={() => crud.remove(r.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <CrudDialog open={!!dialog} title={dialog === 'add' ? 'Thêm phòng' : 'Sửa phòng'} onClose={() => setDialog(null)} onSave={save}>
        {dialog === 'add' ? [
            <TextField key="theater" select label="Rạp" fullWidth value={String(form.theaterId || '')} onChange={(e) => setForm({ ...form, theaterId: String(e.target.value) })}>
              {activeTheaters.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>,
            <TextField key="name" label="Tên phòng" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />,
            <Stack key="dims" direction="row" spacing={2}>
              <TextField label="Số hàng ghế" type="number" value={form.rowsCount} onChange={(e) => setForm({ ...form, rowsCount: Number(e.target.value) })} sx={{ flex: 1 }} />
              <TextField label="Ghế mỗi hàng" type="number" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: Number(e.target.value) })} sx={{ flex: 1 }} />
            </Stack>,
        ] : [
            <TextField key="name" label="Tên phòng" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />,
            <TextField key="status" select label="Trạng thái" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <MenuItem value={1}>Hoạt động</MenuItem>
              <MenuItem value={0}>Bảo trì</MenuItem>
            </TextField>,
        ]}
      </CrudDialog>
    </>
  );
};

// ─── Dòng phòng: tự tải ghế để hiện đúng số hàng / ghế-mỗi-hàng / tổng ghế ─────

const RoomRow = ({ room, crud, theaterName, expanded, onToggle, onEdit, onDelete }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSeats = async () => {
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

  useEffect(() => {
    loadSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // Tính số liệu thực tế từ danh sách ghế (ưu tiên), fallback về dữ liệu phòng
  const rowNames = [...new Set(seats.map((s) => s.rowName).filter(Boolean))];
  const rowsCount = rowNames.length || room.rowsCount || 0;
  const seatsPerRow = seats.length
    ? Math.max(...rowNames.map((rn) => seats.filter((s) => s.rowName === rn).length))
    : room.seatsPerRow || 0;
  const totalSeats = seats.length || rowsCount * seatsPerRow;

  const numCell = (v) => (loading ? '…' : v || 0);

  return (
    <React.Fragment>
      <TableRow className="admin-table-row">
        <TableCell sx={{ width: '40px' }}>
          <IconButton size="small" onClick={onToggle} sx={{ p: 0.5 }}>
            <ExpandMoreRoundedIcon fontSize="small" sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography fontWeight={600}>{room.name}</Typography>
        </TableCell>
        <TableCell>{theaterName}</TableCell>
        <TableCell>{numCell(rowsCount)}</TableCell>
        <TableCell>{numCell(seatsPerRow)}</TableCell>
        <TableCell>
          <Box component="span" sx={{ px: 1.2, py: 0.4, borderRadius: 1, bgcolor: 'rgba(99,102,241,0.18)', color: '#a5b4fc', fontWeight: 700, fontSize: '0.85rem' }}>
            {numCell(totalSeats)}
          </Box>
        </TableCell>
        <TableCell align="right">
          <IconButton size="small" onClick={onEdit}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete} sx={{ color: '#f87171' }}>
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
            <SeatMapInline room={room} crud={crud} seats={seats} loading={loading} onReload={loadSeats} />
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};

// ─── Cửa ra/vào đặt ở hai góc dưới khu ghế (như rạp thật) ──────────────────────

const DoorMarker = ({ side }) => (
  <Box
    sx={{
      position: 'absolute',
      bottom: 0,
      [side]: 0,
      display: { xs: 'none', sm: 'flex' },
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.3,
      color: '#34d399',
    }}
  >
    <Box
      sx={{
        width: 30,
        height: 46,
        borderRadius: 1,
        border: '2px solid rgba(52,211,153,0.6)',
        bgcolor: 'rgba(52,211,153,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MeetingRoomRoundedIcon sx={{ fontSize: 20 }} />
    </Box>
    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(52,211,153,0.85)' }}>
      CỬA
    </Typography>
  </Box>
);

// ─── Sơ đồ ghế kiểu CGV ───────────────────────────────────────────────────────

const SEAT_TYPE_META = {
  VIP: { label: 'Ghế VIP', color: '#fbbf24' },
  STANDARD: { label: 'Ghế thường', color: '#64748b' },
};

const SeatMapInline = ({ room, crud, seats, loading, onReload }) => {
  const [seatDialog, setSeatDialog] = useState(null);
  const [seatForm, setSeatForm] = useState({ type: 'STANDARD', status: 'ACTIVE' });

  const handleUpdateSeat = async (seatId) => {
    try {
      await crud.updateSeat(seatId, { type: seatForm.type, status: seatForm.status });
      await onReload();
      setSeatDialog(null);
      setSeatForm({ type: 'STANDARD', status: 'ACTIVE' });
    } catch (err) {
      alert('Lỗi: ' + (err.message || String(err)));
    }
  };

  const handleDeleteSeat = async (seatId) => {
    try {
      await crud.removeSeat(seatId);
      await onReload();
      setSeatDialog(null);
    } catch (err) {
      alert('Lỗi: ' + (err.message || String(err)));
    }
  };

  // Gom ghế theo hàng, sắp xếp số ghế tăng dần
  const rows = [...new Set(seats.map((s) => s.rowName).filter(Boolean))].sort();
  const seatsByRow = rows.map((rn) => ({
    rowName: rn,
    seats: seats
      .filter((s) => s.rowName === rn)
      .sort((a, b) => (Number(a.seatNumber) || 0) - (Number(b.seatNumber) || 0)),
  }));

  const seatColor = (s) => {
    if (s.status === 'INACTIVE') return 'rgba(255,255,255,0.08)';
    return s.type === 'VIP' ? '#fbbf24' : '#475569';
  };

  return (
    <Box sx={{ bgcolor: 'rgba(0,0,0,0.4)', py: 3, px: { xs: 1.5, md: 4 } }}>
      {loading ? (
        <Typography variant="body2" color="text.secondary" align="center">Đang tải sơ đồ ghế…</Typography>
      ) : seats.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center">Chưa có ghế nào trong phòng này.</Typography>
      ) : (
        <>
          {/* Màn hình */}
          <Box sx={{ maxWidth: 640, mx: 'auto', mb: 3 }}>
            <Box
              sx={{
                height: 26,
                borderRadius: '50% 50% 6px 6px / 100% 100% 6px 6px',
                background: 'linear-gradient(180deg, rgba(229,9,20,0.55), rgba(229,9,20,0))',
                boxShadow: '0 0 30px 4px rgba(229,9,20,0.35)',
              }}
            />
            <Typography align="center" sx={{ mt: 0.5, fontSize: '0.72rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Màn hình
            </Typography>
          </Box>

          {/* Lưới ghế + cửa ra vào hai bên */}
          <Box sx={{ position: 'relative', width: 'fit-content', mx: 'auto', px: { xs: 0, sm: 7 } }}>
            <DoorMarker side="left" />
            <DoorMarker side="right" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
              {seatsByRow.map(({ rowName, seats: rowSeats }) => (
                <Box key={rowName} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 18, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {rowName}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.6 }}>
                    {rowSeats.map((s) => (
                      <Box
                        key={s.id}
                        title={`${s.rowName}${s.seatNumber} · ${s.type === 'VIP' ? 'VIP' : 'Thường'}${s.status === 'INACTIVE' ? ' · Đã khóa' : ''}`}
                        onClick={() => { setSeatForm({ type: s.type || 'STANDARD', status: s.status || 'ACTIVE' }); setSeatDialog(s.id); }}
                        sx={{
                          width: 26,
                          height: 24,
                          borderRadius: '6px 6px 3px 3px',
                          bgcolor: seatColor(s),
                          color: s.status === 'INACTIVE' ? 'rgba(255,255,255,0.25)' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: s.status === 'INACTIVE' ? '1px dashed rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.25)',
                          transition: 'transform 0.12s ease, filter 0.12s ease',
                          '&:hover': { transform: 'translateY(-2px)', filter: 'brightness(1.15)' },
                        }}
                      >
                        {s.seatNumber}
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ width: 18, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {rowName}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Chú thích */}
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
            {Object.values(SEAT_TYPE_META).map((m) => (
              <Stack key={m.label} direction="row" spacing={0.8} alignItems="center">
                <Box sx={{ width: 18, height: 16, borderRadius: '5px 5px 2px 2px', bgcolor: m.color }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>{m.label}</Typography>
              </Stack>
            ))}
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Box sx={{ width: 18, height: 16, borderRadius: '5px 5px 2px 2px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>Đã khóa</Typography>
            </Stack>
          </Stack>
        </>
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
          <Button color="error" onClick={() => handleDeleteSeat(seatDialog)}>Xóa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Showtimes ───────────────────────────────────────────────────────────────

export const ShowtimesSection = ({ crud, movies, theaters, rooms }) => {
  const [dialog, setDialog] = useState(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    movieId: '',
    cinemaRoomId: '',
    startTime: '',
    endTime: '',
    status: 0,
  });

  // Convert ISO string (stored as Vietnam UTC) → datetime-local for input display
  const toInputValue = (iso) => {
    if (!iso) return '';
    try {
      // Parse as Vietnam time (UTC+7) then show as local browser time
      const [datePart, timePart] = iso.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [time, rest] = timePart.split('.');
      const [hour, minute, second] = time.split(':').map(Number);
      // Create date in Vietnam timezone and get local equivalent
      const vnDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second || 0));
      const offset = vnDate.getTimezoneOffset();
      const localDate = new Date(vnDate.getTime() - offset * 60000);
      const pad = (n) => String(n).padStart(2, '0');
      return `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const save = async () => {
    try {
      setFormError('');
      if (dialog === 'add') {
        if (!form.movieId || !form.cinemaRoomId || !form.startTime || !form.endTime) {
          setFormError('Vui lòng chọn đầy đủ phim, phòng chiếu, giờ bắt đầu và giờ kết thúc.');
          return;
        }
        if (new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
          setFormError('Giờ kết thúc phải sau giờ bắt đầu.');
          return;
        }
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
      setFormError('');
      setForm({ movieId: '', cinemaRoomId: '', startTime: '', endTime: '', status: 0 });
    } catch (err) {
      setFormError(err.message || 'Không thể lưu suất chiếu.');
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
                      <IconButton size="small" onClick={() => { setForm({ ...s, status: s.status ?? 0, startTime: fromUTCToLocal(s.startTime), endTime: fromUTCToLocal(s.endTime) }); setDialog(s.id); }}>
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
        {dialog === 'add' ? [
            formError && <Alert key="showtime-error" severity="error">{formError}</Alert>,
            <TextField key="movie" select label="Phim" fullWidth value={form.movieId || ''} onChange={(e) => { setFormError(''); setForm({ ...form, movieId: String(e.target.value) }); }}>
              {movies.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.title}
                </MenuItem>
              ))}
            </TextField>,
            <TextField key="room" select label="Phòng chiếu" fullWidth value={form.cinemaRoomId || ''} onChange={(e) => setForm({ ...form, cinemaRoomId: String(e.target.value) })}>
              {activeRooms.map((r) => (
                <MenuItem key={r.id} value={r.cinemaRoomId || r.id}>
                  {r.name} — {getTheaterName(r.theaterId)}
                </MenuItem>
              ))}
            </TextField>,
            <TextField key="start" label="Giờ bắt đầu" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />,
            <TextField key="end" label="Giờ kết thúc" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />,
        ] : (
          <TextField select label="Trạng thái" fullWidth value={form.status ?? 0} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
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
    <DialogContent>
      <Stack spacing={2.5} sx={{ mt: 1 }}>{children}</Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose}>Hủy</Button>
      <Button variant="contained" onClick={onSave}>
        Lưu
      </Button>
    </DialogActions>
  </Dialog>
);
