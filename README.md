# Web Clipper Extension

A browser extension that saves selected text from web pages to your GitHub repository as Markdown files with metadata.

## Features

- Select text on any webpage and save it as a Markdown file
- Automatically captures metadata: title, URL, source website
- Add custom tags and categorize clips by type (article, quote, etc.)
- Saves directly to your GitHub repository
- Preserves formatting with HTML to Markdown conversion

## Setup Instructions

### 1. Register a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Web Clipper
   - **Homepage URL**: https://github.com/Lilianada/Lilyslab
   - **Authorization callback URL**: https://lilianada.github.io/oauth-callback
4. Click "Register application"
5. Note your Client ID and generate a Client Secret

### 2. Create the OAuth callback page

1. Create a GitHub Pages repository or use an existing one
2. Add the `oauth-callback.html` file to your repository
3. Make sure it's accessible at the URL you specified in step 1

### 3. Configure the extension

1. Update `src/background.js` with your:
   - GitHub Client ID
   - GitHub repository details
   - Redirect URL

### 4. Build the extension

```bash
npm install
npm run build
```

### 5. Load the extension

#### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `addon` folder

#### Firefox
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on..." and select any file in the `addon` folder

### 6. Use the extension

1. Navigate to a webpage
2. Select text you want to clip
3. Click the extension icon or press Ctrl+Shift+C
4. Fill in the title, type, and tags
5. Click "Save to GitHub"

## Development

- `npm run dev` - Watch for changes and rebuild automatically
- `npm run build` - Build the extension for production

## License

MIT
