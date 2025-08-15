// util.js - hjälpfunktioner
export function q(sel, root=document){ return root.querySelector(sel); }
export function el(tag, attrs={}){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){ if(k==='text') e.textContent=v; else e.setAttribute(k,v); }
  return e;
}
