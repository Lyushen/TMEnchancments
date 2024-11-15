// ==UserScript==
// @name         RSA Availability Checker
// @namespace    http://tampermonkey.net/
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://rsa.ie
// @version      1.339
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
    console.log(`[${new Date().toISOString()}] Script started...`);
    
    function getTeamsWebhookUrl() {
        let url = GM_getValue('teamsWebhookUrl', '');
        if (url) {
            console.log(`[${new Date().toISOString()}] Teams Webhook URL Received.`);
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
                updateStatus(`[${new Date().toISOString()}] Teams webhook URL is not set. Please set it in the Tampermonkey script settings.`);
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
                        updateStatus(`[${new Date().toISOString()}] Message sent to Teams successfully.`);
                    } else {
                        updateStatus(`[${new Date().toISOString()}] Error sending message to Teams: ${response.status} - ${response.statusText}`);
                    }
                },
                onerror: (error) => {
                    const errorMessage = error && error.message ? error.message : JSON.stringify(error);
                    updateStatus(`[${new Date().toISOString()}] Error sending message to Teams: ${errorMessage}`);
                    console.error('Detailed error:', error); // Log the entire error for debugging
                }
            });
        } catch (error) {
            // Catch unexpected errors
            updateStatus(`[${new Date().toISOString()}] Unexpected error sending message to Teams: ${error.message}`);
        }
    }
    async function waitForElementByXPath(xpath, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const interval = 500;
            const endTime = Date.now() + timeout;

            const checkForElement = () => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    resolve(element);
                } else if (Date.now() > endTime) {
                    reject(new Error(`[${new Date().toISOString()}] Element with XPath "${xpath}" not found within ${timeout}ms.`));
                } else {
                    setTimeout(checkForElement, interval);
                }
            };

            checkForElement();
        });
    }
    async function clickByXPath(xpath, instant = false) {
        try {
            const element = await waitForElementByXPath(xpath);
            if (!instant) {
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 1000)); // Random wait between 1-2 seconds
            }
            element.click();
            console.log(`[${new Date().toISOString()}] Clicked element with XPath: ${xpath}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error:`, error);
            updateStatus(`[${new Date().toISOString()}] Error: ${error.message}`);
        }
    }

    // Wake lock functions
    let wakeLock = null;

    async function requestWakeLock() {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            updateStatus(`[${new Date().toISOString()}] Screen wake lock acquired.`);
            wakeLock.addEventListener('release', () => {
                updateStatus(`[${new Date().toISOString()}] Screen wake lock released.`);
            });
        } catch (err) {
            updateStatus(`[${new Date().toISOString()}] Failed to acquire screen wake lock: ${err.message}`);
        }
    }

    async function releaseWakeLock() {
        if (wakeLock) {
            try {
                await wakeLock.release();
                wakeLock = null;
                updateStatus(`[${new Date().toISOString()}] Screen wake lock manually released.`);
            } catch (err) {
                updateStatus(`[${new Date().toISOString()}] Failed to release screen wake lock: ${err.message}`);
            }
        }
    }

    // Automatically request the wake lock at the start of the script
    requestWakeLock();

    // Clean up wake lock when the page unloads
    window.addEventListener('beforeunload', releaseWakeLock);

    const instantPressing = true;
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
    function updateStatus(message) {
        logEntries.push(message);
        statusOverlay.innerHTML = logEntries.join('<br>');
        statusOverlay.scrollTop = statusOverlay.scrollHeight;
        console.log(message);
    }
    async function mainLoop() {
        let availabilityFound = false;
        do {
            if (stopMainLoop) {
                updateStatus(`[${new Date().toISOString()}] Stopping main loop as login page was detected.`);
                return; // Exit the main loop
            }
            await detectAndHandleStatus();
            availabilityFound = await checkAvailabilityAndPlaySound();
            if (!availabilityFound) {
                updateStatus(`[${new Date().toISOString()}] No availability found. Refreshing in 10 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        } while (!availabilityFound);
    }

    let isWaitingForLogin = false; // Prevent re-execution of the login logic
    let stopMainLoop = false; // Flag to stop the main loop if login is detected

    async function detectAndHandleStatus() {
        try {
            if (window.location.hostname === "rsaie.queue-it.net") {
                updateStatus(`[${new Date().toISOString()}] Detected queue-it.net redirection page. Waiting for confirm button...`);
                await waitForElementByXPath('//*[@id="buttonConfirmRedirect"]/span', 30000)
                    .then((button) => {
                    updateStatus(`[${new Date().toISOString()}] Confirm button found, clicking it.`);
                    button.click();
                })
                    .catch(() => {
                    updateStatus(`[${new Date().toISOString()}] Confirm button not found, waiting for automatic redirection.`);
                });
            } else if (window.location.hostname === "myroadsafety.rsa.ie" && !window.location.href.includes("/portal/my-goals")) {
                if (window.location.href.includes("/home/login")) {
                    // Handle the login redirection case
                    if (!isWaitingForLogin) {
                        isWaitingForLogin = true; // Set flag to avoid re-execution
                        stopMainLoop = true; // Stop the main loop
                        updateStatus(`[${new Date().toISOString()}] Redirected to login page. Sending message to Teams.`);
                        await sendTeamsMessage(`[${new Date().toISOString()}] Please login.`);
                        return; // Stop further execution
                    }
                } else {
                    updateStatus(`[${new Date().toISOString()}] Navigating to my-goals page.`);
                    window.location.href = "https://myroadsafety.rsa.ie/portal/my-goals";
                }
            } else if (window.location.href.includes("https://myroadsafety.rsa.ie/portal/my-goals")) {
                updateStatus(`[${new Date().toISOString()}] Detected my-goals page, starting sequence of button clicks.`);
                await handleMyGoalsPage();
            }
        } catch (error) {
            updateStatus(`[${new Date().toISOString()}] Error: ${error.message}`);
            console.error(error);
        }
    }

    async function handleMyGoalsPage() {
        try {
            await clickByXPath('//mat-card-content/div/div/button/span', !instantPressing);
            await clickByXPath('//div/div/div/div/button/span/span', !instantPressing);
            await clickByXPath('//*[@id="button3"]/span/div/div[2]', !instantPressing);
            //await clickByXPath('//button[5]/strong', !instantPressing);
            updateStatus(`[${new Date().toISOString()}] Waiting for "More locations" button...`);
        
            // Wait for the "More locations" button and click it
            const moreLocationsButton = await waitForElement('button[mat-menu-item].text-primary', 10000);
            if (!moreLocationsButton) {
                updateStatus(`${new Date().toISOString()}] "More locations" button not found within the timeout period.`);
                return; // Stop further execution
            }
            moreLocationsButton.click();

            updateStatus(`[${new Date().toISOString()}] Clicking button 10 times`);
            // Wait for and find the button based on attributes
            const zoomout_button = await waitForElement('button[aria-label="Zoom out"][title="Zoom out"]', 10000);
            if (!zoomout_button) {
                updateStatus(`${new Date().toISOString()}] Zoom out button not found within the timeout period.`);
                return; // Stop further execution
            }
            await delay(500);
            for (let i = 0; i < 10; i++) {
                zoomout_button.click();
                await delay(5);
            }
            updateStatus(`[${new Date().toISOString()}] Finished navigation to the map.`);
            await checkAvailabilityAndPlaySound();
        } catch (error) {
            updateStatus(`[${new Date().toISOString()}] Error during button click sequence: ${error.message}`);
            console.error(error);
        }
    }
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function waitForElement(selector, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const interval = 500;
            const endTime = Date.now() + timeout;
            const checkForElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() > endTime) {
                    reject(new Error(`[${new Date().toISOString()}] Element with selector "${selector}" not found within ${timeout}ms.`));
                } else {
                    setTimeout(checkForElement, interval);
                }
            };
            checkForElement();
        });
    }
    async function checkAvailabilityAndPlaySound() {
    updateStatus(`[${new Date().toISOString()}] Starting availability check...`);
    try {
        updateStatus(`[${new Date().toISOString()}] Waiting for app-slot-list-viewContainer...`);
        const container = await waitForElement("div.app-slot-list-viewContainer", 30000);
        updateStatus(`[${new Date().toISOString()}] app-slot-list-viewContainer found`);

        updateStatus(`[${new Date().toISOString()}] Waiting for swiper-wrapper...`);
        const swiperWrapper = await waitForElement(".swiper-wrapper", 30000);
        updateStatus(`[${new Date().toISOString()}] swiper-wrapper found`);

        let availabilityFound = false;
        let availabilityTexts = [];
        let noAvailabilityCount = 0;

        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            updateStatus(`[${new Date().toISOString()}] Checking slides (Attempt ${attempt + 1}/${maxAttempts})...`);
            const slides = swiperWrapper.querySelectorAll("div[data-swiper-slide-index]");
            updateStatus(`[${new Date().toISOString()}] Found ${slides.length} slides.`);
            noAvailabilityCount = 0;
            availabilityFound = false;
            availabilityTexts = [];
            slides.forEach((slide, index) => {
                const availabilityText = slide.textContent.trim();
                /* console.log(`[${new Date().toISOString()}] Slide ${index + 1}: Availability Text: "${availabilityText}"`); */

                if (availabilityText.includes("No availability at present")) {
                    noAvailabilityCount++;
                } else if (availabilityText && !availabilityText.includes("No availability at present")) {
                    availabilityFound = true;
                    availabilityTexts.push(availabilityText); // Collect availability text
                }
            });
            if (noAvailabilityCount >= 50) {
                updateStatus(`[${new Date().toISOString()}] Slides fully loaded.`);
                break;
            } else if (noAvailabilityCount === 0) {
                updateStatus(`[${new Date().toISOString()}] No "No availability at present" messages found. Slides may not be fully loaded. Waiting 5 seconds...`);
                const button = document.querySelector('button[aria-label="Zoom out"][title="Zoom out"]');
                for (let i = 0; i < 3; i++) {
                    button.click();
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                updateStatus(`[${new Date().toISOString()}] Slides partially loaded (${noAvailabilityCount} 'No availability' messages). Waiting 5 seconds...`);
                const button = document.querySelector('button[aria-label="Zoom out"][title="Zoom out"]');
                for (let i = 0; i < 3; i++) {
                    button.click();
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        if (availabilityFound) {
            updateStatus(`[${new Date().toISOString()}] Availability detected! Playing beep...`);
            playFallbackBeep();
            // Send message to Teams with availability text
            sendTeamsMessage(`Availability found! Details:<br>${availabilityTexts.join('<br>')}`);
            return true;
        } else {
            updateStatus(`[${new Date().toISOString()}] No availability found.`);
            return false;
        }
    } catch (error) {
        updateStatus(`[${new Date().toISOString()}] Error: ${error.message}`);
        return false;
    }
}

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
