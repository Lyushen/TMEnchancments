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
        textWaitDelay: 500,    // Delay before checking text
        retryDelay: 500,       // Delay before clicking retry button
        checkInterval: 1000,    // Main loop interval
        waitForResponse: 2000,  // Time to wait for response after clicking
        debug: true
    };

    function debugLog(...args) {
        if (config.debug) {
            console.log('[DeepSeek Auto-Retry]', ...args);
        }
    }

    // Helper function to create delays
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getLastChatTopic() {
        const chatTopics = document.querySelectorAll('[class*="f9bf7997"][class*="d7dc56a8"]');
        debugLog('Found chat topics:', chatTopics.length);
        
        if (chatTopics.length === 0) {
            return null;
        }

        const lastTopic = chatTopics[chatTopics.length - 1];
        debugLog('Last topic:', lastTopic);
        return lastTopic;
    }

    async function findBusyMessage() {
        // Wait before checking the text
        await delay(config.textWaitDelay);
        
        const lastTopic = getLastChatTopic();
        if (!lastTopic) {
            debugLog('No chat topics found');
            return null;
        }

        const markdownBlocks = lastTopic.querySelectorAll('.ds-markdown.ds-markdown--block');
        debugLog('Found markdown blocks:', markdownBlocks.length);

        const lastBlock = markdownBlocks[markdownBlocks.length - 1];
        if (lastBlock && lastBlock.textContent.includes('The server is busy. Please try again later.')) {
            debugLog('Found busy message:', lastBlock.textContent);
            return lastBlock;
        }

        debugLog('No busy message found in last topic');
        return null;
    }

    function findRetryButton() {
        const lastTopic = getLastChatTopic();
        if (!lastTopic) return null;

        const buttons = Array.from(lastTopic.querySelectorAll('.ds-icon-button'));
        debugLog('Found buttons:', buttons.length);

        const retryButtons = buttons.filter(button => 
            button.style.getPropertyValue('--ds-icon-button-size') === '20px'
        );

        if (retryButtons.length >= 2) {
            debugLog('Found retry button (second):', retryButtons[1]);
            return retryButtons[1];
        }

        debugLog('No retry button found');
        return null;
    }

    async function waitForNextRetry() {
        return new Promise(resolve => {
            const checkForNewState = async () => {
                const lastTopic = getLastChatTopic();
                if (!lastTopic) {
                    setTimeout(checkForNewState, 100);
                    return;
                }

                // Add delay before checking for new message
                await delay(config.textWaitDelay);

                const hasNewMessage = lastTopic.querySelector('.ds-markdown.ds-markdown--block');
                const hasRetryButton = findRetryButton();

                if (hasNewMessage || hasRetryButton) {
                    debugLog('System ready for next retry');
                    resolve();
                } else {
                    setTimeout(checkForNewState, 100);
                }
            };

            setTimeout(checkForNewState, config.waitForResponse);
        });
    }

    async function attemptRetry() {
        const retryButton = findRetryButton();
        if (retryButton) {
            // Wait before clicking the retry button
            await delay(config.retryDelay);
            
            debugLog('Clicking retry button');
            retryButton.click();
            
            debugLog('Waiting for system to be ready for next retry');
            await waitForNextRetry();
            
            debugLog('Completed retry attempt');
        }
    }

    let isRetrying = false;

    async function watchForBusyServer() {
        if (isRetrying) {
            debugLog('Already processing a retry, skipping check');
            return;
        }

        debugLog('Checking for busy server...');
        const busyMessage = await findBusyMessage();
        
        if (busyMessage) {
            debugLog('Server busy message detected, attempting retry');
            isRetrying = true;
            await attemptRetry();
            isRetrying = false;
        }
    }

    // Start the watcher
    debugLog('Script initialized');
    setInterval(watchForBusyServer, config.checkInterval);
})();