// Applies the narrow demo integration to the original deployment blob.
// Usage: node erp/integrate.mjs path/to/original.js
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source = readFileSync(process.argv[2]);
const hash = createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex');
if (hash !== 'b244b44a698a9fba0ac5ef40028e606bc04d9d00') throw new Error('Unexpected original frontend build.');
let code = source.toString('utf8');
function patch(before,after) {
  if (!code.includes(before) || code.indexOf(before)!==code.lastIndexOf(before)) throw new Error('Original integration point changed: '+before.slice(0,90));
  code=code.replace(before,after);
}
code='import {createWorkspaceStore as erpStore,makeERPComponents as erpComponents} from "/erp/app.mjs";\n'+code;
const start=code.indexOf('function Mfe({children:e})');
const end=code.indexOf('function Ml()',start);
patch(code.slice(start,end), 'const erpDemoRepository=erpStore(Xj);function Mfe({children:e}){const t=_.useSyncExternalStore(erpDemoRepository.subscribe,erpDemoRepository.get),r=_.useMemo(()=>({data:t,repository:erpDemoRepository,...erpDemoRepository}),[t]);return o.jsx(nV.Provider,{value:r,children:e})}');
patch('Dfe=e=>e==="/"?"/demo":`/demo${e}`','Dfe=e=>e==="/"?"/demo/dashboard":`/demo${e}`');
patch('children:c2.map(t=>o.jsxs','children:[o.jsx(OF,{to:"/demo",end:!0,onClick:e,className:"block rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white",children:"Main Menu"},"erp-menu"),...c2.map(t=>o.jsxs');
patch('},n.to)})})]},t.label))}),o.jsxs("div",{className:"border-t border-sidebar-border','},n.to)})})]},t.label))]}),o.jsxs("div",{className:"border-t border-sidebar-border');
patch('Illustrative sample data. Nothing here is saved or connected to a real company.','Demonstration data is saved in this browser.');
patch('o.jsxs(ti,{to:"/login",className:"h-9 w-full rounded-lg','o.jsxs("a",{href:"/login",className:"h-9 w-full rounded-lg');
patch('i=r?XU[`/${r}`]||"Demo":"Executive Dashboard"','i=r==="dashboard"?"Executive Dashboard":r==="operations"?"ERP Operations":r?XU[`/${r}`]||"Demo":"Main Menu"');
patch('o.jsx(ti,{to:"/login",className:"h-8 px-3 rounded-lg border border-border text-[11px] font-semibold inline-flex items-center gap-1.5 text-foreground/80 hover:text-brand hover:border-brand/30 transition",children:"Sign in"})','o.jsx(erpUI.TopBar,{})');
patch('children:o.jsx(Mfe,{children:o.jsx($k,{})})','children:o.jsx($k,{})');
patch('const t=mv(e).filter(n=>n.status!=="cancelled")','const t=mv(e).filter(n=>!["cancelled","draft"].includes(n.status))');
patch('const t=mv(e).filter(x=>x.status!=="cancelled")','const t=mv(e).filter(x=>!["cancelled","draft"].includes(x.status))');
patch('Tfe=e=>Math.max(0,Number(e.total||0)-Number(e.amount_paid||0))','Tfe=e=>Math.max(0,Number(e.total||0)-Number(e.amount_paid||0)-Number(e.credit_total||0))');
patch('function e2e(){return o.jsx(kF,{children:o.jsxs(Ze,{element:o.jsx($fe,{}),children:[o.jsx(Ze,{index:!0,element:o.jsx(RPe,{})}),',
  'function e2e(){return o.jsxs(kF,{children:[o.jsx(Ze,{path:"login",element:o.jsx(Mfe,{children:o.jsx(erpUI.Login,{})})}),o.jsxs(Ze,{element:o.jsx(Mfe,{children:o.jsx($fe,{})}),children:[o.jsx(Ze,{index:!0,element:o.jsx(erpUI.Menu,{})}),o.jsx(Ze,{path:"dashboard",element:o.jsx(RPe,{})}),o.jsx(Ze,{path:"operations/:feature",element:o.jsx(erpUI.Operations,{})}),...["accounts","ledger","financials"].map(key=>o.jsx(Ze,{path:key,element:o.jsx(erpUI.Operations,{featureKey:key})},key)),');
patch('path:"*",element:o.jsx(NF,{to:"/demo",replace:!0})})]})})}let Ts',
  'path:"*",element:o.jsx(NF,{to:"/demo",replace:!0})})]})]})}let Ts');
patch('function JPe(){var L,$;const{data:e,add:t,update:n}=Ml()','function JPe(){var L,$;const{data:e,repository:erpRepository}=Ml()');
const posStart=code.indexOf('I=()=>{const M=r.trim();');
const posEnd=code.indexOf(';return o.jsxs',posStart);
patch(code.slice(posStart,posEnd),'I=()=>{try{const lines=d.map(x=>({product_id:x.product_id,name:x.name,sku:x.sku,quantity:x.quantity,unit_price:x.price,total:be(x.price*x.quantity)}));const result=erpRepository.pos({seller:r,branch:a,lines,method:p,tendered:Number(v)});b(result);h([]);w("");j("")}catch(error){j(error.message)}}');
patch('Opens the dashboard instantly — no account needed.','Open the isolated demo workspace.');
patch('if(!Kde()){window.location.href="/demo";return}y(Yj,p)','window.location.href="/demo/login"');
patch('function DOe(){return','const erpUI=erpComponents({React:_,Link:ti,useLocation:ai,useNavigate:Bu,useParams:()=>({feature:ai().pathname.split("/").filter(Boolean).at(-1)}),useDemo:Ml,Heading:Et});function DOe(){if(/^\\/demo(?:\\/|$)/.test(window.location.pathname))return o.jsx(uX,{children:o.jsx(kF,{children:o.jsx(Ze,{path:"/demo/*",element:o.jsx(e2e,{})})})});return');
code=code.replaceAll('Nothing is saved; reload to start again.','Changes are saved in this browser.').replaceAll('Nothing is saved: reload to start again.','Changes are saved in this browser.').replaceAll('Nothing is saved.','Changes are saved in this browser.');
patch('async function BPe({document:e,kind:t,currency:n="QAR",company:r={},filename:i}){var v;',
  'async function BPe({document:e,kind:t,currency:n="QAR",company:r={},filename:i}){if(/^\\/demo(?:\\/|$)/.test(window.location.pathname)&&["127.0.0.1","localhost"].includes(window.location.hostname))return LPe({document:e,kind:t,currency:n,company:r});var v;');
patch('function d9({document:e,kind:t,currency:n="QAR",company:r={}}){const i=',
  'function d9({document:e,kind:t,currency:n="QAR",company:r={}}){if(/^\\/demo(?:\\/|$)/.test(window.location.pathname)){const escape=x=>typeof x==="string"?x.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll(String.fromCharCode(34),"&quot;"):Array.isArray(x)?x.map(escape):x&&typeof x==="object"?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,escape(v)])):x;e=escape(e);r=escape(r);n=/^[A-Z]{3}$/.test(n)?n:"QAR"}const i=');
writeFileSync(new URL('../index-B4sSgSHQ.js',import.meta.url),code);
