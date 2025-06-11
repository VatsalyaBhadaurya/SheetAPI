// Authentication module for SheetAPI
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.authToken = null;
        this.googleAuth = null;
        this.init();
    }

    async init() {
        // Check for existing session
        this.loadStoredAuth();
        
        // Initialize Google API
        await this.initGoogleAPI();
        
        // Update UI based on auth state
        this.updateAuthUI();
    }

    /**
     * Initialize Google API and OAuth
     */
    async initGoogleAPI() {
        try {
            await new Promise((resolve, reject) => {
                if (window.gapi) {
                    resolve();
                } else {
                    // Load Google API if not already loaded
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                }
            });

            await new Promise((resolve) => {
                gapi.load('auth2', resolve);
            });

            await new Promise((resolve) => {
                gapi.load('client', resolve);
            });

            // Initialize the auth2 library
            this.googleAuth = await gapi.auth2.init({
                client_id: this.getClientId(),
                scope: 'profile email https://www.googleapis.com/auth/spreadsheets.readonly'
            });

            // Initialize the client library
            await gapi.client.init({
                apiKey: this.getAPIKey(),
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            // Listen for sign-in state changes
            this.googleAuth.isSignedIn.listen((isSignedIn) => {
                this.handleAuthStateChange(isSignedIn);
            });

            // Check if user is already signed in
            if (this.googleAuth.isSignedIn.get()) {
                this.handleAuthStateChange(true);
            }

        } catch (error) {
            console.error('Failed to initialize Google API:', error);
        }
    }

    /**
     * Handle authentication state changes
     * @param {boolean} isSignedIn - Whether user is signed in
     */
    handleAuthStateChange(isSignedIn) {
        if (isSignedIn) {
            const currentUser = this.googleAuth.currentUser.get();
            const authResponse = currentUser.getAuthResponse();
            
            this.isAuthenticated = true;
            this.authToken = authResponse.access_token;
            this.user = {
                id: currentUser.getId(),
                name: currentUser.getBasicProfile().getName(),
                email: currentUser.getBasicProfile().getEmail(),
                imageUrl: currentUser.getBasicProfile().getImageUrl()
            };

            this.storeAuth();
        } else {
            this.isAuthenticated = false;
            this.authToken = null;
            this.user = null;
            this.clearStoredAuth();
        }

        this.updateAuthUI();
    }

    /**
     * Sign in with Google
     */
    async signIn() {
        try {
            if (!this.googleAuth) {
                throw new Error('Google Auth not initialized');
            }

            await this.googleAuth.signIn();
            return true;
        } catch (error) {
            console.error('Sign in failed:', error);
            throw new Error('Failed to sign in. Please try again.');
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            if (this.googleAuth) {
                await this.googleAuth.signOut();
            }
            this.handleAuthStateChange(false);
            return true;
        } catch (error) {
            console.error('Sign out failed:', error);
            throw new Error('Failed to sign out. Please try again.');
        }
    }

    /**
     * Get current authentication token
     * @returns {string|null} Auth token
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * Get current user information
     * @returns {Object|null} User object
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            if (!this.googleAuth || !this.googleAuth.isSignedIn.get()) {
                throw new Error('User not signed in');
            }

            const currentUser = this.googleAuth.currentUser.get();
            const authResponse = await currentUser.reloadAuthResponse();
            this.authToken = authResponse.access_token;
            
            this.storeAuth();
            return this.authToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw new Error('Failed to refresh authentication. Please sign in again.');
        }
    }

    /**
     * Store authentication data
     */
    storeAuth() {
        const authData = {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            authToken: this.authToken,
            timestamp: Date.now()
        };

        localStorage.setItem('sheetapi_auth', JSON.stringify(authData));
    }

    /**
     * Load stored authentication data
     */
    loadStoredAuth() {
        try {
            const stored = localStorage.getItem('sheetapi_auth');
            if (!stored) return;

            const authData = JSON.parse(stored);
            
            // Check if stored auth is still valid (less than 1 hour old)
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - authData.timestamp > oneHour) {
                this.clearStoredAuth();
                return;
            }

            this.isAuthenticated = authData.isAuthenticated;
            this.user = authData.user;
            this.authToken = authData.authToken;
        } catch (error) {
            console.error('Failed to load stored auth:', error);
            this.clearStoredAuth();
        }
    }

    /**
     * Clear stored authentication data
     */
    clearStoredAuth() {
        localStorage.removeItem('sheetapi_auth');
    }

    /**
     * Update UI based on authentication state
     */
    updateAuthUI() {
        const authBtn = document.getElementById('auth-btn');
        if (!authBtn) return;

        if (this.isAuthenticated && this.user) {
            authBtn.textContent = `${this.user.name}`;
            authBtn.classList.remove('btn-primary');
            authBtn.classList.add('btn-secondary');
            
            // Create dropdown menu for authenticated user
            this.createUserMenu(authBtn);
        } else {
            authBtn.textContent = 'Sign In';
            authBtn.classList.add('btn-primary');
            authBtn.classList.remove('btn-secondary');
            
            // Remove any existing dropdown
            this.removeUserMenu();
        }
    }

    /**
     * Create user dropdown menu
     * @param {Element} authBtn - Auth button element
     */
    createUserMenu(authBtn) {
        // Remove existing menu
        this.removeUserMenu();

        const menu = document.createElement('div');
        menu.id = 'user-menu';
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-info">
                <img src="${this.user.imageUrl}" alt="Profile" class="user-avatar">
                <div class="user-details">
                    <div class="user-name">${this.user.name}</div>
                    <div class="user-email">${this.user.email}</div>
                </div>
            </div>
            <div class="menu-divider"></div>
            <a href="#" class="menu-item" id="menu-dashboard">📊 Dashboard</a>
            <a href="#" class="menu-item" id="menu-apis">🔗 My APIs</a>
            <a href="#" class="menu-item" id="menu-settings">⚙️ Settings</a>
            <div class="menu-divider"></div>
            <a href="#" class="menu-item" id="menu-signout">🚪 Sign Out</a>
        `;

        // Position menu
        authBtn.style.position = 'relative';
        authBtn.appendChild(menu);

        // Add event listeners
        document.getElementById('menu-signout').addEventListener('click', (e) => {
            e.preventDefault();
            this.signOut();
        });

        document.getElementById('menu-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('menu-apis').addEventListener('click', (e) => {
            e.preventDefault();
            this.showUserAPIs();
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!authBtn.contains(e.target)) {
                this.removeUserMenu();
            }
        });
    }

    /**
     * Remove user dropdown menu
     */
    removeUserMenu() {
        const existingMenu = document.getElementById('user-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    /**
     * Show user dashboard
     */
    showDashboard() {
        // Implementation for showing user dashboard
        console.log('Showing dashboard for user:', this.user.name);
        // You could navigate to a dashboard page or show a modal
    }

    /**
     * Show user's APIs
     */
    showUserAPIs() {
        // Implementation for showing user's APIs
        console.log('Showing APIs for user:', this.user.email);
        // You could navigate to an APIs page or show a modal
    }

    /**
     * Make authenticated request to API
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async authenticatedFetch(url, options = {}) {
        if (!this.authToken) {
            throw new Error('User not authenticated');
        }

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.authToken}`
            }
        };

        try {
            const response = await fetch(url, authOptions);
            
            // If token expired, try to refresh
            if (response.status === 401) {
                await this.refreshToken();
                authOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
                return await fetch(url, authOptions);
            }

            return response;
        } catch (error) {
            console.error('Authenticated request failed:', error);
            throw error;
        }
    }

    /**
     * Get Google Client ID
     * @returns {string} Client ID
     */
    getClientId() {
        return '344168920273-oo5bue2eo1j1trt6jhj7thp5tl5fu4jq.apps.googleusercontent.com';
    }

    /**
     * Get Google API Key
     * @returns {string} API Key
     */
    getAPIKey() {
        return 'AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY';
    }

    /**
     * Handle authentication for protected features
     * @param {Function} callback - Function to execute if authenticated
     * @param {string} message - Message to show if not authenticated
     */
    requireAuth(callback, message = 'Please sign in to use this feature') {
        if (this.isAuthenticated) {
            callback();
        } else {
            this.showAuthPrompt(message);
        }
    }

    /**
     * Show authentication prompt
     * @param {string} message - Message to display
     */
    showAuthPrompt(message) {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-content">
                <h3>Authentication Required</h3>
                <p>${message}</p>
                <div class="auth-modal-actions">
                    <button id="auth-modal-signin" class="btn btn-primary">Sign In</button>
                    <button id="auth-modal-cancel" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('auth-modal-signin').addEventListener('click', async () => {
            try {
                await this.signIn();
                modal.remove();
            } catch (error) {
                console.error('Auth prompt sign in failed:', error);
            }
        });

        document.getElementById('auth-modal-cancel').addEventListener('click', () => {
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Create global instance
window.authManager = new AuthManager();

// Export for use in other modules
window.AuthManager = AuthManager; 