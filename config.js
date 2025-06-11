// Load environment variables
require('dotenv').config();

// Configuration file for SheetAPI
let credentials = null;

// Try to load Google OAuth2 credentials
try {
    credentials = require('./client_secret_344168920273-oo5bue2eo1j1trt6jhj7thp5tl5fu4jq.apps.googleusercontent.com.json');
} catch (error) {
    console.warn('Could not load Google credentials file:', error.message);
}

const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret'
    },
    
    // Google OAuth Configuration
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: 'http://localhost:3000/auth/google/callback',
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ]
    },
    
    // Google Sheets API Configuration
    sheets: {
        apiKey: process.env.GOOGLE_API_KEY
    },
    
    // Database Configuration
    database: {
        mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/sheetapi'
    },
    
    // Cache Configuration
    cache: {
        redis: process.env.REDIS_URL || 'redis://localhost:6379',
        defaultTTL: 300 // 5 minutes
    },
    
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
        expiresIn: process.env.JWT_EXPIRE || '7d'
    },
    
    // Rate Limiting
    rateLimit: {
        general: parseInt(process.env.RATE_LIMIT_GENERAL) || 100,
        api: parseInt(process.env.RATE_LIMIT_API) || 30,
        create: parseInt(process.env.RATE_LIMIT_CREATE) || 10
    },
    
    // Frontend Configuration
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080']
    }
};

module.exports = config; 