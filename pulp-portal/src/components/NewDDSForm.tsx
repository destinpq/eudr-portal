import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getCurrentUser, isAuthenticated } from '../services/authService';
import { uploadCompanyDocument as apiUploadCompanyDocument, deleteCompanyDocument as apiDeleteCompanyDocument, getCompanyDocuments } from '../services/api';
import { validateGeoJSONWithSteps, validateAllPlotsWithSteps, ValidationResultWithSteps, PerPlotValidationResult } from '../utils/geojsonValidatorWithSteps';
import { GeoJSONPreview } from './GeoJSONPreview';

interface Producer {
  name: string;
  email?: string;
  countries: string[];
  fscCertificateNumber: string;
  fscCertificateFile?: File;
}

interface CompanyDocument {
  fileId?: string;
  fileName?: string;
  uploadedAt?: string;
  fileSize?: number;
  mimeType?: string;
}

interface CompanyDocuments {
  fscCertificateNumber?: string;
  fscCertificate?: CompanyDocument;
  businessLicense?: CompanyDocument;
  isoCertification?: CompanyDocument;
  laborHR?: CompanyDocument;
  sustainability?: CompanyDocument;
}

interface WoodOrigin {
  harvestDateStart: string;
  harvestDateEnd: string;
  geojsonFile?: File;
  geojsonData?: any;
  geojsonFileId?: string;
}

// Countries data with flags
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' }
];

export default function NewDDSForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    invoiceId: '',
    commodityType: '',
    quantityOfPulpMT: '',
    fscCertificateNumber: ''
  });
  const [producers, setProducers] = useState<Producer[]>([
    { name: '', email: '', countries: [], fscCertificateNumber: '', fscCertificateFile: undefined }
  ]);
  const [companyDocs, setCompanyDocs] = useState<CompanyDocuments>({});
  const [woodOrigins, setWoodOrigins] = useState<WoodOrigin[]>([
    { harvestDateStart: '', harvestDateEnd: '', geojsonFile: undefined, geojsonData: null }
  ]);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState<{ [key: number]: boolean }>({});
  const [countrySearch, setCountrySearch] = useState<{ [key: number]: string }>({});
  
  // GeoJSON validation state
  const [showGeoJSONPreview, setShowGeoJSONPreview] = useState(false);
  const [currentGeoJSONIndex, setCurrentGeoJSONIndex] = useState<number | null>(null);
  const [geoJSONValidationResults, setGeoJSONValidationResults] = useState<{ [key: number]: ValidationResultWithSteps }>({});
  const [validatedPlots, setValidatedPlots] = useState<{ [key: number]: string[] }>({});
  
  // Ref for debouncing FSC certificate number uploads
  const fscNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const steps = ['Basic Info', 'Sourcing', 'Company Documents', 'Location', 'Transaction', 'Review'];
  
  // Calculate progress based on actual completion, not just current step
  const calculateProgress = () => {
    let completedSteps = 0;
    
    // Step 0: Basic Info
    if (formData.invoiceId && formData.commodityType && formData.quantityOfPulpMT && formData.fscCertificateNumber) {
      completedSteps++;
    }
    
    // Step 1: Sourcing
    if (producers.length > 0 && producers.every(p => p.name && p.fscCertificateNumber && p.countries.length > 0)) {
      completedSteps++;
    }
    
    // Step 2: Company Documents
    if (companyDocs.fscCertificate && companyDocs.businessLicense) {
      completedSteps++;
    }
    
    // Step 3: Location (Wood Origins)
    if (woodOrigins.length > 0 && woodOrigins.every(wo => wo.harvestDateStart && wo.harvestDateEnd)) {
      completedSteps++;
    }
    
    // Steps 4-5: Transaction and Review are always available once previous steps are complete
    const implementedSteps = 6;
    const totalSteps = steps.length;
    const baseProgress = (completedSteps / implementedSteps) * (implementedSteps / totalSteps) * 100;
    const currentStepProgress = (currentStep / totalSteps) * 100;
    
    // Use the higher of the two to show meaningful progress
    return Math.max(baseProgress, currentStepProgress);
  };
  
  const progressPercentage = calculateProgress();

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Submit form to backend
  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      const user = getCurrentUser();
      if (!user?.user?.id) {
        showNotification('error', 'Please log in to submit the form');
        return;
      }

      // Prepare form data for submission
      const submissionData = {
        formData,
        producers,
        companyDocs,
        woodOrigins,
        geoJSONValidationResults,
        validatedPlots,
        submittedAt: new Date().toISOString(),
        userEmail: user.user.email,
        status: 'submitted'
      };

      // Submit to backend API with proper authentication
      const response = await fetch('http://localhost:18001/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          // Billing document number already exists
          throw new Error(result.message || 'Billing document number already exists for your account');
        } else if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        } else {
          throw new Error(result.message || 'Failed to submit form');
        }
      }

      setSubmissionId(result.submissionId);
      
      // Clear saved drafts after successful submission
      localStorage.removeItem(`dds_draft_${user.user.id}`);
      localStorage.removeItem(`dds_autosave_${user.user.id}`);
      
      // Show success modal
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Form submission error:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };



  // Save draft to localStorage
  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const user = getCurrentUser();
      if (!user?.user?.id) {
        showNotification('error', 'Please log in to save drafts');
        return;
      }

      const draftData = {
        formData,
        producers,
        companyDocs,
        woodOrigins,
        currentStep,
        savedAt: new Date().toISOString(),
        userId: user.user.id
      };
      
      // Save with user-specific key
      const draftKey = `dds_draft_${user.user.id}`;
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      showNotification('success', 'Draft saved successfully');
    } catch (error) {
      console.error('Save draft error:', error);
      showNotification('error', 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Auto-save form data to localStorage
  const autoSaveFormData = useCallback(() => {
    const user = getCurrentUser();
    if (!user?.user?.id) return;

    setAutoSaving(true);
    try {
      const autoSaveData = {
        formData,
        producers,
        companyDocs,
        woodOrigins,
        currentStep,
        lastAutoSave: new Date().toISOString(),
        userId: user.user.id
      };
      
      const autoSaveKey = `dds_autosave_${user.user.id}`;
      localStorage.setItem(autoSaveKey, JSON.stringify(autoSaveData));
      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setTimeout(() => setAutoSaving(false), 1000); // Show auto-save indicator for 1 second
    }
  }, [formData, producers, companyDocs, currentStep]);

  // Start fresh - clear all saved data
  const startFresh = () => {
    if (confirm('Are you sure you want to start fresh? This will clear all your current progress and saved drafts.')) {
      const user = getCurrentUser();
      if (user?.user?.id) {
        // Clear user-specific data
        localStorage.removeItem(`dds_draft_${user.user.id}`);
        localStorage.removeItem(`dds_autosave_${user.user.id}`);
      }
      
      // Reset all form state
      setFormData({
        invoiceId: '',
        commodityType: '',
        quantityOfPulpMT: '',
        fscCertificateNumber: ''
      });
      setProducers([
        { name: '', email: '', countries: [], fscCertificateNumber: '', fscCertificateFile: undefined }
      ]);
      setCompanyDocs({});
      setWoodOrigins([
        { harvestDateStart: '', harvestDateEnd: '', geojsonFile: undefined, geojsonData: null }
      ]);
      setCurrentStep(0);
      
      showNotification('success', 'Started fresh! All data cleared.');
    }
  };

  // Load draft on component mount
  useEffect(() => {
    const user = getCurrentUser();
    if (!user?.user?.id) return;

    // Try to load user-specific draft first
    const draftKey = `dds_draft_${user.user.id}`;
    const autoSaveKey = `dds_autosave_${user.user.id}`;
    
    const savedDraft = localStorage.getItem(draftKey);
    const autoSavedData = localStorage.getItem(autoSaveKey);
    
    // Prefer manual draft over auto-save
    const dataToLoad = savedDraft || autoSavedData;
    
    if (dataToLoad) {
      try {
        const draftData = JSON.parse(dataToLoad);
        
        // Verify the draft belongs to current user
        if (draftData.userId === user.user.id) {
          setFormData(draftData.formData || {
            invoiceId: '',
            commodityType: '',
            quantityOfPulpMT: '',
            fscCertificateNumber: ''
          });
          setProducers(draftData.producers || [
            { name: '', email: '', countries: [], fscCertificateNumber: '', fscCertificateFile: undefined }
          ]);
          setCompanyDocs(draftData.companyDocs || {});
          setWoodOrigins(draftData.woodOrigins || [
            { harvestDateStart: '', harvestDateEnd: '', geojsonFile: undefined, geojsonData: null }
          ]);
          setCurrentStep(draftData.currentStep || 0);
          
          const loadType = savedDraft ? 'Draft' : 'Auto-saved data';
          const loadTime = savedDraft ? draftData.savedAt : draftData.lastAutoSave;
          showNotification('success', `${loadType} loaded from ${new Date(loadTime).toLocaleString()}`);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        localStorage.removeItem(draftKey);
        localStorage.removeItem(autoSaveKey);
      }
    }
  }, []);

  // Auto-save effect - save data every 30 seconds when form has data
  useEffect(() => {
    const hasData = formData.invoiceId || formData.commodityType || formData.quantityOfPulpMT || 
                   formData.fscCertificateNumber || producers.some(p => p.name || p.fscCertificateNumber) ||
                   Object.keys(companyDocs).length > 0 || woodOrigins.some(wo => wo.harvestDateStart || wo.harvestDateEnd);
    
    if (hasData) {
      const autoSaveInterval = setInterval(() => {
        autoSaveFormData();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [formData, producers, companyDocs, woodOrigins, autoSaveFormData]);

  // Auto-save on form changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoSaveFormData();
    }, 2000); // Auto-save 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData, producers, companyDocs, woodOrigins, autoSaveFormData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.country-dropdown')) {
        setCountryDropdownOpen({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  // Upload company document
  const uploadCompanyDocument = async (documentType: string, file?: File, certificateNumber?: string) => {
    setUploading(prev => ({ ...prev, [documentType]: true }));

    try {
      const response = await apiUploadCompanyDocument(documentType, file, certificateNumber);

      if (response.success) {
        if (file && response.fileInfo) {
          setCompanyDocs(prev => ({
            ...prev,
            [documentType]: {
              fileId: response.fileInfo.fileId,
              fileName: response.fileInfo.fileName,
              fileSize: response.fileInfo.fileSize,
              mimeType: response.fileInfo.mimeType,
              uploadedAt: response.fileInfo.uploadedAt,
            }
          }));
        } else if (certificateNumber) {
          // For text-only uploads like FSC certificate number
          setCompanyDocs(prev => ({
            ...prev,
            fscCertificateNumber: certificateNumber
          }));
        }
        
        // Refresh company documents to ensure we have the latest data
        await loadCompanyDocuments();
        
        showNotification('success', response.message || 'Document uploaded successfully');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.response?.status === 401) {
        showNotification('error', 'Session expired. Please refresh the page and try again.');
      } else {
        showNotification('error', error.response?.data?.error || error.message || 'Failed to upload document');
      }
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  // Debounced FSC certificate number upload
  const debouncedFscNumberUpload = useCallback((value: string) => {
    if (fscNumberTimeoutRef.current) {
      clearTimeout(fscNumberTimeoutRef.current);
    }
    
    fscNumberTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        uploadCompanyDocument('fscCertificateNumber', undefined, value);
      }
    }, 1000); // Wait 1 second after user stops typing
  }, []);

  // Delete company document
  const deleteCompanyDocument = async (documentType: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await apiDeleteCompanyDocument(documentType);

      if (response.success) {
        setCompanyDocs(prev => ({
          ...prev,
          [documentType]: undefined
        }));
        showNotification('success', response.message || 'Document deleted successfully');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      if (error.response?.status === 401) {
        showNotification('error', 'Session expired. Please refresh the page and try again.');
      } else {
        showNotification('error', error.response?.data?.error || error.message || 'Failed to delete document');
      }
    }
  };

  // Load existing company documents
  const loadCompanyDocuments = useCallback(async () => {
    try {
      const response = await getCompanyDocuments();

      if (response.success && response.data) {
        setCompanyDocs(response.data);
      }
    } catch (error: any) {
      console.error('Error loading company documents:', error);
      // Don't show error notification for failed load - it's okay if user hasn't uploaded any documents yet
      // Only log the error for debugging
      if (error.response?.status !== 401) {
        console.warn('Failed to load company documents:', error.message);
      }
    }
  }, []);

  useEffect(() => {
    loadCompanyDocuments();
  }, [loadCompanyDocuments]);

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(formData.invoiceId && 
                 formData.commodityType && 
                 formData.quantityOfPulpMT && 
                 formData.fscCertificateNumber);
      case 1: // Sourcing
        return producers.length > 0 && 
               producers.every(p => p.name && 
                                   p.fscCertificateNumber && 
                                   p.countries.length > 0);
      case 2: // Company Documents
        return !!(companyDocs.fscCertificate && 
                 companyDocs.businessLicense);
      case 3: // Location
        return woodOrigins.length > 0 && 
               woodOrigins.every(wo => {
                 if (!wo.harvestDateStart || !wo.harvestDateEnd) return false;
                 const dateErrors = validateDates(wo.harvestDateStart, wo.harvestDateEnd);
                 return dateErrors.length === 0;
               });
      case 4: // Transaction
        return true; // Transaction is just a summary, always allow proceed
      case 5: // Review
        return true; // Review is final step
      default:
        return true;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  // Date validation functions
  const validateDates = (startDate: string, endDate: string) => {
    const errors: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!startDate || !endDate) {
      return errors;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if start date is after end date
    if (start > end) {
      errors.push('Harvest start date cannot be after harvest end date');
    }
    
    // Check if dates are in the future
    if (start > today) {
      errors.push('Harvest start date cannot be in the future');
    }
    
    if (end > today) {
      errors.push('Harvest end date cannot be in the future');
    }
    
    // Check if dates are too far in the past (more than 10 years)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    
    if (start < tenYearsAgo) {
      errors.push('Harvest start date cannot be more than 10 years ago');
    }
    
    return errors;
  };

  // GeoJSON validation functions
  const validateGeoJSON = (geojsonData: any, index: number) => {
    const validationResult = validateGeoJSONWithSteps(geojsonData);
    setGeoJSONValidationResults(prev => ({
      ...prev,
      [index]: validationResult
    }));
    return validationResult;
  };

  const handleGeoJSONUpload = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojsonData = JSON.parse(e.target?.result as string);
        const newOrigins = [...woodOrigins];
        newOrigins[index].geojsonFile = file;
        newOrigins[index].geojsonData = geojsonData;
        setWoodOrigins(newOrigins);
        
        // Validate the GeoJSON
        const validationResult = validateGeoJSON(geojsonData, index);
        
        if (validationResult.isValid) {
          showNotification('success', `GeoJSON file "${file.name}" loaded and validated successfully`);
        } else {
          showNotification('error', `GeoJSON file has validation errors. Click "Validate & Preview" to see details.`);
        }
      } catch (error) {
        showNotification('error', 'Invalid GeoJSON file format');
      }
    };
    reader.readAsText(file);
  };

  const openGeoJSONPreview = (index: number) => {
    const origin = woodOrigins[index];
    if (origin.geojsonData) {
      setCurrentGeoJSONIndex(index);
      setShowGeoJSONPreview(true);
    }
  };

  const handleGeoJSONValidation = (selectedPlots: any[]) => {
    if (currentGeoJSONIndex !== null) {
      const plotIds = selectedPlots.map(plot => plot.properties?.plot_ID || plot.properties?.Survey_ID || 'Unknown');
      setValidatedPlots(prev => ({
        ...prev,
        [currentGeoJSONIndex]: plotIds
      }));
      showNotification('success', `${selectedPlots.length} plots validated successfully`);
    }
    setShowGeoJSONPreview(false);
    setCurrentGeoJSONIndex(null);
  };

  const handleGeoJSONReplace = (file: File, geojsonData: any) => {
    if (currentGeoJSONIndex !== null) {
      handleGeoJSONUpload(file, currentGeoJSONIndex);
    }
  };

  const FileUploadCard = ({ 
    id, 
    label, 
    required = false, 
    document, 
    documentType,
    onUpload,
    onDelete,
    uploading = false 
  }: {
    id: string;
    label: string;
    required?: boolean;
    document?: CompanyDocument;
    documentType: string;
    onUpload: (file: File) => Promise<void>;
    onDelete: () => void;
    uploading?: boolean;
  }) => (
    <div className="space-y-3">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      {!document ? (
        <div 
          className="group border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer relative overflow-hidden"
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploading) {
              const input = window.document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
              input.style.display = 'none';
              
              input.onchange = async (e: Event) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (file) {
                  try {
                    await onUpload(file);
                  } catch (error) {
                    console.error('Upload failed:', error);
                  }
                }
                if (input.parentNode) {
                  input.parentNode.removeChild(input);
                }
              };
              
              window.document.body.appendChild(input);
              input.click();
            }
          }}
        >
          <div className="p-8 text-center">
            {uploading ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-blue-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-700">Uploading document...</p>
                  <p className="text-xs text-slate-500">Please wait while we process your file</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-200"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-slate-700">
                    <span className="text-blue-600 group-hover:text-blue-700 transition-colors">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-slate-500">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                  <div className="flex items-center justify-center space-x-2 mt-3">
                    <div className="flex space-x-1">
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">PDF</span>
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">DOC</span>
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">JPG</span>
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md font-medium">PNG</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-3 shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl blur opacity-30"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-emerald-900 truncate">{document.fileName}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-700">{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-emerald-600">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const input = window.document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
                  input.style.display = 'none';
                  input.onchange = async (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (file) {
                      try {
                        await onUpload(file);
                      } catch (error) {
                        console.error('Replace upload failed:', error);
                      }
                    }
                    if (input.parentNode) {
                      input.parentNode.removeChild(input);
                    }
                  };
                  window.document.body.appendChild(input);
                  input.click();
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors font-medium"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors font-medium"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCompanyDocuments = () => (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* FSC Certificate Number */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
        <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">FSC Certificate Number</CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Enter your company's FSC certificate number
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="max-w-lg mx-auto space-y-3">
            <Label htmlFor="fscNumber" className="text-slate-700 font-semibold">FSC Certificate Number *</Label>
            <Input
              id="fscNumber"
              placeholder="Enter your FSC certificate number (e.g., FSC-C123456)"
              value={companyDocs.fscCertificateNumber || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                setCompanyDocs(prev => ({ ...prev, fscCertificateNumber: value }));
                debouncedFscNumberUpload(value);
              }}
              className="h-12 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mandatory Documents */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
        <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-red-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">Mandatory Documents</CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Required company documents for compliance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <FileUploadCard
              id="fscFile"
              label="FSC Certificate File"
              required
              document={companyDocs.fscCertificate}
              documentType="fscCertificate"
              onUpload={(file) => uploadCompanyDocument('fscCertificate', file)}
              onDelete={() => deleteCompanyDocument('fscCertificate')}
              uploading={uploading['fscCertificate'] || false}
            />
            
            <FileUploadCard
              id="businessLicense"
              label="Business License"
              required
              document={companyDocs.businessLicense}
              documentType="businessLicense"
              onUpload={(file) => uploadCompanyDocument('businessLicense', file)}
              onDelete={() => deleteCompanyDocument('businessLicense')}
              uploading={uploading['businessLicense'] || false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Optional Documents */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
        <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-emerald-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">Optional Documents</CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Additional supporting documents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <FileUploadCard
              id="isoCert"
              label="ISO Certification"
              document={companyDocs.isoCertification}
              documentType="isoCertification"
              onUpload={(file) => uploadCompanyDocument('isoCertification', file)}
              onDelete={() => deleteCompanyDocument('isoCertification')}
              uploading={uploading['isoCertification'] || false}
            />
            
            <FileUploadCard
              id="laborHR"
              label="Labor & HR Documents"
              document={companyDocs.laborHR}
              documentType="laborHR"
              onUpload={(file) => uploadCompanyDocument('laborHR', file)}
              onDelete={() => deleteCompanyDocument('laborHR')}
              uploading={uploading['laborHR'] || false}
            />
            
            <FileUploadCard
              id="sustainability"
              label="Sustainability Documents"
              document={companyDocs.sustainability}
              documentType="sustainability"
              onUpload={(file) => uploadCompanyDocument('sustainability', file)}
              onDelete={() => deleteCompanyDocument('sustainability')}
              uploading={uploading['sustainability'] || false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSourcing = () => (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
      <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-green-50">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Producer Details</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Each producer must have their own FSC certificate number and information
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="space-y-8 max-w-5xl mx-auto">
          {producers.map((producer, index) => (
            <Card key={index} className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200 shadow-lg">
              <CardHeader className="border-b border-slate-200/50 py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-sm flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span>Producer {index + 1}</span>
                  </CardTitle>
                  {producers.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProducers(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-600 border-2 border-red-300 hover:bg-red-50 font-semibold rounded-lg"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="space-y-3">
                    <Label htmlFor={`producer-name-${index}`} className="text-slate-700 font-semibold">Producer Name *</Label>
                    <Input
                      id={`producer-name-${index}`}
                      placeholder="Enter producer company name"
                      value={producer.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newProducers = [...producers];
                        newProducers[index].name = e.target.value;
                        setProducers(newProducers);
                      }}
                      className="h-12 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor={`producer-email-${index}`} className="text-slate-700 font-semibold">Email Address</Label>
                    <Input
                      id={`producer-email-${index}`}
                      type="email"
                      placeholder="producer@company.com"
                      value={producer.email || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newProducers = [...producers];
                        newProducers[index].email = e.target.value;
                        setProducers(newProducers);
                      }}
                      className="h-12 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor={`producer-fsc-${index}`} className="text-slate-700 font-semibold">FSC Certificate Number *</Label>
                    <Input
                      id={`producer-fsc-${index}`}
                      placeholder="Enter producer's FSC certificate number"
                      value={producer.fscCertificateNumber}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newProducers = [...producers];
                        newProducers[index].fscCertificateNumber = e.target.value;
                        setProducers(newProducers);
                      }}
                      className="h-12 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-slate-700 font-semibold">Countries *</Label>
                    <div className="relative country-dropdown">
                      <div
                        onClick={() => {
                          setCountryDropdownOpen(prev => ({
                            ...prev,
                            [index]: !prev[index]
                          }));
                        }}
                        className="h-12 border-2 border-slate-200 rounded-xl focus:border-green-500 transition-all duration-200 shadow-sm bg-white cursor-pointer flex items-center justify-between px-4"
                      >
                        <div className="flex items-center flex-wrap gap-2">
                          {producer.countries.length > 0 ? (
                            producer.countries.map(countryCode => {
                              const country = COUNTRIES.find(c => c.code === countryCode);
                              return country ? (
                                <div key={countryCode} className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                                  <span>{country.flag}</span>
                                  <span>{country.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newProducers = [...producers];
                                      newProducers[index].countries = newProducers[index].countries.filter(c => c !== countryCode);
                                      setProducers(newProducers);
                                    }}
                                    className="ml-1 text-green-600 hover:text-green-800"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : null;
                            })
                          ) : (
                            <span className="text-slate-500">Select countries</span>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {countryDropdownOpen[index] && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                     <div className="p-3 border-b border-slate-200">
                             <input
                               type="text"
                               placeholder="Search countries..."
                               value={countrySearch[index] || ''}
                               className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-green-500"
                               onChange={(e) => {
                                 setCountrySearch(prev => ({
                                   ...prev,
                                   [index]: e.target.value
                                 }));
                               }}
                             />
                           </div>
                           <div className="py-1">
                             {COUNTRIES.filter(country => 
                               country.name.toLowerCase().includes((countrySearch[index] || '').toLowerCase())
                             ).map(country => {
                              const isSelected = producer.countries.includes(country.code);
                              return (
                                <div
                                  key={country.code}
                                  onClick={() => {
                                    const newProducers = [...producers];
                                    if (isSelected) {
                                      newProducers[index].countries = newProducers[index].countries.filter(c => c !== country.code);
                                    } else {
                                      newProducers[index].countries = [...newProducers[index].countries, country.code];
                                    }
                                    setProducers(newProducers);
                                  }}
                                  className={`px-4 py-3 cursor-pointer flex items-center space-x-3 hover:bg-slate-50 transition-colors ${
                                    isSelected ? 'bg-green-50 text-green-800' : 'text-slate-700'
                                  }`}
                                >
                                  <span className="text-xl">{country.flag}</span>
                                  <span className="font-medium">{country.name}</span>
                                  {isSelected && (
                                    <svg className="w-5 h-5 text-green-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 space-y-3">
                    <Label className="text-slate-700 font-semibold">FSC Certificate File (Optional)</Label>
                    <div className="relative">
                      <input
                        type="file"
                        id={`producer-fsc-file-${index}`}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const newProducers = [...producers];
                            newProducers[index].fscCertificateFile = file;
                            setProducers(newProducers);
                          }
                        }}
                        className="hidden"
                      />
                      <div 
                        onClick={() => document.getElementById(`producer-fsc-file-${index}`)?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all duration-200"
                      >
                        {producer.fscCertificateFile ? (
                          <div className="flex items-center justify-center space-x-3 text-green-600">
                            <div className="p-2 rounded-full bg-green-100">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold">{producer.fscCertificateFile.name}</p>
                              <p className="text-sm text-slate-600">Click to change file</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-3">
                            <div className="p-3 rounded-full bg-slate-100">
                              <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700">Click to Upload FSC Certificate</p>
                              <p className="text-sm text-slate-500">PDF, DOC, DOCX, JPG, JPEG, PNG</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            variant="outline"
            className="w-full h-16 border-dashed border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded-xl font-semibold text-lg transition-all duration-200"
            onClick={() => setProducers(prev => [...prev, { 
              name: '', 
              email: '', 
              countries: [], 
              fscCertificateNumber: '',
              fscCertificateFile: undefined
            }])}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Producer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderBasicInfo = () => (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
      <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Basic Information</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Complete your submission step by step
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-3">
            <Label htmlFor="invoiceId" className="text-slate-700 font-semibold">Billing Document Number *</Label>
            <Input
              id="invoiceId"
              placeholder="Enter billing document number"
              value={formData.invoiceId}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceId: e.target.value }))}
              className="h-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="commodityType" className="text-slate-700 font-semibold">Commodity Type *</Label>
            <select 
              className="w-full h-12 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm bg-white"
              value={formData.commodityType}
              onChange={(e) => setFormData(prev => ({ ...prev, commodityType: e.target.value }))}
            >
              <option value="">Select commodity type</option>
              <option value="pulp">Pulp</option>
              <option value="woodchips">Wood Chips</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="quantityOfPulpMT" className="text-slate-700 font-semibold">Quantity of Invoice in MT *</Label>
            <Input
              id="quantityOfPulpMT"
              type="number"
              placeholder="Enter quantity in metric tons"
              value={formData.quantityOfPulpMT}
              onChange={(e) => setFormData(prev => ({ ...prev, quantityOfPulpMT: e.target.value }))}
              className="h-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="fscCertificateNumber" className="text-slate-700 font-semibold">FSC Certificate Number *</Label>
            <Input
              id="fscCertificateNumber"
              placeholder="FSC-C123456"
              value={formData.fscCertificateNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, fscCertificateNumber: e.target.value }))}
              className="h-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLocation = () => (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
      <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-green-50">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Wood Origins & Location Data</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Provide harvest dates and geographic information for wood origins
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="space-y-8 max-w-5xl mx-auto">
          {woodOrigins.map((origin, index) => (
            <Card key={index} className="bg-gradient-to-r from-slate-50 to-green-50 border-2 border-slate-200 shadow-lg">
              <CardHeader className="border-b border-slate-200/50 py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-sm flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span>Wood Origin {index + 1}</span>
                  </CardTitle>
                  {woodOrigins.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWoodOrigins(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-600 border-2 border-red-300 hover:bg-red-50 font-semibold rounded-lg"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="space-y-3">
                    <Label htmlFor={`harvest-start-${index}`} className="text-slate-700 font-semibold">Harvest Start Date *</Label>
                    <Input
                      id={`harvest-start-${index}`}
                      type="date"
                      value={origin.harvestDateStart}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newOrigins = [...woodOrigins];
                        newOrigins[index].harvestDateStart = e.target.value;
                        setWoodOrigins(newOrigins);
                      }}
                      className="h-12 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor={`harvest-end-${index}`} className="text-slate-700 font-semibold">Harvest End Date *</Label>
                    <Input
                      id={`harvest-end-${index}`}
                      type="date"
                      value={origin.harvestDateEnd}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newOrigins = [...woodOrigins];
                        newOrigins[index].harvestDateEnd = e.target.value;
                        setWoodOrigins(newOrigins);
                      }}
                      className="h-12 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  {/* Date Validation Errors */}
                  {origin.harvestDateStart && origin.harvestDateEnd && (
                    (() => {
                      const dateErrors = validateDates(origin.harvestDateStart, origin.harvestDateEnd);
                      return dateErrors.length > 0 ? (
                        <div className="md:col-span-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                          <div className="flex items-start space-x-3">
                            <div className="rounded-full p-2 bg-red-100 flex-shrink-0">
                              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-red-800 font-semibold mb-2">Date Validation Errors:</p>
                              <ul className="text-sm text-red-700 space-y-1">
                                {dateErrors.map((error, i) => (
                                  <li key={i}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()
                  )}
                  
                  <div className="md:col-span-2 space-y-3">
                    <Label className="text-slate-700 font-semibold">GeoJSON File (Geographic Data)</Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-50/50 transition-all duration-200">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="p-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        {origin.geojsonFile ? (
                          <div className="text-center space-y-4">
                            <div>
                              <p className="text-lg font-semibold text-green-600 mb-2">✓ {origin.geojsonFile.name}</p>
                              <p className="text-sm text-slate-600">GeoJSON file uploaded successfully</p>
                            </div>
                            
                            {/* Validation Status */}
                            {geoJSONValidationResults[index] && (
                              <div className={`p-3 rounded-lg border ${
                                geoJSONValidationResults[index].isValid 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-center space-x-2 mb-2">
                                  {geoJSONValidationResults[index].isValid ? (
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  )}
                                  <span className={`font-semibold text-sm ${
                                    geoJSONValidationResults[index].isValid 
                                      ? 'text-green-800' 
                                      : 'text-red-800'
                                  }`}>
                                    {geoJSONValidationResults[index].isValid 
                                      ? 'GeoJSON Valid' 
                                      : `${geoJSONValidationResults[index].errors.length} Validation Errors`
                                    }
                                  </span>
                                </div>
                                {validatedPlots[index] && validatedPlots[index].length > 0 && (
                                  <p className="text-xs text-green-700">
                                    {validatedPlots[index].length} plots validated
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openGeoJSONPreview(index)}
                                disabled={!origin.geojsonData}
                                className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                              >
                                🔍 Validate & Preview
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.geojson,.json';
                                  input.onchange = (e: Event) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      handleGeoJSONUpload(file, index);
                                    }
                                  };
                                  input.click();
                                }}
                                className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
                              >
                                🔄 Replace File
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOrigins = [...woodOrigins];
                                  newOrigins[index].geojsonFile = undefined;
                                  newOrigins[index].geojsonData = null;
                                  setWoodOrigins(newOrigins);
                                  // Clear validation results
                                  setGeoJSONValidationResults(prev => {
                                    const newResults = { ...prev };
                                    delete newResults[index];
                                    return newResults;
                                  });
                                  setValidatedPlots(prev => {
                                    const newPlots = { ...prev };
                                    delete newPlots[index];
                                    return newPlots;
                                  });
                                }}
                                className="border-2 border-red-300 text-red-700 hover:bg-red-50 font-semibold"
                              >
                                🗑️ Remove File
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-lg font-semibold text-slate-700 mb-2">Upload GeoJSON File</p>
                            <p className="text-sm text-slate-600 mb-4">Drag and drop or click to select a GeoJSON file with geographic coordinates</p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.geojson,.json';
                                input.onchange = (e: Event) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    handleGeoJSONUpload(file, index);
                                  }
                                };
                                input.click();
                              }}
                              className="border-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold rounded-xl px-6 py-3"
                            >
                              Select GeoJSON File
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setWoodOrigins(prev => [...prev, { harvestDateStart: '', harvestDateEnd: '', geojsonFile: undefined, geojsonData: null }])}
              className="border-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold rounded-xl px-6 py-3"
            >
              + Add Another Wood Origin
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTransaction = () => (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
      <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Transaction Summary</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Review your transaction details before final submission
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Invoice ID:</span>
                <p className="text-lg font-semibold text-slate-800">{formData.invoiceId || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Commodity Type:</span>
                <p className="text-lg font-semibold text-slate-800">{formData.commodityType || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Quantity:</span>
                <p className="text-lg font-semibold text-slate-800">{formData.quantityOfPulpMT ? `${formData.quantityOfPulpMT} MT` : 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-600">FSC Certificate:</span>
                <p className="text-lg font-semibold text-slate-800">{formData.fscCertificateNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Producers ({producers.length})</h3>
            <div className="space-y-3">
              {producers.map((producer, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-sm font-medium text-slate-600">Name:</span>
                      <p className="font-semibold text-slate-800">{producer.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">FSC Certificate:</span>
                      <p className="font-semibold text-slate-800">{producer.fscCertificateNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Countries:</span>
                      <p className="font-semibold text-slate-800">{producer.countries.join(', ') || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Wood Origins ({woodOrigins.length})</h3>
            <div className="space-y-3">
              {woodOrigins.map((origin, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-sm font-medium text-slate-600">Harvest Start:</span>
                      <p className="font-semibold text-slate-800">{origin.harvestDateStart || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Harvest End:</span>
                      <p className="font-semibold text-slate-800">{origin.harvestDateEnd || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">GeoJSON:</span>
                      <p className="font-semibold text-slate-800">{origin.geojsonFile ? '✓ Uploaded' : 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReview = () => (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
      <CardHeader className="border-b border-slate-200/50 py-6 bg-gradient-to-r from-slate-50 to-emerald-50">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Final Review & Submission</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Review all information and submit your EUDR Due Diligence Statement
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border-2 border-emerald-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">✓ Submission Ready</h3>
            <p className="text-slate-600 mb-4">
              Your EUDR Due Diligence Statement is complete and ready for submission. 
              Please review all the information carefully before proceeding.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-slate-800">Basic Information</span>
                </div>
                <p className="text-sm text-slate-600">Invoice, commodity, quantity, and FSC certificate details</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-slate-800">Producer Details</span>
                </div>
                <p className="text-sm text-slate-600">{producers.length} producer(s) with FSC certificates</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-slate-800">Company Documents</span>
                </div>
                <p className="text-sm text-slate-600">Required documents uploaded and verified</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-slate-800">Location Data</span>
                </div>
                <p className="text-sm text-slate-600">{woodOrigins.length} wood origin(s) with harvest dates</p>
              </div>
            </div>
            
            {/* Submit button removed - using main navigation Submit button instead */}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderBasicInfo();
      case 1: return renderSourcing();
      case 2: return renderCompanyDocuments();
      case 3: return renderLocation();
      case 4: return renderTransaction();
      case 5: return renderReview();
      default: 
        return (
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center space-y-6">
                  <div className="p-4 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 text-slate-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Section Coming Soon</h3>
                  <p className="text-slate-600 text-lg">This section will be available in the next update.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

      return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
        <div className="flex justify-center">
          <div className="max-w-5xl w-full px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Notification */}
          {notification && (
            <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border backdrop-blur-sm ${
              notification.type === 'success' 
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' 
                : 'bg-red-50/90 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`rounded-full p-2 ${
                  notification.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {notification.type === 'success' ? (
                    <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold">{notification.message}</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="relative">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl shadow-blue-900/10">
              <CardHeader className="border-b border-slate-200/50 py-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-3xl font-bold text-white mb-2">
                    EUDR Due Diligence Statement
                  </CardTitle>
                  <CardDescription className="text-blue-100 text-lg">
                    European Union Deforestation Regulation Compliance Documentation
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Progress */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
            <CardContent className="pt-8 pb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Progress</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-slate-600">Completion</div>
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-sm">
                    {Math.round(progressPercentage)}%
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3 mb-8 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              <div className="grid grid-cols-6 gap-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300 ${
                      index < currentStep ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-200' : 
                      index === currentStep ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-200' : 
                      'bg-slate-200 text-slate-500 shadow-slate-200'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className={`text-xs text-center mt-3 font-medium ${
                      index <= currentStep ? 'text-slate-800' : 'text-slate-500'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Step Content */}
          {renderCurrentStep()}

          {/* Navigation */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl shadow-slate-900/10">
            <CardContent className="pt-8 pb-8">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl shadow-md transition-all duration-200"
                >
                  ← Previous
                </Button>
                
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={saveDraft}
                    disabled={savingDraft}
                    className="px-6 py-3 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-semibold rounded-xl shadow-md transition-all duration-200"
                  >
                    {savingDraft ? (
                      <div className="flex items-center space-x-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </div>
                    ) : 'Save Draft'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={startFresh}
                    className="px-6 py-3 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-semibold rounded-xl shadow-md transition-all duration-200"
                  >
                    🗑️ Start Fresh
                  </Button>
                  
                  <div className="text-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                    <div className="text-sm text-slate-600 font-medium">Step {currentStep + 1} of {steps.length}</div>
                    <div className="font-bold text-slate-800">{steps[currentStep]}</div>
                    {(autoSaving || lastAutoSave) && (
                      <div className="mt-2 flex items-center justify-center space-x-1 text-xs">
                        {autoSaving ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-blue-600">Auto-saving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-600">
                              Auto-saved {lastAutoSave?.toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    if (currentStep === steps.length - 1) {
                      submitForm();
                    } else {
                      setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
                    }
                  }}
                  disabled={!canProceedToNext() || isSubmitting}
                  className={`px-6 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                    canProceedToNext() && !isSubmitting
                      ? currentStep === steps.length - 1 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-200' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    currentStep === steps.length - 1 ? '✅ Submit' : 'Next →'
                  )}
                </Button>
              </div>
              
              {!canProceedToNext() && (
                <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="rounded-full p-2 bg-red-100 flex-shrink-0">
                      <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-red-800 font-semibold mb-2">Please complete all required fields:</p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {currentStep === 0 && (
                          <>
                            {!formData.invoiceId && <li>• Billing Document Number</li>}
                            {!formData.commodityType && <li>• Commodity Type</li>}
                            {!formData.quantityOfPulpMT && <li>• Quantity of Invoice in MT</li>}
                            {!formData.fscCertificateNumber && <li>• FSC Certificate Number</li>}
                          </>
                        )}
                        {currentStep === 1 && (
                          <>
                            {producers.length === 0 && <li>• At least one producer is required</li>}
                            {producers.map((producer, index) => (
                              <div key={index}>
                                {!producer.name && <li>• Producer {index + 1}: Name</li>}
                                {!producer.fscCertificateNumber && <li>• Producer {index + 1}: FSC Certificate Number</li>}
                                {producer.countries.length === 0 && <li>• Producer {index + 1}: Countries</li>}
                              </div>
                            ))}
                          </>
                        )}
                        {currentStep === 2 && (
                          <>
                            {!companyDocs.fscCertificate && <li>• FSC Certificate document</li>}
                            {!companyDocs.businessLicense && <li>• Business License document</li>}
                          </>
                        )}
                        {currentStep === 3 && (
                          <>
                            {woodOrigins.length === 0 && <li>• At least one wood origin is required</li>}
                            {woodOrigins.map((origin, index) => (
                              <div key={index}>
                                {!origin.harvestDateStart && <li>• Wood Origin {index + 1}: Harvest Start Date</li>}
                                {!origin.harvestDateEnd && <li>• Wood Origin {index + 1}: Harvest End Date</li>}
                                {origin.harvestDateStart && origin.harvestDateEnd && (
                                  (() => {
                                    const dateErrors = validateDates(origin.harvestDateStart, origin.harvestDateEnd);
                                    return dateErrors.map((error, i) => (
                                      <li key={`date-${i}`}>• Wood Origin {index + 1}: {error}</li>
                                    ));
                                  })()
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

      {/* GeoJSON Preview Modal */}
      {showGeoJSONPreview && currentGeoJSONIndex !== null && woodOrigins[currentGeoJSONIndex]?.geojsonData && (
        <GeoJSONPreview
          geojsonData={woodOrigins[currentGeoJSONIndex].geojsonData}
          onValidate={handleGeoJSONValidation}
          onClose={() => {
            setShowGeoJSONPreview(false);
            setCurrentGeoJSONIndex(null);
          }}
          onReset={() => {
            if (currentGeoJSONIndex !== null) {
              const newOrigins = [...woodOrigins];
              newOrigins[currentGeoJSONIndex].geojsonFile = undefined;
              newOrigins[currentGeoJSONIndex].geojsonData = null;
              setWoodOrigins(newOrigins);
              // Clear validation results
              setGeoJSONValidationResults(prev => {
                const newResults = { ...prev };
                delete newResults[currentGeoJSONIndex];
                return newResults;
              });
              setValidatedPlots(prev => {
                const newPlots = { ...prev };
                delete newPlots[currentGeoJSONIndex];
                return newPlots;
              });
            }
            setShowGeoJSONPreview(false);
            setCurrentGeoJSONIndex(null);
          }}
          onGeoJsonReplace={handleGeoJSONReplace}
              fileName={currentGeoJSONIndex !== null && currentGeoJSONIndex >= 0 ? woodOrigins[currentGeoJSONIndex]?.geojsonFile?.name : undefined}
        />
      )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
                <div className="text-center">
                  {/* Animated Green Tick */}
                  <div className="mx-auto flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
                    <svg 
                      className="w-10 h-10 text-green-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={3} 
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    🎉 Form Submitted Successfully!
                  </h2>
                  
                  <p className="text-gray-600 mb-2">
                    Your EUDR Due Diligence Statement has been submitted and saved to our secure database.
                  </p>
                  
                  {submissionId && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-green-800 font-medium">
                        Submission ID: <span className="font-mono">{submissionId}</span>
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <p className="font-medium text-blue-800">Backed up to Azure Cloud</p>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your data has been securely stored in Microsoft Azure with enterprise-grade security.
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => {
                        setShowSuccessModal(false);
                        // Reset form for new submission
                        setFormData({
                          invoiceId: '',
                          commodityType: '',
                          quantityOfPulpMT: '',
                          fscCertificateNumber: ''
                        });
                        setProducers([
                          { name: '', email: '', countries: [], fscCertificateNumber: '', fscCertificateFile: undefined }
                        ]);
                        setCompanyDocs({});
                        setWoodOrigins([
                          { harvestDateStart: '', harvestDateEnd: '', geojsonFile: undefined, geojsonData: null }
                        ]);
                        setCurrentStep(0);
                      }}
                      className="flex-1 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ✨ Start New Form
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSuccessModal(false);
                        // Stay on review page
                      }}
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      📋 Stay Here
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
    </div>
  );
}