import React, { useState, useEffect } from 'react';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';

const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for stored admin session
    const storedToken = localStorage.getItem('adminToken');
    const storedUser = localStorage.getItem('adminUser');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    
    // Store in localStorage for persistence
    localStorage.setItem('adminToken', newToken);
    localStorage.setItem('adminUser', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to main portal
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Replace the dual navigation issue by using a clean single header */}
      {isAuthenticated && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <div>
                  <h1 className="text-gray-900 text-xl font-semibold">
                    Admin Dashboard
                  </h1>
                  <p className="text-gray-600 text-sm">System Management</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-gray-900 text-sm font-medium">
                    {user?.username}
                  </p>
                  <p className="text-gray-600 text-xs">Administrator</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!isAuthenticated || !token || !user ? (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto mt-12">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">A</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h2>
              <p className="text-gray-600">Sign in to your admin account</p>
            </div>
            <AdminLogin onLogin={handleLogin} />
          </div>
        ) : (
          <div className="space-y-6">
            <AdminDashboard 
              token={token} 
              user={user} 
              onLogout={handleLogout} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminApp; 