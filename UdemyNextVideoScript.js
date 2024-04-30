// ==UserScript==
// @name         UdemyNextVideoScript
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://udemy.com
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.036
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
    const startThreshold = 3; // Start monitoring after 3 seconds of playback
    const thresholdSeconds = 3; // Trigger 3 seconds before the video ends
    const notificationLeadTime = 6; // Notification appears 3 seconds before the action
    let activeNotification = null; // To handle dynamic updates
    let lastNotificationTime = -1; // Time at which the last notification was shown

    function monitorVideo() {
        const videoElement = document.querySelector('[role="slider"][data-purpose="video-progress-bar"]');
        if (!videoElement) {
            //console.log('No video element found.');
            return;
        }
    
        const ariaValueText = videoElement.getAttribute('aria-valuetext');
        if (!ariaValueText) {
            console.log('No ariaValueText available.');
            return;
        }
    
        const parts = ariaValueText.split(' of ');
        if (parts.length !== 2) {
            console.log('Unexpected ariaValueText format.');
            return;
        }

        const button = document.querySelector('[role="link"][data-purpose="go-to-next"]');
        if (!button) {
            console.log('No next button found.');
            return;
        }

        const currentTime = parseTime(parts[0].trim());
        const totalTime = parseTime(parts[1].trim());
        // Calculate remaining time
        const remainingTime = totalTime - currentTime;
        
        if (currentTime < startThreshold) return;  // Early return if video hasn't played long enough

        // Update notification countdown, 3,2,1
        let notificationTimer=remainingTime - (notificationLeadTime-thresholdSeconds);
        // Notification logic corrected for exact timing
        if (remainingTime <= notificationLeadTime && lastNotificationTime !== currentTime && notificationTimer > 0) {
            console.log(`Notification is triggered at ${ariaValueText}`);
            showNotification(`Next video in ${notificationTimer+1}`);
            lastNotificationTime = currentTime;
        }
    
        // Button click logic separate from notification
        if (remainingTime <= thresholdSeconds) {
            if (!button.disabled) {
                button.click();
                console.log(`Button is pressed at ${ariaValueText}`);
                button.disabled = true;
                videoElement.lastClickTime = currentTime;
            } else if (currentTime - videoElement.lastClickTime >= 2) {
                button.disabled = false;
                console.log(`Button is re-enabled at ${ariaValueText}`);
            }
        }    

        // Trigger the button click and manage the button state based on video progress
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
                top: 40%;
                right: 50%;
                transform: translate(50%, -50%);
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid #000;
                border-radius: 5px;
                padding: 10px;
                z-index: 100; // Ensure high visibility
                opacity: 0;
                visibility: hidden;
            }
        `, style.sheet.cssRules.length);
        
    }

    function showNotification(message, duration = 1000) {
        const videoPopoverArea = document.querySelector('[id$="mock-vjs-control-bar-popover-area"]');
        if (!videoPopoverArea) {
            // If the element isn't available yet, queue the notification
            notificationQueue.push({ message, duration });
            return;
        }
    
        let activeNotification = videoPopoverArea.querySelector('.notification');
        if (activeNotification) {
            activeNotification.innerText = message;
            activeNotification.style.animation = 'none';
            void activeNotification.offsetWidth;
            activeNotification.style.animation = `fadeInOut ${duration + 1000}ms ease-in-out`;
        } else {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerText = message;
            videoPopoverArea.appendChild(notification);
            notification.style.animation = `fadeInOut ${duration + 1000}ms ease-in-out`;
    
            notification.addEventListener('animationend', () => {
                videoPopoverArea.removeChild(notification);
            });
            activeNotification = notification;
        }
    }
    
    function processQueue() {
        const videoPopoverArea = document.querySelector('[id$="mock-vjs-control-bar-popover-area"]');
        if (videoPopoverArea && notificationQueue.length > 0) {
            notificationQueue.forEach(item => showNotification(item.message, item.duration));
            notificationQueue = []; // Clear the queue after processing
        }
    }
    
    // Setup MutationObserver to detect when the videoPopoverArea is added to the DOM
    const observer = new MutationObserver((mutations, obs) => {
        const videoPopoverArea = document.querySelector('[id$="mock-vjs-control-bar-popover-area"]');
        if (videoPopoverArea) {
            processQueue();
            observer.disconnect(); // Optionally disconnect observer after the element is found and queue processed
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    function parseTime(timeStr) {
        const timeParts = timeStr.split(':').map(Number);
        return timeParts[0] * 60 + timeParts[1];
    }

    // Add the styles and keyframes on load
    addNotificationStyles();
    // Setup interval and initial notification
    setInterval(monitorVideo, checkInterval);
    console.log(`Script Loaded`)
    showNotification("Script Loaded");
})();