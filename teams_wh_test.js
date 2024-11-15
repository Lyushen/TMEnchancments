// ==UserScript==
// @name         Send Teams Message via WebHook
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Send a message to Microsoft Teams via WebHook stored in GM_getValue
// @author       Lyushen
// @license      GNU
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/teams_wh_test.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/teams_wh_test.js
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Initialize WebHook URL if not set
    if (!GM_getValue('teamsWebhookUrl', null)) {
        GM_setValue('teamsWebhookUrl', '');
        console.warn('WebHook URL was not set. Initialized to an empty value. Use the Tampermonkey console to set it.');
    }

    // Function to send a message to Teams
    function sendTeamsMessage(message) {
        const webhookUrl = GM_getValue('teamsWebhookUrl');

        if (!webhookUrl) {
            console.error('WebHook URL is empty. Use GM_setValue("teamsWebhookUrl", "your_webhook_url") to set it.');
            return;
        }

        // Payload for the Teams message
        const payload = {
            text: message
        };

        // Sending the message using GM_xmlhttpRequest
        GM_xmlhttpRequest({
            method: 'POST',
            url: webhookUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 200) {
                    console.log('Message sent to Teams successfully.');
                } else {
                    console.error('Failed to send message to Teams. Response:', response);
                }
            },
            onerror: function(error) {
                console.error('Error sending message to Teams:', error);
            }
        });
    }

    // Add a button to the DOM
    function createButton() {
        const button = document.createElement('button');
        button.textContent = 'Send Teams Message';
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '1000';
        button.style.padding = '10px 20px';
        button.style.backgroundColor = '#0078d7';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        button.addEventListener('click', () => {
            sendTeamsMessage('Hello from Tampermonkey!');
        });
        document.body.appendChild(button);
    }

    // Wait for the DOM to fully load before adding the button
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createButton);
    } else {
        createButton();
    }

})();
