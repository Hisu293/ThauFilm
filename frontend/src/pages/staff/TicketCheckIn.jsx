import { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Snackbar, Alert, Grid, alpha, useTheme } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import TicketInfoCard from '../../components/ui/TicketInfoCard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ticketsDatabase } from '../../data/mockStaffData';

const TicketCheckIn = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  
  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'markUsed' or 'reject'
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSearch = (query) => {
    if (!query) return;
    
    // Convert to upper case to match mock DB keys like "TCK-2001"
    const formattedQuery = query.toUpperCase();
    const ticket = ticketsDatabase[formattedQuery] || Object.values(ticketsDatabase).find(t => t.code.includes(formattedQuery));
    
    if (ticket) {
      setCurrentTicket({ ...ticket }); // Clone so we can mutate status locally
    } else {
      setCurrentTicket(null);
      setSnackbar({ open: true, message: 'Ticket not found.', severity: 'error' });
    }
  };

  const handleActionClick = (action) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirmAction = () => {
    if (!currentTicket) return;
    
    let newStatus = currentTicket.status;
    let message = '';
    
    if (confirmAction === 'markUsed') {
      newStatus = 'Checked In';
      message = 'Ticket marked as used successfully.';
    } else if (confirmAction === 'reject') {
      newStatus = 'Invalid';
      message = 'Ticket has been rejected.';
    }

    setCurrentTicket({ ...currentTicket, status: newStatus });
    setSnackbar({ open: true, message, severity: 'success' });
    setConfirmOpen(false);
  };

  const breadcrumbs = [
    { label: 'Staff', path: '/staff/dashboard' },
    { label: 'Ticket Check-in' }
  ];

  return (
    <Box>
      <PageHeader title="Ticket Check-in" breadcrumbs={breadcrumbs} />
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Search Ticket
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter ticket code (e.g. TCK-2001, TCK-2002)
              </Typography>
              
              <SearchBar 
                placeholder="Enter Ticket Code" 
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                actionButton={
                  <Button variant="contained" onClick={() => handleSearch(searchQuery)} disableElevation sx={{ height: '100%', borderRadius: 2 }}>
                    Search
                  </Button>
                }
              />
              
              {/* Mock QR Scanner Area */}
              <Box 
                sx={{ 
                  mt: 4, 
                  height: 200, 
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1)
                  }
                }}
                onClick={() => {
                  setSearchQuery('TCK-2001');
                  handleSearch('TCK-2001');
                }}
              >
                <QrCodeScannerIcon sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                  Click to Scan QR Code
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (Mocks scanning TCK-2001)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={7}>
          {currentTicket ? (
            <TicketInfoCard 
              ticket={currentTicket} 
              onMarkUsed={() => handleActionClick('markUsed')}
              onReject={() => handleActionClick('reject')}
            />
          ) : (
            <Box 
              sx={{ 
                height: '100%', 
                minHeight: 400,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px dashed',
                borderColor: 'divider'
              }}
            >
              <Typography color="text.secondary">
                Search for a ticket or scan a QR code to view details.
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'markUsed' ? "Mark Ticket as Used?" : "Reject Ticket?"}
        content={
          confirmAction === 'markUsed' 
            ? "Are you sure you want to mark this ticket as used? This action cannot be undone."
            : "Are you sure you want to reject this ticket?"
        }
        confirmText={confirmAction === 'markUsed' ? "Mark as Used" : "Reject"}
        confirmColor={confirmAction === 'markUsed' ? "primary" : "error"}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }} elevation={6} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TicketCheckIn;
