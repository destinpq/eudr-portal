import React, { useState, useEffect } from 'react';
import { isAuthenticated, extendSession } from '../services/authService';

interface SessionStatusProps {
  className?: string;
}

const SessionStatus: React.FC<SessionStatusProps> = ({ className = "" }) => {
  const [showExtendButton, setShowExtendButton] = useState(false);
  const [sessionExtended, setSessionExtended] = useState(false);

  useEffect(() => {
    const checkSessionStatus = () => {
      if (isAuthenticated()) {
        setShowExtendButton(true);
      } else {
        setShowExtendButton(false);
      }
    };

    checkSessionStatus();
    
    // Listen for auth state changes
    window.addEventListener('authStateChange', checkSessionStatus);
    
    return () => {
      window.removeEventListener('authStateChange', checkSessionStatus);
    };
  }, []);

  const handleExtendSession = () => {
    extendSession();
    setSessionExtended(true);
    setTimeout(() => setSessionExtended(false), 3000); // Show feedback for 3 seconds
  };

  if (!showExtendButton) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Session Active</span>
      </div>
      
      <button
        onClick={handleExtendSession}
        className={`text-sm px-3 py-1 rounded-md transition-all duration-200 ${
          sessionExtended
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
        }`}
        disabled={sessionExtended}
      >
        {sessionExtended ? (
          <span className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Extended</span>
          </span>
        ) : (
          'Extend Session'
        )}
      </button>
    </div>
  );
};

export default SessionStatus; 