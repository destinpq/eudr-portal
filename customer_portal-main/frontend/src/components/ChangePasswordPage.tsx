import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { changePassword, getCurrentUser } from '../utils/auth';
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CssBaseline
} from '@mui/material';
import {
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { IconButton, InputAdornment } from '@mui/material';

interface LocationState {
  reason?: string;
  username?: string;
  currentPassword?: string;
  user?: any;
}

const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  
  const state = location.state as LocationState;

  useEffect(() => {
    if (!currentUser && !state?.username) {
      navigate('/login');
      return;
    }
    
    // Pre-fill current password if provided from login
    if (state?.currentPassword) {
      setCurrentPassword(state.currentPassword);
    }
  }, [currentUser, state, navigate]);

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('At least one number');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('At least one special character');
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    const validation = validatePassword(password);
    const strength = ((5 - validation.errors.length) / 5) * 100;
    
    if (strength < 40) return { strength, label: 'Weak', color: 'error' };
    if (strength < 80) return { strength, label: 'Fair', color: 'warning' };
    return { strength, label: 'Strong', color: 'success' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError('Password does not meet requirements');
      setLoading(false);
      return;
    }

    try {
      const username = state?.username || currentUser?.user?.username;
      if (!username) {
        throw new Error('Username not found');
      }

      const result = await changePassword(username, currentPassword, newPassword);
      
      if (result.success) {
        // Password changed successfully - redirect to dashboard
        if (currentUser?.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/invoices');
        }
      } else {
        setError(result.message || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordValidation = validatePassword(newPassword);

  return (
    <Container component="main" maxWidth="md">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'warning.main' }}>
          <LockIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Change Password
        </Typography>
        
        {state?.reason && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            {state.reason === 'expired' && 'Your password has expired. Please create a new password.'}
            {state.reason === 'required' && 'You must change your password before continuing.'}
            {state.reason === 'temporary' && 'Please change your temporary password to a permanent one.'}
          </Alert>
        )}
        
        <Card sx={{ mt: 3, width: '100%' }}>
          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="currentPassword"
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="newPassword"
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              {newPassword && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Password Strength: {passwordStrength.label}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.strength}
                    color={passwordStrength.color as any}
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="body2" gutterBottom>
                    Password Requirements:
                  </Typography>
                  <List dense>
                    {[
                      { text: 'At least 8 characters', check: newPassword.length >= 8 },
                      { text: 'At least one lowercase letter', check: /[a-z]/.test(newPassword) },
                      { text: 'At least one uppercase letter', check: /[A-Z]/.test(newPassword) },
                      { text: 'At least one number', check: /\d/.test(newPassword) },
                      { text: 'At least one special character', check: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) }
                    ].map((requirement, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {requirement.check ? (
                            <CheckIcon color="success" fontSize="small" />
                          ) : (
                            <CloseIcon color="error" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={requirement.text}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={
                  confirmPassword !== '' && newPassword !== confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={
                  loading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword ||
                  !passwordValidation.isValid
                }
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ChangePasswordPage; 