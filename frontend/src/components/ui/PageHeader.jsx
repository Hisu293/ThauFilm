import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const PageHeader = ({ title, breadcrumbs, action }) => {
  return (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1, color: 'text.primary' }}>
          {title}
        </Typography>
        {breadcrumbs && (
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return isLast ? (
                <Typography key={index} color="text.primary" fontWeight="medium">
                  {crumb.label}
                </Typography>
              ) : (
                <MuiLink
                  key={index}
                  component={Link}
                  to={crumb.path}
                  underline="hover"
                  color="text.secondary"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {crumb.label}
                </MuiLink>
              );
            })}
          </Breadcrumbs>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
};

export default PageHeader;
