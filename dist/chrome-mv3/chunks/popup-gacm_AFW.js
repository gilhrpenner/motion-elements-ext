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
        <button class="mode-btn" data-mode="edit" id="edit-selection" type="button">
          <span class="mode-icon">✎</span>
          Edit
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
`;var u=W(`capture-count`),d=W(`tab-status`),f=W(`status-dot`),p=W(`session-status`),m=W(`status-message`),h=W(`capture-list`),g=W(`empty-state`),_=W(`open-reorder`),v=W(`start-selection`),y=W(`hide-selection`),b=W(`blur-selection`),x=W(`text-selection`),S=W(`edit-selection`),C=W(`stop-selection`),w=W(`capture-viewport`),T=W(`export-session`),E=W(`clear-session`),D=W(`hide-after-capture`),O=W(`suppress-hover-state`),k=null,A=!1,j=0,M=null,N={capture:v,hide:y,blur:b,text:x,edit:S};function P(e){M=e;for(let[t,n]of Object.entries(N))n.classList.toggle(`mode-btn--active`,t===e);C.classList.toggle(`action-btn--live`,e!==null),H()}v.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`START_SELECTION`,tabId:e,mode:`capture`});if(!t.ok){U(t.error,!0);return}P(`capture`),U(`Capture mode active.`)})}),y.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`START_SELECTION`,tabId:e,mode:`hide`});if(!t.ok){U(t.error,!0);return}P(`hide`),U(`Hide mode active.`)})}),b.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`START_SELECTION`,tabId:e,mode:`blur`});if(!t.ok){U(t.error,!0);return}P(`blur`),U(`Blur mode active.`)})}),x.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`START_SELECTION`,tabId:e,mode:`text`});if(!t.ok){U(t.error,!0);return}P(`text`),U(`Text mode active.`)})}),S.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`START_SELECTION`,tabId:e,mode:`edit`});if(!t.ok){U(t.error,!0);return}P(`edit`),U(`Free text editor active.`)})}),C.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`STOP_SELECTION`,tabId:e});if(!t.ok){U(t.error,!0);return}P(null),U(`Stopped.`)})}),w.addEventListener(`click`,async()=>{let e=k;if(e==null){U(`No active browser tab is available.`,!0);return}await B(async()=>{let t=await G({type:`CAPTURE_VIEWPORT`,tabId:e});if(!t.ok){U(t.error,!0);return}U(`Captured visible viewport.`),await I()})}),T.addEventListener(`click`,async()=>{await B(async()=>{let e=await G({type:`EXPORT_SESSION`});if(!e.ok){U(e.error,!0);return}U(`Exported ${e.data.count} item(s) to ${e.data.filename}.`),await I()})}),E.addEventListener(`click`,async()=>{await B(async()=>{let e=await G({type:`CLEAR_SESSION`});if(!e.ok){U(e.error,!0);return}L(e.data),U(`Session cleared.`)})}),_.addEventListener(`click`,async()=>{try{await e.tabs.create({url:new URL(`/reorder.html`,location.origin).toString()}),window.close()}catch(e){U(q(e),!0)}}),D.addEventListener(`change`,async()=>{try{await i(D.checked),U(D.checked?`Hide after capture is enabled.`:`Hide after capture is disabled.`)}catch(e){D.checked=!D.checked,U(q(e),!0)}}),O.addEventListener(`change`,async()=>{try{await o(O.checked),U(O.checked?`Hover suppression is enabled.`:`Hover suppression is disabled.`)}catch(e){O.checked=!O.checked,U(q(e),!0)}}),F();async function F(){try{let[t]=await e.tabs.query({active:!0,currentWindow:!0});if(k=t?.id??null,A=s(t?.url),D.checked=await r(),O.checked=await a(),d.textContent=A?`scriptable tab`:`unsupported tab`,f.dataset.tone=A?`ready`:`error`,A?U(`Ready.`):U(c(t?.url),!0),A&&k!=null){let e=await G({type:`GET_ACTIVE_MODE`,tabId:k});e.ok&&e.data.mode&&P(e.data.mode)}H(),await I()}catch(e){U(q(e),!0),H()}}async function I(){let e=await G({type:`GET_SESSION`});if(!e.ok){U(e.error,!0);return}L(e.data)}function L(e){if(j=e.count,u.textContent=`${e.count}`,p.textContent=e.count>0?`${e.captureCount}c / ${e.textFragmentCount}t`:`—`,H(),h.innerHTML=``,e.items.length===0){g.hidden=!1;return}g.hidden=!0;let t=new Intl.DateTimeFormat([],{hour:`numeric`,minute:`2-digit`,second:`2-digit`,month:`short`,day:`numeric`});for(let n of e.items)h.append(n.kind===`capture`?R(n,t):z(n,t))}function R(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name">&lt;${K(e.tagName.toLowerCase())}&gt;</span></p>
        <p class="capture-label">${K(e.elementLabel)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${K(e.pageTitle||e.pageUrl)}</p>
  `,n}function z(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name capture-tag-name--text">text</span></p>
        <p class="capture-label">${K(e.fragmentText)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)}</p>
      <p class="capture-meta">@${Math.round(e.viewportX)},${Math.round(e.viewportY)}</p>
    </div>
    <p class="capture-url">${K(e.fontSize)} · ${K(e.color)}</p>
  `,n}async function B(e){V(!0);try{await e()}finally{V(!1)}}function V(e){H(e)}function H(e=!1){v.disabled=e||!A,y.disabled=e||!A,b.disabled=e||!A,x.disabled=e||!A,S.disabled=e||!A,C.disabled=e||!A||M===null,w.disabled=e||!A,T.disabled=e||j===0,E.disabled=e||j===0,_.disabled=e||j<2}function U(e,t=!1){m.textContent=e,m.dataset.tone=t?`error`:`info`}function W(e){let t=document.getElementById(e);if(!t)throw Error(`Missing popup element #${e}`);return t}async function G(t){return e.runtime.sendMessage(t)}function K(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function q(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected popup error occurred.`}