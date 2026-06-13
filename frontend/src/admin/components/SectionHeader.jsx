import { Box, Button, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

const SectionHeader = ({ title, subtitle, actionLabel = 'Thêm mới', onAction, actionIcon: ActionIcon = AddRoundedIcon, extra }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    justifyContent="space-between"
    alignItems={{ xs: 'flex-start', sm: 'center' }}
    spacing={2}
    sx={{ mb: 3 }}
    className="admin-animate-in"
  >
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    <Stack direction="row" spacing={1} alignItems="center">
      {extra}
      {onAction && (
        <Button
          variant="contained"
          startIcon={<ActionIcon />}
          onClick={onAction}
          sx={{ fontWeight: 700, px: 2.5, boxShadow: '0 8px 24px rgba(229,9,20,0.35)' }}
        >
          {actionLabel}
        </Button>
      )}
    </Stack>
  </Stack>
);

export default SectionHeader;
