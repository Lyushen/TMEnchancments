// ==UserScript==
// @name         M365 Cloud - Auto Dismiss Tips, Force Colors & Auto GPT
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://m365.cloud.microsoft
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0.11
// @description  Dismisses Tips, enforces black UI text, preserves syntax highlighting in code editors, and auto-switches to 'GPT-5.2 Think deeper' with high performance.
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/copilot.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/copilot.js
// @match        https://m365.cloud.microsoft/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // ==================================================================
  // DEBUG FLAG
  // Set to true to trace why GPT model selection fails on the first try
  // ==================================================================
  const DEBUG_GPT_SWITCHER = true;

  function logDebug(...args) {
    if (DEBUG_GPT_SWITCHER) {
      console.log('%c[GPT Debug]', 'color: #0078D4; font-weight: bold;', ...args);
    }
  }

  /******************************************************************
   * 1) FORCE CSS VARIABLES, FOREGROUND COLORS & MENU MASKING
   ******************************************************************/
  const STYLE_ID = 'tm-force-m365-styles';

  const css = `
    body {
      --colorNeutralForeground1: #000000 !important;
      --colorNeutralForeground2: #000000 !important;
      --colorNeutralForeground3: #000000 !important;
    }
    [data-testid="chatOutput"], [id^="copilot-message-"] {
      --colorNeutralForeground1: #000000 !important;
      --colorNeutralForeground2: #000000 !important;
      --colorNeutralForeground3: #000000 !important;
      color: #000000 !important;
    }
    [data-testid="chatOutput"] *, [id^="copilot-message-"] * {
      color: #000000 !important;
      caret-color: #000000 !important;
    }
    [data-testid="chatOutput"] a, [data-testid="chatOutput"] a:visited, [data-testid="chatOutput"] a:hover,
    [id^="copilot-message-"] a, [id^="copilot-message-"] a:visited, [id^="copilot-message-"] a:hover {
      color: #000000 !important;
    }
    [data-testid="chatOutput"] svg, [data-testid="chatOutput"] svg *,
    [id^="copilot-message-"] svg, [id^="copilot-message-"] svg * {
      fill: currentColor !important;
      stroke: currentColor !important;
      color: #000000 !important;
    }
    [data-testid="chatOutput"] input, [data-testid="chatOutput"] textarea, [data-testid="chatOutput"] [contenteditable="true"],
    [id^="copilot-message-"] input, [id^="copilot-message-"] textarea, [id^="copilot-message-"] [contenteditable="true"] {
      color: #000000 !important;
      caret-color: #000000 !important;
    }
    .scriptor-pageContainer, .scriptor-pageContainer *,
    [aria-label="Code editor"], [aria-label="Code editor"] * {
      color: revert !important;
      caret-color: revert !important;
      fill: revert !important;
      stroke: revert !important;
      --colorNeutralForeground1: revert !important;
      --colorNeutralForeground2: revert !important;
      --colorNeutralForeground3: revert !important;
    }

    /* =======================================================
       MENU MASKING: Hides dropdowns while script is switching
       ======================================================= */
    body.tm-mask-gpt-menus [role="menu"],
    body.tm-mask-gpt-menus [role="listbox"],
    body.tm-mask-gpt-menus .fui-MenuPopover,
    body.tm-mask-gpt-menus .fui-Listbox,
    body.tm-mask-gpt-menus .ms-Layer {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: none !important;
      animation: none !important;
    }
  `;

  function ensureStyleInjected() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  const styleObserver = new MutationObserver(() => ensureStyleInjected());
  function startStyleEnforcement() {
    ensureStyleInjected();
    styleObserver.observe(document.head, { childList: true });
  }

  /******************************************************************
   * 2) DOM INTERVENTIONS: Helpers
   ******************************************************************/
  function simulateRealClick(element) {
    if (!element) return;
    const opts = { bubbles: true, cancelable: true, view: window, buttons: 1 };
    if (window.PointerEvent) {
      element.dispatchEvent(new PointerEvent('pointerdown', opts));
      element.dispatchEvent(new PointerEvent('pointerup', opts));
    }
    element.dispatchEvent(new MouseEvent('mousedown', opts));
    element.dispatchEvent(new MouseEvent('mouseup', opts));
    element.dispatchEvent(new MouseEvent('click', opts));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function findElementByTextSync(selector, textContent) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (el.offsetParent !== null && (el.textContent || '').includes(textContent)) {
        return el;
      }
    }
    return null;
  }

  /******************************************************************
   * 3) DOM INTERVENTIONS: Dismiss Tips, Close Panel & Auto GPT
   ******************************************************************/

  const TIP_DIALOG_SELECTOR = 'div[role="dialog"][aria-label="Tips"]';
  const HANDLED_ATTR = 'data-tm-handled';

  function dismissAllTips() {
    const dialogs = document.querySelectorAll(TIP_DIALOG_SELECTOR);
    for (const dialog of dialogs) {
      if (dialog.getAttribute(HANDLED_ATTR) === '1') continue;
      let btn = dialog.querySelector('button[aria-label="Dismiss"]') ||
                dialog.querySelector('button[aria-label="Got it"]');
      if (!btn) {
        const buttons = dialog.querySelectorAll('button');
        for (const b of buttons) {
          const text = (b.textContent || '').trim().toLowerCase();
          if (text === 'dismiss' || text === 'got it') {
            btn = b; break;
          }
        }
      }
      if (btn) {
        dialog.setAttribute(HANDLED_ATTR, '1');
        btn.click();
      }
    }
  }

  let hasAttemptedSidePanelClose = false;
  function autoCloseSidePanelOnce() {
    if (hasAttemptedSidePanelClose) return;
    const collapseBtn = document.querySelector('button[data-testid="collapse-button"]');
    const expandBtn = document.querySelector('button[data-testid="expand-button"]');
    if (collapseBtn || expandBtn) {
      hasAttemptedSidePanelClose = true;
      if (collapseBtn) simulateRealClick(collapseBtn);
    }
  }

  let isSwitchingGpt = false;

  async function enforceGptMode() {
    if (isSwitchingGpt) return;

    // Initial check
    const initialSwitcher = document.getElementById('gptModeSwitcher');
    if (!initialSwitcher || (initialSwitcher.textContent || '').trim() !== 'Auto') {
      return;
    }

    logDebug('Detected "Auto" state. Initiating State-Machine switch sequence...');
    isSwitchingGpt = true;

    // VISUAL MASK: Hide menus immediately so the user doesn't see the flickering
    document.body.classList.add('tm-mask-gpt-menus');

    // --- CURSOR RESTORATION: Capture phase ---
    const activeEl = document.activeElement;
    const activeElId = activeEl && activeEl.id ? activeEl.id : null;
    let selStart = null;
    let selEnd = null;

    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      try {
        selStart = activeEl.selectionStart;
        selEnd = activeEl.selectionEnd;
      } catch (e) {}
    }

    const restoreCursor = () => {
      let elToFocus = null;
      if (activeEl && document.body.contains(activeEl)) {
        elToFocus = activeEl;
      } else if (activeElId) {
        elToFocus = document.getElementById(activeElId);
      } else {
        elToFocus = document.querySelector('#userInput, textarea[data-testid], [contenteditable="true"][role="textbox"], textarea');
      }

      if (elToFocus) {
        elToFocus.focus();
        if (selStart !== null && selEnd !== null && typeof elToFocus.setSelectionRange === 'function') {
          try { elToFocus.setSelectionRange(selStart, selEnd); } catch (e) {}
        }
      }
    };
    // ----------------------------------------

    try {
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        attempts++;

        const switcher = document.getElementById('gptModeSwitcher');
        if (!switcher || (switcher.textContent || '').trim() !== 'Auto') {
          logDebug('✅ Switcher is no longer "Auto". Success!');
          break;
        }

        const targetOption = findElementByTextSync('[role="option"], [role="menuitem"]', 'GPT-5.2 Think');
        if (targetOption) {
          logDebug(`Tick ${attempts}: Found "GPT-5.2 Think". Clicking target!`);
          simulateRealClick(targetOption);
          await sleep(5);
          continue;
        }

        const moreBtn = findElementByTextSync('[data-test-id="gptSubMenuModelTrigger"], [role="menuitem"]', 'More');
        if (moreBtn) {
          const isMoreExpanded = moreBtn.getAttribute('aria-expanded') === 'true';
          if (!isMoreExpanded) {
            logDebug(`Tick ${attempts}: Found "More" button (Closed). Clicking it.`);
            simulateRealClick(moreBtn);
            await sleep(5);
            continue;
          } else {
            logDebug(`Tick ${attempts}: "More" is expanded, waiting for target to render...`);
            await sleep(5);
            continue;
          }
        }

        const isSwitcherExpanded = switcher.getAttribute('aria-expanded') === 'true';
        if (!isSwitcherExpanded) {
           logDebug(`Tick ${attempts}: Main menu is closed. Clicking switcher to open.`);
           simulateRealClick(switcher);
           await sleep(5);
           continue;
        }

        logDebug(`Tick ${attempts}: Menu is open, waiting for options to render...`);
        await sleep(5);
      }

      if (attempts >= maxAttempts) {
        logDebug('❌ Reached max attempts. Bailing out. Cleaning up UI...');
        const switcher = document.getElementById('gptModeSwitcher');
        if (switcher && switcher.getAttribute('aria-expanded') === 'true') {
          simulateRealClick(document.body); // Close menu
        }
      }

    } catch (err) {
      console.error("%c[GPT Debug] Switch Error:", 'color: red', err);
    } finally {
      logDebug('Sequence finished. Executing cursor restoration...');
      restoreCursor();

      // Wait a moment for React to unmount the closing menus before unmasking,
      // preventing a flash of the "fade-out" animation.
      setTimeout(() => {
        document.body.classList.remove('tm-mask-gpt-menus');
        isSwitchingGpt = false;
      }, 500);
    }
  }

  /******************************************************************
   * 4) OBSERVERS & SPA NAVIGATION (PERFORMANCE OPTIMIZED)
   ******************************************************************/
  let isThrottled = false;

  const appObserver = new MutationObserver(() => {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
      autoCloseSidePanelOnce();
      dismissAllTips();
      if (!isSwitchingGpt) enforceGptMode();
    }, 500);
  });

  function startDomObservers() {
    autoCloseSidePanelOnce();
    dismissAllTips();
    enforceGptMode();
    appObserver.observe(document.body, { childList: true, subtree: true });
  }

  function hookHistory() {
    const push = history.pushState;
    const replace = history.replaceState;
    const onNav = () => setTimeout(() => {
      ensureStyleInjected();
      dismissAllTips();
      enforceGptMode();
    }, 200);

    history.pushState = function (...args) {
      const ret = push.apply(this, args);
      onNav();
      return ret;
    };
    history.replaceState = function (...args) {
      const ret = replace.apply(this, args);
      onNav();
      return ret;
    };
    window.addEventListener('popstate', onNav, { passive: true });
  }

  /******************************************************************
   * INITIALIZE
   ******************************************************************/
  startStyleEnforcement();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startDomObservers();
      hookHistory();
    }, { once: true });
  } else {
    startDomObservers();
    hookHistory();
  }
})();