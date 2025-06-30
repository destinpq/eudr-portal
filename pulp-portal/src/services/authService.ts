import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:18001';

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role?: string;
  };
  token?: string;
  mustChangePassword?: boolean;
  message?: string;
}

const api = axios.create({
  baseURL: `${API_URL}/api/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

// No request interceptor for auth service - login shouldn't have tokens

// No response interceptor for auth service to avoid conflicts with login

export const register = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = await api.post("/register", {
      username,
      password,
    });

    if (response.data.token) {
      setAuthData(response.data);
    }
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error ||
        "Registration failed. Please try again. Username must be at least 3 characters. Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    );
  }
};

export const login = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  try {
    console.log('AuthService login called with username:', username);
    console.log('API URL:', API_URL);
    console.log('Full URL:', `${API_URL}/api/auth/login`);
    const response = await api.post("/login", {
      username,
      password,
    });
    console.log('AuthService login response:', response.data);

    if (response.data.token) {
      console.log('Setting auth data...');
      setAuthData(response.data);
    }
    return response.data;
  } catch (error: any) {
    console.error('AuthService login error:', error);
    console.error('Error response:', error.response?.data);
    throw new Error(
      error.response?.data?.error || "Login failed. Please try again."
    );
  }
};

export const changePassword = async (
  username: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> => {
  try {
    const response = await api.post("/change-password", {
      username,
      currentPassword,
      newPassword,
    });

    if (response.data.token) {
      setAuthData(response.data);
    }
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || "Password change failed. Please try again."
    );
  }
};

export const logout = (): void => {
  // Get current user to flush their specific data
  const currentUser = getCurrentUser();
  
  // Clear any existing timers
  clearInactivityTimers();
  
  // Remove auth data from both storage types
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("refreshToken");
  
  // Flush user-specific form data if user exists
  if (currentUser?.user?.id) {
    localStorage.removeItem(`dds_draft_${currentUser.user.id}`);
    localStorage.removeItem(`dds_autosave_${currentUser.user.id}`);
  }
  
  // Also clean up any orphaned data (fallback)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('dds_draft_') || key.startsWith('dds_autosave_')) {
      localStorage.removeItem(key);
    }
  });
  
  window.location.href = "/login";
};

export const getCurrentUser = (): AuthResponse | null => {
  // Try sessionStorage first (more secure), then localStorage for backward compatibility
  let userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // Ensure email field is present for compatibility
      if (user && user.user && !user.user.email) {
        user.user.email = user.user.username + "@company.com"; // Default email
      }
      
      // Migrate from localStorage to sessionStorage if needed
      if (!sessionStorage.getItem("user") && localStorage.getItem("user")) {
        sessionStorage.setItem("user", userStr);
        localStorage.removeItem("user"); // Clean up
      }
      
      return user;
    } catch (error) {
      console.error("Error parsing user data:", error);
      // Clean up corrupted data
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      return null;
    }
  }
  return null;
};

export const getAuthHeader = (): { Authorization: string } => {
  const user = getCurrentUser();
  if (user?.token) {
    console.log("[AUTH] Returning auth header with token");
    return { Authorization: `Bearer ${user.token}` };
  }
  console.log("[AUTH] No token found, returning empty auth header");
  return { Authorization: "" };
};

const refreshToken = async (): Promise<AuthResponse> => {
  const refreshToken = sessionStorage.getItem("refreshToken") || localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const response = await api.post("/refresh-token", { refreshToken });
    setAuthData(response.data);
    return response.data;
  } catch (error) {
    throw new Error("Failed to refresh token");
  }
};

const setAuthData = (data: AuthResponse): void => {
  // Use sessionStorage for better security (expires when browser closes)
  sessionStorage.setItem("user", JSON.stringify(data));
  
  // Also keep in localStorage for longer persistence if user wants to stay logged in
  // This can be controlled by a "Remember me" checkbox in the future
  localStorage.setItem("user", JSON.stringify(data));
  
  console.log("[AUTH] Auth data saved to storage");
  
  // Dispatch custom event for auth state change
  window.dispatchEvent(new Event("authStateChange"));
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  return !!(user && user.token);
};

// Get current token
export const getToken = (): string | null => {
  const user = getCurrentUser();
  return user?.token || null;
};

// --- Enhanced Inactivity Management with User Prompts ---
const AUTO_LOGOUT_MINUTES = 20;
const WARNING_MINUTES = 2; // Show warning 2 minutes before logout
let inactivityTimeout: NodeJS.Timeout | null = null;
let warningTimeout: NodeJS.Timeout | null = null;
let warningModal: HTMLDivElement | null = null;

// Clear all timers
const clearInactivityTimers = () => {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
  if (warningTimeout) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
  }
  closeWarningModal();
};

// Create and show warning modal
const showInactivityWarning = () => {
  if (warningModal) return; // Don't show multiple modals
  
  let countdown = WARNING_MINUTES * 60; // 2 minutes in seconds
  
  // Create modal
  warningModal = document.createElement('div');
  warningModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  modalContent.innerHTML = `
    <div style="color: #f59e0b; font-size: 3rem; margin-bottom: 1rem;">⏰</div>
    <h2 style="color: #374151; margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600;">
      Session Expiring Soon
    </h2>
    <p style="color: #6b7280; margin: 0 0 1.5rem 0; line-height: 1.5;">
      You will be automatically logged out in <strong id="countdown">${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}</strong> due to inactivity.
    </p>
    <div style="display: flex; gap: 0.75rem; justify-content: center;">
      <button id="stayLoggedIn" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      ">Stay Logged In</button>
      <button id="logoutNow" style="
        background: #e5e7eb;
        color: #374151;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      ">Logout Now</button>
    </div>
  `;
  
  warningModal.appendChild(modalContent);
  document.body.appendChild(warningModal);
  
  // Update countdown every second
  const countdownElement = document.getElementById('countdown');
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdownElement) {
      const minutes = Math.floor(countdown / 60);
      const seconds = countdown % 60;
      countdownElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      closeWarningModal();
    }
  }, 1000);
  
  // Add event listeners
  const stayButton = document.getElementById('stayLoggedIn');
  const logoutButton = document.getElementById('logoutNow');
  
  if (stayButton) {
    stayButton.addEventListener('click', () => {
      clearInterval(countdownInterval);
      closeWarningModal();
      resetInactivityTimer(); // Reset the timer
    });
  }
  
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearInterval(countdownInterval);
      closeWarningModal();
      logout();
    });
  }
  
  // Auto close modal when countdown reaches 0
  setTimeout(() => {
    if (warningModal) {
      clearInterval(countdownInterval);
      closeWarningModal();
    }
  }, countdown * 1000);
};

// Close warning modal
const closeWarningModal = () => {
  if (warningModal) {
    document.body.removeChild(warningModal);
    warningModal = null;
  }
};

// Reset inactivity timer
function resetInactivityTimer() {
  // Only reset if user is authenticated
  if (!isAuthenticated()) return;
  
  // Clear existing timers
  clearInactivityTimers();
  
  // Set warning timer (18 minutes)
  warningTimeout = setTimeout(() => {
    showInactivityWarning();
  }, (AUTO_LOGOUT_MINUTES - WARNING_MINUTES) * 60 * 1000);
  
  // Set logout timer (20 minutes)
  inactivityTimeout = setTimeout(() => {
    closeWarningModal();
    logout();
    
    // Show a simple notification after logout
    setTimeout(() => {
      alert("You have been logged out due to inactivity. Please log in again to continue.");
    }, 100);
  }, AUTO_LOGOUT_MINUTES * 60 * 1000);
}

// Export function to manually extend session
export const extendSession = () => {
  console.log("[AUTH] Session extended by user");
  resetInactivityTimer();
};

// Listen for user activity events
if (typeof window !== "undefined") {
  ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"].forEach(
    (event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    }
  );
  
  // Start timer on load if user is authenticated
  if (isAuthenticated()) {
    resetInactivityTimer();
  }
  
  // Listen for auth state changes to start/stop timers
  window.addEventListener("authStateChange", () => {
    if (isAuthenticated()) {
      resetInactivityTimer();
    } else {
      clearInactivityTimers();
    }
  });
}
