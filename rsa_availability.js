// ==UserScript==
// @name         RSA Availability Checker
// @namespace    http://tampermonkey.net/
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://rsa.ie
// @version      1.350
// @description  Automatically navigates through rsa.ie and myroadsafety.rsa.ie to check availability slots.
// @author       Lyushen
// @license      GNU
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/rsa_availability.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/rsa_availability.js
// @match        https://myroadsafety.rsa.ie/*
// @match        https://rsaie.queue-it.net/*
// @match        https://account.mygovid.ie/*
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      webhook.office.com
// @connect      discord.com
// @connect      *.rsa.ie
// ==/UserScript==

(function () {
    'use strict';
    console.log(`[${new Date().toISOString()}] Script started...`);
    
    function getPreferredWebhookUrl() {
        let preferredNotificator = GM_getValue('preferredNotificator', '');
        let url;
    
        if (preferredNotificator === 'teams') {
            url = GM_getValue('teamsWebhookUrl', '');
        } else if (preferredNotificator === 'discord') {
            url = GM_getValue('discordWebhookUrl', '');
        }
    
        if (url) {
            console.log(`[${new Date().toISOString()}] ${preferredNotificator} Webhook URL Received.`);
            return { url, platform: preferredNotificator };
        } else {
            // Ask user to input a URL and determine the platform
            const inputUrl = prompt("Please provide the webhook URL:");
            if (inputUrl) {
                if (inputUrl.includes('webhook.office.com')) {
                    GM_setValue('teamsWebhookUrl', inputUrl);
                    GM_setValue('preferredNotificator', 'teams');
                    return { url: inputUrl, platform: 'teams' };
                } else if (inputUrl.includes('discord.com')) {
                    GM_setValue('discordWebhookUrl', inputUrl);
                    GM_setValue('preferredNotificator', 'discord');
                    return { url: inputUrl, platform: 'discord' };
                } else {
                    alert("Invalid webhook URL. Please provide a valid Teams or Discord webhook URL.");
                    return { url: '', platform: '' };
                }
            } else {
                alert("Webhook URL is required.");
                return { url: '', platform: '' };
            }
        }
    }
    
    function sendNotification(message) {
        try {
            // Retrieve the webhook URL and platform
            const { url, platform } = getPreferredWebhookUrl();
    
            // Check if webhook URL is set
            if (!url) {
                updateStatus(`[${new Date().toISOString()}] Webhook URL is not set. Please set it in the Tampermonkey script settings.`);
                return;
            }
    
            // Determine payload structure based on platform
            const payload = platform === 'discord'
                ? { content: message } // Discord expects 'content' instead of 'text'
                : { text: message }; // Teams expects 'text'
    
            // Send the message using GM_xmlhttpRequest
            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(payload),
                onload: (response) => {
                    if (response.status === 200) {
                        updateStatus(`[${new Date().toISOString()}] Message sent to ${platform} successfully.`);
                    } else {
                        updateStatus(`[${new Date().toISOString()}] Error sending message to ${platform}: ${response.status} - ${response.statusText}`);
                    }
                },
                onerror: (error) => {
                    const errorMessage = error && error.message ? error.message : JSON.stringify(error);
                    updateStatus(`[${new Date().toISOString()}] Error sending message to ${platform}: ${errorMessage}`);
                    console.error('Detailed error:', error); // Log the entire error for debugging
                }
            });
        } catch (error) {
            // Catch unexpected errors
            updateStatus(`[${new Date().toISOString()}] Unexpected error sending message: ${error.message}`);
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

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.innerText = 'Hide Log';
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '0';
    toggleButton.style.right = '0';
    toggleButton.style.zIndex = '10000';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.backgroundColor = '#444';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.fontSize = '12px';
    toggleButton.style.borderRadius = '4px';

    // Add toggle functionality
    let isOverlayVisible = true;
    toggleButton.addEventListener('click', () => {
        isOverlayVisible = !isOverlayVisible;
        if (isOverlayVisible) {
            statusOverlay.style.display = 'block';
            toggleButton.innerText = 'Hide Log';
        } else {
            statusOverlay.style.display = 'none';
            toggleButton.innerText = 'Show Log';
        }
    });

    document.body.appendChild(toggleButton);

    async function mainLoop() {
        let availabilityFound = false;
        do {
            if (stopMainLoop) {
                updateStatus(`[${new Date().toISOString()}] Stopping main loop as login page was detected.`);
                return; // Exit the main loop
            }
            await detectAndHandleStatus();
            availabilityFound = await checkAvailability();
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
                updateStatus(`[${new Date().toISOString()}] Detected queue-it.net redirection page. Waiting for confirm button or URL change...`);
    
                let buttonVisible = false;
    
                // Monitor for the button or automatic redirection
                const waitForButtonOrRedirect = async () => {
                    const button = document.querySelector("#buttonConfirmRedirect");
                    const startTimeElement = document.querySelector("#pConfirmRedirectTime");
    
                    // Check if button exists and is visible
                    if (button && startTimeElement) {
                        buttonVisible = getComputedStyle(startTimeElement).display !== "none";
                        if (buttonVisible) {
                            updateStatus(`[${new Date().toISOString()}] Confirm button is now visible, clicking it.`);
                            button.click();
                            return true; // Stop waiting
                        }
                    }
    
                    // Check for automatic URL redirection
                    if (window.location.hostname !== "rsaie.queue-it.net") {
                        updateStatus(`[${new Date().toISOString()}] Redirected automatically. Proceeding with next steps.`);
                        return true; // Stop waiting
                    }
    
                    return false; // Keep waiting
                };
    
                // Wait for either the button visibility or URL change
                const timeout = Date.now() + 30000; // Timeout after 30 seconds
                while (Date.now() < timeout) {
                    if (await waitForButtonOrRedirect()) break;
                    await delay(500); // Poll every 500ms
                }
    
                if (!buttonVisible && window.location.hostname === "rsaie.queue-it.net") {
                    updateStatus(`[${new Date().toISOString()}] Confirm button not found or automatic redirection did not occur.`);
                }
    
            } else if (window.location.hostname === "myroadsafety.rsa.ie" && !window.location.href.includes("/portal/my-goals")) {
                if (window.location.href.includes("/home/login")) {
                    if (!isWaitingForLogin) {
                        isWaitingForLogin = true;
                        stopMainLoop = true; // Stop the main loop
                        updateStatus(`[${new Date().toISOString()}] Redirected to login page. Handling login modal.`);
                        await handleLoginModal();
                        return; // Stop further execution
                    }
                } else {
                    updateStatus(`[${new Date().toISOString()}] Navigating to my-goals page after 2 sec delay.`);
                    await delay(2000);
                    window.location.href = "https://myroadsafety.rsa.ie/portal/my-goals";
                }
            } else if (window.location.href.includes("https://myroadsafety.rsa.ie/portal/my-goals")) {
                updateStatus(`[${new Date().toISOString()}] Detected my-goals page, checking for "View my steps" button.`);
                
                let attempts = 0;
                const maxAttempts = 10;
                let buttonFound = false;
            
                while (attempts < maxAttempts) {
                    buttonFound = await waitForElementByName('View my steps', 5000);
                    if (buttonFound) {
                        updateStatus(`[${new Date().toISOString()}] "View my steps" button found. Proceeding with handleMyGoalsPage.`);
                        await handleMyGoalsPage();
                        return; // Exit after successful handling
                    }
            
                    attempts++;
                    updateStatus(`[${new Date().toISOString()}] Attempt ${attempts}/${maxAttempts}: "View my steps" button not found. Retrying after refresh.`);
                    window.location.reload(); // Refresh the page
                    await delay(3000); // Wait for the page to reload
                }
            
                if (!buttonFound) {
                    updateStatus(`[${new Date().toISOString()}] Exceeded maximum attempts (${maxAttempts}). Unable to find "View my steps" button.`);
                }
            }
            
        } catch (error) {
            updateStatus(`[${new Date().toISOString()}] Error: ${error.message}`);
            console.error(error);
        }
    }

    async function handleLoginModal() {
        try {
            updateStatus(`[${new Date().toISOString()}] Waiting for the modal close button...`);
            const closeModalButton = await waitForElement('button[mat-dialog-close][mat-icon-button][aria-label="close modal"]', 20000);
            if (closeModalButton) {
                updateStatus(`[${new Date().toISOString()}] Modal close button found. Clicking it.`);
                closeModalButton.click();
            } else {
                updateStatus(`[${new Date().toISOString()}] Modal close button not found.`);
                return;
            }
    
            updateStatus(`[${new Date().toISOString()}] Waiting for "myGov" button...`);
            const myGovButton = await waitForElement('button#myGov.mygov-button', 20000);
            if (myGovButton) {
                updateStatus(`[${new Date().toISOString()}] "myGov" button found. Clicking it.`);
                myGovButton.click();
            } else {
                updateStatus(`[${new Date().toISOString()}] "myGov" button not found.`);
                return;
            }
    
            updateStatus(`[${new Date().toISOString()}] Waiting for "Continue" button on the second modal...`);
            const continueButton = [...document.querySelectorAll('button')].find(
                btn => btn.textContent.trim() === 'Continue'
            );
            
            if (continueButton) {
                updateStatus(`[${new Date().toISOString()}] "Continue" button found. Clicking it.`);
                continueButton.click();
            } else {
                updateStatus(`[${new Date().toISOString()}] "Continue" button not found.`);
            }            
    
            updateStatus(`[${new Date().toISOString()}] Login process handled. Sending notification.`);
            await sendNotification(`[${new Date().toISOString()}] Please login.`);
        } catch (error) {
            updateStatus(`[${new Date().toISOString()}] Error during login modal handling: ${error.message}`);
            console.error(error);
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

            // Wait for and find the button based on attributes
            const zoomout_button = await waitForElement('button[aria-label="Zoom out"]', 10000);
            if (!zoomout_button) {
                updateStatus(`${new Date().toISOString()}] Zoom out button not found within the timeout period.`);
                return; // Stop further execution
            }
            else
                updateStatus(`[${new Date().toISOString()}] Zoom out button found. Pressing 8 times`);
            await delay(50);
            for (let i = 0; i < 8; i++) {
                zoomout_button.click();
                await delay(0);
            }
            updateStatus(`[${new Date().toISOString()}] Finished navigation.`);
            await checkAvailability();
        } catch (error) {
            updateStatus(`[${new Date().toISOString()}] Error during button click sequence: ${error.message}`);
            console.error(error);
        }
    }
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
    async function waitForElementByName(name, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const interval = 500; // Check every 500ms
            const endTime = Date.now() + timeout;
    
            const checkForElement = () => {
                const element = [...document.querySelectorAll('button')].find(btn => btn.textContent.trim().includes(name));
                if (element) {
                    resolve(element);
                } else if (Date.now() > endTime) {
                    reject(new Error(`[${new Date().toISOString()}] Button with name "${name}" not found within ${timeout}ms.`));
                } else {
                    setTimeout(checkForElement, interval);
                }
            };
            checkForElement();
        });
    }

    async function checkAvailability() {
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
            let targetSlideIndex = null;
    
            const maxAttempts = 10;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                updateStatus(`[${new Date().toISOString()}] Checking slides (Attempt ${attempt + 1}/${maxAttempts})...`);
                const slides = swiperWrapper.querySelectorAll("div[data-swiper-slide-index]");
                updateStatus(`[${new Date().toISOString()}] Found ${slides.length} slides.`);
                noAvailabilityCount = 0;
                availabilityFound = false;
                availabilityTexts = [];
                targetSlideIndex = null;
    
                slides.forEach((slide, index) => {
                    const availabilityText = slide.textContent.trim();
                    if (availabilityText.includes("No availability at present")) {
                        noAvailabilityCount++;
                    } else if (availabilityText && !availabilityText.includes("No availability at present")) {
                        availabilityFound = true;
                        availabilityTexts.push(availabilityText); // Collect availability text
                        if (!targetSlideIndex) {
                            targetSlideIndex = slide.getAttribute("data-swiper-slide-index");
                        }
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
    
            if (availabilityFound && targetSlideIndex !== null) {
                updateStatus(`[${new Date().toISOString()}] Availability detected in slide ${targetSlideIndex}!`);
                document.querySelector(`div[data-swiper-slide-index="${targetSlideIndex}"] button`).click();
                updateStatus(`[${new Date().toISOString()}] Clicked on slide ${targetSlideIndex}`);
    
                const selectCentreButton = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Select Centre'));
                if (selectCentreButton) {
                    selectCentreButton.click();
                    updateStatus(`[${new Date().toISOString()}] "Select Centre" button clicked.`);
                } else {
                    updateStatus(`[${new Date().toISOString()}] "Select Centre" button not found.`);
                }
    
                const confirmButton = await waitForElement('button[uid="no-parent-confirm-button"]', 10000);
                if (confirmButton) {
                    if (confirmButton.disabled) {
                        confirmButton.removeAttribute('disabled');
                        updateStatus(`[${new Date().toISOString()}] "Confirm" button was disabled. Enabled it.`);
                    }
                    confirmButton.click();
                    updateStatus(`[${new Date().toISOString()}] "Confirm" button clicked.`);
                } else {
                    updateStatus(`[${new Date().toISOString()}] "Confirm" button not found.`);
                }
    
                sendNotification(`Availability found and attempted selection! Details:<br>${availabilityTexts.join('<br>')}<br>Please proceed.`);
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
    
    mainLoop();
})();
