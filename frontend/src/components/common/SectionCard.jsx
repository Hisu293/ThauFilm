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
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 12px 40px -10px rgba(0, 0, 0, 0.7)',
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
            sx={{ px: 3, py: 2 }}
          />
          {divider && <Divider />}
        </>
      )}
      <CardContent sx={{ px: 3, py: 3, '&:last-child': { pb: 3 }, ...contentSx }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default SectionCard;
