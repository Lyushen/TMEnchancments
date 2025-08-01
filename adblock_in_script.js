// ==UserScript==
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://adguard.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @name         Adblock Rules in Tampermonkey Script
// @namespace    http://tampermonkey.net/
// @version      1.001
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
    const UPDATE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
    const STYLE_ID = 'adblock-style-rules';
    
    // Create style element for rules
    let styleElement = document.createElement('style');
    styleElement.id = STYLE_ID;
    document.head.appendChild(styleElement);
    
    // Load rules from storage or fetch from network
    async function loadRules() {
        const lastUpdated = GM_getValue(TIMESTAMP_KEY, 0);
        const currentTime = Date.now();
        
        // Use cached rules if within update interval
        if (currentTime - lastUpdated < UPDATE_INTERVAL) {
            const cachedRules = GM_getValue(STORAGE_KEY, []);
            if (cachedRules.length > 0) {
                applyRules(cachedRules);
                return;
            }
        }
        
        try {
            // Fetch rules from remote source
            const rulesText = await fetchRules();
            const rules = parseRules(rulesText);
            
            // Save to storage
            GM_setValue(STORAGE_KEY, rules);
            GM_setValue(TIMESTAMP_KEY, currentTime);
            
            applyRules(rules);
            console.log(`Adblock Hider: Loaded ${rules.length} rules`);
        } catch (error) {
            console.error('Adblock Hider: Failed to fetch rules', error);
            // Fallback to cached rules
            const cachedRules = GM_getValue(STORAGE_KEY, []);
            if (cachedRules.length > 0) {
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
    
    // Parse rules text into array
    function parseRules(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('!') && line.includes('##'));
    }
    
    // Apply rules to current page
    function applyRules(rules) {
        const currentHost = window.location.hostname;
        let cssRules = '';
        
        rules.forEach(rule => {
            const [domainPattern, selector] = rule.split('##');
            if (!domainPattern || !selector) return;
            
            // Create regex from domain pattern
            const domainRegex = createDomainRegex(domainPattern);
            
            // Check if current host matches pattern
            if (domainRegex.test(currentHost)) {
                cssRules += `${selector} { display: none !important; }\n`;
            }
        });
        
        // Apply CSS rules
        styleElement.textContent = cssRules;
        
        // Handle dynamic content
        if (cssRules) {
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
        const observer = new MutationObserver(mutations => {
            // Reapply rules when DOM changes
            const rules = GM_getValue(STORAGE_KEY, []);
            if (rules.length > 0) {
                applyRules(rules);
            }
        });
        
        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize
    loadRules();
})();