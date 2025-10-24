document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const captureBtn = document.getElementById('captureBtn');
  const statusDiv = document.getElementById('status');
  const targetLanguageSelect = document.getElementById('targetLanguage');

  // Load saved settings
  chrome.storage.sync.get(['geminiApiKey', 'targetLanguage'], function(result) {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      captureBtn.disabled = false;
    }
    if (result.targetLanguage) {
      targetLanguageSelect.value = result.targetLanguage;
    }
  });

  // Save API key
  saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
        showStatus('API key saved successfully!', 'success');
        captureBtn.disabled = false;
      });
    } else {
      showStatus('Please enter a valid API key', 'error');
    }
  });

  // Save target language when changed
  targetLanguageSelect.addEventListener('change', function() {
    chrome.storage.sync.set({ targetLanguage: this.value });
  });

  // Handle capture button click
  captureBtn.addEventListener('click', function() {
    startScreenshotCapture();
  });

  function startScreenshotCapture() {
    // Save current target language
    chrome.storage.sync.set({ targetLanguage: targetLanguageSelect.value });

    // Close popup and start capture
    window.close();

    // Inject content script to handle screenshot
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['screenshot.js']
      });
    });
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showResult') {
    showResultPopup(request.text, request.screenshotDataUrl);
  } else if (request.action === 'showError') {
    showResultPopup(`Error: ${request.error}`, null);
  }
});

function showResultPopup(text, screenshotDataUrl) {
  // Create result popup
  const popup = document.createElement('div');
  popup.className = 'result-popup';
  popup.style.display = 'flex';

  popup.innerHTML = `
    <div class="result-content">
      <button class="result-close" onclick="this.parentElement.parentElement.remove()">×</button>
      ${screenshotDataUrl ? `<img src="${screenshotDataUrl}" style="max-width: 100%; border-radius: 4px; margin-bottom: 10px;">` : ''}
      <h3>Extracted/Translated Text:</h3>
      <div class="result-text">${text}</div>
    </div>
  `;

  document.body.appendChild(popup);
}