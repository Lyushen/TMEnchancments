// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.006
// @description  This script presses the Next element that will switch to a new video when it's about to end. Tracks video progress and triggers a button click near the end, with notifications.
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/UdemyNextVideoScript.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/UdemyNextVideoScript.js
// @grant        none
// @match        https://*.udemy.com/course/*
// ==/UserScript==

(function() {
    'use strict';

    const checkInterval = 500; // Check every 500 ms
    const thresholdSeconds = 3; // Trigger 3 seconds before the video ends
    const startThreshold = 3; // Start monitoring after 3 seconds of playback

    function showNotification(message) {
        const existingNotification = document.getElementById('gm-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }

        const notification = document.createElement('div');
        notification.id = 'gm-notification';
        notification.style.position = 'fixed';
        notification.style.top = '45%';
        notification.style.right = '50%';
        notification.style.background = 'rgba(255, 255, 255, 0.9)';
        notification.style.border = '1px solid #ccc';
        notification.style.borderRadius = '5px';
        notification.style.padding = '10px';
        notification.style.zIndex = '10001';
        notification.style.transition = 'opacity 1s';
        notification.innerText = message;

        document.body.appendChild(notification);

        // Fade in and out
        notification.style.opacity = 1;
        setTimeout(() => {
            notification.style.opacity = 0;
            setTimeout(() => document.body.removeChild(notification), 1000);
        }, 1000);
    }

    setInterval(() => {
        const videoElement = document.querySelector('[role="slider"][data-purpose="video-progress-bar"]');
        if (videoElement) {
            const ariaValueText = videoElement.getAttribute('aria-valuetext');
            if (ariaValueText) {
                const parts = ariaValueText.split(' of ');
                if (parts.length === 2) {
                    const currentTimeStr = parts[0].trim();
                    const totalTimeStr = parts[1].trim();

                    const currentTime = parseTime(currentTimeStr);
                    const totalTime = parseTime(totalTimeStr);

                    if (currentTime >= startThreshold && (totalTime - currentTime) <= thresholdSeconds) {
                        const button = document.querySelector('[role="link"][data-purpose="go-to-next"]');
                        if (button) {
                            button.click();
                            showNotification("Next Video");
                            setTimeout(() => {
                                intervalHandle = setInterval(monitorVideo, checkInterval);  // Restart the monitoring after a delay
                            }, 500);  // 500 ms delay before rechecking
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

    // Initial message to show the script has loaded
    showNotification("Script Loaded");
})();