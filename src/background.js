// GitHub OAuth configuration
const GITHUB_CLIENT_ID = 'Iv23liIE0QVUZFuIfOO9'; // Your GitHub OAuth App client ID
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_REPO_OWNER = 'Lilianada';
const GITHUB_REPO_NAME = 'Lilyslab';
const REDIRECT_URL = 'https://lilianada.github.io/oauth-callback'; // Use your GitHub pages or another URL you control

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Clipper extension installed');
  // Check if we already have a token
  chrome.storage.local.get(['githubToken'], (result) => {
    console.log('Stored token:', result.githubToken ? 'Yes' : 'No');
  });
});

// Function to initiate GitHub OAuth flow
async function initiateGitHubAuth() {
  // Generate a random state value for security
  const authState = Math.random().toString(36).substring(2, 15);
  
  // Store the state
  await chrome.storage.local.set({ authState });
  
  // Create the GitHub authorization URL
  const authUrl = `${GITHUB_AUTH_URL}?client_id=${GITHUB_CLIENT_ID}&state=${authState}&scope=repo&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`;
  
  // Open the authorization page in a new tab
  chrome.tabs.create({ url: authUrl });
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
    
    // If no stored client secret, prompt for it (development only)
    if (!secret) {
      // In Manifest V3, we can't use window.prompt directly in service workers
      // Let's create a tab to get the client secret
      await new Promise(resolve => {
        chrome.tabs.create({ 
          url: chrome.runtime.getURL('oauth-callback.html') + '?promptSecret=true' 
        }, async (tab) => {
          const listener = async (message, sender) => {
            if (message.type === 'GITHUB_CLIENT_SECRET' && sender.tab.id === tab.id) {
              secret = message.secret;
              if (secret) {
                await chrome.storage.local.set({ clientSecret: secret });
              }
              chrome.tabs.remove(tab.id);
              chrome.runtime.onMessage.removeListener(listener);
              resolve();
            }
          };
          chrome.runtime.onMessage.addListener(listener);
        });
      });
      
      if (!secret) {
        throw new Error("Client secret is required for GitHub authentication");
      }
    }
    
    // Use a CORS proxy for development (not secure for production)
    const tokenResponse = await fetch(`https://cors-anywhere.herokuapp.com/${GITHUB_TOKEN_URL}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: secret,
        code: code,
        redirect_uri: REDIRECT_URL
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (tokenData.access_token) {
      // Store the token in extension storage
      await chrome.storage.local.set({ githubToken: tokenData.access_token });
      console.log('GitHub authentication successful');
      
      // Notify any open popups
      chrome.runtime.sendMessage({ type: 'GITHUB_AUTH_SUCCESS' });
      return true;
    } else {
      throw new Error("No access token in response");
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return false;
  }
}

// Listen for tabs being updated to catch the redirect
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if this is our redirect URL
  if (changeInfo.url && changeInfo.url.startsWith(REDIRECT_URL)) {
    const url = new URL(changeInfo.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code, state).then(success => {
        if (success) {
          // Close the auth tab
          chrome.tabs.remove(tabId);
        }
      });
    }
  }
});

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
  if (message.type === 'INITIATE_GITHUB_AUTH') {
    initiateGitHubAuth().catch(error => {
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
      sendResponse({ authenticated: !!result.githubToken });
    });
    return true; // For async response
  }
});
