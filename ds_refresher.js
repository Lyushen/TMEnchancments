// ==UserScript==
// @name         DeepSeek Chat Auto-Retry
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://chat.deepseek.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0001
// @description  Automatically retry when DeepSeek chat server is busy
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/ds_refresher.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/ds_refresher.js
// @grant        none
// @match        https://chat.deepseek.com/*
// ==/UserScript==
(function() {
    'use strict';

    const config = {
        initialDelay: 500,    // Delay before first retry attempt after message appears
        checkInterval: 1000,  // How often to check for busy message
        retryDelay: 500,     // Delay between retry attempts
        waitForResponse: 2000, // Time to wait for response after clicking
        debug: true
    };

    function debugLog(...args) {
        if (config.debug) {
            console.log('[DeepSeek Auto-Retry]', ...args);
        }
    }

    function getLastChatTopic() {
        const chatTopics = document.querySelectorAll('[class*="f9bf7997"][class*="d7dc56a8"]');
        return chatTopics.length > 0 ? chatTopics[chatTopics.length - 1] : null;
    }

    function isButtonVisible(button) {
        if (!button) return false;

        const rect = button.getBoundingClientRect();
        const isVisible = rect.width > 0 &&
                         rect.height > 0 &&
                         button.style.display !== 'none' &&
                         button.style.visibility !== 'hidden';

        debugLog('Button visibility check:', isVisible);
        return isVisible;
    }

    function findBusyMessage() {
        const lastTopic = getLastChatTopic();
        if (!lastTopic) return null;

        const markdownBlocks = lastTopic.querySelectorAll('.ds-markdown.ds-markdown--block');
        const lastBlock = markdownBlocks[markdownBlocks.length - 1];

        if (lastBlock && lastBlock.textContent.includes('The server is busy. Please try again later.')) {
            return lastBlock;
        }
        return null;
    }

    function findRetryButton() {
        const lastTopic = getLastChatTopic();
        if (!lastTopic) return null;

        const buttons = Array.from(lastTopic.querySelectorAll('.ds-icon-button'));
        const retryButtons = buttons.filter(button =>
            button.style.getPropertyValue('--ds-icon-button-size') === '20px'
        );

        return retryButtons.length >= 2 ? retryButtons[1] : null;
    }

    async function waitForNextRetry() {
        return new Promise(resolve => {
            const checkForNewState = () => {
                const lastTopic = getLastChatTopic();
                if (!lastTopic) {
                    setTimeout(checkForNewState, 100);
                    return;
                }

                const hasNewMessage = lastTopic.querySelector('.ds-markdown.ds-markdown--block');
                const retryButton = findRetryButton();

                if (hasNewMessage || (retryButton && isButtonVisible(retryButton))) {
                    debugLog('System ready for next retry');
                    resolve();
                } else {
                    setTimeout(checkForNewState, 100);
                }
            };

            setTimeout(checkForNewState, config.waitForResponse);
        });
    }

    let retryTimeout = null;
    let isRetrying = false;
    let lastMessageTimestamp = 0;

    async function attemptRetry() {
        const retryButton = findRetryButton();

        if (retryButton && isButtonVisible(retryButton)) {
            debugLog('Clicking retry button');
            retryButton.click();

            debugLog('Waiting for system to be ready for next retry');
            await waitForNextRetry();

            debugLog('Completed retry attempt');
        } else {
            debugLog('Retry button not visible or not found, stopping retry cycle');
            clearTimeout(retryTimeout);
            isRetrying = false;
        }
    }

async function watchForBusyServer() {
        if (isRetrying) {
            debugLog('Already processing a retry, skipping check');
            return;
        }

        const busyMessage = findBusyMessage();
        const currentTime = Date.now();

        if (busyMessage) {
            // Check if this is a new message
            if (currentTime - lastMessageTimestamp > config.checkInterval) {
                debugLog('New busy message detected, scheduling retry');
                lastMessageTimestamp = currentTime;
                isRetrying = true;

                // Initial delay before first retry
                retryTimeout = setTimeout(async () => {
                    const retryButton = findRetryButton();
                    if (retryButton && isButtonVisible(retryButton)) {
                        await attemptRetry();
                    }
                    isRetrying = false;
                }, config.initialDelay);
            }
        } else {
            // Clear any pending retry if the message is gone
            if (retryTimeout) {
                debugLog('Busy message no longer present, clearing retry timeout');
                clearTimeout(retryTimeout);
                retryTimeout = null;
            }
            isRetrying = false;
        }
    }

    // Start the watcher
    debugLog('Script initialized');
    setInterval(watchForBusyServer, config.checkInterval);
})();