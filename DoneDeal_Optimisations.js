// ==UserScript==
// @name         DoneDeal Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://donedeal.ie
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.001
// @description  For car search: Convert (miles) mileage to km, and (£) price to €, so that the list contains consistent information, and item page
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/DoneDeal_Optimisations.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/DoneDeal_Optimisations.js
// @grant        none
// @match        https://www.donedeal.ie/cars*
// @match        https://www.donedeal.ie/cars-for-sale/*
// @require      https://code.jquery.com/jquery-3.6.3.min.js
// ==/UserScript==

(function() {
    'use strict';

    const MILES_TO_KM = 1.609;
    const POUNDS_TO_EUROS = 1.14;

    function convertMilesToKm(miles) {
        return Math.round(miles * MILES_TO_KM);
    }

    function convertPoundsToEuros(pounds) {
        return Math.round(pounds * POUNDS_TO_EUROS);
    }

    function processMileage(element) {
        if (element.text().includes(" mi") && !element.text().includes("min") && !element.text().includes("mins") && !element.text().includes("days")) {
            element.css('color', 'red');
            const miles = parseInt(element.text().replace(" mi", "").replace(",", ""));
            element.text(convertMilesToKm(miles).toLocaleString() + " km");
        }
    }

    function processPrice(element) {
        if (element.text().includes("£")) {
            element.css('color', 'red');
            const pounds = parseInt(element.text().replace("£", "").replace(",", ""));
            element.text("€" + convertPoundsToEuros(pounds).toLocaleString());
        }
    }

    function processResults() {
        if (document.location.href.includes('/cars-for-sale/')) { /* Details page */
            $('div[class|="KeyInfoList__Text"]').each(function() {
                processMileage($(this));
            });
            $('p[class|="Price__CurrentPrice"]:contains("£")').each(function() {
                processPrice($(this));
            });
        } else if (document.location.href.includes('/cars')) { /* List page */
            $('div[class|="Card__Body"] li[class|="Card__KeyInfoItem"]').each(function() {
                processMileage($(this));
            });
            $('p[class|="Card__InfoText"]:contains("£")').each(function() {
                processPrice($(this));
            });
        }
    }

    function observeResults() {
        const targetNode = document.querySelector('body');
        const config = { childList: true, subtree: true };

        const callback = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    processResults();
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    processResults();
    observeResults();
})();