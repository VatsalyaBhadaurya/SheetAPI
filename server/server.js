const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://sheets.googleapis.com", "https://www.googleapis.com"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', generalLimiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Test endpoint that the frontend calls
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        server: 'CORRECT_SERVER_WITH_SHEETS_API'
    });
});

// Sample data endpoint for demonstration
app.get('/api/data', async (req, res) => {
    try {
        // Sample data that looks like Google Sheets data
        const sampleData = {
            data: [
                {
                    "Name": "John Doe",
                    "Email": "john@example.com",
                    "Age": "28",
                    "Department": "Engineering",
                    "Salary": "$75000",
                    "Location": "New York"
                },
                {
                    "Name": "Jane Smith",
                    "Email": "jane@example.com",
                    "Age": "32",
                    "Department": "Marketing",
                    "Salary": "$68000",
                    "Location": "San Francisco"
                },
                {
                    "Name": "Mike Johnson",
                    "Email": "mike@example.com",
                    "Age": "29",
                    "Department": "Sales",
                    "Salary": "$72000",
                    "Location": "Chicago"
                },
                {
                    "Name": "Sarah Wilson",
                    "Email": "sarah@example.com",
                    "Age": "26",
                    "Department": "Design",
                    "Salary": "$65000",
                    "Location": "Austin"
                },
                {
                    "Name": "David Brown",
                    "Email": "david@example.com",
                    "Age": "35",
                    "Department": "Engineering",
                    "Salary": "$85000",
                    "Location": "Seattle"
                }
            ],
            count: 5,
            source: "Google Sheets API",
            lastUpdated: new Date().toISOString(),
            metadata: {
                sheetId: "1234567890",
                sheetName: "Employee Data",
                spreadsheetTitle: "Company Directory"
            }
        };

        res.json(sampleData);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({
            error: 'Failed to fetch data',
            message: error.message
        });
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

        const API_KEY = 'AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY'; // Your Google API key
        const sheetRange = range || `${sheet}!A:Z`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${extractedId}/values/${sheetRange}?key=${API_KEY}`;

        console.log('Fetching from Google Sheets API:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
        }

        const sheetsData = await response.json();
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

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// API documentation endpoint
app.get('/docs', (req, res) => {
    res.json({
        name: 'SheetAPI',
        version: '1.0.0',
        description: 'Convert Google Sheets to REST APIs',
        endpoints: {
            'GET /api/test': 'Test server connection',
            'GET /api/data': 'Get sample data',
            'GET /api/sheets/:spreadsheetId': 'Get Google Sheets data',
            'GET /health': 'Health check',
            'GET /docs': 'API documentation'
        },
        usage: {
            'Sample': 'GET /api/data',
            'Google Sheets': 'GET /api/sheets/your-sheet-id?sheet=Sheet1',
            'Full URL': 'GET /api/sheets/https://docs.google.com/spreadsheets/d/your-sheet-id'
        }
    });
});

// Error handling middleware
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: ['/api/test', '/api/data', '/api/sheets/:id', '/health', '/docs']
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 SheetAPI server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/docs`);
    console.log(`🧪 Test connection: http://localhost:${PORT}/api/test`);
    console.log(`📊 Sample data: http://localhost:${PORT}/api/data`);
});

module.exports = app; 