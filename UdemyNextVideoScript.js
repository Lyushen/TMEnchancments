// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.014
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
    const notificationLeadTime = 2; // Notification appears 2 seconds before the action
    
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
        if (currentTime < startThreshold || (totalTime - currentTime) > (thresholdSeconds + notificationLeadTime)) return;
    
        // Trigger action if the conditions are met and the button hasn't been clicked yet
        const button = document.querySelector('[role="link"][data-purpose="go-to-next"]');
        if (button && !button.disabled) {
            button.disabled = true; // Use a disabled property to prevent multiple triggers
            showNotification(`Next Video in ${notificationLeadTime}s`, notificationLeadTime, ariaValueText);
    
            setTimeout(() => {
                button.click();
                button.disabled = false;
            }, notificationLeadTime);
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
    
    function showNotification(message, duration = 1000, add_message = '') {
        console.log(message + add_message);
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerText = message + add_message;
        document.body.appendChild(notification);
    
        // Setting up animation duration dynamically based on the duration argument
        notification.style.animation = `fadeInOut ${duration + 1000}ms ease-in-out`;
    
        // Event listener to clean up after animation ends
        notification.addEventListener('animationend', () => {
            document.body.removeChild(notification);
        });
    }
    
    // Add the styles on load or whenever appropriate
    addNotificationStyles();
    

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }

    // Setup interval and initial notification
    setInterval(monitorVideo, checkInterval);
    showNotification("Script Loaded");
})();