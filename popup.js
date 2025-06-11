// Main popup script for Sheets to API converter
class SheetsToAPIConverter {
    constructor() {
        this.spreadsheetData = null;
        this.selectedSheet = null;
        this.accessToken = null;
        this.apiEndpoint = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkCurrentTab();
    }

    bindEvents() {
        // Step 1: Detect sheet
        document.getElementById('detect-sheet').addEventListener('click', () => {
            this.detectSheet();
        });

        // Step 2: Sheet selection
        document.getElementById('sheet-tabs').addEventListener('change', (e) => {
            this.selectedSheet = e.target.value;
            if (this.selectedSheet) {
                this.showStep(3);
            }
        });

        // Step 4: Create API
        document.getElementById('create-api').addEventListener('click', () => {
            this.createAPI();
        });

        // Result actions
        document.getElementById('copy-endpoint').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('api-endpoint').value);
        });

        document.getElementById('test-api').addEventListener('click', () => {
            this.testAPI();
        });

        document.getElementById('view-docs').addEventListener('click', () => {
            this.viewDocs();
        });

        document.getElementById('reset').addEventListener('click', () => {
            this.reset();
        });
    }

    async checkCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url && tab.url.includes('docs.google.com/spreadsheets')) {
                // Auto-detect if we're on a Google Sheets page
                setTimeout(() => this.detectSheet(), 1000);
            }
        } catch (error) {
            console.error('Error checking current tab:', error);
        }
    }

    async detectSheet() {
        this.showLoading(true);
        this.hideError();

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('docs.google.com/spreadsheets')) {
                throw new Error('Please open a Google Sheets tab first');
            }

            // Send message to content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectSheet' });
            
            if (!response.success) {
                throw new Error(response.error || 'Failed to detect sheet');
            }

            this.spreadsheetData = response.data;
            this.displaySheetInfo();
            this.populateSheetTabs();
            this.showStep(2);

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displaySheetInfo() {
        document.getElementById('sheet-title').textContent = this.spreadsheetData.title;
        document.getElementById('sheet-id').textContent = this.spreadsheetData.spreadsheetId;
        document.getElementById('sheet-info').classList.remove('hidden');
    }

    populateSheetTabs() {
        const select = document.getElementById('sheet-tabs');
        select.innerHTML = '<option value="">Select a sheet tab...</option>';
        
        this.spreadsheetData.tabs.forEach(tab => {
            const option = document.createElement('option');
            option.value = tab.name;
            option.textContent = tab.name;
            select.appendChild(option);
        });
    }

    async createAPI() {
        this.showLoading(true);
        this.hideError();

        try {
            // Get OAuth token
            await this.authenticate();

            // Get configuration
            const apiName = document.getElementById('api-name').value || 
                           `${this.spreadsheetData.title} API`;
            const includeFilters = document.getElementById('include-filters').checked;
            const generateDocs = document.getElementById('generate-docs').checked;

            // Create Apps Script project
            const projectId = await this.createAppsScriptProject(apiName);

            // Generate and upload code
            await this.uploadAppsScriptCode(projectId, includeFilters);

            // Deploy as web app
            const deploymentId = await this.deployWebApp(projectId);

            // Get the public URL
            this.apiEndpoint = `https://script.google.com/macros/s/${deploymentId}/exec`;

            // Generate documentation if requested
            if (generateDocs) {
                await this.generateDocumentation();
            }

            this.showResult();

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    this.accessToken = token;
                    resolve(token);
                }
            });
        });
    }

    async createAppsScriptProject(title) {
        const response = await fetch('https://script.googleapis.com/v1/projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                parentId: this.spreadsheetData.spreadsheetId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create Apps Script project');
        }

        const project = await response.json();
        return project.scriptId;
    }

    async uploadAppsScriptCode(projectId, includeFilters) {
        const code = this.generateAppsScriptCode(includeFilters);
        
        const response = await fetch(`https://script.googleapis.com/v1/projects/${projectId}/content`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: [
                    {
                        name: 'Code',
                        type: 'SERVER_JS',
                        source: code
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to upload Apps Script code');
        }

        return await response.json();
    }

    generateAppsScriptCode(includeFilters) {
        const sheetName = this.selectedSheet;
        const spreadsheetId = this.spreadsheetData.spreadsheetId;

        return `
// Auto-generated Google Apps Script API for: ${this.spreadsheetData.title}
// Sheet: ${sheetName}
// Generated by Sheets to API Chrome Extension

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById('${spreadsheetId}').getSheetByName('${sheetName}');
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ data: [], count: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    const rows = data.slice(1);
    
    let result = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    ${includeFilters ? this.generateFilterCode() : ''}

    // Add metadata
    const response = {
      data: result,
      count: result.length,
      sheet: '${sheetName}',
      spreadsheet: '${this.spreadsheetData.title}',
      timestamp: new Date().toISOString(),
      headers: headers
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Internal server error: ' + error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Health check endpoint
function doPost(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'API is running',
      sheet: '${sheetName}',
      methods: ['GET']
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
    }

    generateFilterCode() {
        return `
    // Apply query parameter filters
    const params = e.parameter;
    
    if (params && Object.keys(params).length > 0) {
      result = result.filter(row => {
        return Object.keys(params).every(key => {
          if (key === 'limit' || key === 'offset') return true;
          
          const value = row[key];
          const filterValue = params[key];
          
          if (value === undefined || value === null) return false;
          
          // Case-insensitive string matching
          return value.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      });
    }

    // Handle pagination
    const limit = parseInt(params.limit) || result.length;
    const offset = parseInt(params.offset) || 0;
    
    if (offset > 0 || limit < result.length) {
      const total = result.length;
      result = result.slice(offset, offset + limit);
      response.pagination = {
        total: total,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < total
      };
    }
`;
    }

    async deployWebApp(projectId) {
        const response = await fetch(`https://script.googleapis.com/v1/projects/${projectId}/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                versionNumber: 1,
                manifestFileName: 'appsscript',
                description: 'Auto-generated API deployment'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to deploy web app');
        }

        const deployment = await response.json();
        return deployment.deploymentId;
    }

    async generateDocumentation() {
        const docs = this.createAPIDocumentation();
        
        // Store documentation in chrome storage for later access
        await chrome.storage.local.set({
            [`docs_${this.spreadsheetData.spreadsheetId}_${this.selectedSheet}`]: docs
        });
    }

    createAPIDocumentation() {
        const baseUrl = this.apiEndpoint;
        const sheetName = this.selectedSheet;
        
        return {
            title: `${this.spreadsheetData.title} - ${sheetName} API`,
            baseUrl: baseUrl,
            description: `REST API for ${sheetName} sheet data`,
            endpoints: [
                {
                    method: 'GET',
                    path: '',
                    description: 'Get all data from the sheet',
                    parameters: [],
                    example: `${baseUrl}`,
                    response: {
                        data: [{ example: 'Row data as objects' }],
                        count: 'number',
                        sheet: sheetName,
                        timestamp: 'ISO date string'
                    }
                },
                {
                    method: 'GET',
                    path: '?column=value',
                    description: 'Filter data by column values',
                    parameters: [
                        { name: 'limit', type: 'number', description: 'Limit results' },
                        { name: 'offset', type: 'number', description: 'Skip results' },
                        { name: '[column]', type: 'string', description: 'Filter by any column' }
                    ],
                    example: `${baseUrl}?name=John&limit=10`,
                    response: 'Same as GET with filtered data'
                }
            ],
            generated: new Date().toISOString()
        };
    }

    showResult() {
        // Hide all steps
        document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));
        
        // Show result
        document.getElementById('result').classList.remove('hidden');
        
        // Populate result data
        document.getElementById('api-endpoint').value = this.apiEndpoint;
        
        const examples = `
# Get all data
GET ${this.apiEndpoint}

# Filter by column
GET ${this.apiEndpoint}?name=John

# Pagination
GET ${this.apiEndpoint}?limit=10&offset=20

# Multiple filters
GET ${this.apiEndpoint}?status=active&category=tech
        `.trim();
        
        document.getElementById('api-examples').textContent = examples;
    }

    async testAPI() {
        try {
            const response = await fetch(this.apiEndpoint);
            const data = await response.json();
            
            // Open a new tab with formatted JSON
            const testWindow = window.open('', '_blank');
            testWindow.document.write(`
                <pre style="font-family: monospace; padding: 20px;">
                    ${JSON.stringify(data, null, 2)}
                </pre>
            `);
        } catch (error) {
            this.showError('Failed to test API: ' + error.message);
        }
    }

    async viewDocs() {
        try {
            const result = await chrome.storage.local.get(
                `docs_${this.spreadsheetData.spreadsheetId}_${this.selectedSheet}`
            );
            
            const docs = result[`docs_${this.spreadsheetData.spreadsheetId}_${this.selectedSheet}`];
            
            if (docs) {
                // Create a documentation page
                const docWindow = window.open('', '_blank');
                docWindow.document.write(this.generateDocumentationHTML(docs));
            } else {
                this.showError('Documentation not found');
            }
        } catch (error) {
            this.showError('Failed to load documentation');
        }
    }

    generateDocumentationHTML(docs) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>${docs.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .endpoint { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .method { background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        pre { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; overflow-x: auto; }
        code { font-family: 'Monaco', 'Menlo', monospace; }
    </style>
</head>
<body>
    <h1>${docs.title}</h1>
    <p>${docs.description}</p>
    <p><strong>Base URL:</strong> <code>${docs.baseUrl}</code></p>
    
    <h2>Endpoints</h2>
    ${docs.endpoints.map(endpoint => `
        <div class="endpoint">
            <h3><span class="method">${endpoint.method}</span> ${endpoint.path}</h3>
            <p>${endpoint.description}</p>
            <p><strong>Example:</strong></p>
            <pre><code>${endpoint.example}</code></pre>
            ${endpoint.parameters.length > 0 ? `
                <p><strong>Parameters:</strong></p>
                <ul>
                    ${endpoint.parameters.map(param => `
                        <li><code>${param.name}</code> (${param.type}) - ${param.description}</li>
                    `).join('')}
                </ul>
            ` : ''}
        </div>
    `).join('')}
    
    <p><em>Generated on ${new Date(docs.generated).toLocaleString()}</em></p>
</body>
</html>
        `;
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Show feedback
            const btn = document.getElementById('copy-endpoint');
            const originalText = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (error) {
            this.showError('Failed to copy to clipboard');
        }
    }

    reset() {
        // Reset all data
        this.spreadsheetData = null;
        this.selectedSheet = null;
        this.apiEndpoint = null;
        
        // Reset UI
        document.getElementById('result').classList.add('hidden');
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index === 0) {
                step.classList.remove('hidden');
            } else {
                step.classList.add('hidden');
            }
        });
        
        // Clear forms
        document.getElementById('api-name').value = '';
        document.getElementById('sheet-tabs').innerHTML = '<option value="">Select a sheet tab...</option>';
        document.getElementById('sheet-info').classList.add('hidden');
        
        this.hideError();
    }

    showStep(stepNumber) {
        // Hide all steps except the current one and previous ones
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index < stepNumber) {
                step.classList.remove('hidden');
            } else if (index === stepNumber) {
                step.classList.remove('hidden');
            }
        });

        // Auto-populate API name if not set
        if (stepNumber === 3) {
            const apiNameInput = document.getElementById('api-name');
            if (!apiNameInput.value && this.spreadsheetData) {
                apiNameInput.value = `${this.spreadsheetData.title} - ${this.selectedSheet} API`;
            }
            this.showStep(4);
        }
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        document.getElementById('error-message').textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }
}

// Initialize the converter when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new SheetsToAPIConverter();
}); 