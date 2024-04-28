// ==UserScript==
// @name         WhatsApp Number Extractor
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://whatsapp.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.3009
// @description  Extract phone number from a specific div under 'main' in WhatsApp Web and copy to clipboard on Ctrl+Y
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/WebWhatsApp_Ench.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/WebWhatsApp_Ench.js
// @grant        GM_setClipboard
// @match        https://web.whatsapp.com/*
// ==/UserScript==

(function() {
    'use strict';

// Create a style element for animations and append it to head
var style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeInOut {
        0% { opacity: 0; }
        10%, 90% { opacity: 1; }
        100% { opacity: 0; }
    }

    .message-box {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 16px;
        display: none;
        animation: fadeInOut 1s ease-in-out;
    }
`;
document.head.appendChild(style);

// Function to display the message box
function displayMessageBox(message, duration = 3000) {
    var messageBox = document.createElement('div');
    messageBox.className = 'message-box';
    messageBox.textContent = message;
    document.body.appendChild(messageBox);
    messageBox.style.display = 'block'; // Make the box visible

    // Adjust animation duration to accommodate fade in, visible duration, and fade out
    messageBox.style.animationDuration = `${(duration / 1000) + 1}s`;

    // Remove the box after animation
    messageBox.addEventListener('animationend', () => {
        document.body.removeChild(messageBox);
    });
}

    document.addEventListener('keydown', function(e) {
        // Trigger on Ctrl+Y
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.key === 'н')) {
            var elements = document.querySelectorAll('div#main div[data-id]');
            for (var i = 0; i < elements.length; i++) {
                var elem = elements[i];
                if (/^(true_|false_)\d+@/.test(elem.dataset.id)) {
                    var phoneNumberMatch = elem.dataset.id.match(/(true_|false_)(\d+)@/);
                    if (phoneNumberMatch && phoneNumberMatch[2]) {
                        GM_setClipboard(phoneNumberMatch[2]); // Copy number to clipboard
                        displayMessageBox('Extracted: ' + phoneNumberMatch[2]); // Display the message box
                        break;
                    }
                }
            }
        }
    });
})();
