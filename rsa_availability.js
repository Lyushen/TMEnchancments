// ==UserScript==
// @name         RSA Availability Checker
// @namespace    http://tampermonkey.net/
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://rsa.ie
// @version      1.333
// @description  Automatically navigates through rsa.ie and myroadsafety.rsa.ie to check availability slots.
// @author       Lyushen
// @license      GNU
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/rsa_availability.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/rsa_availability.js
// @match        https://myroadsafety.rsa.ie/*
// @match        https://rsaie.queue-it.net/*
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      webhook.office.com
// @connect      *.rsa.ie
// ==/UserScript==

(function () {
    'use strict';

    console.log(`[${new Date().toLocaleString('ga-IE')}] Script started...`);

    // Configuration parameter for instant pressing
    const instantPressing = true; // Set to true for instant pressing, false for delays between presses

    // Helper function to get the Teams webhook URL from Tampermonkey storage
    function getTeamsWebhookUrl() {
        let url = GM_getValue('teamsWebhookUrl', '');
        if (url) {
            console.log(`[${new Date().toLocaleString('ga-IE')}] Teams Webhook URL Received.`);
            return url;
        } else {
            // Set a default empty value if the URL is not found
            const defaultUrl = '';
            GM_setValue('teamsWebhookUrl', defaultUrl);
            return defaultUrl;
        }
    }

function sendTeamsMessage(message) {
    try {
        // Retrieve the webhook URL
        const webhookUrl = getTeamsWebhookUrl();

        // Check if webhook URL is set
        if (!webhookUrl) {
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Teams webhook URL is not set. Please set it in the Tampermonkey script settings.`);
            return;
        }

        // Send the message using GM_xmlhttpRequest
        GM_xmlhttpRequest({
            method: 'POST',
            url: webhookUrl,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ text: message }),
            onload: (response) => {
                if (response.status === 200) {
                    updateStatus(`[${new Date().toLocaleString('ga-IE')}] Message sent to Teams successfully.`);
                } else {
                    updateStatus(`[${new Date().toLocaleString('ga-IE')}] Error sending message to Teams: ${response.status} - ${response.statusText}`);
                }
            },
            onerror: (error) => {
                const errorMessage = error && error.message ? error.message : JSON.stringify(error);
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] Error sending message to Teams: ${errorMessage}`);
                console.error('Detailed error:', error); // Log the entire error for debugging
            }
        });
    } catch (error) {
        // Catch unexpected errors
        updateStatus(`[${new Date().toLocaleString('ga-IE')}] Unexpected error sending message to Teams: ${error.message}`);
    }
}

    // Helper function to wait for an element by XPath
    async function waitForElementByXPath(xpath, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const interval = 500;
            const endTime = Date.now() + timeout;

            const checkForElement = () => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    resolve(element);
                } else if (Date.now() > endTime) {
                    reject(new Error(`[${new Date().toLocaleString('ga-IE')}] Element with XPath "${xpath}" not found within ${timeout}ms.`));
                } else {
                    setTimeout(checkForElement, interval);
                }
            };

            checkForElement();
        });
    }

    // Helper function to click an element by XPath
    async function clickByXPath(xpath, instant = false) {
        try {
            const element = await waitForElementByXPath(xpath);
            if (!instant) {
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 1000)); // Random wait between 1-2 seconds
            }
            element.click();
            console.log(`[${new Date().toLocaleString('ga-IE')}] Clicked element with XPath: ${xpath}`);
        } catch (error) {
            console.error(`[${new Date().toLocaleString('ga-IE')}] Error:`, error);
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Error: ${error.message}`);
        }
    }

    const statusOverlay = document.createElement('div');
    statusOverlay.style.position = 'fixed';
    statusOverlay.style.bottom = '0'; // Change bottom to top statusOverlay.style.top = '0'; 
    statusOverlay.style.left = '0';
    statusOverlay.style.width = '100%';
    statusOverlay.style.maxHeight = '200px';
    statusOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    statusOverlay.style.color = 'white';
    statusOverlay.style.padding = '10px';
    statusOverlay.style.fontSize = '14px';
    statusOverlay.style.zIndex = '9999';
    statusOverlay.style.overflowY = 'auto';
    document.body.appendChild(statusOverlay);

    const logEntries = [];

    // Function to update the status overlay
    function updateStatus(message) {
        // Add the message to the log entries
        logEntries.push(message);
        // Keep only the last 10 entries
        if (logEntries.length > 10) {
            logEntries.shift();
        }
        // Update the status overlay content
        statusOverlay.innerHTML = logEntries.join('<br>');
        // Scroll to the bottom of the overlay
        statusOverlay.scrollTop = statusOverlay.scrollHeight;
        // Log the message to the console
        console.log(message);
    }

    // Main loop
    async function mainLoop() {
        let availabilityFound = false;

        do {
            if (stopMainLoop) {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] Stopping main loop as login page was detected.`);
                return; // Exit the main loop
            }
            await detectAndHandleStatus();
            availabilityFound = await checkAvailabilityAndPlaySound();
            if (!availabilityFound) {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] No availability found. Refreshing in 10 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        } while (!availabilityFound);
    }

    let isWaitingForLogin = false; // Prevent re-execution of the login logic
    let stopMainLoop = false; // Flag to stop the main loop if login is detected


    async function detectAndHandleStatus() {
        try {
            if (window.location.hostname === "rsaie.queue-it.net") {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] Detected queue-it.net redirection page. Waiting for confirm button...`);
                await waitForElementByXPath('//*[@id="buttonConfirmRedirect"]/span', 30000)
                    .then((button) => {
                    updateStatus(`[${new Date().toLocaleString('ga-IE')}] Confirm button found, clicking it.`);
                    button.click();
                })
                    .catch(() => {
                    updateStatus(`[${new Date().toLocaleString('ga-IE')}] Confirm button not found, waiting for automatic redirection.`);
                });
            } else if (window.location.hostname === "myroadsafety.rsa.ie" && !window.location.href.includes("/portal/my-goals")) {
                if (window.location.href.includes("/home/login")) {
                    // Handle the login redirection case
                    if (!isWaitingForLogin) {
                        isWaitingForLogin = true; // Set flag to avoid re-execution
                        stopMainLoop = true; // Stop the main loop
                        updateStatus(`[${new Date().toLocaleString('ga-IE')}] Redirected to login page. Sending message to Teams.`);
                        await sendTeamsMessage(`[${new Date().toLocaleString('ga-IE')}] Please login.`);
                        return; // Stop further execution
                    }
                } else {
                    updateStatus(`[${new Date().toLocaleString('ga-IE')}] Navigating to my-goals page.`);
                    window.location.href = "https://myroadsafety.rsa.ie/portal/my-goals";
                }
            } else if (window.location.href.includes("https://myroadsafety.rsa.ie/portal/my-goals")) {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] Detected my-goals page, starting sequence of button clicks.`);
                await handleMyGoalsPage();
            }
        } catch (error) {
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Error: ${error.message}`);
            console.error(error);
        }
    }

    async function handleMyGoalsPage() {
        try {
            await clickByXPath('//mat-card-content/div/div/button/span', !instantPressing);
            await clickByXPath('//div/div/div/div/button/span/span', !instantPressing);
            await clickByXPath('//*[@id="button3"]/span/div/div[2]', !instantPressing);
            await clickByXPath('//button[5]/strong', !instantPressing);

            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Clicking button 12 times`);
            // Wait for and find the button based on attributes
            const button = await waitForElement(() => document.querySelector('button[aria-label="Zoom out"][title="Zoom out"]'), 5000);
            if (!button) {
                updateStatus(`${new Date().toLocaleString('ga-IE')}] Zoom out button not found within the timeout period.`);
            }
            for (let i = 0; i < 10; i++) {
                button.click();
            }
            await button.click();
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Finished navigation to the map.`);
            await checkAvailabilityAndPlaySound();
        } catch (error) {
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Error during button click sequence: ${error.message}`);
            console.error(error);
        }
    }
  
    // Helper function to wait for an element by selector
    async function waitForElement(selector, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const interval = 500;
            const endTime = Date.now() + timeout;

            const checkForElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() > endTime) {
                    reject(new Error(`[${new Date().toLocaleString('ga-IE')}] Element with selector "${selector}" not found within ${timeout}ms.`));
                } else {
                    setTimeout(checkForElement, interval);
                }
            };

            checkForElement();
        });
    }

    async function checkAvailabilityAndPlaySound() {
    updateStatus(`[${new Date().toLocaleString('ga-IE')}] Starting availability check...`);
    try {
        updateStatus(`[${new Date().toLocaleString('ga-IE')}] Waiting for app-slot-list-viewContainer...`);
        const container = await waitForElement("div.app-slot-list-viewContainer", 30000);
        updateStatus(`[${new Date().toLocaleString('ga-IE')}] app-slot-list-viewContainer found`);

        updateStatus(`[${new Date().toLocaleString('ga-IE')}] Waiting for swiper-wrapper...`);
        const swiperWrapper = await waitForElement(".swiper-wrapper", 30000);
        updateStatus(`[${new Date().toLocaleString('ga-IE')}] swiper-wrapper found`);

        let availabilityFound = false;
        let availabilityTexts = [];
        let noAvailabilityCount = 0;

        // Wait until slides are fully loaded
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Checking slides (Attempt ${attempt + 1}/${maxAttempts})...`);

            const slides = swiperWrapper.querySelectorAll("div[data-swiper-slide-index]");
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Found ${slides.length} slides.`);

            noAvailabilityCount = 0;
            availabilityFound = false;
            availabilityTexts = [];

            slides.forEach((slide, index) => {
                const availabilityText = slide.textContent.trim();
                console.log(`[${new Date().toLocaleString('ga-IE')}] Slide ${index + 1}: Availability Text: "${availabilityText}"`);

                if (availabilityText.includes("No availability at present")) {
                    noAvailabilityCount++;
                } else if (availabilityText && !availabilityText.includes("No availability at present")) {
                    availabilityFound = true;
                    availabilityTexts.push(availabilityText); // Collect availability text
                }
            });

            if (noAvailabilityCount >= 50) {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] Slides fully loaded.`);
                break;
            } else if (noAvailabilityCount === 0) {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] No "No availability at present" messages found. Slides may not be fully loaded. Waiting 5 seconds...`);
                await clickByXPath('//div[12]/div/div/div/button[2]', !instantPressing);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                updateStatus(`[${new Date().toLocaleString('ga-IE')}] Slides partially loaded (${noAvailabilityCount} 'No availability' messages). Waiting 5 seconds...`);
                await clickByXPath('//div[12]/div/div/div/button[2]', !instantPressing);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (availabilityFound) {
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] Availability detected! Playing beep...`);
            playFallbackBeep();
            // Send message to Teams with availability text
            sendTeamsMessage(`Availability found! Details:<br>${availabilityTexts.join('<br>')}`);
            return true;
        } else {
            updateStatus(`[${new Date().toLocaleString('ga-IE')}] No availability found.`);
            return false;
        }
    } catch (error) {
        updateStatus(`[${new Date().toLocaleString('ga-IE')}] Error: ${error.message}`);
        return false;
    }
}

    // Beep function
    function playFallbackBeep() {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(500, context.currentTime);
        gainNode.gain.setValueAtTime(0.5, context.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        setTimeout(() => oscillator.stop(), 500);
    }

    mainLoop();
})();
