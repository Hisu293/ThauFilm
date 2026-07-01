import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from '@mui/material';
import CustomButton from './CustomButton';

export const ConfirmationDialog = ({
  open = false,
  title = 'Xác nhận',
  description = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: 4,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText color="text.secondary" sx={{ fontSize: '0.95rem' }}>
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading} sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {cancelText}
        </Button>
        <CustomButton variant="primary" onClick={onConfirm} size="small" loading={loading} disabled={loading}>
          {confirmText}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
