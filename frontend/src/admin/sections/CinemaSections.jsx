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
import { t } from '../../i18n/labels';

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
        <SectionHeader title={t('admin.theater', 'title')} subtitle={t('admin.theater', 'subtitle')} />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('common', 'loading')}</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader
          title={t('admin.theater', 'title')}
          subtitle={t('admin.theater', 'subtitle')}
          onAction={() => {
            setForm({ name: '', address: '', city: '', phoneNumber: '', status: 1 });
            setDialog('add');
          }}
          actionLabel={t('admin.theater', 'add')}
        />
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
      <SectionHeader
        title={t('admin.theater', 'title')}
        subtitle={t('admin.theater', 'subtitle')}
        onAction={() => {
          setForm({ name: '', address: '', city: '', phoneNumber: '', status: 1 });
          setDialog('add');
        }}
        actionLabel={t('admin.theater', 'add')}
      />

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
      <CrudDialog open={!!dialog} title={dialog === 'add' ? t('admin.theater', 'add') : t('admin.theater', 'edit')} onClose={() => setDialog(null)} onSave={save}>
        <TextField label={t('admin.theater', 'theater')} fullWidth value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label={t('admin.theater', 'address')} fullWidth value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        <TextField label={t('admin.theater', 'city')} fullWidth value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <TextField label={t('admin.theater', 'phone')} fullWidth value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />
        <TextField select label={t('admin.theater', 'status')} fullWidth value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}>
          <MenuItem value={1}>{t('statuses', 'theater.ACTIVE')}</MenuItem>
          <MenuItem value={0}>{t('statuses', 'theater.MAINTENANCE')}</MenuItem>
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
  const activeTheaters = theaters.filter((theater) => theater.status === 1);
  const activeTheaterIds = new Set(activeTheaters.map((theater) => theater.id));
  // Chỉ hiện phòng thuộc rạp đang hoạt động
  const visibleRooms = crud.list.filter((room) => activeTheaterIds.has(room.theaterId));

  const save = async () => {
    try {
      if (dialog === 'add') {
        await crud.add({
          theaterId: String(form.theaterId),
          name: form.name,
          rowsCount: form.rowsCount,
          seatsPerRow: form.seatsPerRow,
          status: form.status ?? 1,
        });
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
        <SectionHeader title={t('admin.room', 'title')} subtitle={t('admin.room', 'subtitle')} />
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('common', 'loading')}</Box>
      </>
    );
  }

  if (crud.error) {
    return (
      <>
        <SectionHeader title={t('admin.room', 'title')} subtitle={t('admin.room', 'subtitle')} />
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
      <SectionHeader
        title={t('admin.room', 'title')}
        subtitle={t('admin.room', 'subtitle')}
        onAction={() => {
          setForm({ theaterId: activeTheaters[0]?.id || '', name: '', rowsCount: 8, seatsPerRow: 10, status: 1 });
          setDialog('add');
        }}
        actionLabel={t('admin.room', 'add')}
      />
      <Box className="admin-panel admin-animate-in" sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '40px' }} />
                <TableCell sx={thSx}>{t('admin.room', 'room')}</TableCell>
                <TableCell sx={thSx}>{t('admin.room', 'theater')}</TableCell>
                <TableCell sx={thSx}>{t('admin.room', 'rows')}</TableCell>
                <TableCell sx={thSx}>{t('admin.room', 'seatsPerRow')}</TableCell>
                <TableCell sx={thSx}>{t('admin.room', 'totalSeats')}</TableCell>
                <TableCell align="right" sx={thSx}>
                  {t('common', 'actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                    {t('admin.room', 'empty')}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    crud={crud}
                    theaterName={getTheaterName(room.theaterId)}
                    expanded={expandedRoom === room.id}
                    onToggle={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                    onEdit={() => {
                      setForm({ ...room, status: room.status ?? 1 });
                      setDialog(room.id);
                    }}
                    onDelete={() => crud.remove(room.id)}
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
            </TextField>
            <TextField label={t('admin.room', 'room')} fullWidth value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField label={t('admin.room', 'rows')} type="number" value={form.rowsCount} onChange={(event) => setForm({ ...form, rowsCount: Number(event.target.value) })} sx={{ flex: 1 }} />
              <TextField label={t('admin.room', 'seatsPerRow')} type="number" value={form.seatsPerRow} onChange={(event) => setForm({ ...form, seatsPerRow: Number(event.target.value) })} sx={{ flex: 1 }} />
            </Stack>
          </>
        ) : (
          <>
            <TextField label={t('admin.room', 'room')} fullWidth value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <TextField select label={t('admin.room', 'status')} fullWidth value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}>
              <MenuItem value={1}>{t('statuses', 'roomStatus.ACTIVE')}</MenuItem>
              <MenuItem value={0}>{t('statuses', 'roomStatus.MAINTENANCE')}</MenuItem>
            </TextField>
          </>
        )}
      </CrudDialog>
    </>
  );
};

const RoomRow = ({ room, crud, theaterName, expanded, onToggle, onEdit, onDelete }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSeats = async () => {
    setLoading(true);
    try {
      const data = await crud.getSeatsByRoom(room.id);
      setSeats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải ghế:', error);
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

const SEAT_TYPE_META = {
  STANDARD: { labelKey: 'admin.seat.standard', color: '#475569' },
  VIP: { labelKey: 'admin.seat.vip', color: '#fbbf24' },
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

  const seatColor = (seat) => {
    if (seat.status === 'INACTIVE') return 'rgba(255,255,255,0.08)';
    return seat.type === 'VIP' ? '#fbbf24' : '#475569';
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
                        key={seat.id}
                        title={`${seat.rowName}${seat.seatNumber} · ${t('statuses', `seatType.${seat.type}`)}${seat.status === 'INACTIVE' ? ` · ${t('statuses', 'seatStatus.MAINTENANCE')}` : ''}`}
                        onClick={() => {
                          setSeatForm({ type: seat.type || 'STANDARD', status: seat.status || 'ACTIVE' });
                          setSeatDialog(seat.id);
                        }}
                        sx={{
                          width: 26,
                          height: 24,
                          borderRadius: '6px 6px 3px 3px',
                          bgcolor: seatColor(seat),
                          color: seat.status === 'INACTIVE' ? 'rgba(255,255,255,0.25)' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: seat.status === 'INACTIVE' ? '1px dashed rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.25)',
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
            {Object.values(SEAT_TYPE_META).map((meta) => (
              <Stack key={meta.labelKey} direction="row" spacing={0.8} alignItems="center">
                <Box sx={{ width: 18, height: 16, borderRadius: '5px 5px 2px 2px', bgcolor: meta.color }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                  {t('statuses', meta.labelKey)}
                </Typography>
              </Stack>
            ))}
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Box sx={{ width: 18, height: 16, borderRadius: '5px 5px 2px 2px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                {t('admin.seat', 'legendInactive')}
              </Typography>
            </Stack>
          </Stack>
        </>
      )}

      <Dialog open={!!seatDialog} onClose={() => setSeatDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('admin.seat', 'edit', 'vi', { _default: 'Sửa ghế' })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label={t('admin.seat', 'type')} fullWidth value={seatForm.type} onChange={(event) => setSeatForm({ ...seatForm, type: event.target.value })}>
              <MenuItem value="STANDARD">{t('statuses', 'seatType.STANDARD')}</MenuItem>
              <MenuItem value="VIP">{t('statuses', 'seatType.VIP')}</MenuItem>
            </TextField>
            <TextField select label={t('admin.seat', 'status')} fullWidth value={seatForm.status} onChange={(event) => setSeatForm({ ...seatForm, status: event.target.value })}>
              <MenuItem value="ACTIVE">{t('statuses', 'seatStatus.ACTIVE')}</MenuItem>
              <MenuItem value="INACTIVE">{t('statuses', 'seatStatus.MAINTENANCE')}</MenuItem>
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
    status: 0,
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
          status: 0,
        });
      } else {
        await crud.updateShowtime(dialog, { status: form.status });
      }
      setDialog(null);
      setFormError('');
      setForm({ movieId: '', cinemaRoomId: '', startTime: '', endTime: '', status: 0 });
    } catch (error) {
      setFormError(error.message || t('admin.showtime', 'errorSave'));
      console.error('Lỗi khi lưu suất chiếu:', error);
    }
  };

  // Chỉ hiện rạp đang hoạt động (status === 1)
  const activeTheaters = theaters.filter((theater) => theater.status === 1);
  const activeTheaterIds = new Set(activeTheaters.map((theater) => theater.id));
  const activeRooms = rooms.filter((room) => activeTheaterIds.has(room.theaterId));

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
                crud.list.map((showtime) => {
                  const statusString = showtimeStatus(showtime.status);
                  return (
                    <TableRow key={showtime.id} className="admin-table-row">
                      <TableCell>
                        <Typography fontWeight={600}>{showtime.movie?.title || getMovieTitle(showtime.movieId)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{showtime.room?.name || getCinemaRoomName(showtime.cinemaRoomId || showtime.roomId)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getTheaterName(showtime.theaterId || showtime.room?.theaterId)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDateTime(showtime.startTime)}</TableCell>
                      <TableCell>{formatDateTime(showtime.endTime)}</TableCell>
                      <TableCell>
                        <StatusChip status={statusString} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setForm({
                              ...showtime,
                              status: showtime.status ?? 0,
                              startTime: fromUTCToLocal(showtime.startTime),
                              endTime: fromUTCToLocal(showtime.endTime),
                            });
                            setDialog(showtime.id);
                          }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => crud.remove(showtime.id)} sx={{ color: '#f87171' }}>
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
            </TextField>
            <TextField label={t('admin.showtime', 'start')} type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.startTime || ''} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            <TextField label={t('admin.showtime', 'end')} type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.endTime || ''} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </>
        ) : (
          <TextField select label={t('admin.showtime', 'status')} fullWidth value={form.status ?? 0} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}>
            <MenuItem value={0}>{t('statuses', 'showtime.SCHEDULED')}</MenuItem>
            <MenuItem value={1}>{t('statuses', 'showtime.RUNNING')}</MenuItem>
            <MenuItem value={2}>{t('statuses', 'showtime.COMPLETED')}</MenuItem>
            <MenuItem value={3}>{t('statuses', 'showtime.CANCELLED')}</MenuItem>
            <MenuItem value={4}>{t('statuses', 'showtime.OPEN')}</MenuItem>
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
