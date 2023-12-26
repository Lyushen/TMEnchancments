// ==UserScript==
// @name         WhatsApp Number Extractor ctrl+e
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.3
// @description  Extract phone number from a specific div under 'main' in WhatsApp Web and copy to clipboard on Ctrl+E
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/WebWhatsApp_Ench.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/WebWhatsApp_Ench.js
// @grant        GM_setClipboard
// @match        https://web.whatsapp.com/*
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('keydown', function(e) {
        // Trigger on Ctrl+E
        if (e.ctrlKey && e.key === 'e') {
            // Find the div under 'main' with the specific data-id pattern
            var elements = document.querySelectorAll('div#main div[data-id]');
            for (var i = 0; i < elements.length; i++) {
                var elem = elements[i];
                // Check if data-id starts with 'true_' or 'false_'
                if (/^(true_|false_)\d+@/.test(elem.dataset.id)) {
                    // Extract phone number
                    var phoneNumberMatch = elem.dataset.id.match(/(true_|false_)(\d+)@/);
                    if (phoneNumberMatch && phoneNumberMatch[2]) {
                        // Copy the extracted number to clipboard
                        GM_setClipboard(phoneNumberMatch[2]);
                        break;
                    }
                }
            }
        }
    });
})();
