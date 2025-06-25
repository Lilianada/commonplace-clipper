document.addEventListener('DOMContentLoaded', async () => {
    let isAuthenticated = false;
    let html = '', markdown = '';
    
    // GitHub status elements
    const githubStatusText = document.getElementById('github-status-text');
    const githubConnectBtn = document.getElementById('github-connect');
    const saveBtn = document.getElementById('clip-save');
    const loadingIndicator = document.getElementById('loading');
    
    // Check GitHub authentication status
    async function checkGitHubAuth() {
        try {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'CHECK_GITHUB_AUTH' }, (response) => {
                    isAuthenticated = response.authenticated;
                    
                    if (isAuthenticated) {
                        githubStatusText.textContent = 'Connected to GitHub';
                        githubStatusText.parentElement.classList.add('authenticated');
                        githubStatusText.parentElement.classList.remove('not-authenticated');
                        githubConnectBtn.style.display = 'none';
                        saveBtn.disabled = false;
                    } else {
                        githubStatusText.textContent = 'Not connected to GitHub';
                        githubStatusText.parentElement.classList.add('not-authenticated');
                        githubStatusText.parentElement.classList.remove('authenticated');
                        githubConnectBtn.style.display = 'inline-block';
                        saveBtn.disabled = true;
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error checking GitHub auth:', error);
            githubStatusText.textContent = 'GitHub connection error';
            githubStatusText.parentElement.classList.add('not-authenticated');
        }
    }
    
    // Initialize GitHub connect button
    githubConnectBtn.addEventListener('click', () => {
        githubStatusText.textContent = 'Connecting to GitHub...';
        chrome.runtime.sendMessage({ type: 'INITIATE_GITHUB_AUTH' }, (response) => {
            if (!response || response.error) {
                console.error('Error initiating GitHub auth:', response?.error);
                githubStatusText.textContent = 'GitHub connection error';
            }
        });
    });
    
    // Listen for auth success message from background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'GITHUB_AUTH_SUCCESS') {
            checkGitHubAuth();
        }
    });
    
    // Get the active tab
    const getActiveTab = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                resolve(tabs[0]);
            });
        });
    };
    
    const tab = await getActiveTab();

    // Inject content script if not already present
    await new Promise((resolve) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_scripts/index.js']
        }, () => resolve());
    });

    // Request selection as HTML and Markdown
    try {
        const injectionResults = await new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    return new Promise(resolveInner => {
                        function handler(event) {
                            if (event.source !== window || !event.data || event.data.type !== 'SELECTION_CLIP_RESULT') return;
                            window.removeEventListener('message', handler);
                            resolveInner(event.data);
                        }
                        window.addEventListener('message', handler);
                        window.postMessage({ type: 'GET_SELECTION_CLIP' }, '*');
                    });
                }
            }, (results) => resolve(results));
        });
        
        if (injectionResults && injectionResults[0] && injectionResults[0].result) {
            html = injectionResults[0].result.html || '';
            markdown = injectionResults[0].result.markdown || '';
        }
    } catch (e) {
        // fallback: plain text selection
        const selectionResults = await new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const selection = window.getSelection();
                    return selection && selection.toString();
                }
            }, (results) => resolve(results));
        });
        
        if (selectionResults && selectionResults[0]) {
            markdown = selectionResults[0].result || '';
        }
    }

    // Fill the form fields
    document.getElementById('clip-title').value = tab.title || '';
    document.getElementById('clip-site').textContent = new URL(tab.url).hostname;
    document.getElementById('clip-url').textContent = tab.url;
    document.getElementById('clip-selection').value = markdown || '';

    // Save to GitHub button
    document.getElementById('clip-save').onclick = () => {
        if (!isAuthenticated) {
            alert('Please connect to GitHub first');
            return;
        }
        
        const clip = {
            title: document.getElementById('clip-title').value,
            type: document.getElementById('clip-type').value,
            tags: document.getElementById('clip-tags').value.split(',').map(t => t.trim()).filter(Boolean),
            site: document.getElementById('clip-site').textContent,
            url: document.getElementById('clip-url').textContent,
            selection: document.getElementById('clip-selection').value,
            html,
            markdown,
            date: new Date().toISOString()
        };
        
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        saveBtn.disabled = true;
        
        chrome.runtime.sendMessage({ 
            type: 'SAVE_CLIP_TO_GITHUB', 
            clip 
        }, (response) => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            saveBtn.disabled = false;
            
            if (response && response.success) {
                alert('Clip saved to GitHub successfully!');
            } else {
                alert(`Error saving to GitHub: ${response ? response.error : 'Unknown error'}`);
            }
        });
    };
    
    // Copy Markdown button
    document.getElementById('clip-copy').onclick = () => {
        const selection = document.getElementById('clip-selection');
        selection.select();
        document.execCommand('copy');
        alert('Markdown copied to clipboard!');
    };
    
    // Check GitHub auth status on load
    await checkGitHubAuth();
});
