// Add initialization log
console.log('G-Context content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request);
  console.log('Message action:', request.action);

  if (request.action === 'showResult') {
    console.log('Showing result overlay with text:', request.text.substring(0, 100) + '...');
    showResultOverlay(request.text, request.screenshotDataUrl);
  } else if (request.action === 'showError') {
    console.log('Showing error overlay:', request.error);
    showResultOverlay(`Error: ${request.error}`, null);
  }

  // Send response to acknowledge receipt
  sendResponse({ received: true });
});

// Simple markdown parser function
function parseMarkdown(text) {
  let html = text;

  // Code blocks (```language\ncode\n```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
    const language = lang || 'text';
    return `<pre class="code-block"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers (# ## ### #### ##### ######)
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold text (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic text (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough (~~text~~)
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists (* item or - item)
  html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul class="unordered-list">$1</ul>');
  html = html.replace(/<\/ul>\s*<ul class="unordered-list">/g, '');

  // Ordered lists (1. item)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ol class="ordered-list">$1</ol>');
  html = html.replace(/<\/ol>\s*<ol class="ordered-list">/g, '');

  // Blockquotes (> text)
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

  // Horizontal rules (--- or ***)
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  // Line breaks (double newline becomes <br>)
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

// HTML escaping function
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showResultOverlay(text, screenshotDataUrl) {
  console.log('Creating result overlay:', { textLength: text.length, hasScreenshot: !!screenshotDataUrl });

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10001;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create content container
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 12px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  `;

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.addEventListener('click', cleanupOverlay);
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#333');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#666');

  // Create title
  const title = document.createElement('h3');
  title.textContent = '🔍 Extracted Text';
  title.style.cssText = `
    margin: 0 0 15px 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
  `;

  // Create screenshot preview if available
  let screenshotElement = '';
  if (screenshotDataUrl) {
    const screenshotContainer = document.createElement('div');
    screenshotContainer.style.cssText = `
      margin-bottom: 15px;
      text-align: center;
    `;

    const screenshot = document.createElement('img');
    screenshot.src = screenshotDataUrl;
    screenshot.style.cssText = `
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;

    screenshotContainer.appendChild(screenshot);
    content.appendChild(screenshotContainer);
  }

  // Parse markdown and create text content
  const parsedHtml = parseMarkdown(text);
  const textContent = document.createElement('div');
  textContent.innerHTML = parsedHtml;
  textContent.className = 'markdown-content';
  textContent.style.cssText = `
    line-height: 1.6;
    color: #333;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #4285f4;
    font-size: 14px;
    overflow-x: auto;
  `;

  // Create copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy Text';
  copyBtn.style.cssText = `
    margin-top: 15px;
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s;
  `;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = '✓ Copied!';
      copyBtn.style.background = '#34a853';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy Text';
        copyBtn.style.background = '#4285f4';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });
  copyBtn.addEventListener('mouseenter', () => copyBtn.style.background = '#3367d6');
  copyBtn.addEventListener('mouseleave', () => copyBtn.style.background = '#4285f4');

  // Assemble the overlay
  content.appendChild(closeBtn);
  content.appendChild(title);
  content.appendChild(textContent);
  content.appendChild(copyBtn);
  overlay.appendChild(content);

  // Close on escape key
  function handleEscape(e) {
    if (e.key === 'Escape') {
      cleanupOverlay();
    }
  }

  // Close on background click
  function handleBackgroundClick(e) {
    if (e.target === overlay) {
      cleanupOverlay();
    }
  }

  // Cleanup function to properly remove overlay and free memory
  function cleanupOverlay() {
    if (overlay && overlay.parentNode) {
      console.log('Cleaning up overlay and freeing memory');

      // Clear the screenshot image if it exists
      const screenshotImg = overlay.querySelector('img');
      if (screenshotImg) {
        screenshotImg.src = '';
        screenshotImg.onload = null;
        screenshotImg.onerror = null;
      }

      // Remove event listeners
      document.removeEventListener('keydown', handleEscape);
      overlay.removeEventListener('click', handleBackgroundClick);

      // Remove overlay from DOM
      document.body.removeChild(overlay);

      // Clear the overlay reference
      overlay = null;

      console.log('Overlay cleanup completed');
    }
  }

  // Add to page
  console.log('Adding overlay to page body');
  document.body.appendChild(overlay);
  console.log('Overlay added to page');

  // Set up event listeners after overlay is added to DOM
  document.addEventListener('keydown', handleEscape);
  overlay.addEventListener('click', handleBackgroundClick);
}