# G-Context Chrome Extension

<div align="center">
  <img src="logo.png" alt="G-Context Logo" width="150" height="150">

  **Smart Text Extraction & Translation Tool**
</div>

A powerful Chrome extension that extracts and translates text from screenshots using Google's Gemini 2.5 Flash API. Simply click and drag to select any portion of a webpage, and watch as AI-powered OCR extracts readable text for you.

## Features

- 📸 **Screenshot Capture**: Click and drag to select any portion of a webpage
- 🔍 **Text Extraction**: Uses Google Gemini API to extract text from images
- 🌐 **Translation**: Automatically translates foreign language text
- ⌨️ **Keyboard Shortcut**: Use `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) for quick capture
- 🔑 **BYOK (Bring Your Own Key)**: Users provide their own Gemini API key
- 📋 **Copy to Clipboard**: Easy one-click copying of extracted text

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `g-context` folder
5. The extension should now appear in your extensions list

## Setup

1. Click the G-Context icon in your Chrome toolbar
2. Enter your Google Gemini API key in the popup
3. Click "Save API Key"

> **Note**: You need to get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Usage

### Method 1: Toolbar Icon
1. Click the G-Context extension icon
2. Click "Capture Screenshot"
3. Click and drag on the page to select the area you want to extract text from
4. Release the mouse to capture

### Method 2: Keyboard Shortcut
1. Press `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)
2. Click and drag on the page to select the area
3. Release to capture

## How it Works

1. **Screenshot Capture**: The extension captures a selected portion of the visible tab
2. **API Request**: Sends the image to Google's Gemini 2.5 Flash API
3. **Text Processing**: The AI extracts text and provides translations if needed
4. **Result Display**: Shows the extracted text in an overlay with a copy button

## File Structure

```
g-context/
├── manifest.json          # Extension manifest
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── background.js          # Background service worker
├── content.js             # Content script for displaying results
├── content.css            # Styles for content script
├── screenshot.js          # Screenshot capture functionality
├── icons/                 # Extension icons
└── README.md              # This file
```

## Permissions

The extension requires the following permissions:

- `activeTab`: Access to the currently active tab
- `storage`: Store API key and preferences
- `scripting`: Inject scripts for screenshot functionality
- `generativelanguage.googleapis.com`: Access to Gemini API

## API Key Security

- Your API key is stored locally in Chrome's sync storage
- The key is only sent to Google's Gemini API servers
- No data is stored on external servers

## Troubleshooting

### Extension not working
- Make sure you've entered a valid Gemini API key
- Check that you have an active internet connection
- Verify the API key has sufficient quota

### Screenshot not capturing
- Try refreshing the page and trying again
- Make sure you're not on a Chrome internal page (like `chrome://settings`)
- Some websites may block screenshot functionality

### API errors
- Verify your API key is valid and active
- Check your Gemini API usage quota
- Ensure you're using the correct API endpoint

## Development

To modify or extend this extension:

1. Make changes to the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh button on the G-Context extension
4. Test your changes

## License

MIT License - feel free to use, modify, and distribute

## Support

If you encounter issues, please check:
1. Your API key is valid and has quota
2. The extension has proper permissions
3. Chrome is up to date
4. You're not on a restricted page (like chrome:// pages)