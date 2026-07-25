import{l as r}from"./chunk-2FX4OA6Y.js";var c="/assets/items/unknown.svg";var l=(e,t)=>t||`/assets/items/${e}.png`;function n(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function d(e){let t=r(e);return t?l(e,t.iconPath):c}function u(e,t={}){let a=t.className??"item-icon",s=t.unknownClassName??"item-icon--unknown",i=d(e),o=!r(e);return`
    <img
      class="${n(a)}${o?` ${n(s)}`:""}"
      src="${n(i)}"
      alt=""
      width="32"
      height="32"
      loading="lazy"
      decoding="async"
      data-item-icon="true"
      data-item-id="${n(e)}"
      aria-hidden="true"
    />
  `}export{c as a,d as b,u as c};
