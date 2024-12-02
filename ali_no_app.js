// ==UserScript==
// @name         Block AliExpress Protocol Handler
// @namespace    http://tampermonkey.net/
// @version      1.001
// @description  Block all attempts to call the aliexpress:// protocol while keeping the website functional.
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://aliexpress.com
// @namespace    https://github.com/Lyushen
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/DoneDeal_Optimisations.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/DoneDeal_Optimisations.js
// @author       Lyushen
// @license      GNU
// @match        *://*.aliexpress.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Block hrefs or dynamically injected scripts that attempt to use aliexpress:// protocol.
     * This method ensures that even obfuscated or indirect calls are intercepted.
     */

    // Utility: Prevent navigation to aliexpress://
    function isAliExpressProtocol(url) {
        return typeof url === "string" && url.startsWith("aliexpress://");
    }

    // Intercept clicks on anchor tags
    document.addEventListener("click", (event) => {
        const target = event.target.closest("a");
        if (target && isAliExpressProtocol(target.href)) {
            event.preventDefault();
            console.warn("Blocked aliexpress:// protocol on click:", target.href);
        }
    });

    // Intercept window.open calls
    const originalOpen = window.open;
    window.open = function (url, ...args) {
        if (isAliExpressProtocol(url)) {
            console.warn("Blocked aliexpress:// protocol via window.open:", url);
            return null;
        }
        return originalOpen.call(this, url, ...args);
    };

    // Intercept location changes (e.g., window.location.href = "aliexpress://...")
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    window.location.assign = function (url) {
        if (isAliExpressProtocol(url)) {
            console.warn("Blocked aliexpress:// protocol via location.assign:", url);
            return;
        }
        originalAssign.call(this, url);
    };
    window.location.replace = function (url) {
        if (isAliExpressProtocol(url)) {
            console.warn("Blocked aliexpress:// protocol via location.replace:", url);
            return;
        }
        originalReplace.call(this, url);
    };

    // Intercept dynamically created anchor elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === "A" && isAliExpressProtocol(node.href)) {
                    console.warn("Blocked dynamically added aliexpress:// link:", node.href);
                    node.href = "javascript:void(0);";
                }
                // Check for script tags attempting protocol navigation
                if (node.tagName === "SCRIPT") {
                    const scriptContent = node.textContent || "";
                    if (scriptContent.includes("aliexpress://")) {
                        console.warn("Blocked script with aliexpress:// protocol.");
                        node.parentNode.removeChild(node); // Remove script
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Override setAttribute to block protocol injection via attributes
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
        if (name === "href" && isAliExpressProtocol(value)) {
            console.warn("Blocked aliexpress:// protocol via setAttribute:", value);
            return;
        }
        originalSetAttribute.call(this, name, value);
    };

    console.info("AliExpress protocol blocker is active.");
})();