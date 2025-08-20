# Customer Portal

## Overview

The Customer Portal is a full-stack web application designed for secure document management and user administration. It features:
- **Node.js/Express Backend**: Handles authentication, user management, file uploads, and Azure Table/Blob Storage integration.
- **React Frontend**: Provides a modern, responsive UI for admins and customers to manage users, upload/download files, and view invoices.
- **Azure Integration**: Uses Azure Table Storage for user data and Azure Blob Storage for file storage.
- **Security**: Implements strong password policies, account lockout, password expiry, and history enforcement.

## Project Structure

```
customer-portal/
├── backend/         # Node.js/Express backend API
│   ├── src/
│   │   ├── controllers/   # Route handlers (auth, upload, etc.)
│   │   ├── middleware/    # Auth, error handling, etc.
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Azure Table/Blob logic
│   │   ├── utils/         # Password, JWT, helpers
│   │   └── scripts/       # Admin creation, setup scripts
│   ├── package.json
│   └── ...
├── frontend/        # React frontend
│   ├── src/
│   │   ├── components/    # UI components (admin, user, login, etc.)
│   │   ├── utils/         # Auth helpers
│   │   └── config.ts      # API URL config
│   ├── package.json
│   └── ...
├── azure-setup/     # PowerShell scripts for Azure resource automation
└── README.md        # This file
```

## Local Development Setup

### 1. Prerequisites
- **Node.js** (v16+ recommended)
- **npm** (v8+ recommended)
- **Azure Storage Account** (with Table and Blob Storage enabled)

### 2. Clone the Repository
```
git clone <repo-url>
cd customer-portal
```

### 3. Set Up Environment Variables

#### Backend (`customer-portal/backend/.env`)
Create a `.env` file in the `backend` directory with the following:
```
AZURE_STORAGE_CONNECTION_STRING="<your-azure-storage-connection-string>"
JWT_SECRET="<your-very-secure-jwt-secret>"
```
- Get the connection string from Azure Portal > Storage Account > Access keys.
- Use a strong, random value for `JWT_SECRET` (at least 32 characters).

#### Frontend
No `.env` is required for local development. The API URL is set to `http://localhost:4000` in `src/config.ts`.

### 4. Install Dependencies

#### Backend
```
cd backend
npm install
```

#### Frontend
```
cd ../frontend
npm install
```

### 5. Start the Applications

#### Start Backend (in one terminal)
```
cd backend
npm run dev
```
- The backend will run on `http://localhost:4000`.

#### Start Frontend (in another terminal)
```
cd frontend
npm start
```
- The frontend will run on `http://localhost:3000`.

### 6. Create the Initial Admin User

You must create an admin user before logging in:

1. **Run the admin creation script:**
   ```
   cd backend
   npx ts-node src/scripts/create-admin.ts
   ```
   - This will generate a secure admin password and create the user in Azure Table Storage.
   - The script will print the admin username and password. **Save these credentials!**

2. **Login as Admin:**
   - Go to `http://localhost:3000` and log in with the admin credentials.

### 7. Permissions & Usage
- **Admin users** can manage users, upload files, and view all mappings.
- **Customer users** can view and download their own invoices.
- Password policies, expiry, and lockout are enforced automatically.

### 8. Azure Resource Automation (Optional)
- Use the scripts in `azure-setup/` to automate resource creation and cleanup if you have the required Azure permissions.
- See `azure-setup/README.md` for details.

### 9. Troubleshooting
- Ensure both backend and frontend are running on the correct ports.
- Check `.env` values if you see connection/auth errors.
- For CORS issues, make sure all API calls use the local URL (`http://localhost:4000`).
- If you change the admin password policy, update both backend and frontend logic.

---

**For any issues, check the backend and frontend terminal logs for detailed error messages.** 