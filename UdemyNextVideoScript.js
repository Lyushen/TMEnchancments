// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.011
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
    const notificationLeadTime = 1500; // Notification appears 1.5 seconds before the action
    
    function showNotification(message, duration = 1000, add_message='') {
        console.log(message+add_message);
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '45%';
        notification.style.right = '50%';
        notification.style.background = 'rgba(255, 255, 255, 0.9)';
        notification.style.border = '2px solid #000';
        notification.style.borderRadius = '5px';
        notification.style.padding = '10px';
        notification.style.zIndex = '10001';
        notification.style.transition = 'opacity 1s';
        notification.style.opacity = 0; // Start transparent
        notification.innerText = message;
        document.body.appendChild(notification);

        // Fade in and automatically remove after duration
        setTimeout(() => {
            notification.style.opacity = 1;
            setTimeout(() => {
                notification.style.opacity = 0;
                setTimeout(() => document.body.removeChild(notification), duration);
            }, duration);
        }, 500); // Delay showing the notification a bit
    }

    function monitorVideo() {
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

                    if (currentTime >= startThreshold && (totalTime - currentTime) <= (thresholdSeconds + notificationLeadTime / 1000)) {
                        const button = document.querySelector('[role="link"][data-purpose="go-to-next"]');
                        if (button && !button.clicked) {
                            button.clicked = true;
                            showNotification(`Next Video in 1.5s`, notificationLeadTime, ariaValueText);
                            setTimeout(() => {
                                button.click();
                                button.clicked = false;
                            }, notificationLeadTime);
                        }
                    }
                }
            }
        }
    }

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }

    // Setup interval and initial notification
    setInterval(monitorVideo, checkInterval);
    showNotification("Script Loaded");
})();