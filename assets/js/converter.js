// Sheet to API Converter Module
class SheetConverter {
    constructor() {
        this.apiBaseURL = 'https://api.sheetapi.com/v1'; // Your backend API URL
        this.cache = new Map();
        this.rateLimit = {
            requests: 0,
            windowStart: Date.now(),
            maxRequests: 100,
            windowMs: 60000 // 1 minute
        };
    }

    /**
     * Validate a Google Sheets URL
     * @param {string} url - The Google Sheets URL
     * @returns {Object} Validation result
     */
    validateSheetURL(url) {
        const patterns = [
            /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
            /https:\/\/sheets\.googleapis\.com\/.*spreadsheets\/([a-zA-Z0-9-_]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    valid: true,
                    spreadsheetId: match[1],
                    cleanUrl: `https://docs.google.com/spreadsheets/d/${match[1]}/edit`
                };
            }
        }

        return {
            valid: false,
            error: 'Invalid Google Sheets URL format'
        };
    }

    /**
     * Check rate limits
     * @returns {boolean} Whether request is allowed
     */
    checkRateLimit() {
        const now = Date.now();
        
        // Reset window if needed
        if (now - this.rateLimit.windowStart > this.rateLimit.windowMs) {
            this.rateLimit.requests = 0;
            this.rateLimit.windowStart = now;
        }

        if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
            return false;
        }

        this.rateLimit.requests++;
        return true;
    }

    /**
     * Fetch sheet metadata from Google Sheets API
     * @param {string} spreadsheetId - The spreadsheet ID
     * @returns {Promise<Object>} Sheet metadata
     */
    async fetchSheetMetadata(spreadsheetId) {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        const cacheKey = `metadata_${spreadsheetId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.getAPIKey()}&fields=properties,sheets.properties`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access denied. Please make sure the sheet is publicly accessible.');
                } else if (response.status === 404) {
                    throw new Error('Spreadsheet not found. Please check the URL.');
                } else {
                    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
                }
            }

            const data = await response.json();
            
            // Cache for 5 minutes
            this.cache.set(cacheKey, data);
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

            return data;
        } catch (error) {
            console.error('Error fetching sheet metadata:', error);
            throw error;
        }
    }

    /**
     * Fetch sample data from a sheet
     * @param {string} spreadsheetId - The spreadsheet ID
     * @param {string} sheetName - The sheet name
     * @param {number} maxRows - Maximum rows to fetch for preview
     * @returns {Promise<Object>} Sample data
     */
    async fetchSampleData(spreadsheetId, sheetName, maxRows = 10) {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        const range = `'${sheetName}'!A1:Z${maxRows}`;
        const cacheKey = `sample_${spreadsheetId}_${sheetName}_${maxRows}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${this.getAPIKey()}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
            }

            const data = await response.json();
            const processedData = this.processSheetData(data);
            
            // Cache for 2 minutes
            this.cache.set(cacheKey, processedData);
            setTimeout(() => this.cache.delete(cacheKey), 2 * 60 * 1000);

            return processedData;
        } catch (error) {
            console.error('Error fetching sample data:', error);
            throw error;
        }
    }

    /**
     * Process raw sheet data into structured format
     * @param {Object} rawData - Raw data from Google Sheets API
     * @returns {Object} Processed data
     */
    processSheetData(rawData) {
        if (!rawData.values || rawData.values.length === 0) {
            return {
                headers: [],
                rows: [],
                totalRows: 0,
                isEmpty: true
            };
        }

        const headers = rawData.values[0] || [];
        const rows = rawData.values.slice(1);

        // Convert rows to objects
        const data = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        return {
            headers: headers,
            rows: data,
            totalRows: rows.length,
            isEmpty: false,
            sample: true
        };
    }

    /**
     * Create API endpoint for a sheet
     * @param {Object} config - API configuration
     * @returns {Promise<Object>} API creation result
     */
    async createAPIEndpoint(config) {
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        try {
            // Validate configuration
            this.validateAPIConfig(config);

            // In a real implementation, this would call your backend
            const response = await fetch(`${this.apiBaseURL}/apis`, {
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
                        cache_duration: config.cacheDuration,
                        rate_limit: config.rateLimit || 1000
                    },
                    metadata: {
                        spreadsheet_title: config.spreadsheetTitle,
                        created_by: config.userId || 'anonymous',
                        description: config.description || ''
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `API creation failed: ${response.statusText}`);
            }

            const result = await response.json();
            return {
                success: true,
                apiId: result.api_id,
                endpoint: result.endpoint,
                apiKey: result.api_key,
                documentation: result.documentation_url,
                created: result.created_at
            };

        } catch (error) {
            console.error('Error creating API:', error);
            
            // For demo purposes, create a mock API
            if (error.message.includes('fetch')) {
                return this.createMockAPI(config);
            }
            
            throw error;
        }
    }

    /**
     * Create a mock API for demo purposes
     * @param {Object} config - API configuration
     * @returns {Object} Mock API result
     */
    createMockAPI(config) {
        const apiId = this.generateAPIId();
        const endpoint = `https://api.sheetapi.com/v1/${apiId}`;
        
        return {
            success: true,
            apiId: apiId,
            endpoint: endpoint,
            apiKey: 'demo_key_' + apiId.substring(0, 8),
            documentation: `https://docs.sheetapi.com/apis/${apiId}`,
            created: new Date().toISOString(),
            demo: true
        };
    }

    /**
     * Validate API configuration
     * @param {Object} config - Configuration to validate
     */
    validateAPIConfig(config) {
        const required = ['spreadsheetId', 'sheetName', 'apiName'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (config.apiName.length < 3) {
            throw new Error('API name must be at least 3 characters long');
        }

        if (config.cacheDuration && (config.cacheDuration < 0 || config.cacheDuration > 86400)) {
            throw new Error('Cache duration must be between 0 and 86400 seconds');
        }
    }

    /**
     * Test an API endpoint
     * @param {string} endpoint - API endpoint to test
     * @returns {Promise<Object>} Test result
     */
    async testAPIEndpoint(endpoint) {
        try {
            const startTime = Date.now();
            const response = await fetch(endpoint, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            let data = null;
            let contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                responseTime: responseTime,
                contentType: contentType,
                data: data,
                headers: Object.fromEntries(response.headers.entries())
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                responseTime: null,
                data: null
            };
        }
    }

    /**
     * Generate API usage statistics
     * @param {string} apiId - API ID
     * @returns {Promise<Object>} Usage statistics
     */
    async getAPIStats(apiId) {
        try {
            const response = await fetch(`${this.apiBaseURL}/apis/${apiId}/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch API statistics');
            }

            return await response.json();
        } catch (error) {
            // Return mock stats for demo
            return {
                total_requests: Math.floor(Math.random() * 1000),
                requests_today: Math.floor(Math.random() * 100),
                avg_response_time: Math.floor(Math.random() * 200 + 50),
                error_rate: Math.random() * 5,
                top_endpoints: [
                    { path: '/', requests: Math.floor(Math.random() * 500) },
                    { path: '/?limit=10', requests: Math.floor(Math.random() * 200) }
                ],
                recent_requests: []
            };
        }
    }

    /**
     * Delete an API endpoint
     * @param {string} apiId - API ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteAPI(apiId) {
        try {
            const response = await fetch(`${this.apiBaseURL}/apis/${apiId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error deleting API:', error);
            return false;
        }
    }

    /**
     * Generate a unique API ID
     * @returns {string} Unique API ID
     */
    generateAPIId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}${random}`;
    }

    /**
     * Get Google API key (replace with your actual key)
     * @returns {string} API key
     */
    getAPIKey() {
        return 'AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY';
    }

    /**
     * Get authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        // In a real app, this would get the user's auth token
        return localStorage.getItem('authToken') || 'demo_token';
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Export for use in main app
window.SheetConverter = SheetConverter; 