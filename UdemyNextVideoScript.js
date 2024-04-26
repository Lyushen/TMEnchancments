// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.016
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
    const notificationLeadTime = 2; // Notification appears 2 seconds before the action, in milliseconds
    
    function monitorVideo() {
        const videoElement = document.querySelector('[role="slider"][data-purpose="video-progress-bar"]');
        if (!videoElement) return;
    
        const ariaValueText = videoElement.getAttribute('aria-valuetext');
        if (!ariaValueText) return;
    
        const parts = ariaValueText.split(' of ');
        if (parts.length !== 2) return;
    
        const currentTime = parseTime(parts[0].trim());
        const totalTime = parseTime(parts[1].trim());
    
        // Check if it's time to start monitoring the video playback
        if (currentTime < startThreshold) return;
    
        // Display notification at the specified lead time before the video ends
        if ((totalTime - currentTime) <= (thresholdSeconds + notificationLeadTime) && !videoElement.notificationShown) {
            videoElement.notificationShown = true; // Set a flag to ensure notification is shown only once
            console.log(`Notification is triggered at ${ariaValueText}`)
            showNotification(`Next Video in ${notificationLeadTime}s`, notificationLeadTime);
        }
    
        // Trigger the button click and manage the button state based on video progress
        const button = document.querySelector('[role="link"][data-purpose="go-to-next"]');
        if (button) {
            // If video time is within the trigger threshold, click the button if not disabled
            if ((totalTime - currentTime) <= thresholdSeconds && !button.disabled) {
                button.click();
                console.log(`Button is pressed at ${ariaValueText}`)
                button.disabled = true; // Immediately disable the button to prevent multiple clicks
                videoElement.lastClickTime = currentTime; // Record the last click time
            }
    
            // Check if the currentTime has advanced at least 2 seconds from the last click time, then re-enable
            if (button.disabled && videoElement.lastClickTime && (currentTime - videoElement.lastClickTime >= 2)) {
                button.disabled = false;
                console.log(`Button is is enabled to be re-pressed at ${ariaValueText}`)
                videoElement.notificationShown = false; // Reset the notification shown flag
            }
        }
    }

    function addNotificationStyles() {
        const style = document.createElement('style');
        document.head.appendChild(style);
        style.sheet.insertRule(`
            @keyframes fadeInOut {
                0% { opacity: 0; visibility: hidden; }
                10%, 90% { opacity: 1; visibility: visible; }
                100% { opacity: 0; visibility: hidden; }
            }
        `, style.sheet.cssRules.length);
        style.sheet.insertRule(`
            .notification {
                position: fixed;
                top: 45%;
                right: 50%;
                transform: translate(50%, -50%);
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid #000;
                border-radius: 5px;
                padding: 10px;
                z-index: 10001;
                opacity: 0;
                visibility: hidden;
            }
        `, style.sheet.cssRules.length);
    }
    
    function showNotification(message, duration = 1000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerText = message;
        document.body.appendChild(notification);
    
        // Setting up animation duration dynamically based on the duration argument
        notification.style.animation = `fadeInOut ${duration + 1000}ms ease-in-out`;
    
        // Event listener to clean up after animation ends
        notification.addEventListener('animationend', () => {
            document.body.removeChild(notification);
        });
    }
    

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }

    // Add the styles and keyframes on load
    addNotificationStyles();
    // Setup interval and initial notification
    setInterval(monitorVideo, checkInterval);
    //showNotification("Script Loaded");
})();