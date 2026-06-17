import { Box, Button, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import { t } from '../../i18n/labels';

export const EmptyState = ({
  icon: IconComponent = InboxIcon,
  title = t('common', 'empty'),
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
        p: { xs: 4, md: 6 },
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: '1px dashed',
        borderColor: 'divider',
        minHeight: 300,
        boxShadow: '0 18px 45px rgba(0, 0, 0, 0.18)',
        ...sx,
      }}
    >
      <IconComponent
        sx={{
          fontSize: 60,
          color: 'primary.main',
          mb: 2,
          opacity: 0.6,
        }}
      />
      <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 380 }}>
        {description}
      </Typography>
      {actionText && onAction && (
        <Button variant="contained" color="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
