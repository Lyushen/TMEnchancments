// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.001
// @description  This script presses the Next element that will switch to a new video when it's about to end
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/UdemyNextVideoScript.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/UdemyNextVideoScript.js
// @grant        none
// @match        https://*.udemy.com/course/*
// ==/UserScript==

(function() {
    'use strict';

    const checkInterval = 500; // 500 ms interval for checking the video time
    const thresholdSeconds = 3; // seconds before the end to trigger the button click

    setInterval(() => {
        const videoElement = document.querySelector('#element-to-track');
        if (videoElement) {
            const ariaValueText = videoElement.getAttribute('aria-valuetext');
            if (ariaValueText) {
                const parts = ariaValueText.split(' of ');
                if (parts.length === 2) {
                    const currentTimeStr = parts[0].trim();
                    const totalTimeStr = parts[1].trim();
                    
                    const currentTime = parseTime(currentTimeStr);
                    const totalTime = parseTime(totalTimeStr);
                    
                    if ((totalTime - currentTime) <= thresholdSeconds) {
                        const button = document.querySelector('#button-to-press');
                        if (button) {
                            button.click();
                        }
                    }
                }
            }
        }
    }, checkInterval);

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }
})();