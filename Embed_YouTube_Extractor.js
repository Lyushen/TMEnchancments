// ==UserScript==
// @name         Embed YouTube Extractor
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://youtube.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0011
// @description  Transform YouTube embed URL to watch URL on keypress Ctrl+B
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/Embed_YouTube_Extractor.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/Embed_YouTube_Extractor.js
// @grant        GM_setClipboard
// @match        *://smm-therapy.kwiga.com/*
// ==/UserScript==
// @match        *://*/*
(function() {
    'use strict';
    console.log('[Loaded]  Embed YouTube Extractor');

    // Function to convert URL and copy it to clipboard
    function convertAndCopyUrl() {
        // Attempt to find different iframe players
        const youtubeSelector = 'iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"]';
        const allIframes = document.querySelectorAll(youtubeSelector);
        let newUrl;

        // Process each YouTube iframe found (if multiple iframes, this will handle all)
        for (const iframe of allIframes) {
            const videoId = iframe.src.split('/embed/')[1].split('?')[0];
            newUrl = `https://www.youtube.com/watch?v=${videoId}`;
            iframe.src = newUrl;
            console.log('Processed iframe with new src:', iframe.src);
            // Optional: Copy to clipboard each URL found; current logic will only copy the last one processed
            navigator.clipboard.writeText(newUrl)
                .then(() => console.log('URL copied to clipboard!'))
                .catch(err => console.error('Failed to copy URL:', err));
        }

        if (!allIframes.length) {
            // Fallback: Find URL within <noscript> using a generic method
            const noscriptContent = document.createElement("div");
            noscriptContent.innerHTML = document.querySelector("noscript").textContent;
            const aTag = noscriptContent.querySelector('a[href*="youtube.com/watch"]');
            if (aTag) {
                newUrl = aTag.href;
                console.log('URL found in <noscript>:', newUrl);
                navigator.clipboard.writeText(newUrl)
                    .then(() => console.log('Fallback URL copied to clipboard!'))
                    .catch(err => console.error('Failed to copy fallback URL:', err));
            }
        }

        // If a new URL was found, handle the clipboard action
        if (newUrl) {
            console.log('URL transformed or found:', newUrl);
            GM_setClipboard(newUrl);
        } else {
            console.log('No suitable URL found');
        }
    }

    // Event listener for keypress event
    document.addEventListener('keydown', function(e) {
        // Check if Ctrl+B is pressed
        if ((e.ctrlKey && e.key === 'b') || (e.ctrlKey && e.key === 'и')) {
            console.log('Ctrl+B pressed');
            convertAndCopyUrl();
        }
    });
})();