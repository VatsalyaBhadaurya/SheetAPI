// Background service worker for Sheets to API Chrome Extension
class SheetsAPIBackground {
    constructor() {
        this.init();
    }

    init() {
        // Listen for extension installation
        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
        
        // Listen for messages from popup and content scripts
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // Handle OAuth token refresh
        chrome.identity.onSignInChanged.addListener(this.onSignInChanged.bind(this));
        
        // Periodic cleanup of stored data
        this.setupPeriodicCleanup();
    }

    onInstalled(details) {
        console.log('Sheets to API Extension installed:', details.reason);
        
        if (details.reason === 'install') {
            this.showWelcomePage();
        }
    }

    async showWelcomePage() {
        const welcomeUrl = chrome.runtime.getURL('welcome.html');
        await chrome.tabs.create({ url: welcomeUrl });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'getStoredAPIs':
                    return await this.getStoredAPIs();
                
                case 'storeAPI':
                    return await this.storeAPI(request.data);
                
                case 'deleteAPI':
                    return await this.deleteAPI(request.apiId);
                
                case 'refreshToken':
                    return await this.refreshToken();
                
                case 'validateAPI':
                    return await this.validateAPI(request.endpoint);
                
                case 'getAPIStats':
                    return await this.getAPIStats(request.apiId);
                
                default:
                    throw new Error(`Unknown action: ${request.action}`);
            }
        } catch (error) {
            console.error('Background message error:', error);
            return { success: false, error: error.message };
        }
    }

    async getStoredAPIs() {
        try {
            const result = await chrome.storage.local.get(['stored_apis']);
            return {
                success: true,
                apis: result.stored_apis || []
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async storeAPI(apiData) {
        try {
            const { stored_apis = [] } = await chrome.storage.local.get(['stored_apis']);
            
            const newAPI = {
                id: this.generateAPIId(),
                ...apiData,
                created: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                accessCount: 0
            };

            stored_apis.push(newAPI);
            
            await chrome.storage.local.set({ stored_apis });
            
            return { success: true, api: newAPI };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteAPI(apiId) {
        try {
            const { stored_apis = [] } = await chrome.storage.local.get(['stored_apis']);
            
            const filteredAPIs = stored_apis.filter(api => api.id !== apiId);
            
            await chrome.storage.local.set({ stored_apis: filteredAPIs });
            
            // Also remove associated documentation
            await chrome.storage.local.remove([`docs_${apiId}`]);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async refreshToken() {
        return new Promise((resolve) => {
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (chrome.runtime.lastError) {
                    // Try to get new token interactively
                    chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
                        if (chrome.runtime.lastError) {
                            resolve({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve({ success: true, token: newToken });
                        }
                    });
                } else {
                    resolve({ success: true, token: token });
                }
            });
        });
    }

    async validateAPI(endpoint) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const isValid = response.ok;
            const status = response.status;
            
            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                // Not JSON, that's okay
            }

            return {
                success: true,
                isValid,
                status,
                data: isValid ? data : null
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                isValid: false
            };
        }
    }

    async getAPIStats(apiId) {
        try {
            const { stored_apis = [] } = await chrome.storage.local.get(['stored_apis']);
            const api = stored_apis.find(a => a.id === apiId);
            
            if (!api) {
                throw new Error('API not found');
            }

            // Update last accessed time and increment counter
            api.lastAccessed = new Date().toISOString();
            api.accessCount = (api.accessCount || 0) + 1;
            
            await chrome.storage.local.set({ stored_apis });

            return {
                success: true,
                stats: {
                    created: api.created,
                    lastAccessed: api.lastAccessed,
                    accessCount: api.accessCount,
                    endpoint: api.endpoint,
                    spreadsheetId: api.spreadsheetId,
                    sheetName: api.sheetName
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    onSignInChanged(account, signedIn) {
        console.log('Sign-in state changed:', { account, signedIn });
        
        if (!signedIn) {
            // Clear stored tokens when user signs out
            chrome.identity.removeCachedAuthToken({ token: '' });
        }
    }

    setupPeriodicCleanup() {
        // Clean up old data every 24 hours
        chrome.alarms.create('cleanup', { periodInMinutes: 24 * 60 });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'cleanup') {
                this.performCleanup();
            }
        });
    }

    async performCleanup() {
        try {
            const { stored_apis = [] } = await chrome.storage.local.get(['stored_apis']);
            
            // Remove APIs that haven't been accessed in 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const activeAPIs = stored_apis.filter(api => {
                const lastAccessed = new Date(api.lastAccessed);
                return lastAccessed > thirtyDaysAgo;
            });

            if (activeAPIs.length !== stored_apis.length) {
                await chrome.storage.local.set({ stored_apis: activeAPIs });
                console.log(`Cleaned up ${stored_apis.length - activeAPIs.length} old APIs`);
            }

            // Clean up orphaned documentation
            const allKeys = await chrome.storage.local.get();
            const docKeys = Object.keys(allKeys).filter(key => key.startsWith('docs_'));
            
            for (const docKey of docKeys) {
                const apiId = docKey.replace('docs_', '');
                const hasAPI = activeAPIs.some(api => 
                    docKey.includes(api.spreadsheetId) && docKey.includes(api.sheetName)
                );
                
                if (!hasAPI) {
                    await chrome.storage.local.remove([docKey]);
                }
            }

        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    generateAPIId() {
        return 'api_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Utility methods for extension management
    static async getExtensionInfo() {
        return {
            id: chrome.runtime.id,
            version: chrome.runtime.getManifest().version,
            name: chrome.runtime.getManifest().name
        };
    }

    static async exportUserData() {
        try {
            const data = await chrome.storage.local.get();
            const exportData = {
                version: chrome.runtime.getManifest().version,
                exported: new Date().toISOString(),
                data: data
            };
            
            return { success: true, data: exportData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async importUserData(importData) {
        try {
            if (!importData.data) {
                throw new Error('Invalid import data format');
            }
            
            await chrome.storage.local.clear();
            await chrome.storage.local.set(importData.data);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Initialize the background service
new SheetsAPIBackground();

// Context menu setup (optional enhancement)
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'convert-sheet-to-api',
        title: 'Convert to API',
        contexts: ['page'],
        documentUrlPatterns: ['https://docs.google.com/spreadsheets/*']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'convert-sheet-to-api') {
        chrome.action.openPopup();
    }
});

// Badge management
function updateBadge(count) {
    const text = count > 0 ? count.toString() : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.stored_apis) {
        const apiCount = changes.stored_apis.newValue?.length || 0;
        updateBadge(apiCount);
    }
});

// Initialize badge on startup
chrome.storage.local.get(['stored_apis']).then(result => {
    const apiCount = result.stored_apis?.length || 0;
    updateBadge(apiCount);
}); 