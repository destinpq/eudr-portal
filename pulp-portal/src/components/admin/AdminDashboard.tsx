import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { getAdminDocuments, downloadAdminDocumentPDF, downloadAdminFile } from '../../services/api';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  lastLogin: string | null;
  createdAt: string;
  mustChangePassword: boolean;
  isTemporaryPassword: boolean;
  failedLoginAttempts: number;
}

interface Document {
  rowKey: string;
  userId: string;
  username: string;
  email: string;
  invoiceId: string;
  commodityType: string;
  quantityOfPulpMT: string;
  fscCertificateNumber: string;
  createdAt: string;
  updatedAt: string;
  files: string;
}

interface DocumentFilters {
  invoiceId: string;
  startDate: string;
  endDate: string;
  userId: string;
}

interface AdminDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, user, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
  // Create user form state
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    role: 'user'
  });
  
  // Document filters
  const [documentFilters, setDocumentFilters] = useState<DocumentFilters>({
    invoiceId: '',
    startDate: '',
    endDate: '',
    userId: ''
  });
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:18001';

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab]);

  const apiRequest = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error: any) {
      setError('Failed to fetch users: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (appliedFilters?: Partial<DocumentFilters>) => {
    setDocumentsLoading(true);
    try {
      const filterParams = appliedFilters || documentFilters;
      const cleanFilters: any = {};
      
      if (filterParams.invoiceId) cleanFilters.invoiceId = filterParams.invoiceId;
      if (filterParams.startDate) cleanFilters.startDate = filterParams.startDate;
      if (filterParams.endDate) cleanFilters.endDate = filterParams.endDate;
      if (filterParams.userId) cleanFilters.userId = filterParams.userId;
      
      const response = await getAdminDocuments(cleanFilters);
      if (response.success) {
        setDocuments(response.data);
      }
    } catch (error: any) {
      showNotification('error', 'Failed to load documents');
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentFilterChange = (field: keyof DocumentFilters, value: string) => {
    setDocumentFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyDocumentFilters = () => {
    loadDocuments(documentFilters);
  };

  const clearDocumentFilters = () => {
    const clearedFilters = {
      invoiceId: '',
      startDate: '',
      endDate: '',
      userId: ''
    };
    setDocumentFilters(clearedFilters);
    loadDocuments(clearedFilters);
  };

  const handleDownloadPDF = async (userId: string, docId: string, invoiceId: string) => {
    setDownloadingPDF(docId);
    try {
      await downloadAdminDocumentPDF(userId, docId);
      showNotification('success', `PDF downloaded for invoice ${invoiceId}`);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      showNotification('error', 'Failed to download PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    setDownloadingFile(fileId);
    try {
      await downloadAdminFile(fileId);
      showNotification('success', `File downloaded successfully`);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      showNotification('error', 'Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const getFileList = (document: Document): any[] => {
    try {
      const files = JSON.parse(document.files || '{}');
      return Object.entries(files).map(([key, value]: [string, any]) => ({
        id: key,
        fileId: value.fileId || value,
        fileName: value.fileName || key,
        fileSize: value.fileSize
      }));
    } catch {
      return [];
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.username) {
      setError('Email and username are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await apiRequest.post('/api/admin/users', newUser);
      
      setSuccess('User created successfully!');
      setNewUser({ email: '', username: '', role: 'user' });
      
      await fetchUsers();
    } catch (error: any) {
      setError('Failed to create user: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (username: string, email: string) => {
    try {
      setLoading(true);
      const response = await apiRequest.put(`/api/admin/users/${username}`, {
        email,
        resetPassword: true
      });
      
      setSuccess(`Password reset for ${username}. New password: ${response.data.newPassword}`);
      await fetchUsers();
    } catch (error: any) {
      setError('Failed to reset password: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (username: string, email: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      await apiRequest.put(`/api/admin/users/${username}`, {
        email,
        isActive: !currentStatus
      });
      
      setSuccess(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      await fetchUsers();
    } catch (error: any) {
      setError('Failed to update user status: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockUser = async (username: string, email: string) => {
    try {
      setLoading(true);
      await apiRequest.post(`/api/admin/users/${username}/unlock`, { email });
      
      setSuccess(`User ${username} unlocked successfully`);
      await fetchUsers();
    } catch (error: any) {
      setError('Failed to unlock user: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage users, documents, and system settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-blue-600">{users.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{users.filter(u => u.isActive).length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold text-purple-600">{documents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-2xl">🚨</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <span className="text-green-500 text-2xl">✅</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Success</h3>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="text-lg py-3">
            👥 User Management
          </TabsTrigger>
          <TabsTrigger value="create" className="text-lg py-3">
            ➕ Create User
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-lg py-3">
            📄 Document Management
          </TabsTrigger>
        </TabsList>

        {/* Create User Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">➕</span>
                Create New User
              </h3>
              <p className="text-gray-600 mt-2">Add a new user to the system with automatic credentials generation</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="create-email">Email Address *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">User's email address for login and notifications</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="create-username">Username *</Label>
                    <Input
                      id="create-username"
                      type="text"
                      placeholder="johndoe"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      className="mt-1"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">Unique username for the user</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="create-role">User Role</Label>
                  <select
                    id="create-role"
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="mt-1 w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">👤 Regular User</option>
                    <option value="admin">👑 Administrator</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">Select the user's access level</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <p>• A temporary password will be generated automatically</p>
                    <p>• User will be required to change password on first login</p>
                    <p>• Account will be active immediately upon creation</p>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={loading || !newUser.email || !newUser.username}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creating User...</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Create User</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>

        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Document Filters */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔍</span>
                Filter Documents
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="doc-filter-invoice">Invoice Number</Label>
                  <Input
                    id="doc-filter-invoice"
                    placeholder="Search by invoice..."
                    value={documentFilters.invoiceId}
                    onChange={(e) => handleDocumentFilterChange('invoiceId', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-filter-user">User</Label>
                  <select
                    id="doc-filter-user"
                    value={documentFilters.userId}
                    onChange={(e) => handleDocumentFilterChange('userId', e.target.value)}
                    className="mt-1 w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="doc-filter-start-date">Start Date</Label>
                  <Input
                    id="doc-filter-start-date"
                    type="date"
                    value={documentFilters.startDate}
                    onChange={(e) => handleDocumentFilterChange('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-filter-end-date">End Date</Label>
                  <Input
                    id="doc-filter-end-date"
                    type="date"
                    value={documentFilters.endDate}
                    onChange={(e) => handleDocumentFilterChange('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <Button onClick={applyDocumentFilters} className="flex-1">
                    Apply
                  </Button>
                  <Button onClick={clearDocumentFilters} variant="outline">
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Documents List */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2">📄</span>
                  Documents ({documents.length})
                </span>
                <Button onClick={() => loadDocuments()} disabled={documentsLoading}>
                  {documentsLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </h3>
            </div>
            <div className="p-6">
              {documentsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading documents...</span>
                  </div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-600">
                    {Object.values(documentFilters).some(f => f)
                      ? "No documents match your current filters."
                      : "No documents have been submitted yet."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => {
                    const fileList = getFileList(doc);
                    return (
                      <div key={doc.rowKey} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              📋 {doc.invoiceId} - {doc.commodityType}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              User: {doc.username} ({doc.email})
                            </p>
                            <p className="text-sm text-gray-600">
                              FSC: {doc.fscCertificateNumber} • Quantity: {doc.quantityOfPulpMT} MT
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Created: {formatDate(doc.createdAt)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Updated: {formatDate(doc.updatedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Submitted
                            </span>
                            {fileList.length > 0 && (
                              <span className="text-sm text-gray-600">
                                📎 {fileList.length} file{fileList.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* File downloads */}
                            {fileList.length > 0 && (
                              <div className="flex space-x-1">
                                {fileList.slice(0, 3).map((file) => (
                                  <Button
                                    key={file.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadFile(file.fileId)}
                                    disabled={downloadingFile === file.fileId}
                                    title={`Download ${file.fileName}`}
                                  >
                                    {downloadingFile === file.fileId ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                    ) : (
                                      <span>📁</span>
                                    )}
                                  </Button>
                                ))}
                                {fileList.length > 3 && (
                                  <span className="text-sm text-gray-500 px-2">
                                    +{fileList.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* PDF download */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(doc.userId, doc.rowKey, doc.invoiceId)}
                              disabled={downloadingPDF === doc.rowKey}
                            >
                              {downloadingPDF === doc.rowKey ? (
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                  <span>Generating...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span>📄</span>
                                  <span>PDF Summary</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Existing Users tab content */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Users ({users.length})</h2>
              <p className="text-gray-600">Manage user accounts and permissions</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setActiveTab('create')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                ➕ Create User
              </Button>
            <Button 
              onClick={fetchUsers} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </Button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Username</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Email</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Role</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Last Login</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Failed Attempts</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-white transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{user.username}</td>
                      <td className="py-4 px-4 text-gray-700">{user.email}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {user.isActive ? '✅ Active' : '❌ Inactive'}
                          </span>
                          {user.isLocked && (
                            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 inline-block">
                              🔒 Locked
                            </span>
                          )}
                          {user.mustChangePassword && (
                            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 inline-block">
                              🔑 Must Change Password
                            </span>
                          )}
                          {user.isTemporaryPassword && (
                            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 inline-block">
                              ⏰ Temp Password
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{formatDate(user.lastLogin)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          user.failedLoginAttempts > 0 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {user.failedLoginAttempts} failures
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleResetPassword(user.username, user.email)}
                            size="sm"
                            className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 text-xs px-3 py-1.5"
                            disabled={loading}
                          >
                            🔑 Reset Password
                          </Button>
                          <Button
                            onClick={() => handleToggleUserStatus(user.username, user.email, user.isActive)}
                            size="sm"
                            className={user.isActive 
                              ? "bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-xs px-3 py-1.5"
                              : "bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 text-xs px-3 py-1.5"
                            }
                            disabled={loading}
                          >
                            {user.isActive ? '❌ Deactivate' : '✅ Activate'}
                          </Button>
                          {user.isLocked && (
                            <Button
                              onClick={() => handleUnlockUser(user.username, user.email)}
                              size="sm"
                              className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 text-xs px-3 py-1.5"
                              disabled={loading}
                            >
                              🔓 Unlock
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl text-gray-400">👥</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600 mb-4">Create your first user to get started</p>
                <Button 
                  onClick={() => setActiveTab('create')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ➕ Create First User
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard; 