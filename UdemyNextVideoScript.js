// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.022
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
    const thresholdSeconds = 3; // Trigger 5 seconds before the video ends
    const startThreshold = 3; // Start monitoring after 3 seconds of playback
    const notificationLeadTime = 6; // Notification appears 2 seconds before the action, in milliseconds
    let activeNotification = null; // To handle dynamic updates

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
        if ((totalTime - currentTime) <= (thresholdSeconds + notificationLeadTime)) {
            console.log(`Notification is triggered at ${ariaValueText}`)
            //showNotification(`Next Video in ${notificationLeadTime}s`, notificationLeadTime);
            //showNotification(`Next video in ${remainingTime}`);
            // Check if second has changed
            if (lastSecond !== currentTime) {
                lastSecond = currentTime;
                const remainingTime = totalTime - currentTime;

                // Decide when to show the notification based on the remaining time
                if (remainingTime <= 3) {  // For last 3 seconds
                    showNotification(`Next video in ${remainingTime}`);
                }
            }
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
                z-index: 2147483646; // Ensure high visibility
                opacity: 0;
                visibility: hidden;
            }
        `, style.sheet.cssRules.length);
    }

    function showNotification(message, duration = 1000) {
        if (activeNotification) {
            // Update existing notification text and restart animation
            activeNotification.innerText = message;
            activeNotification.style.animation = 'none'; // Reset animation
            setTimeout(() => { // Timeout needed to restart CSS animation
                activeNotification.style.animation = `fadeInOut ${duration + 1000}ms ease-in-out`;
            }, 10);
        } else {
            // Create new notification if none exists
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerText = message;
            document.body.appendChild(notification);
            notification.style.animation = `fadeInOut ${duration + 1000}ms ease-in-out`;
    
            notification.addEventListener('animationend', () => {
                document.body.removeChild(notification);
                activeNotification = null; // Clear the reference to allow new notifications
            });
    
            activeNotification = notification; // Set the active notification reference
        }
    }

    function countdownPopUp(duration) {
        let countdown = duration;
        const interval = setInterval(() => {
            showNotification(`Next video in ${countdown}`, 1000);  // Shows notification each second
            countdown--;
            if (countdown < 0) {
                clearInterval(interval);
            }
        }, 1000);
    }

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }

    // Add the styles and keyframes on load
    addNotificationStyles();
    // Setup interval and initial notification
    setInterval(monitorVideo, checkInterval);
    showNotification("Script Loaded");
})();