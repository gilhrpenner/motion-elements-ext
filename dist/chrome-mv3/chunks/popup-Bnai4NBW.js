import"./_virtual_wxt-html-plugins-CdCj8_S8.js";var e=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,t=`hideAfterCapture`,n=`suppressHoverState`;async function r(){let n=(await e.storage.local.get(t))[t];return typeof n==`boolean`?n:(await e.storage.local.set({[t]:!0}),!0)}async function i(n){await e.storage.local.set({[t]:n})}async function a(){let t=(await e.storage.local.get(n))[n];return typeof t==`boolean`?t:(await e.storage.local.set({[n]:!0}),!0)}async function o(t){await e.storage.local.set({[n]:t})}function s(e){if(!e)return!1;try{let t=new URL(e);return t.protocol===`http:`||t.protocol===`https:`}catch{return!1}}function c(e){return e?`This extension only supports normal HTTP and HTTPS pages in v1. The current tab is ${e}.`:`This tab cannot be inspected. Open an HTTP or HTTPS page and try again.`}var l=document.querySelector(`#app`);if(!l)throw Error(`Popup root not found.`);l.innerHTML=`
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
      <button class="action-btn action-btn--viewport" id="capture-viewport" type="button">Viewport</button>
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
        <div class="captures-actions">
          <span class="hint" id="captures-hint">local storage</span>
          <button class="captures-link" id="open-reorder" type="button">Reorder</button>
        </div>
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
`;var u=U(`capture-count`),d=U(`tab-status`),f=U(`status-dot`),p=U(`session-status`),m=U(`status-message`),h=U(`capture-list`),g=U(`empty-state`),_=U(`open-reorder`),v=U(`start-selection`),y=U(`hide-selection`),b=U(`blur-selection`),x=U(`text-selection`),S=U(`stop-selection`),C=U(`capture-viewport`),w=U(`export-session`),T=U(`clear-session`),E=U(`hide-after-capture`),D=U(`suppress-hover-state`),O=null,k=!1,A=0,j=null,M={capture:v,hide:y,blur:b,text:x};function N(e){j=e;for(let[t,n]of Object.entries(M))n.classList.toggle(`mode-btn--active`,t===e);S.classList.toggle(`action-btn--live`,e!==null),V()}v.addEventListener(`click`,async()=>{let e=O;if(e==null){H(`No active browser tab is available.`,!0);return}await z(async()=>{let t=await W({type:`START_SELECTION`,tabId:e,mode:`capture`});if(!t.ok){H(t.error,!0);return}N(`capture`),H(`Capture mode active.`)})}),y.addEventListener(`click`,async()=>{let e=O;if(e==null){H(`No active browser tab is available.`,!0);return}await z(async()=>{let t=await W({type:`START_SELECTION`,tabId:e,mode:`hide`});if(!t.ok){H(t.error,!0);return}N(`hide`),H(`Hide mode active.`)})}),b.addEventListener(`click`,async()=>{let e=O;if(e==null){H(`No active browser tab is available.`,!0);return}await z(async()=>{let t=await W({type:`START_SELECTION`,tabId:e,mode:`blur`});if(!t.ok){H(t.error,!0);return}N(`blur`),H(`Blur mode active.`)})}),x.addEventListener(`click`,async()=>{let e=O;if(e==null){H(`No active browser tab is available.`,!0);return}await z(async()=>{let t=await W({type:`START_SELECTION`,tabId:e,mode:`text`});if(!t.ok){H(t.error,!0);return}N(`text`),H(`Text mode active.`)})}),S.addEventListener(`click`,async()=>{let e=O;if(e==null){H(`No active browser tab is available.`,!0);return}await z(async()=>{let t=await W({type:`STOP_SELECTION`,tabId:e});if(!t.ok){H(t.error,!0);return}N(null),H(`Stopped.`)})}),C.addEventListener(`click`,async()=>{let e=O;if(e==null){H(`No active browser tab is available.`,!0);return}await z(async()=>{let t=await W({type:`CAPTURE_VIEWPORT`,tabId:e});if(!t.ok){H(t.error,!0);return}H(`Captured visible viewport.`),await F()})}),w.addEventListener(`click`,async()=>{await z(async()=>{let e=await W({type:`EXPORT_SESSION`});if(!e.ok){H(e.error,!0);return}H(`Exported ${e.data.count} item(s) to ${e.data.filename}.`),await F()})}),T.addEventListener(`click`,async()=>{await z(async()=>{let e=await W({type:`CLEAR_SESSION`});if(!e.ok){H(e.error,!0);return}I(e.data),H(`Session cleared.`)})}),_.addEventListener(`click`,async()=>{try{await e.tabs.create({url:new URL(`/reorder.html`,location.origin).toString()}),window.close()}catch(e){H(K(e),!0)}}),E.addEventListener(`change`,async()=>{try{await i(E.checked),H(E.checked?`Hide after capture is enabled.`:`Hide after capture is disabled.`)}catch(e){E.checked=!E.checked,H(K(e),!0)}}),D.addEventListener(`change`,async()=>{try{await o(D.checked),H(D.checked?`Hover suppression is enabled.`:`Hover suppression is disabled.`)}catch(e){D.checked=!D.checked,H(K(e),!0)}}),P();async function P(){try{let[t]=await e.tabs.query({active:!0,currentWindow:!0});if(O=t?.id??null,k=s(t?.url),E.checked=await r(),D.checked=await a(),d.textContent=k?`scriptable tab`:`unsupported tab`,f.dataset.tone=k?`ready`:`error`,k?H(`Ready.`):H(c(t?.url),!0),k&&O!=null){let e=await W({type:`GET_ACTIVE_MODE`,tabId:O});e.ok&&e.data.mode&&N(e.data.mode)}V(),await F()}catch(e){H(K(e),!0),V()}}async function F(){let e=await W({type:`GET_SESSION`});if(!e.ok){H(e.error,!0);return}I(e.data)}function I(e){if(A=e.count,u.textContent=`${e.count}`,p.textContent=e.count>0?`${e.captureCount}c / ${e.textFragmentCount}t`:`—`,V(),h.innerHTML=``,e.items.length===0){g.hidden=!1;return}g.hidden=!0;let t=new Intl.DateTimeFormat([],{hour:`numeric`,minute:`2-digit`,second:`2-digit`,month:`short`,day:`numeric`});for(let n of e.items)h.append(n.kind===`capture`?L(n,t):R(n,t))}function L(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name">&lt;${G(e.tagName.toLowerCase())}&gt;</span></p>
        <p class="capture-label">${G(e.elementLabel)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${G(e.pageTitle||e.pageUrl)}</p>
  `,n}function R(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name capture-tag-name--text">text</span></p>
        <p class="capture-label">${G(e.fragmentText)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${G(e.fontSize)} · ${G(e.color)}</p>
  `,n}async function z(e){B(!0);try{await e()}finally{B(!1)}}function B(e){V(e)}function V(e=!1){v.disabled=e||!k,y.disabled=e||!k,b.disabled=e||!k,x.disabled=e||!k,S.disabled=e||!k||j===null,C.disabled=e||!k,w.disabled=e||A===0,T.disabled=e||A===0,_.disabled=e||A<2}function H(e,t=!1){m.textContent=e,m.dataset.tone=t?`error`:`info`}function U(e){let t=document.getElementById(e);if(!t)throw Error(`Missing popup element #${e}`);return t}async function W(t){return e.runtime.sendMessage(t)}function G(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function K(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected popup error occurred.`}