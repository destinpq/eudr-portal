import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import axios from 'axios';

interface AdminLoginProps {
  onLogin: (token: string, user: any) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<any>(null);
  const [passwordValidation, setPasswordValidation] = useState<any>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:18001';

  React.useEffect(() => {
    // Fetch password policy on component mount
    fetchPasswordPolicy();
  }, []);

  const fetchPasswordPolicy = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/password-policy`);
      setPasswordRequirements(response.data.policy);
    } catch (error) {
      console.error('Failed to fetch password policy:', error);
    }
  };

  const validatePassword = (password: string) => {
    if (!passwordRequirements) return null;

    const errors: string[] = [];
    const warnings: string[] = [];
    const success: string[] = [];

    // Length check
    if (password.length >= passwordRequirements.adminMinLength) {
      success.push(`At least ${passwordRequirements.adminMinLength} characters long`);
    } else {
      errors.push(`Password must be at least ${passwordRequirements.adminMinLength} characters long`);
    }

    // Character requirements
    if (/[a-z]/.test(password)) {
      success.push("Contains lowercase letters");
    } else {
      errors.push("Must contain lowercase letters");
    }

    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) {
      success.push("Contains uppercase letters or numbers");
    } else {
      errors.push("Must contain uppercase letters or numbers");
    }

    if (/[@#$%^&*+=|\\(){}:;",<.?/]/.test(password)) {
      success.push("Contains at least one special character");
    } else {
      errors.push("Must contain at least one special character");
    }

    // Common words check
    if (!password.toLowerCase().includes('password') && !password.toLowerCase().includes('admin')) {
      success.push("No common words");
    } else {
      if (password.toLowerCase().includes('password')) {
        errors.push("Cannot contain the word 'password'");
      }
      if (password.toLowerCase().includes('admin')) {
        errors.push("Cannot contain the word 'admin'");
      }
    }

    // Sequential patterns
    if (!/123456|abcdef|qwerty/i.test(password)) {
      success.push("No sequential patterns");
    } else {
      errors.push("Cannot contain common sequential patterns");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      success
    };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, formData);
      
      if (response.data.mustChangePassword) {
        setMustChangePassword(true);
        setChangePasswordData(prev => ({ ...prev, currentPassword: formData.password }));
      } else {
        onLogin(response.data.token, response.data.user);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const validation = validatePassword(changePasswordData.newPassword);
    if (validation && !validation.isValid) {
      setError('Password does not meet requirements: ' + validation.errors.join(', '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/admin/change-password`, {
        username: formData.username,
        currentPassword: changePasswordData.currentPassword,
        newPassword: changePasswordData.newPassword
      });

      onLogin(response.data.token, response.data.user);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordChange = (value: string) => {
    setChangePasswordData(prev => ({ ...prev, newPassword: value }));
    setPasswordValidation(validatePassword(value));
  };

  if (mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Change Password Required
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You must change your password before continuing
            </p>
          </div>
          
          <Card className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={changePasswordData.newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData(prev => ({ 
                    ...prev, 
                    confirmPassword: e.target.value 
                  }))}
                  required
                  className="mt-1"
                />
              </div>

              {passwordValidation && (
                <div className="text-sm">
                  {passwordValidation.success && passwordValidation.success.length > 0 && (
                    <div className="text-green-600 mb-2">
                      <p className="font-medium">✅ Requirements met:</p>
                      <ul className="list-none space-y-1">
                        {passwordValidation.success.map((success: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            {success}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {passwordValidation.errors.length > 0 && (
                    <div className="text-red-600 mb-2">
                      <p className="font-medium">❌ Requirements not met:</p>
                      <ul className="list-none space-y-1">
                        {passwordValidation.errors.map((error: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <span className="text-red-500 mr-2">✗</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {passwordValidation.warnings.length > 0 && (
                    <div className="text-yellow-600">
                      <p className="font-medium">💡 Recommendations:</p>
                      <ul className="list-none space-y-1">
                        {passwordValidation.warnings.map((warning: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <span className="text-yellow-500 mr-2">!</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {passwordRequirements && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="font-medium mb-2">Password Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>At least {passwordRequirements.adminMinLength} characters long</li>
                    <li>Contains lowercase letters</li>
                    <li>Contains uppercase letters or numbers</li>
                    <li>Contains at least one special character</li>
                    <li>No common words or sequential patterns</li>
                  </ul>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (passwordValidation && !passwordValidation.isValid)}
                className="w-full"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-2xl">🔐</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Portal
        </h2>
        <p className="text-gray-600">
          Sign in to your admin account
        </p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-red-500 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Error
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </div>
          ) : (
            'Sign In to Admin Portal'
          )}
        </Button>
      </form>
    </div>
  );
};

export default AdminLogin; 