import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export const EmptyState = ({
  icon: IconComponent = InboxIcon,
  title = 'Không có dữ liệu',
  description = 'Hiện tại danh sách này đang trống, vui lòng thử lại sau.',
  actionText,
  onAction,
  sx = {},
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 6,
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: '1px dashed rgba(148, 163, 184, 0.2)',
        minHeight: 300,
        ...sx,
      }}
    >
      <IconComponent
        sx={{
          fontSize: 60,
          color: 'text.secondary',
          mb: 2,
          opacity: 0.3,
        }}
      />
      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 350 }}>
        {description}
      </Typography>
      {actionText && onAction && (
        <Button
          variant="contained"
          color="primary"
          onClick={onAction}
          sx={{
            fontWeight: 700,
            px: 4,
          }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
