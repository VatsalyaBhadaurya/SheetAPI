const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for development
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
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

// Static files for frontend (serve from parent directory)
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

// Basic API endpoints for development
app.get('/api/test', (req, res) => {
    res.json({
        message: 'SheetAPI backend is running!',
        timestamp: new Date().toISOString()
    });
});

// Survey data endpoint
app.get('/api/survey-data', (req, res) => {
    const surveyData = [
        {
            "Timestamp": "01/06/2021 13:08:26",
            "Name ": "Vatsalya Bhdaurya",
            "When you buy some item, do you insist on a bill?": "Sometimes",
            "Do you keep the bill carefully?": "Sometimes",
            "If you realise that you have been tricked by the shopkeeper, have you bothered to complain to him/her?": "Always",
            "Have you been able to convince him/her that you've been-cheated?": "Sometimes",
            "Do you simply grumble to yourself reconciling that it is your fate that you are often being victimised so and it is nothing new?": "Never",
            "Do you look for ISI mark, expiry date etc.?": "Always",
            "If the expiry date mentioned is just a month or so away,do you insist on a fresh packet?": "Always",
            "Do you weigh the new gas cylinder/old newspapers yourself before buying/selling?": "Always",
            ". Do you raise an objection if a vegetable seller uses stones in place of the exact weight?": "Sometimes",
            "Do excessively bright coloured vegetables arouse your suspicion?": "Always",
            "Are you brand-conscious?": "Sometimes",
            "Do you associate high price with good quality (to reassure yourself that after all you have not paid a higher price just-like that)?": "Sometimes",
            "Do you unhesitatingly respond to catchy offers?": "Sometimes",
            "Do you compare the price paid by you with those of others?": "Always",
            "Do you strongly believe that your shopkeeper never cheats a regular customer like you?": "Always",
            "Do you favour 'home delivery' of provision items with out any doubt regarding weight etc.?": "Always",
            "Do you insist on 'paying by meter' when you travel by auto?": "Never"
        },
        {
            "Timestamp": "01/06/2021 13:24:45",
            "Name ": "Ek Prayaas",
            "When you buy some item, do you insist on a bill?": "Sometimes",
            "Do you keep the bill carefully?": "Sometimes",
            "If you realise that you have been tricked by the shopkeeper, have you bothered to complain to him/her?": "Always",
            "Have you been able to convince him/her that you've been-cheated?": "Always",
            "Do you simply grumble to yourself reconciling that it is your fate that you are often being victimised so and it is nothing new?": "Sometimes",
            "Do you look for ISI mark, expiry date etc.?": "Always",
            "If the expiry date mentioned is just a month or so away,do you insist on a fresh packet?": "Always",
            "Do you weigh the new gas cylinder/old newspapers yourself before buying/selling?": "Always",
            ". Do you raise an objection if a vegetable seller uses stones in place of the exact weight?": "Always",
            "Do excessively bright coloured vegetables arouse your suspicion?": "Always",
            "Are you brand-conscious?": "Sometimes",
            "Do you associate high price with good quality (to reassure yourself that after all you have not paid a higher price just-like that)?": "Sometimes",
            "Do you unhesitatingly respond to catchy offers?": "Sometimes",
            "Do you compare the price paid by you with those of others?": "Always",
            "Do you strongly believe that your shopkeeper never cheats a regular customer like you?": "Always",
            "Do you favour 'home delivery' of provision items with out any doubt regarding weight etc.?": "Always",
            "Do you insist on 'paying by meter' when you travel by auto?": "Never"
        }
    ];

    // Support query parameters for filtering
    const { name, timestamp } = req.query;
    let filteredData = surveyData;

    if (name) {
        filteredData = filteredData.filter(record => 
            record["Name "].toLowerCase().includes(name.toLowerCase())
        );
    }

    if (timestamp) {
        filteredData = filteredData.filter(record => 
            record.Timestamp.includes(timestamp)
        );
    }

    res.json({
        success: true,
        count: filteredData.length,
        data: filteredData
    });
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
        description: 'Convert Google Sheets to REST APIs - Development Server',
        endpoints: {
            'GET /health': 'Health check',
            'GET /api/test': 'Test endpoint',
            'GET /api/survey-data': 'Get survey data (supports ?name=... and ?timestamp=... filters)',
            'GET /docs': 'API documentation'
        },
        status: 'Development mode - simplified endpoints'
    });
});

// Basic error handling
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 SheetAPI Development Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/docs`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = app; 