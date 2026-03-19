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
        <p class="stat-label">Captures</p>
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
        <h2>Captures</h2>
        <span class="hint" id="captures-hint">local storage</span>
      </div>
      <ul class="capture-list" id="capture-list"></ul>
      <p class="empty-state" id="empty-state">No captures yet — select a mode above to start.</p>
    </section>

    <div class="kb-hints">
      <span class="kb-hint"><kbd>[</kbd><kbd>]</kbd> depth</span>
      <span class="kb-hint"><kbd>&#8984;</kbd><kbd>Z</kbd> undo</span>
      <span class="kb-hint">click to act</span>
    </div>
  </main>
`;var u=z(`capture-count`),d=z(`tab-status`),f=z(`status-dot`),p=z(`session-status`),m=z(`status-message`),h=z(`capture-list`),g=z(`empty-state`),_=z(`start-selection`),v=z(`hide-selection`),y=z(`blur-selection`),b=z(`stop-selection`),x=z(`export-session`),S=z(`clear-session`),C=z(`hide-after-capture`),w=z(`suppress-hover-state`),T=null,E=!1,D=0,O=null,k={capture:_,hide:v,blur:y};function A(e){O=e;for(let[t,n]of Object.entries(k))n.classList.toggle(`mode-btn--active`,t===e);b.classList.toggle(`action-btn--live`,e!==null),L()}_.addEventListener(`click`,async()=>{let e=T;if(e==null){R(`No active browser tab is available.`,!0);return}await F(async()=>{let t=await B({type:`START_SELECTION`,tabId:e,mode:`capture`});if(!t.ok){R(t.error,!0);return}A(`capture`),R(`Capture mode active.`)})}),v.addEventListener(`click`,async()=>{let e=T;if(e==null){R(`No active browser tab is available.`,!0);return}await F(async()=>{let t=await B({type:`START_SELECTION`,tabId:e,mode:`hide`});if(!t.ok){R(t.error,!0);return}A(`hide`),R(`Hide mode active.`)})}),y.addEventListener(`click`,async()=>{let e=T;if(e==null){R(`No active browser tab is available.`,!0);return}await F(async()=>{let t=await B({type:`START_SELECTION`,tabId:e,mode:`blur`});if(!t.ok){R(t.error,!0);return}A(`blur`),R(`Blur mode active.`)})}),b.addEventListener(`click`,async()=>{let e=T;if(e==null){R(`No active browser tab is available.`,!0);return}await F(async()=>{let t=await B({type:`STOP_SELECTION`,tabId:e});if(!t.ok){R(t.error,!0);return}A(null),R(`Stopped.`)})}),x.addEventListener(`click`,async()=>{await F(async()=>{let e=await B({type:`EXPORT_SESSION`});if(!e.ok){R(e.error,!0);return}R(`Exported ${e.data.count} capture(s) to ${e.data.filename}.`),await M()})}),S.addEventListener(`click`,async()=>{await F(async()=>{let e=await B({type:`CLEAR_SESSION`});if(!e.ok){R(e.error,!0);return}N(e.data),R(`Session cleared.`)})}),C.addEventListener(`change`,async()=>{try{await i(C.checked),R(C.checked?`Hide after capture is enabled.`:`Hide after capture is disabled.`)}catch(e){C.checked=!C.checked,R(H(e),!0)}}),w.addEventListener(`change`,async()=>{try{await o(w.checked),R(w.checked?`Hover suppression is enabled.`:`Hover suppression is disabled.`)}catch(e){w.checked=!w.checked,R(H(e),!0)}}),j();async function j(){try{let[t]=await e.tabs.query({active:!0,currentWindow:!0});if(T=t?.id??null,E=s(t?.url),C.checked=await r(),w.checked=await a(),d.textContent=E?`scriptable tab`:`unsupported tab`,f.dataset.tone=E?`ready`:`error`,E?R(`Ready.`):R(c(t?.url),!0),E&&T!=null){let e=await B({type:`GET_ACTIVE_MODE`,tabId:T});e.ok&&e.data.mode&&A(e.data.mode)}L(),await M()}catch(e){R(H(e),!0),L()}}async function M(){let e=await B({type:`GET_SESSION`});if(!e.ok){R(e.error,!0);return}N(e.data)}function N(e){if(D=e.count,u.textContent=`${e.count}`,p.textContent=e.count>0?`active`:`—`,L(),h.innerHTML=``,e.captures.length===0){g.hidden=!1;return}g.hidden=!0;let t=new Intl.DateTimeFormat([],{hour:`numeric`,minute:`2-digit`,second:`2-digit`,month:`short`,day:`numeric`});for(let n of e.captures)h.append(P(n,t))}function P(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name">&lt;${V(e.tagName.toLowerCase())}&gt;</span></p>
        <p class="capture-label">${V(e.elementLabel)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${V(e.pageTitle||e.pageUrl)}</p>
  `,n}async function F(e){I(!0);try{await e()}finally{I(!1)}}function I(e){L(e)}function L(e=!1){_.disabled=e||!E,v.disabled=e||!E,y.disabled=e||!E,b.disabled=e||!E||O===null,x.disabled=e||D===0,S.disabled=e||D===0}function R(e,t=!1){m.textContent=e,m.dataset.tone=t?`error`:`info`}function z(e){let t=document.getElementById(e);if(!t)throw Error(`Missing popup element #${e}`);return t}async function B(t){return e.runtime.sendMessage(t)}function V(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function H(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected popup error occurred.`}