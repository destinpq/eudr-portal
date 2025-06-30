import axios from "axios";
import { getCurrentUser, getAuthHeader, isAuthenticated } from "./authService";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:18001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth header to ALL requests
api.interceptors.request.use(
  (config) => {
    // Check if user is authenticated
    if (isAuthenticated()) {
      const authHeader = getAuthHeader();
      if (authHeader.Authorization) {
        config.headers.Authorization = authHeader.Authorization;
        console.log(`[API] Adding auth header to ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else {
      console.log(`[API] No authentication for ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Handle FormData requests - remove Content-Type to let browser set it
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log(`[API] FormData detected - removing Content-Type header`);
    }
    
    // Log the request for debugging
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      hasAuth: !!config.headers.Authorization,
      headers: config.headers,
      isFormData: config.data instanceof FormData
    });
    
    return config;
  },
  (error) => {
    console.error("[API] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} for ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API] Response error ${error.response?.status} for ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.data);
    
    if (error.response?.status === 401) {
      console.log("[API] 401 Unauthorized - redirecting to login");
      // Token expired or invalid
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

interface FileUploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
}

interface DocumentFormData {
  invoiceId: number | null; // Billing Document Number
  commodityType: "pulp" | "woodchips" | null;
  pulpCommodityType: string | null;
  otherPulpType: string | null;
  quantityOfPulpMT: string | null; // Quantity of Invoice in MT
  fscCertificateNumber: string | null;
  wood: Array<{
    commonName: string | null;
    scientificName: string | null;
  }>;
  producers: Array<{
    name: string | null;
    email: string | null;
    countries: string[];
  }>;
  woodOrigins: Array<{
    harvestDateStart: string | null;
    harvestDateEnd: string | null;
    geojsonFile: File | null;
    geojsonData: any | null;
    geojsonFileId?: string;
  }>;
  files?: Record<string, any>;
}

interface DocumentFilters {
  invoiceId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export const submitDocument = async (formData: DocumentFormData) => {
  try {
    console.log("[API] Submitting document...");
    const response = await api.post("/documents/submit", formData);
    console.log("[API] Document submitted successfully");
    return response.data;
  } catch (error) {
    console.error("Error submitting document:", error);
    throw error;
  }
};

export const uploadFile = async (file: File): Promise<any> => {
  try {
    console.log("[API] Uploading file:", file.name);
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/files/upload", formData);
    console.log("[API] File uploaded successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const getDocuments = async (filters?: DocumentFilters) => {
  try {
    const params = new URLSearchParams();
    if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    console.log("[API] Fetching documents with filters:", filters);
    const response = await api.get(`/documents?${params.toString()}`);
    console.log("[API] Documents fetched successfully:", response.data?.documents?.length || 0, "documents");
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

// New function to fetch submissions (EUDR DDS forms)
export const getSubmissions = async (filters?: DocumentFilters) => {
  try {
    const params = new URLSearchParams();
    if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    console.log("[API] Fetching submissions with filters:", filters);
    const response = await api.get(`/submissions?${params.toString()}`);
    console.log("[API] Submissions fetched successfully:", response.data?.data?.length || 0, "submissions");
    return response.data;
  } catch (error) {
    console.error("Error fetching submissions:", error);
    throw error;
  }
};

export const getDocument = async (id: string) => {
  try {
    console.log("[API] Fetching document:", id);
    const response = await api.get(`/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching document:", error);
    throw error;
  }
};

export const downloadDocumentPDF = async (id: string): Promise<void> => {
  try {
    console.log("[API] Downloading PDF for document:", id);
    const response = await api.get(`/documents/${id}/pdf`, {
      responseType: "blob",
    });
    
    // Create download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `EUDR_Document_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log("[API] PDF downloaded successfully");
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw error;
  }
};

export const downloadFile = async (fileId: string): Promise<Blob> => {
  try {
    console.log("Starting file download:", fileId);
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: "blob",
    });
    console.log("Download successful");
    return response.data;
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
};

// Helper function to create a download link
export const createDownloadLink = async (
  fileId: string,
  fileName: string
): Promise<void> => {
  try {
    const blob = await downloadFile(fileId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error creating download link:", error);
    throw error;
  }
};

// Admin API functions
export const getAdminDocuments = async (filters?: DocumentFilters) => {
  try {
    const params = new URLSearchParams();
    if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId);
    
    const response = await api.get(`/admin/documents?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching admin documents:", error);
    throw error;
  }
};

export const getAdminDocument = async (userId: string, docId: string) => {
  try {
    const response = await api.get(`/admin/documents/${userId}/${docId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching admin document:", error);
    throw error;
  }
};

export const downloadAdminDocumentPDF = async (userId: string, docId: string): Promise<void> => {
  try {
    const response = await api.get(`/admin/documents/${userId}/${docId}/pdf`, {
      responseType: "blob",
    });
    
    // Create download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `EUDR_Document_${userId}_${docId}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading admin PDF:", error);
    throw error;
  }
};

export const downloadAdminFile = async (fileId: string): Promise<void> => {
  try {
    const response = await api.get(`/admin/files/${fileId}`, {
      responseType: "blob",
    });
    
    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Extract filename from Content-Disposition header or use fileId
    const contentDisposition = response.headers['content-disposition'];
    let filename = fileId;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading admin file:", error);
    throw error;
  }
};

// Company Documents API functions
export const getCompanyDocuments = async () => {
  try {
    console.log("[API] Fetching company documents...");
    const response = await api.get("/company-docs");
    console.log("[API] Company documents fetched successfully");
    return response.data;
  } catch (error) {
    console.error("Error fetching company documents:", error);
    throw error;
  }
};

export const uploadCompanyDocument = async (documentType: string, file?: File, certificateNumber?: string) => {
  try {
    console.log('[API] uploadCompanyDocument called:', { documentType, fileName: file?.name, certificateNumber });
    
    // Check if we have auth token
    const authHeader = getAuthHeader();
    console.log('[API] Auth header check:', !!authHeader.Authorization);
    
    const formData = new FormData();
    formData.append('documentType', documentType);
    
    if (file) {
      formData.append('file', file);
      console.log('File appended to form data:', file.name, file.size, 'bytes');
    }
    
    if (certificateNumber) {
      formData.append('certificateNumber', certificateNumber);
    }

    console.log('Making API call to /company-docs/upload...');
    console.log('FormData contents:');
    console.log(`  documentType: ${documentType}`);
    if (file) {
      console.log(`  file: File(${file.name}, ${file.size} bytes)`);
    }
    if (certificateNumber) {
      console.log(`  certificateNumber: ${certificateNumber}`);
    }
    
    // FormData will be handled by the request interceptor
    const response = await api.post("/company-docs/upload", formData);

    console.log('API call successful:', response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error uploading company document:", error);
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    throw error;
  }
};

export const deleteCompanyDocument = async (documentType: string) => {
  try {
    const response = await api.delete(`/company-docs/${documentType}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting company document:", error);
    throw error;
  }
};

export const downloadSubmissionPDF = async (id: string): Promise<void> => {
  try {
    console.log("[API] Downloading PDF for submission:", id);
    const response = await api.get(`/submissions/${id}/pdf`, {
      responseType: "blob",
    });
    
    // Create download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `EUDR_Submission_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log("[API] PDF downloaded successfully");
  } catch (error) {
    console.error("Error downloading submission PDF:", error);
    throw error;
  }
};

export const downloadSubmissionZIP = async (id: string): Promise<void> => {
  try {
    console.log("[API] Downloading ZIP for submission:", id);
    const response = await api.get(`/submissions/${id}/zip`, {
      responseType: "blob",
    });
    
    // Create download link
    const blob = new Blob([response.data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `EUDR_Documents_${id}_${new Date().toISOString().split('T')[0]}.zip`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log("[API] ZIP downloaded successfully");
  } catch (error) {
    console.error("Error downloading submission ZIP:", error);
    throw error;
  }
};
