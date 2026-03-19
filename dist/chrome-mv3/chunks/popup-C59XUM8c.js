(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,t=`hideAfterCapture`,n=`suppressHoverState`;async function r(){let n=(await e.storage.local.get(t))[t];return typeof n==`boolean`?n:(await e.storage.local.set({[t]:!0}),!0)}async function i(n){await e.storage.local.set({[t]:n})}async function a(){let t=(await e.storage.local.get(n))[n];return typeof t==`boolean`?t:(await e.storage.local.set({[n]:!0}),!0)}async function o(t){await e.storage.local.set({[n]:t})}function s(e){if(!e)return!1;try{let t=new URL(e);return t.protocol===`http:`||t.protocol===`https:`}catch{return!1}}function c(e){return e?`This extension only supports normal HTTP and HTTPS pages in v1. The current tab is ${e}.`:`This tab cannot be inspected. Open an HTTP or HTTPS page and try again.`}var l=document.querySelector(`#app`);if(!l)throw Error(`Popup root not found.`);l.innerHTML=`
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Motion Element Capture</p>
      <h1>Capture the exact UI fragments you want to animate.</h1>
      <p class="subhead">
        Start capture mode or hide mode, hover any visible element, press <kbd>[</kbd> or <kbd>]</kbd> to change depth, click to act, or use <kbd>⌘/Ctrl</kbd> + <kbd>Z</kbd> to undo the last hide or capture.
      </p>
      <div class="hero-row">
        <div>
          <p class="metric-label">Session</p>
          <p class="metric-value" id="capture-count">0 captures</p>
        </div>
        <div class="status-pill" id="tab-status">Checking tab…</div>
      </div>
    </section>

    <section class="panel">
      <div class="actions">
        <button class="primary" id="start-selection" type="button">Start Capture</button>
        <button class="secondary" id="hide-selection" type="button">Hide Element</button>
      </div>
      <div class="actions">
        <button class="secondary" id="stop-selection" type="button">Stop</button>
        <button class="secondary" id="export-session" type="button">Export ZIP</button>
      </div>
      <div class="actions">
        <button class="ghost" id="clear-session" type="button">Clear Session</button>
      </div>
      <label class="toggle-row" for="hide-after-capture">
        <span>
          <strong>Hide after capture</strong>
          <small>Keep the layout space but hide the captured element on the page.</small>
        </span>
        <input id="hide-after-capture" type="checkbox" />
      </label>
      <label class="toggle-row" for="suppress-hover-state">
        <span>
          <strong>Suppress hover state</strong>
          <small>Temporarily remove hover-driven effects before the screenshot is taken.</small>
        </span>
        <input id="suppress-hover-state" type="checkbox" />
      </label>
      <p class="status-message" id="status-message">Ready.</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>Captured Elements</h2>
        <span class="hint">Persisted locally until you clear or export them.</span>
      </div>
      <ul class="capture-list" id="capture-list"></ul>
      <p class="empty-state" id="empty-state">No captures yet. Start selection mode on your app, hover an element, and click it.</p>
    </section>
  </main>
`;var u=N(`capture-count`),d=N(`tab-status`),f=N(`status-message`),p=N(`capture-list`),m=N(`empty-state`),h=N(`start-selection`),g=N(`hide-selection`),_=N(`stop-selection`),v=N(`export-session`),y=N(`clear-session`),b=N(`hide-after-capture`),x=N(`suppress-hover-state`),S=null,C=!1,w=0;h.addEventListener(`click`,async()=>{let e=S;if(e==null){M(`No active browser tab is available.`,!0);return}await k(async()=>{let t=await P({type:`START_SELECTION`,tabId:e,mode:`capture`});if(!t.ok){M(t.error,!0);return}M(`Selection mode started on the current page.`)})}),g.addEventListener(`click`,async()=>{let e=S;if(e==null){M(`No active browser tab is available.`,!0);return}await k(async()=>{let t=await P({type:`START_SELECTION`,tabId:e,mode:`hide`});if(!t.ok){M(t.error,!0);return}M(`Hide mode started on the current page.`)})}),_.addEventListener(`click`,async()=>{let e=S;if(e==null){M(`No active browser tab is available.`,!0);return}await k(async()=>{let t=await P({type:`STOP_SELECTION`,tabId:e});if(!t.ok){M(t.error,!0);return}M(`Selection mode stopped.`)})}),v.addEventListener(`click`,async()=>{await k(async()=>{let e=await P({type:`EXPORT_SESSION`});if(!e.ok){M(e.error,!0);return}M(`Exported ${e.data.count} capture(s) to ${e.data.filename}.`),await E()})}),y.addEventListener(`click`,async()=>{await k(async()=>{let e=await P({type:`CLEAR_SESSION`});if(!e.ok){M(e.error,!0);return}D(e.data),M(`Session cleared.`)})}),b.addEventListener(`change`,async()=>{try{await i(b.checked),M(b.checked?`Hide after capture is enabled.`:`Hide after capture is disabled.`)}catch(e){b.checked=!b.checked,M(I(e),!0)}}),x.addEventListener(`change`,async()=>{try{await o(x.checked),M(x.checked?`Hover suppression is enabled.`:`Hover suppression is disabled.`)}catch(e){x.checked=!x.checked,M(I(e),!0)}}),T();async function T(){try{let[t]=await e.tabs.query({active:!0,currentWindow:!0});S=t?.id??null,C=s(t?.url),b.checked=await r(),x.checked=await a(),d.textContent=C?`Scriptable tab`:`Unsupported tab`,d.dataset.tone=C?`ready`:`error`,C?M(`Ready.`):M(c(t?.url),!0),j(),await E()}catch(e){M(I(e),!0),j()}}async function E(){let e=await P({type:`GET_SESSION`});if(!e.ok){M(e.error,!0);return}D(e.data)}function D(e){if(w=e.count,u.textContent=`${e.count} capture${e.count===1?``:`s`}`,j(),p.innerHTML=``,e.captures.length===0){m.hidden=!1;return}m.hidden=!0;let t=new Intl.DateTimeFormat([],{hour:`numeric`,minute:`2-digit`,second:`2-digit`,month:`short`,day:`numeric`});for(let n of e.captures)p.append(O(n,t))}function O(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-title">${F(e.tagName)}</p>
        <p class="capture-label">${F(e.elementLabel)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)} px</p>
    <p class="capture-meta">Page ${Math.round(e.pageX)}, ${Math.round(e.pageY)} · Viewport ${Math.round(e.viewportX)}, ${Math.round(e.viewportY)}</p>
    <p class="capture-meta capture-url">${F(e.pageTitle||e.pageUrl)}</p>
  `,n}async function k(e){A(!0);try{await e()}finally{A(!1)}}function A(e){j(e)}function j(e=!1){h.disabled=e||!C,g.disabled=e||!C,_.disabled=e||!C,v.disabled=e||w===0,y.disabled=e||w===0}function M(e,t=!1){f.textContent=e,f.dataset.tone=t?`error`:`info`}function N(e){let t=document.getElementById(e);if(!t)throw Error(`Missing popup element #${e}`);return t}async function P(t){return e.runtime.sendMessage(t)}function F(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function I(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected popup error occurred.`}