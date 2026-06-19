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
import {
  FACILITY_STATUS_OPTIONS,
  ROOM_TYPE,
  ROOM_TYPE_OPTIONS,
  SEAT_TYPE,
  SEAT_TYPE_OPTIONS,
  SHOWTIME_STATUS_OPTIONS,
  enumLabel,
} from '../../constants/enums';

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };

export const TheatersSection = ({ crud }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', phoneNumber: '', status: 'ACTIVE' });
  const [search, setSearch] = useState('');

  const save = async () => {
    try {
      if (dialog === 'add') await crud.add(form);
      else await crud.update(dialog, form);
      setDialog(null);
      setForm({ name: '', address: '', city: '', phoneNumber: '', status: 'ACTIVE' });
    } catch (err) {
      console.error('Lỗi khi lưu rạp:', err);
    }
  };

  if (crud.loading) {
    return (
      <>
        <SectionHeader title={t('admin.theater', 'title')} subtitle={t('admin.theater', 'subtitle')} />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('common', 'loading')}</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title="Quản lý rạp" subtitle="Thêm · Sửa · Xóa rạp chiếu" onAction={() => { setForm({ name: '', address: '', city: '', phoneNumber: '', status: 'ACTIVE' }); setDialog('add'); }} actionLabel="Thêm rạp" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          {crud.error}
          <Button size="small" onClick={crud.reload} sx={{ ml: 2 }}>
            {t('admin.theater', 'reload')}
          </Button>
        </Box>
      </>
    );
  }

  const q = search.trim().toLowerCase();
  const filteredTheaters = q
    ? crud.list.filter((theater) =>
        [theater.name, theater.address, theater.city, theater.phoneNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
    : crud.list;

  return (
    <>
      <SectionHeader title="Quản lý rạp" subtitle="Thêm · Sửa · Xóa rạp chiếu" onAction={() => { setForm({ name: '', address: '', city: '', phoneNumber: '', status: 'ACTIVE' }); setDialog('add'); }} actionLabel="Thêm rạp" />

      <Box className="admin-panel admin-animate-in" sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={t('admin.theater', 'placeholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
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
          {t('admin.theater', 'count', 'vi', { filtered: filteredTheaters.length, total: crud.list.length })}
        </Typography>
      </Box>

      {crud.list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          {t('admin.theater', 'empty')}
        </Box>
      ) : filteredTheaters.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          {t('admin.theater', 'noResult', 'vi', { keyword: search })}
        </Box>
      ) : (
        <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>{t('admin.theater', 'theater')}</TableCell>
                  <TableCell sx={thSx}>{t('admin.theater', 'address')}</TableCell>
                  <TableCell sx={thSx}>{t('admin.theater', 'city')}</TableCell>
                  <TableCell sx={thSx}>{t('admin.theater', 'phone')}</TableCell>
                  <TableCell sx={thSx}>{t('admin.theater', 'status')}</TableCell>
                  <TableCell align="right" sx={thSx}>
                    {t('common', 'actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTheaters.map((theater) => (
                  <TableRow key={theater.id} className="admin-table-row">
                    <TableCell>
                      <Typography fontWeight={600}>{theater.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{theater.address || '—'}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{theater.city || '—'}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{theater.phoneNumber || '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={theater.status} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setForm(theater); setDialog(theater.id); }} title={t('admin.theater', 'edit')}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => crud.remove(theater.id)} sx={{ color: '#f87171' }} title="Xóa">
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
        <TextField select label="Trạng thái" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {FACILITY_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      </CrudDialog>
    </>
  );
};

export const RoomsSection = ({ crud, theaters, getTheaterName }) => {
  const [dialog, setDialog] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [form, setForm] = useState({ theaterId: '', name: '', type: 'STANDARD', rowsCount: 8, seatsPerRow: 10, status: 'ACTIVE' });

  // Chỉ hiện rạp đang hoạt động (status === 'ACTIVE')
  const activeTheaters = theaters.filter((t) => t.status === 'ACTIVE');
  const activeTheaterIds = new Set(activeTheaters.map((t) => t.id));
  // Chỉ hiện phòng thuộc rạp đang hoạt động
  const visibleRooms = crud.list.filter((room) => activeTheaterIds.has(room.theaterId));

  const save = async () => {
    try {
      if (dialog === 'add') {
        await crud.add({ theaterId: String(form.theaterId), name: form.name, type: form.type ?? 'STANDARD', rowsCount: form.rowsCount, seatsPerRow: form.seatsPerRow, status: form.status ?? 'ACTIVE' });
      } else {
        // PUT /api/admin/rooms/{roomId} — gửi name + type + status
        await crud.updateRoom(dialog, { name: form.name, type: form.type, status: form.status });
      }
      setDialog(null);
      setForm({ theaterId: activeTheaters[0]?.id || '', name: '', type: 'STANDARD', rowsCount: 8, seatsPerRow: 10, status: 'ACTIVE' });
    } catch (err) {
      console.error('Lỗi khi lưu phòng:', err);
    }
  };

  if (crud.loading) {
    return (
      <>
        <SectionHeader title="Phòng chiếu" subtitle="Thêm phòng và cấu hình ghế" onAction={() => { setForm({ theaterId: activeTheaters[0]?.id || '', name: '', type: 'STANDARD', rowsCount: 8, seatsPerRow: 10, status: 'ACTIVE' }); setDialog('add'); }} actionLabel="Thêm phòng" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Đang tải...</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title="Phòng chiếu" subtitle="Thêm phòng và cấu hình ghế" onAction={() => { setForm({ theaterId: activeTheaters[0]?.id || '', name: '', type: 'STANDARD', rowsCount: 8, seatsPerRow: 10, status: 'ACTIVE' }); setDialog('add'); }} actionLabel="Thêm phòng" />
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          {crud.error}
          <Button size="small" onClick={crud.reload} sx={{ ml: 2 }}>
            {t('admin.theater', 'reload')}
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Phòng chiếu" subtitle="Thêm phòng và cấu hình ghế" onAction={() => { setForm({ theaterId: activeTheaters[0]?.id || '', name: '', type: 'STANDARD', rowsCount: 8, seatsPerRow: 10, status: 'ACTIVE' }); setDialog('add'); }} actionLabel="Thêm phòng" />
      <Box className="admin-panel admin-animate-in" sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '40px' }} />
                <TableCell sx={thSx}>Phòng</TableCell>
                <TableCell sx={thSx}>Rạp</TableCell>
                <TableCell sx={thSx}>Loại phòng</TableCell>
                <TableCell sx={thSx}>Hàng ghế</TableCell>
                <TableCell sx={thSx}>Ghế/hàng</TableCell>
                <TableCell sx={thSx}>Tổng ghế</TableCell>
                <TableCell sx={thSx}>Trạng thái</TableCell>
                <TableCell align="right" sx={thSx} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                    Chưa có phòng nào. Nhấn "Thêm phòng" để tạo mới.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    crud={crud}
                    theaterName={getTheaterName(r.theaterId)}
                    expanded={expandedRoom === r.id}
                    onToggle={() => setExpandedRoom(expandedRoom === r.id ? null : r.id)}
                    onEdit={() => { setForm({ ...r, type: r.type ?? 'STANDARD', status: r.status ?? 'ACTIVE' }); setDialog(r.id); }}
                    onDelete={() => crud.remove(r.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <CrudDialog open={!!dialog} title={dialog === 'add' ? t('admin.room', 'add') : t('admin.room', 'edit')} onClose={() => setDialog(null)} onSave={save}>
        {dialog === 'add' ? (
          <>
            <TextField select label={t('admin.room', 'theater')} fullWidth value={String(form.theaterId || '')} onChange={(event) => setForm({ ...form, theaterId: String(event.target.value) })}>
              {activeTheaters.map((theater) => (
                <MenuItem key={theater.id} value={String(theater.id)}>
                  {theater.name}
                </MenuItem>
              ))}
            </TextField>,
            <TextField key="name" label="Tên phòng" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />,
            <TextField key="type" select label="Loại phòng" fullWidth value={form.type || 'STANDARD'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>,
            <Stack key="dims" direction="row" spacing={2}>
              <TextField label="Số hàng ghế" type="number" value={form.rowsCount} onChange={(e) => setForm({ ...form, rowsCount: Number(e.target.value) })} sx={{ flex: 1 }} />
              <TextField label="Ghế mỗi hàng" type="number" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: Number(e.target.value) })} sx={{ flex: 1 }} />
            </Stack>,
        ] : [
            <TextField key="name" label="Tên phòng" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />,
            <TextField key="type" select label="Loại phòng" fullWidth value={form.type || 'STANDARD'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>,
            <TextField key="status" select label="Trạng thái" fullWidth value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {FACILITY_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>,
        ]}
      </CrudDialog>
    </>
  );
};

const RoomRow = ({ room, crud, theaterName, expanded, onToggle, onEdit, onDelete }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSeats = async () => {
    setLoading(true);
    console.groupCollapsed(`%c[ADMIN][loadSeats] GET /api/admin/rooms/${room.id}/seats`, 'color:#A78BFA;font-weight:bold');
    try {
      const data = await crud.getSeatsByRoom(room.id);
      console.log('%c✓ API trả về:', 'color:#22C55E', Array.isArray(data) ? `${data.length} ghế` : data, data);
      if (Array.isArray(data) && data.length > 0) {
        console.table(data.map((s) => ({ id: s.id ?? s.seatId, rowName: s.rowName, seatNumber: s.seatNumber, type: s.type, status: s.status })));
      } else {
        console.warn('⚠ Phòng này chưa có ghế hoặc trả về sai shape.');
      }
      setSeats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('%c✗ [ADMIN] Lỗi khi tải ghế:', 'color:#EF4444;font-weight:bold', {
        message: err?.message,
        status: err?.response?.status,
        raw: err?.response?.data,
      });
      setSeats([]);
    } finally {
      console.groupEnd();
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // Tính số liệu thực tế từ danh sách ghế (ưu tiên), fallback về dữ liệu phòng
  const rowNames = [...new Set(seats.map((seat) => seat.rowName).filter(Boolean))];
  const rowsCount = rowNames.length || room.rowsCount || 0;
  const seatsPerRow = seats.length
    ? Math.max(...rowNames.map((rowName) => seats.filter((seat) => seat.rowName === rowName).length))
    : room.seatsPerRow || 0;
  const totalSeats = seats.length || rowsCount * seatsPerRow;

  const numCell = (value) => (loading ? '…' : value || 0);

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
        <TableCell>
          <Box component="span" sx={{ px: 1.2, py: 0.4, borderRadius: 1, bgcolor: `${ROOM_TYPE[room.type]?.color || ROOM_TYPE.STANDARD.color}26`, color: ROOM_TYPE[room.type]?.color || ROOM_TYPE.STANDARD.color, fontWeight: 700, fontSize: '0.78rem' }}>
            {enumLabel(ROOM_TYPE, room.type || 'STANDARD')}
          </Box>
        </TableCell>
        <TableCell>{numCell(rowsCount)}</TableCell>
        <TableCell>{numCell(seatsPerRow)}</TableCell>
        <TableCell>
          <Box component="span" sx={{ px: 1.2, py: 0.4, borderRadius: 1, bgcolor: 'rgba(99,102,241,0.18)', color: '#a5b4fc', fontWeight: 700, fontSize: '0.85rem' }}>
            {numCell(totalSeats)}
          </Box>
        </TableCell>
        <TableCell>
          <StatusChip status={room.status || 'ACTIVE'} />
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
          <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
            <SeatMapInline room={room} crud={crud} seats={seats} loading={loading} onReload={loadSeats} />
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};

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

// Màu hiển thị ghế trên sơ đồ admin (lấy theo loại ghế chuẩn của backend)
const SEAT_TILE_COLOR = {
  STANDARD: '#475569',
  VIP: '#8b5cf6',
  COUPLE: '#ec4899',
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
    } catch (error) {
      alert('Lỗi: ' + (error.message || String(error)));
    }
  };

  const handleDeleteSeat = async (seatId) => {
    try {
      await crud.removeSeat(seatId);
      await onReload();
      setSeatDialog(null);
    } catch (error) {
      alert('Lỗi: ' + (error.message || String(error)));
    }
  };

  const rows = [...new Set(seats.map((seat) => seat.rowName).filter(Boolean))].sort();
  const seatsByRow = rows.map((rowName) => ({
    rowName,
    seats: seats
      .filter((seat) => seat.rowName === rowName)
      .sort((a, b) => (Number(a.seatNumber) || 0) - (Number(b.seatNumber) || 0)),
  }));

  // Ghế không hoạt động (INACTIVE / MAINTENANCE) coi như đang bị khóa
  const isSeatLocked = (s) => s.status === 'INACTIVE' || s.status === 'MAINTENANCE';

  const seatColor = (s) => {
    if (isSeatLocked(s)) return 'rgba(255,255,255,0.08)';
    return SEAT_TILE_COLOR[s.type] || SEAT_TILE_COLOR.STANDARD;
  };

  const seatTitle = (s) => {
    const typeLabel = enumLabel(SEAT_TYPE, s.type || 'STANDARD');
    let statusSuffix = '';
    if (s.status === 'INACTIVE') statusSuffix = ' · Ngừng hoạt động';
    else if (s.status === 'MAINTENANCE') statusSuffix = ' · Bảo trì';
    return `${s.rowName}${s.seatNumber} · ${typeLabel}${statusSuffix}`;
  };

  return (
    <Box sx={{ bgcolor: 'rgba(0,0,0,0.4)', py: 3, px: { xs: 1.5, md: 4 } }}>
      {loading ? (
        <Typography variant="body2" color="text.secondary" align="center">
          {t('admin.seat', 'seatLoading')}
        </Typography>
      ) : seats.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center">
          {t('admin.seat', 'noSeats')}
        </Typography>
      ) : (
        <>
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
              {t('admin.seat', 'screen')}
            </Typography>
          </Box>

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
                    {rowSeats.map((seat) => (
                      <Box
                        key={s.id}
                        title={seatTitle(s)}
                        onClick={() => { setSeatForm({ type: s.type || 'STANDARD', status: s.status || 'ACTIVE' }); setSeatDialog(s.id); }}
                        sx={{
                          width: 26,
                          height: 24,
                          borderRadius: '6px 6px 3px 3px',
                          bgcolor: seatColor(s),
                          color: isSeatLocked(s) ? 'rgba(255,255,255,0.25)' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSeatLocked(s) ? '1px dashed rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.25)',
                          transition: 'transform 0.12s ease, filter 0.12s ease',
                          '&:hover': { transform: 'translateY(-2px)', filter: 'brightness(1.15)' },
                        }}
                      >
                        {seat.seatNumber}
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

          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
            {SEAT_TYPE_OPTIONS.map((m) => (
              <Stack key={m.value} direction="row" spacing={0.8} alignItems="center">
                <Box sx={{ width: 18, height: 16, borderRadius: '5px 5px 2px 2px', bgcolor: SEAT_TILE_COLOR[m.value] }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>{m.label}</Typography>
              </Stack>
            ))}
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Box sx={{ width: 18, height: 16, borderRadius: '5px 5px 2px 2px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>Ngừng / Bảo trì</Typography>
            </Stack>
          </Stack>
        </>
      )}

      <Dialog open={!!seatDialog} onClose={() => setSeatDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('admin.seat', 'edit', 'vi', { _default: 'Sửa ghế' })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Loại ghế" fullWidth value={seatForm.type} onChange={(e) => setSeatForm({ ...seatForm, type: e.target.value })}>
              {SEAT_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Trạng thái" fullWidth value={seatForm.status} onChange={(e) => setSeatForm({ ...seatForm, status: e.target.value })}>
              {FACILITY_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSeatDialog(null)}>{t('common', 'cancel')}</Button>
          <Button variant="contained" onClick={() => handleUpdateSeat(seatDialog)}>
            {t('common', 'save')}
          </Button>
          <Button color="error" onClick={() => handleDeleteSeat(seatDialog)}>
            {t('common', 'cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const ShowtimesSection = ({ crud, movies, theaters, rooms }) => {
  const [dialog, setDialog] = useState(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    movieId: '',
    cinemaRoomId: '',
    startTime: '',
    endTime: '',
    status: 'SCHEDULED',
  });

  const toInputValue = (iso) => {
    if (!iso) return '';
    try {
      const [datePart, timePart] = iso.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [time] = timePart.split('.');
      const [hour, minute, second] = time.split(':').map(Number);
      const vnDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second || 0));
      const offset = vnDate.getTimezoneOffset();
      const localDate = new Date(vnDate.getTime() - offset * 60000);
      const pad = (number) => String(number).padStart(2, '0');
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
          setFormError(t('admin.showtime', 'errorRequired'));
          return;
        }
        if (new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
          setFormError(t('admin.showtime', 'errorEnd'));
          return;
        }
        await crud.add({
          movieId: String(form.movieId),
          cinemaRoomId: String(form.cinemaRoomId),
          startTime: form.startTime,
          endTime: form.endTime,
          status: 'SCHEDULED',
        });
      } else {
        await crud.updateShowtime(dialog, { status: form.status });
      }
      setDialog(null);
      setFormError('');
      setForm({ movieId: '', cinemaRoomId: '', startTime: '', endTime: '', status: 'SCHEDULED' });
    } catch (err) {
      setFormError(err.message || 'Không thể lưu suất chiếu.');
      console.error('Lỗi khi lưu suất chiếu:', err);
    }
  };

  // Chỉ hiện rạp đang hoạt động (status === 'ACTIVE')
  const activeTheaters = theaters.filter((t) => t.status === 'ACTIVE');
  const activeTheaterIds = new Set(activeTheaters.map((t) => t.id));
  // Chỉ hiện phòng thuộc rạp đang hoạt động
  const activeRooms = rooms.filter((r) => activeTheaterIds.has(r.theaterId));

  const getMovieTitle = (id) => movies.find((movie) => movie.id === id)?.title || '—';
  const getTheaterName = (id) => activeTheaters.find((theater) => theater.id === id)?.name || '—';
  const getCinemaRoomName = (id) => activeRooms.find((room) => room.id === id || room.cinemaRoomId === id)?.name || '—';

  if (crud.loading) {
    return (
      <>
        <SectionHeader title={t('admin.showtime', 'title')} subtitle={t('admin.showtime', 'subtitle')} onAction={() => setDialog('add')} actionLabel={t('admin.showtime', 'add')} />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('common', 'loading')}</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title={t('admin.showtime', 'title')} subtitle={t('admin.showtime', 'subtitle')} onAction={() => setDialog('add')} actionLabel={t('admin.showtime', 'add')} />
        <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
          {crud.error}
          <Button size="small" onClick={crud.reload} sx={{ ml: 2 }}>
            {t('admin.theater', 'reload')}
          </Button>
        </Box>
      </>
    );
  }

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const showtimeStatus = (status) => {
    const map = {
      0: 'SCHEDULED',
      1: 'RUNNING',
      2: 'COMPLETED',
      3: 'CANCELLED',
      4: 'OPEN',
    };
    return map[status] ?? String(status ?? 'SCHEDULED');
  };

  return (
    <>
      <SectionHeader title={t('admin.showtime', 'title')} subtitle={t('admin.showtime', 'subtitle')} onAction={() => setDialog('add')} actionLabel={t('admin.showtime', 'add')} />
      <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>{t('admin.showtime', 'movie')}</TableCell>
                <TableCell sx={thSx}>{t('admin.showtime', 'room')}</TableCell>
                <TableCell sx={thSx}>{t('admin.showtime', 'start')}</TableCell>
                <TableCell sx={thSx}>{t('admin.showtime', 'end')}</TableCell>
                <TableCell sx={thSx}>{t('admin.showtime', 'status')}</TableCell>
                <TableCell align="right" sx={thSx}>
                  {t('common', 'actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crud.list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                    {t('admin.showtime', 'empty')}
                  </TableCell>
                </TableRow>
              ) : (
              crud.list.map((s) => {
                // Backend trả enum chuỗi; vẫn ánh xạ số cũ để tương thích dữ liệu cũ.
                const legacyMap = { 0: 'SCHEDULED', 1: 'OPEN', 2: 'COMPLETED', 3: 'CANCELLED' };
                const statusStr = typeof s.status === 'number' ? legacyMap[s.status] ?? 'SCHEDULED' : (s.status ?? 'SCHEDULED');
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
                      <IconButton size="small" onClick={() => { setForm({ ...s, status: statusStr, startTime: fromUTCToLocal(s.startTime), endTime: fromUTCToLocal(s.endTime) }); setDialog(s.id); }}>
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
      <CrudDialog open={!!dialog} title={dialog === 'add' ? t('admin.showtime', 'add') : t('admin.showtime', 'edit')} onClose={() => setDialog(null)} onSave={save}>
        {dialog === 'add' ? (
          <>
            {formError && (
              <Alert key="showtime-error" severity="error">
                {formError}
              </Alert>
            )}
            <TextField select label={t('admin.showtime', 'movie')} fullWidth value={form.movieId || ''} onChange={(event) => { setFormError(''); setForm({ ...form, movieId: String(event.target.value) }); }}>
              {movies.map((movie) => (
                <MenuItem key={movie.id} value={movie.id}>
                  {movie.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label={t('admin.showtime', 'room')} fullWidth value={form.cinemaRoomId || ''} onChange={(event) => setForm({ ...form, cinemaRoomId: String(event.target.value) })}>
              {activeRooms.map((room) => (
                <MenuItem key={room.id} value={room.cinemaRoomId || room.id}>
                  {room.name} — {getTheaterName(room.theaterId)}
                </MenuItem>
              ))}
            </TextField>,
            <TextField key="start" label="Giờ bắt đầu" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />,
            <TextField key="end" label="Giờ kết thúc" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />,
        ] : (
          <TextField select label="Trạng thái" fullWidth value={form.status ?? 'SCHEDULED'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {SHOWTIME_STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
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
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {children}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose}>{t('common', 'cancel')}</Button>
      <Button variant="contained" onClick={onSave}>
        {t('common', 'save')}
      </Button>
    </DialogActions>
  </Dialog>
);
