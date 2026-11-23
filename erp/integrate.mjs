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
patch('children:c2.map(t=>o.jsxs','children:erpUI.sidebarSections.map(t=>o.jsxs');
patch('},n.to)})})]},t.label))}),o.jsxs("div",{className:"border-t border-sidebar-border','},n.to)})}),o.jsx(erpUI.SidebarFunctions,{group:t.label,onNavigate:e})]},t.label))}),o.jsxs("div",{className:"border-t border-sidebar-border');
const shellStart=code.indexOf('function $fe()');
const shellEnd=code.indexOf('function Et(',shellStart);
const shell=code.slice(shellStart,shellEnd);
patch(shell,shell
  .replace('n=ai()','erpGrid=Ml().data.profile.navigation==="grid",n=ai()')
  .replace('children:[o.jsx("aside"','children:[!erpGrid&&o.jsx("aside"')
  .replace('children:o.jsx(YM,{})}),e&&','children:o.jsx(YM,{})}),!erpGrid&&e&&')
  .replace('className:"lg:pl-[246px]"','className:erpGrid?"":"lg:pl-[246px]"')
  .replace('o.jsx("button",{onClick:()=>t(!0),className:"lg:hidden','!erpGrid&&o.jsx("button",{onClick:()=>t(!0),className:"lg:hidden'));
patch('function RPe(){const{data:e}=Ml(),t=_.useMemo(()=>eV(e),[e]);','function RPe(){const{data}=Ml(),snapshot=_.useMemo(()=>erpUI.dashboardSnapshot(data),[data]),e=snapshot.data,t=_.useMemo(()=>eV(e),[e]);');
patch('subtitle:`Consolidated performance across all ${e.branches.length} Al Batra branches.`','subtitle:snapshot.scope?`Performance for ${e.branches[0].name}.`:`Consolidated performance across ${e.branches.length} Al Batra branches.`');
patch('children:"Live sandbox — every figure below is calculated from the records in this demo. Add or edit an order, invoice or part and watch the numbers move."','children:"Figures reflect the current catalogue, stock, invoice and purchase records in this demo."');
patch('o.jsx(Bfe,{view:t}),o.jsx(APe,{view:t}),o.jsx(TPe,{view:t})','data.profile.navigation==="grid"&&o.jsx(erpUI.WorkspaceGrid,{}),o.jsx(Bfe,{view:t}),o.jsx(erpUI.DashboardOverview,{snapshot}),o.jsx(APe,{view:t}),o.jsx(TPe,{view:t})');
patch('n.filter(x=>Number(x.available)<=Number(x.reorder_level))','n.filter(x=>Number(x.reorder_level)>0&&Number(x.available)<=Number(x.reorder_level))');
patch('l=t.map(x=>x.invoice_date).filter(Boolean).sort().pop(),u=l?new Date(new Date(l).getTime()-6*864e5).toISOString().slice(0,10):"",d=$c(t.filter(x=>x.invoice_date>=u),x=>x.total)','l=ct(),u=new Date(new Date(l).getTime()-6*864e5).toISOString().slice(0,10),d=$c(t.filter(x=>x.invoice_date>=u&&x.invoice_date<=l),x=>x.total)');
patch('const w={};e.purchases.filter(x=>x.status!=="cancelled")','const w={};e.purchases.filter(x=>!["cancelled","draft"].includes(x.status))');
patch('const j=QM(x.expected_date);j&&(w[j]', 'const j=QM(x.received_date||x.order_date||x.date||x.expected_date);j&&(w[j]');
patch('Illustrative sample data. Nothing here is saved or connected to a real company.','Demonstration data is saved in this browser.');
patch('o.jsxs(ti,{to:"/login",className:"h-9 w-full rounded-lg','o.jsxs("a",{href:"/login",className:"h-9 w-full rounded-lg');
patch('i=r?XU[`/${r}`]||"Demo":"Executive Dashboard"','i=erpUI.titleFor(n.pathname)||(r==="dashboard"?"Executive Dashboard":r?XU[`/${r}`]||"Demo":"Executive Dashboard")');
patch('o.jsx(ti,{to:"/login",className:"h-8 px-3 rounded-lg border border-border text-[11px] font-semibold inline-flex items-center gap-1.5 text-foreground/80 hover:text-brand hover:border-brand/30 transition",children:"Sign in"})','o.jsx(erpUI.TopBar,{})');
patch('children:o.jsx(Mfe,{children:o.jsx($k,{})})','children:o.jsx($k,{})');
patch('className:"mt-1 text-sm text-muted-foreground max-w-2xl",children:t})]}),r&&o.jsx("div",{className:"flex flex-wrap items-center gap-2",children:r})]})}function Lfe',
  'className:"mt-1 text-sm text-muted-foreground max-w-2xl",children:t}),o.jsx(erpUI.ContextActions,{})]}),r&&o.jsx("div",{className:"flex flex-wrap items-center gap-2",children:r})]})}function Lfe');
const originalGridStart=code.indexOf('function WPe(');
const originalGridEnd=code.indexOf('function BS(',originalGridStart);
const originalGrid=code.slice(originalGridStart,originalGridEnd);
const rowActionsStart=originalGrid.indexOf('render:k=>o.jsxs("div"');
const rowActionsEnd=originalGrid.indexOf('}],[y,b,i])',rowActionsStart);
const sampleActionStart=originalGrid.indexOf('children:[o.jsxs("button",{onClick:a');
const sampleActionEnd=originalGrid.indexOf('b&&o.jsxs("button",{onClick:()=>d(!0)',sampleActionStart);
patch(originalGrid,originalGrid
  .replace('remove:i,reset:a','repository:erpRepository')
  .replace('[s,l]=_.useState("")','[s,l]=_.useState(""),[archiveView,setArchiveView]=_.useState(!1)')
  .replace('const k=s.trim().toLowerCase();return k?y.rows.filter(E=>(y.searchKeys||[]).some(T=>String(E[T]??"").toLowerCase().includes(k))):y.rows},[y,s])','const k=s.trim().toLowerCase(),rows=y.rows.filter(E=>!b||((E.status==="archived")===archiveView));return k?rows.filter(E=>(y.searchKeys||[]).some(T=>String(E[T]??"").toLowerCase().includes(k))):rows},[y,s,b,archiveView])')
  .replace(originalGrid.slice(rowActionsStart,rowActionsEnd),'render:k=>o.jsx(erpUI.LegacyRowActions,{entity:y.kind,record:k,onEdit:()=>p(k)})')
  .replace('[y,b,i]','[y,b]')
  .replace(originalGrid.slice(sampleActionStart,sampleActionEnd),'children:[b&&o.jsx("button",{type:"button",onClick:()=>setArchiveView(!archiveView),className:"h-9 px-2.5 rounded-lg border border-border text-xs font-medium",children:archiveView?"Show active records":"Show archived"}),')
  .replace('b?k=>p(k):void 0','b?k=>erpUI.legacyCanEdit(y.kind,k)&&p(k):void 0')
  .replace('" Add ",b.noun','" New entry"'));
patch('mv=e=>e.invoices.map(t=>','mv=e=>e.invoices.filter(t=>t.status!=="archived").map(t=>');
patch('Rfe=e=>e.orders.filter(t=>!["draft","cancelled"].includes(t.status))','Rfe=e=>e.orders.filter(t=>!["draft","cancelled","archived"].includes(t.status))');
patch('const t=mv(e).filter(n=>n.status!=="cancelled")','const t=mv(e).filter(n=>!["cancelled","draft"].includes(n.status))');
patch('const t=mv(e).filter(x=>x.status!=="cancelled")','const t=mv(e).filter(x=>!["cancelled","draft"].includes(x.status))');
patch('Tfe=e=>Math.max(0,Number(e.total||0)-Number(e.amount_paid||0))','Tfe=e=>Math.max(0,Number(e.total||0)-Number(e.amount_paid||0)-Number(e.credit_total||0))');
patch('function e2e(){return o.jsx(kF,{children:o.jsxs(Ze,{element:o.jsx($fe,{}),children:[o.jsx(Ze,{index:!0,element:o.jsx(RPe,{})}),',
  'function e2e(){return o.jsxs(kF,{children:[o.jsx(Ze,{path:"login",element:o.jsx(Mfe,{children:o.jsx(erpUI.Login,{})})}),o.jsxs(Ze,{element:o.jsx(Mfe,{children:o.jsx($fe,{})}),children:[o.jsx(Ze,{index:!0,element:o.jsx(RPe,{})}),o.jsx(Ze,{path:"dashboard",element:o.jsx(RPe,{})}),o.jsx(Ze,{path:"operations/:feature",element:o.jsx(erpUI.Operations,{})}),...erpUI.routeEntries.map(([path,key])=>o.jsx(Ze,{path,element:o.jsx(erpUI.Operations,{featureKey:key})},path)),');
patch('path:"*",element:o.jsx(NF,{to:"/demo",replace:!0})})]})})}let Ts',
  'path:"*",element:o.jsx(NF,{to:"/demo",replace:!0})})]})]})}let Ts');
patch('function JPe(){var L,$;const{data:e,add:t,update:n}=Ml()','function JPe(){var L,$;const{data:e,repository:erpRepository}=Ml()');
const posStart=code.indexOf('I=()=>{const M=r.trim();');
const posEnd=code.indexOf(';return o.jsxs',posStart);
patch(code.slice(posStart,posEnd),'I=()=>{try{const lines=d.map(x=>({product_id:x.product_id,name:x.name,sku:x.sku,quantity:x.quantity,unit_price:x.price,total:be(x.price*x.quantity)}));const result=erpRepository.pos({seller:r,branch:a,lines,method:p,tendered:Number(v)});b(result);h([]);w("");j("")}catch(error){j(error.message)}}');
patch('Opens the dashboard instantly — no account needed.','Open the isolated demo workspace.');
patch('if(!Kde()){window.location.href="/demo";return}y(Yj,p)','window.location.href="/demo/login"');
patch('function DOe(){return','const erpUI=erpComponents({React:_,Link:ti,useLocation:ai,useNavigate:Bu,useParams:()=>({feature:ai().pathname.split("/").filter(Boolean).at(-1)}),useDemo:Ml,Heading:Et,LoginBrand:Poe,SidebarSections:[...c2.slice(0,4),{label:"Warehouse",items:[]},...c2.slice(4)],Icons:Ife});function DOe(){if(/^\\/demo(?:\\/|$)/.test(window.location.pathname))return o.jsx(uX,{children:o.jsx(kF,{children:o.jsx(Ze,{path:"/demo/*",element:o.jsx(e2e,{})})})});return');
code=code.replaceAll('Nothing is saved; reload to start again.','Changes are saved in this browser.').replaceAll('Nothing is saved: reload to start again.','Changes are saved in this browser.').replaceAll('Nothing is saved.','Changes are saved in this browser.');
patch('async function BPe({document:e,kind:t,currency:n="QAR",company:r={},filename:i}){var v;',
  'async function BPe({document:e,kind:t,currency:n="QAR",company:r={},filename:i}){if(/^\\/demo(?:\\/|$)/.test(window.location.pathname)&&["127.0.0.1","localhost"].includes(window.location.hostname))return LPe({document:e,kind:t,currency:n,company:r});var v;');
patch('function d9({document:e,kind:t,currency:n="QAR",company:r={}}){const i=',
  'function d9({document:e,kind:t,currency:n="QAR",company:r={}}){if(/^\\/demo(?:\\/|$)/.test(window.location.pathname)){const escape=x=>typeof x==="string"?x.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll(String.fromCharCode(34),"&quot;"):Array.isArray(x)?x.map(escape):x&&typeof x==="object"?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,escape(v)])):x;e=escape(e);r=escape(r);n=/^[A-Z]{3}$/.test(n)?n:"QAR"}const i=');
writeFileSync(new URL('../index-B4sSgSHQ.js',import.meta.url),code);
