import React, { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Collapse, Box, IconButton, CircularProgress, Alert } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getAuthHeader } from '../../utils/auth';
import config from '../../config';

interface Invoice {
  invoiceNumber: string;
  blobLink: string; // Keep blobLink for display if needed, but download uses the new endpoint
}

interface CustomerMapping {
  customerId: string;
  invoices: Invoice[];
}

function Row(props: { customer: CustomerMapping }) {
  const { customer } = props;
  const [open, setOpen] = useState(false);

  const handleDownload = async (customerId: string, invoiceNumber: string) => {
    console.log(`Attempting to download invoice ${invoiceNumber} for customer ${customerId}`);
    try {
      const response = await fetch(`${config.apiUrl}/api/download-invoice/${customerId}/${invoiceNumber}`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get download URL');
      }

      const data: { sasUrl: string } = await response.json();
      if (data.sasUrl) {
        console.log('Received SAS URL. Initiating download.');
        window.open(data.sasUrl, '_blank'); // Open the SAS URL in a new tab to initiate download
      } else {
        console.error('Download URL not provided in response.', data);
        // Handle case where SAS URL is missing in the response
      }

    } catch (error) {
      console.error('Error during download process:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'An error occurred'}`);
    }
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {customer.customerId}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Invoices
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice Number</TableCell>
                    <TableCell>Download Link (SAS)</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customer.invoices.map((invoice) => (
                    <TableRow key={invoice.invoiceNumber}>
                      <TableCell component="th" scope="row">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.blobLink ? 'Secured Link Available' : 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={() => handleDownload(customer.customerId, invoice.invoiceNumber)}
                        >
                          Download ZIP
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

const ViewMappings: React.FC = () => {
  const [mappings, setMappings] = useState<CustomerMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiUrl}/api/mappings`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch mappings');
      }

      const data: CustomerMapping[] = await response.json(); // Assuming backend returns array of CustomerMapping
      setMappings(data);

    } catch (err) {
      console.error('Error fetching mappings:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching mappings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings(); // Fetch mappings on component mount
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Box className="admin-section-card">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>Customer Mappings</Typography>
        <Button 
          variant="contained" 
          onClick={fetchMappings} 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>
      
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      {!loading && !error && mappings.length > 0 && (
        <TableContainer component={Paper}>
          <Table aria-label="collapsible table">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Customer ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappings.map((mapping) => (
                <Row key={mapping.customerId} customer={mapping} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && !error && mappings.length === 0 && (
        <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>No mappings found.</Typography>
      )}

    </Box>
  );
};

export default ViewMappings; 