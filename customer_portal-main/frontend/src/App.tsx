/**
 * Main Customer Portal Application
 *
 * This is the root component that handles:
 * - Authentication state management
 * - Route protection
 * - Navigation
 * - Layout structure
 */

import React, { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { getCurrentUser, logout } from "./utils/auth";
import { Button } from "@mui/material";
import { Loader2 } from "lucide-react";

// Lazy load components for better performance
const LoginPage = lazy(() => import("./components/LoginPage"));
const UserInvoicesPage = lazy(() => import("./components/UserInvoicesPage"));
const AdminDashboardPage = lazy(() => import("./components/AdminDashboardPage"));
const ChangePasswordPage = lazy(() => import("./components/ChangePasswordPage"));

/**
 * User state interface
 */
interface UserState {
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

/**
 * Loading Spinner Component
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex items-center space-x-2">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      <span className="text-lg text-gray-600">Loading...</span>
    </div>
  </div>
);

/**
 * Private Route Component
 * Protects routes that require authentication
 */
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUser = getCurrentUser();
  const location = useLocation();
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

/**
 * Admin Route Component
 * Protects routes that require admin access
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUser = getCurrentUser();
  const location = useLocation();
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (currentUser.user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.href = '/'}
            className="mt-4"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

/**
 * Navigation Component
 */
const Navigation: React.FC<{ user: UserState | null; onLogout: () => void }> = ({ user, onLogout }) => {
  const location = useLocation();
  
  // Don't show navigation on login page
  if (location.pathname === '/login') {
    return null;
  }
  
  return (
    <nav className="sticky top-0 z-50 bg-primary shadow-lg px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-4">
        {/* Company Name Section */}
        <div className="flex items-center">
          <span className="text-white text-2xl font-bold tracking-wide">
            EUDR CUSTOMER PORTAL
          </span>
        </div>

        {/* Navigation Links and User Section */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {/* Main Navigation Links */}
              <Link
                to="/"
                className={`text-white hover:text-blue-200 font-medium transition-colors px-4 py-2 rounded-md hover:bg-primary/80 ${
                  location.pathname === '/' ? 'bg-primary/80' : ''
                }`}
              >
                📋 My Documents
              </Link>
              
              {user.user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`text-white hover:text-blue-200 font-medium transition-colors px-4 py-2 rounded-md hover:bg-primary/80 ${
                    location.pathname === '/admin' ? 'bg-primary/80' : ''
                  }`}
                >
                  🛠️ Admin Dashboard
                </Link>
              )}
              
              {/* User Menu */}
              <div className="flex items-center space-x-3 pl-4 border-l border-white/20">
                <div className="text-white">
                  <div className="font-medium">👤 {user.user?.username}</div>
                  <div className="text-sm text-blue-200">{user.user?.email}</div>
                </div>
                
                <Link
                  to="/change-password"
                  className="text-white hover:text-blue-200 font-medium transition-colors px-3 py-1 rounded-md hover:bg-primary/80 text-sm"
                >
                  🔑 Change Password
                </Link>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onLogout}
                  className="text-white border-white hover:bg-white/10 hover:border-white/80"
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            // Unauthenticated User Navigation
            <>
              <Link
                to="/login"
                className="text-white hover:text-blue-200 font-medium transition-colors px-4 py-2 rounded-md hover:bg-primary/80"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

/**
 * App Component
 *
 * Main application component that manages:
 * - User authentication state
 * - Cross-tab authentication sync
 * - Navigation and routing
 * - Application layout
 */
function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize user state from localStorage
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Handle storage events to sync user state across browser tabs
    const handleStorageChange = () => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
    };

    // Handle custom auth state change events
    const handleAuthChange = () => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
    };

    // Add event listeners for auth state changes
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authStateChange", handleAuthChange);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authStateChange", handleAuthChange);
    };
  }, []);

  /**
   * Handles user logout
   */
  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-background relative overflow-x-hidden">
        {/* Navigation */}
        <Navigation user={user} onLogout={handleLogout} />

        {/* Main Content Area */}
        <main className="container mx-auto py-8 px-2 sm:px-4 relative z-10">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <UserInvoicesPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/change-password"
                element={
                  <PrivateRoute>
                    <ChangePasswordPage />
                  </PrivateRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
