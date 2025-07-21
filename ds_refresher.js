// ==UserScript==
// @name         DeepSeek Chat Auto-Retry
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://chat.deepseek.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0004
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
        checkInterval: 1000,
        timeout: 30000,
        debug: true
    };
    function debugLog(...args) {
        if (config.debug) {
            console.log('[Button Waiter]', ...args);
        }
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
    function findTargetButton() {
        const buttons = document.querySelectorAll('div.ds-icon-button');
        for (const button of buttons) {
            const iconDiv = button.querySelector('div.ds-icon');
            if (iconDiv) {
                const svg = iconDiv.querySelector('svg');
                if (svg) {
                    const width = svg.getAttribute('width');
                    const height = svg.getAttribute('height');
                    const viewBox = svg.getAttribute('viewBox');
                    if (width === '24' && height === '24' && viewBox === '0 0 24 24') {
                        return button;
                    }
                }
            }
        }
        return null;
    }
    async function waitForButtonAndChange(callback) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkForButton = () => {
                const button = findTargetButton();
                if (button && isButtonVisible(button)) {
                    debugLog('Target button found and visible, applying changes');
                    callback(button);
                    resolve();
                } else if (Date.now() - startTime > config.timeout) {
                    debugLog('Timeout reached, button not found');
                    reject(new Error('Timeout reached while waiting for the button'));
                } else {
                    debugLog('Target button not found or not visible, checking again...');
                    setTimeout(checkForButton, config.checkInterval);
                }
            };
            checkForButton();
        });
    }
    // Example callback function that clicks the button
    function clickButton(button) {
        button.click();
    }
    // Start waiting for the button and then click it
    debugLog('Script initialized, waiting for button...');
    waitForButtonAndChange(clickButton).catch(debugLog);
})();
