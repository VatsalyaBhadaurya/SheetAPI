// Content script to detect and extract Google Sheets information
class SheetsDetector {
    constructor() {
        this.spreadsheetId = null;
        this.spreadsheetTitle = null;
        this.sheetTabs = [];
        this.init();
    }

    init() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'detectSheet') {
                this.detectCurrentSheet()
                    .then(result => sendResponse({ success: true, data: result }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep message channel open for async response
            }
            
            if (request.action === 'getSheetTabs') {
                this.getSheetTabs()
                    .then(tabs => sendResponse({ success: true, tabs }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true;
            }
        });
    }

    async detectCurrentSheet() {
        try {
            // Extract spreadsheet ID from URL
            const url = window.location.href;
            const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            
            if (!sheetMatch) {
                throw new Error('Not a Google Sheets URL');
            }

            this.spreadsheetId = sheetMatch[1];

            // Get spreadsheet title
            await this.waitForElement('div[data-selenium-id="title"]', 5000);
            const titleElement = document.querySelector('div[data-selenium-id="title"]') || 
                                document.querySelector('.docs-title-input') ||
                                document.querySelector('[aria-label*="title"]');
            
            this.spreadsheetTitle = titleElement ? 
                titleElement.textContent.trim() || titleElement.value || 'Untitled spreadsheet' :
                'Untitled spreadsheet';

            // Get sheet tabs
            await this.getSheetTabs();

            return {
                spreadsheetId: this.spreadsheetId,
                title: this.spreadsheetTitle,
                tabs: this.sheetTabs,
                url: url
            };

        } catch (error) {
            console.error('Error detecting sheet:', error);
            throw error;
        }
    }

    async getSheetTabs() {
        try {
            // Wait for sheet tabs to load
            await this.waitForElement('.docs-sheet-tab', 3000);
            
            const tabElements = document.querySelectorAll('.docs-sheet-tab');
            this.sheetTabs = Array.from(tabElements).map((tab, index) => {
                const nameElement = tab.querySelector('.docs-sheet-tab-name') || 
                                  tab.querySelector('[aria-label]') ||
                                  tab;
                                  
                return {
                    index: index,
                    name: nameElement.textContent.trim() || nameElement.getAttribute('aria-label') || `Sheet${index + 1}`,
                    id: tab.getAttribute('id') || `sheet-${index}`
                };
            });

            // Fallback if no tabs found
            if (this.sheetTabs.length === 0) {
                this.sheetTabs = [{ index: 0, name: 'Sheet1', id: 'sheet-0' }];
            }

            return this.sheetTabs;

        } catch (error) {
            console.error('Error getting sheet tabs:', error);
            // Return default tab if detection fails
            this.sheetTabs = [{ index: 0, name: 'Sheet1', id: 'sheet-0' }];
            return this.sheetTabs;
        }
    }

    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Additional helper methods for sheet manipulation
    async getSheetData(sheetName = null) {
        try {
            // This would typically require additional permissions and API calls
            // For now, we'll return a structure that can be used with the Sheets API
            return {
                spreadsheetId: this.spreadsheetId,
                sheetName: sheetName || this.sheetTabs[0]?.name || 'Sheet1',
                message: 'Use Sheets API to fetch actual data'
            };
        } catch (error) {
            console.error('Error getting sheet data:', error);
            throw error;
        }
    }

    // Monitor sheet changes (for future enhancements)
    setupSheetMonitor() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if sheet tabs changed
                    const tabElements = document.querySelectorAll('.docs-sheet-tab');
                    if (tabElements.length !== this.sheetTabs.length) {
                        this.getSheetTabs();
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the detector when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SheetsDetector();
    });
} else {
    new SheetsDetector();
}

// Export for testing (if needed)
window.SheetsDetector = SheetsDetector; 