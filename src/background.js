// GitHub OAuth configuration
const GITHUB_CLIENT_ID = 'Iv23liIE0QVUZFuIfOO9'; // Your GitHub OAuth App client ID
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_REPO_OWNER = 'Lilianada';
const GITHUB_REPO_NAME = 'Lilyslab';
const REDIRECT_URL = chrome.identity.getRedirectURL('oauth2'); // Explicitly specify the oauth2 scheme

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Clipper extension installed');
  console.log('Redirect URL for OAuth:', REDIRECT_URL);
  // Check if we already have a token
  chrome.storage.local.get(['githubToken'], (result) => {
    console.log('Stored token:', result.githubToken ? 'Yes' : 'No');
  });
});

// Function to initiate GitHub OAuth flow
async function initiateGitHubAuth() {
  try {
    console.log('Initiating GitHub auth...');
    
    // Generate a random state value for security
    const authState = Math.random().toString(36).substring(2, 15);
    
    // Store the state
    await chrome.storage.local.set({ authState });
    
    // Create the GitHub authorization URL
    const authUrl = `${GITHUB_AUTH_URL}?client_id=${GITHUB_CLIENT_ID}&state=${authState}&scope=repo&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`;
    console.log('Auth URL:', authUrl);
    
    // Use chrome.identity to initiate the authentication flow
    // This handles opening and closing the authorization page automatically
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });
    
    console.log('Got response URL:', responseUrl);
    
    // Extract the code and state from the response URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    // Process the authorization code
    if (code && state) {
      console.log('Got code and state, handling callback...');
      return handleOAuthCallback(code, state);
    }
  } catch (error) {
    console.error('OAuth flow error:', error);
  }
}

// Function to handle OAuth callback and exchange code for token
async function handleOAuthCallback(code, state) {
  // Verify the state matches for security
  const { authState: storedState } = await chrome.storage.local.get(['authState']);
  if (state !== storedState) {
    console.error('OAuth state mismatch');
    return;
  }
  
  // Exchange the code for an access token
  try {
    // In production, this should be done on your backend
    const { clientSecret } = await chrome.storage.local.get(['clientSecret']);
    let secret = clientSecret;
    
    // Set a hardcoded client secret for development to avoid the prompt
    // IMPORTANT: In a production environment, this should be handled securely
    if (!secret) {
      // Using the provided GitHub OAuth client secret
      secret = "eb4639586c0f8ddb37ce451128b6200721fc1014";
      await chrome.storage.local.set({ clientSecret: secret });
      
      // Log for debugging
      console.log('Using default client secret');
    }
    
    // Create a form for the token request
    // Use a proxy to bypass CORS (for development purposes only)
    // In production, this should be handled by your backend server
    const tokenExchangeUrl = `https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token`;
    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': chrome.runtime.getURL('')
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: secret,
        code: code,
        redirect_uri: REDIRECT_URL
      })
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token response received:', tokenData.access_token ? 'Token received' : 'No token');
    
    if (tokenData.access_token) {
      // Store the token in extension storage
      await chrome.storage.local.set({ githubToken: tokenData.access_token });
      console.log('GitHub authentication successful');
      
      // Notify any open popups
      chrome.runtime.sendMessage({ type: 'GITHUB_AUTH_SUCCESS' });
      return true;
    } else if (tokenData.error) {
      console.error('GitHub auth error:', tokenData.error);
      throw new Error(`GitHub auth error: ${tokenData.error_description || tokenData.error}`);
    } else {
      throw new Error("No access token in response");
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return false;
  }
}

// GitHub API: Create or update a file in the repository
async function saveClipToGitHub(clip) {
  try {
    // Get the stored GitHub token
    const { githubToken } = await chrome.storage.local.get(['githubToken']);
    if (!githubToken) {
      throw new Error('Not authenticated with GitHub');
    }
    
    // Generate a filename based on the title
    const filename = `${clip.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.md`;
    const path = `Content/webClips/${filename}`;
    
    // Create content with frontmatter metadata
    const content = `---
title: "${clip.title}"
type: "${clip.type}"
tags: [${clip.tags.map(tag => `"${tag}"`).join(', ')}]
url: "${clip.url}"
site: "${clip.site}"
date: "${clip.date}"
---

${clip.markdown}
`;
    
    // Encode content to Base64
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // Create the file via GitHub API
    const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add web clip: ${clip.title}`,
        content: encodedContent,
        branch: 'main' // or your default branch name
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving to GitHub:', error);
    throw error;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.type);
  
  if (message.type === 'INITIATE_GITHUB_AUTH') {
    initiateGitHubAuth()
      .then(result => {
        console.log('Auth result:', result);
        sendResponse({ success: !!result });
      })
      .catch(error => {
        console.error('Auth initiation error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // For async response
  }
  
  if (message.type === 'SAVE_CLIP_TO_GITHUB') {
    saveClipToGitHub(message.clip)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // For async response
  }
  
  if (message.type === 'CHECK_GITHUB_AUTH') {
    chrome.storage.local.get(['githubToken'], result => {
      const isAuthenticated = !!result.githubToken;
      console.log('Auth check:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
      sendResponse({ authenticated: isAuthenticated });
    });
    return true; // For async response
  }
  
  // For the OAuth callback from the oauth-callback.html page
  if (message.type === 'GITHUB_OAUTH_CALLBACK' && message.code && message.state) {
    console.log('Received OAuth callback from page');
    handleOAuthCallback(message.code, message.state)
      .then(success => {
        sendResponse({ success });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});
