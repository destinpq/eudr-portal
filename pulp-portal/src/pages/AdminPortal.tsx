import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminDashboard from '../components/admin/AdminDashboard';
import { getCurrentUser, logout } from '../services/authService';

const AdminPortal: React.FC = () => {
  const currentUser = getCurrentUser();

  // Check if user is logged in and has admin role
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    // The auth state change will be handled by the main App component
  };

  return (
    <AdminDashboard 
      token={currentUser.token || ''} 
      user={currentUser.user} 
      onLogout={handleLogout} 
    />
  );
};

export default AdminPortal; 