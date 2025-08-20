import config from '../config';

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
}

export interface AuthState {
  user: User;
  token: string;
  mustChangePassword?: boolean;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  mustChangePassword?: boolean;
  message?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  token?: string;
}

// Token and user management
export const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
  // Dispatch custom event for cross-tab sync
  window.dispatchEvent(new CustomEvent('authStateChange'));
};

export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  // Dispatch custom event for cross-tab sync
  window.dispatchEvent(new CustomEvent('authStateChange'));
};

export const setUser = (user: User): void => {
  localStorage.setItem('auth_user', JSON.stringify(user));
  // Dispatch custom event for cross-tab sync
  window.dispatchEvent(new CustomEvent('authStateChange'));
};

export const getUser = (): User | null => {
  const userStr = localStorage.getItem('auth_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getCurrentUser = (): AuthState | null => {
  const token = getToken();
  const user = getUser();
  
  if (!token || !user) {
    return null;
  }

  return {
    token,
    user
  };
};

export const getAuthHeader = (): { Authorization: string } => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  return { Authorization: `Bearer ${token}` };
};

// Authentication API calls
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Login failed');
    }

    if (data.mustChangePassword) {
      return {
        success: false,
        mustChangePassword: true,
        message: data.message,
        user: data.user
      };
    }

    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      return {
        success: true,
        token: data.token,
        user: data.user
      };
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed'
    };
  }
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ 
        currentPassword, 
        newPassword 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Password change failed');
    }

    if (data.token) {
      setToken(data.token);
    }

    return {
      success: true,
      message: data.message || 'Password changed successfully',
      token: data.token
    };
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Password change failed'
    };
  }
};

export const logout = (): void => {
  removeToken();
  // Dispatch custom event for cross-tab sync
  window.dispatchEvent(new CustomEvent('authStateChange'));
};

export const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/me`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const user = await response.json();
    setUser(user);
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    removeToken();
    return null;
  }
};

// Utility functions
export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};

export const isAdmin = (): boolean => {
  const currentUser = getCurrentUser();
  return currentUser?.user?.role === 'admin';
};

export const requireAuth = (): AuthState => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Authentication required');
  }
  return currentUser;
};

export default {
  login,
  logout,
  changePassword,
  getCurrentUser,
  fetchCurrentUser,
  isAuthenticated,
  isAdmin,
  requireAuth,
  getAuthHeader
}; 