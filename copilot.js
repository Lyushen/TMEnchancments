// ==UserScript==
// @name         M365 Cloud - Auto Dismiss Tips, Force Colors & Auto GPT
// @icon         https://www.google.com/s2/favicons?sz=128&domain=https://m365.cloud.microsoft
// @namespace    https://github.com/Lyushen
// @author       Lyushen
// @license      GNU
// @version      1.1.12
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

  if (/^GPT[\s\-]*4/i.test(targetModelPattern)) {
      targetModelPattern = DEFAULT_PATTERN;
      if (typeof GM_setValue === 'function') {
          GM_setValue("targetModelPattern", targetModelPattern);
      }
  }

  let DEBUG_GPT_SWITCHER = typeof GM_getValue === 'function'
      ? GM_getValue("debugGptSwitcher", true)
      : true;

  // State Tracking
  let isSwitchingGpt = false;
  let hasExecutedGptSwitch = false;
  let lastGptSwitchSuccess = false;
  let gptReversionCount = 0;
  const MAX_GPT_REVERSIONS = 3;

  function resetGptSession() {
    hasExecutedGptSwitch = false;
    lastGptSwitchSuccess = false;
    gptReversionCount = 0;
    isSwitchingGpt = false;
  }

  // Register TM menu commands
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(`⚙️Set Target Pattern [${targetModelPattern}]`, () => {
      const newPattern = prompt(
        "Enter the target GPT model (use * for the latest version).\nExample: GPT-* Think deeper",
        targetModelPattern
      );
      if (newPattern !== null && newPattern.trim() !== "") {
        targetModelPattern = newPattern.trim();
        if (typeof GM_setValue === 'function') GM_setValue("targetModelPattern", targetModelPattern);
        alert(`Target model successfully set to: ${targetModelPattern}`);
      }
    });

    GM_registerMenuCommand(`🐞Toggle Debug Mode [${DEBUG_GPT_SWITCHER ? "ON" : "OFF"}]`, () => {
      DEBUG_GPT_SWITCHER = !DEBUG_GPT_SWITCHER;
      if (typeof GM_setValue === 'function') GM_setValue("debugGptSwitcher", DEBUG_GPT_SWITCHER);
      alert(`GPT Debug Mode is now: ${DEBUG_GPT_SWITCHER ? "ON" : "OFF"}`);
    });
  }

  function logDebug(...args) {
    if (DEBUG_GPT_SWITCHER) console.log('%c[GPT Debug]', 'color: #0078D4; font-weight: bold;', ...args);
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =========================================================================
  //   REACT INTERACTION & FOCUS PROTECTION MANAGER
  // =========================================================================

  let isFocusFrozen = false;
  const originalFocus = HTMLElement.prototype.focus;

  // Intercept focus programmatically to protect the user's typing experience
  HTMLElement.prototype.focus = function(options) {
    if (isFocusFrozen) {
      // React components often forcefully steal focus when menus open/close. We drop those requests.
      return;
    }
    return originalFocus.call(this, options);
  };

  function getReactProps(el) {
    if (!el) return null;
    const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
    if (propsKey) return el[propsKey];

    // Fallback for direct Fiber traversal (React 16+)
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (fiberKey && el[fiberKey]) {
       return el[fiberKey].memoizedProps || el[fiberKey].pendingProps;
    }
    return null;
  }

  // Invokes action directly on the React component bypassing standard DOM events (prevents focus loss)
  function invokeReactAction(el) {
    if (!el) return false;
    const props = getReactProps(el);
    let handled = false;

    // Synthetic event matching React's internal expected shape
    const syntheticEvent = {
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; },
      stopPropagation: function() {},
      target: el,
      currentTarget: el,
      type: 'click',
      nativeEvent: new MouseEvent('click')
    };

    if (props) {
      if (typeof props.onClick === 'function') {
        props.onClick(syntheticEvent);
        handled = true;
      } else if (typeof props.onSelect === 'function') {
        props.onSelect(syntheticEvent);
        handled = true;
      } else if (typeof props.onMouseDown === 'function') {
        props.onMouseDown(syntheticEvent);
        handled = true;
      }
    }

    // Absolute fallback (rarely hits unless Fluent UI structure drastically changes)
    if (!handled) el.click();
    return true;
  }

  // =========================================================================

  const STYLE_ID = 'tm-force-m365-styles';
  const css = `
    body { --colorNeutralForeground1: #000000 !important; }
    [data-testid="chatOutput"] *, [id^="copilot-message-"] * {
      color: #000000 !important;
      caret-color: #000000 !important;
    }
    [data-testid="chatOutput"] svg, [id^="copilot-message-"] svg {
      fill: currentColor !important;
      color: #000000 !important;
    }
    #m365-chat-editor-target-element * {
      color: #000000 !important;
      caret-color: #000000 !important;
    }

    /* Menu Masking ensures the user never visually sees the dropdown flash */
    body.tm-mask-gpt-menus [role="menu"],
    body.tm-mask-gpt-menus [role="listbox"],
    body.tm-mask-gpt-menus .fui-MenuPopover,
    body.tm-mask-gpt-menus .ms-Layer {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: none !important;
      animation: none !important;
    }

    /* UBlock Replacements */
    .undefined.reserved-space-container,
    :not(body, html):has(> * > button[aria-label="See more prompts"]),
    .fai-PromptStarterList,
    .fai-GroundingMenu,
    button[data-testid="feedback-button-testid"],
    #moreButton, button[data-automation-id="moreButton"] {
      display: none !important;
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
    if (document.head || document.documentElement) styleObserver.observe(document.head || document.documentElement, { childList: true });
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
    const candidates = document.querySelectorAll('[role="menuitem"][aria-haspopup], [role="option"][aria-haspopup]');
    const triggers = [];
    for (const el of candidates) {
      if (el.id === 'gptModeSwitcher') continue;
      if ((el.closest('.fui-MenuPopover') || el.closest('[role="menu"]')) && isVisible(el)) triggers.push(el);
    }
    return triggers;
  }

  function findBestModelOption(pattern) {
    const candidates = document.querySelectorAll('[role="menuitem"], [role="option"], [role="menuitemradio"]');
    const elements = [];

    for (const el of candidates) {
      if (el.id === 'gptModeSwitcher') continue;
      if (el.closest('.fui-MenuPopover') || el.closest('[role="menu"]')) elements.push(el);
    }

    let bestEl = null;
    let maxVersion = -1;
    let fallbackEl = null;
    let fallbackMaxScore = -1;

    const isWildcard = pattern.includes('*');
    let regexStr = isWildcard
      ? pattern.split('*').map(escapeRegExp).join('(.*?)').replace(/\\-/g, '[\\s\\-]*').replace(/ /g, '\\s+')
      : escapeRegExp(pattern).replace(/\\-/g, '[\\s\\-]*').replace(/ /g, '\\s+');

    const regex = new RegExp(regexStr, 'i');

    for (const el of elements) {
      if (!isVisible(el)) continue;
      if (el.getAttribute('aria-haspopup') === 'menu' || el.getAttribute('aria-haspopup') === 'true') continue;

      let text = getMenuText(el).replace(/\s+/g, ' ').trim();
      if (text === 'Auto' || text === 'More') continue;

      if (text.toLowerCase().includes('gpt')) {
         const versionNum = (text.match(/[0-9.]+/) || [0])[0];
         const isThink = text.toLowerCase().includes('think') || text.toLowerCase().includes('reason');
         const score = parseFloat(versionNum) + (isThink ? 0.01 : 0);
         if (score > fallbackMaxScore) { fallbackMaxScore = score; fallbackEl = el; }
      }

      const match = text.match(regex);
      if (match) {
        if (isWildcard) {
          const versionNum = (match[1].match(/[0-9.]+/) || [0])[0];
          const isThink = text.toLowerCase().includes('think') || text.toLowerCase().includes('reason');
          const score = parseFloat(versionNum) + (isThink ? 0.01 : 0);
          if (score > maxVersion) { maxVersion = score; bestEl = el; }
        } else {
          return el;
        }
      }
    }
    return bestEl || fallbackEl;
  }

  function dismissAllTips() {
    const dialogs = document.querySelectorAll('div[role="dialog"][aria-label="Tips"]');
    for (const dialog of dialogs) {
      if (dialog.getAttribute('data-tm-handled') === '1') continue;
      let btn = dialog.querySelector('button[aria-label="Dismiss"]') || dialog.querySelector('button[aria-label="Got it"]');
      if (btn) {
        dialog.setAttribute('data-tm-handled', '1');
        invokeReactAction(btn);
      }
    }
  }

  // =========================================================================
  //   SIDE PANEL MANAGER
  // =========================================================================

  let sidePanelActive = false;
  let sidePanelSessionEnded = false;
  let sidePanelFailSafeTimer = null;

  function resetSidePanelSession() {
    sidePanelActive = false;
    sidePanelSessionEnded = false;
    if (sidePanelFailSafeTimer) clearTimeout(sidePanelFailSafeTimer);
    sidePanelFailSafeTimer = setTimeout(() => {
      if (!sidePanelActive && !sidePanelSessionEnded) triggerSidePanelSequence();
    }, 4000);
  }

  function triggerSidePanelSequence() {
    if (sidePanelActive || sidePanelSessionEnded) return;
    sidePanelActive = true;
    checkAndCloseSidePanel();
    if (sidePanelFailSafeTimer) clearTimeout(sidePanelFailSafeTimer);
    sidePanelFailSafeTimer = setTimeout(() => { sidePanelSessionEnded = true; }, 8000);
  }

  function checkAndCloseSidePanel() {
    if (!sidePanelActive || sidePanelSessionEnded) return;
    const headerAnchor = document.querySelector('header.fui-NavDrawerHeader.fai-CopilotNavDrawerHeader');
    if (!headerAnchor) return;

    const collapseBtn = headerAnchor.querySelector('button[data-testid="collapse-button"]');
    if (collapseBtn && isVisible(collapseBtn) && collapseBtn.getAttribute('aria-expanded') !== 'false') {

      const typingTracker = document.activeElement;
      isFocusFrozen = true; // Lock focus so sidebar doesn't steal focus on closing

      invokeReactAction(collapseBtn);

      isFocusFrozen = false;
      if (typingTracker && document.activeElement !== typingTracker) {
          originalFocus.call(typingTracker); // Guarantee restoral
      }

      sidePanelSessionEnded = true;
    }
  }

  const sidePanelObserver = new MutationObserver((mutations) => {
    if (!sidePanelActive || sidePanelSessionEnded) return;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'aria-expanded')) {
        checkAndCloseSidePanel(); break;
      }
    }
  });

  sidePanelObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'class'] });

  // =========================================================================
  //   MAIN LOGIC ROUTINE
  // =========================================================================

  async function enforceGptMode() {
    if (isSwitchingGpt) return;

    const initialSwitcher = document.getElementById('gptModeSwitcher');
    if (!initialSwitcher) return;

    if (!(initialSwitcher.textContent || '').trim().includes('Auto')) {
      triggerSidePanelSequence();
      return;
    }

    if (hasExecutedGptSwitch) {
      if (lastGptSwitchSuccess && gptReversionCount < MAX_GPT_REVERSIONS) {
        gptReversionCount++;
        hasExecutedGptSwitch = false;
      } else return;
    }

    logDebug('Initiating React-based switch sequence...');
    isSwitchingGpt = true;
    document.body.classList.add('tm-mask-gpt-menus');

    // Protect user keystrokes from React programmatic focus pulls
    isFocusFrozen = true;
    const activeUserEl = document.activeElement;

    let wasSuccessful = false;

    try {
      let attempts = 0;
      let stableTicks = 0;

      while (attempts < 30) {
        attempts++;
        const switcher = document.getElementById('gptModeSwitcher');
        if (!switcher) break;

        if (!(switcher.textContent || '').trim().includes('Auto')) {
          hasExecutedGptSwitch = true;
          wasSuccessful = true;
          break;
        }

        const isSwitcherExpanded = switcher.getAttribute('aria-expanded') === 'true';
        if (!isSwitcherExpanded) {
           invokeReactAction(switcher);
           stableTicks = 0;
           await sleep(150);
           continue;
        }

        const targetOption = findBestModelOption(targetModelPattern);
        if (targetOption) {
          invokeReactAction(targetOption);
          hasExecutedGptSwitch = true;
          wasSuccessful = true;
          break;
        }

        const triggers = findSubmenuTriggers();
        const unexpandedTrigger = triggers.find(t => t.getAttribute('aria-expanded') !== 'true');

        if (unexpandedTrigger) {
          invokeReactAction(unexpandedTrigger);
          stableTicks = 0;
          await sleep(150);
          continue;
        }

        stableTicks++;
        if (stableTicks > 10) {
           hasExecutedGptSwitch = true;
           break;
        }

        await sleep(150);
      }

      if (attempts >= 30) hasExecutedGptSwitch = true;
      lastGptSwitchSuccess = wasSuccessful;

      if (!wasSuccessful) {
        const finalSwitcher = document.getElementById('gptModeSwitcher');
        if (finalSwitcher && finalSwitcher.getAttribute('aria-expanded') === 'true') invokeReactAction(finalSwitcher);
      }

    } catch (err) {
      console.error("%c[GPT Debug] Switch Error:", 'color: red', err);
    } finally {
      // Release focus lock and safeguard the original input field
      isFocusFrozen = false;
      if (activeUserEl && document.activeElement !== activeUserEl) {
        originalFocus.call(activeUserEl);
      }

      setTimeout(() => {
        document.body.classList.remove('tm-mask-gpt-menus');
        isSwitchingGpt = false;
        triggerSidePanelSequence();
      }, 500);
    }
  }

  let isThrottled = false;
  const appObserver = new MutationObserver(() => {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
      dismissAllTips();
      enforceGptMode();
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

    history.pushState = function (...args) { const ret = push.apply(this, args); onNav(); return ret; };
    history.replaceState = function (...args) { const ret = replace.apply(this, args); onNav(); return ret; };
    window.addEventListener('popstate', onNav, { passive: true });
  }

  startStyleEnforcement();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { startDomObservers(); hookHistory(); }, { once: true });
  } else {
    startDomObservers();
    hookHistory();
  }
})();