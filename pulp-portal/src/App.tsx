/**
 * Main Application Component
 *
 * This is the root component of the Pulp Portal application. It handles:
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
import { getCurrentUser, logout } from "./services/authService";
import { Button } from "./components/ui/button";
import { Loader2 } from "lucide-react";

// Lazy load components for better performance and initial load time
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));

const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const Login = lazy(() => import("./components/auth/Login"));
const Register = lazy(() => import("./components/auth/Register"));
const AdminApp = lazy(() => import("./AdminApp"));


/**
 * User state interface defining the structure of authenticated user data
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
 * PrivateRoute Component
 *
 * A wrapper component that protects routes requiring authentication.
 * Redirects to login if user is not authenticated.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 */
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = getCurrentUser();
  const location = useLocation();

  if (!user) {
    // Redirect to login while preserving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * LoadingSpinner Component
 *
 * Displays a centered loading spinner during component lazy loading
 */
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
  </div>
);

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

  useEffect(() => {
    // Initialize user state from localStorage
    const currentUser = getCurrentUser();
    setUser(currentUser);

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
   * Handles user logout by:
   * - Clearing auth data
   * - Updating user state
   */
  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Admin Route - Completely separate with no main navigation */}
        <Route path="/admin/*" element={<AdminApp />} />
        
        {/* Main App Routes with Navigation */}
        <Route path="/*" element={
          <div className="min-h-screen bg-background relative overflow-x-hidden">
            {/* Main Navigation Bar - Only show for non-admin routes */}
            <nav className="sticky top-0 z-50 bg-primary shadow-lg px-4 py-3">
              <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-4">
                {/* Company Name Section */}
                <div className="flex items-center">
                  <span className="text-white text-2xl font-bold tracking-wide">
                    EUDR SUPPLIER PORTAL
                  </span>
                </div>

                {/* Navigation Links and User Section */}
                <div className="flex gap-6 items-center w-full sm:w-auto justify-center sm:justify-end mt-2 sm:mt-0">
                  {user ? (
                    // Authenticated User Navigation
                    <>
                      <Link
                        to="/"
                        className="text-white hover:text-blue-200 font-medium transition-colors px-3 py-2 rounded-md hover:bg-primary/80"
                      >
                        NEW DDS Creation
                      </Link>
                      <Link
                        to="/documents"
                        className="text-white hover:text-blue-200 font-medium transition-colors px-3 py-2 rounded-md hover:bg-primary/80"
                      >
                        DDS History
                      </Link>

                      <div className="flex items-center gap-3 ml-4 border-l border-white/20 pl-4">
                        <span className="text-white text-sm">
                          {user.user?.username}
                        </span>
                        <Button
                          onClick={handleLogout}
                          variant="destructive"
                          size="sm"
                          className="hover:opacity-90 transition-opacity"
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
                      <Link
                        to="/register"
                        className="text-white hover:text-blue-200 font-medium transition-colors px-4 py-2 rounded-md hover:bg-primary/80"
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </nav>

            {/* Main Content Area */}
            <main className="container mx-auto py-8 px-2 sm:px-4 relative z-10">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <CustomerPortal />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/documents"
                    element={
                      <PrivateRoute>
                        <CustomerPortal />
                      </PrivateRoute>
                    }
                  />

                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
