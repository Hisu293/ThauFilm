import { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PageHeader from '../../components/ui/PageHeader';
import TicketInfoCard from '../../components/ui/TicketInfoCard';
import { ticketsDatabase } from '../../data/mockStaffData';

const CustomerSupport = () => {
  const [searchType, setSearchType] = useState('code'); // 'code', 'email', 'phone'
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    const results = Object.values(ticketsDatabase).filter(ticket => {
      const val = searchValue.toLowerCase();
      if (searchType === 'code') return ticket.code.toLowerCase().includes(val);
      if (searchType === 'email') return ticket.customerEmail.toLowerCase().includes(val);
      if (searchType === 'phone') return ticket.customerPhone.includes(val);
      return false;
    });

    setSearchResults(results);
    setHasSearched(true);
  };

  const breadcrumbs = [
    { label: 'Staff', path: '/staff/dashboard' },
    { label: 'Customer Support' }
  ];

  const getSearchIcon = () => {
    if (searchType === 'email') return <EmailIcon fontSize="small" />;
    if (searchType === 'phone') return <PhoneIcon fontSize="small" />;
    return <ConfirmationNumberIcon fontSize="small" />;
  };

  const getSearchPlaceholder = () => {
    if (searchType === 'email') return 'Enter email address...';
    if (searchType === 'phone') return 'Enter phone number...';
    return 'Enter ticket code...';
  };

  return (
    <Box>
      <PageHeader title="Customer Support Center" breadcrumbs={breadcrumbs} />

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Lookup Ticket
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Search by ticket code, customer email, or phone number to find booking details.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Button 
                  size="small" 
                  variant={searchType === 'code' ? 'contained' : 'outlined'}
                  onClick={() => { setSearchType('code'); setSearchValue(''); }}
                  disableElevation
                  sx={{ borderRadius: 2 }}
                >
                  Code
                </Button>
                <Button 
                  size="small" 
                  variant={searchType === 'email' ? 'contained' : 'outlined'}
                  onClick={() => { setSearchType('email'); setSearchValue(''); }}
                  disableElevation
                  sx={{ borderRadius: 2 }}
                >
                  Email
                </Button>
                <Button 
                  size="small" 
                  variant={searchType === 'phone' ? 'contained' : 'outlined'}
                  onClick={() => { setSearchType('phone'); setSearchValue(''); }}
                  disableElevation
                  sx={{ borderRadius: 2 }}
                >
                  Phone
                </Button>
              </Box>

              <form onSubmit={handleSearch}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={getSearchPlaceholder()}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {getSearchIcon()}
                      </InputAdornment>
                    ),
                  }}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  startIcon={<SearchIcon />}
                  disableElevation
                  sx={{ py: 1, borderRadius: 2 }}
                >
                  Search Records
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {hasSearched ? (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Search Results ({searchResults.length})
              </Typography>
              
              {searchResults.length > 0 ? (
                <Grid container spacing={3}>
                  {searchResults.map(ticket => (
                    <Grid item xs={12} key={ticket.code}>
                      <TicketInfoCard ticket={ticket} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box 
                  sx={{ 
                    p: 6, 
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    border: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography color="text.secondary">
                    No records found matching your search criteria.
                  </Typography>
                </Box>
              )}
            </Box>
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
                Use the search panel to find customer tickets.
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerSupport;
