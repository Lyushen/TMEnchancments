// ==UserScript==
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://adguard.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @name         Adblock Rules in Tampermonkey Script
// @namespace    http://tampermonkey.net/
// @version      1.001
// @description  My Adblock rules in Tampermonkey script
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/adblock_in_script.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/adblock_in_script.js
// @match        *://*.google.com/*
// @match        *://*.3dnews.ru/*
// @match        *://*.twitch.tv/*
// @match        *://*.hi-news.ru/*
// @match        *://*.freetp.org/*
// @match        *://*.skyscanner.ie/*
// @match        *://*.csmobiles.com/*
// @match        *://*.promo.worldofwarships.eu/*
// @match        *://*.amedia.online/*
// @match        *://*.fetlife.com/*
// @match        *://*.sachtienganhhn.net/*
// @match        *://*.myhome.ie/*
// @match        *://*.meetup.com/*
// @match        *://*.donedeal.ie/*
// @match        *://*.massage2book.com/*
// @match        *://*.theorytest-ireland.com/*
// @match        *://*.4pda.to/*
// @match        *://*.yandex.*/*
// @match        *://*.yadro.ru/*
// @match        *://*.allgames.zone/*
// @match        *://*.amazon.*/*
// @match        *://*.rtings.com/*
// @match        *://*.account.mygovid.ie/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const rules = [
        { domain: /google\.com/, selector: 'div[id^="eob_"]' },
        { domain: /3dnews\.ru/, selector: '*:has(>a[href*="servernews.ru"])' },
        { domain: /3dnews\.ru/, selector: '.relatedbox, .rbxglob' },
        { domain: /3dnews\.ru/, selector: '.entry-meta' },
        { domain: /3dnews\.ru/, selector: '.comment-warn' },
        { domain: /twitch\.tv/, selector: '.top-bar' },
        { domain: /3dnews\.ru/, selector: '.sp-form-outer' },
        { domain: /hi-news\.ru/, selector: '#social' },
        { domain: /hi-news\.ru/, selector: '.news' },
        { domain: /hi-news\.ru/, selector: '.related-posts' },
        { domain: /hi-news\.ru/, selector: '.tags' },
        { domain: /hi-news\.ru/, selector: '.large-text' },
        { domain: /hi-news\.ru/, selector: '.more-link' },
        { domain: /freetp\.org/, selector: 'img[src$="abs.jpg"]' },
        { domain: /skyscanner\.ie/, selector: '#cookie-banner-root' },
        { domain: /csmobiles\.com/, selector: '#_desktop_logo' },
        { domain: /promo\.worldofwarships\.eu/, selector: '.page-content' },
        { domain: /amedia\.online/, selector: '.topnews' },
        { domain: /amedia\.online/, selector: '.film-desc' },
        { domain: /fetlife\.com/, selector: '#rc' },
        { domain: /sachtienganhhn\.net/, selector: '#right-sidebar' },
        { domain: /myhome\.ie/, selector: '.PropertyBrochure__Ad' },
        { domain: /meetup\.com/, selector: '#try-pro-links' },
        { domain: /meetup\.com/, selector: '#start-new-group-link' },
        { domain: /meetup\.com/, selector: '#main_footer' },
        { domain: /donedeal\.ie/, selector: 'div[class*="styles__SWhitePanel-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'div[class*="GreenlightPanel__"]' },
        { domain: /donedeal\.ie/, selector: 'div[class^="InfoPanel__ServicePartnerWrapper"]' },
        { domain: /donedeal\.ie/, selector: 'div[class^="SimpleShowMore__SimpleShowMoreContainer-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'div[class^="InfoPanel__DFP-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'div[class^="PromoPanelCollection__Container-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'div[class^="AdDetails__SeoContainer-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'div[class*="__FeaturedDealerContainer-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'footer[class^="Footer__Wrapper-sc-"]' },
        { domain: /donedeal\.ie/, selector: 'div[class^="styles__InternalLinksContainer-sc-"]' },
        { domain: /donedeal\.ie/, custom: function() {
            const ul = document.querySelector('ul[data-testid="card-list"][class^="Listings__List-sc-"]');
            if (ul) ul.style.gap = '2px';
        }},
        { domain: /donedeal\.ie/, selector: 'li:has(> div > div > div > p:contains(SPOTLIGHT))' },
        { domain: /massage2book\.com/, custom: function() {
            const inputs = document.querySelectorAll('input[id$="Hiddenlblmobile"]');
            inputs.forEach(input => input.type = '');
        }},
        { domain: /theorytest-ireland\.com/, selector: '#google_esf' },
        { domain: /theorytest-ireland\.com/, selector: 'div.container-lg', style: { marginTop: '0', padding: '0' } },
        { domain: /theorytest-ireland\.com/, selector: '.col-md-8', style: { width: '100%', maxWidth: '1200px', margin: '0 auto' } },
        { domain: /theorytest-ireland\.com/, selector: '.card-title.fs-6', style: { fontSize: '150%' } },
        { domain: /theorytest-ireland\.com/, selector: '.lst-car-item.fs-6', style: { fontSize: '150%' } },
        { domain: /theorytest-ireland\.com/, selector: '.navbar-nav', style: { '--bs-nav-link-padding-x': '0', '--bs-nav-link-padding-y': '0' } },
        { domain: /theorytest-ireland\.com/, selector: '.navbar', style: { position: 'static', padding: '0px' } },
        { domain: /theorytest-ireland\.com/, selector: 'html', style: { '--bs-body-line-height': 'initial' } },
        { domain: /theorytest-ireland\.com/, selector: 'body', style: { padding: '0' } },
        { domain: /theorytest-ireland\.com/, selector: 'div.container-lg > br' },
        { domain: /theorytest-ireland\.com/, selector: 'footer' },
        { domain: /theorytest-ireland\.com/, selector: 'div[class$="question-container"]', style: { padding: '0px' } },
        { domain: /theorytest-ireland\.com/, selector: 'div[class$="questionPanelCar"]', style: { padding: '1px' } },
        { domain: /theorytest-ireland\.com/, selector: 'div.row', style: { margin: '0px' } },
        { domain: /theorytest-ireland\.com/, selector: 'img[class="d-inline-block align-text-top"]', style: { width: '50px' } },
        { domain: /theorytest-ireland\.com/, selector: 'button[data-bs-target="#navbarNav"]', style: { padding: '0px' } },
        { domain: /theorytest-ireland\.com/, selector: 'center:has(span.advert)' },
        { domain: /4pda\.to/, selector: '.menu-brands' },
        { domain: /yandex\./, selector: '*[src*="yandex"]' },
        { domain: /yadro\.ru/, selector: '*' },
        { domain: /allgames\.zone/, selector: 'body > div.wrapper.coll-container', style: { maxWidth: 'none' } },
        { domain: /allgames\.zone/, selector: 'body > div.wrapper.coll-container', style: { marginTop: '0' } },
        { domain: /allgames\.zone/, selector: '.footer' },
        { domain: /amazon\./, selector: '[class*="AdHolder"]' },
        { domain: /amazon\./, selector: '.s-result-item.AdHolder[data-asin]' },
        { domain: /rtings\.com/, selector: '.app-sticky_header-content' },
        { domain: /account\.mygovid\.ie/, selector: '.mygovid-overlay' }
    ];

    function applyRule(rule) {
        if (rule.selector) {
            const elements = document.querySelectorAll(rule.selector);
            elements.forEach(element => element.remove());
        }
        if (rule.style && rule.selector) {
            const elements = document.querySelectorAll(rule.selector);
            elements.forEach(element => {
                Object.assign(element.style, rule.style);
            });
        }
        if (rule.custom) {
            rule.custom();
        }
    }

    function matchDomain(domainRegex) {
        return domainRegex.test(window.location.hostname);
    }

    rules.forEach(rule => {
        if (matchDomain(rule.domain)) {
            applyRule(rule);
        }
    });
})();
