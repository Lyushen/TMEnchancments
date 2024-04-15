// ==UserScript==
// @name         Embed YouTube Extractor
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0009
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
        const allIframes = document.querySelectorAll('iframe[src*="youtube.com/embed/"]');
        let newUrl;

        // Process the first YouTube iframe found
        if (allIframes.length > 0) {
            const iframe = allIframes[0]; // You can loop through all if necessary
            const videoId = iframe.src.split('/embed/')[1].split('?')[0];
            newUrl = `https://www.youtube.com/watch?v=${videoId}`;
            iframe.src = newUrl;
        } else {
            // Fallback: Find URL within <noscript> using a generic method
            const noscriptContent = document.createElement("div");
            noscriptContent.innerHTML = document.querySelector("noscript").textContent;
            const aTag = noscriptContent.querySelector('a[href*="youtube.com/watch"]');
            if (aTag) {
                newUrl = aTag.href;
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