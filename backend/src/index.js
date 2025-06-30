/**
 * Pulp Portal Backend Server
 *
 * Main server entry point with modular architecture
 * - Server setup and configuration
 * - Middleware setup
 * - Route registration
 * - Error handling
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Import configurations
const corsOptions = require("./config/cors");

// Import routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const companyDocsRoutes = require("./routes/companyDocs");
const documentRoutes = require("./routes/documents");
const fileRoutes = require("./routes/files");
const submissionsRoutes = require("./routes/submissions");

// Import middleware
const { logger } = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 18001;

// Middleware setup
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.logRequest(req);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/company-docs", companyDocsRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/submissions", submissionsRoutes);

// Legacy route support (for backward compatibility)
app.use("/api/submit", (req, res) => {
  res.redirect(307, "/api/documents/submit");
});

app.use("/api/upload", (req, res) => {
  res.redirect(307, "/api/files/upload");
});

app.use("/api/download", (req, res) => {
  const fileId = req.params.fileId || req.query.fileId;
  if (fileId) {
    res.redirect(307, `/api/files/download/${fileId}`);
  } else {
    res.status(400).json({ error: "File ID required" });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error("Unhandled error", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" 
      ? "Internal server error" 
      : error.message
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// Server startup
app.listen(PORT, () => {
  logger.info("Server started successfully", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
