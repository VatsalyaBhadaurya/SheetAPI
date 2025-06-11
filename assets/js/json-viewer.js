/**
 * JSON Data Viewer - Interactive Sheet Data Display
 * Created for SheetAPI project
 */

class JSONDataViewer {
    constructor() {
        this.currentData = null;
        this.filteredData = null;
        this.currentView = 'table';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.searchTerm = '';
        this.selectedAPI = null;
        this.theme = localStorage.getItem('json-viewer-theme') || 'light';
        
        this.init();
    }

    init() {
        this.setupTheme();
        this.bindEvents();
        this.loadAvailableAPIs();
        
        // Check if there's a sheet URL in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const sheetParam = urlParams.get('sheet');
        
        if (sheetParam) {
            // Auto-load the sheet data from URL parameter
            this.loadGoogleSheetData(sheetParam);
        } else {
            this.setupSampleData();
        }
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = this.theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }

    bindEvents() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // API selection
        document.getElementById('api-selector').addEventListener('change', (e) => {
            this.selectedAPI = e.target.value;
            document.getElementById('load-data-btn').disabled = !e.target.value;
        });

        document.getElementById('load-data-btn').addEventListener('click', () => {
            this.loadAPIData();
        });

        // Quick actions
        document.getElementById('create-api-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('sample-data-btn').addEventListener('click', () => {
            this.loadLiveData();
        });

        document.getElementById('demo-data-btn').addEventListener('click', () => {
            this.loadLiveData();
        });

        document.getElementById('test-connection-btn').addEventListener('click', () => {
            this.testConnection();
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterData();
            this.displayData();
            
            const clearBtn = document.getElementById('clear-search');
            clearBtn.style.display = e.target.value ? 'flex' : 'none';
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            this.filterData();
            this.displayData();
            document.getElementById('clear-search').style.display = 'none';
        });

        // View controls
        document.getElementById('view-table').addEventListener('click', () => {
            this.switchView('table');
        });

        document.getElementById('view-json').addEventListener('click', () => {
            this.switchView('json');
        });

        document.getElementById('view-cards').addEventListener('click', () => {
            this.switchView('cards');
        });

        // Action controls
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.showExportModal();
        });

        document.getElementById('copy-data').addEventListener('click', () => {
            this.copyDataToClipboard();
        });

        // JSON controls
        document.getElementById('expand-all').addEventListener('click', () => {
            this.expandAllJSON();
        });

        document.getElementById('collapse-all').addEventListener('click', () => {
            this.collapseAllJSON();
        });

        document.getElementById('format-json').addEventListener('click', () => {
            this.formatJSON();
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            this.previousPage();
        });

        document.getElementById('next-page').addEventListener('click', () => {
            this.nextPage();
        });

        document.getElementById('card-prev').addEventListener('click', () => {
            this.previousPage();
        });

        document.getElementById('card-next').addEventListener('click', () => {
            this.nextPage();
        });

        // Export modal
        document.getElementById('close-export-modal').addEventListener('click', () => {
            this.hideExportModal();
        });

        document.getElementById('cancel-export').addEventListener('click', () => {
            this.hideExportModal();
        });

        document.getElementById('confirm-export').addEventListener('click', () => {
            this.exportData();
        });

        // Close modal on background click
        document.getElementById('export-modal').addEventListener('click', (e) => {
            if (e.target.id === 'export-modal') {
                this.hideExportModal();
            }
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('json-viewer-theme', this.theme);
        this.setupTheme();
    }

    loadAvailableAPIs() {
        const selector = document.getElementById('api-selector');
        const apis = [];
        
        // Load APIs from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('demo_api_')) {
                const apiId = key.replace('demo_api_', '');
                const config = JSON.parse(localStorage.getItem(key));
                apis.push({ id: apiId, config: config });
            }
        }

        // Clear existing options
        selector.innerHTML = '<option value="">Select an API to view data...</option>';

        if (apis.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No APIs found - Create one first!';
            option.disabled = true;
            selector.appendChild(option);
            return;
        }

        // Add API options
        apis.forEach(api => {
            const option = document.createElement('option');
            option.value = api.id;
            option.textContent = `${api.config.apiName} (${api.config.sheetName})`;
            selector.appendChild(option);
        });
    }

    async loadAPIData() {
        if (!this.selectedAPI) return;

        this.showLoading();

        try {
            // Try to load from the new API endpoint first
            let endpoint = `/api/data`;
            let response = await fetch(endpoint);
            
            if (!response.ok) {
                // Fallback to demo API
                endpoint = `demo-api/index.html?id=${this.selectedAPI}&format=json`;
                response = await fetch(endpoint);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.currentData = data;
            this.filteredData = data;

            // Get API config for display
            let config = null;
            try {
                config = JSON.parse(localStorage.getItem(`demo_api_${this.selectedAPI}`));
            } catch (e) {
                config = { 
                    apiName: 'Live Sheet Data',
                    sheetName: 'Main Sheet',
                    spreadsheetTitle: 'Data Source'
                };
            }
            
            this.updateDataInfo(config);
            this.displayData();
            this.hideLoading();

        } catch (error) {
            console.error('Error loading API data:', error);
            this.showError('Failed to load API data. Loading sample data instead.');
            this.loadSampleData();
            this.hideLoading();
        }
    }

    loadSampleData() {
        // Generate sample data for demonstration
        const sampleData = {
            data: [
                {
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
                },
                {
                    "ID": "006",
                    "Name": "Emily Chen",
                    "Email": "emily.chen@example.com",
                    "Department": "Design",
                    "Salary": "$70,000",
                    "Join Date": "2023-04-10",
                    "Status": "Active",
                    "Location": "Los Angeles",
                    "Manager": "Frank Miller",
                    "Skills": "UI/UX, Figma, Photoshop"
                },
                {
                    "ID": "007",
                    "Name": "Robert Taylor",
                    "Email": "robert.taylor@example.com",
                    "Department": "Finance",
                    "Salary": "$78,000",
                    "Join Date": "2022-12-05",
                    "Status": "Active",
                    "Location": "Boston",
                    "Manager": "Grace Kim",
                    "Skills": "Excel, Accounting, Financial Analysis"
                },
                {
                    "ID": "008",
                    "Name": "Lisa Anderson",
                    "Email": "lisa.anderson@example.com",
                    "Department": "Marketing",
                    "Salary": "$71,000",
                    "Join Date": "2023-01-20",
                    "Status": "Active",
                    "Location": "Miami",
                    "Manager": "Bob Wilson",
                    "Skills": "Social Media, Brand Management, PR"
                }
            ],
            count: 8,
            total: 8,
            cached: false,
            generated_at: new Date().toISOString(),
            api_info: {
                name: "Sample Employee API",
                version: "1.0",
                endpoint: "/api/v1/employees"
            }
        };

        this.currentData = sampleData;
        this.filteredData = sampleData;
        this.updateDataInfo({ 
            apiName: 'Sample Employee Data',
            sheetName: 'Employee Records',
            spreadsheetTitle: 'Company Database'
        });
        this.displayData();
    }

    setupSampleData() {
        // Load sample data by default (user can click "Load Live Data" for sheets)
        this.loadSampleData();
    }

    async loadLiveData() {
        // Check if there's a sheet URL in the URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const sheetParam = urlParams.get('sheet');
        
        if (sheetParam) {
            // Load from URL parameter
            await this.loadGoogleSheetData(sheetParam);
            return;
        }
        
        // Check if user wants to load a specific Google Sheet
        const sheetUrl = prompt('Enter Google Sheets URL\n\nExample:\nhttps://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit\n\nOr leave empty to load from the latest created API:');
        
        if (sheetUrl && sheetUrl.trim()) {
            await this.loadGoogleSheetData(sheetUrl.trim());
        } else {
            // Try to load from the most recently created API
            await this.loadFromLatestAPI();
        }
    }

    async loadFromLatestAPI() {
        // Try to load data from the most recently created API in localStorage
        try {
            let latestAPI = null;
            let latestTime = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('demo_api_')) {
                    const config = JSON.parse(localStorage.getItem(key));
                    if (config.createdAt && config.createdAt > latestTime) {
                        latestTime = config.createdAt;
                        latestAPI = config;
                    }
                }
            }
            
            if (latestAPI && latestAPI.spreadsheetId) {
                console.log('Loading from latest API:', latestAPI);
                await this.loadGoogleSheetData(latestAPI.spreadsheetId);
            } else {
                // Fallback to sample data
                await this.loadSampleData();
            }
        } catch (error) {
            console.error('Error loading from latest API:', error);
            await this.loadSampleData();
        }
    }

    async loadGoogleSheetData(sheetUrl) {
        this.showLoading();

        try {
            console.log('Loading Google Sheet data from:', sheetUrl);
            
            // Special case for demo data
            if (sheetUrl === 'demo') {
                await this.loadSampleData();
                return;
            }
            
            // Extract sheet ID from URL
            let sheetId = sheetUrl;
            if (sheetUrl.includes('docs.google.com')) {
                const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    sheetId = match[1];
                } else {
                    throw new Error('Invalid Google Sheets URL format');
                }
            }

            // Get sheet name from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const sheetName = urlParams.get('sheetName') || 'Sheet1';
            
            const apiUrl = `http://localhost:3000/api/sheets/${sheetId}${sheetName !== 'Sheet1' ? `?sheet=${encodeURIComponent(sheetName)}` : ''}`;
            console.log('Fetching from API:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Google Sheets data received:', data);
            
            this.currentData = data;
            this.filteredData = data;

            // Check if there's a custom title from URL parameters
            const urlParamsForTitle = new URLSearchParams(window.location.search);
            const customTitle = urlParamsForTitle.get('title');
            
            this.updateDataInfo({ 
                apiName: customTitle || data.metadata.spreadsheetTitle,
                sheetName: data.metadata.sheetName,
                spreadsheetTitle: data.metadata.spreadsheetTitle
            });
            this.displayData();
            this.hideLoading();

            this.showSuccessNotification(`✅ Successfully loaded ${data.count} records from Google Sheets!`);

        } catch (error) {
            console.error('Error loading Google Sheets data:', error);
            this.showError(`Failed to load Google Sheets data: ${error.message}`);
            this.hideLoading();
            
            // Ask if user wants to load sample data instead
            if (confirm('Would you like to load sample data instead?')) {
                await this.loadSampleData();
            }
        }
    }

    async loadSampleData() {
        this.showLoading();

        try {
                    console.log('Attempting to load sample data from http://localhost:3000/api/data');
        const response = await fetch('http://localhost:3000/api/data', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Sample data received:', data);
            
            this.currentData = data;
            this.filteredData = data;

            this.updateDataInfo({ 
                apiName: 'Sample Data API',
                sheetName: data.metadata?.sheetName || 'Sample Sheet',
                spreadsheetTitle: data.metadata?.spreadsheetTitle || 'Sample Data'
            });
            this.displayData();
            this.hideLoading();

            this.showSuccessNotification(`✅ Sample data loaded successfully!`);

        } catch (error) {
            console.error('Error loading sample data:', error);
            this.showError(`Failed to load sample data: ${error.message}.`);
            this.hideLoading();
        }
    }

    async testConnection() {
        try {
                    console.log('Testing connection to http://localhost:3000/api/test');
        const response = await fetch('http://localhost:3000/api/test');
            
            if (response.ok) {
                const result = await response.json();
                console.log('Test response:', result);
                this.showSuccessNotification(`✅ Connection successful! Server responded: ${result.message}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.showError(`❌ Connection failed: ${error.message}`);
        }
    }

    updateDataInfo(config) {
        document.getElementById('data-title').textContent = 
            config ? `${config.apiName}` : 'Your Sheet Data';
        
        document.getElementById('record-count').textContent = 
            `${this.currentData.count || 0} records`;
        
        document.getElementById('last-updated').textContent = 
            `Updated: ${new Date().toLocaleTimeString()}`;
    }

    showLoading() {
        document.getElementById('loading-section').style.display = 'block';
        document.getElementById('data-section').style.display = 'none';
        document.getElementById('empty-state').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('data-section').style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: bold;
            max-width: 400px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    filterData() {
        if (!this.currentData || !this.currentData.data) {
            this.filteredData = this.currentData;
            return;
        }

        if (!this.searchTerm) {
            this.filteredData = this.currentData;
            return;
        }

        const filtered = this.currentData.data.filter(item => {
            return Object.values(item).some(value => 
                value.toString().toLowerCase().includes(this.searchTerm)
            );
        });

        this.filteredData = {
            ...this.currentData,
            data: filtered,
            count: filtered.length
        };

        this.currentPage = 1; // Reset to first page when filtering
    }

    switchView(view) {
        this.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`view-${view}`).classList.add('active');

        // Show/hide views
        document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';
        document.getElementById('json-view').style.display = view === 'json' ? 'block' : 'none';
        document.getElementById('card-view').style.display = view === 'cards' ? 'block' : 'none';

        this.displayData();
    }

    displayData() {
        if (!this.filteredData) return;

        switch (this.currentView) {
            case 'table':
                this.displayTableView();
                break;
            case 'json':
                this.displayJSONView();
                break;
            case 'cards':
                this.displayCardView();
                break;
        }
    }

    displayTableView() {
        const tableHeader = document.getElementById('table-header');
        const tableBody = document.getElementById('table-body');
        
        if (!this.filteredData.data || this.filteredData.data.length === 0) {
            tableHeader.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 2rem; color: #9aa0a6;">No data to display</td></tr>';
            this.updatePagination(0, 0);
            return;
        }

        // Get column headers
        const headers = Object.keys(this.filteredData.data[0]);
        
        // Create header row
        tableHeader.innerHTML = headers.map(header => `<th>${header}</th>`).join('');

        // Paginate data
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.data.slice(startIndex, endIndex);

        // Create body rows
        tableBody.innerHTML = pageData.map(row => {
            return `<tr>${headers.map(header => 
                `<td title="${row[header]}">${this.formatCellValue(row[header])}</td>`
            ).join('')}</tr>`;
        }).join('');

        this.updatePagination(pageData.length, this.filteredData.data.length);
    }

    displayJSONView() {
        const jsonContent = document.getElementById('json-content');
        
        if (!this.filteredData) {
            jsonContent.textContent = 'No data to display';
            return;
        }

        // Pretty print JSON with syntax highlighting
        const formatted = this.syntaxHighlight(JSON.stringify(this.filteredData, null, 2));
        jsonContent.innerHTML = formatted;
    }

    displayCardView() {
        const cardsContainer = document.getElementById('cards-container');
        
        if (!this.filteredData.data || this.filteredData.data.length === 0) {
            cardsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #9aa0a6;">No data to display</div>';
            this.updateCardPagination(0, 0);
            return;
        }

        // Paginate data
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.data.slice(startIndex, endIndex);

        // Create cards
        cardsContainer.innerHTML = pageData.map((item, index) => {
            const fields = Object.entries(item).map(([key, value]) => `
                <div class="card-field">
                    <span class="field-label">${key}:</span>
                    <span class="field-value">${this.formatCellValue(value)}</span>
                </div>
            `).join('');

            return `
                <div class="data-card">
                    <div class="card-header">Record ${startIndex + index + 1}</div>
                    ${fields}
                </div>
            `;
        }).join('');

        this.updateCardPagination(pageData.length, this.filteredData.data.length);
    }

    formatCellValue(value) {
        if (value === null || value === undefined) return '<em style="color: #9aa0a6;">null</em>';
        if (value === '') return '<em style="color: #9aa0a6;">empty</em>';
        
        const str = value.toString();
        if (str.length > 100) {
            return str.substring(0, 100) + '<span style="color: #9aa0a6;">...</span>';
        }
        
        return str;
    }

    syntaxHighlight(json) {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    updatePagination(currentCount, totalCount) {
        const totalPages = Math.ceil(totalCount / this.itemsPerPage);
        const paginationText = document.getElementById('pagination-text');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageNumbers = document.getElementById('page-numbers');

        paginationText.textContent = `Showing ${currentCount} of ${totalCount} records`;
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;

        // Generate page numbers
        pageNumbers.innerHTML = '';
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('span');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.displayData();
            });
            pageNumbers.appendChild(pageBtn);
        }
    }

    updateCardPagination(currentCount, totalCount) {
        const totalPages = Math.ceil(totalCount / this.itemsPerPage);
        const paginationText = document.getElementById('card-pagination-text');
        const prevBtn = document.getElementById('card-prev');
        const nextBtn = document.getElementById('card-next');

        paginationText.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayData();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredData.data.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayData();
        }
    }

    async refreshData() {
        if (this.selectedAPI) {
            await this.loadAPIData();
        } else {
            this.loadSampleData();
        }
        
        // Show success notification
        this.showSuccessNotification('Data refreshed successfully!');
    }

    showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: bold;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    async copyDataToClipboard() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(this.filteredData, null, 2));
            this.showSuccessNotification('Data copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showError('Failed to copy data to clipboard');
        }
    }

    expandAllJSON() {
        // JSON is already expanded by default in our simple viewer
        this.showSuccessNotification('JSON expanded!');
    }

    collapseAllJSON() {
        // For simplicity, we'll just reformat
        this.formatJSON();
        this.showSuccessNotification('JSON collapsed!');
    }

    formatJSON() {
        this.displayJSONView();
        this.showSuccessNotification('JSON formatted!');
    }

    showExportModal() {
        document.getElementById('export-modal').style.display = 'flex';
    }

    hideExportModal() {
        document.getElementById('export-modal').style.display = 'none';
    }

    exportData() {
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const includeMetadata = document.getElementById('include-metadata').checked;
        const filteredOnly = document.getElementById('filtered-only').checked;

        let dataToExport = filteredOnly ? this.filteredData : this.currentData;
        
        if (!includeMetadata && dataToExport.data) {
            dataToExport = dataToExport.data;
        }

        switch (format) {
            case 'json':
                this.downloadJSON(dataToExport);
                break;
            case 'csv':
                this.downloadCSV(dataToExport);
                break;
            case 'excel':
                this.showError('Excel export coming soon!');
                break;
        }

        this.hideExportModal();
    }

    downloadJSON(data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sheet-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSuccessNotification('JSON file downloaded!');
    }

    downloadCSV(data) {
        const rows = Array.isArray(data) ? data : (data.data || []);
        
        if (rows.length === 0) {
            this.showError('No data to export');
            return;
        }

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sheet-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSuccessNotification('CSV file downloaded!');
    }
}

// Initialize the JSON Data Viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.jsonDataViewer = new JSONDataViewer();
});