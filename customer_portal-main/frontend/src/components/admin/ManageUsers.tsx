import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import { getAuthHeader } from '../../utils/auth';
import config from '../../config';

interface User {
  customerId: string;
  dateCreated: string;
  PartitionKey: string;
  RowKey: string;
  Timestamp: string;
  role: string;
}

const ManageUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiUrl}/api/admin/users`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data: User[] = await response.json(); 
      setUsers(data);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    setCurrentUser({ 
      customerId: '', 
      dateCreated: '', 
      PartitionKey: '', 
      RowKey: '', 
      Timestamp: '',
      role: ''
    });
    setIsEditing(false);
    setPasswordInput('');
    setOpen(true);
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setIsEditing(true);
    setPasswordInput('');
    setOpen(true);
  };

  const handleDeleteUser = async (customerId: string) => {
    console.log('Attempting to delete user with customer ID:', customerId);
    if (window.confirm(`Are you sure you want to delete user with Customer ID: ${customerId}?`)) {
      try {
        const response = await fetch(`${config.apiUrl}/api/admin/users/${customerId}`, {
          method: 'DELETE',
          headers: getAuthHeader()
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete user');
        }

        console.log('User deleted successfully:', customerId);
        fetchUsers();

      } catch (err) {
        console.error('Error deleting user:', err);
        alert(`Failed to delete user: ${err instanceof Error ? err.message : 'An error occurred'}`);
      }
    }
  };

  const handleSaveUser = async () => {
    if (!currentUser) return;

    const userPayload: { customerId: string, password?: string, role: string } = {
        customerId: currentUser.customerId,
        role: currentUser.role || 'customer'
    };

    if (passwordInput) {
        userPayload.password = passwordInput;
    }

    try {
        const url = isEditing
            ? `${config.apiUrl}/api/admin/users/${currentUser.customerId}`
            : `${config.apiUrl}/api/admin/users`;

        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(userPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'add'} user`);
        }

        console.log(`User ${isEditing ? 'updated' : 'added'} successfully.`);
        setOpen(false);
        setCurrentUser(null);
        setPasswordInput('');
        fetchUsers();

    } catch (err) {
        console.error(`Error ${isEditing ? 'updating' : 'adding'} user:`, err);
        alert(`Failed to ${isEditing ? 'update' : 'add'} user: ${err instanceof Error ? err.message : 'An error occurred'}`);
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setCurrentUser(null);
    setPasswordInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'password') {
      setPasswordInput(value);
    } else if (currentUser) {
      setCurrentUser({ ...currentUser, [name]: value });
    }
  };

  const handleResetPassword = (user: User) => {
    setCurrentUser(user);
    setResetPasswordInput('');
    setResetPasswordOpen(true);
  };

  const handleSaveResetPassword = async () => {
    if (!currentUser || !resetPasswordInput) return;

    setResetLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ 
          customerId: currentUser.customerId,
          newPassword: resetPasswordInput
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to reset password');
      }

      alert(`Password reset successfully for user: ${currentUser.customerId}`);
      setResetPasswordOpen(false);
      setCurrentUser(null);
      setResetPasswordInput('');

    } catch (err) {
      console.error('Error resetting password:', err);
      alert(`Failed to reset password: ${err instanceof Error ? err.message : 'An error occurred'}`);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseResetDialog = () => {
    setResetPasswordOpen(false);
    setCurrentUser(null);
    setResetPasswordInput('');
  };

  return (
    <Box className="admin-section-card">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>Customer Information</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={fetchUsers}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddUser}
            disabled={loading}
          >
            Add New User
          </Button>
        </Box>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {!loading && !error && users.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>No users detected.</Alert>
      )}

      {!loading && !error && users.length > 0 && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Customer ID</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Date Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.customerId}>
                  <TableCell>{user.customerId}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.dateCreated}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleEditUser(user)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      onClick={() => handleResetPassword(user)}
                      size="small"
                      title="Reset Password"
                    >
                      <LockResetIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteUser(user.customerId)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <TextField
            name="customerId"
            label="Customer ID"
            variant="outlined"
            fullWidth
            margin="normal"
            value={currentUser?.customerId || ''}
            onChange={handleInputChange}
            disabled={isEditing}
            helperText={isEditing ? "Customer ID cannot be changed" : ""}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={passwordInput}
            onChange={handleInputChange}
            helperText={isEditing ? "Leave blank to keep current password" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveUser} 
            disabled={!currentUser || (!isEditing && (!currentUser.customerId || !passwordInput)) || (isEditing && passwordInput === '') }
          >
            {isEditing ? 'Save Changes' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetPasswordOpen} onClose={handleCloseResetDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password for {currentUser?.customerId}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will set a new password for the user and force them to change it on their next login.
          </Alert>
          <TextField
            name="resetPassword"
            label="New Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={resetPasswordInput}
            onChange={(e) => setResetPasswordInput(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveResetPassword} 
            disabled={!resetPasswordInput || resetLoading}
            variant="contained"
            color="secondary"
          >
            {resetLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;