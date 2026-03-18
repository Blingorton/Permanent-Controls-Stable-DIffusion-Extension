/**
 * Permanent Controls Extension for Stable Diffusion Reforge
 *
 * Injects three always-visible buttons next to the
 * "Apply all selected styles to prompts" button:
 *
 *   ⏹ Interrupt  — stop after current image
 *   ⏭ Skip       — skip to next in batch/queue
 *   ∞  Forever   — toggle Generate Forever on/off (green = on, red = off)
 *
 * Generate Forever implementation sourced directly from contextMenus.js:
 *   ON:  genbutton.click() + setInterval(() => { if not interrupting: click }, 500)
 *   OFF: clearInterval(window.generateOnRepeatInterval)
 *   STATE: window.generateOnRepeatInterval is a truthy timer ID when ON, falsy when OFF
 */

(function () {
    "use strict";

    /* ------------------------------------------------------------------ */
    /*  Styles                                                              */
    /* ------------------------------------------------------------------ */
    const BUTTON_STYLES = `
        .permanent-controls-wrapper {
            display: inline-flex;
            gap: 5px;
            align-items: center;
            flex-wrap: nowrap;
            margin-left: 4px;
        }

        .perm-btn {
            flex: 1 1 auto;
            min-width: 78px;
            padding: 3px 9px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 5px;
            border: 2px solid transparent;
            cursor: pointer;
            transition: background 0.12s, border-color 0.12s,
                        box-shadow 0.12s, transform 0.1s;
            letter-spacing: 0.02em;
            line-height: 1.5;
            white-space: nowrap;
            font-family: inherit;
            color: #fff;
        }
        .perm-btn:active { transform: translateY(1px); }

        .perm-interrupt {
            background: #b03020;
            border-color: #7d1f13;
        }
        .perm-interrupt:hover {
            background: #d9392a;
            border-color: #b03020;
            box-shadow: 0 0 8px rgba(217, 57, 42, 0.55);
            transform: translateY(-1px);
        }

        .perm-skip {
            background: #c07a10;
            border-color: #8a5508;
        }
        .perm-skip:hover {
            background: #e09318;
            border-color: #c07a10;
            box-shadow: 0 0 8px rgba(224, 147, 24, 0.55);
            transform: translateY(-1px);
        }

        .perm-forever {
            flex: 0 0 auto;
            width: 32px;
            height: 32px;
            padding: 0;
            border-radius: 5px;
            border: 2px solid transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 19px;
            line-height: 1;
            transition: background 0.15s, border-color 0.15s,
                        box-shadow 0.15s, transform 0.1s;
            font-family: inherit;
        }
        .perm-forever:active { transform: translateY(1px); }

        /* OFF — muted red */
        .perm-forever.pf-off {
            background: #2a1212;
            border-color: #7b2020;
            color: #c0392b;
        }
        .perm-forever.pf-off:hover {
            background: #3d1818;
            border-color: #c0392b;
            box-shadow: 0 0 8px rgba(192, 57, 43, 0.45);
            transform: translateY(-1px);
        }

        /* ON — glowing green */
        .perm-forever.pf-on {
            background: #122212;
            border-color: #27ae60;
            color: #2ecc71;
        }
        .perm-forever.pf-on:hover {
            background: #183018;
            border-color: #2ecc71;
            box-shadow: 0 0 12px rgba(46, 204, 113, 0.6);
            transform: translateY(-1px);
        }

        @keyframes pf-pulse {
            0%   { opacity: 1;    transform: scale(1); }
            50%  { opacity: 0.65; transform: scale(1.22); }
            100% { opacity: 1;    transform: scale(1); }
        }
        .perm-forever.pf-on .pf-icon {
            display: inline-block;
            animation: pf-pulse 2.2s ease-in-out infinite;
        }
        .perm-forever.pf-off .pf-icon {
            display: inline-block;
            opacity: 0.55;
        }

        @keyframes perm-flash {
            0%   { opacity: 1; }
            45%  { opacity: 0.35; }
            100% { opacity: 1; }
        }
        .perm-flash { animation: perm-flash 0.28s ease; }
    `;

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                             */
    /* ------------------------------------------------------------------ */
    function injectStyles() {
        if (document.getElementById("permanent-controls-styles")) return;
        const s = document.createElement("style");
        s.id = "permanent-controls-styles";
        s.textContent = BUTTON_STYLES;
        document.head.appendChild(s);
    }

    function flash(btn) {
        btn.classList.remove("perm-flash");
        void btn.offsetWidth;
        btn.classList.add("perm-flash");
    }

    function gradioApp() {
        return document.querySelector("gradio-app")?.shadowRoot || document;
    }

    /* ------------------------------------------------------------------ */
    /*  Interrupt / Skip                                                    */
    /* ------------------------------------------------------------------ */
    function handleInterrupt(btn) {
        flash(btn);
        const el = gradioApp().getElementById
            ? gradioApp().getElementById("txt2img_interrupt") || gradioApp().getElementById("img2img_interrupt")
            : gradioApp().querySelector("#txt2img_interrupt") || gradioApp().querySelector("#img2img_interrupt");
        if (el) {
            el.click();
        } else {
            console.warn("[PermanentControls] Interrupt button not found.");
        }
    }

    function handleSkip(btn) {
        flash(btn);
        const el = gradioApp().getElementById
            ? gradioApp().getElementById("txt2img_skip") || gradioApp().getElementById("img2img_skip")
            : gradioApp().querySelector("#txt2img_skip") || gradioApp().querySelector("#img2img_skip");
        if (el) {
            el.click();
        } else {
            console.warn("[PermanentControls] Skip button not found.");
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Generate Forever                                                    */
    /*                                                                      */
    /*  Copied verbatim from contextMenus.js:                              */
    /*                                                                      */
    /*  ON:    click genbutton once, then setInterval clicking it every    */
    /*         500ms whenever the interrupt button is not visible.         */
    /*  OFF:   clearInterval(window.generateOnRepeatInterval)              */
    /*  STATE: !!window.generateOnRepeatInterval                           */
    /* ------------------------------------------------------------------ */

    function startForever(tabId) {
        const genbutton = gradioApp().querySelector(`#${tabId}_generate`);
        const interruptbutton = gradioApp().querySelector(`#${tabId}_interrupt`);
        if (!genbutton || !interruptbutton) {
            console.warn(`[PermanentControls] Could not find generate/interrupt buttons for ${tabId}`);
            return false;
        }
        // Click immediately if not already generating (same logic as contextMenus.js)
        if (!interruptbutton.offsetParent) {
            genbutton.click();
        }
        clearInterval(window.generateOnRepeatInterval);
        window.generateOnRepeatInterval = setInterval(function () {
            if (!interruptbutton.offsetParent) {
                genbutton.click();
            }
        }, 500);
        return true;
    }

    function stopForever() {
        clearInterval(window.generateOnRepeatInterval);
        window.generateOnRepeatInterval = null;
    }

    function isForeverActive() {
        return !!window.generateOnRepeatInterval;
    }

    function syncForeverBtn(foreverBtn) {
        const active = isForeverActive();
        const isOn = foreverBtn.classList.contains("pf-on");
        if (active === isOn) return;
        foreverBtn.classList.toggle("pf-on", active);
        foreverBtn.classList.toggle("pf-off", !active);
        foreverBtn.title = active
            ? "Generate Forever: ON — click to disable"
            : "Generate Forever: OFF — click to enable";
    }

    /* ------------------------------------------------------------------ */
    /*  Build button group                                                  */
    /* ------------------------------------------------------------------ */
    function createButtonGroup(tabId) {
        const wrapper = document.createElement("div");
        wrapper.className = "permanent-controls-wrapper";
        wrapper.dataset.tabId = tabId;

        /* Interrupt */
        const intBtn = document.createElement("button");
        intBtn.className = "perm-btn perm-interrupt";
        intBtn.textContent = "⏹ Interrupt";
        intBtn.title = "Interrupt — stop after current image (always visible)";
        intBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            handleInterrupt(intBtn);
        });

        /* Skip */
        const skipBtn = document.createElement("button");
        skipBtn.className = "perm-btn perm-skip";
        skipBtn.textContent = "⏭ Skip";
        skipBtn.title = "Skip — advance to next image in batch (always visible)";
        skipBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            handleSkip(skipBtn);
        });

        /* Generate Forever toggle */
        const foreverBtn = document.createElement("button");
        foreverBtn.className = "perm-forever pf-off";
        foreverBtn.title = "Generate Forever: OFF — click to enable";
        foreverBtn.innerHTML = `<span class="pf-icon">∞</span>`;

        foreverBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            flash(foreverBtn);
            if (isForeverActive()) {
                stopForever();
            } else {
                startForever(tabId);
            }
            syncForeverBtn(foreverBtn);
        });

        // Sync button if user toggles via the native right-click menu
        // Use a lightweight visibility-check interval (no DOM events, no fetches)
        setInterval(() => syncForeverBtn(foreverBtn), 500);

        wrapper.appendChild(intBtn);
        wrapper.appendChild(skipBtn);
        wrapper.appendChild(foreverBtn);
        return wrapper;
    }

    /* ------------------------------------------------------------------ */
    /*  Injection                                                           */
    /* ------------------------------------------------------------------ */
    function findStylesButtonRow(tabId) {
        const selectors = [
            `#${tabId}_style_apply`,
            `#${tabId}_styles_button`,
            `button[title*="style" i]`,
            `button[aria-label*="style" i]`,
        ];
        for (const sel of selectors) {
            const btn =
                document.querySelector(`#${tabId}_toprow ${sel}`) ||
                document.querySelector(`#${tabId} ${sel}`) ||
                document.querySelector(sel);
            if (btn) return btn.closest(".flex, .row, [class*='row'], div") || btn.parentElement;
        }
        for (const b of document.querySelectorAll("button")) {
            if (/apply.*style|style.*prompt/i.test(b.textContent)) {
                return b.closest(".flex, .row, div") || b.parentElement;
            }
        }
        return null;
    }

    function injectForTab(tabId) {
        if (document.querySelector(`.permanent-controls-wrapper[data-tab-id="${tabId}"]`)) return;
        const row = findStylesButtonRow(tabId);
        if (!row) return;
        row.appendChild(createButtonGroup(tabId));
        console.log(`[PermanentControls] Injected for tab: ${tabId}`);
    }

    function tryInject() {
        injectForTab("txt2img");
        injectForTab("img2img");
    }

    function init() {
        injectStyles();
        setTimeout(tryInject, 1500);
        const observer = new MutationObserver(() => {
            const ok =
                document.querySelector('.permanent-controls-wrapper[data-tab-id="txt2img"]') &&
                document.querySelector('.permanent-controls-wrapper[data-tab-id="img2img"]');
            if (!ok) tryInject();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
