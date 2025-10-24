// Handle keyboard shortcut
chrome.commands.onCommand.addListener(function(command) {
  if (command === 'capture-screenshot') {
    // Get the active tab and inject screenshot script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['screenshot.js']
        });
      }
    });
  }
});

// Handle screenshot capture request
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
      sendResponse(dataUrl);
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'processScreenshot') {
    processImageWithGemini(request.imageData, sender.tab.id);
  }
});

async function processImageWithGemini(imageDataUrl, tabId) {
  console.log('Starting image processing with Gemini...');

  try {
    // Get API key and target language from storage
    const result = await chrome.storage.sync.get(['geminiApiKey', 'targetLanguage']);
    const apiKey = result.geminiApiKey;
    const targetLanguage = result.targetLanguage || '';

    console.log('API key found:', !!apiKey);
    console.log('Target language:', targetLanguage || 'auto-detect');

    if (!apiKey) {
      console.error('No API key found');
      chrome.tabs.sendMessage(tabId, {
        action: 'showError',
        error: 'Please set your Gemini API key in the extension popup'
      });
      return;
    }

    // Validate image data
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      console.error('Invalid image data:', imageDataUrl ? imageDataUrl.substring(0, 50) + '...' : 'null');
      chrome.tabs.sendMessage(tabId, {
        action: 'showError',
        error: 'Invalid screenshot data'
      });
      return;
    }

    // Convert data URL to base64
    const base64Image = imageDataUrl.split(',')[1];
    console.log('Image data length:', base64Image.length);

    // Build the prompt based on target language
    let promptText;
    if (targetLanguage && targetLanguage !== '') {
      promptText = `Extract all text from this image and translate it to ${targetLanguage}. If the text is already in ${targetLanguage} or contains no text, just extract it as-is. Format the response clearly with the original text first, followed by the ${targetLanguage} translation.`;
    } else {
      promptText = "Extract all text from this image. If the text is in a foreign language, provide both the original text and an English translation. Format the response clearly for easy reading.";
    }

    // Prepare the request to Gemini API
    console.log('Sending request to Gemini API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: promptText
            },
            {
              inline_data: {
                mime_type: "image/png",
                data: base64Image
              }
            }
          ]
        }]
      })
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response data:', data);

    // Check for response content
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response');
      chrome.tabs.sendMessage(tabId, {
        action: 'showError',
        error: 'No response from Gemini API'
      });
      return;
    }

    const extractedText = data.candidates[0]?.content?.parts?.[0]?.text || 'No text found in image';
    console.log('Extracted text:', extractedText);

    // Clean up the image data URL from memory
    console.log('Cleaning up temporary image data');
    const tempImageDataUrl = imageDataUrl;
    imageDataUrl = null; // Clear reference

    // Send result back to content script
    console.log('Sending result to content script:', { tabId, textLength: extractedText.length });

    // First ensure content script is loaded
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error injecting content script:', chrome.runtime.lastError);
        // Try sending message anyway in case script is already loaded
        sendMessageToContentScript();
      } else {
        console.log('Content script injected successfully');
        // Small delay to ensure script is ready
        setTimeout(sendMessageToContentScript, 100);
      }
    });

    function sendMessageToContentScript() {
      chrome.tabs.sendMessage(tabId, {
        action: 'showResult',
        text: extractedText,
        screenshotDataUrl: imageDataUrl
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError);
          // Try showing an alert as fallback
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: showFallbackResult,
            args: [extractedText]
          });
        } else {
          console.log('Message sent successfully to content script:', response);
        }
      });
    }

  } catch (error) {
    console.error('Error processing image with Gemini:', error);
    console.log('Sending error to content script:', { tabId, error: error.message });
    chrome.tabs.sendMessage(tabId, {
      action: 'showError',
      error: error.message || 'Failed to process image with Gemini API'
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error sending error message to content script:', chrome.runtime.lastError);
      } else {
        console.log('Error message sent successfully to content script');
      }
    });
  }
}
// Fallback function to show result using direct script injection
function showFallbackResult(text) {
  alert("G-Context Result:\n\n" + text.substring(0, 500) + (text.length > 500 ? "..." : ""));
}
