import { Card, CardContent, Typography, Grid, Divider, Box, Button } from '@mui/material';
import StatusChip from './StatusChip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

const InfoRow = ({ label, value }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
      {label}
    </Typography>
    <Typography variant="body1" fontWeight="medium">
      {value}
    </Typography>
  </Box>
);

const TicketInfoCard = ({ ticket, onValidate, onMarkUsed, onReject }) => {
  if (!ticket) return null;

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 0 }}>
        {/* Header section with Status */}
        <Box sx={{ p: 3, bgcolor: 'background.default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Ticket #{ticket.code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Booked on {ticket.bookingDate}
            </Typography>
          </Box>
          <StatusChip status={ticket.status} />
        </Box>
        <Divider />
        
        {/* Content Section */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                Customer Info
              </Typography>
              <InfoRow label="Name" value={ticket.customerName} />
              <InfoRow label="Email" value={ticket.customerEmail} />
              <InfoRow label="Phone" value={ticket.customerPhone} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                Movie Info
              </Typography>
              <InfoRow label="Movie" value={ticket.movieName} />
              <InfoRow label="Showtime" value={`${ticket.showDate} | ${ticket.showTime}`} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <InfoRow label="Theater" value={ticket.theaterRoom} />
                </Grid>
                <Grid item xs={6}>
                  <InfoRow label="Seat" value={ticket.seatNumber} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>

        {/* Action Section based on status */}
        {(onValidate || onMarkUsed || onReject) && ticket.status === 'Valid' && (
          <>
            <Divider />
            <Box sx={{ p: 3, display: 'flex', gap: 2, justifyContent: 'flex-end', bgcolor: 'background.default' }}>
               {onReject && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<CancelOutlinedIcon />}
                  onClick={onReject}
                  sx={{ borderRadius: 2 }}
                >
                  Reject
                </Button>
              )}
              {onMarkUsed && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<CheckCircleOutlineIcon />}
                  disableElevation
                  onClick={onMarkUsed}
                  sx={{ borderRadius: 2 }}
                >
                  Mark as Used
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketInfoCard;
