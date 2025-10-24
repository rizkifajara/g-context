(function() {
  // Create overlay for screenshot selection
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 9999;
    cursor: crosshair;
  `;

  let selectionBox = null;
  let startX, startY;

  overlay.addEventListener('mousedown', startSelection);
  overlay.addEventListener('mousemove', updateSelection);
  overlay.addEventListener('mouseup', endSelection);

  function startSelection(e) {
    startX = e.clientX;
    startY = e.clientY;

    selectionBox = document.createElement('div');
    selectionBox.style.cssText = `
      position: fixed;
      border: 2px dashed #4285f4;
      background: rgba(66, 133, 244, 0.1);
      pointer-events: none;
      z-index: 10000;
    `;

    document.body.appendChild(selectionBox);
  }

  function updateSelection(e) {
    if (!selectionBox) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  }

  function endSelection(e) {
    if (!selectionBox) return;

    const endX = e.clientX;
    const endY = e.clientY;

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // Remove overlay and selection box
    document.body.removeChild(overlay);
    document.body.removeChild(selectionBox);

    // If selection is too small, don't proceed
    if (width < 10 || height < 10) {
      return;
    }

    // Capture the selected area
    captureScreenArea(left, top, width, height);
  }

  function captureScreenArea(left, top, width, height) {
    console.log('Capturing screen area:', { left, top, width, height });

    // Get device pixel ratio for accurate scaling
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    console.log('Device pixel ratio:', devicePixelRatio);
    console.log('Scroll position:', { scrollX, scrollY });

    // Use the Chrome tabs capture API
    chrome.runtime.sendMessage({
      action: 'captureVisibleTab'
    }, function(screenshotDataUrl) {
      if (chrome.runtime.lastError) {
        console.error('Error capturing tab:', chrome.runtime.lastError);
        alert('Error capturing tab: ' + chrome.runtime.lastError.message);
        return;
      }

      console.log('Screenshot captured, length:', screenshotDataUrl.length);

      // Create a canvas to crop the image
      const img = new Image();
      img.onload = function() {
        console.log('Image loaded, dimensions:', img.width, 'x', img.height);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Adjust coordinates for device pixel ratio
        const adjustedLeft = left * devicePixelRatio;
        const adjustedTop = top * devicePixelRatio;
        const adjustedWidth = width * devicePixelRatio;
        const adjustedHeight = height * devicePixelRatio;

        console.log('Adjusted coordinates:', {
          adjustedLeft,
          adjustedTop,
          adjustedWidth,
          adjustedHeight
        });

        // Set canvas size to actual selection size (not scaled)
        canvas.width = width;
        canvas.height = height;

        // Validate coordinates
        if (adjustedLeft + adjustedWidth > img.width || adjustedTop + adjustedHeight > img.height) {
          console.error('Selection coordinates out of bounds');
          console.log('Image bounds:', { width: img.width, height: img.height });
          console.log('Selection bounds:', {
            right: adjustedLeft + adjustedWidth,
            bottom: adjustedTop + adjustedHeight
          });
          alert('Selection area is outside the visible page area. Try a smaller selection.');
          return;
        }

        // Draw the cropped portion from high-res image to actual size canvas
        ctx.drawImage(
          img,
          adjustedLeft, adjustedTop, adjustedWidth, adjustedHeight,
          0, 0, width, height
        );

        const croppedImageDataUrl = canvas.toDataURL('image/png');
        console.log('Cropped image created, length:', croppedImageDataUrl.length);

        // Clean up canvas and image objects
        img.onload = null;
        img.onerror = null;
        img.src = '';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Send to background script for processing
        chrome.runtime.sendMessage({
          action: 'processScreenshot',
          imageData: croppedImageDataUrl
        });

        // Clean up local reference
        setTimeout(() => {
          // Allow some time for the message to be sent
          console.log('Cleaning up local screenshot data');
        }, 1000);

        // Show immediate feedback
        const feedback = document.createElement('div');
        feedback.textContent = 'Processing...';
        feedback.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #4285f4;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          z-index: 10001;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        document.body.appendChild(feedback);

        setTimeout(() => {
          if (feedback.parentNode) {
            document.body.removeChild(feedback);
          }
        }, 3000);
      };

      img.onerror = function() {
        console.error('Failed to load screenshot image');
        alert('Failed to process screenshot. Please try again.');
      };

      img.src = screenshotDataUrl;
    });
  }

  // Add the overlay to the page
  document.body.appendChild(overlay);

  // Handle escape key to cancel
  function handleEscape(e) {
    if (e.key === 'Escape') {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
      if (selectionBox && selectionBox.parentNode) {
        document.body.removeChild(selectionBox);
      }
      document.removeEventListener('keydown', handleEscape);
    }
  }

  document.addEventListener('keydown', handleEscape);
})();