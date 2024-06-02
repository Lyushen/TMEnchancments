// ==UserScript==
// @name         4pda Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://4pda.to
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.03401
// @description  Block specific first elements from 4pda.to
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @grant        GM_getValue
// @grant        GM_setValue
// @match        *://4pda.to/*
// ==/UserScript==
//4pda.to##article[class^="post"]:has(div>h2>a[title*="HUAWEI"])

(function() {
    'use strict';

    const keywordsUrl = 'https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_keywords.txt';
    const storageKey = 'storedKeywords';
    const storageTimeKey = 'storedKeywordsTimestamp';
    const cooldownPeriod = 20 * 1000; // 20 seconds in milliseconds

    const applyCSSRules = (rules) => {
        if (!document.getElementById("customTampermonkeyStyles")) {
            const blockStyle = document.createElement('style');
            blockStyle.id = "customTampermonkeyStyles";
            blockStyle.innerHTML = rules;
            document.head.appendChild(blockStyle);
        }
    };

    const hideArticles = () => {
        const articles = document.querySelectorAll('article[class^="post"]');
        articles.forEach(article => {
            const bgColor = getComputedStyle(article).backgroundColor;
            if (bgColor === "rgb(90, 111, 122)" || /wide-[123]/.test(article.className)) {
                article.style.display = 'none';
            }
        });
    
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent.includes('cw=document.body.clientWidth')) {
                let parentElement = script.parentElement;
                let imgElement = parentElement.querySelector('img[src^="https://4pda.to/s/"]');
                if (imgElement) {
                    parentElement.style.display = 'none';
                }
            }
        });
        
        const lekElements = document.querySelectorAll('lek');
        lekElements.forEach(lek => {
            const aTag = lek.querySelector('a[target="_blank"]');
            if (aTag) {
                lek.style.display = 'none';
            }
        });

        const promotionalLinks = document.querySelectorAll('a[href*="utm_source"]');
        promotionalLinks.forEach(link => {
            let parentElement = link.closest('li');
            if (parentElement && parentElement.classList.contains('menu-main-item')) {
                parentElement.style.display = 'none';
            }
        });

        const buttonRoleLinks = document.querySelectorAll('a[role="button"]');
        buttonRoleLinks.forEach(link => {
            link.style.display = 'none';
        });
    };

    const pollDOM = (callback) => {
        callback();
        requestAnimationFrame(() => setTimeout(() => pollDOM(callback), 1000)); // Check once per second
    };

    const loadKeywords = async () => {
        try {
            const response = await fetch(keywordsUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch keywords from ${keywordsUrl}`);
            }
            const text = await response.text();
            const keywords = text.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword);

            GM_setValue(storageKey, keywords);
            GM_setValue(storageTimeKey, Date.now());

            return keywords;
        } catch (error) {
            console.error('Error loading keywords:', error);
            return null;
        }
    };

    const initialize = async () => {
        let keywords = GM_getValue(storageKey, null);
        const lastUpdateTime = GM_getValue(storageTimeKey, 0);

        if (!keywords || Date.now() - lastUpdateTime > cooldownPeriod) {
            keywords = await loadKeywords();
        }

        if (keywords) {
            let cssRules = keywords.map(keyword => `article[class^="post"]:has(div>h2>a[title*="${keyword}"]) { display: none !important; }`).join(' ');

            cssRules += `
                article:not(:has(> div:nth-child(3))) { display: none !important; }
                *:has(> .slider-list + .slider-list + .slider-list) { display: none !important; }
                .menu-brands { display: none !important; }  /* Additional rule to block elements with class "menu-brands" */
            `;

            applyCSSRules(cssRules);
            pollDOM(hideArticles);
        }
    };

    initialize();
})();