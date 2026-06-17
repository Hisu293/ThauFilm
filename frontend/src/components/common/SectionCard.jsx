import { Card, CardContent, CardHeader, Divider } from '@mui/material';

export const SectionCard = ({
  title,
  action,
  children,
  sx = {},
  contentSx = {},
  divider = false,
  ...props
}) => {
  return (
    <Card
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'rgba(251, 191, 36, 0.22)',
          boxShadow: '0 18px 45px rgba(0, 0, 0, 0.32)',
        },
        ...sx,
      }}
      {...props}
    >
      {(title || action) && (
        <>
          <CardHeader
            title={title}
            action={action}
            titleTypographyProps={{
              variant: 'h6',
              fontWeight: 700,
              color: 'text.primary',
            }}
            sx={{ px: { xs: 2.25, sm: 3 }, py: 2.25 }}
          />
          {divider && <Divider />}
        </>
      )}
      <CardContent sx={{ px: { xs: 2.25, sm: 3 }, py: 3, '&:last-child': { pb: 3 }, ...contentSx }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default SectionCard;
