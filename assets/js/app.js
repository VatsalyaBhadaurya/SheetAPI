// Main application logic for SheetAPI
class SheetAPIApp {
    constructor() {
        this.currentSheetData = null;
        this.currentAPIEndpoint = null;
        this.examples = {
            curl: '',
            javascript: '',
            python: ''
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupGoogleAPI();
        this.loadUserAPIs();
    }

    bindEvents() {
        // Main converter flow
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeSheet();
        });

        document.getElementById('sheet-selector').addEventListener('change', (e) => {
            if (e.target.value) {
                this.showStep(4);
                this.updateAPIName();
            }
        });

        document.getElementById('create-api-btn').addEventListener('click', () => {
            this.createAPI();
        });

        // Result actions
        document.getElementById('copy-endpoint').addEventListener('click', () => {
            this.copyEndpoint();
        });

        document.getElementById('test-api').addEventListener('click', () => {
            this.testAPI();
        });

        document.getElementById('view-data').addEventListener('click', () => {
            this.viewData();
        });

        document.getElementById('pretty-view').addEventListener('click', () => {
            this.openPrettyView();
        });

        document.getElementById('view-docs').addEventListener('click', () => {
            this.viewDocs();
        });

        document.getElementById('download-docs').addEventListener('click', () => {
            this.downloadAPIDocumentation();
        });

        document.getElementById('download-data').addEventListener('click', () => {
            this.downloadAPIData();
        });

        // Error handling
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.resetConverter();
        });

        // Example tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchExampleTab(e.target.dataset.tab);
            });
        });

        // URL input enter key
        document.getElementById('sheet-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeSheet();
            }
        });

        // Auth button
        document.getElementById('auth-btn').addEventListener('click', () => {
            this.handleAuth();
        });

        // Quick Demo Events
        document.getElementById('quick-demo-btn').addEventListener('click', () => {
            this.createQuickDemo();
        });

        document.getElementById('copy-demo-endpoint').addEventListener('click', () => {
            this.copyDemoEndpoint();
        });

        document.getElementById('test-demo-browser').addEventListener('click', () => {
            this.testDemoInBrowser();
        });

        document.getElementById('test-demo-json').addEventListener('click', () => {
            this.testDemoJSON();
        });

        document.getElementById('demo-pretty-view').addEventListener('click', () => {
            this.openDemoPrettyView();
        });

        document.getElementById('open-dashboard').addEventListener('click', () => {
            window.open('/api-dashboard.html', '_blank');
        });

        document.getElementById('download-demo-docs').addEventListener('click', () => {
            this.downloadDemoDocumentation();
        });

        document.getElementById('download-demo-data').addEventListener('click', () => {
            this.downloadDemoData();
        });
    }

    async setupGoogleAPI() {
        try {
            await new Promise((resolve) => {
                if (window.gapi) {
                    resolve();
                } else {
                    window.gapiLoadCallback = resolve;
                }
            });

            gapi.load('auth2', () => {
                            gapi.auth2.init({
                client_id: '344168920273-oo5bue2eo1j1trt6jhj7thp5tl5fu4jq.apps.googleusercontent.com'
            });
            });

            gapi.load('client', () => {
                            gapi.client.init({
                apiKey: 'AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY',
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });
            });

        } catch (error) {
            console.error('Failed to initialize Google API:', error);
        }
    }

    async analyzeSheet() {
        const url = document.getElementById('sheet-url').value.trim();
        
        if (!url) {
            this.showError('Please enter a Google Sheets URL');
            return;
        }

        const spreadsheetId = this.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            this.showError('Invalid Google Sheets URL. Please make sure it\'s a valid Google Sheets link.');
            return;
        }

        this.setLoading('analyze-btn', true);
        this.hideError();

        try {
            // Fetch sheet metadata
            const sheetData = await this.fetchSheetMetadata(spreadsheetId);
            
            this.currentSheetData = {
                id: spreadsheetId,
                title: sheetData.properties.title,
                sheets: sheetData.sheets.map(sheet => ({
                    id: sheet.properties.sheetId,
                    title: sheet.properties.title,
                    index: sheet.properties.index
                })),
                url: url
            };

            this.displaySheetInfo();
            this.populateSheetSelector();
            this.showStep(2);
            this.showStep(3);

        } catch (error) {
            console.error('Error analyzing sheet:', error);
            let errorMessage = 'Failed to analyze the sheet. ';
            
            if (error.status === 403) {
                errorMessage += 'Please make sure the sheet is publicly accessible or you have permission to view it.';
            } else if (error.status === 404) {
                errorMessage += 'Sheet not found. Please check the URL.';
            } else {
                errorMessage += 'Please try again or check your internet connection.';
            }
            
            this.showError(errorMessage);
        } finally {
            this.setLoading('analyze-btn', false);
        }
    }

    async fetchSheetMetadata(spreadsheetId) {
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY`
        );

        if (!response.ok) {
            throw { status: response.status, message: response.statusText };
        }

        return await response.json();
    }

    extractSpreadsheetId(url) {
        const patterns = [
            /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
            /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/,
            /id=([a-zA-Z0-9-_]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    displaySheetInfo() {
        document.getElementById('sheet-title').textContent = this.currentSheetData.title;
        document.getElementById('sheet-id').textContent = this.currentSheetData.id;
        document.getElementById('sheet-count').textContent = `${this.currentSheetData.sheets.length} sheet(s)`;
    }

    populateSheetSelector() {
        const selector = document.getElementById('sheet-selector');
        selector.innerHTML = '<option value="">Select a sheet tab...</option>';
        
        this.currentSheetData.sheets.forEach(sheet => {
            const option = document.createElement('option');
            option.value = sheet.title;
            option.textContent = sheet.title;
            selector.appendChild(option);
        });
    }

    updateAPIName() {
        const apiNameInput = document.getElementById('api-name');
        const selectedSheet = document.getElementById('sheet-selector').value;
        
        if (!apiNameInput.value) {
            apiNameInput.value = `${this.currentSheetData.title} - ${selectedSheet} API`;
        }
    }

    async createAPI() {
        const selectedSheet = document.getElementById('sheet-selector').value;
        const apiName = document.getElementById('api-name').value || 'Untitled API';
        const enableFilters = document.getElementById('enable-filters').checked;
        const enablePagination = document.getElementById('enable-pagination').checked;
        const cacheDuration = parseInt(document.getElementById('cache-duration').value);

        if (!selectedSheet) {
            this.showError('Please select a sheet tab');
            return;
        }

        this.setLoading('create-api-btn', true);
        this.hideError();

        try {
            // Generate API endpoint
            const apiConfig = {
                spreadsheetId: this.currentSheetData.id,
                sheetName: selectedSheet,
                apiName: apiName,
                enableFilters: enableFilters,
                enablePagination: enablePagination,
                cacheDuration: cacheDuration,
                spreadsheetTitle: this.currentSheetData.title
            };

            // In a real implementation, this would call your backend API
            const apiEndpoint = await this.deployAPI(apiConfig);
            
            this.currentAPIEndpoint = apiEndpoint;
            this.generateExamples(apiEndpoint);
            this.showResult();
            
            // Store API for user
            await this.storeUserAPI(apiConfig, apiEndpoint);

        } catch (error) {
            console.error('Error creating API:', error);
            this.showError('Failed to create API. Please try again.');
        } finally {
            this.setLoading('create-api-btn', false);
        }
    }

    async deployAPI(config) {
        // Use local backend server to create real API endpoints
        try {
            const response = await fetch('http://localhost:3000/api/v1/apis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    spreadsheet_id: config.spreadsheetId,
                    sheet_name: config.sheetName,
                    api_name: config.apiName,
                    settings: {
                        enable_filters: config.enableFilters,
                        enable_pagination: config.enablePagination,
                        cache_duration: config.cacheDuration
                    },
                    metadata: {
                        spreadsheet_title: config.spreadsheetTitle
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API creation failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Return the local API endpoint
            return `http://localhost:3000/api/v1/${result.api_id}`;
            
        } catch (error) {
            console.warn('Backend not available, creating demo endpoint:', error.message);
            
            // Fallback to demo endpoint with working proxy
            const apiId = this.generateAPIId();
            
                         // Create a working demo endpoint with query parameter format
             const demoEndpoint = `http://localhost:3000/demo-api/?id=${apiId}`;
             
             // Store the config for the demo endpoint
             localStorage.setItem(`demo_api_${apiId}`, JSON.stringify(config));
             
             return demoEndpoint;
        }
    }

    generateAPIId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    generateExamples(endpoint) {
        const selectedSheet = document.getElementById('sheet-selector').value;
        const enableFilters = document.getElementById('enable-filters').checked;

        this.examples.curl = `# Get all data
curl "${endpoint}"

# Get with headers
curl -H "Accept: application/json" "${endpoint}"
${enableFilters ? `
# Filter data
curl "${endpoint}?name=John&limit=10"

# Pagination
curl "${endpoint}?offset=20&limit=10"` : ''}`;

        this.examples.javascript = `// Fetch all data
const response = await fetch('${endpoint}');
const data = await response.json();
console.log(data);
${enableFilters ? `
// With filters
const filtered = await fetch('${endpoint}?name=John&limit=10');
const filteredData = await filtered.json();

// Using URLSearchParams
const params = new URLSearchParams({
  name: 'John',
  limit: 10
});
const url = '${endpoint}?' + params.toString();
const result = await fetch(url);` : ''}`;

        this.examples.python = `import requests

# Get all data
response = requests.get('${endpoint}')
data = response.json()
print(data)
${enableFilters ? `
# With filters
params = {'name': 'John', 'limit': 10}
response = requests.get('${endpoint}', params=params)
filtered_data = response.json()

# Using requests session
session = requests.Session()
session.headers.update({'Accept': 'application/json'})
result = session.get('${endpoint}')` : ''}`;

        // Set initial example
        this.switchExampleTab('curl');
    }

    switchExampleTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update example content
        document.getElementById('example-code').textContent = this.examples[tab];
    }

    async copyEndpoint() {
        try {
            await navigator.clipboard.writeText(this.currentAPIEndpoint);
            
            const btn = document.getElementById('copy-endpoint');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showError('Failed to copy to clipboard');
        }
    }

    async testAPI() {
        if (!this.currentAPIEndpoint) return;

        try {
            const response = await fetch(this.currentAPIEndpoint);
            const data = await response.json();
            
            // Open test results in new tab
            const testWindow = window.open('', '_blank');
            testWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>API Test Results</title>
                    <style>
                        body { font-family: 'Monaco', monospace; padding: 20px; background: #1e1e1e; color: #fff; }
                        pre { white-space: pre-wrap; line-height: 1.4; }
                        .status { color: #4CAF50; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="status">✅ Status: ${response.status} ${response.statusText}</div>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('API test failed:', error);
            this.showError('Failed to test API. Please check the endpoint.');
        }
    }

    viewData() {
        if (this.currentSheetData && this.currentSheetData.id) {
            // Open the JSON viewer with the actual sheet data
            const sheetParam = encodeURIComponent(this.currentSheetData.id);
            const selectedSheet = document.getElementById('sheet-selector').value;
            const sheetName = selectedSheet ? `&sheetName=${encodeURIComponent(selectedSheet)}` : '';
            window.open(`json-viewer.html?sheet=${sheetParam}${sheetName}`, '_blank');
        } else {
            this.showNotification('❌ Sheet data not available. Please create the API first.', 'error');
        }
    }

    openPrettyView() {
        if (this.currentSheetData && this.currentSheetData.id) {
            // Open the JSON viewer with the actual sheet data on the correct port
            const sheetParam = encodeURIComponent(this.currentSheetData.id);
            const selectedSheet = document.getElementById('sheet-selector').value;
            const sheetName = selectedSheet ? `&sheetName=${encodeURIComponent(selectedSheet)}` : '';
            const apiName = document.getElementById('api-name').value || this.currentSheetData.title;
            
            // Open pretty view with additional context
            const prettyViewUrl = `http://localhost:3000/json-viewer.html?sheet=${sheetParam}${sheetName}&title=${encodeURIComponent(apiName)}`;
            window.open(prettyViewUrl, '_blank');
            
            // Show success notification
            this.showNotification('✨ Opening Pretty View of your sheet data!', 'success');
        } else {
            this.showNotification('❌ Sheet data not available. Please analyze a sheet first.', 'error');
        }
    }

    viewDocs() {
        if (!this.currentAPIEndpoint) return;

        const selectedSheet = document.getElementById('sheet-selector').value;
        const enableFilters = document.getElementById('enable-filters').checked;
        const enablePagination = document.getElementById('enable-pagination').checked;

        const docs = this.generateAPIDocumentation({
            endpoint: this.currentAPIEndpoint,
            sheetName: selectedSheet,
            enableFilters: enableFilters,
            enablePagination: enablePagination
        });

        // Open documentation in new tab
        const docWindow = window.open('', '_blank');
        docWindow.document.write(docs);
    }

    /**
     * Generate and download API documentation as JSON file
     */
    downloadAPIDocumentation() {
        if (!this.currentAPIEndpoint) {
            alert('Please create an API first');
            return;
        }

        const selectedSheet = document.getElementById('sheet-selector').value;
        const enableFilters = document.getElementById('enable-filters').checked;
        const enablePagination = document.getElementById('enable-pagination').checked;

        const docData = this.generateAPIDocumentationJSON({
            endpoint: this.currentAPIEndpoint,
            sheetName: selectedSheet,
            enableFilters: enableFilters,
            enablePagination: enablePagination,
            spreadsheetTitle: this.currentSpreadsheetTitle
        });

        // Create downloadable JSON file
        const jsonString = JSON.stringify(docData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-documentation-${selectedSheet.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        this.showNotification('✅ API documentation JSON downloaded successfully!', 'success');
    }

    /**
     * Generate API documentation as JSON object
     */
    generateAPIDocumentationJSON(config) {
        const timestamp = new Date().toISOString();
        // Generate cleaner API endpoint URL
        const cleanEndpoint = config.endpoint.replace(/demo-api\/index\.html\?id=/, 'api/v1/');
        
        return {
            api_info: {
                name: `${config.spreadsheetTitle} - ${config.sheetName} API`,
                description: `REST API for ${config.sheetName} sheet data from ${config.spreadsheetTitle}`,
                base_url: cleanEndpoint.split('?')[0], // Remove query parameters for base URL
                endpoint: cleanEndpoint,
                version: "1.0.0",
                generated_at: timestamp,
                generated_by: "SheetAPI Converter"
            },
            endpoints: [
                {
                    method: "GET",
                    path: "/",
                    summary: "Get all data from the sheet",
                    description: "Retrieves all rows from the Google Sheet as JSON objects",
                    parameters: [],
                    example_request: {
                        url: cleanEndpoint,
                        method: "GET",
                        headers: {
                            "Accept": "application/json"
                        }
                    },
                    example_response: {
                        status: 200,
                        content_type: "application/json",
                        body: {
                            data: [
                                {
                                    "Column1": "Sample Value 1",
                                    "Column2": "Sample Value 2",
                                    "Column3": "Sample Value 3"
                                }
                            ],
                            count: 1,
                            total: 1,
                            sheet: config.sheetName,
                            spreadsheet: config.spreadsheetTitle,
                            cached: false,
                            generated_at: "2024-01-15T10:30:00Z"
                        }
                    },
                    curl_example: `curl -X GET "${cleanEndpoint}" -H "Accept: application/json"`
                },
                ...(config.enableFilters ? [{
                    method: "GET",
                    path: "/?[column]=[value]",
                    summary: "Filter data by column values",
                    description: "Filter sheet data using query parameters. Any column name can be used as a filter parameter.",
                    parameters: [
                        {
                            name: "[column_name]",
                            in: "query",
                            type: "string",
                            required: false,
                            description: "Filter by any column value (case-insensitive partial match)"
                        },
                        {
                            name: "limit",
                            in: "query",
                            type: "integer",
                            required: false,
                            description: "Maximum number of results to return",
                            default: 100
                        },
                        {
                            name: "offset",
                            in: "query",
                            type: "integer", 
                            required: false,
                            description: "Number of results to skip",
                            default: 0
                        }
                    ],
                    example_request: {
                        url: `${cleanEndpoint}?name=John&limit=10`,
                        method: "GET",
                        headers: {
                            "Accept": "application/json"
                        }
                    },
                    example_response: {
                        status: 200,
                        content_type: "application/json",
                        body: {
                            data: [
                                {
                                    "name": "John Doe",
                                    "email": "john@example.com",
                                    "age": "30"
                                }
                            ],
                            count: 1,
                            total: 1,
                            filtered: true,
                            filters_applied: {
                                "name": "John"
                            },
                            sheet: config.sheetName,
                            spreadsheet: config.spreadsheetTitle,
                            generated_at: "2024-01-15T10:30:00Z"
                        }
                    },
                    curl_example: `curl -X GET "${cleanEndpoint}?name=John&limit=10" -H "Accept: application/json"`
                }] : []),
                {
                    method: "POST",
                    path: "/",
                    summary: "Health check and API information",
                    description: "Returns API status and configuration information",
                    parameters: [],
                    example_request: {
                        url: cleanEndpoint,
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    },
                    example_response: {
                        status: 200,
                        content_type: "application/json",
                        body: {
                            status: "ok",
                            message: "API is running",
                            sheet: config.sheetName,
                            spreadsheet: config.spreadsheetTitle,
                            methods: ["GET"],
                            features: {
                                filtering: config.enableFilters,
                                pagination: config.enablePagination,
                                metadata: true
                            },
                            timestamp: "2024-01-15T10:30:00Z"
                        }
                    },
                    curl_example: `curl -X POST "${cleanEndpoint}" -H "Content-Type: application/json"`
                }
            ],
            rate_limits: {
                requests_per_hour: 1000,
                requests_per_minute: 60,
                note: "Rate limits may vary based on your Google Apps Script quotas"
            },
            error_responses: {
                "400": {
                    description: "Bad Request - Invalid parameters",
                    example: {
                        error: "Invalid parameter: limit must be a positive integer",
                        status: 400,
                        timestamp: "2024-01-15T10:30:00Z"
                    }
                },
                "403": {
                    description: "Forbidden - Sheet access denied",
                    example: {
                        error: "Access denied: Sheet is not publicly accessible",
                        status: 403,
                        timestamp: "2024-01-15T10:30:00Z"
                    }
                },
                "500": {
                    description: "Internal Server Error",
                    example: {
                        error: "Internal server error: Unable to fetch sheet data",
                        status: 500,
                        timestamp: "2024-01-15T10:30:00Z"
                    }
                }
            },
            integration_examples: {
                javascript: {
                    fetch: `fetch('${cleanEndpoint}')
  .then(response => response.json())
  .then(data => {
    console.log('Sheet data:', data.data);
    console.log('Total records:', data.total);
  })
  .catch(error => console.error('Error:', error));`,
                    axios: `axios.get('${cleanEndpoint}')
  .then(response => {
    const { data, total, count } = response.data;
    console.log('Records:', data);
    console.log(\`Showing \${count} of \${total} records\`);
  })
  .catch(error => console.error('Error:', error));`
                },
                python: {
                    requests: `import requests

response = requests.get('${cleanEndpoint}')
if response.status_code == 200:
    data = response.json()
    print(f"Found {data['total']} records")
    for row in data['data']:
        print(row)
else:
    print(f"Error: {response.status_code}")`,
                    urllib: `import urllib.request
import json

with urllib.request.urlopen('${cleanEndpoint}') as response:
    data = json.loads(response.read().decode())
    print(f"Sheet: {data['sheet']}")
    print(f"Records: {len(data['data'])}")`
                },
                curl: {
                    basic: `curl -X GET "${cleanEndpoint}"`,
                    with_headers: `curl -X GET "${cleanEndpoint}" \\
  -H "Accept: application/json" \\
  -H "User-Agent: MyApp/1.0"`,
                    ...(config.enableFilters ? {
                        with_filters: `curl -X GET "${cleanEndpoint}?name=John&age=25" \\
  -H "Accept: application/json"`
                    } : {})
                },
                php: `<?php
$response = file_get_contents('${cleanEndpoint}');
$data = json_decode($response, true);

if ($data) {
    echo "Found " . $data['total'] . " records\\n";
    foreach ($data['data'] as $row) {
        print_r($row);
    }
} else {
    echo "Error fetching data\\n";
}
?>`
            },
            notes: [
                "This API is powered by Google Apps Script and Google Sheets",
                "Data is fetched in real-time from the source spreadsheet",
                "The first row of the sheet is used as column headers",
                "Empty cells are returned as empty strings",
                "All data is returned as strings - parse numbers/dates as needed",
                config.enableFilters ? "Filtering supports partial, case-insensitive matches" : "Filtering is not enabled for this API",
                config.enablePagination ? "Pagination is available using limit and offset parameters" : "Pagination is not configured for this API"
            ],
            support: {
                documentation: "https://developers.google.com/apps-script/guides/web",
                google_sheets_api: "https://developers.google.com/sheets/api",
                created_with: "SheetAPI Converter - Convert Google Sheets to REST APIs"
            }
        };
    }

    async storeUserAPI(config, endpoint) {
        const apiData = {
            id: this.generateAPIId(),
            ...config,
            endpoint: endpoint,
            created: new Date().toISOString()
        };

        // Store in localStorage for now (in production, this would be in a database)
        const userAPIs = JSON.parse(localStorage.getItem('userAPIs') || '[]');
        userAPIs.push(apiData);
        localStorage.setItem('userAPIs', JSON.stringify(userAPIs));
    }

    loadUserAPIs() {
        // Load user's existing APIs
        const userAPIs = JSON.parse(localStorage.getItem('userAPIs') || '[]');
        console.log('User APIs:', userAPIs);
        // You could display these in a dashboard
    }

    showStep(stepNumber) {
        document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
    }

    showResult() {
        document.getElementById('result-section').classList.remove('hidden');
        document.getElementById('api-endpoint-url').value = this.currentAPIEndpoint;
        
        // Scroll to result
        document.getElementById('result-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-section').classList.remove('hidden');
        
        // Scroll to error
        document.getElementById('error-section').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    hideError() {
        document.getElementById('error-section').classList.add('hidden');
    }

    resetConverter() {
        // Reset all steps
        for (let i = 2; i <= 4; i++) {
            document.getElementById(`step-${i}`).classList.add('hidden');
        }
        
        // Reset result and error
        document.getElementById('result-section').classList.add('hidden');
        document.getElementById('error-section').classList.add('hidden');
        
        // Clear form
        document.getElementById('sheet-url').value = '';
        document.getElementById('api-name').value = '';
        
        // Reset data
        this.currentSheetData = null;
        this.currentAPIEndpoint = null;
    }

    setLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        const textSpan = button.querySelector('.btn-text');
        const loadingSpan = button.querySelector('.btn-loading');
        
        if (loading) {
            textSpan.classList.add('hidden');
            loadingSpan.classList.remove('hidden');
            button.disabled = true;
        } else {
            textSpan.classList.remove('hidden');
            loadingSpan.classList.add('hidden');
            button.disabled = false;
        }
    }

    async handleAuth() {
        // Handle Google OAuth authentication
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            if (authInstance.isSignedIn.get()) {
                await authInstance.signOut();
                document.getElementById('auth-btn').textContent = 'Sign In';
            } else {
                await authInstance.signIn();
                document.getElementById('auth-btn').textContent = 'Sign Out';
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showError('Authentication failed. Please try again.');
        }
    }

    // Quick Demo Methods
    async createQuickDemo() {
        this.setLoading('quick-demo-btn', true);
        
        try {
            // Create a test API configuration with sample Google Sheets data
            const apiId = this.generateAPIId();
            const config = {
                spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Sample public sheet
                sheetName: 'Class Data',
                apiName: `Demo API ${apiId.substring(0, 8)}`,
                spreadsheetTitle: 'Student Sample Data',
                enableFilters: true,
                enablePagination: true,
                enableCaching: false,
                created: Date.now()
            };

            // Store the configuration in localStorage
            localStorage.setItem(`demo_api_${apiId}`, JSON.stringify(config));
            
            // Create the endpoint URL in the correct format
            const endpoint = `http://localhost:3000/demo-api/index.html?id=${apiId}`;
            
            // Show the demo result
            this.showDemoResult(endpoint, apiId);
            
        } catch (error) {
            console.error('Quick demo error:', error);
            this.showError('Failed to create demo API. Please try again.');
        } finally {
            this.setLoading('quick-demo-btn', false);
        }
    }

    showDemoResult(endpoint, apiId) {
        // Show the demo result section
        const demoResult = document.getElementById('demo-result');
        const endpointInput = document.getElementById('demo-endpoint-url');
        const curlCommand = document.getElementById('demo-curl-command');
        
        endpointInput.value = endpoint;
        curlCommand.textContent = `curl "${endpoint}"`;
        
        demoResult.classList.remove('hidden');
        
        // Store current demo for buttons
        this.currentDemoEndpoint = endpoint;
        this.currentDemoId = apiId;
        
        // Scroll to result
        demoResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async copyDemoEndpoint() {
        const endpointInput = document.getElementById('demo-endpoint-url');
        
        try {
            await navigator.clipboard.writeText(endpointInput.value);
            
            // Show visual feedback
            const button = document.getElementById('copy-demo-endpoint');
            const originalText = button.textContent;
            button.textContent = '✅';
            button.style.background = '#4caf50';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
            
        } catch (error) {
            // Fallback - select the text
            endpointInput.select();
            endpointInput.setSelectionRange(0, 99999);
        }
    }

    testDemoInBrowser() {
        if (this.currentDemoEndpoint) {
            // Open the browser interface (HTML view)
            window.open(this.currentDemoEndpoint, '_blank');
        }
    }

    testDemoJSON() {
        if (this.currentDemoEndpoint) {
            // Open the JSON viewer with the demo data
            const sheetParam = encodeURIComponent('demo');
            window.open(`json-viewer.html?sheet=${sheetParam}`, '_blank');
        }
    }

    openDemoPrettyView() {
        // Open the pretty view with demo data
        const prettyViewUrl = `http://localhost:3000/json-viewer.html?sheet=demo&title=Demo%20Survey%20Data`;
        window.open(prettyViewUrl, '_blank');
        this.showNotification('✨ Opening Pretty View of demo data!', 'success');
    }

    /**
     * Download API documentation for demo API
     */
    downloadDemoDocumentation() {
        if (!this.currentDemoEndpoint) {
            alert('Please create a demo API first');
            return;
        }

        const docData = this.generateAPIDocumentationJSON({
            endpoint: this.currentDemoEndpoint,
            sheetName: 'Demo Survey Data',
            enableFilters: true,
            enablePagination: true,
            spreadsheetTitle: 'Sample Survey Responses'
        });

        // Create downloadable JSON file
        const jsonString = JSON.stringify(docData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'demo-api-documentation.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        this.showNotification('✅ Demo API documentation JSON downloaded successfully!', 'success');
    }

    /**
     * Download actual demo API data as JSON file
     */
    async downloadDemoData() {
        if (!this.currentDemoEndpoint) {
            alert('Please create a demo API first');
            return;
        }

        try {
            // Add format=json to force JSON response from demo API
            const jsonEndpoint = this.currentDemoEndpoint + '&format=json';
            
            // Fetch the actual data from the demo API
            const response = await fetch(jsonEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Demo API did not return JSON data. Please try refreshing the page.');
            }
            
            const data = await response.json();

            // Create downloadable JSON file with just the data
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = 'demo-api-data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Show success message
            this.showNotification('✅ Demo API data JSON downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error downloading demo data:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    /**
     * Download actual API data as JSON file
     */
    async downloadAPIData() {
        if (!this.currentAPIEndpoint) {
            alert('Please create an API first');
            return;
        }

        try {
            // Add format=json to force JSON response (for demo APIs)
            const jsonEndpoint = this.currentAPIEndpoint.includes('?') 
                ? this.currentAPIEndpoint + '&format=json'
                : this.currentAPIEndpoint + '?format=json';
            
            // Fetch the actual data from the API
            const response = await fetch(jsonEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('API did not return JSON data. Please check your API endpoint.');
            }
            
            const data = await response.json();

            // Create downloadable JSON file with just the data
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const selectedSheet = document.getElementById('sheet-selector').value;
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `api-data-${selectedSheet.toLowerCase().replace(/\s+/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Show success message
            this.showNotification('✅ API data JSON downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error downloading API data:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    /**
     * Show notification message to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: bold;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sheetAPIApp = new SheetAPIApp();
});

// Handle Google API load
window.gapiLoadCallback = () => {
    // API loaded callback
    console.log('Google API loaded');
}; 