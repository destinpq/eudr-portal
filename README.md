# EUDR Pulp Portal 🌲

A comprehensive web application for **EU Deforestation Regulation (EUDR)** compliance, specifically designed for pulp and wood products companies to manage Due Diligence Statements (DDS).

## 🎯 Purpose

This portal helps companies comply with the EU Deforestation Regulation by providing a streamlined platform to:
- Create and submit Due Diligence Statements (DDS)
- Manage supplier information and FSC certificates
- Upload and validate GeoJSON files for wood origin tracking
- Store and retrieve historical submissions
- Generate PDF reports and download document packages

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Node.js API   │    │ Azure Storage   │
│  (Frontend UI)  │───▶│   (Backend)     │───▶│ Tables + Blobs  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: React.js with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express.js
- **Storage**: Azure Table Storage + Azure Blob Storage
- **Authentication**: JWT-based authentication
- **File Management**: Azure Blob Storage for documents and GeoJSON files

## ✨ Features

### 🔐 **Authentication & User Management**
- Secure user registration and login
- JWT-based authentication
- Admin portal for user management
- Role-based access control

### 📋 **DDS Form Management**
- Multi-step form wizard for DDS creation
- Real-time form validation
- Auto-save and draft functionality
- Billing document number duplicity checking

### 📊 **Document Management**
- Upload company documents (FSC certificates, business licenses)
- File validation and storage
- Document versioning and replacement
- Bulk document downloads

### 🌍 **GeoJSON Processing**
- GeoJSON file upload and validation
- Interactive map preview
- Area and point validation
- Plot selection and verification

### 📈 **Reporting & Downloads**
- PDF generation for submissions
- ZIP download containing all documents
- Historical submission tracking
- Advanced filtering and search

### 👥 **Admin Features**
- User management dashboard
- Document review and approval
- System analytics and monitoring
- Bulk operations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Azure subscription
- Azure CLI (for deployment)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/eudr-portal.git
cd eudr-portal
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.azure .env  # Copy and configure environment variables
npm start           # Starts on port 18001
```

### 3. Frontend Setup
```bash
cd pulp-portal
npm install
npm start           # Starts on port 3000
```

### 4. Environment Configuration
Create `.env` file in the backend directory:
```env
# Server Configuration
PORT=18001
JWT_SECRET=your-super-secure-jwt-secret
NODE_ENV=development

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=your-azure-connection-string
AZURE_TABLE_USERS=Users
AZURE_TABLE_DOCUMENTS=PulpDocuments
AZURE_TABLE_COMPANY_DOCS=CompanyDocuments
AZURE_BLOB_CONTAINER=pulp-files

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## ☁️ Azure Deployment

### Automated Setup
```bash
# Make setup script executable
chmod +x setup-azure.sh

# Run automated Azure setup
./setup-azure.sh
```

### Manual Setup
Follow the detailed instructions in `AZURE_SETUP_GUIDE.md`

## 📁 Project Structure

```
EUDR_OG/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Authentication & validation
│   │   └── utils/          # Utilities and helpers
│   └── submissions/        # Local storage for submissions
├── pulp-portal/            # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API clients
│   │   └── utils/          # Frontend utilities
│   └── public/             # Static assets
├── docs/                   # Documentation
│   ├── AZURE_SETUP_GUIDE.md
│   └── azure-deployment-guide.md
└── setup-azure.sh          # Automated Azure setup
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Submissions
- `GET /api/submissions` - Get user submissions
- `POST /api/submissions` - Create new submission
- `GET /api/submissions/:id/pdf` - Download PDF summary
- `GET /api/submissions/:id/zip` - Download ZIP package

### Company Documents
- `GET /api/company-docs` - Get company documents
- `POST /api/company-docs/upload` - Upload document
- `DELETE /api/company-docs/:type` - Delete document

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/documents` - Get all documents
- `POST /api/admin/users` - Create user

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive server-side validation
- **File Type Validation**: Restricted file upload types
- **CORS Protection**: Configured for specific origins
- **Environment Secrets**: Sensitive data in environment variables
- **Azure Security**: Leverages Azure's built-in security features

## 📊 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for HTTP requests

### Backend
- **Node.js** with Express.js
- **Azure SDK** for storage operations
- **JWT** for authentication
- **Multer** for file uploads
- **Puppeteer** for PDF generation

### Storage
- **Azure Table Storage** for structured data
- **Azure Blob Storage** for file storage
- **Local JSON** for development/backup

## 💰 Cost Estimation

### Development Environment (~$15-25/month)
- Azure Storage Account: ~$2-5
- Azure App Service (B1): ~$13

### Production Environment (~$30-50/month)
- Azure Storage Account: ~$5-10
- Azure App Service (S1): ~$25-40

## 🐛 Troubleshooting

### Common Issues
1. **CORS Errors**: Check `FRONTEND_URL` in environment variables
2. **Storage Connection**: Verify Azure connection string
3. **File Upload Issues**: Check blob container permissions
4. **Authentication Errors**: Verify JWT secret configuration

### Debug Commands
```bash
# Check Azure storage
az storage account show --name "your-storage-account"

# List tables
az storage table list --account-name "your-storage-account"

# Check application logs
az webapp log tail --name "your-app-name"
```

## 📈 Monitoring

- **Application Insights**: Performance and error tracking
- **Azure Monitor**: Resource monitoring
- **Custom Logging**: Application-specific logs
- **Health Checks**: Regular service health verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation in `/docs`

## 🎉 Acknowledgments

- EU Deforestation Regulation compliance requirements
- Azure cloud platform
- Open source community
- FSC (Forest Stewardship Council) standards

---

**Built with ❤️ for EUDR compliance** 