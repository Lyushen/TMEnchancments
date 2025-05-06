// ==UserScript==
// @name         Udemy API Test Extractor
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.1001
// @description  Sequential test extraction with proper numbering
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/udemy-api-test-extractor.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/udemy-api-test-extractor.js
// @match        https://ibmcsr.udemy.com/course/*
// @grant        GM_download
// @grant        GM_log
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    let courseName = window.location.pathname.split('/')[2];
    let currentPart = 1;
    let isProcessing = false;
    let overlay;
    let originalXHROpen;
    let requestQueue = [];

    GM_addStyle(`
        #extractor-btn {
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 9999;
            padding: 5px 10px;
            background: #2d2d2d;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.9;
            transition: opacity 0.2s;
        }
        #extractor-btn:hover {
            opacity: 1;
        }
    `);

    function createButton() {
        overlay = document.createElement('button');
        overlay.id = 'extractor-btn';
        overlay.textContent = 'Start';
        overlay.addEventListener('click', toggleProcessing);
        document.body.appendChild(overlay);
    }

    async function processExistingRequests() {
        const resources = performance.getEntriesByType("resource");
        for (const resource of resources) {
            if (resource.name.includes('/quizzes/') && resource.name.includes('/assessments/')) {
                await handleApiCall(resource.name);
            }
        }
    }

    function interceptRequests() {
        originalXHROpen = window.XMLHttpRequest.prototype.open;

        window.XMLHttpRequest.prototype.open = function(method, url) {
            if (url.includes('/quizzes/') && url.includes('/assessments/')) {
                const modifiedUrl = url.replace(/page_size=\d+/, 'page_size=999');
                requestQueue.push(modifiedUrl);
                processQueue();
            }
            originalXHROpen.apply(this, arguments);
        };
    }

    async function processQueue() {
        while (requestQueue.length > 0 && isProcessing) {
            const url = requestQueue.shift();
            await handleApiCall(url);
        }
    }

    async function handleApiCall(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            const filename = `${courseName}-p${currentPart}.json`;

            await new Promise((resolve, reject) => {
                GM_download({
                    url: URL.createObjectURL(new Blob([JSON.stringify(data)], {type: 'application/json'})),
                    name: filename,
                    saveAs: true,
                    onload: () => {
                        GM_log(`Downloaded ${filename}`);
                        currentPart++;
                        resolve();
                    },
                    onerror: (e) => reject(e)
                });
            });
        } catch (err) {
            GM_log(`Error processing ${url}: ${err}`);
        }
    }

    function clickSkipButton() {
        const skipBtn = document.querySelector('[data-purpose="go-to-next"]');
        if (skipBtn) {
            skipBtn.click();
            GM_log(`Progressed to part ${currentPart}`);
            checkCompletion();
        }
    }

    function checkCompletion() {
        if (!document.querySelector('[data-purpose="primary-message"]')) {
            setTimeout(clickSkipButton, 2000);
        } else {
            GM_log('Course completed!');
            toggleProcessing();
        }
    }

    async function toggleProcessing() {
        isProcessing = !isProcessing;
        overlay.textContent = isProcessing ? 'Stop' : 'Start';

        if (isProcessing) {
            await processExistingRequests();
            interceptRequests();
            clickSkipButton();
        } else {
            window.XMLHttpRequest.prototype.open = originalXHROpen;
            requestQueue = [];
            currentPart = 1;
        }
    }

    // Initialize
    (function init() {
        courseName = window.location.pathname.split('/')[2];
        createButton();
        GM_log('Script initialized - Click Start to begin');
    })();
})();