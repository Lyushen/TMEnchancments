// ==UserScript==
// @name         M365 Cloud - Auto Dismiss Tips, Force Colors & Auto GPT
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://m365.cloud.microsoft
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.0.10
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

  /******************************************************************
   * 1) FORCE CSS VARIABLES & FOREGROUND COLORS (TARGETED)
   ******************************************************************/
  const STYLE_ID = 'tm-force-m365-styles';

  const css = `
    /* Root variables */
    body {
      --colorNeutralForeground1: #000000 !important;
      --colorNeutralForeground2: #000000 !important;
      --colorNeutralForeground3: #000000 !important;
    }

    /* Apply black globally inside chat outputs & copilot messages */
    [data-testid="chatOutput"],
    [id^="copilot-message-"] {
      --colorNeutralForeground1: #000000 !important;
      --colorNeutralForeground2: #000000 !important;
      --colorNeutralForeground3: #000000 !important;
      color: #000000 !important;
    }

    [data-testid="chatOutput"] *,
    [id^="copilot-message-"] * {
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

    /* -------------------------------------------------------------
     * EXCLUSION: PRESERVE CODE EDITOR SYNTAX HIGHLIGHTING
     * 'revert' tells the browser to undo our overrides inside the editor
     * ------------------------------------------------------------- */
    .scriptor-pageContainer,
    .scriptor-pageContainer *,
    [aria-label="Code editor"],
    [aria-label="Code editor"] * {
      color: revert !important;
      caret-color: revert !important;
      fill: revert !important;
      stroke: revert !important;
      --colorNeutralForeground1: revert !important;
      --colorNeutralForeground2: revert !important;
      --colorNeutralForeground3: revert !important;
    }
  `;

  function ensureStyleInjected() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // PERF OPTIMIZATION: Only observe the <head> for our style tag, not the whole document.
  const styleObserver = new MutationObserver(() => ensureStyleInjected());
  function startStyleEnforcement() {
    ensureStyleInjected();
    styleObserver.observe(document.head, { childList: true });
  }

  /******************************************************************
   * 2) DOM INTERVENTIONS: Simulate Clicks & Helpers
   ******************************************************************/
  function simulateRealClick(element) {
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

  async function waitForElement(selector, textContent, timeoutMs = 2000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (!textContent || (el.textContent || '').includes(textContent)) {
          return el;
        }
      }
      await sleep(50);
    }
    return null;
  }

  /******************************************************************
   * 3) DOM INTERVENTIONS: Dismiss Tips, Close Panel & Auto GPT
   ******************************************************************/

  // A) Auto-Dismiss Tips
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
            btn = b;
            break;
          }
        }
      }

      if (btn) {
        dialog.setAttribute(HANDLED_ATTR, '1');
        btn.click();
      }
    }
  }

  // B) Auto-Close Sidebar Panel (Runs Once)
  let hasAttemptedSidePanelClose = false;

  function autoCloseSidePanelOnce() {
    if (hasAttemptedSidePanelClose) return;

    const collapseBtn = document.querySelector('button[data-testid="collapse-button"]');
    const expandBtn = document.querySelector('button[data-testid="expand-button"]');

    // If either button exists, the UI has painted enough to make a decision
    if (collapseBtn || expandBtn) {
      hasAttemptedSidePanelClose = true; // Lock execution for the rest of the session
      if (collapseBtn) {
        simulateRealClick(collapseBtn); // Close it if it's open
      }
    }
  }

  // C) GPT Auto-Select
  let isSwitchingGpt = false;

  async function enforceGptMode() {
    if (isSwitchingGpt) return;

    const switcher = document.getElementById('gptModeSwitcher');
    if (!switcher) return;

    if ((switcher.textContent || '').trim() === 'Auto') {
      isSwitchingGpt = true;

      try {
        if (switcher.getAttribute('aria-expanded') !== 'true') {
          simulateRealClick(switcher);
        }

        let targetOption = await waitForElement('[role="option"], [role="menuitem"]', 'GPT-5.2 Think', 500);

        if (!targetOption) {
          const moreBtn = await waitForElement('[data-test-id="gptSubMenuModelTrigger"], [role="menuitem"]', 'More', 1000);

          if (moreBtn) {
            if (moreBtn.getAttribute('aria-expanded') !== 'true') {
              simulateRealClick(moreBtn);
            }
            targetOption = await waitForElement('[role="option"], [role="menuitem"]', 'GPT-5.2 Think', 1500);
          }
        }

        if (targetOption) {
          simulateRealClick(targetOption);
        } else {
          if (switcher.getAttribute('aria-expanded') === 'true') {
            simulateRealClick(document.body);
          }
        }
      } catch (err) {
        console.error("GPT Auto-Switch Error:", err);
      } finally {
        setTimeout(() => { isSwitchingGpt = false; }, 2000);
      }
    }
  }

  /******************************************************************
   * 4) OBSERVERS & SPA NAVIGATION (PERFORMANCE OPTIMIZED)
   ******************************************************************/
  let isThrottled = false;

  // PERF OPTIMIZATION: Throttling limits operations to twice per second max.
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