// ==UserScript==
// @name         DeepSeek Chat Auto-Retry
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://chat.deepseek.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0006
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
        debug: true           // Whether to log debug messages
    };
    
    function debugLog(...args) {
        if (config.debug) {
            console.log('[Button Watcher]', ...args);
        }
    }

    function isButtonVisible(button) {
        if (!button) return false;
        
        // Basic style checks
        const style = window.getComputedStyle(button);
        if (style.display === 'none') {
            debugLog('Visibility fail: display:none');
            return false;
        }
        if (style.visibility === 'hidden') {
            debugLog('Visibility fail: visibility:hidden');
            return false;
        }
        if (parseFloat(style.opacity) < 0.1) {
            debugLog('Visibility fail: opacity < 0.1');
            return false;
        }
        
        // Dimensions check
        const rect = button.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) {
            debugLog('Visibility fail: element too small', rect);
            return false;
        }
        
        // Viewport position check
        const inViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        
        if (!inViewport) {
            debugLog('Visibility fail: outside viewport', rect);
            return false;
        }
        
        // Disabled state check
        if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
            debugLog('Visibility fail: button disabled');
            return false;
        }
        
        return true;
    }

    function findTargetButton() {
        const candidates = document.querySelectorAll('div.ds-icon-button');
        debugLog(`Found ${candidates.length} candidate buttons`);
        
        for (const button of candidates) {
            // Log candidate for inspection
            debugLog('Checking candidate:', button);
            
            // Verify icon container exists
            const iconDiv = button.querySelector('div.ds-icon');
            if (!iconDiv) {
                debugLog('Candidate rejected: Missing div.ds-icon');
                continue;
            }
            
            // Verify SVG exists with required attributes
            const svg = iconDiv.querySelector('svg');
            if (!svg) {
                debugLog('Candidate rejected: Missing SVG');
                continue;
            }
            
            // Check SVG dimensions
            if (svg.getAttribute('width') !== '24' || 
                svg.getAttribute('height') !== '24' || 
                svg.getAttribute('viewBox') !== '0 0 24 24') {
                debugLog('Candidate rejected: Invalid SVG dimensions');
                continue;
            }
            
            // Check for expected path (optional safety)
            const paths = svg.querySelectorAll('path');
            if (paths.length === 0) {
                debugLog('Candidate rejected: No paths in SVG');
                continue;
            }
            
            return button;
        }
        
        return null;
    }

    function handleButtonAction(button) {
        // Log button to console for inspection
        console.log('%c[Button Watcher]%c Located target button:', 
            'background: #4a6cf7; color: white; padding: 2px 4px; border-radius: 3px;',
            'color: #4a6cf7; font-weight: bold;', 
            button
        );
        
        // Highlight the button (temporarily for visual confirmation)
        const originalBorder = button.style.border;
        button.style.border = '2px solid #4a6cf7';
        button.style.boxShadow = '0 0 8px rgba(74, 108, 247, 0.8)';
        
        setTimeout(() => {
            button.style.border = originalBorder;
            button.style.boxShadow = '';
        }, 2000);
        
        // Execute primary action
        debugLog('Dispatching click event');
        button.click();
    }

    async function waitForButton() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let found = false;
            
            debugLog(`Starting button watch (timeout: ${config.timeout}ms)`);
            
            const checker = () => {
                // Timeout check
                if (Date.now() - startTime > config.timeout) {
                    debugLog('Search timeout reached');
                    reject(new Error('Button not found within timeout period'));
                    return;
                }
                
                // Try to find button
                const button = findTargetButton();
                
                if (button) {
                    debugLog('Potential target found');
                    found = true;
                    
                    if (isButtonVisible(button)) {
                        debugLog('Button is visible and valid');
                        handleButtonAction(button);
                        resolve();
                    } else {
                        debugLog('Button found but not yet visible');
                        setTimeout(checker, config.checkInterval);
                    }
                } else {
                    setTimeout(checker, config.checkInterval);
                }
            };
            
            checker();
        });
    }

    // Start the process
    waitForButton()
        .then(() => debugLog('Button action completed successfully'))
        .catch((error) => {
            console.error('[Button Watcher] ERROR:', error.message);
            debugLog('Final status - Found button:', found);
        });
})();