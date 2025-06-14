# 📊 SheetAPI

A powerful API generator that transforms Google Sheets into RESTful APIs. Create, manage, and deploy APIs from your spreadsheet data with ease.

## ✨ Features

- 🔄 **Real-time Data Sync**: Automatically syncs with Google Sheets
- 🔐 **Secure Authentication**: OAuth2 and API key support
- 📱 **RESTful Endpoints**: Standard REST API endpoints
- 🔍 **Search & Filter**: Built-in search and filtering capabilities
- 📊 **Data Validation**: Automatic data type detection and validation
- 🎨 **JSON Viewer**: Beautiful data visualization
- 🚀 **Quick Setup**: Get started in minutes

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/SheetAPI.git
   cd SheetAPI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add your Google API credentials

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Main App: http://localhost:3000
   - JSON Viewer: http://localhost:3000/json-viewer.html
   - Demo API: http://localhost:3000/demo-api

## 📝 API Endpoints

### Google Sheets API
- `GET /api/sheets/:spreadsheetId` - Get sheet data
- `GET /api/sheets/:spreadsheetId/search` - Search sheet data
- `GET /api/sheets/:spreadsheetId/range` - Get specific range

### Demo API
- `GET /api/data` - Get all data
- `GET /api/data/search` - Search data
- `POST /api/data` - Add new record
- `PUT /api/data/:id` - Update record
- `DELETE /api/data/:id` - Delete record

## 🔧 Configuration

### Environment Variables
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Sheets API Key
GOOGLE_API_KEY=your-api-key

# Server Configuration
PORT=3000
SESSION_SECRET=your-session-secret
```

### Google Cloud Setup
1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Sheets API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs
5. Copy credentials to `.env` file

## 🛠️ Development

### Project Structure
```
SheetAPI/
├── assets/          # Static assets
├── server/          # Server-side code
├── demo-api/        # Demo API implementation
├── config.js        # Configuration
├── server.js        # Main server
└── package.json     # Dependencies
```

### Available Scripts
- `npm start` - Start the server
- `npm run dev` - Start in development mode
- `npm test` - Run tests
- `npm run lint` - Run linter

## 🔐 Security

- All sensitive data is stored in environment variables
- OAuth2 authentication for Google Sheets access
- API key validation
- Rate limiting
- CORS protection

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Sheets API
- Express.js
- Node.js community

## 📞 Support

For support, email support@sheetapi.com or open an issue in the repository.

---

Made with ❤️ by [Your Name]

## 🚀 **CURRENT STATUS: FULLY WORKING** ✅

Your SheetAPI application is **completely functional** with all features working:

- ✅ Google OAuth2 Authentication  
- ✅ Google Sheets API Integration  
- ✅ Dynamic API Creation  
- ✅ Real-time Data Fetching  
- ✅ Query Filtering & Pagination  
- ✅ API Management Dashboard  
- ✅ Static File Server Compatible  

## 🎯 Quick Start (3 Steps)

1. **Start the server**: `python -m http.server 8080`
2. **Create an API**: Visit `http://localhost:8080/index.html`
3. **Manage APIs**: Visit `http://localhost:8080/api-dashboard.html`

## 🌟 Key Features

### 🔧 Easy API Creation
- Paste any Google Sheets URL
- Automatic sheet analysis and configuration
- Choose filtering, pagination, and caching options
- Get instant REST API endpoints

### 📊 Powerful Dashboard
- View all your created APIs
- Real-time usage statistics
- One-click testing and URL copying
- Easy API management and deletion

### 🔍 API Explorer
- Technical interface for developers
- Direct JSON access
- API documentation and examples
- Advanced parameter testing

### ⚡ Advanced Features
- **Query Filtering**: `?Name=John&Status=Active`
- **Pagination**: `?limit=10&offset=20`
- **Live Data**: Real-time sync with Google Sheets
- **Caching**: Configurable cache duration
- **Error Handling**: Comprehensive error messages

## 📁 Project Structure

```
SheetAPI/
├── index.html              # Main application (API creation)
├── api-dashboard.html      # API management dashboard
├── demo-api/
│   └── index.html         # API endpoint handler
├── assets/
│   ├── css/styles.css     # Responsive styling
│   └── js/
│       ├── app.js         # Main application logic
│       ├── auth.js        # Google OAuth2 handling
│       ├── converter.js   # Sheet-to-API conversion
│       └── config.js      # API configuration
├── server/                # Node.js backend (optional)
├── config/               # Google Cloud credentials
└── docs/                 # Documentation files
```

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: Google OAuth2
- **API**: Google Sheets API v4
- **Deployment**: Static file server compatible
- **Storage**: Browser localStorage for API configurations

## 🔑 Configuration

Your Google Cloud Project is fully configured:

```
Project ID: sheetapi-462416
Project Number: 344168920273
API Key: AIzaSyA7IiI5q_koGFSa_2LFG5zH2FJrbmHGnPY
OAuth2 Client ID: 344168920273-oo5bue2eo1j1trt6jhj7thp5tl5fu4jq.apps.googleusercontent.com
Authorized Origins: http://localhost:8080
```

## 📖 Usage Examples

### Creating an API
```bash
# 1. Visit the main application
open http://localhost:8080/index.html

# 2. Paste a Google Sheets URL
# Example: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit

# 3. Configure and create your API
```

### Using Your API
```bash
# Basic API call
curl "http://localhost:8080/demo-api/?id=YOUR_API_ID"

# With filtering
curl "http://localhost:8080/demo-api/?id=YOUR_API_ID&Name=John"

# With pagination
curl "http://localhost:8080/demo-api/?id=YOUR_API_ID&limit=5&offset=10"

# JSON format for tools
curl "http://localhost:8080/demo-api/?id=YOUR_API_ID&format=json"
```

### JavaScript Integration
```javascript
// Fetch API data
const response = await fetch('/demo-api/?id=YOUR_API_ID');
const data = await response.json();

// Filter results
const filtered = await fetch('/demo-api/?id=YOUR_API_ID&Status=Active');

// Paginated results
const page1 = await fetch('/demo-api/?id=YOUR_API_ID&limit=10&offset=0');
```

## 🎮 Interactive Features

### 📊 Dashboard (Recommended)
- **URL**: `http://localhost:8080/api-dashboard.html`
- **Features**: Visual API cards, statistics, one-click actions
- **Best for**: Non-technical users, overview management

### 🔍 API Explorer (Technical)
- **URL**: `http://localhost:8080/demo-api/`
- **Features**: JSON responses, technical details, direct API access
- **Best for**: Developers, API testing, integration

### 🛠️ Main Application
- **URL**: `http://localhost:8080/index.html`
- **Features**: API creation, sheet analysis, configuration
- **Best for**: Creating new APIs

## 🧪 Testing

### Sample Google Sheet for Testing
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
```

This public sheet contains student data perfect for testing all API features.

### Test Scenarios
1. **Basic API**: Create API, test data retrieval
2. **Filtering**: Test various query parameters
3. **Pagination**: Test limit/offset parameters
4. **Error Handling**: Test invalid API IDs and parameters

## 🔧 Troubleshooting

### Common Issues

**"No API ID provided" Error**
- ✅ **Fixed**: Visit `/demo-api/` to see all your APIs
- Use format: `/demo-api/?id=YOUR_API_ID`

**Sheet Access Denied**
- Ensure the Google Sheet is publicly accessible
- Check if the sheet URL is correct
- Verify API key permissions

**API Not Found**
- Check if API was created in the same browser
- APIs are stored in browser localStorage
- Visit the Dashboard to see all available APIs

### Getting Help
1. Visit the Dashboard: `http://localhost:8080/api-dashboard.html`
2. Check API Explorer: `http://localhost:8080/demo-api/`
3. Create test API with sample sheet
4. Review browser console for detailed errors

## 🚀 Deployment Options

### Static File Server (Current)
```bash
# Python 3
python -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

### Cloud Deployment
- **Netlify**: Direct drag-and-drop deployment
- **Vercel**: Git integration deployment
- **GitHub Pages**: Public repository hosting
- **Firebase Hosting**: Google Cloud integration

## 📄 License

MIT License - Feel free to use and modify for your projects!

## 🎉 What's Working

Everything! Your SheetAPI application is fully functional:

- ✅ Create APIs from Google Sheets
- ✅ Real-time data fetching
- ✅ Query filtering and pagination
- ✅ Visual dashboard for management
- ✅ Technical API explorer
- ✅ Error handling and troubleshooting
- ✅ Copy/paste API URLs
- ✅ Delete and manage APIs
- ✅ Browser localStorage persistence

**Ready to use!** Visit `http://localhost:8080/api-dashboard.html` to get started! 🚀
