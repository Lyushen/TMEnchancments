// ==UserScript==
// @name         4pda Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://4pda.to
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0400
// @description  Heavily optimized script moving from post-processing JS polling to pre-processing CSS injection. Zero layout shifts, 0% occupancy.
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @match        *://4pda.to/*
// ==/UserScript==
//4pda.to##article[class^="post"]:has(div>h2>a[title*="HUAWEI"])

(function() {
    'use strict';

    const keywordsUrl = 'https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_keywords.txt';
    const storageKey = 'storedKeywords';
    const storageTimeKey = 'storedKeywordsTimestamp';
    const cooldownPeriod = 20 * 1000; // 20 seconds

    /**
     * STAGE 1: PRE-PROCESSING CSS INJECTION
     * -------------------------------------
     * Injected at `document-start`, the browser's native CSS engine processes these
     * rules as the HTML streams in. Bypasses the render tree (0% layout occupancy)
     * and completely eliminates Flash of Unstyled Content (FOUC).
     */
    const staticCss = `
        /* 1. Hide Promotional / Wide Articles */
        article[class*="wide-"],
        article[style*="background-color: rgb(90, 111, 122)"],
        article[style*="background-color: #5a6f7a"],
        article[style*="background-color:#5a6f7a"] {
            display: none !important;
        }

        /* 2. Hide articles missing expected structure */
        article:not(:has(> div:nth-child(3))) {
            display: none !important;
        }

        /* 3. Targeted Promos & Buttons */
        lek:has(a[target="_blank"]),
        li.menu-main-item:has(a[href*="utm_source"]),
        a[role="button"],
        .menu-brands,
        footer {
            display: none !important;
        }

        /* 4. Script-injected Ad Wrapper Detection 
           Instead of searching JS text contents, we target the structural behavior:
           A container wrapping a script AND an ad image sourced from 4pda natively. */
        *:has(> script):has(> img[src^="https://4pda.to/s/"]) {
            display: none !important;
        }

        /* 5. Hide Slider Containers (Replaces JS .slider-list mapping) */
        *:has(> .slider-list + .slider-list + .slider-list),
        [style*="overflow: hidden"][style*="height"]:has(> .slider-list ~ .slider-list) {
            display: none !important;
        }

        /* 6. Layout Adjustments (Replaces JS parent node traversal) */
        :has(> div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm]) {
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
        }

        div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm] {
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
        }

        /* Hide anything placed sequentially after the main container */
        div.container[itemscope][itemtype="http://schema.org/Article"][data-ztm] ~ * {
            display: none !important;
        }

        /* 7. Background Ad CSS Native Block 
           Targets inline styles instantly without waiting for DOM evaluation. */[style*="4pda.to/s/"][style*=".jpg"],[style*="background-color: rgb(230, 231, 233)"],[style*="background-color: #e6e7e9"] {
            background: none !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
        }
    `;

    // Inject immediately to the root element since document.head doesn't exist yet at document-start
    const injectStyle = (id, rules) => {
        let styleNode = document.getElementById(id);
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = id;
            (document.head || document.documentElement).appendChild(styleNode);
        }
        styleNode.textContent = rules;
    };

    injectStyle('tm-static-enhancements', staticCss);

    /**
     * STAGE 2: DYNAMIC KEYWORD HANDLING
     * -------------------------
     * Loads from local cache instantly.
     * Fetches fresh keywords asynchronously in the background.
     */
    const applyKeywordRules = (keywords) => {
        if (!keywords || !keywords.length) return;
        const rules = keywords.map(kw => {
            const safeKw = kw.replace(/(["\\])/g, '\\$1');
            // Uses CSS case-insensitive flag "i" inside the attribute selector
            return \`article[class^="post"]:has(div>h2>a[title*="\${safeKw}" i]) { display: none !important; }\`;
        }).join('\\n');
        
        injectStyle('tm-dynamic-keywords', rules);
    };

    const loadKeywords = async () => {
        try {
            const response = await fetch(keywordsUrl);
            if (!response.ok) throw new Error('Network error');
            const text = await response.text();
            const keywords = text.split('\\n').map(k => k.trim()).filter(Boolean);
            
            GM_setValue(storageKey, keywords);
            GM_setValue(storageTimeKey, Date.now());
            
            applyKeywordRules(keywords);
        } catch (error) {
            console.error('[TM] Failed to update 4pda keywords:', error);
        }
    };

    const initKeywords = () => {
        const cached = GM_getValue(storageKey, null);
        const lastTime = GM_getValue(storageTimeKey, 0);

        // Apply immediately for 0% layout shift
        if (cached) applyKeywordRules(cached);

        // Fetch updates silently in background if cache is old
        if (!cached || (Date.now() - lastTime > cooldownPeriod)) {
            setTimeout(loadKeywords, 100); 
        }
    };

    initKeywords();

    /**
     * STAGE 3: LAZY DOM MANIPULATION
     * ------------------------------
     * Only features that strictly require Javascript (like outerHTML replacement)
     * are evaluated here using an efficient, debounced MutationObserver.
     */
    const handleDynamicContent = () => {
        // 1. YouTube Overlay Conversion
        const ytOverlays = document.querySelectorAll('a.yt-p-overlay[data-yt-player]');
        ytOverlays.forEach(overlay => {
            const iframeHTML = overlay.getAttribute('data-yt-player');
            if (iframeHTML) overlay.outerHTML = iframeHTML;
        });

        // 2. Computed background color fallback (if an ad bypassed the CSS inline block rules)
        document.querySelectorAll('article[class^="post"]:not([data-tm-checked])').forEach(article => {
            article.setAttribute('data-tm-checked', 'true');
            if (window.getComputedStyle(article).backgroundColor === "rgb(90, 111, 122)") {
                article.style.display = 'none';
            }
        });
    };

    // TreeWalker is exponentially faster and more memory efficient than querySelectorAll('*') 
    const removeComputedBackgrounds = () => {
        const walker = document.createTreeWalker(
            document.body || document.documentElement, 
            NodeFilter.SHOW_ELEMENT, 
            { acceptNode: (node) => (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }, 
            false
        );
        
        let el;
        while ((el = walker.nextNode())) {
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;
            
            if ((bgImage && bgImage.includes('4pda.to/s/') && bgImage.includes('.jpg')) || 
                style.backgroundColor === 'rgb(230, 231, 233)') {
                el.style.setProperty('background', 'none', 'important');
                el.style.setProperty('padding', '0', 'important');
                el.style.setProperty('padding-bottom', '0', 'important');
                break; // Generally only one wrapper holds the ad background. End early.
            }
        }
    };

    const setupObserver = () => {
        removeComputedBackgrounds();
        handleDynamicContent();

        // Debounced Observer to capture dynamically loaded/lazy widgets with near-zero overhead
        let timeout;
        const observer = new MutationObserver((mutations) => {
            const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
            if (hasNewNodes) {
                clearTimeout(timeout);
                timeout = setTimeout(handleDynamicContent, 100);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    };

    // Trigger Observer strictly when the DOM is safely ready for physical inspection
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupObserver);
    } else {
        setupObserver();
    }

})();