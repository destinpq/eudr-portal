import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeader, getCurrentUser } from '../utils/auth';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  DateRange as DateRangeIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import config from '../config';

interface Document {
  rowKey: string;
  invoiceId: string;
  commodityType: string;
  quantityOfPulpMT: string;
  fscCertificateNumber: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  email?: string;
  status?: string;
  producers?: any[];
  woodOrigins?: any[];
  files?: any;
}

interface DocumentFilters {
  invoiceId: string;
  startDate: string;
  endDate: string;
}

const UserInvoicesPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>({
    invoiceId: '',
    startDate: '',
    endDate: ''
  });
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  const fetchDocuments = useCallback(async (appliedFilters?: Partial<DocumentFilters>) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (appliedFilters?.invoiceId || filters.invoiceId) {
        queryParams.append('invoiceId', appliedFilters?.invoiceId || filters.invoiceId);
      }
      
      if (appliedFilters?.startDate || filters.startDate) {
        queryParams.append('startDate', appliedFilters?.startDate || filters.startDate);
      }
      
      if (appliedFilters?.endDate || filters.endDate) {
        queryParams.append('endDate', appliedFilters?.endDate || filters.endDate);
      }

      const response = await fetch(`${config.apiUrl}/api/documents?${queryParams}`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.data || []);
      
      if (data.data && data.data.length === 0) {
        showNotification('error', 'No documents found matching your criteria');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      showNotification('error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters, navigate]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFilterChange = (field: keyof DocumentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    fetchDocuments(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      invoiceId: '',
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    fetchDocuments(clearedFilters);
  };

  const handleDownloadPDF = async (docId: string, invoiceId: string) => {
    setDownloadingPDF(docId);
    try {
      const response = await fetch(`${config.apiUrl}/api/documents/${docId}/pdf`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('success', `PDF downloaded for invoice ${invoiceId}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showNotification('error', 'Failed to download PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadFile = async (docId: string, fileId: string, fileName: string) => {
    setDownloadingFile(docId);
    try {
      const response = await fetch(`${config.apiUrl}/api/files/${fileId}/download`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('success', `File ${fileName} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('error', 'Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleViewDetails = (document: Document) => {
    setSelectedDocument(document);
    setDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Documents
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your submitted documents
        </Typography>
      </Box>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filter Documents
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Invoice ID"
                placeholder="Search by invoice..."
                value={filters.invoiceId}
                onChange={(e) => handleFilterChange('invoiceId', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={applyFilters}
                  disabled={loading}
                  startIcon={<SearchIcon />}
                >
                  Apply
                </Button>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  Clear
                </Button>
                <IconButton
                  onClick={() => fetchDocuments()}
                  disabled={loading}
                  title="Refresh"
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Documents List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No documents found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search criteria or contact support if you believe this is an error.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ space: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Found {documents.length} document{documents.length !== 1 ? 's' : ''}
          </Typography>
          
          {documents.map((doc) => (
            <Card key={doc.rowKey} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="h3">
                      {doc.invoiceId || 'Document'} - {doc.commodityType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      FSC Certificate: {doc.fscCertificateNumber} • Quantity: {doc.quantityOfPulpMT} MT
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={<DateRangeIcon />}
                        label={`Created: ${formatDate(doc.createdAt)}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        icon={<BusinessIcon />}
                        label={doc.username}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleViewDetails(doc)}
                      startIcon={<DescriptionIcon />}
                    >
                      Details
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleDownloadPDF(doc.rowKey, doc.invoiceId)}
                      disabled={downloadingPDF === doc.rowKey}
                      startIcon={downloadingPDF === doc.rowKey ? <CircularProgress size={16} /> : <PdfIcon />}
                    >
                      PDF
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Document Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Document Details
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Invoice ID</Typography>
                  <Typography variant="body1">{selectedDocument.invoiceId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Commodity Type</Typography>
                  <Typography variant="body1">{selectedDocument.commodityType}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Quantity (MT)</Typography>
                  <Typography variant="body1">{selectedDocument.quantityOfPulpMT}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">FSC Certificate</Typography>
                  <Typography variant="body1">{selectedDocument.fscCertificateNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Created</Typography>
                  <Typography variant="body1">{formatDate(selectedDocument.createdAt)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Updated</Typography>
                  <Typography variant="body1">{formatDate(selectedDocument.updatedAt)}</Typography>
                </Grid>
              </Grid>
              
              {selectedDocument.files && Object.keys(selectedDocument.files).length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Associated Files
                  </Typography>
                  <List>
                    {Object.entries(selectedDocument.files).map(([key, file]) => {
                      const fileObj = file as any;
                      return (
                        <ListItem
                          key={key}
                          secondaryAction={
                            <IconButton
                              onClick={() => handleDownloadFile(selectedDocument.rowKey, fileObj.id, fileObj.name)}
                              disabled={downloadingFile === selectedDocument.rowKey}
                            >
                              {downloadingFile === selectedDocument.rowKey ? <CircularProgress size={20} /> : <DownloadIcon />}
                            </IconButton>
                          }
                        >
                          <ListItemIcon>
                            <DescriptionIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={fileObj.name}
                            secondary={`Size: ${fileObj.size ? (fileObj.size / 1024).toFixed(1) : 'Unknown'} KB`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserInvoicesPage; 