// ==UserScript==
// @name         Embed YouTube Extractor
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0001
// @description  Transform YouTube embed URL to watch URL on keypress Ctrl+B
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/Embed_YouTube_Extractor.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/Embed_YouTube_Extractor.js
// @grant        none
// @match        *://smm-therapy.kwiga.com/*
// @match        *://*/*
// ==/UserScript==

(function() {
    'use strict';

    // Function to convert embed URL to watch URL
    function convertEmbedUrlToWatchUrl() {
        const iframe = document.querySelector('iframe.player');
        if (iframe && iframe.src.includes('youtube-nocookie.com/embed/')) {
            const videoId = iframe.src.split('/embed/')[1].split('?')[0];
            const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
            iframe.src = newUrl;
            console.log('URL transformed:', newUrl);
        } else {
            console.log('No suitable iframe found or already transformed');
        }
    }

    // Event listener for keypress event
    document.addEventListener('keydown', function(e) {
        // Check if Ctrl+B is pressed
        if (e.ctrlKey && e.key === 'b') {
            convertEmbedUrlToWatchUrl();
        }
    });
})();