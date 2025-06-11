# 🚀 SheetAPI Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Google Cloud Platform account
- Google Sheets API enabled

## Environment Setup

1. Create a `.env` file in the root directory with the following variables:
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Google Sheets API Key
GOOGLE_API_KEY=your-api-key-here

# Server Configuration
PORT=3000
SESSION_SECRET=your-session-secret-here
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

## Google Cloud Platform Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - http://localhost:3000/auth/google/callback
6. Copy the client ID and client secret to your `.env` file

## Security Notes

- Never commit the `.env` file to version control
- Keep your API keys and credentials secure
- Use environment variables for all sensitive data
- Regularly rotate your API keys and credentials

Great! I can see you've added your Google OAuth2 credentials. Here's what you need to do next:

## ✅ What's Already Done

✅ **OAuth2 Client ID**: `344168920273-oo5bue2eo1j1trt6jhj7thp5tl5fu4jq.apps.googleusercontent.com`  
✅ **Client Secret**: `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`  
✅ **Project ID**: `sheetapi-462416`  
✅ **JavaScript Origins**: `http://localhost:8080`  
✅ **Redirect URIs**: `http://localhost:8080/oauth2callback`  

## 🔧 What You Need to Do Next

### 1. Create Google API Key

You need to create an API Key for accessing Google Sheets API:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `sheetapi-462416`
3. Go to **APIs & Services > Credentials**
4. Click **+ CREATE CREDENTIALS** > **API Key**
5. Copy the API key and replace `YOUR_GOOGLE_API_KEY` in the code

**Important**: Restrict your API key to only Google Sheets API for security.

### 2. Enable Required APIs

Make sure these APIs are enabled in your Google Cloud project:

1. Go to **APIs & Services > Library**
2. Enable these APIs:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API** (for accessing sheets)

### 3. Update API Key in Code

Replace `YOUR_GOOGLE_API_KEY` with your actual API key in these files:

- `assets/js/app.js`
- `assets/js/auth.js` 
- `assets/js/converter.js`

### 4. Install Dependencies

```bash
# Install frontend dependencies (if using any)
npm install

# Install backend dependencies
cd server
npm install
```

### 5. Start the Application

```bash
# Option 1: Simple HTTP Server for Frontend
npx http-server . -p 8080

# Option 2: If you have the backend
cd server
npm start
```

### 6. Test the Setup

1. Open http://localhost:8080 in your browser
2. Click "Sign In" to test Google OAuth
3. Try pasting a Google Sheets URL

## 🔍 Testing Your OAuth2 Setup

### Test URLs to Try:

Here are some public Google Sheets you can test with:

1. **Sample Data Sheet**: 
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   ```

2. **Employee Data Sample**:
   ```
   https://docs.google.com/spreadsheets/d/1mHIWnDvW9cALRMq9OdNfRwjAthCUq8OOOKsRuJEQYow/edit
   ```

### Expected Flow:

1. **Paste URL** → App detects spreadsheet ID
2. **Click "Analyze Sheet"** → Fetches sheet metadata
3. **Select Sheet Tab** → Choose which tab to convert
4. **Configure Settings** → Set API name, filters, etc.
5. **Create API** → Get your live API endpoint

## 🚨 Common Issues & Solutions

### "Failed to fetch sheet data"
- **Solution**: Make sure the Google Sheet is publicly accessible or you're signed in with proper permissions

### "API key not valid" 
- **Solution**: Check that your API key is correct and Google Sheets API is enabled

### "Authentication failed"
- **Solution**: Verify your OAuth2 client ID and that the domain is whitelisted

### "CORS Error"
- **Solution**: Make sure you're accessing via `http://localhost:8080` (not file://)

## 🎯 Next Steps

Once basic setup works:

1. **Deploy Frontend**: Use Netlify, Vercel, or GitHub Pages
2. **Deploy Backend**: Use Railway, Heroku, or AWS
3. **Custom Domain**: Point your domain to the deployed app
4. **Production OAuth**: Update redirect URIs for your domain

## 📞 Need Help?

If you encounter issues:

1. Check browser console for JavaScript errors
2. Verify all APIs are enabled in Google Cloud
3. Test with a simple public Google Sheet first
4. Make sure you're using the correct URLs

Your setup looks good! The main thing you need now is to create the Google API Key and replace the placeholder in the code. 