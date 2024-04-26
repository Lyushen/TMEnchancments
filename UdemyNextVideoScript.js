// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.012
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

    const checkInterval = 125; // Check every 125 ms
    const thresholdSeconds = 5; // Trigger 5 seconds before the video ends
    const startThreshold = 3; // Start monitoring after 3 seconds of playback
    const notificationLeadTime = 2000; // Notification appears 2 seconds (2000 ms) before the action
    
    function monitorVideo() {
        const videoElement = document.querySelector('[role="slider"][data-purpose="video-progress-bar"]');
        if (!videoElement) return;
    
        const ariaValueText = videoElement.getAttribute('aria-valuetext');
        if (!ariaValueText) return;
    
        const parts = ariaValueText.split(' of ');
        if (parts.length !== 2) return;
    
        const currentTime = parseTime(parts[0].trim());
        const totalTime = parseTime(parts[1].trim());
    
        // Start monitoring after certain playback time and check the time left against threshold
        if (currentTime < startThreshold || (totalTime - currentTime) > (thresholdSeconds + notificationLeadTime / 1000)) return;
    
        // Trigger action if the conditions are met and the button hasn't been clicked yet
        const button = document.querySelector('[role="link"][data-purpose="go-to-next"]');
        if (button && !button.disabled) {
            button.disabled = true; // Use a disabled property to prevent multiple triggers
            showNotification(`Next Video in ${notificationLeadTime / 1000}s`, notificationLeadTime / 1000);
    
            setTimeout(() => {
                button.click();
                button.disabled = false;
            }, notificationLeadTime);
        }
    }

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

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }

    // Setup interval and initial notification
    setInterval(monitorVideo, checkInterval);
    showNotification("Script Loaded");
})();