// ==UserScript==
// @name         DoneDeal Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://donedeal.ie
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.011
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

    const MILES_TO_KM = 1.60934;
    const POUNDS_TO_EUROS = 1.14;

    function convertMilesToKm(miles) {
        return Math.round(miles * MILES_TO_KM);
    }

    function convertPoundsToEuros(pounds) {
        return Math.round(pounds * POUNDS_TO_EUROS);
    }

    function safeParseInt(str) {
        if (!str) return null;
        const cleaned = str.replace(/[^\d-]/g, '');
        const result = parseInt(cleaned, 10);
        return isNaN(result) ? null : result;
    }

    function calculateValueScore(year, mileageKm, priceEuros) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        
        // Skip unrealistic data
        if (age < 0 || age > 50) return null;
        if (mileageKm < 10 || mileageKm > 500000) return null;
        if (priceEuros < 500 || priceEuros > 500000) return null;
        
        // Better formula: considers depreciation, mileage wear, and value retention
        // Factors:
        // 1. Normal depreciation (cars lose ~15-20% per year)
        // 2. Mileage impact (average is 15,000-20,000 km per year)
        // 3. Price per expected remaining lifespan
        
        const expectedAnnualMileage = 15000;
        const baseDepreciation = 0.15; // 15% per year
        const mileagePenalty = 0.00001; // Small penalty per excess km
        
        // Calculate expected mileage for age
        const expectedMileage = age * expectedAnnualMileage;
        const mileageRatio = Math.min(mileageKm / Math.max(expectedMileage, 10000), 3); // Cap at 3x expected
        
        // Calculate depreciation factor
        const depreciation = 1 - Math.min(age * baseDepreciation, 0.8); // Max 80% depreciation
        
        // Calculate value score (lower is better)
        // Combines: price adjusted for age + mileage penalty
        const adjustedPrice = priceEuros / depreciation;
        const score = (adjustedPrice * mileageRatio) / 1000;
        
        return Math.round(score * 10) / 10; // Round to 1 decimal place
    }

    function processMileage(element) {
        const text = element.text().trim();
        if (text.includes(" mi") && !text.includes("min") && !text.includes("mins") && !text.includes("days")) {
            const miles = safeParseInt(text);
            if (miles && miles > 0) {
                const km = convertMilesToKm(miles);
                const kmFormatted = km.toLocaleString() + " km";
                element.text(kmFormatted);
                element.attr('data-converted', 'true');
                element.attr('data-km-value', km);
            }
        } else if (text.includes(" km") && !element.attr('data-converted')) {
            const km = safeParseInt(text);
            if (km && km > 0) {
                element.attr('data-converted', 'true');
                element.attr('data-km-value', km);
            }
        }
    }

    function processPrice(element) {
        const text = element.text().trim();
        let euros = null;

        if (text.includes("£")) {
            const pounds = safeParseInt(text);
            if (pounds && pounds > 0) {
                euros = convertPoundsToEuros(pounds);
                const eurosFormatted = "€" + euros.toLocaleString();
                element.text(eurosFormatted);
            }
        } else if (text.includes("€")) {
            euros = safeParseInt(text);
        }

        if (euros && euros > 0) {
            element.attr('data-converted', 'true');
            element.attr('data-euros-value', euros);
        }
    }

    function createValueScoreElement(priceContainer, score, year, mileageKm, priceEuros) {
        // Create a new element for the value score
        const valueElement = $('<div class="Pricestyled__PricePerMonth-sc-jik6q-3 gFnbzq"></div>');
        
        valueElement.text(`Value Score: ${score}`);
        valueElement.attr('title', 
            `Year: ${year} | Mileage: ${mileageKm.toLocaleString()}km | Price: €${priceEuros.toLocaleString()}\nScore: ${score} (Lower = Better Value)`
        );
        valueElement.css({
            'font-size': '0.9em',
            'margin-top': '2px'
        });
        
        // Add to price container
        priceContainer.append(valueElement);
        
        return valueElement;
    }

    function addValueScore(card) {
        if (card.attr('data-value-score-added')) {
            return;
        }

        try {
            // Find price container
            const priceContainer = card.find('[class*="Pricestyled__PriceContainer"]');
            if (!priceContainer.length) {
                return;
            }

            // Extract data from the card
            const metaInfo = card.find('[class*="SearchCardstyled__MetaInfo"]');
            const yearElement = metaInfo.find('li').first();
            
            // Find or process mileage element
            let mileageElement = metaInfo.find('li[data-converted="true"][data-km-value]').first();
            if (!mileageElement.length) {
                mileageElement = metaInfo.find('li').filter(function() {
                    const text = $(this).text();
                    return text.includes(' km') || text.includes(' mi');
                }).first();
                if (mileageElement.length) {
                    processMileage(mileageElement);
                }
            }
            
            // Find or process price element
            let priceElement = priceContainer.find('[class*="Pricestyled__Price"][data-converted="true"]').first();
            if (!priceElement.length) {
                priceElement = priceContainer.find('[class*="Pricestyled__Price"]').first();
                if (priceElement.length) {
                    processPrice(priceElement);
                }
            }

            // Get the values
            const year = safeParseInt(yearElement.text());
            const mileageKm = mileageElement.attr('data-km-value') ? safeParseInt(mileageElement.attr('data-km-value')) : null;
            const priceEuros = priceElement.attr('data-euros-value') ? safeParseInt(priceElement.attr('data-euros-value')) : null;

            // Validate data with realistic ranges
            if (!year || year < 1990 || year > new Date().getFullYear() + 1) {
                return;
            }

            if (!mileageKm || mileageKm < 10 || mileageKm > 500000) {
                return;
            }

            if (!priceEuros || priceEuros < 500 || priceEuros > 500000) {
                return;
            }

            // Calculate value score
            const valueScore = calculateValueScore(year, mileageKm, priceEuros);
            if (valueScore === null) {
                return;
            }

            // Check if monthly price element exists, if not create one
            let monthlyPriceElement = priceContainer.find('[class*="Pricestyled__PricePerMonth"]');
            if (!monthlyPriceElement.length) {
                monthlyPriceElement = createValueScoreElement(priceContainer, valueScore, year, mileageKm, priceEuros);
            } else {
                monthlyPriceElement.text(`Value Score: ${valueScore}`);
                monthlyPriceElement.attr('title', 
                    `Year: ${year} | Mileage: ${mileageKm.toLocaleString()}km | Price: €${priceEuros.toLocaleString()}\nScore: ${valueScore} (Lower = Better Value)`
                );
            }
            
            card.attr('data-value-score-added', 'true');

        } catch (error) {
            console.log('Error adding value score:', error);
        }
    }

    function hideSpotlightListings() {
        const carList = $('ul[data-testid="card-list"]');
        if (carList.length) {
            const listings = carList.find('li[data-testid^="listing-card-index-"]');
            listings.each(function() {
                const listing = $(this);
                const spotlightElement = listing.find('div[color="GREY_DARKER"]:contains("Spotlight")');
                if (spotlightElement.length && listing.is(':visible')) {
                    listing.hide();
                }
            });
        }
    }

    function processListingCard(card) {
        if (card.attr('data-processing-started')) {
            return;
        }
        card.attr('data-processing-started', 'true');

        // Process mileage and price first
        card.find('[class*="SearchCardstyled__MetaInfo"] li').each(function() {
            processMileage($(this));
        });

        card.find('[class*="Pricestyled__Price"]').each(function() {
            processPrice($(this));
        });

        // Then add value score
        setTimeout(() => addValueScore(card), 100);
    }

    function processResults() {
        if (document.location.href.includes('/cars-for-sale/')) {
            // Details page
            $('div[class*="KeyInfoList__Text"]').each(function() {
                processMileage($(this));
            });
            $('p[class*="Price__CurrentPrice"]').each(function() {
                processPrice($(this));
            });
        } else if (document.location.href.includes('/cars')) {
            // List page
            hideSpotlightListings();
            $('li[data-testid^="listing-card-index-"]').each(function() {
                processListingCard($(this));
            });
        }
    }

    function observeResults() {
        const targetNode = document.querySelector('body');
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver(function(mutationsList) {
            let shouldProcess = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                    break;
                }
            }
            if (shouldProcess) {
                setTimeout(processResults, 200);
            }
        });
        observer.observe(targetNode, config);
    }

    // Start processing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(processResults, 1000);
        });
    } else {
        setTimeout(processResults, 1000);
    }
    observeResults();
})();