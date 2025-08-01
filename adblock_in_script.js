// ==UserScript==
// @name         Adblock in Script
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://adguard.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.007
// @description  Hides elements using adblock-style rules fetched from a remote source
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/adblock_in_script.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/adblock_in_script.js
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration
    const RULES_URL = 'https://raw.githubusercontent.com/Lyushen/TMEnchancments/refs/heads/main/UserRulesAdblock.txt';
    const STORAGE_KEY = 'elementHiderRules';
    const TIMESTAMP_KEY = 'elementHiderRulesTimestamp';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    const STYLE_ID = 'adblock-style-rules';
    
    // Create style element for rules
    let styleElement = document.createElement('style');
    styleElement.id = STYLE_ID;
    document.head.appendChild(styleElement);
    
    // Main function to load and apply rules
    async function loadAndApplyRules() {
        const lastUpdated = GM_getValue(TIMESTAMP_KEY, 0);
        const currentTime = Date.now();
        
        // Use cached rules if within update interval
        if (currentTime - lastUpdated < UPDATE_INTERVAL) {
            const cachedRules = GM_getValue(STORAGE_KEY, '');
            if (cachedRules) {
                applyRules(cachedRules);
                return;
            }
        }
        
        try {
            // Fetch rules from remote source
            const rulesText = await fetchRules();
            
            // Save to storage as plain text
            GM_setValue(STORAGE_KEY, rulesText);
            GM_setValue(TIMESTAMP_KEY, currentTime);
            
            applyRules(rulesText);
            console.log(`Adblock Hider: Loaded new rules at ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            console.error('Adblock Hider: Failed to fetch rules', error);
            // Fallback to cached rules
            const cachedRules = GM_getValue(STORAGE_KEY, '');
            if (cachedRules) {
                applyRules(cachedRules);
            }
        }
    }
    
    // Fetch rules with Tampermonkey API
    function fetchRules() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: RULES_URL,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: reject
            });
        });
    }
    
    // Apply rules to current page
    function applyRules(rulesText) {
        const currentHost = window.location.hostname;
        let cssRules = '';
        
        // Split rules into lines and process each one
        rulesText.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('!')) {
                return;
            }
            
            // Split into domain pattern and selector
            const [domainPattern, selector] = trimmedLine.split('##');
            if (!domainPattern || !selector) return;
            
            // Create regex from domain pattern with wildcards
            const domainRegex = createDomainRegex(domainPattern);
            
            // Check if current host matches pattern
            if (domainRegex.test(currentHost)) {
                // Add CSS rule for each selector
                selector.split(',').forEach(sel => {
                    const trimmedSel = sel.trim();
                    if (trimmedSel) {
                        cssRules += `${trimmedSel} { display: none !important; }\n`;
                    }
                });
            }
        });
        
        // Apply CSS rules
        styleElement.textContent = cssRules;
        
        // Handle dynamic content if we have rules
        if (cssRules && !window.adblockObserver) {
            setupMutationObserver();
        }
    }
    
    // Create regex from domain pattern with wildcards
    function createDomainRegex(pattern) {
        // Escape dots and replace wildcards
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
        
        return new RegExp(`^${regexPattern}$`);
    }
    
    // Watch for DOM changes to apply rules to new elements
    function setupMutationObserver() {
        window.adblockObserver = new MutationObserver(() => {
            // Reapply rules when DOM changes
            const cachedRules = GM_getValue(STORAGE_KEY, '');
            if (cachedRules) {
                applyRules(cachedRules);
            }
        });
        
        window.adblockObserver.observe(document, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize
    loadAndApplyRules();
})();