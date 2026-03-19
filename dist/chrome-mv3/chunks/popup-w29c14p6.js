(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,t=`hideAfterCapture`,n=`suppressHoverState`;async function r(){let n=(await e.storage.local.get(t))[t];return typeof n==`boolean`?n:(await e.storage.local.set({[t]:!0}),!0)}async function i(n){await e.storage.local.set({[t]:n})}async function a(){let t=(await e.storage.local.get(n))[n];return typeof t==`boolean`?t:(await e.storage.local.set({[n]:!0}),!0)}async function o(t){await e.storage.local.set({[n]:t})}function s(e){if(!e)return!1;try{let t=new URL(e);return t.protocol===`http:`||t.protocol===`https:`}catch{return!1}}function c(e){return e?`This extension only supports normal HTTP and HTTPS pages in v1. The current tab is ${e}.`:`This tab cannot be inspected. Open an HTTP or HTTPS page and try again.`}var l=document.querySelector(`#app`);if(!l)throw Error(`Popup root not found.`);l.innerHTML=`
  <main class="shell">
    <header class="header">
      <div class="header-icon">&#9670;</div>
      <div class="header-text">
        <h1 class="header-title">Motion Capture</h1>
        <p class="header-sub" id="tab-status">checking tab…</p>
      </div>
      <div class="status-dot" id="status-dot"></div>
    </header>

    <div class="stats-bar">
      <div class="stat">
        <p class="stat-value" id="capture-count">0</p>
        <p class="stat-label">Items</p>
      </div>
      <div class="stat">
        <p class="stat-value" id="session-status">—</p>
        <p class="stat-label">Status</p>
      </div>
    </div>

    <section class="mode-section">
      <p class="mode-label">Select Mode</p>
      <div class="mode-grid">
        <button class="mode-btn" data-mode="capture" id="start-selection" type="button">
          <span class="mode-icon">&#9673;</span>
          Capture
        </button>
        <button class="mode-btn" data-mode="hide" id="hide-selection" type="button">
          <span class="mode-icon">&#9675;</span>
          Hide
        </button>
        <button class="mode-btn" data-mode="blur" id="blur-selection" type="button">
          <span class="mode-icon">&#9678;</span>
          Blur
        </button>
        <button class="mode-btn" data-mode="text" id="text-selection" type="button">
          <span class="mode-icon">T</span>
          Text
        </button>
      </div>
    </section>

    <div class="action-bar">
      <button class="action-btn action-btn--stop" id="stop-selection" type="button">Stop</button>
      <button class="action-btn action-btn--export" id="export-session" type="button">Export</button>
      <button class="action-btn action-btn--clear" id="clear-session" type="button">Clear</button>
    </div>

    <div class="toggles">
      <label class="toggle-row" for="hide-after-capture">
        <span>
          <strong>Hide after capture</strong>
          <small>Preserve layout space, hide the element visually.</small>
        </span>
        <div class="toggle-switch">
          <input id="hide-after-capture" type="checkbox" />
          <span class="slider"></span>
        </div>
      </label>
      <label class="toggle-row" for="suppress-hover-state">
        <span>
          <strong>Suppress hover</strong>
          <small>Remove hover effects before screenshot.</small>
        </span>
        <div class="toggle-switch">
          <input id="suppress-hover-state" type="checkbox" />
          <span class="slider"></span>
        </div>
      </label>
    </div>

    <div class="status-bar">
      <p class="status-message" id="status-message">Ready.</p>
    </div>

    <section class="captures-section">
      <div class="captures-header">
        <h2>Session Items</h2>
        <span class="hint" id="captures-hint">local storage</span>
      </div>
      <ul class="capture-list" id="capture-list"></ul>
      <p class="empty-state" id="empty-state">No items yet — select a mode above to start.</p>
    </section>

    <div class="kb-hints">
      <span class="kb-hint"><kbd>[</kbd><kbd>]</kbd> depth</span>
      <span class="kb-hint"><kbd>&#8984;</kbd><kbd>Z</kbd> undo</span>
      <span class="kb-hint">click to act</span>
    </div>
  </main>
`;var u=V(`capture-count`),d=V(`tab-status`),f=V(`status-dot`),p=V(`session-status`),m=V(`status-message`),h=V(`capture-list`),g=V(`empty-state`),_=V(`start-selection`),v=V(`hide-selection`),y=V(`blur-selection`),b=V(`text-selection`),x=V(`stop-selection`),S=V(`export-session`),C=V(`clear-session`),w=V(`hide-after-capture`),T=V(`suppress-hover-state`),E=null,D=!1,O=0,k=null,A={capture:_,hide:v,blur:y,text:b};function j(e){k=e;for(let[t,n]of Object.entries(A))n.classList.toggle(`mode-btn--active`,t===e);x.classList.toggle(`action-btn--live`,e!==null),z()}_.addEventListener(`click`,async()=>{let e=E;if(e==null){B(`No active browser tab is available.`,!0);return}await L(async()=>{let t=await H({type:`START_SELECTION`,tabId:e,mode:`capture`});if(!t.ok){B(t.error,!0);return}j(`capture`),B(`Capture mode active.`)})}),v.addEventListener(`click`,async()=>{let e=E;if(e==null){B(`No active browser tab is available.`,!0);return}await L(async()=>{let t=await H({type:`START_SELECTION`,tabId:e,mode:`hide`});if(!t.ok){B(t.error,!0);return}j(`hide`),B(`Hide mode active.`)})}),y.addEventListener(`click`,async()=>{let e=E;if(e==null){B(`No active browser tab is available.`,!0);return}await L(async()=>{let t=await H({type:`START_SELECTION`,tabId:e,mode:`blur`});if(!t.ok){B(t.error,!0);return}j(`blur`),B(`Blur mode active.`)})}),b.addEventListener(`click`,async()=>{let e=E;if(e==null){B(`No active browser tab is available.`,!0);return}await L(async()=>{let t=await H({type:`START_SELECTION`,tabId:e,mode:`text`});if(!t.ok){B(t.error,!0);return}j(`text`),B(`Text mode active.`)})}),x.addEventListener(`click`,async()=>{let e=E;if(e==null){B(`No active browser tab is available.`,!0);return}await L(async()=>{let t=await H({type:`STOP_SELECTION`,tabId:e});if(!t.ok){B(t.error,!0);return}j(null),B(`Stopped.`)})}),S.addEventListener(`click`,async()=>{await L(async()=>{let e=await H({type:`EXPORT_SESSION`});if(!e.ok){B(e.error,!0);return}B(`Exported ${e.data.count} item(s) to ${e.data.filename}.`),await N()})}),C.addEventListener(`click`,async()=>{await L(async()=>{let e=await H({type:`CLEAR_SESSION`});if(!e.ok){B(e.error,!0);return}P(e.data),B(`Session cleared.`)})}),w.addEventListener(`change`,async()=>{try{await i(w.checked),B(w.checked?`Hide after capture is enabled.`:`Hide after capture is disabled.`)}catch(e){w.checked=!w.checked,B(W(e),!0)}}),T.addEventListener(`change`,async()=>{try{await o(T.checked),B(T.checked?`Hover suppression is enabled.`:`Hover suppression is disabled.`)}catch(e){T.checked=!T.checked,B(W(e),!0)}}),M();async function M(){try{let[t]=await e.tabs.query({active:!0,currentWindow:!0});if(E=t?.id??null,D=s(t?.url),w.checked=await r(),T.checked=await a(),d.textContent=D?`scriptable tab`:`unsupported tab`,f.dataset.tone=D?`ready`:`error`,D?B(`Ready.`):B(c(t?.url),!0),D&&E!=null){let e=await H({type:`GET_ACTIVE_MODE`,tabId:E});e.ok&&e.data.mode&&j(e.data.mode)}z(),await N()}catch(e){B(W(e),!0),z()}}async function N(){let e=await H({type:`GET_SESSION`});if(!e.ok){B(e.error,!0);return}P(e.data)}function P(e){if(O=e.count,u.textContent=`${e.count}`,p.textContent=e.count>0?`${e.captureCount}c / ${e.textFragmentCount}t`:`—`,z(),h.innerHTML=``,e.items.length===0){g.hidden=!1;return}g.hidden=!0;let t=new Intl.DateTimeFormat([],{hour:`numeric`,minute:`2-digit`,second:`2-digit`,month:`short`,day:`numeric`});for(let n of e.items)h.append(n.kind===`capture`?F(n,t):I(n,t))}function F(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name">&lt;${U(e.tagName.toLowerCase())}&gt;</span></p>
        <p class="capture-label">${U(e.elementLabel)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${U(e.pageTitle||e.pageUrl)}</p>
  `,n}function I(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name capture-tag-name--text">text</span></p>
        <p class="capture-label">${U(e.fragmentText)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${U(e.fontSize)} · ${U(e.color)}</p>
  `,n}async function L(e){R(!0);try{await e()}finally{R(!1)}}function R(e){z(e)}function z(e=!1){_.disabled=e||!D,v.disabled=e||!D,y.disabled=e||!D,b.disabled=e||!D,x.disabled=e||!D||k===null,S.disabled=e||O===0,C.disabled=e||O===0}function B(e,t=!1){m.textContent=e,m.dataset.tone=t?`error`:`info`}function V(e){let t=document.getElementById(e);if(!t)throw Error(`Missing popup element #${e}`);return t}async function H(t){return e.runtime.sendMessage(t)}function U(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function W(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected popup error occurred.`}