var content=(function(){function e(e){return e}var t=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,n=`hideAfterCapture`,r=`suppressHoverState`;async function i(){let e=(await t.storage.local.get(n))[n];return typeof e==`boolean`?e:(await t.storage.local.set({[n]:!0}),!0)}async function a(){let e=(await t.storage.local.get(r))[r];return typeof e==`boolean`?e:(await t.storage.local.set({[r]:!0}),!0)}var o=`blur(8px)`,s=e({registration:`runtime`,main(){let e=window.__motionElementCaptureController__??c();window.__motionElementCaptureController__=e,e.mount()}});function c(){let e=!1,n=`capture`,r=!1,s=!1,c=[],m=0,S=null,C=null,D=null,O=null,k=null,A=null,j=!1,M=new Map,N=[],P=(e,t,n)=>te(e)?(ie(e).then(n).catch(t=>{console.error(`Content script message handler failed.`,{type:e.type,error:t}),n({ok:!1,error:E(t)})}),!0):!1;function re(){r||=(Z(),document.addEventListener(`mousedown`,I,!0),document.addEventListener(`mouseup`,I,!0),document.addEventListener(`mousemove`,oe,!0),document.addEventListener(`click`,I,!0),document.addEventListener(`click`,R,!0),document.addEventListener(`dblclick`,I,!0),document.addEventListener(`auxclick`,I,!0),document.addEventListener(`keydown`,z,!0),window.addEventListener(`scroll`,H,!0),window.addEventListener(`resize`,H,!0),t.runtime.onMessage.addListener(P),!0)}async function ie(t){switch(t.type){case`START_SELECTION`:return ae(t.mode),{ok:!0,data:{active:!0}};case`STOP_SELECTION`:return F(),{ok:!0,data:{active:!1}};case`GET_SELECTION_STATE`:return{ok:!0,data:{active:e,mode:n}};case`PREPARE_SCREENSHOT`:return se();case`RESTORE_SCREENSHOT`:return ce(),{ok:!0,data:{active:e,mode:n}}}}function ae(t){if(e=!0,n=t,s=!1,t===`edit`){U(),W(),G(w(t));return}q(),Z(),G(w(t)),A?(L(A.x,A.y),H()):U()}function F(){e=!1,s=!1,q(),c=[],m=0,U(),W()}function oe(t){A={x:t.clientX,y:t.clientY},!(!e||s||n===`edit`)&&L(t.clientX,t.clientY)}function I(t){if(!e||n!==`edit`||he(t.target)||(t.stopPropagation(),t.stopImmediatePropagation(),(t.type===`click`||t.type===`dblclick`||t.type===`auxclick`)&&t.preventDefault(),t.type!==`click`))return;let r=x(t.target);if(!r){G(`No editable text node found here.`,`error`);return}ue(r,t)}function L(e,t){let n=document.elementFromPoint(e,t);if(!(n instanceof Element)||$(n)){U();return}c=l(n),m=0,H()}async function R(r){if(!e||s||n===`edit`)return;let o=Q();if(!o)return;r.preventDefault(),r.stopPropagation(),r.stopImmediatePropagation();let c=u(o);s=!0,U(),W();let l=!1;try{if(n===`hide`){if(!J(o,crypto.randomUUID(),`hide`,g(o))){G(`This element cannot be hidden safely.`,`error`);return}l=!0,G(`Hidden ${g(o)}.`,`success`)}else if(n===`blur`){if(!J(o,crypto.randomUUID(),`blur`,g(o))){G(`This element cannot be blurred safely.`,`error`);return}l=!0,G(`Blurred ${g(o)}.`,`success`)}else if(n===`text`){let e=await fe(o);if(!e)return;let n=await t.runtime.sendMessage({type:`SAVE_TEXT_FRAGMENT`,fragment:e.fragment});if(!n?.ok){G(n?.error??`Text fragment save failed.`,`error`);return}if(e.hideFragment){if(!Y(e.range,crypto.randomUUID(),e.fragment.fragmentText)){G(`Saved text fragment, but could not hide it in place.`,`error`);return}l=!0}G(`Saved text fragment ${n.data.fragment.fragmentText}.`,`success`)}else{let e=_(c);if(e){G(e,`error`);return}await a()&&K(!0),await v();let n=await t.runtime.sendMessage({type:`CAPTURE_ELEMENT`,selection:c});if(!n?.ok){G(n?.error??`Capture failed.`,`error`);return}await i()&&(J(o,n.data.capture.id,`capture`,n.data.capture.elementLabel),l=!0),G(`Captured ${n.data.capture.elementLabel}.`,`success`)}}catch(e){G(E(e),`error`)}finally{K(!1),s=!1,l&&A?L(A.x,A.y):H()}}function z(t){if(!(!e||s)){if(n===`edit`){if(t.key===`Escape`){t.preventDefault(),t.stopPropagation(),F();return}(t.key===`Enter`||t.key===` `)&&t.target instanceof Element&&t.target.closest(`a, button, summary, [role="button"]`)&&!(t.target instanceof HTMLElement&&t.target.isContentEditable)&&(t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation());return}if(t.key===`Escape`){t.preventDefault(),t.stopPropagation(),F();return}if(t.key===`[`){t.preventDefault(),t.stopPropagation(),B();return}if(y(t)){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation(),de();return}t.key===`]`&&(t.preventDefault(),t.stopPropagation(),V())}}function B(){c.length!==0&&(m=Math.min(m+1,c.length-1),H())}function V(){c.length!==0&&(m=Math.max(m-1,0),H())}function H(){if(!e||s||j||n===`edit`){U();return}let t=Q();if(!t||!t.isConnected){U();return}let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0){U();return}if(Z(),!S||!C)return;S.hidden=!1,C.hidden=!1,S.style.left=`${r.left}px`,S.style.top=`${r.top}px`,S.style.width=`${r.width}px`,S.style.height=`${r.height}px`;let i=`${t.tagName.toLowerCase()} · ${Math.round(r.width)}×${Math.round(r.height)} · ${g(t)}`;C.textContent=i;let a=r.top>36?r.top-32:Math.min(r.bottom+8,window.innerHeight-28),o=T(r.left,8,Math.max(8,window.innerWidth-240));C.style.top=`${a}px`,C.style.left=`${o}px`}function U(){S?.setAttribute(`hidden`,`true`),C?.setAttribute(`hidden`,`true`)}function W(){D?.setAttribute(`hidden`,`true`)}function G(e,t=`info`){Z(),D&&(D.hidden=!1,D.textContent=e,D.dataset.tone=t)}function K(e){le(),document.documentElement.toggleAttribute(`data-motion-capture-freeze`,e)}async function se(){j=!0,U(),W(),await v();let e=d();return{ok:!0,data:{pageUrl:window.location.href,pageTitle:document.title,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,documentWidth:e.documentWidth,documentHeight:e.documentHeight,bodyWidth:e.bodyWidth,bodyHeight:e.bodyHeight,scrollX:window.scrollX,scrollY:window.scrollY,devicePixelRatio:window.devicePixelRatio}}}function ce(){j=!1,H()}function le(){O||(O=document.createElement(`style`),O.id=`__motion-element-capture-freeze-style`,O.textContent=`
      html[data-motion-capture-freeze] body,
      html[data-motion-capture-freeze] body * {
        pointer-events: none !important;
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `,document.documentElement.append(O))}function ue(e,t){M.has(e)||(M.set(e,e.getAttribute(`contenteditable`)),e.setAttribute(`contenteditable`,`plaintext-only`),e.spellcheck=!1),e.focus({preventScroll:!0}),ne(e,t.clientX,t.clientY),G(`Editing ${g(e)}.`,`info`)}function q(){for(let[e,t]of M.entries())e.isConnected&&(t==null?e.removeAttribute(`contenteditable`):e.setAttribute(`contenteditable`,t));M.clear()}async function de(){let e=N[N.length-1];if(e?.source===`hide`||e?.source===`blur`||e?.source===`text-fragment`){X(e.actionId),A?L(A.x,A.y):H(),G(`Restored ${e.label}.`,`success`);return}try{let e=await t.runtime.sendMessage({type:`UNDO_LAST_CAPTURE`});if(!e?.ok){G(e?.error??`Undo failed.`,`error`);return}X(e.data.removedId),A?L(A.x,A.y):H(),G(`Removed ${e.data.removedLabel}. ${e.data.count} capture${e.data.count===1?``:`s`} left.`,`success`)}catch(e){G(E(e),`error`)}}function J(e,t,n,r){let i=b(e);return i?(N.push({actionId:t,source:n,label:r,element:i,previousVisibility:i.style.getPropertyValue(`visibility`),previousPriority:i.style.getPropertyPriority(`visibility`),previousFilter:i.style.getPropertyValue(`filter`),previousFilterPriority:i.style.getPropertyPriority(`filter`),unwrapOnRestore:!1}),n===`blur`?i.style.setProperty(`filter`,o,`important`):i.style.setProperty(`visibility`,`hidden`,`important`),!0):!1}function Y(e,t,n){let r=document.createElement(`span`);r.dataset.motionCaptureFragmentHidden=t,r.style.setProperty(`visibility`,`hidden`,`important`);try{let i=e.extractContents();return r.append(i),e.insertNode(r),N.push({actionId:t,source:`text-fragment`,label:n,element:r,previousVisibility:``,previousPriority:``,previousFilter:``,previousFilterPriority:``,unwrapOnRestore:!0}),!0}catch{return!1}}function X(e){for(let t=N.length-1;t>=0;--t){let n=N[t];if(n.actionId===e){if(N.splice(t,1),!n.element.isConnected)return;if(n.unwrapOnRestore){let e=n.element.parentNode;if(!e)return;for(;n.element.firstChild;)e.insertBefore(n.element.firstChild,n.element);e.removeChild(n.element);return}n.previousVisibility?n.element.style.setProperty(`visibility`,n.previousVisibility,n.previousPriority):n.element.style.removeProperty(`visibility`),n.previousFilter?n.element.style.setProperty(`filter`,n.previousFilter,n.previousFilterPriority):n.element.style.removeProperty(`filter`);return}}}async function fe(e){let t=f(e);if(t.length===0)return G(`No selectable text was found in this element.`,`error`),null;let n=t.map(e=>e.text).join(``),r=await pe({fullText:n,defaultFragment:p(n)});if(r.fragmentText==null)return G(`Text fragment capture cancelled.`,`info`),null;let i=r.fragmentText.trim();if(!i)return G(`Enter a non-empty text fragment.`,`error`),null;let a=n.indexOf(i);if(a===-1)return G(`That exact fragment was not found in the clicked element.`,`error`),null;let o=a+i.length,s=ee(t,a,o),c=s.getBoundingClientRect();if(c.width<=0||c.height<=0)return G(`The selected text fragment has no measurable size.`,`error`),null;let l=h(s,e),u=getComputedStyle(l),m=d(),_=Array.from(s.getClientRects()).map(e=>({viewportX:e.left,viewportY:e.top,pageX:e.left+window.scrollX,pageY:e.top+window.scrollY,width:e.width,height:e.height}));return{fragment:{kind:`text-fragment`,pageUrl:window.location.href,pageTitle:document.title,tagName:e.tagName.toLowerCase(),elementLabel:g(e),viewportX:c.left,viewportY:c.top,pageX:c.left+window.scrollX,pageY:c.top+window.scrollY,width:c.width,height:c.height,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,documentWidth:m.documentWidth,documentHeight:m.documentHeight,bodyWidth:m.bodyWidth,bodyHeight:m.bodyHeight,scrollX:window.scrollX,scrollY:window.scrollY,devicePixelRatio:window.devicePixelRatio,fullText:n,fragmentText:i,fragmentStart:a,fragmentEnd:o,fragmentRects:_,fontFamily:u.fontFamily,fontSize:u.fontSize,fontWeight:u.fontWeight,fontStyle:u.fontStyle,lineHeight:u.lineHeight,letterSpacing:u.letterSpacing,color:u.color,textAlign:u.textAlign,textTransform:u.textTransform,textDecoration:u.textDecoration},range:s,hideFragment:r.hideFragment}}function Z(){S||(S=document.createElement(`div`),S.id=`__motion-element-capture-overlay`,Object.assign(S.style,{position:`fixed`,zIndex:`2147483646`,pointerEvents:`none`,border:`2px solid #0f172a`,borderRadius:`10px`,boxShadow:`0 0 0 9999px rgba(15, 23, 42, 0.12)`,background:`rgba(255, 255, 255, 0.1)`,display:`block`}),S.hidden=!0,document.documentElement.append(S)),C||(C=document.createElement(`div`),C.id=`__motion-element-capture-label`,Object.assign(C.style,{position:`fixed`,zIndex:`2147483647`,pointerEvents:`none`,maxWidth:`240px`,padding:`6px 10px`,borderRadius:`999px`,background:`#0f172a`,color:`#f8fafc`,font:`600 12px/1.2 "IBM Plex Sans", "Segoe UI", sans-serif`,whiteSpace:`nowrap`,overflow:`hidden`,textOverflow:`ellipsis`,boxShadow:`0 12px 32px rgba(15, 23, 42, 0.32)`}),C.hidden=!0,document.documentElement.append(C)),D||(D=document.createElement(`div`),D.id=`__motion-element-capture-toast`,Object.assign(D.style,{position:`fixed`,right:`16px`,bottom:`16px`,zIndex:`2147483647`,pointerEvents:`none`,maxWidth:`360px`,padding:`10px 14px`,borderRadius:`14px`,background:`rgba(15, 23, 42, 0.94)`,color:`#f8fafc`,font:`500 13px/1.35 "IBM Plex Sans", "Segoe UI", sans-serif`,boxShadow:`0 16px 40px rgba(15, 23, 42, 0.35)`}),D.hidden=!0,document.documentElement.append(D))}async function pe({fullText:e,defaultFragment:t}){return me(),new Promise(n=>{let r=document.createElement(`div`);r.id=`__motion-element-capture-text-modal`,Object.assign(r.style,{position:`fixed`,inset:`0`,zIndex:`2147483647`,display:`flex`,alignItems:`center`,justifyContent:`center`,padding:`20px`,background:`rgba(2, 6, 23, 0.6)`,backdropFilter:`blur(8px)`});let i=document.createElement(`div`);i.setAttribute(`role`,`dialog`),i.setAttribute(`aria-modal`,`true`),Object.assign(i.style,{width:`min(520px, 100%)`,maxHeight:`min(80vh, 720px)`,overflow:`auto`,borderRadius:`18px`,background:`#0f172a`,color:`#e2e8f0`,border:`1px solid rgba(148, 163, 184, 0.22)`,boxShadow:`0 30px 80px rgba(2, 6, 23, 0.45)`,fontFamily:`"IBM Plex Sans", "Segoe UI", sans-serif`}),i.innerHTML=`
        <div class="motion-text-modal__header">
          <div>
            <p class="motion-text-modal__eyebrow">Text Fragment</p>
            <h2 class="motion-text-modal__title">Measure the exact text you want to animate</h2>
          </div>
          <button class="motion-text-modal__close" type="button" data-role="cancel" aria-label="Close">×</button>
        </div>
        <div class="motion-text-modal__body">
          <label class="motion-text-modal__field">
            <span class="motion-text-modal__label">Detected full text</span>
            <textarea class="motion-text-modal__textarea" data-role="full-text" readonly></textarea>
          </label>
          <label class="motion-text-modal__field">
            <span class="motion-text-modal__label">Fragment to export</span>
            <input class="motion-text-modal__input" data-role="fragment-input" type="text" />
            <span class="motion-text-modal__hint">Use the exact visible substring, for example <code>INV-2048</code>, <code>Alex Morgan</code>, or <code>Paid</code>.</span>
          </label>
          <label class="motion-text-modal__toggle">
            <input data-role="hide-fragment" type="checkbox" checked />
            <span>Hide this fragment on the page after saving it, while keeping layout space intact.</span>
          </label>
          <details class="motion-text-modal__help" open>
            <summary>Help</summary>
            <div class="motion-text-modal__help-copy">
              <p><strong>Detected full text</strong> shows the raw text found inside the element you clicked. Use it to verify the fragment exists exactly as typed.</p>
              <p><strong>Fragment to export</strong> should contain only the changing or animatable part of the label. Examples: from <code>Invoice INV-2048</code>, export <code>INV-2048</code>; from <code>Assigned to Alex Morgan</code>, export <code>Alex Morgan</code>; from <code>Status: Paid</code>, export <code>Paid</code>.</p>
              <p><strong>Hide after save</strong> wraps only the selected substring and applies <code>visibility: hidden</code>, so surrounding text and layout stay in place.</p>
              <p><strong>What gets saved</strong>: exact fragment bounds, per-line rects, page coordinates, and typography styles such as font family, size, weight, line height, letter spacing, color, alignment, and decoration.</p>
            </div>
          </details>
        </div>
        <div class="motion-text-modal__footer">
          <button class="motion-text-modal__button motion-text-modal__button--secondary" type="button" data-role="cancel">Cancel</button>
          <button class="motion-text-modal__button motion-text-modal__button--primary" type="button" data-role="save">Save fragment</button>
        </div>
      `;let a=i.querySelector(`[data-role="full-text"]`),o=i.querySelector(`[data-role="fragment-input"]`),s=i.querySelector(`[data-role="hide-fragment"]`),c=i.querySelector(`[data-role="save"]`),l=i.querySelectorAll(`[data-role="cancel"]`);if(!a||!o||!s||!c){n({fragmentText:null,hideFragment:!1});return}a.value=e,o.value=t;let u=()=>{r.remove(),document.removeEventListener(`keydown`,f,!0)},d=e=>{u(),n({fragmentText:e,hideFragment:s.checked})},f=e=>{e.key===`Escape`&&(e.preventDefault(),d(null))};c.addEventListener(`click`,()=>d(o.value));for(let e of l)e.addEventListener(`click`,()=>d(null));r.addEventListener(`click`,e=>{e.target===r&&d(null)}),document.addEventListener(`keydown`,f,!0),r.append(i),document.documentElement.append(r),o.focus(),o.select()})}function me(){k||(k=document.createElement(`style`),k.id=`__motion-element-capture-modal-style`,k.textContent=`
      #__motion-element-capture-text-modal .motion-text-modal__header,
      #__motion-element-capture-text-modal .motion-text-modal__footer,
      #__motion-element-capture-text-modal .motion-text-modal__body {
        padding: 18px 20px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }

      #__motion-element-capture-text-modal .motion-text-modal__eyebrow {
        margin: 0 0 4px;
        color: #86efac;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #__motion-element-capture-text-modal .motion-text-modal__title {
        margin: 0;
        font-size: 20px;
        line-height: 1.15;
      }

      #__motion-element-capture-text-modal .motion-text-modal__close {
        border: 0;
        background: transparent;
        color: #94a3b8;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
      }

      #__motion-element-capture-text-modal .motion-text-modal__body {
        display: grid;
        gap: 16px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__field {
        display: grid;
        gap: 8px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__label {
        font-size: 13px;
        font-weight: 700;
      }

      #__motion-element-capture-text-modal .motion-text-modal__textarea,
      #__motion-element-capture-text-modal .motion-text-modal__input {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.75);
        color: #f8fafc;
        padding: 12px 14px;
        font: 500 14px/1.4 "IBM Plex Sans", "Segoe UI", sans-serif;
      }

      #__motion-element-capture-text-modal .motion-text-modal__textarea {
        min-height: 88px;
        resize: vertical;
      }

      #__motion-element-capture-text-modal .motion-text-modal__hint {
        color: #94a3b8;
        font-size: 12px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help {
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(15, 23, 42, 0.55);
        padding: 12px 14px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help summary {
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help-copy {
        margin-top: 10px;
        display: grid;
        gap: 10px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.45;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help-copy p {
        margin: 0;
      }

      #__motion-element-capture-text-modal .motion-text-modal__footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }

      #__motion-element-capture-text-modal .motion-text-modal__button {
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        font: 700 13px/1 "IBM Plex Sans", "Segoe UI", sans-serif;
        cursor: pointer;
      }

      #__motion-element-capture-text-modal .motion-text-modal__button--secondary {
        background: rgba(148, 163, 184, 0.12);
        color: #e2e8f0;
      }

      #__motion-element-capture-text-modal .motion-text-modal__button--primary {
        background: #22c55e;
        color: #052e16;
      }
    `,document.documentElement.append(k))}function Q(){return c[m]??null}function $(e){return e===S||e===C||e===D||S?.contains(e)===!0||C?.contains(e)===!0||D?.contains(e)===!0}function he(e){return e instanceof Element&&$(e)}return{mount:re}}function l(e){let t=[],n=e;for(;n;)t.push(n),n=n.parentElement;return t}function u(e){let t=e.getBoundingClientRect(),n=d();return{tagName:e.tagName.toLowerCase(),elementLabel:g(e),pageUrl:window.location.href,pageTitle:document.title,viewportX:t.left,viewportY:t.top,pageX:t.left+window.scrollX,pageY:t.top+window.scrollY,width:t.width,height:t.height,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,documentWidth:n.documentWidth,documentHeight:n.documentHeight,bodyWidth:n.bodyWidth,bodyHeight:n.bodyHeight,scrollX:window.scrollX,scrollY:window.scrollY,devicePixelRatio:window.devicePixelRatio}}function d(){let e=document.body,t=document.documentElement,n=e?Math.max(e.scrollWidth,e.offsetWidth,e.clientWidth):t.clientWidth,r=e?Math.max(e.scrollHeight,e.offsetHeight,e.clientHeight):t.clientHeight;return{bodyWidth:n,bodyHeight:r,documentWidth:Math.max(t.scrollWidth,t.offsetWidth,t.clientWidth,n),documentHeight:Math.max(t.scrollHeight,t.offsetHeight,t.clientHeight,r)}}function f(e){let t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),r=0,i=n.nextNode();for(;i;){if(i instanceof Text){let e=i.textContent??``;e.trim().length>0&&(t.push({node:i,text:e,start:r,end:r+e.length}),r+=e.length)}i=n.nextNode()}return t}function p(e){let t=e.match(/\d[\d.,]*/);return t?.[0]?t[0]:e.trim()}function ee(e,t,n){let r=document.createRange(),i=m(e,t),a=m(e,n);return r.setStart(i.node,i.offset),r.setEnd(a.node,a.offset),r}function m(e,t){for(let n of e)if(t<=n.end)return{node:n.node,offset:T(t-n.start,0,n.text.length)};let n=e[e.length-1];return{node:n.node,offset:n.text.length}}function h(e,t){return e.startContainer instanceof Element?e.startContainer:e.startContainer.parentElement??t}function g(e){if(e.id)return`#${e.id}`;let t=Array.from(e.classList).filter(Boolean).slice(0,2);if(t.length>0)return`.${t.join(`.`)}`;let n=(e instanceof HTMLElement&&e.innerText||e.textContent)?.replace(/\s+/g,` `).trim();return n?n.slice(0,40):e.tagName.toLowerCase()}function _(e){return e.width<=0||e.height<=0?`The selected element has no visible size.`:e.viewportX>=0&&e.viewportY>=0&&e.viewportX+e.width<=e.viewportWidth&&e.viewportY+e.height<=e.viewportHeight?null:`Scroll until the highlighted element is fully visible, then capture again.`}function te(e){return typeof e==`object`&&!!e&&`type`in e&&(e.type===`START_SELECTION`&&`mode`in e&&(e.mode===`capture`||e.mode===`hide`||e.mode===`blur`||e.mode===`text`||e.mode===`edit`)||e.type===`PREPARE_SCREENSHOT`||e.type===`RESTORE_SCREENSHOT`||e.type===`GET_SELECTION_STATE`||e.type===`STOP_SELECTION`)}function v(){return new Promise(e=>{requestAnimationFrame(()=>requestAnimationFrame(()=>e()))})}function y(e){return e.key.toLowerCase()===`z`&&(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey}function b(e){return`style`in e?e:null}function x(e){if(e instanceof HTMLElement&&e.isContentEditable)return e;let t=e instanceof Element?e:e instanceof Text?e.parentElement:null;for(;t&&t!==document.body&&t!==document.documentElement;){if(t instanceof HTMLElement&&S(t)&&C(t))return t;t=t.parentElement}return null}function S(e){return(e.innerText||e.textContent||``).trim().length>0}function C(e){if(e.closest(`[contenteditable="false"]`)||e.matches(`input, textarea, select, option`))return!1;let t=(e.innerText||e.textContent||``).trim().length;if(t===0||t>400)return!1;let n=e.getBoundingClientRect();return!(n.width<=0||n.height<=0)}function ne(e,t,n){let r=window.getSelection();if(!r)return;let i=null;if(typeof document.caretRangeFromPoint==`function`)i=document.caretRangeFromPoint(t,n);else if(typeof document.caretPositionFromPoint==`function`){let e=document.caretPositionFromPoint(t,n);e&&(i=document.createRange(),i.setStart(e.offsetNode,e.offset),i.collapse(!0))}if(i&&e.contains(i.startContainer)){r.removeAllRanges(),r.addRange(i);return}let a=document.createRange();a.selectNodeContents(e),a.collapse(!1),r.removeAllRanges(),r.addRange(a)}function w(e){return e===`hide`?`Hide mode is active. Hover, click to hide, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.`:e===`blur`?`Blur mode is active. Hover, click to blur, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.`:e===`text`?`Text mode is active. Hover a text element, click it, enter the exact fragment to measure, then export the saved text metadata for Remotion.`:e===`edit`?`Free text editor is active. Click any text host on the page and type to edit it directly. Page click handlers are suppressed. Press Esc or Stop to leave edit mode.`:`Selection mode is active. Hover, click to capture, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.`}function T(e,t,n){return Math.min(Math.max(e,t),n)}function E(e){return e instanceof Error?e.message:typeof e==`string`?e:`An unexpected capture error occurred.`}var D={debug:(...e)=>(console.debug,[...e],void 0),log:(...e)=>(console.log,[...e],void 0),warn:(...e)=>(console.warn,[...e],void 0),error:(...e)=>(console.error,[...e],void 0)},O=class e extends Event{static EVENT_NAME=k(`wxt:locationchange`);constructor(t,n){super(e.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};function k(e){return`${t?.runtime?.id}:content:${e}`}var A=typeof globalThis.navigation?.addEventListener==`function`;function j(e){let t,n=!1;return{run(){n||(n=!0,t=new URL(location.href),A?globalThis.navigation.addEventListener(`navigate`,e=>{let n=new URL(e.destination.url);n.href!==t.href&&(window.dispatchEvent(new O(n,t)),t=n)},{signal:e.signal}):e.setInterval(()=>{let e=new URL(location.href);e.href!==t.href&&(window.dispatchEvent(new O(e,t)),t=e)},1e3))}}}var M=class e{static SCRIPT_STARTED_MESSAGE_TYPE=k(`wxt:content-script-started`);id;abortController;locationWatcher=j(this);constructor(e,t){this.contentScriptName=e,this.options=t,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return t.runtime?.id??this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener(`abort`,e),()=>this.signal.removeEventListener(`abort`,e)}block(){return new Promise(()=>{})}setInterval(e,t){let n=setInterval(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearInterval(n)),n}setTimeout(e,t){let n=setTimeout(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearTimeout(n)),n}requestAnimationFrame(e){let t=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(t)),t}requestIdleCallback(e,t){let n=requestIdleCallback((...t)=>{this.signal.aborted||e(...t)},t);return this.onInvalidated(()=>cancelIdleCallback(n)),n}addEventListener(e,t,n,r){t===`wxt:locationchange`&&this.isValid&&this.locationWatcher.run(),e.addEventListener?.(t.startsWith(`wxt:`)?k(t):t,n,{...r,signal:this.signal})}notifyInvalidated(){this.abort(`Content script context invalidated`),D.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(e.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),window.postMessage({type:e.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},`*`)}verifyScriptStartedEvent(e){let t=e.detail?.contentScriptName===this.contentScriptName,n=e.detail?.messageId===this.id;return t&&!n}listenForNewerScripts(){let t=e=>{!(e instanceof CustomEvent)||!this.verifyScriptStartedEvent(e)||this.notifyInvalidated()};document.addEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t))}},N={debug:(...e)=>(console.debug,[...e],void 0),log:(...e)=>(console.log,[...e],void 0),warn:(...e)=>(console.warn,[...e],void 0),error:(...e)=>(console.error,[...e],void 0)};return(async()=>{try{let{main:e,...t}=s;return await e(new M(`content`,t))}catch(e){throw N.error(`The content script "content" crashed on startup!`,e),e}})()})();
content;