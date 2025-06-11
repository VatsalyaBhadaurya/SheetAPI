const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

// Simple HTTP client for API calls
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// In-memory storage for active APIs and their data
let apiStorage = new Map();
let dataStorage = new Map();

// Load data.json if it exists
async function loadDataFile() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return empty array
        return [];
    }
}

// Save data to data.json
async function saveDataFile(data) {
    try {
        await fs.writeFile('data.json', JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving data.json:', error);
        return false;
    }
}

// Fetch data from Google Sheets
async function fetchGoogleSheetsData(spreadsheetId, range) {
    try {
        // For now, we'll skip the actual Google Sheets API call and use our data
        console.log('Google Sheets integration not configured, using local data');
        return getSampleData();
    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        // Return sample data if Google Sheets fetch fails
        return getSampleData();
    }
}

// Get sample data
function getSampleData() {
    return [
        {
            id: uuidv4(),
            "ID": "001",
            "Name": "John Doe",
            "Email": "john.doe@example.com",
            "Department": "Engineering",
            "Salary": "$75,000",
            "Join Date": "2023-01-15",
            "Status": "Active",
            "Location": "New York",
            "Manager": "Alice Johnson",
            "Skills": "JavaScript, Python, React"
        },
        {
            id: uuidv4(),
            "ID": "002",
            "Name": "Jane Smith", 
            "Email": "jane.smith@example.com",
            "Department": "Marketing",
            "Salary": "$68,000",
            "Join Date": "2023-03-22",
            "Status": "Active",
            "Location": "San Francisco",
            "Manager": "Bob Wilson",
            "Skills": "SEO, Content Marketing, Analytics"
        },
        {
            id: uuidv4(),
            "ID": "003",
            "Name": "Mike Johnson",
            "Email": "mike.johnson@example.com", 
            "Department": "Sales",
            "Salary": "$72,000",
            "Join Date": "2022-11-08",
            "Status": "Active",
            "Location": "Chicago",
            "Manager": "Carol Davis",
            "Skills": "CRM, Lead Generation, Negotiation"
        },
        {
            id: uuidv4(),
            "ID": "004",
            "Name": "Sarah Williams",
            "Email": "sarah.williams@example.com",
            "Department": "HR",
            "Salary": "$65,000", 
            "Join Date": "2023-02-14",
            "Status": "Active",
            "Location": "Austin",
            "Manager": "David Brown",
            "Skills": "Recruiting, Training, Compliance"
        },
        {
            id: uuidv4(),
            "ID": "005",
            "Name": "David Brown",
            "Email": "david.brown@example.com",
            "Department": "Engineering", 
            "Salary": "$82,000",
            "Join Date": "2022-09-30",
            "Status": "Active",
            "Location": "Seattle",
            "Manager": "Alice Johnson",
            "Skills": "Node.js, AWS, Docker"
        }
    ];
}

// Initialize data storage
async function initializeData() {
    let data = await loadDataFile();
    if (data.length === 0) {
        data = getSampleData();
        await saveDataFile(data);
    }
    dataStorage.set('default', data);
}

// API Routes

// Test route
app.get('/api/test', (req, res) => {
    console.log('GET /api/test - Request received');
    res.json({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString(),
        endpoint: '/api/test'
    });
});

// GET /api/data - Return all rows
app.get('/api/data', async (req, res) => {
    try {
        console.log('GET /api/data - Request received');
        const data = dataStorage.get('default') || await loadDataFile();
        console.log('Data loaded:', data.length, 'records');
        
        const response = {
            data: data,
            count: data.length,
            total: data.length,
            cached: false,
            generated_at: new Date().toISOString(),
            api_info: {
                name: "SheetAPI Data",
                version: "1.0",
                endpoint: "/api/data"
            }
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data', message: error.message });
    }
});

// GET /api/data/search?key=value - Filter rows
app.get('/api/data/search', async (req, res) => {
    try {
        const data = dataStorage.get('default') || await loadDataFile();
        const query = req.query;
        
        let filteredData = data;
        
        // Apply filters
        Object.keys(query).forEach(key => {
            if (key !== 'limit' && key !== 'offset') {
                filteredData = filteredData.filter(item => {
                    const value = item[key];
                    return value && value.toString().toLowerCase().includes(query[key].toLowerCase());
                });
            }
        });
        
        // Apply pagination
        const limit = parseInt(query.limit) || filteredData.length;
        const offset = parseInt(query.offset) || 0;
        const paginatedData = filteredData.slice(offset, offset + limit);
        
        res.json({
            data: paginatedData,
            count: paginatedData.length,
            total: filteredData.length,
            offset: offset,
            limit: limit,
            filters: query,
            cached: false,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error searching data:', error);
        res.status(500).json({ error: 'Failed to search data' });
    }
});

// POST /api/data - Add new row
app.post('/api/data', async (req, res) => {
    try {
        const data = dataStorage.get('default') || await loadDataFile();
        const newRow = {
            id: uuidv4(),
            ...req.body
        };
        
        data.push(newRow);
        dataStorage.set('default', data);
        await saveDataFile(data);
        
        res.status(201).json({
            message: 'Row added successfully',
            data: newRow,
            total: data.length
        });
    } catch (error) {
        console.error('Error adding row:', error);
        res.status(500).json({ error: 'Failed to add row' });
    }
});

// PUT /api/data/:id - Update row by ID
app.put('/api/data/:id', async (req, res) => {
    try {
        const data = dataStorage.get('default') || await loadDataFile();
        const rowId = req.params.id;
        const rowIndex = data.findIndex(row => row.id === rowId);
        
        if (rowIndex === -1) {
            return res.status(404).json({ error: 'Row not found' });
        }
        
        // Update row while preserving ID
        data[rowIndex] = {
            ...data[rowIndex],
            ...req.body,
            id: rowId // Ensure ID is not changed
        };
        
        dataStorage.set('default', data);
        await saveDataFile(data);
        
        res.json({
            message: 'Row updated successfully',
            data: data[rowIndex]
        });
    } catch (error) {
        console.error('Error updating row:', error);
        res.status(500).json({ error: 'Failed to update row' });
    }
});

// DELETE /api/data/:id - Delete row by ID
app.delete('/api/data/:id', async (req, res) => {
    try {
        const data = dataStorage.get('default') || await loadDataFile();
        const rowId = req.params.id;
        const rowIndex = data.findIndex(row => row.id === rowId);
        
        if (rowIndex === -1) {
            return res.status(404).json({ error: 'Row not found' });
        }
        
        const deletedRow = data.splice(rowIndex, 1)[0];
        dataStorage.set('default', data);
        await saveDataFile(data);
        
        res.json({
            message: 'Row deleted successfully',
            data: deletedRow,
            remaining: data.length
        });
    } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ error: 'Failed to delete row' });
    }
});

// Google Sheets data endpoint with actual API integration
app.get('/api/sheets/:spreadsheetId', async (req, res) => {
    try {
        const { spreadsheetId } = req.params;
        const { sheet = 'Sheet1', range = '' } = req.query;
        
        // Extract sheet ID from full URL if provided
        let extractedId = spreadsheetId;
        if (spreadsheetId.includes('docs.google.com')) {
            const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (match) {
                extractedId = match[1];
            }
        }

        const API_KEY = process.env.GOOGLE_API_KEY;
        if (!API_KEY) {
            throw new Error('Google API key not configured');
        }

        const sheetRange = range || `${sheet}!A:Z`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${extractedId}/values/${sheetRange}?key=${API_KEY}`;

        console.log('Fetching from Google Sheets API:', url);

        // Make HTTP request using Node.js built-in https module
        const sheetsData = await new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', chunk => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            reject(new Error(`Google Sheets API error: ${res.statusCode} ${res.statusMessage}`));
                            return;
                        }
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`Failed to parse Google Sheets response: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });
        });
        console.log('Raw sheets data:', sheetsData);

        if (!sheetsData.values || sheetsData.values.length === 0) {
            return res.json({
                data: [],
                count: 0,
                source: "Google Sheets API",
                lastUpdated: new Date().toISOString(),
                metadata: {
                    sheetId: extractedId,
                    sheetName: sheet,
                    spreadsheetTitle: "Google Sheet"
                }
            });
        }

        // Convert to JSON format (first row as headers)
        const headers = sheetsData.values[0];
        const rows = sheetsData.values.slice(1);
        
        const formattedData = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        const result = {
            data: formattedData,
            count: formattedData.length,
            source: "Google Sheets API",
            lastUpdated: new Date().toISOString(),
            metadata: {
                sheetId: extractedId,
                sheetName: sheet,
                spreadsheetTitle: sheetsData.range ? sheetsData.range.split('!')[0] : sheet
            }
        };

        res.json(result);

    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        res.status(500).json({
            error: 'Failed to fetch Google Sheets data',
            message: error.message,
            details: 'Make sure the sheet is publicly accessible or you have proper permissions'
        });
    }
});

// Legacy demo API routes for compatibility
app.get('/demo-api/index.html', async (req, res) => {
    const format = req.query.format;
    const apiId = req.query.id;
    
    try {
        let data = dataStorage.get('default') || await loadDataFile();
        
        // If specific API ID is requested, try to load that data
        if (apiId && dataStorage.has(apiId)) {
            data = dataStorage.get(apiId);
        }
        
        if (format === 'json') {
            res.json({
                data: data,
                count: data.length,
                total: data.length,
                cached: false,
                generated_at: new Date().toISOString(),
                api_info: {
                    name: "Sheet Data API",
                    version: "1.0",
                    endpoint: `/demo-api/index.html?id=${apiId}`
                }
            });
        } else {
            // Return HTML page
            res.sendFile(path.join(__dirname, 'demo-api', 'index.html'));
        }
    } catch (error) {
        console.error('Error in demo API:', error);
        res.status(500).json({ error: 'Failed to load API data' });
    }
});

// Store API configuration (for compatibility with existing frontend)
app.post('/api/store-config', (req, res) => {
    const apiId = uuidv4();
    const config = {
        ...req.body,
        id: apiId,
        created: Date.now()
    };
    
    apiStorage.set(apiId, config);
    
    // Initialize with sample data or try to fetch from Google Sheets
    if (config.spreadsheetId && config.sheetName) {
        fetchGoogleSheetsData(config.spreadsheetId, config.sheetName)
            .then(data => {
                dataStorage.set(apiId, data);
            })
            .catch(err => {
                console.error('Failed to fetch sheets data:', err);
                dataStorage.set(apiId, getSampleData());
            });
    } else {
        dataStorage.set(apiId, getSampleData());
    }
    
    res.json({
        success: true,
        apiId: apiId,
        endpoint: `${req.protocol}://${req.get('host')}/api/data`,
        testUrl: `${req.protocol}://${req.get('host')}/demo-api/index.html?id=${apiId}&format=json`
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        apis: apiStorage.size,
        dataRows: (dataStorage.get('default') || []).length
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        name: "SheetAPI REST API",
        version: "1.0.0",
        description: "Convert Google Sheets to REST API",
        endpoints: [
            {
                method: "GET",
                path: "/api/data",
                description: "Get all rows",
                example: `${req.protocol}://${req.get('host')}/api/data`
            },
            {
                method: "GET", 
                path: "/api/data/search",
                description: "Search and filter rows",
                parameters: ["key=value", "limit=10", "offset=0"],
                example: `${req.protocol}://${req.get('host')}/api/data/search?Department=Engineering&limit=5`
            },
            {
                method: "POST",
                path: "/api/data",
                description: "Add new row",
                body: "JSON object with row data"
            },
            {
                method: "PUT",
                path: "/api/data/:id",
                description: "Update row by ID",
                body: "JSON object with updated data"
            },
            {
                method: "DELETE",
                path: "/api/data/:id",
                description: "Delete row by ID"
            }
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Initialize and start server
async function startServer() {
    try {
        await initializeData();
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 API Endpoints:`);
            console.log(`   GET    http://localhost:${PORT}/api/test`);
            console.log(`   GET    http://localhost:${PORT}/api/data`);
            console.log(`   GET    http://localhost:${PORT}/api/data/search?key=value`);
            console.log(`   POST   http://localhost:${PORT}/api/data`);
            console.log(`   PUT    http://localhost:${PORT}/api/data/:id`);
            console.log(`   DELETE http://localhost:${PORT}/api/data/:id`);
            console.log(`📖 Documentation: http://localhost:${PORT}/api/docs`);
            console.log(`🎯 JSON Viewer: http://localhost:${PORT}/json-viewer.html`);
        });
        
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
                process.env.PORT = PORT + 1;
                startServer();
            } else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 