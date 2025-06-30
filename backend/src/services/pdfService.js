/**
 * PDF Service
 * 
 * Handles PDF generation for document summaries and reports
 */

const puppeteer = require('puppeteer');
const { logger } = require("../utils/logger");

/**
 * Generates HTML content for document PDF
 * @param {Object} document - Document data
 * @returns {string} HTML content
 */
function generateDocumentHTML(document) {
  const producers = JSON.parse(document.producers || '[]');
  const woodOrigins = JSON.parse(document.woodOrigins || '[]');
  const wood = JSON.parse(document.wood || '[]');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>EUDR Document Summary - ${document.invoiceId}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .section {
          background: #f8f9fa;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .section h2 {
          color: #667eea;
          margin-top: 0;
          font-size: 20px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 10px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .field {
          margin-bottom: 10px;
        }
        .field-label {
          font-weight: bold;
          color: #495057;
          margin-bottom: 5px;
        }
        .field-value {
          background: white;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
        .producer-item, .wood-item {
          background: white;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }
        .countries {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }
        .country-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
          font-size: 12px;
        }
        .metadata {
          background: #e9ecef;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .no-data {
          color: #6c757d;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>EUDR Document Summary</h1>
        <p>European Union Deforestation Regulation Compliance Document</p>
      </div>

      <div class="metadata">
        <div class="metadata-grid">
          <div>
            <strong>Document ID:</strong><br>
            ${document.rowKey || 'N/A'}
          </div>
          <div>
            <strong>Created:</strong><br>
            ${new Date(document.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div>
            <strong>Customer:</strong><br>
            ${document.username || 'N/A'}
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📋 Basic Information</h2>
        <div class="grid">
          <div class="field">
            <div class="field-label">Invoice/Billing Document Number</div>
            <div class="field-value">${document.invoiceId || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Commodity Type</div>
            <div class="field-value">${document.commodityType || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Quantity (MT)</div>
            <div class="field-value">${document.quantityOfPulpMT || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">FSC Certificate Number</div>
            <div class="field-value">${document.fscCertificateNumber || 'N/A'}</div>
          </div>
        </div>
        ${document.pulpCommodityType ? `
          <div class="field">
            <div class="field-label">Pulp Commodity Type</div>
            <div class="field-value">${document.pulpCommodityType}</div>
          </div>
        ` : ''}
        ${document.otherPulpType ? `
          <div class="field">
            <div class="field-label">Other Pulp Type</div>
            <div class="field-value">${document.otherPulpType}</div>
          </div>
        ` : ''}
      </div>

      <div class="section">
        <h2>🌳 Wood Species Information</h2>
        ${wood.length > 0 ? wood.map((w, index) => `
          <div class="wood-item">
            <div class="grid">
              <div class="field">
                <div class="field-label">Common Name</div>
                <div class="field-value">${w.commonName || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">Scientific Name</div>
                <div class="field-value">${w.scientificName || 'N/A'}</div>
              </div>
            </div>
          </div>
        `).join('') : '<div class="no-data">No wood species information provided</div>'}
      </div>

      <div class="section">
        <h2>🏭 Producers Information</h2>
        ${producers.length > 0 ? producers.map((producer, index) => `
          <div class="producer-item">
            <h3 style="margin-top: 0; color: #495057;">Producer ${index + 1}</h3>
            <div class="grid">
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">${producer.name || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value">${producer.email || 'N/A'}</div>
              </div>
            </div>
            <div class="field">
              <div class="field-label">Countries of Operation</div>
              <div class="countries">
                ${producer.countries && producer.countries.length > 0 
                  ? producer.countries.map(country => `<span class="country-tag">${country}</span>`).join('')
                  : '<span class="no-data">No countries specified</span>'
                }
              </div>
            </div>
          </div>
        `).join('') : '<div class="no-data">No producer information provided</div>'}
      </div>

      <div class="section">
        <h2>📍 Wood Origins Information</h2>
        ${woodOrigins.length > 0 ? woodOrigins.map((origin, index) => `
          <div class="producer-item">
            <h3 style="margin-top: 0; color: #495057;">Origin ${index + 1}</h3>
            <div class="grid">
              <div class="field">
                <div class="field-label">Harvest Start Date</div>
                <div class="field-value">${origin.harvestDateStart || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">Harvest End Date</div>
                <div class="field-value">${origin.harvestDateEnd || 'N/A'}</div>
              </div>
            </div>
            ${origin.geojsonFileId ? `
              <div class="field">
                <div class="field-label">GeoJSON Data</div>
                <div class="field-value">📁 Geographic data attached (File ID: ${origin.geojsonFileId})</div>
              </div>
            ` : ''}
          </div>
        `).join('') : '<div class="no-data">No wood origin information provided</div>'}
      </div>

      <div class="footer">
        <p>This document was generated automatically from the EUDR Pulp Portal</p>
        <p>Generated on: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })}</p>
        <p><strong>Note:</strong> This summary contains document details only. Uploaded files are not included in this PDF.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates PDF from document data
 * @param {Object} document - Document data
 * @returns {Buffer} PDF buffer
 */
async function generateDocumentPDF(document) {
  let browser;
  
  try {
    logger.info("Starting PDF generation", {
      docId: document.rowKey,
      invoiceId: document.invoiceId
    });

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content
    const html = generateDocumentHTML(document);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    logger.info("PDF generated successfully", {
      docId: document.rowKey,
      pdfSize: pdf.length
    });

    return pdf;
  } catch (error) {
    logger.error("PDF generation failed", {
      error: error.message,
      docId: document?.rowKey,
      stack: error.stack
    });
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generateDocumentPDF,
  generateDocumentHTML
}; 