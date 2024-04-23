// ==UserScript==
// @name         WhatsApp Number Extractor
// @icon         https://raw.githubusercontent.com/Lyushen/TMEnchancments/Resources/whatsapp.ico
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.3005
// @description  Extract phone number from a specific div under 'main' in WhatsApp Web and copy to clipboard on Ctrl+B
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
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        .message-box {
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 16px;
            display: none;
            animation: fadeOut 1s ease-in-out 2s forwards;
        }
    `;
    document.head.appendChild(style);

    // Function to display the message box
    function displayMessageBox(message) {
        var messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        messageBox.textContent = message;
        document.body.appendChild(messageBox);
        messageBox.style.display = 'block'; // Make the box visible
        setTimeout(function() {
            document.body.removeChild(messageBox); // Remove the box after animation
        }, 3000); // Wait for animation to complete
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
