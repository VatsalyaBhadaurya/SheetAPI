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
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Google OAuth2 Configuration
    google: {
        clientId: credentials?.web?.client_id || '344168920273-oo5bue2eo1j1trt6jhj7thp5tl5fu4jq.apps.googleusercontent.com',
        clientSecret: credentials?.web?.client_secret || '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',
        projectId: credentials?.web?.project_id || 'sheetapi-462416',
        redirectUris: credentials?.web?.redirect_uris || ['http://localhost:3000/oauth2callback'],
        javascriptOrigins: credentials?.web?.javascript_origins || ['http://localhost:3000'],
        
        // Google API Key for accessing Sheets API
        apiKey: process.env.GOOGLE_API_KEY || 'AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY',
        
        // OAuth2 scopes needed for the application
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
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