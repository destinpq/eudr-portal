import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Alert,
  CircularProgress,
  Input
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { getAuthHeader } from '../../utils/auth';
import config from '../../config';

interface UploadFileState {
  file: File;
  customerId: string;
  invoiceNumber: string;
}

const UploadFiles = () => {
  const [uploadFiles, setUploadFiles] = useState<UploadFileState[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const newUploadFiles = files.map(file => ({
        file: file,
        customerId: '',
        invoiceNumber: file.name.replace(/\.zip$/i, ''),
      }));
      setUploadFiles(prevFiles => [...prevFiles, ...newUploadFiles]);
    }
  };

  const handleCustomerIdChange = (index: number, value: string) => {
    setUploadFiles(uploadFiles.map((item, i) => 
      i === index ? { ...item, customerId: value } : item
    ));
  };

  const handleInvoiceNumberChange = (index: number, value: string) => {
    setUploadFiles(uploadFiles.map((item, i) => 
      i === index ? { ...item, invoiceNumber: value } : item
    ));
  };

  const handleRemoveFile = (index: number) => {
    setUploadFiles(uploadFiles.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (uploadFiles.length === 0) {
      setError('No files selected for upload.');
      return;
    }

    const filesToUpload = uploadFiles.filter(item => item.customerId && item.invoiceNumber);

    if (filesToUpload.length !== uploadFiles.length) {
      setError('Please enter Customer ID and Invoice Number for all selected files.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const uploadPromises = filesToUpload.map(async (item) => {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('customerId', item.customerId);
        formData.append('invoiceNumber', item.invoiceNumber);

        try {
            const response = await fetch(`${config.apiUrl}/api/upload/multiple`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...getAuthHeader()
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed for ${item.file.name}`);
            }
            return { fileName: item.file.name, success: true };
        } catch (err) {
            console.error(`Upload error for ${item.file.name}:`, err);
            return { fileName: item.file.name, success: false, error: err instanceof Error ? err.message : 'Upload failed' };
        }
    });

    const results = await Promise.all(uploadPromises);

    const failedUploads = results.filter(result => !result.success);

    if (failedUploads.length > 0) {
        const errorMessages = failedUploads.map(item => `${item.fileName}: ${item.error || 'Upload failed'}`).join(', ');
        setError(`Failed to upload ${failedUploads.length} file(s): ${errorMessages}`);
    } else {
        setSuccess('All files uploaded successfully!');
    }

    setUploadFiles([]);
    setUploading(false);
  };

  return (
    <Box className="admin-section-card">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Upload Invoice Files
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" component="div" sx={{ mb: 1 }}>
          Select Zip File(s):
        </Typography>
        <Input type="file" inputProps={{ accept: '.zip', multiple: true }} onChange={handleFileSelect} />
      </Box>

      {uploadFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" component="div" sx={{ mb: 1 }}>
            Selected Files:
          </Typography>
          <Paper>
            {uploadFiles.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="body2" component="div" sx={{ flexGrow: 1, mr: 2 }}>
                  {item.file.name}
                </Typography>
                
                <TextField
                  label="Invoice Number"
                  variant="outlined"
                  size="small"
                  value={item.invoiceNumber}
                  onChange={(e) => handleInvoiceNumberChange(index, e.target.value)}
                  sx={{ width: '150px', mr: 1 }}
                />
                <TextField
                  label="Customer ID"
                  variant="outlined"
                  size="small"
                  value={item.customerId}
                  onChange={(e) => handleCustomerIdChange(index, e.target.value)}
                  sx={{ width: '150px', mr: 1 }}
                />
                
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small" 
                  onClick={() => handleRemoveFile(index)}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Paper>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleUploadAll} 
          disabled={uploading || uploadFiles.length === 0 || uploadFiles.some(item => !item.customerId || !item.invoiceNumber)}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
        >
          {uploading ? 'Uploading...' : 'Upload All Files'}
        </Button>
      </Box>
    </Box>
  );
};

export default UploadFiles; 