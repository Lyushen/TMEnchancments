// ==UserScript==
// @name         M365 Cloud - Auto Dismiss Tips, Force Colors & Auto GPT
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://m365.cloud.microsoft
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.1.9
// @description  Dismisses Tips, enforces black UI text, preserves syntax highlighting in code editors, and auto-switches to the configured latest GPT model.
// @homepageURL  https://github.com/Lyushen/TMEnchancments
// @supportURL   https://github.com/Lyushen/TMEnchancments/issues
// @updateURL    https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/copilot.js
// @downloadURL  https://raw.githubusercontent.com/Lyushen/TMEnchancments/main/copilot.js
// @match        https://m365.cloud.microsoft/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';
  const DEFAULT_PATTERN = "GPT-* Think";

  // Load settings from Tampermonkey storage (or use defaults)
  let targetModelPattern = typeof GM_getValue === 'function'
      ? GM_getValue("targetModelPattern", DEFAULT_PATTERN)
      : DEFAULT_PATTERN;

  // Auto-migrate legacy exact matches (e.g., GPT-4, GPT-4*) to the new dynamic wildcard
  if (/^GPT[\s\-]*4/i.test(targetModelPattern)) {
      targetModelPattern = DEFAULT_PATTERN;
      if (typeof GM_setValue === 'function') {
          GM_setValue("targetModelPattern", targetModelPattern);
      }
  }

  let DEBUG_GPT_SWITCHER = typeof GM_getValue === 'function'
      ? GM_getValue("debugGptSwitcher", true)
      : true;

  // Track state to prevent lockups but allow for fixing React reversions
  let isSwitchingGpt = false;
  let hasExecutedGptSwitch = false;
  let lastGptSwitchSuccess = false;
  let gptReversionCount = 0;
  const MAX_GPT_REVERSIONS = 3; // Allow up to 3 "re-switches" if React forces it back to Auto

  function resetGptSession() {
    hasExecutedGptSwitch = false;
    lastGptSwitchSuccess = false;
    gptReversionCount = 0;
    isSwitchingGpt = false;
  }

  // Register menu items in Tampermonkey
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(`⚙️Set Target Pattern [${targetModelPattern}]`, () => {
      const newPattern = prompt(
        "Enter the target GPT model (use * for the latest version).\nExample: GPT-* Think deeper",
        targetModelPattern
      );
      if (newPattern !== null && newPattern.trim() !== "") {
        targetModelPattern = newPattern.trim();
        if (typeof GM_setValue === 'function') {
          GM_setValue("targetModelPattern", targetModelPattern);
        }
      }
    });

    GM_registerMenuCommand(`🐞Toggle Debug Mode [${DEBUG_GPT_SWITCHER ? "ON" : "OFF"}]`, () => {
      DEBUG_GPT_SWITCHER = !DEBUG_GPT_SWITCHER;
      if (typeof GM_setValue === 'function') {
        GM_setValue("debugGptSwitcher", DEBUG_GPT_SWITCHER);
      }
    });
  }

  function logDebug(...args) {
    if (DEBUG_GPT_SWITCHER) {
      console.log('%c[GPT Debug]', 'color: #0078D4; font-weight: bold;', ...args);
    }
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

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
       CHAT INPUT TEXT COLOR OVERRIDES
       ======================================================= */
    #m365-chat-editor-target-element,
    #m365-chat-editor-target-element * {
      color: #000000 !important;
      caret-color: #000000 !important;
      --colorNeutralForeground1: #000000 !important;
      --colorNeutralForeground2: #000000 !important;
      --colorNeutralForeground3: #000000 !important;
      --colorNeutralForeground4: #000000 !important;
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

    /* =======================================================
       UBLOCK REPLACEMENT: Immediate 0-Occupancy & Blocking
       ======================================================= */
    .undefined.reserved-space-container,
    :not(body, html):has(> * > button[aria-label="See more prompts"]),
    .fai-PromptStarterList,
    .fai-GroundingMenu,
    button[data-testid="feedback-button-testid"],
    [data-testid="protected-badge-tooltip-trigger"],
    #moreButton, button[data-automation-id="moreButton"],
    div[data-testid="accessibility-wrapped-card"],
    div[role="dialog"][aria-modal="true"][class*="TeachingPopoverSurface"],

    /* Precision block for structural NavDrawer elements */
    footer.fui-NavDrawerFooter.fai-CopilotNavDrawerFooter > div > div:first-child,
    footer.fui-NavDrawerFooter.fai-CopilotNavDrawerFooter > div > div:nth-child(3) {
      opacity: 0 !important;
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
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
    const target = document.head || document.documentElement;
    if (target) {
      styleObserver.observe(target, { childList: true });
    }
  }

  function simulateRealClick(element) {
    if (!element) return;
    const opts = { bubbles: true, cancelable: true, buttons: 1 };

    if (typeof PointerEvent !== 'undefined') {
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

  function getMenuText(el) {
    const primary = el.querySelector('[class*="primaryContentWrapper"]');
    if (primary) return (primary.textContent || '').trim();

    const h4 = el.querySelector('h4');
    if (h4) return (h4.textContent || '').trim();
    return (el.textContent || '').trim();
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findSubmenuTriggers() {
    const candidates = document.querySelectorAll('[role="menuitem"][aria-haspopup], [role="option"][aria-haspopup], [role="menuitemradio"][aria-haspopup]');
    const triggers = [];
    for (const el of candidates) {
      if (el.id === 'gptModeSwitcher') continue;
      if (el.closest('.fui-MenuPopover') || el.closest('[role="menu"]')) {
        if (isVisible(el)) triggers.push(el);
      }
    }
    return triggers;
  }

  function findBestModelOption(pattern) {
    const candidates = document.querySelectorAll('[role="menuitem"], [role="option"], [role="menuitemradio"]');
    const elements = [];

    for (const el of candidates) {
      if (el.id === 'gptModeSwitcher') continue;
      if (el.closest('.fui-MenuPopover') || el.closest('[role="menu"]')) {
         elements.push(el);
      }
    }

    let bestEl = null;
    let maxVersion = -1;

    let fallbackEl = null;
    let fallbackMaxScore = -1;

    const isWildcard = pattern.includes('*');
    let regex = null;

    if (isWildcard) {
      const parts = pattern.split('*');
      let regexStr = parts.map(escapeRegExp).join('(.*?)');
      regexStr = regexStr.replace(/\\-/g, '[\\s\\-]*');
      regexStr = regexStr.replace(/ /g, '\\s+');
      regex = new RegExp(regexStr, 'i');
    } else {
      let flexStr = escapeRegExp(pattern).replace(/\\-/g, '[\\s\\-]*').replace(/ /g, '\\s+');
      regex = new RegExp(flexStr, 'i');
    }

    if (DEBUG_GPT_SWITCHER) {
      const visibleOpts = elements.filter(isVisible);
      const textArr = visibleOpts.map(e => {
         let popup = e.getAttribute('aria-haspopup');
         let isTrigger = popup === 'menu' || popup === 'true';
         return `"${getMenuText(e)}"${isTrigger ? ' (trigger folder)' : ''}`;
      });
      if (textArr.length > 0) {
        logDebug(`🔍 Evaluated visible options: [ ${textArr.join(', ')} ]`);
        logDebug(`🎯 Looking for pattern: "${pattern}" (Regex: ${regex})`);
      }
    }

    for (const el of elements) {
      if (!isVisible(el)) continue;

      const popup = el.getAttribute('aria-haspopup');
      if (popup === 'menu' || popup === 'true') continue;

      let text = getMenuText(el);
      text = text.replace(/\s+/g, ' ').trim();
      if (text === 'Auto' || text === 'More') continue;

      if (text.toLowerCase().includes('gpt')) {
         const numMatch = text.match(/[0-9.]+/);
         const versionNum = numMatch ? parseFloat(numMatch[0]) : 0;
         const isThink = text.toLowerCase().includes('think') || text.toLowerCase().includes('reason');
         const score = versionNum + (isThink ? 0.01 : 0);

         if (score > fallbackMaxScore) {
             fallbackMaxScore = score;
             fallbackEl = el;
         }
      }

      const match = text.match(regex);
      if (match) {
        if (isWildcard) {
          const wildcardContent = match[1] || '0';
          const numMatch = wildcardContent.match(/[0-9.]+/);
          const versionNum = numMatch ? parseFloat(numMatch[0]) : 0;

          const isThink = text.toLowerCase().includes('think') || text.toLowerCase().includes('reason');
          const score = versionNum + (isThink ? 0.01 : 0);

          if (score > maxVersion) {
            maxVersion = score;
            bestEl = el;
          }
        } else {
          return el;
        }
      }
    }

    if (bestEl) {
       if (DEBUG_GPT_SWITCHER) logDebug(`✅ Perfect match found: "${getMenuText(bestEl)}"`);
       return bestEl;
    }

    if (fallbackEl) {
       if (DEBUG_GPT_SWITCHER) logDebug(`⚠️ Exact pattern not found. Smart Fallback selected: "${getMenuText(fallbackEl)}"`);
       return fallbackEl;
    }

    return null;
  }

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

  // =========================================================================
  //   INSTANT EVENT-DRIVEN SIDE PANEL MANAGER
  // =========================================================================

  let sidePanelActive = false;
  let sidePanelSessionEnded = false;
  let sidePanelCloseCount = 0;
  const MAX_SIDE_PANEL_CLOSES = 2;
  let sidePanelFailSafeTimer = null;

  function resetSidePanelSession() {
    sidePanelActive = false;
    sidePanelSessionEnded = false;
    sidePanelCloseCount = 0;
    if (sidePanelFailSafeTimer) clearTimeout(sidePanelFailSafeTimer);

    sidePanelFailSafeTimer = setTimeout(() => {
      if (!sidePanelActive && !sidePanelSessionEnded) {
        logDebug('⏳ [SidePanel] GPT Model fallback timer triggered. Activating panel check.');
        triggerSidePanelSequence();
      }
    }, 4000);
  }

  function triggerSidePanelSequence() {
    if (sidePanelActive || sidePanelSessionEnded) return;
    sidePanelActive = true;

    logDebug('🚀 [SidePanel] Model selection complete. Activating instant event-driven close sequence...');
    checkAndCloseSidePanel();

    if (sidePanelFailSafeTimer) clearTimeout(sidePanelFailSafeTimer);
    sidePanelFailSafeTimer = setTimeout(() => {
      logDebug('🏁 [SidePanel] 8-second window expired. Returning manual control to user.');
      sidePanelSessionEnded = true;
    }, 8000);
  }

  function checkAndCloseSidePanel() {
    if (!sidePanelActive || sidePanelSessionEnded) return;

    const headerAnchor = document.querySelector('header.fui-NavDrawerHeader.fai-CopilotNavDrawerHeader');
    if (!headerAnchor) return;

    const collapseBtn = headerAnchor.querySelector('button[data-testid="collapse-button"]');

    if (collapseBtn && isVisible(collapseBtn) && collapseBtn.getAttribute('aria-expanded') !== 'false') {
      logDebug(`⚡ [SidePanel Event] Open panel detected! Closing instantly... (Action ${sidePanelCloseCount + 1}/${MAX_SIDE_PANEL_CLOSES})`);

      simulateRealClick(collapseBtn);
      try { collapseBtn.click(); } catch (e) {}

      sidePanelCloseCount++;

      if (sidePanelCloseCount >= MAX_SIDE_PANEL_CLOSES) {
        logDebug('✅ [SidePanel] Max automatic closes reached. Ending automation session.');
        sidePanelSessionEnded = true;
      }
    }
  }

  const sidePanelObserver = new MutationObserver((mutations) => {
    if (!sidePanelActive || sidePanelSessionEnded) return;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'aria-expanded')) {
        checkAndCloseSidePanel();
        break;
      }
    }
  });

  sidePanelObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-expanded', 'class']
  });

  // =========================================================================

  async function enforceGptMode() {
    if (isSwitchingGpt) return;

    const initialSwitcher = document.getElementById('gptModeSwitcher');
    if (!initialSwitcher) return;

    // Check if it's currently on "Auto"
    if (!(initialSwitcher.textContent || '').trim().includes('Auto')) {
      // Model is correct! Unlock event-driven Side Panel sequence
      triggerSidePanelSequence();
      return;
    }

    // IF WE REACH HERE: The model currently says "Auto"

    // If we've previously executed a switch successfully, it means React just forced it back to Auto.
    // We will counter this by resetting the executed flag and retrying up to a certain limit.
    if (hasExecutedGptSwitch) {
      if (lastGptSwitchSuccess && gptReversionCount < MAX_GPT_REVERSIONS) {
        logDebug(`🔄 React forced GPT back to Auto! Retrying switch... (${gptReversionCount + 1}/${MAX_GPT_REVERSIONS})`);
        gptReversionCount++;
        hasExecutedGptSwitch = false;
      } else {
        return; // Max retries reached, or the original switch attempt couldn't find the requested model. Give up cleanly.
      }
    }

    logDebug('Detected "Auto" state. Initiating State-Machine switch sequence...');
    isSwitchingGpt = true;
    document.body.classList.add('tm-mask-gpt-menus');

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
        elToFocus = document.querySelector('#userInput, #m365-chat-editor-target-element, textarea[data-testid], [contenteditable="true"][role="textbox"], textarea');
      }

      if (elToFocus) {
        elToFocus.focus();
        if (selStart !== null && selEnd !== null && typeof elToFocus.setSelectionRange === 'function') {
          try { elToFocus.setSelectionRange(selStart, selEnd); } catch (e) {}
        }
      }
    };

    let wasSuccessful = false;

    try {
      let attempts = 0;
      const maxAttempts = 30;
      const loopSleepMs = 150;
      let stableTicks = 0;

      while (attempts < maxAttempts) {
        attempts++;

        const switcher = document.getElementById('gptModeSwitcher');
        if (!switcher) break;

        if (!(switcher.textContent || '').trim().includes('Auto')) {
          logDebug('✅ Switcher text updated away from "Auto". Success!');
          hasExecutedGptSwitch = true;
          wasSuccessful = true;
          break;
        }

        // 1. Is the main switcher open?
        const isSwitcherExpanded = switcher.getAttribute('aria-expanded') === 'true';
        if (!isSwitcherExpanded) {
           logDebug(`Tick ${attempts}: Main menu is closed. Clicking switcher to open.`);
           simulateRealClick(switcher);
           stableTicks = 0;
           await sleep(loopSleepMs);
           continue;
        }

        // 2. Can we find the target option?
        const targetOption = findBestModelOption(targetModelPattern);
        if (targetOption) {
          logDebug(`Tick ${attempts}: Found target! Initiating click on "${getMenuText(targetOption)}".`);
          simulateRealClick(targetOption);
          hasExecutedGptSwitch = true;
          wasSuccessful = true;
          break; // Break loop immediately
        }

        // 3. Are there collapsed folders/submenus? Find and Expand them
        const triggers = findSubmenuTriggers();
        let unexpandedTrigger = null;
        for (const t of triggers) {
          if (t.getAttribute('aria-expanded') !== 'true') {
            unexpandedTrigger = t;
            break;
          }
        }

        if (unexpandedTrigger) {
          logDebug(`Tick ${attempts}: Found collapsed submenu trigger. Clicking to expand.`);
          simulateRealClick(unexpandedTrigger);
          stableTicks = 0;
          await sleep(loopSleepMs);
          continue;
        }

        // 4. Wait natively if DOM is fully expanded but catching up on render
        logDebug(`Tick ${attempts}: Menu & submenus are open but options not found yet, waiting... (Stable ticks: ${stableTicks})`);
        stableTicks++;
        if (stableTicks > 10) {
           logDebug('❌ Target model not found after completely exhausting submenus. Gracefully aborting to prevent UI lock.');
           hasExecutedGptSwitch = true;
           break;
        }

        await sleep(loopSleepMs);
      }

      if (attempts >= maxAttempts) {
        logDebug('❌ Reached max DOM query attempts. Bailing out.');
        hasExecutedGptSwitch = true;
      }

      // Record success state for future reversion protection checks
      lastGptSwitchSuccess = wasSuccessful;

      // Cleanup: Close the drop down menu behind us ONLY if we failed to click an item
      if (!wasSuccessful) {
        const finalSwitcher = document.getElementById('gptModeSwitcher');
        if (finalSwitcher && finalSwitcher.getAttribute('aria-expanded') === 'true') {
          simulateRealClick(finalSwitcher);
        }
      }

    } catch (err) {
      console.error("%c[GPT Debug] Switch Error:", 'color: red', err);
    } finally {
      logDebug('Sequence finished. Executing cursor restoration...');
      restoreCursor();

      setTimeout(() => {
        document.body.classList.remove('tm-mask-gpt-menus');
        isSwitchingGpt = false;

        // Unlock event-driven Side Panel sequence now that we are done switching!
        triggerSidePanelSequence();
      }, 500);
    }
  }

  // Throttled main app observer (for Tips & triggering Model switcher)
  let isThrottled = false;
  const appObserver = new MutationObserver(() => {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
      dismissAllTips();
      enforceGptMode(); // We always call this on DOM changes, internal checks prevent lockups
    }, 500);
  });

  function startDomObservers() {
    resetGptSession();
    resetSidePanelSession();
    dismissAllTips();
    enforceGptMode();
    appObserver.observe(document.body, { childList: true, subtree: true });
  }

  function hookHistory() {
    const push = history.pushState;
    const replace = history.replaceState;
    const onNav = () => setTimeout(() => {
      resetGptSession();
      resetSidePanelSession();
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