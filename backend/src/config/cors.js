/**
 * CORS Configuration
 * 
 * Centralized configuration for Cross-Origin Resource Sharing
 */

const corsOptions = {
  origin: [
    'http://localhost:17000',
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://pulp-portal-frontend-gjbaf4azd4e8edha.southindia-01.azurewebsites.net'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 