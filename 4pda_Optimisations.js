// ==UserScript==
// @name         4pda Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://4pda.to
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.04003
// @description  4pda optimisations
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @match        *://4pda.to/*
// ==/UserScript==

(function() {
    'use strict';

    const keywordsUrl = 'https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_keywords.txt';
    const storageKey = 'storedKeywords';
    const storageTimeKey = 'storedKeywordsTimestamp';
    const cooldownPeriod = 20 * 1000; // 20 seconds
    
    let backgroundRemoved = false; // Flag to stop heavy DOM scanning once successful

    // Utility: Safe CSS injection at document-start
    const applyCSSRules = (rules, id) => {
        if (!document.getElementById(id)) {
            const blockStyle = document.createElement('style');
            blockStyle.id = id;
            blockStyle.textContent = rules;
            // Append to documentElement because <head> might not exist at document-start
            (document.head || document.documentElement).appendChild(blockStyle);
        }
    };

    // 1. IMMUTABLE STATIC CSS (Occupancy 0 approach)
    // We delegate as much as possible to the browser's native CSS engine for zero-delay hiding
    const injectStaticCSS = () => {
        const staticRules = `
            /* Occupancy 0 overrides to ensure complete removal from render tree */
            .tm-occupancy-zero,
            article[class*="wide-1"], 
            article[class*="wide-2"], 
            article[class*="wide-3"],
            lek:has(a[target="_blank"]),
            li.menu-main-item:has(a[href*="utm_source"]),
            a[role="button"],
            footer,
            div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm] ~ *,
            div[style*="overflow: hidden"][style*="height:"]:has(> .slider-list + .slider-list),
            article:not(:has(> div:nth-child(3))),
            *:has(> .slider-list + .slider-list + .slider-list),
            .menu-brands {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                overflow: hidden !important;
                contain: strict !important; 
            }

            /* Container width resets */
            div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm] {
                width: auto !important;
                max-width: none !important;
                min-width: 0 !important;
            }

            /* Dynamically adjust parent layout without JS using :has() */
            div:has(> div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm]) {
                width: auto !important;
                max-width: none !important;
                min-width: 0 !important;
            }
        `;
        applyCSSRules(staticRules, "tm-static-styles");
    };

    // 2. JAVASCRIPT FALLBACKS (For conditions too complex for pure CSS)
    const hideArticlesJS = () => {
        const articles = document.querySelectorAll('article[class^="post"]');
        articles.forEach(article => {
            const bgColor = window.getComputedStyle(article).backgroundColor;
            // Target specific background color
            if (bgColor === "rgb(90, 111, 122)") {
                article.style.setProperty('display', 'none', 'important');
            }
        });

        // Specific script ad injections
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent.includes('cw=document.body.clientWidth')) {
                let parentElement = script.parentElement;
                let imgElement = parentElement.querySelector('img[src^="https://4pda.to/s/"]');
                if (imgElement && parentElement.style.display !== 'none') {
                    parentElement.style.setProperty('display', 'none', 'important');
                }
            }
        });
    };

    const convertYouTubeOverlayToIframe = () => {
        const ytOverlays = document.querySelectorAll('a.yt-p-overlay[data-yt-player]');
        ytOverlays.forEach(overlay => {
            const iframeHTML = overlay.getAttribute('data-yt-player');
            if (iframeHTML) overlay.outerHTML = iframeHTML;
        });
    };

    const remove4pdaBackground = () => {
        if (backgroundRemoved) return; // Save CPU if we already did this

        const allElements = document.querySelectorAll('body, div, main, html'); // Restricted scope for performance
        let foundElement = null;

        for (const el of allElements) {
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;
            
            if ((bgImage.includes('4pda.to/s/') && bgImage.includes('.jpg')) || style.backgroundColor === 'rgb(230, 231, 233)') {
                foundElement = el;
                break;
            }
        }

        if (foundElement) {
            foundElement.style.setProperty('background', 'none', 'important');
            foundElement.style.setProperty('padding', '0', 'important');
            foundElement.style.setProperty('padding-bottom', '0', 'important');
            backgroundRemoved = true; // Stop searching in future polls
        }
    };

    const adjustLayoutJS = () => {
        // Fallback for older browsers that don't support CSS :has()
        const containers = document.querySelectorAll('div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm]');
        containers.forEach(container => {
            const parent = container.parentElement;
            if (parent && parent.style.width !== 'auto') {
                parent.style.setProperty('width', 'auto', 'important');
                parent.style.setProperty('max-width', 'none', 'important');
                parent.style.setProperty('min-width', '0', 'important');
                parent.classList.remove('col-md-10', 'col-lg-8', 'col-xl-6', 'col-xxl-4');
            }
        });
    };

    // 3. ASYNC KEYWORD FETCHING
    const loadKeywordsAsync = async () => {
        try {
            let keywords = GM_getValue(storageKey, null);
            const lastUpdateTime = GM_getValue(storageTimeKey, 0);

            if (!keywords || Date.now() - lastUpdateTime > cooldownPeriod) {
                const response = await fetch(keywordsUrl);
                if (response.ok) {
                    const text = await response.text();
                    keywords = text.split('\n').map(k => k.trim()).filter(k => k);
                    GM_setValue(storageKey, keywords);
                    GM_setValue(storageTimeKey, Date.now());
                }
            }

            if (keywords && keywords.length > 0) {
                // Ignore case (" i") is used in CSS attributes
                const rules = keywords.map(keyword => 
                    `article[class^="post"]:has(div>h2>a[title*="${keyword}" i]) { 
                        display: none !important; 
                        width: 0 !important; 
                        height: 0 !important; 
                    }`
                ).join('\n');
                applyCSSRules(rules, 'tm-dynamic-keywords');
            }
        } catch (error) {
            console.error('TM Enhancements: Error loading keywords in background', error);
        }
    };

    // 4. MAIN EXECUTION LOOP
    const pollDOM = () => {
        hideArticlesJS();
        convertYouTubeOverlayToIframe();
        adjustLayoutJS();
        remove4pdaBackground();
        
        // Loop recursively, yielding to browser rendering
        requestAnimationFrame(() => setTimeout(pollDOM, 1000));
    };

    // Initialize parallel processes
    const initialize = () => {
        // 1. Immediately inject safe static CSS (blocks ads/layouts at render-time)
        injectStaticCSS();

        // 2. Start polling the DOM for runtime JS cleanup
        pollDOM();

        // 3. Fetch keywords in the background safely without blocking the thread
        // We do this concurrently so the UI is highly responsive
        loadKeywordsAsync(); 
    };

    initialize();

})();