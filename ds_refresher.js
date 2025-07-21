// ==UserScript==
// @name         DeepSeek Chat Auto-Retry
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://chat.deepseek.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0007
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
        checkInterval: 1000,  // How often to check for the button (in ms)
        timeout: 30000,       // Maximum time to wait for the button (in ms)
        debug: true,          // Whether to log debug messages
        buttonSignature: 'div.ds-icon-button div.ds-icon > svg[width="24"][height="24"][viewBox="0 0 24 24"]'
    };

    // Unique identifier for tracking
    const sessionId = Math.random().toString(36).substring(2, 10);
    let attemptCount = 0;

    function debugLog(...args) {
        if (config.debug) {
            console.log(`[ButtonWaiter:${sessionId}]`, ...args);
        }
    }

    function isButtonVisible(button) {
        if (!button) return false;
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        
        const isVisible = rect.width > 0 &&
                         rect.height > 0 &&
                         style.display !== 'none' &&
                         style.visibility !== 'hidden' &&
                         style.opacity !== '0';
        
        debugLog('Visibility check:', isVisible, button);
        return isVisible;
    }

    function findTargetButton() {
        attemptCount++;
        const candidates = [];
        
        // Main document search
        findButtonsInRoot(document, candidates);
        
        // Search in shadow DOMs
        document.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                findButtonsInRoot(el.shadowRoot, candidates);
            }
        });
        
        debugLog(`Scan #${attemptCount} found ${candidates.length} candidates`);
        return candidates.find(btn => isButtonVisible(btn)) || null;
    }

    function findButtonsInRoot(root, collection) {
        try {
            const buttons = root.querySelectorAll(config.buttonSignature);
            buttons.forEach(btn => {
                // Traverse up to find the actual button container
                let buttonContainer = btn.closest('div.ds-icon-button');
                if (buttonContainer) {
                    collection.push(buttonContainer);
                }
            });
        } catch (e) {
            debugLog('Query error in root:', e);
        }
    }

    function waitForButtonAndClick() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                const button = findTargetButton();
                
                if (button && isButtonVisible(button)) {
                    try {
                        debugLog('Clicking button:', button);
                        logButtonDetails(button);
                        button.click();
                        resolve();
                        return;
                    } catch (e) {
                        debugLog('Click failed:', e);
                    }
                }
                
                // Timeout check
                if (Date.now() - startTime > config.timeout) {
                    debugLog('Timeout reached. Button not found');
                    reject('Timeout waiting for button');
                    return;
                }
                
                // Schedule next check
                setTimeout(check, config.checkInterval);
            };
            
            check();
        });
    }

    function logButtonDetails(button) {
        const details = {
            sessionId,
            classes: button.className,
            html: button.outerHTML.slice(0, 200) + '...',
            path: getDomPath(button),
            foundAt: new Date().toISOString()
        };
        
        console.groupCollapsed(`[ButtonWaiter:${sessionId}] Button Clicked`);
        console.table(details);
        console.log('Full element:', button);
        console.groupEnd();
    }

    function getDomPath(element) {
        const path = [];
        while (element) {
            let selector = element.nodeName.toLowerCase();
            
            if (element.id) {
                selector += `#${element.id}`;
                path.unshift(selector);
                break;
            } else {
                let sibling = element;
                let nth = 1;
                while (sibling.previousElementSibling) {
                    sibling = sibling.previousElementSibling;
                    nth++;
                }
                if (nth !== 1) selector += `:nth-child(${nth})`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    // Initialize
    debugLog('Script started', {
        sessionId,
        config,
        startTime: new Date().toISOString()
    });
    
    waitForButtonAndClick()
        .then(() => debugLog('Button clicked successfully'))
        .catch(err => debugLog('Error:', err));
})();