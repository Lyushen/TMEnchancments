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
// @match        *://*.allylikes.com/*
// @match        *://aliexpress.sjv.io/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /**
     * List of protocols and domains to block.
     */
    const blockedProtocols = ["aliexpress://", "allylikes://"];
    const blockedDomains = [
        "aeappsa.onelink.me",
        "aliexpress.sjv.io",
        "aliexpress.us",
    ];

    /**
     * Utility function to determine if a URL uses a blocked protocol or domain.
     */
    function isBlockedURL(url) {
        if (typeof url !== "string") return false;
        return (
            blockedProtocols.some(protocol => url.startsWith(protocol)) ||
            blockedDomains.some(domain => url.includes(domain))
        );
    }

    // Block clicks on anchor tags with blocked URLs
    document.addEventListener("click", (event) => {
        const target = event.target.closest("a");
        if (target && isBlockedURL(target.href)) {
            event.preventDefault();
            console.warn(`Blocked ${target.href} on click.`);
        }
    }, true);

    // Block attempts to open blocked URLs via window.open
    const originalOpen = window.open;
    window.open = function (url, ...args) {
        if (isBlockedURL(url)) {
            console.warn(`Blocked ${url} via window.open.`);
            return null;
        }
        return originalOpen.call(this, url, ...args);
    };

    // Block attempts to use location.href, location.assign, or location.replace with blocked URLs
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    Object.defineProperty(window.location, "assign", {
        value: function (url) {
            if (isBlockedURL(url)) {
                console.warn(`Blocked ${url} via location.assign.`);
                return;
            }
            originalAssign.call(this, url);
        },
        writable: false,
        configurable: false,
    });

    Object.defineProperty(window.location, "replace", {
        value: function (url) {
            if (isBlockedURL(url)) {
                console.warn(`Blocked ${url} via location.replace.`);
                return;
            }
            originalReplace.call(this, url);
        },
        writable: false,
        configurable: false,
    });

    // Block dynamically created links or scripts invoking blocked URLs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === "A" && isBlockedURL(node.href)) {
                    console.warn(`Blocked dynamically added ${node.href} link.`);
                    node.href = "javascript:void(0);"; // Neutralize the link
                }
                if (node.tagName === "SCRIPT") {
                    const scriptContent = node.textContent || "";
                    if (blockedProtocols.some(protocol => scriptContent.includes(protocol)) ||
                        blockedDomains.some(domain => scriptContent.includes(domain))) {
                        console.warn("Blocked dynamically added script containing blocked URLs.");
                        node.parentNode.removeChild(node); // Remove the script
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Block setAttribute for href attributes with blocked URLs
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
        if (name === "href" && isBlockedURL(value)) {
            console.warn(`Blocked ${value} via setAttribute.`);
            return;
        }
        originalSetAttribute.call(this, name, value);
    };

    // Intercept event delegation at higher levels for obfuscated or delayed clicks
    document.addEventListener("mousedown", (event) => {
        const target = event.target.closest("a");
        if (target && isBlockedURL(target.href)) {
            event.preventDefault();
            console.warn(`Blocked ${target.href} on mousedown.`);
        }
    }, true);

    console.info("Protocol and domain blocker is active for:");
    console.info("Blocked Protocols:", blockedProtocols.join(", "));
    console.info("Blocked Domains:", blockedDomains.join(", "));
})();