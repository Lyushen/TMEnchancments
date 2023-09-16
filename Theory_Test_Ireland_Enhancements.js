// ==UserScript==
// @name         Theory Test Ireland Enhancements
// @icon         https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/TTI_logo-colour.png
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0052
// @description  Several enhancements for Theory Test Ireland site, such as autoplay audio questions and answers, roll-up top bar for more space and block useless elements
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/Theory_Test_Ireland_Enhancements.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/Theory_Test_Ireland_Enhancements.js
// @grant        none
// @match        https://theorytestireland.org/*
// ==/UserScript==


(function() {
    'use strict';
const blockTabletElement = () => {
    const tabletElement = document.querySelector('.tablet');
    if (tabletElement) {
        tabletElement.style.display = 'none';
    }
};
 
// Call the function to block the tablet element
blockTabletElement();
    //more space
    const primaryElement = document.getElementById('primary');
if (primaryElement) {
    primaryElement.style.paddingTop = '15px';
    primaryElement.style.paddingBottom = '0px';
}
    const questionHeader = document.querySelector('.pd-question-header');
    if (questionHeader) {
        questionHeader.remove();
    }
    const topicsbarElement = document.querySelector('.topicsbar');
if (topicsbarElement) {
    topicsbarElement.style.marginBottom = '10px';
}

const questionButtonsElement = document.querySelector('.question-buttons');
if (questionButtonsElement) {
    questionButtonsElement.style.marginBottom = '0px';
}

// Function to block the specified elements
const blockElements = () => {
    // Block element with the class 'rt-cta-1'
    const rtCtaElement = document.querySelector('.rt-cta-1');
    if (rtCtaElement) {
        rtCtaElement.style.display = 'none';
    }

    // Block footer area
    const footerElement = document.querySelector('footer');
    if (footerElement) {
        footerElement.style.display = 'none';
    }
};

// Call the function to block the specified elements
blockElements();

const enemyScript = document.querySelector('#content > script');
if (enemyScript) {
    enemyScript.remove();
}



    // Disable the scrollToTop functionality
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.classList.contains('scrollToTop') || e.target.parentElement.classList.contains('scrollToTop'))) {
            e.preventDefault();
        }
    }, true);

    window.addEventListener('scroll', function(e) {
        const scrollToTopElem = document.querySelector('.scrollToTop');
        if (scrollToTopElem && scrollToTopElem.style.display !== 'none') {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    const clickAudioButtonsSequentially = () => {
        const audioIcons = document.querySelectorAll('.question-audio > i');
        const audioElements = document.querySelectorAll('.test-audio');
        let currentIconIndex = 0;
    
        // Check play position and continue from there
        for (let i = 0; i < audioElements.length; i++) {
            if (!audioElements[i].paused) {
                currentIconIndex = i + 1;
                break;
            }
        }
    
        const clickNextIcon = () => {
            if (currentIconIndex < audioIcons.length) {
                audioIcons[currentIconIndex].click();
                audioElements[currentIconIndex].addEventListener('ended', function() {
                    if (currentIconIndex < audioIcons.length - 1) {
                        currentIconIndex++;
                        setTimeout(clickNextIcon, 500);
                    }
                });
            }
        };
    
        clickNextIcon();
    };
    
    // Start clicking the audio buttons sequentially
    clickAudioButtonsSequentially();
    
    const checkAnswerBtn = document.getElementById("pd-single-question-check");
    let checkAnswerPressed = false;
    
    if (checkAnswerBtn) {
        checkAnswerBtn.addEventListener('click', function() {
            checkAnswerPressed = true;
        });
    }
    
    // Adjust to play the 6th element after the 5th (4th answer) if Check answer button was pressed
    document.querySelectorAll('.test-audio')[4].addEventListener('ended', function() {
        if (checkAnswerPressed) {
            const sixthIcon = document.querySelectorAll('.question-audio > i')[5];
            if (sixthIcon) {
                sixthIcon.click();
            }
        }
    });
    

    // Hide header & mobile menu functionality
    const elementsToHide = [
        document.getElementById('masthead'),
        document.getElementById('meanmenu')
    ];

    elementsToHide.forEach(element => {
        if (element) {
            element.removeAttribute('style');
            element.style.transition = 'top 0.5s';
            element.style.position = 'fixed';
            element.style.width = '100%';
            element.style.top = '-100%';
            element.style.zIndex = '9999';
        }
    });

    window.addEventListener('scroll', () => {
        elementsToHide.forEach(element => {
            if (element) {
                element.style.top = '-100%';
            }
        });
    });

    window.addEventListener('mousemove', (e) => {
        if (e.clientY < 20) {
            elementsToHide.forEach(element => {
                if (element) {
                    element.style.top = '0';
                }
            });
        }
    });

    elementsToHide.forEach(element => {
        if (element) {
            element.addEventListener('mouseleave', () => {
                element.style.top = '-100%';
            });
        }
    });

    // Mobile touch events
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });

    window.addEventListener('touchmove', (e) => {
        let touchEndY = e.touches[0].clientY;
        if (touchEndY - touchStartY > 50) {  // Swipe down
            elementsToHide.forEach(element => {
                if (element) {
                    element.style.top = '0';
                }
            });
        } else if (touchStartY - touchEndY > 50) {  // Swipe up
            elementsToHide.forEach(element => {
                if (element) {
                    element.style.top = '-100%';
                }
            });
        }

})();
})();
