import { Button } from '@mui/material';

export const CustomButton = ({
  variant = 'primary',
  children,
  sx = {},
  ...props
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          fontWeight: 800,
        };
      case 'secondary':
        return {
          fontWeight: 700,
        };
      case 'outlined':
        return {
          variant: 'outlined',
          borderColor: 'divider',
          color: 'text.primary',
        };
      case 'text':
        return {
          variant: 'text',
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.main',
            bgcolor: 'rgba(251, 191, 36, 0.05)',
          },
        };
      default:
        return {};
    }
  };

  const currentStyles = getStyles();
  const muiVariant = variant === 'outlined' ? 'outlined' : variant === 'text' ? 'text' : 'contained';
  const color = variant === 'secondary' ? 'secondary' : 'primary';

  return (
    <Button
      variant={muiVariant}
      color={color}
      sx={{
        borderRadius: 3,
        minHeight: 44,
        px: 2.5,
        ...currentStyles,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
