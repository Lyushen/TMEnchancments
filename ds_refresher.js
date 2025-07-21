// ==UserScript==
// @name         DeepSeek Chat Auto-Retry
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://chat.deepseek.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0008
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
        checkInterval: 1000,  // Check every 1 second
        debug: true,          // Enable detailed logging
        maxShadowDepth: 5     // Maximum shadow DOM depth to search
    };

    // Unique tracking identifiers
    const sessionId = Math.random().toString(36).substring(2, 10);
    let lastFoundButton = null;

    function debugLog(...args) {
        if (config.debug) {
            console.log(`[ButtonWatcher:${sessionId}]`, ...args);
        }
    }

    function isButtonVisible(button) {
        if (!button) return false;
        
        try {
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            
            // Check basic visibility properties
            const isVisible = (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                rect.width > 0 &&
                rect.height > 0
            );
            
            // Check if in viewport (optional but recommended)
            const inViewport = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            
            debugLog('Visibility check:', {isVisible, inViewport, display: style.display});
            return isVisible && inViewport;
        } catch (e) {
            debugLog('Visibility check error:', e);
            return false;
        }
    }

    function findButtonInRoot(root) {
        try {
            // Efficient CSS selector to target the specific button structure
            const selector = 'div.ds-icon-button div.ds-icon > svg[width="24"][height="24"][viewBox="0 0 24 24"]';
            const svgs = root.querySelectorAll(selector);
            
            for (const svg of svgs) {
                const iconDiv = svg.closest('div.ds-icon');
                if (!iconDiv) continue;
                
                const button = iconDiv.closest('div.ds-icon-button');
                if (button) return button;
            }
        } catch (e) {
            debugLog('Search error in root:', e);
        }
        return null;
    }

    function searchAllRoots() {
        const roots = [document];
        
        // BFS for shadow roots
        const queue = [{root: document, depth: 0}];
        while (queue.length > 0) {
            const {root, depth} = queue.shift();
            
            if (depth > config.maxShadowDepth) continue;
            
            const elements = root.querySelectorAll('*');
            for (const el of elements) {
                if (el.shadowRoot) {
                    roots.push(el.shadowRoot);
                    queue.push({root: el.shadowRoot, depth: depth + 1});
                }
            }
        }
        
        // Search through all found roots
        for (const root of roots) {
            const button = findButtonInRoot(root);
            if (button) return button;
        }
        
        return null;
    }

    function handleButton(button) {
        // Generate unique fingerprint for the button
        const buttonId = btoa(button.outerHTML).substring(0, 16);
        const isSameButton = lastFoundButton === buttonId;
        lastFoundButton = buttonId;
        
        // Log detailed information
        console.groupCollapsed(`[ButtonWatcher:${sessionId}] Button found ${isSameButton ? '(same)' : '(new)'}`);
        console.log('Button ID:', buttonId);
        console.log('Classes:', button.className);
        console.log('HTML snippet:', button.outerHTML.slice(0, 200) + '...');
        console.log('Visibility state:', isButtonVisible(button) ? 'Visible' : 'Hidden');
        console.log('Full element:', button);
        console.groupEnd();

        // Only click if visible
        if (isButtonVisible(button)) {
            debugLog('Clicking button');
            button.click();
            return true;
        }
        
        debugLog('Button found but not visible');
        return false;
    }

    function startWatching() {
        debugLog('Starting persistent watcher');
        
        const watch = () => {
            try {
                const button = searchAllRoots();
                if (button) {
                    handleButton(button);
                } else {
                    debugLog('Button not found in current DOM');
                }
            } catch (e) {
                debugLog('Watch cycle error:', e);
            }
            setTimeout(watch, config.checkInterval);
        };
        
        watch();
    }

    // Initialize with performance monitoring
    debugLog('Initializing watcher', {
        sessionId,
        startTime: new Date().toISOString(),
        checkInterval: config.checkInterval
    });
    
    // Start watching immediately
    startWatching();
    
    // Also watch for DOM changes
    const observer = new MutationObserver(() => {
        debugLog('DOM mutation detected - triggering check');
    });
    
    observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
})();