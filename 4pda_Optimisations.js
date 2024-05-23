// ==UserScript==
// @name         4pda Optimisations
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://4pda.to
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.00232
// @description  Block specific first elements from 4pda.to
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/4pda_Optimisations.js
// @grant        none 
// @match        *://4pda.to/*
// ==/UserScript==
//4pda.to##article[class^="post"]:has(div>h2>a[title*="HUAWEI"])

(function() {
    'use strict';

    const keywords = [
        "Росси",
        "россий",
        "яндекс",
        "Яндекс",
        "Yandex",
        "RuStore",
        "рассекрети",
        "Сбер",
        "VK Видео",
        "Смута",
        "Смуты",
        "Смуте",
        "Слух:",
        "Инсайд:",
        "Инсайды",
        "Инсайдеры:",
        "HUAWEI",
        "AnTuTu",
        "Тинькофф",
        "Главное за неделю",
        "«МегаФон",
        "ФАС",
        "«Аврора",
        "РФ",
        "VK",
        "MTC",
        "Lada",
        "МТС",
        "Госдум",
        "М.Видео",
        "Трансмашхолдинг",
        "Москвич",
        "Р-ФОН",
        "Минцифры",
        "ВКонтакте",
        "россиян",
        "Одноклассник",
        "«Русы против ящеров»",
        "Госуслуг",
        "Mинпромторг",
        "«Лаборатория Касперского»",
        "Рувики",
        "«Шедеврум»",
        "«Русы против Ящеров»",
        "МВД",
        "Минфин",
        "«Русам против ящеров»",
        "«Санёк»",
        "Роскомнадзор",
        "HyperOS",
        "Sber ",
        "QIWI",
        "Slavania",
        "INDIKA",
        "Байкал Электроникс",
        "Mir Pay",
        "ФТС",
        "Маркетплейс",
        "С нуля до профи в Java",
        "РЖД"
    ];

    let cssRules = keywords.map(keyword => `article[class^="post"]:has(div>h2>a[title*="${keyword}"]) { display: none !important; }`).join(' ');

    // Additional rules
    cssRules += `
        article:not(:has(> div:nth-child(3))) { display: none !important; }
        *:has(> .slider-list + .slider-list + .slider-list) { display: none !important; }
    `;

    const applyCSSRules = (rules) => {
        if (!document.getElementById("customTampermonkeyStyles")) {
            const blockStyle = document.createElement('style');
            blockStyle.id = "customTampermonkeyStyles";
            blockStyle.innerHTML = rules;
            document.head.appendChild(blockStyle);
        }
    };

    applyCSSRules(cssRules);

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
        
        // New loop to hide <lek> elements with <a> tags having target="_blank"
        const lekElements = document.querySelectorAll('lek');
        lekElements.forEach(lek => {
            const aTag = lek.querySelector('a[target="_blank"]');
            if (aTag) {
                lek.style.display = 'none';
            }
        });

        // New pattern for hiding specific links with `utm_source`
        const promotionalLinks = document.querySelectorAll('a[href*="utm_source"]');
        promotionalLinks.forEach(link => {
            let parentElement = link.closest('li');
            if (parentElement && parentElement.classList.contains('menu-main-item')) {
                parentElement.style.display = 'none';
            }
        });

        // New loop to directly hide <a> elements with role="button"
        const buttonRoleLinks = document.querySelectorAll('a[role="button"]');
        buttonRoleLinks.forEach(link => {
            link.style.display = 'none';  // Directly hiding the <a> element itself
        });
    };

    // High-frequency polling
    const pollDOM = (callback) => {
        callback();
        requestAnimationFrame(() => pollDOM(callback));
    };

    pollDOM(hideArticles);

})();
