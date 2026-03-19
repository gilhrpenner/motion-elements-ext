import"./_virtual_wxt-html-plugins-CdCj8_S8.js";function e(e){return e.kind===`capture`}var t=`motion-element-capture`,n=1,r=`captures`,i=null;async function a(){let e=(await c()).transaction(r,`readonly`),t=await l(e.objectStore(r).getAll());await u(e);let n=t.map(s);return n.some(e=>typeof e.sortOrder!=`number`)?n.sort((e,t)=>t.capturedAt.localeCompare(e.capturedAt)).map((e,t)=>({...e,sortOrder:t})):n.sort((e,t)=>(e.sortOrder??0)-(t.sortOrder??0))}async function o(e){let t=await a(),n=new Map(t.map(e=>[e.id,e])),i=[];for(let t of e){let e=n.get(t);e&&(i.push(e),n.delete(t))}i.push(...n.values());let o=(await c()).transaction(r,`readwrite`),s=o.objectStore(r);i.forEach((e,t)=>{s.put({...e,sortOrder:t})}),await u(o)}function s(e){return`kind`in e&&e.kind===`text-fragment`?e:{...e,kind:`capture`}}function c(){return i||=new Promise((e,i)=>{let a=indexedDB.open(t,n);a.onupgradeneeded=()=>{let e=a.result;e.objectStoreNames.contains(r)||e.createObjectStore(r,{keyPath:`id`})},a.onsuccess=()=>e(a.result),a.onerror=()=>i(a.error??Error(`Failed to open IndexedDB.`))}),i}function l(e){return new Promise((t,n)=>{e.onsuccess=()=>t(e.result),e.onerror=()=>n(e.error??Error(`IndexedDB request failed.`))})}function u(e){return new Promise((t,n)=>{e.oncomplete=()=>t(),e.onabort=()=>n(e.error??Error(`IndexedDB transaction aborted.`)),e.onerror=()=>n(e.error??Error(`IndexedDB transaction failed.`))})}var d=document.querySelector(`#app`);if(!d)throw Error(`Reorder app root not found.`);d.innerHTML=`
  <main class="shell">
    <header class="header">
      <div>
        <p class="eyebrow">Session Order</p>
        <h1>Reorder animation flow</h1>
        <p class="subhead">Drag items, use the move buttons, or open a capture in a new tab. Changes save immediately and affect export order plus screenshot numbering.</p>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" id="refresh-session" type="button">Refresh</button>
      </div>
    </header>
    <section class="status-bar">
      <p id="status-message">Loading session…</p>
    </section>
    <section class="list-shell">
      <ul class="reorder-list" id="reorder-list"></ul>
      <p class="empty-state" id="empty-state" hidden>No items in the current session.</p>
    </section>
  </main>
`;var f=D(`reorder-list`),p=D(`empty-state`),m=D(`status-message`),h=D(`refresh-session`),g=[],_=null;h.addEventListener(`click`,()=>{v(`Session refreshed.`)}),window.addEventListener(`beforeunload`,()=>{for(let e of g)e.previewUrl&&URL.revokeObjectURL(e.previewUrl)}),v();async function v(t){O(`Loading session…`);let n=await a();E(),g=n.map(t=>({record:t,previewUrl:e(t)?URL.createObjectURL(t.imageBlob):void 0})),y(),O(t??`Loaded ${g.length} item${g.length===1?``:`s`}.`)}function y(){f.innerHTML=``,p.hidden=g.length!==0,g.length!==0&&g.forEach((e,t)=>{f.append(b(e,t))})}function b(t,n){let r=document.createElement(`li`);r.className=`reorder-item`,r.draggable=!0,r.dataset.id=t.record.id,r.addEventListener(`dragstart`,()=>{_=t.record.id,r.classList.add(`reorder-item--dragging`)}),r.addEventListener(`dragend`,()=>{_=null,r.classList.remove(`reorder-item--dragging`)}),r.addEventListener(`dragover`,e=>{e.preventDefault(),r.classList.add(`reorder-item--drop-target`)}),r.addEventListener(`dragleave`,()=>{r.classList.remove(`reorder-item--drop-target`)}),r.addEventListener(`drop`,e=>{e.preventDefault(),r.classList.remove(`reorder-item--drop-target`),!(!_||_===t.record.id)&&w(_,t.record.id)});let i=e(t.record)?x(t.record,t.previewUrl):S(t.record);r.innerHTML=`
    <div class="reorder-rank">${String(n+1).padStart(3,`0`)}</div>
    <div class="reorder-body">
      <div class="reorder-meta">
        <div>
          <p class="reorder-kind">${t.record.kind===`capture`?`capture`:`text fragment`}</p>
          <h2 class="reorder-title">${k(t.record.elementLabel)}</h2>
          <p class="reorder-subtitle">${k(t.record.pageTitle||t.record.pageUrl)}</p>
        </div>
        <div class="reorder-controls">
          <button class="icon-btn" data-action="up" type="button" ${n===0?`disabled`:``}>↑</button>
          <button class="icon-btn" data-action="down" type="button" ${n===g.length-1?`disabled`:``}>↓</button>
          ${e(t.record)?`<button class="ghost-btn ghost-btn--small" data-action="open" type="button">Open image</button>`:``}
        </div>
      </div>
    </div>
  `;let a=r.querySelector(`.reorder-body`);return a&&a.prepend(i),r.querySelector(`[data-action="up"]`)?.addEventListener(`click`,()=>{C(n,n-1)}),r.querySelector(`[data-action="down"]`)?.addEventListener(`click`,()=>{C(n,n+1)}),r.querySelector(`[data-action="open"]`)?.addEventListener(`click`,()=>{t.previewUrl&&window.open(t.previewUrl,`_blank`,`noopener,noreferrer`)}),r}function x(e,t){let n=document.createElement(`div`);n.className=`preview preview--image`,n.innerHTML=`
    <img alt="${k(e.elementLabel)}" />
    <p class="preview-meta">${Math.round(e.width)}×${Math.round(e.height)} · @${Math.round(e.pageX)},${Math.round(e.pageY)}</p>
  `;let r=n.querySelector(`img`);return r&&t&&(r.src=t),n}function S(e){let t=document.createElement(`div`);return t.className=`preview preview--text`,t.innerHTML=`
    <div class="preview-text-fragment">${k(e.fragmentText)}</div>
    <p class="preview-meta">${k(e.fontSize)} · ${k(e.color)}</p>
  `,t}async function C(e,t){if(t<0||t>=g.length||e===t)return;let n=g.slice(),[r]=n.splice(e,1);n.splice(t,0,r),await T(n,`Moved item to position ${t+1}.`)}async function w(e,t){let n=g.findIndex(t=>t.record.id===e),r=g.findIndex(e=>e.record.id===t);if(n===-1||r===-1||n===r)return;let i=g.slice(),[a]=i.splice(n,1);i.splice(r,0,a),await T(i,`Moved item to position ${r+1}.`)}async function T(e,t){g=e,y(),await o(g.map(e=>e.record.id)),O(t)}function E(){for(let e of g)e.previewUrl&&URL.revokeObjectURL(e.previewUrl)}function D(e){let t=document.getElementById(e);if(!t)throw Error(`Missing reorder element #${e}`);return t}function O(e){m.textContent=e}function k(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}