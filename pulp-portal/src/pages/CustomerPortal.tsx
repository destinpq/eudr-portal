/**
 * CustomerPortal Component
 *
 * This is the main customer interface that handles:
 * - Document creation (NEW DDS)
 * - Document history viewing with filtering
 * - Draft management
 * - PDF downloads
 * - ZIP downloads of all documents
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NewDDSForm from '../components/NewDDSForm';
import { getSubmissions, downloadSubmissionPDF, downloadSubmissionZIP } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface Document {
  rowKey: string;
  invoiceId: string;
  commodityType: string;
  quantityOfPulpMT: string;
  fscCertificateNumber: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  status?: string;
  producersCount?: number;
  documentsCount?: number;
  woodOriginsCount?: number;
}

interface DocumentFilters {
  invoiceId: string;
  startDate: string;
  endDate: string;
}

export default function CustomerPortal() {
  const location = useLocation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [downloadingZIP, setDownloadingZIP] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>({
    invoiceId: '',
    startDate: '',
    endDate: ''
  });
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Show documents page if path is /documents
  const showDocuments = location.pathname === '/documents';

  useEffect(() => {
    if (showDocuments) {
      loadDocuments();
    }
  }, [showDocuments]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadDocuments = async (appliedFilters?: Partial<DocumentFilters>) => {
    setLoading(true);
    try {
      const filterParams: any = {};
      
      if (appliedFilters?.invoiceId || filters.invoiceId) {
        filterParams.invoiceId = appliedFilters?.invoiceId || filters.invoiceId;
      }
      
      if (appliedFilters?.startDate || filters.startDate) {
        filterParams.startDate = appliedFilters?.startDate || filters.startDate;
      }
      
      if (appliedFilters?.endDate || filters.endDate) {
        filterParams.endDate = appliedFilters?.endDate || filters.endDate;
      }
      
      // Use getSubmissions to fetch EUDR DDS submissions
      const response = await getSubmissions(filterParams);
      if (response.success) {
        setDocuments(response.data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      showNotification('error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof DocumentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    loadDocuments(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      invoiceId: '',
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    loadDocuments(clearedFilters);
  };

  const handleDownloadPDF = async (docId: string, invoiceId: string) => {
    setDownloadingPDF(docId);
    try {
      await downloadSubmissionPDF(docId);
      showNotification('success', `PDF downloaded for invoice ${invoiceId}`);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      showNotification('error', 'Failed to download PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadZIP = async (docId: string, invoiceId: string) => {
    setDownloadingZIP(docId);
    try {
      await downloadSubmissionZIP(docId);
      showNotification('success', `ZIP downloaded for invoice ${invoiceId} - contains all documents, GeoJSON files, and PDF summary`);
    } catch (error: any) {
      console.error('Error downloading ZIP:', error);
      showNotification('error', 'Failed to download ZIP file');
    } finally {
      setDownloadingZIP(null);
    }
  };

  if (showDocuments) {
    return (
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Notification */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg shadow-md ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                <span className="mr-2">
                  {notification.type === 'success' ? '✅' : '❌'}
                </span>
                {notification.message}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DDS History</h1>
            <p className="text-gray-600">View and manage your submitted documents</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">🔍</span>
                Filter Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="filter-invoice">Invoice Number</Label>
                  <Input
                    id="filter-invoice"
                    placeholder="Search by invoice..."
                    value={filters.invoiceId}
                    onChange={(e) => handleFilterChange('invoiceId', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-start-date">Start Date</Label>
                  <Input
                    id="filter-start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-end-date">End Date</Label>
                  <Input
                    id="filter-end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <Button onClick={applyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button onClick={clearFilters} variant="outline">
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
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
                {Object.values(filters).some(f => f) 
                  ? "No documents match your current filters. Try adjusting your search criteria."
                  : "You haven't submitted any documents yet. Create your first DDS to get started."
                }
              </p>
              {Object.values(filters).some(f => f) && (
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Found {documents.length} document{documents.length !== 1 ? 's' : ''}
                {Object.values(filters).some(f => f) && ' matching your filters'}
              </div>
              
              {documents.map((doc) => (
                <Card key={doc.rowKey} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          📋 {doc.invoiceId || 'Document'} - {doc.commodityType}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          FSC: {doc.fscCertificateNumber} • Quantity: {doc.quantityOfPulpMT} MT
                        </p>
                        {(doc.producersCount || doc.documentsCount || doc.woodOriginsCount) && (
                          <p className="text-sm text-blue-600 mt-1">
                            📊 {doc.producersCount || 0} producer{(doc.producersCount || 0) !== 1 ? 's' : ''} • 
                            📁 {doc.documentsCount || 0} document{(doc.documentsCount || 0) !== 1 ? 's' : ''} • 
                            🌍 {doc.woodOriginsCount || 0} location{(doc.woodOriginsCount || 0) !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Created: {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Submitted
                      </span>
                      <div className="space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadPDF(doc.rowKey, doc.invoiceId)}
                          disabled={downloadingPDF === doc.rowKey}
                        >
                          {downloadingPDF === doc.rowKey ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              <span>Generating PDF...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <span>📄</span>
                              <span>Download PDF</span>
                            </div>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadZIP(doc.rowKey, doc.invoiceId)}
                          disabled={downloadingZIP === doc.rowKey}
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          title="Download ZIP containing all documents, GeoJSON files, and PDF summary"
                        >
                          {downloadingZIP === doc.rowKey ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              <span>Creating ZIP...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <span>📦</span>
                              <span>Download ZIP</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: Show new DDS form
  return <NewDDSForm />;
}
