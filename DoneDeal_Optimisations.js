// ==UserScript==
// @name         DoneDeal Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://donedeal.ie
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.007
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
            const miles = parseInt(element.text().replace(" mi", "").replace(",", ""));
            const km = convertMilesToKm(miles).toLocaleString() + " km";

            // Update only the text content, preserving child elements
            element.contents().each(function() {
                if (this.nodeType === 3) { // Text node
                    const text = $(this).text();
                    if (text.includes(" mi")) {
                        $(this).replaceWith(text.replace(/\d+(,\d+)* mi/, km));
                    }
                }
            });

            element.css('color', 'red');
            element.attr('data-converted', 'true');
        }
    }

    function processPrice(element) {
        if (element.text().includes("£")) {
            const pounds = parseInt(element.text().replace("£", "").replace(",", ""));
            const euros = "€" + convertPoundsToEuros(pounds).toLocaleString();

            // Update only the text content, preserving child elements
            element.contents().each(function() {
                if (this.nodeType === 3) { // Text node
                    const text = $(this).text();
                    if (text.includes("£")) {
                        $(this).replaceWith(text.replace(/£\d+(,\d+)*/, euros));
                    }
                }
            });

            element.css('color', 'red');
            element.attr('data-converted', 'true');
        }
    }

    function hideSpotlightListings() {
        // Find the car list container
        const carList = $('ul[data-testid="card-list"][class*="Listingsstyled__List"]');

        if (carList.length) {
            // Find all listing cards within the car list
            const listings = carList.find('li[data-testid^="listing-card-index-"][class*="Listingsstyled__ListItem"]');

            listings.each(function() {
                const listing = $(this);
                // Check if this listing contains a Spotlight element
                const spotlightElement = listing.find('div[color="GREY_DARKER"][class*="Highlightstyled__"]:contains("Spotlight")');

                if (spotlightElement.length && listing.is(':visible')) {
                    // Hide the listing instead of removing it
                    listing.hide();
                    console.log('Hidden Spotlight listing');
                }
            });
        }
    }

    function processResults() {
        if (document.location.href.includes('/cars-for-sale/')) {
            /* Details page - keep existing logic */
            $('div[class|="KeyInfoList__Text"]').each(function() {
                if (!$(this).attr('data-converted')) {
                    processMileage($(this));
                }
            });
            $('p[class|="Price__CurrentPrice"]:contains("£")').each(function() {
                if (!$(this).attr('data-converted')) {
                    processPrice($(this));
                }
            });
        } else if (document.location.href.includes('/cars')) {
            /* List page - updated for new structure */

            // Hide Spotlight listings gently
            hideSpotlightListings();

            // Process mileage in the new meta info structure
            $('ul[class*="SearchCardstyled__MetaInfo"] li[class*="SearchCardstyled__MetaInfoItem"]').each(function() {
                if (!$(this).attr('data-converted')) {
                    processMileage($(this));
                }
            });

            // Process price in the new price structure
            $('div[class*="Pricestyled__Price"]').each(function() {
                if (!$(this).attr('data-converted')) {
                    processPrice($(this));
                }
            });
        }
    }

    function observeResults() {
        const targetNode = document.querySelector('body');
        const config = { childList: true, subtree: true };

        const callback = function(mutationsList) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Use a small delay to ensure DOM is ready
                    setTimeout(processResults, 100);
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Initial processing with a small delay to ensure page load
    setTimeout(processResults, 500);
    observeResults();
})();