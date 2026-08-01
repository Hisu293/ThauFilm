import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';

/**
 * Bọc trạng thái loading / error / empty cho một section.
 * Trả về children khi đã có dữ liệu.
 */
const SectionState = ({ loading, error, empty, emptyText = 'Không có dữ liệu', onRetry, children }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ my: 2 }}
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Thử lại
            </Button>
          ) : null
        }
      >
        {error}
      </Alert>
    );
  }

  if (empty) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <Typography>{emptyText}</Typography>
      </Box>
    );
  }

  return children;
};

export default SectionState;
