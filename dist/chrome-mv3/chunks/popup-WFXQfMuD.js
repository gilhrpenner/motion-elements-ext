(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,t=`hideAfterCapture`,n=`suppressHoverState`;async function r(){let n=(await e.storage.local.get(t))[t];return typeof n==`boolean`?n:(await e.storage.local.set({[t]:!0}),!0)}async function i(n){await e.storage.local.set({[t]:n})}async function a(){let t=(await e.storage.local.get(n))[n];return typeof t==`boolean`?t:(await e.storage.local.set({[n]:!0}),!0)}async function o(t){await e.storage.local.set({[n]:t})}function s(e){if(!e)return!1;try{let t=new URL(e);return t.protocol===`http:`||t.protocol===`https:`}catch{return!1}}function c(e){return e?`This extension only supports normal HTTP and HTTPS pages in v1. The current tab is ${e}.`:`This tab cannot be inspected. Open an HTTP or HTTPS page and try again.`}var l=document.querySelector(`#app`);if(!l)throw Error(`Popup root not found.`);l.innerHTML=`
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Motion Element Capture</p>
      <h1>Capture the exact UI fragments you want to animate.</h1>
      <p class="subhead">
        Start selection mode, hover any visible element, press <kbd>[</kbd> or <kbd>]</kbd> to change depth, click to save the PNG and coordinates, or use <kbd>⌘/Ctrl</kbd> + <kbd>Z</kbd> to undo the last capture.
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
        <button class="primary" id="start-selection" type="button">Start Selection</button>
        <button class="secondary" id="stop-selection" type="button">Stop</button>
      </div>
      <div class="actions">
        <button class="secondary" id="export-session" type="button">Export ZIP</button>
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
`;var u=M(`capture-count`),d=M(`tab-status`),f=M(`status-message`),p=M(`capture-list`),m=M(`empty-state`),h=M(`start-selection`),g=M(`stop-selection`),_=M(`export-session`),v=M(`clear-session`),y=M(`hide-after-capture`),b=M(`suppress-hover-state`),x=null,S=!1,C=0;h.addEventListener(`click`,async()=>{let e=x;if(e==null){j(`No active browser tab is available.`,!0);return}await O(async()=>{let t=await N({type:`START_SELECTION`,tabId:e});if(!t.ok){j(t.error,!0);return}j(`Selection mode started on the current page.`)})}),g.addEventListener(`click`,async()=>{let e=x;if(e==null){j(`No active browser tab is available.`,!0);return}await O(async()=>{let t=await N({type:`STOP_SELECTION`,tabId:e});if(!t.ok){j(t.error,!0);return}j(`Selection mode stopped.`)})}),_.addEventListener(`click`,async()=>{await O(async()=>{let e=await N({type:`EXPORT_SESSION`});if(!e.ok){j(e.error,!0);return}j(`Exported ${e.data.count} capture(s) to ${e.data.filename}.`),await T()})}),v.addEventListener(`click`,async()=>{await O(async()=>{let e=await N({type:`CLEAR_SESSION`});if(!e.ok){j(e.error,!0);return}E(e.data),j(`Session cleared.`)})}),y.addEventListener(`change`,async()=>{try{await i(y.checked),j(y.checked?`Hide after capture is enabled.`:`Hide after capture is disabled.`)}catch(e){y.checked=!y.checked,j(F(e),!0)}}),b.addEventListener(`change`,async()=>{try{await o(b.checked),j(b.checked?`Hover suppression is enabled.`:`Hover suppression is disabled.`)}catch(e){b.checked=!b.checked,j(F(e),!0)}}),w();async function w(){try{let[t]=await e.tabs.query({active:!0,currentWindow:!0});x=t?.id??null,S=s(t?.url),y.checked=await r(),b.checked=await a(),d.textContent=S?`Scriptable tab`:`Unsupported tab`,d.dataset.tone=S?`ready`:`error`,S?j(`Ready.`):j(c(t?.url),!0),A(),await T()}catch(e){j(F(e),!0),A()}}async function T(){let e=await N({type:`GET_SESSION`});if(!e.ok){j(e.error,!0);return}E(e.data)}function E(e){if(C=e.count,u.textContent=`${e.count} capture${e.count===1?``:`s`}`,A(),p.innerHTML=``,e.captures.length===0){m.hidden=!1;return}m.hidden=!0;let t=new Intl.DateTimeFormat([],{hour:`numeric`,minute:`2-digit`,second:`2-digit`,month:`short`,day:`numeric`});for(let n of e.captures)p.append(D(n,t))}function D(e,t){let n=document.createElement(`li`);return n.className=`capture-item`,n.innerHTML=`
    <div class="capture-top">
      <div>
        <p class="capture-title">${P(e.tagName)}</p>
        <p class="capture-label">${P(e.elementLabel)}</p>
      </div>
      <span class="capture-time">${t.format(new Date(e.capturedAt))}</span>
    </div>
    <p class="capture-meta">${Math.round(e.width)}×${Math.round(e.height)} px</p>
    <p class="capture-meta">Page ${Math.round(e.pageX)}, ${Math.round(e.pageY)} · Viewport ${Math.round(e.viewportX)}, ${Math.round(e.viewportY)}</p>
    <p class="capture-meta capture-url">${P(e.pageTitle||e.pageUrl)}</p>
  `,n}async function O(e){k(!0);try{await e()}finally{k(!1)}}function k(e){A(e)}function A(e=!1){h.disabled=e||!S,g.disabled=e||!S,_.disabled=e||C===0,v.disabled=e||C===0}function j(e,t=!1){f.textContent=e,f.dataset.tone=t?`error`:`info`}function M(e){let t=document.getElementById(e);if(!t)throw Error(`Missing popup element #${e}`);return t}async function N(t){return e.runtime.sendMessage(t)}function P(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function F(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected popup error occurred.`}