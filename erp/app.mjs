import {features,groups,numberOf} from './catalog.mjs';
import {canArchive,canEdit,createDemoRepository,dashboardSnapshot,find,isArchived,historicalPrice,invoiceBalance,knownStock,permittedActions,purchaseBalance,today} from './repository.mjs';
import {downloadCSV,mappingFields,previewWorkbook,readWorkbook,sheetHeaders} from './import.mjs';
import clientSheets from './client-catalogue.mjs';

export function createWorkspaceStore(seed) {
  const examples = seed();
  return createDemoRepository(seed,previewWorkbook(clientSheets,{},examples.products),undefined,{examples:true});
}
const money = (value,currency='QAR') => new Intl.NumberFormat('en-QA',{style:'currency',currency:/^[A-Z]{3}$/.test(currency)?currency:'QAR'}).format(Number(value)||0);
const branchName = (state,id)=>id==='IN-TRANSIT'?'In transit':find(state,'branches',id)?.name || id || '—';
const labelOf = (row,entity)=>entity==='products'?`${row.sku} · ${row.name}`:numberOf(row)===row.name?row.name:`${numberOf(row)}${row.customer_name||row.supplier_name||row.name?` · ${row.customer_name||row.supplier_name||row.name}`:''}`;
const entityDate = (row)=>row.date || row.invoice_date || row.order_date || row.quote_date || '';
const searchText = value=>String(value??'').toLowerCase().trim();
const aliases={customers:'customer-master',suppliers:'supplier-master',branches:'branch-master'};
const routeEntries=Object.keys(features).filter(key=>key!=='settings').map(key=>[aliases[key]||key,key]);
const routeFor=key=>`/demo/${aliases[key]||key}`;
const sidebarDomains={
  Catalogue:['Inventory'],
  Sales:['Sales','Quotations'],
  Procurement:['Purchases'],
  Warehouse:['Warehouse'],
  Relationships:['Customers','Suppliers'],
  Insights:['Reports'],
  Accounting:['Finance'],
  Administration:['Administration'],
};
// One navigation entry for each shared workflow. Existing URLs remain usable.
const duplicateWorkspacePaths=new Set(['/products','/quotations','/invoices','/purchases','/suppliers','/customers','/branches']);
const duplicateFeatureKeys=new Set([
  'settings','sales-invoice-remarks','quote-remarks','customer-classification','credit-limits','customer-history',
  'supplier-payments','supplier-receipts','supplier-debits','invoice-part-payments',
  'inventory-report','branch-quantities','item-transactions','item-history','financial-summary',
]);
const canonicalFeatures=entries=>entries.filter(entry=>!duplicateFeatureKeys.has(entry.key));
const workspaceRoutes={
  Inventory:'/demo/inventory',Sales:'/demo/invoices',Quotations:'/demo/quotations',Purchases:'/demo/purchases',
  Warehouse:'/demo/inventory',Customers:'/demo/customers',Suppliers:'/demo/suppliers',Finance:'/demo/ledger',
  Reports:'/demo/reports',Administration:'/demo/settings',
};
const related={
  '/demo/products':['items','prices','costs','import'],
  '/demo/inventory':['branch-stock','stock-receipts','stock-adjustments','transfers'],
  '/demo/quotations':['quotes','quote-approvals','quote-to-invoice'],
  '/demo/orders':['sales-invoices','deliveries','delivery-invoices'],
  '/demo/invoices':['sales-invoices','invoice-returns','customer-receipt-vouchers'],
  '/demo/purchases':['purchase-quotes','purchase-orders','purchase-receipts','purchase-returns'],
  '/demo/customers':['customers','customer-pricing','customer-statements','customer-lpos'],
  '/demo/suppliers':['suppliers','supplier-transactions','supplier-payment-vouchers'],
  '/demo/reports':['branch-stock','customer-outstanding','supplier-outstanding','financials'],
  '/demo/settings':['users','roles','numbering','import'],
};
const entrySources={
  stock:['stock-receipts','New stock receipt'],
  movements:['stock-adjustments','New stock adjustment'],
  journal:['journal-entries','New journal entry'],
  supersessions:['items','New item'],
  sales:['sales-invoices','New invoice'],
  purchases:['purchase-orders','New purchase order'],
  receivables:['customer-receipt-vouchers','New customer receipt'],
  payables:['supplier-payment-vouchers','New supplier payment'],
  financial:['journal-entries','New journal entry'],
  customerStatement:['customer-receipt-vouchers','New customer receipt'],
  customerHistory:['customer-receipt-vouchers','New customer receipt'],
  supplierHistory:['supplier-payment-vouchers','New supplier payment'],
  invoicedDeliveries:['deliveries','New delivery'],
  history:['stock-receipts','New stock receipt'],
};
const ordinaryColumns=[['number','Record'],['name','Name / description'],['account','Account / location'],['date','Date'],['status','Status'],['total','Total / qty']];
const displayStatus=value=>String(value||'').replaceAll('_',' ');
const emptyLine=()=>({product_id:'',quantity:'1',unit_price:''});

export function makeERPComponents({React,Link,useLocation,useNavigate,useParams,useDemo,Heading,LoginBrand,SidebarSections,Icons}) {
  const h=React.createElement;
  const sidebarSections=SidebarSections.map(group=>({...group,items:group.items.filter(item=>!duplicateWorkspacePaths.has(item.to))}));
  const {useState,useEffect,useMemo,useRef,useId}=React;
  const btn=(label,onClick,props={})=>h('button',{type:'button',className:'erp-button',onClick,...props},label);
  const primary=(label,onClick,props={})=>btn(label,onClick,{className:'erp-button erp-primary',...props});
  const link=(label,to,props={})=>h(Link,{to,className:'erp-button',...props},label);
  const title=(title,subtitle,actions,domain)=>h(Heading,{title,subtitle,crumbs:[
    {label:'Workspace',to:'/demo'},...(domain?[{label:domain,to:workspaceRoutes[domain]}]:[]),{label:title}
  ],actions});
  const flash=(message,error=true)=>message&&h('p',{role:error?'alert':'status',className:error?'erp-error':'erp-success'},message);
  const panel=(children,props={})=>h('section',{className:'erp-panel',...props},children);
  const keyFor=(row)=>row.id || numberOf(row);
  function Modal({heading,children,onClose,print=false}) {
    const dialog=useRef(null);
    const label=useId();
    useEffect(()=>{dialog.current?.showModal();},[]);
    return h('dialog',{ref:dialog,className:`erp-dialog${print?' erp-print':''}`,'aria-labelledby':label,onCancel:onClose},
      h('header',{className:'erp-toolbar erp-noprint'},h('h2',{id:label},heading),btn('Close',onClose,{'aria-label':'Close dialog'})),
      children);
  }
  function Entry({field,state,value,onChange}) {
    const inputId=useId();
    const list=state[field.type];
    const text=field.type==='arabic';
    const props={id:inputId,value:value??'',onChange:event=>onChange(event.target.value),required:field.required,'aria-label':field.label,dir:text?'rtl':undefined};
    let content;
    if(Array.isArray(list)&&field.type==='products') content=h(ItemLookup,{state,value,onChange,inputId,label:field.label,required:field.required});
    else if(Array.isArray(list)||field.type.includes('|')) {
      const options=Array.isArray(list)?list.filter(x=>!isArchived(x)||x.id===value).map(x=>[x.id,labelOf(x,field.type)]):field.type.split('|').map(x=>[x,x]);
      content=h('select',props,h('option',{value:''},'Select…'),options.map(([id,label])=>h('option',{key:id,value:id},label)));
    } else if(field.type==='textarea') content=h('textarea',{...props,rows:3});
    else {
      const numeric=['money','quantity','cost'].includes(field.type);
      content=h('input',{...props,type:numeric?'number':['date','email'].includes(field.type)?field.type:'text',min:numeric?0:undefined,step:numeric?'any':undefined,size:16});
    }
    return h('div',{className:'erp-field'},h('label',{htmlFor:inputId},field.label,field.required?' *':''),content);
  }
  function ItemLookup({state,value,onChange,label='Item',required,inputId}) {
    const listId=useId();
    const selected=find(state,'products',value);
    const [input,setInput]=useState(selected?labelOf(selected,'products'):'');
    useEffect(()=>{setInput(selected?labelOf(selected,'products'):'');},[value]);
    const options=state.products.filter(x=>x.status!=='archived');
    return h(React.Fragment,null,h('input',{id:inputId,list:listId,value:input,required,placeholder:'Search item code or part',autoComplete:'off','aria-label':label,onChange:event=>{
      const raw=event.target.value;
      setInput(raw);
      const exact=options.find(x=>[labelOf(x,'products'),x.sku,x.barcode,x.part_number,x.oem_number].some(y=>y&&searchText(y)===searchText(raw)));
      if(exact)onChange(exact.id);
      else if(value)onChange('');
    }}),h('datalist',{id:listId},options.map(p=>h('option',{key:p.id,value:labelOf(p,'products')},p.part_number||''))));
  }

  function Login() {
    const {data,repository}=useDemo();
    const navigate=useNavigate();
    const [name,setName]=useState(data.profile.name||'Demo Operator');
    const [role,setRole]=useState(data.profile.role||'demo-admin');
    const [error,setError]=useState('');
    return h('div',{className:'min-h-screen grid lg:grid-cols-[1.02fr_1fr] bg-background'},
      h(LoginBrand),
      h('main',{className:'flex items-center justify-center px-5 py-10 sm:px-10'},
        h('div',{className:'w-full max-w-[400px] erp-login-panel'},
          h('div',{className:'lg:hidden flex items-center gap-3'},h('span',{className:'w-10 h-10 rounded-lg bg-brand text-white font-heading font-bold inline-flex items-center justify-center'},'AB'),h('strong',{className:'font-heading'},'AL BATRA')),
          h('div',null,h('p',{className:'text-[10px] font-bold uppercase tracking-[0.18em] text-brand'},'DEMO WORKSPACE'),h('h1',{className:'font-heading text-[26px] font-extrabold tracking-tight mt-2'},'Open Al Batra'),h('p',{className:'mt-2 text-sm text-muted-foreground'},'Changes are saved in this browser.')),
          h('form',{className:'erp-space',onSubmit:event=>{event.preventDefault();try{repository.profile({name:name.trim(),role});navigate('/demo',{replace:true});}catch(e){setError(e.message);}}},
            h('label',{className:'erp-field'},'Display name',h('input',{required:true,value:name,maxLength:80,onChange:e=>setName(e.target.value)})),
            h('label',{className:'erp-field'},'Demo role',h('select',{value:role,onChange:e=>setRole(e.target.value)},data.roles.filter(x=>!isArchived(x)).map(x=>h('option',{key:x.id,value:x.id},x.name)))),
            flash(error),h('button',{className:'erp-button erp-primary',type:'submit'},'Enter demo')),
          h('a',{href:'/login',className:'text-xs font-semibold text-muted-foreground hover:text-brand'},'Staff sign-in'))));
  }
  function TopBar() {
    const {data,repository}=useDemo();
    const navigate=useNavigate();
    const location=useLocation();
    const [query,setQuery]=useState('');
    const [open,setOpen]=useState(false);
    const [profile,setProfile]=useState(false);
    const [gridOpen,setGridOpen]=useState(false);
    const [error,setError]=useState('');
    const input=useRef(null);
    const change=patch=>{try {repository.profile(patch);setError('');}catch(e){setError(e.message);}};
    useEffect(()=>{setOpen(false);setQuery('');setGridOpen(false);},[location.pathname]);
    useEffect(()=>{
      const onKey=e=>{
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();input.current?.focus();setOpen(true);}
        if(e.key==='Escape')setOpen(false);
      };
      document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
    },[]);
    const q=searchText(query);
    const modules=q?canonicalFeatures(Object.values(features)).filter(x=>searchText(`${x.group} ${x.label}`).includes(q)).slice(0,7):[];
    const items=q?data.products.filter(x=>searchText(`${x.sku} ${x.part_number} ${x.name} ${x.description_ar}`).includes(q)).slice(0,6):[];
    const first=modules[0]?routeFor(modules[0].key):items[0]?`${routeFor('items')}?record=${encodeURIComponent(items[0].id)}`:'';
    return h('div',{className:'erp-top'},
      h('form',{className:'erp-search',onSubmit:e=>{e.preventDefault();if(first)navigate(first);}},
        h('input',{ref:input,placeholder:'Search functions or items',value:query,onFocus:()=>setOpen(true),onChange:e=>{setQuery(e.target.value);setOpen(true);},'aria-label':'Global search'}),
        open&&q&&h('div',{className:'erp-search-results'},modules.map(x=>link(x.label,routeFor(x.key),{key:x.key})),items.map(x=>link(labelOf(x,'products'),`${routeFor('items')}?record=${encodeURIComponent(x.id)}`,{key:x.id})),!first&&h('p',null,'No matches.'))),
      h('select',{value:data.profile.branch_id,'aria-label':'Workspace branch',onChange:e=>change({branch_id:e.target.value})},h('option',{value:'all'},'All branches'),data.branches.filter(x=>!isArchived(x)).map(x=>h('option',{key:x.id,value:x.id},x.name))),
      h('div',{className:'erp-mode-toggle',role:'group','aria-label':'Navigation view'},
        btn('Sidebar',()=>{change({navigation:'sidebar'});setGridOpen(false);},{'aria-pressed':data.profile.navigation!=='grid'}),
        btn('Grid',()=>{change({navigation:'grid'});if(!['/demo','/demo/dashboard'].includes(location.pathname))setGridOpen(true);},{'aria-pressed':data.profile.navigation==='grid'})),
      gridOpen&&data.profile.navigation==='grid'&&h(Modal,{heading:'ERP workspaces',onClose:()=>setGridOpen(false)},h('div',{className:'erp-dialog-body'},h(WorkspaceGrid,{onNavigate:()=>setGridOpen(false)}))),
      btn(data.profile.name,()=>setProfile(true),{className:'erp-button erp-profile'}),
      profile&&h(Modal,{heading:'Demo profile',onClose:()=>setProfile(false)},h('div',{className:'erp-dialog-body'},h('p',null,data.profile.name),h('label',{className:'erp-field'},'Demo role',h('select',{value:data.profile.role,onChange:e=>change({role:e.target.value})},data.roles.filter(x=>!isArchived(x)).map(x=>h('option',{value:x.id,key:x.id},x.name)))),flash(error),link('Switch demo user','/demo/login'))));
  }
  function SidebarDomain({domain,entries,onNavigate}) {
    const location=useLocation();
    const disclosure=useRef(null);
    const active=entries.some(entry=>routeFor(entry.key)===location.pathname||`/demo/operations/${entry.key}`===location.pathname);
    useEffect(()=>{if(active&&disclosure.current)disclosure.current.open=true;},[active,location.pathname]);
    return h('details',{ref:disclosure,className:'erp-sidebar-domain'},
      h('summary',{className:'erp-sidebar-summary'},domain),
      h('div',{className:'erp-sidebar-items'},entries.map(entry=>{
        const href=routeFor(entry.key);
        const current=location.pathname===href||location.pathname===`/demo/operations/${entry.key}`;
        return h(Link,{key:entry.key,to:href,onClick:onNavigate,className:'erp-sidebar-link', 'aria-current':current?'page':undefined},entry.label);
      })));
  }
  function SidebarFunctions({group,onNavigate}) {
    const domains=sidebarDomains[group];
    if(!domains)return null;
    return h(React.Fragment,null,domains.map(domain=>{
      const entries=canonicalFeatures(groups.find(([title])=>title===domain)[1]);
      return h(SidebarDomain,{key:domain,domain,entries,onNavigate});
    }));
  }
  function WorkspaceGrid({onNavigate}) {
    const location=useLocation();
    const [section,setSection]=useState(null);
    const grouped=sidebarSections.flatMap(group=>[
      ...(group.items.length?[{label:group.label,entries:group.items.map(item=>({label:item.label,href:item.to==='/'?'/demo':`/demo${item.to}`,icon:item.icon}))}]:[]),
      ...(sidebarDomains[group.label]||[]).map(domain=>({
        label:domain,entries:canonicalFeatures(groups.find(([title])=>title===domain)[1]).map(entry=>({label:entry.label,href:routeFor(entry.key)})),
      })),
    ]);
    const bySection=new Map();
    for(const group of grouped) bySection.set(group.label,[...(bySection.get(group.label)||[]),...group.entries]);
    const gridSections=Array.from(bySection,([label,entries])=>({label,entries}));
    const visible=section?gridSections.find(group=>group.label===section):null;
    return h('nav',{'aria-label':'ERP workspace grid',className:'erp-workspace-grid'},
      visible?h(React.Fragment,null,
        h('div',{className:'erp-toolbar erp-grid-heading'},h('h2',{className:'font-heading font-bold text-sm'},visible.label),btn('All workspaces',()=>setSection(null))),
        h('div',{className:'erp-tiles'},visible.entries.map(entry=>{
          const Icon=Icons[entry.icon]||Icons.FileText;
          return h(Link,{key:entry.href,to:entry.href,onClick:onNavigate,className:'erp-tile','aria-current':location.pathname===entry.href?'page':undefined},h(Icon,{className:'w-4 h-4 text-brand','aria-hidden':true}),entry.label);
        }))):h('div',{className:'erp-tiles'},gridSections.map(group=>{
          const Icon=Icons[group.entries[0]?.icon]||Icons.Boxes;
          return h('button',{key:group.label,type:'button',className:'erp-tile',onClick:()=>setSection(group.label)},h(Icon,{className:'w-4 h-4 text-brand','aria-hidden':true}),group.label);
        })));
  }
  function DashboardOverview({snapshot}) {
    const {data,repository}=useDemo();
    const currency=data.settings.currency;
    const format=value=>money(value,currency);
    const labels=['Branch','Stocked items','Invoiced sales','Customer outstanding','Supplier outstanding','Incoming transfers'];
    return h('section',{className:'erp-space','aria-label':'Branch overview'},
      h('div',{className:'erp-toolbar erp-dashboard-heading'},
        h('div',null,h('h2',{className:'font-heading text-sm font-bold'},'Branch overview'),h('p',{className:'text-xs text-muted-foreground'},snapshot.clientItems?`${snapshot.clientItems} client items in the catalogue. Stock and financial figures come from demo transactions.`:'Built-in demo records. Import a client catalogue to see it in the workspace.')),
        link('Excel Import',routeFor('import'))),
      flash(repository.startupError),
      h('div',{className:'erp-table-wrap'},h('table',{className:'erp-table'},
        h('thead',null,h('tr',null,labels.map(label=>h('th',{key:label,scope:'col'},label)))),
        h('tbody',null,snapshot.branches.map(row=>h('tr',{key:row.id},
          h('th',{scope:'row'},row.name),h('td',null,row.stockedItems),h('td',null,row.invoiceCount?format(row.invoiced):'—'),
          h('td',null,format(row.receivables)),h('td',null,format(row.payables)),h('td',null,row.incomingTransfers)))))));
  }

  function ContextActions() {
    const {pathname}=useLocation();
    const keys=related[pathname];
    if(!keys)return null;
    return h('nav',{'aria-label':'Related actions',className:'erp-context-actions'},
      keys.map(key=>link(features[key].label,routeFor(key),{key})));
  }

  function RecordForm({feature,state,record,repository,onClose,onSaved}) {
    const [form,setForm]=useState(()=>({
      ...record,
      ...(feature.fields.some(f=>f.key==='date')?{date:entityDate(record||{})||today()}:{}),
      ...(feature.fields.some(f=>f.key==='branch_id')?{branch_id:record?.branch_id||(state.profile.branch_id==='all'?state.branches.find(branch=>!isArchived(branch))?.id:state.profile.branch_id)}:{}),
      ...(feature.journal?{lines:record?.lines||[{account:'',debit:'',credit:''},{account:'',debit:'',credit:''}]}:{}),
      ...(feature.lines?{items:record?.items?.map(x=>({...x,unit_price:x.unit_price??x.unit_cost??((x.total||0)/x.quantity||0)}))||[emptyLine()]}:{})
    }));
    const [error,setError]=useState('');
    const set=(key,value)=>setForm(current=>{
      if(key!=='source_id'||!value)return {...current,[key]:value};
      const table=feature.fields.find(f=>f.key==='source_id')?.type;
      const source=find(state,table,value);
      if(!source)return {...current,[key]:value};
      const related=state[feature.entity]?.filter(x=>x.id!==record?.id&&x.source_id===value&&['posted','delivered','invoiced'].includes(x.status))||[];
      const used=new Map();
      for(const d of related) for(const line of d.items||[])used.set(line.product_id,(used.get(line.product_id)||0)+Number(line.quantity));
      const lines=source.items?.map(x=>{
        const remaining=feature.post==='purchaseReceipt'?Math.max(0,x.quantity-(x.received_qty||0)):Math.max(0,x.quantity-(used.get(x.product_id)||0));
        if(feature.post!=='purchaseReceipt')used.set(x.product_id,Math.max(0,(used.get(x.product_id)||0)-x.quantity));
        return {...x,quantity:remaining,unit_price:x.unit_price??x.unit_cost??(x.quantity?x.total/x.quantity:0)};
      }).filter(x=>x.quantity>0);
      return {...current,[key]:value,branch_id:(feature.post==='transferReceipt'?source.to_branch_id:source.branch_id)||current.branch_id,customer_id:source.customer_id||current.customer_id,supplier_id:source.supplier_id||current.supplier_id,items:feature.lines&&lines?.length?lines:current.items};
    });
    const changeLine=(index,key,value)=>setForm(current=>({...current,items:current.items.map((line,i)=>i!==index?line:{...line,[key]:value,...(key==='product_id'?{unit_price:feature.group==='Purchases'?find(state,'products',value)?.cost_price??0:historicalPrice(state,value,current.customer_id,current.branch_id)}:{})})}));
    return h(Modal,{heading:`${record?'Edit':'New'} · ${feature.label}`,onClose},
      h('form',{className:'erp-dialog-body erp-space',onSubmit:event=>{
        event.preventDefault();
        try {onSaved(repository.save(feature,form,record?.id));} catch(err) {setError(err.message);}
      }},
        feature.proposed&&h('p',{className:'erp-notice'},'Proposed workflow · Requires client validation'),
        h('div',{className:'erp-fields'},feature.fields.map(f=>h(Entry,{key:f.key,field:f,state,value:form[f.key],onChange:value=>set(f.key,value)}))),
        feature.entity==='products'&&btn('Generate barcode from item code',()=>{const barcode=String(form.sku||'').trim().toUpperCase();if(!barcode||!/^[0-9A-Z .$/+%\-]+$/.test(barcode)){setError('Enter an item code using Code 39 letters, numbers or punctuation.');return;}set('barcode',barcode);setError('');},{disabled:!form.sku}),
        feature.lines&&h('div',{className:'erp-space'},h('h3',null,'Item lines'),
          h('div',{className:'erp-lines'},form.items.map((x,i)=>h('div',{className:'erp-line',key:i},
            h('div',{className:'erp-field'},h('span',null,`Item ${i+1}`),h(ItemLookup,{state,value:x.product_id,onChange:value=>changeLine(i,'product_id',value),label:`Item ${i+1}`,required:true})),
            h('label',{className:'erp-field'},'Quantity',h('input',{type:'number',min:'0.001',step:'0.001',required:true,value:x.quantity,onChange:e=>changeLine(i,'quantity',e.target.value)})),
            h('label',{className:'erp-field'},'Unit price',h('input',{type:'number',min:0,step:'any',value:x.unit_price,onChange:e=>changeLine(i,'unit_price',e.target.value)})),
            btn('Remove line',()=>set('items',form.items.filter((_,index)=>index!==i)),{disabled:form.items.length===1})))),
          h('div',{className:'erp-toolbar'},btn('Add line',()=>set('items',[...form.items,emptyLine()])),h('strong',null,money(form.items.reduce((sum,x)=>sum+Number(x.quantity||0)*Number(x.unit_price||0),0)-Number(form.discount||0),state.settings.currency)))),
        feature.journal&&h('div',{className:'erp-space'},h('h3',null,'Journal lines'),
          form.lines.map((line,index)=>h('div',{className:'erp-line',key:index},
            ...[{key:'account',label:'Account',type:'demoAccounts',required:true},{key:'debit',label:'Debit',type:'money'},{key:'credit',label:'Credit',type:'money'}].map(field=>h(Entry,{key:field.key,field,state,value:line[field.key],onChange:value=>set('lines',form.lines.map((row,i)=>i===index?{...row,[field.key]:value}:row))})),
            btn('Remove line',()=>set('lines',form.lines.filter((_,i)=>i!==index)),{disabled:form.lines.length<=2}))),
          btn('Add journal line',()=>set('lines',[...form.lines,{account:'',debit:'',credit:''}]))),
        flash(error),h('div',{className:'erp-actions'},btn('Cancel',onClose),h('button',{type:'submit',className:'erp-button erp-primary'},feature.master?'Save record':'Save draft'))));
  }

  function Barcode({value}) {
    const text=String(value).toUpperCase();
    const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
    const masks=[0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00d,0x10c,0x04c,0x01c,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0c1,0x1c0,0x091,0x190,0x0d0,0x085,0x184,0x0c4,0x0a8,0x0a2,0x08a,0x02a];
    if([...text].some(c=>!alphabet.includes(c))) return h('p',null,`Barcode reference: ${value}`);
    const encoded=[0x094,...[...text].map(c=>masks[alphabet.indexOf(c)]),0x094];
    let x=10;
    const bars=encoded.flatMap((mask,i)=>{
      const row=[];
      for(let j=8;j>=0;j--){
        const width=mask&(1<<j)?3:1;
        if(j%2===0)row.push(h('rect',{key:`${i}-${j}`,x,y:0,width,height:42,fill:'#000'}));
        x+=width;
      }
      x++;
      return row;
    });
    return h('figure',{className:'erp-barcode'},h('svg',{role:'img','aria-label':`Barcode for ${value}`,viewBox:`0 0 ${x+9} 42`,preserveAspectRatio:'none'},bars),h('figcaption',null,value));
  }

  function PrintView({feature,row,state,onClose}) {
    const tech=feature.key==='transfers'||feature.key.includes('transfer-receipts');
    return h(Modal,{heading:'Print preview',onClose,print:true},
      h('div',{className:'erp-dialog-body erp-space'},
        h('div',{className:'erp-toolbar erp-noprint'},h('span',null,'Print or choose Save as PDF.'),primary('Print / Save PDF',()=>window.print())),
        h('article',{className:'erp-print-sheet'},
          h('div',{className:'erp-toolbar'},h('div',null,h('h2',null,state.settings.company_name||'Al Batra Auto Spare Parts'),h('p',{lang:'ar',dir:'rtl'},state.settings.company_name_ar||'البتراء لقطع غيار السيارات')),h('strong',null,'DEMO')),
          h('h3',null,tech?'Material Transfer Note':feature.label),
          tech&&h('p',{lang:'ar',dir:'rtl'},'إشعار تحويل المواد'),
          h('dl',{className:'erp-details'},['Document',numberOf(row),'Date',entityDate(row),'Branch',branchName(state,row.branch_id),'Account',row.customer_name||row.supplier_name||row.recipient,'Destination',row.to_branch_id&&branchName(state,row.to_branch_id),'Remarks',row.notes].reduce((acc,value,i,all)=>i%2===0&&all[i+1]?[...acc,h('div',{key:value},h('dt',null,value),h('dd',null,all[i+1]))]:acc,[])),
          row.items?.length>0&&h('table',null,h('thead',null,h('tr',null,['Item / الصنف','Quantity / الكمية','Unit price','Total'].map(cell=>h('th',{key:cell},cell)))),h('tbody',null,row.items.map((x,i)=>h('tr',{key:i},h('td',null,`${x.sku||''} ${x.name||''}`),h('td',null,x.quantity),h('td',null,money(x.unit_price,state.settings.currency)),h('td',null,money(x.total,state.settings.currency)))))),
          row.lines?.length>0&&h('ul',{className:'erp-item-detail'},row.lines.map((x,i)=>h('li',{key:i},`${x.account} ${x.account_name} · Debit ${money(x.debit)} · Credit ${money(x.credit)}`))),
          (row.total!=null||row.amount!=null)&&h('p',{className:'erp-total'},`Total ${money(row.total??row.amount,state.settings.currency)}`),
          row.barcode&&h(Barcode,{value:row.barcode}),
          h('p',{className:'erp-print-foot'},'Al Batra · Demonstration document'))));
  }
  function Detail({feature,state,row,repository,close,edit,print,onChanged}) {
    const [error,setError]=useState('');
    const [confirm,setConfirm]=useState(false);
    const archiveLabel=feature.master?'Archive record':'Remove draft';
    const modify=restore=>{
      try {
        if(restore) repository.restore(feature,row.id);
        else repository.archive(feature,row.id);
        onChanged(restore?'Record restored.':feature.master?'Record archived.':'Draft removed. You can restore it from Archived.');
      }catch(err){setError(err.message);setConfirm(false);}
    };
    const perform=action=>{
      try{repository.action(feature,row.id,action);setError('');}
      catch(err){setError(err.message);}
    };
    const output=(f,value)=>find(state,f.type,value)?.name||numberOf(find(state,f.type,value))||value;
    const linkedInvoice=row.invoice_id && find(state,'invoices',row.invoice_id);
    return h(Modal,{heading:numberOf(row)||feature.label,onClose:close},
      h('div',{className:'erp-dialog-body erp-space'},
        feature.proposed&&h('p',{className:'erp-notice'},'Proposed workflow · Requires client validation'),
        h('p',{className:'erp-pill'},displayStatus(row.status||'Active')),
        row.origin==='demo-example'&&h('p',{className:'text-xs text-muted-foreground'},'Demo example'),
        h('dl',{className:'erp-details'},feature.fields.filter(f=>row[f.key]!=null&&row[f.key]!=='').map(f=>h('div',{key:f.key},h('dt',null,f.label),h('dd',{dir:f.type==='arabic'?'rtl':undefined},f.type==='money'?money(row[f.key],state.settings.currency):output(f,row[f.key]))))),
        row.items?.length>0&&h('ul',{className:'erp-item-detail'},row.items.map((x,i)=>h('li',{key:i},`${x.sku||''} ${x.name||''} × ${x.quantity} · ${money(x.total,state.settings.currency)}`))),
        row.total!=null&&h('p',null,h('strong',null,`Total ${money(row.total,state.settings.currency)}`)),
        !feature.master&&feature.entity==='invoices'&&h('p',null,`Outstanding ${money(invoiceBalance(row),state.settings.currency)}`),
        feature.entity==='purchases'&&h('p',null,`Supplier outstanding ${money(purchaseBalance(row),state.settings.currency)}`),
        feature.entity==='products'&&h('div',{className:'erp-space'},h('h3',null,'Branch quantities'),state.branches.map(x=>h('p',{key:x.id},`${x.name} · ${knownStock(state,row.id,x.id)}`)),row.origin==='client-sample'&&h('p',null,'Workbook supplied no opening-stock fields.')),
        linkedInvoice&&link(`Open ${numberOf(linkedInvoice)}`,`${routeFor('sales-invoices')}?record=${encodeURIComponent(linkedInvoice.id)}`,{onClick:close}),
        flash(error),
        h('div',{className:'erp-actions'},
          canEdit(feature,row)&&btn('Edit',edit),
          isArchived(row)&&btn('Restore record',()=>modify(true)),
          !confirm&&canArchive(feature,row)&&btn(archiveLabel,()=>setConfirm(true)),
          btn('Print preview',print),
          permittedActions(feature,row).map(([value,label])=>primary(label,()=>perform(value),{key:value})),
          feature.entity==='products'&&link('Item transactions',`${routeFor('item-transactions')}?item=${encodeURIComponent(row.id)}`,{onClick:close})),
        confirm&&h('div',{className:'erp-notice'},h('p',null,'This entry will move to Archived and can be restored.'),h('div',{className:'erp-actions'},btn('Cancel',()=>setConfirm(false)),btn(`Confirm ${archiveLabel.toLowerCase()}`,()=>modify(false))))));
  }

  function matchedRows(state,feature) {
    return (state[feature.entity]||[]).filter(row=>{
      if(feature.remarks&&!String(row.notes||row.remarks||'').trim())return false;
      if(feature.variant && (row.variant|| (row.source_id?'linked':'general'))!==feature.variant)return false;
      if(feature.show==='work'&&['cancelled','received','converted'].includes(row.status))return false;
      if(feature.show==='approval'&&!['sent','prepared','under_review','accepted'].includes(row.status))return false;
      if(feature.show==='conversion'&&!(feature.entity==='quotations'?['accepted','converted']:['delivered','invoiced']).includes(row.status))return false;
      return feature.show!=='customer'||Boolean(row.customer_id);
    });
  }
  function toRow(state,row,entity) {
    return {id:row.id,record:row,number:numberOf(row),name:row.product_name||row.name||row.notes||row.recipient||row.account||'',account:row.customer_name||row.supplier_name||find(state,'customers',row.customer_id)?.name||find(state,'suppliers',row.supplier_id)?.name||find(state,'products',row.product_id)?.name||(row.branch_id?branchName(state,row.branch_id):row.city||row.description_ar||''),branch_id:row.branch_id,date:entityDate(row),status:displayStatus(row.status||'active'),total:row.total??row.amount??row.selling_price??row.quantity??'',entity};
  }
  function reportRows(state,mode,selectedBranch='all') {
    const view=(entries,entity)=>entries.map(row=>toRow(state,row,entity));
    const inScope=x=>selectedBranch==='all'||x.branch_id===selectedBranch;
    const posted=rows=>rows.filter(x=>x.status==='posted');
    const scopedPosted=rows=>posted(rows).filter(inScope);
    const priced=(rows,kind)=>view(rows,kind).map(x=>({...x,total:x.record.amount??x.record.total??0}));
    const history=()=>view(state.activity,'activity');
    const stock=()=>state.products.filter(p=>!isArchived(p)).flatMap(p=>[...state.branches,...(knownStock(state,p.id,'IN-TRANSIT')?[{id:'IN-TRANSIT',name:'In transit'}]:[])].map(b=>({id:`${p.id}|${b.id}`,record:p,number:p.sku,name:p.name,account:b.name,branch_id:b.id,date:'',status:knownStock(state,p.id,b.id)>asPositive(p.reorder_level)?'Available':'Low / zero',total:knownStock(state,p.id,b.id),entity:'products'})));
    const invoices=state.invoices.filter(x=>!['draft','cancelled','archived'].includes(x.status));
    const purchases=state.purchases.filter(x=>!['draft','cancelled','archived'].includes(x.status));
    switch(mode) {
      case 'stock':return stock();
      case 'movements':return view(state.movements,'movements');
      case 'journal':return view(posted(state.journal),'journal');
      case 'supersessions':return view(state.products.filter(x=>x.supersede_id||x.supersede_number),'products').map(x=>({...x,total:numberOf(find(state,'products',x.record.supersede_id))||x.record.supersede_number,status:'Superseded'}));
      case 'sales':return priced(invoices,'invoices');
      case 'purchases':return priced(purchases,'purchases');
      case 'receivables':return view(invoices.filter(x=>invoiceBalance(x)>0),'invoices').map(x=>({...x,total:invoiceBalance(x.record)}));
      case 'payables':return view(purchases.filter(x=>purchaseBalance(x)>0),'purchases').map(x=>({...x,total:purchaseBalance(x.record)}));
      case 'financial': {
        const measures=[
          ['Invoiced sales',invoices.filter(inScope).reduce((s,r)=>s+Number(r.total||0),0)],
          ['Customer outstanding',invoices.filter(inScope).reduce((s,r)=>s+invoiceBalance(r),0)],
          ['Supplier outstanding',purchases.filter(inScope).reduce((s,r)=>s+purchaseBalance(r),0)],
          ['Customer receipt vouchers',scopedPosted(state.customerPayments).reduce((s,r)=>s+Number(r.amount||0),0)],
          ['Supplier payment vouchers',scopedPosted(state.supplierPayments).reduce((s,r)=>s+Number(r.amount||0),0)],
          ['Expense vouchers',scopedPosted(state.expenses).reduce((s,r)=>s+Number(r.amount||0),0)],
          ['Income vouchers',scopedPosted(state.income).reduce((s,r)=>s+Number(r.amount||0),0)],
        ];
        return measures.map(([name,total],i)=>({id:String(i),record:{name,total},number:'',name,account:selectedBranch==='all'?'All branches':branchName(state,selectedBranch),status:'Derived',date:'',total,entity:'summary'}));
      }
      case 'customerStatement':case 'customerHistory':return [...priced(invoices,'invoices'),...priced(posted(state.customerPayments),'customerPayments'),...priced(posted(state.customerCredits),'customerCredits'),...priced(posted(state.salesReturns),'salesReturns')];
      case 'supplierHistory':return [...priced(purchases,'purchases'),...priced(posted(state.supplierPayments),'supplierPayments'),...priced(posted(state.supplierReceipts),'supplierReceipts'),...priced(posted(state.supplierDebitNotes),'supplierDebitNotes'),...priced(posted(state.purchaseReturns),'purchaseReturns')];
      case 'invoicedDeliveries':return view(state.deliveries.filter(x=>x.status==='invoiced'),'deliveries');
      default:return history();
    }
  }
  const asPositive=value=>Number(value)||0;
  const moneyContext=(feature,row)=>row.entity!=='movements'&&row.entity!=='products'&&row.entity!=='activity'&&row.entity!=='branches'&&typeof row.total==='number'&&feature.report!=='stock';
  function Records({feature}) {
    const {data,repository}=useDemo();
    const location=useLocation();
    const navigate=useNavigate();
    const [query,setQuery]=useState('');
    const [status,setStatus]=useState('');
    const [account,setAccount]=useState('');
    const [scope,setScope]=useState('workspace');
    const [pagination,setPagination]=useState(1);
    const [sort,setSort]=useState(['date',-1]);
    const [mode,setMode]=useState('');
    const [selected,setSelected]=useState(null);
    const [message,setMessage]=useState('');
    const search=new URLSearchParams(location.search);
    const itemParam=search.get('item');
    const detailParam=search.get('record');
    useEffect(()=>{if(detailParam){setSelected(detailParam);setMode('detail');}},[detailParam]);
    const newParam=search.get('new');
    useEffect(()=>{
      if(newParam==='1'&&!feature.report){
        setSelected(null);setMode('form');
        navigate(location.pathname,{replace:true});
      }
    },[newParam,feature,location.pathname,navigate]);
    useEffect(()=>{setPagination(1);},[query,status,account,scope,data.profile.branch_id]);
    useEffect(()=>{
      if(feature.report) return;
      const onKey=event=>{if(event.key==='F2'&&!mode){event.preventDefault();setSelected(null);setMode('form');}};
      document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
    },[mode,feature]);
    const branch=scope==='workspace'?data.profile.branch_id:scope;
    const rows=useMemo(()=>feature.report?reportRows(data,feature.report,branch):matchedRows(data,feature).map(row=>toRow(data,row,feature.entity)),[data,feature,branch]);
    const filtered=rows.filter(row=>(!query||Object.values(row).some(x=>typeof x!=='object'&&searchText(x).includes(searchText(query)))||searchText(`${row.record.sku||''} ${row.record.part_number||''} ${row.record.description_ar||''}`).includes(searchText(query)))&&(status?row.status===status:!isArchived(row.record))&&(!account||[row.record.customer_id,row.record.supplier_id].includes(account))&&(!itemParam||row.record.product_id===itemParam||row.record.items?.some(x=>x.product_id===itemParam))&&(branch==='all'||!row.branch_id||row.branch_id===branch));
    filtered.sort((a,b)=>typeof a[sort[0]]==='number'&&typeof b[sort[0]]==='number'?(a[sort[0]]-b[sort[0]])*sort[1]:String(a[sort[0]]??'').localeCompare(String(b[sort[0]]??''),undefined,{numeric:true})*sort[1]);
    const pages=Math.max(1,Math.ceil(filtered.length/20)),page=Math.min(pages,pagination);
    const record=feature.report?rows.find(x=>x.id===selected)?.record:find(data,feature.entity,selected);
    const close=()=>{setMode('');setSelected(null);};
    const create=()=>{setSelected(null);setMode('form');};
    const download=()=>downloadCSV(feature.key+'.csv',[ordinaryColumns.map(([,name])=>name),...filtered.map(row=>ordinaryColumns.map(([key])=>row[key]))]);
    const partyTable=['customerHistory','customerStatement'].includes(feature.report)?'customers':feature.report==='supplierHistory'?'suppliers':null;
    const destination=rows.find(x=>x.id===selected)?.entity;
    const source=entrySources[feature.report];
    const sourceKey=({invoices:'sales-invoices',purchases:'purchase-orders',deliveries:'deliveries',journal:'journal-entries',customerPayments:'customer-receipt-vouchers',supplierPayments:'supplier-payment-vouchers',products:'items'})[destination];
    return h('div',{className:'erp-space'},
      title(feature.label,feature.proposed?'Proposed workflow · Requires client validation':feature.report?'Review records from the shared demonstration workspace.':'Create, review and process demonstration records.',
        feature.report?h('div',{className:'erp-actions'},source&&link(source[1],routeFor(source[0])+'?new=1'),btn('Export CSV',download)):
        primary('New entry',create,{title:'F2'}),feature.group),
      message&&flash(message,false),
      panel(h('div',{className:'erp-toolbar'},
        h('input',{value:query,onChange:e=>setQuery(e.target.value),placeholder:'Search records…','aria-label':'Search records'}),
        h('select',{value:scope,onChange:e=>setScope(e.target.value),'aria-label':'Filter records by branch'},h('option',{value:'workspace'},'Workspace branch'),h('option',{value:'all'},'All branches'),data.branches.filter(x=>!isArchived(x)).map(x=>h('option',{key:x.id,value:x.id},x.name)),h('option',{value:'IN-TRANSIT'},'In transit')),
        h('select',{value:status,onChange:e=>setStatus(e.target.value),'aria-label':'Filter by status'},h('option',{value:''},'Active records'),[...new Set(rows.map(x=>x.status))].sort().map(x=>h('option',{key:x,value:x},x))),
        partyTable&&h('select',{value:account,onChange:e=>setAccount(e.target.value),'aria-label':'Filter by account'},h('option',{value:''},'All accounts'),data[partyTable].map(x=>h('option',{key:x.id,value:x.id},x.name))),
        h('span',null,`${filtered.length} records`))),
      h('div',{className:'erp-table-wrap'},h('table',{className:'erp-table'},
        h('thead',null,h('tr',null,ordinaryColumns.map(([key,label])=>h('th',{key,'aria-sort':sort[0]!==key?'none':sort[1]===1?'ascending':'descending'},btn(label+(sort[0]===key?(sort[1]===1?' ↑':' ↓'):''),()=>setSort([key,sort[0]===key?-sort[1]:1]),{className:'erp-sort'}))),!feature.report&&h('th',{scope:'col'},'Actions'))),
        h('tbody',null,filtered.slice((page-1)*20,page*20).map(row=>{
          const display=row.number||row.name;
          const view=()=>{setSelected(row.id);setMode('detail');};
          const edit=()=>{setSelected(row.id);setMode('form');};
          const cells=ordinaryColumns.map(([key])=>{
            let value;
            if(key==='number') value=h(React.Fragment,null,btn(display||'View details',view,{className:'erp-record-link'}),row.record.origin==='demo-example'&&h('span',{className:'erp-example-label'},'Demo'));
            else if(key==='total'&&moneyContext(feature,row))value=money(row.total,data.settings.currency);
            else value=String(row[key]??'')||'—';
            return h('td',{key},value);
          });
          if(!feature.report)cells.push(h('td',{key:'actions'},h('div',{className:'erp-actions'},
            btn('View',view,{'aria-label':`View ${display}`}),canEdit(feature,row.record)&&btn('Edit',edit,{'aria-label':`Edit ${display}`}))));
          return h('tr',{key:row.id},cells);
        }),
          !filtered.length&&h('tr',null,h('td',{colSpan:feature.report?6:7},feature.report?'No records match. Post a demo transaction to populate this report.':'No records match. Create a demo record or clear your filters.'))))),
      h('div',{className:'erp-toolbar'},h('span',null,`Page ${page} of ${pages}`),h('div',{className:'erp-actions'},btn('Previous',()=>setPagination(page-1),{disabled:page===1}),btn('Next',()=>setPagination(page+1),{disabled:page===pages}))),
      mode==='form'&&h(RecordForm,{feature,state:data,record,repository,onClose:close,onSaved:id=>{setSelected(id);setMode('detail');setMessage('Saved in this demo.');}}),
      mode==='detail'&&record&&!feature.report&&h(Detail,{feature,state:data,row:record,repository,close,edit:()=>setMode('form'),print:()=>setMode('print'),onChanged:text=>{close();setMessage(text);}}),
      mode==='detail'&&record&&feature.report&&h(Modal,{heading:numberOf(record)||record.name||feature.label,onClose:close},
        h('div',{className:'erp-dialog-body erp-space'},h('dl',{className:'erp-details'},Object.entries(record).filter(([k,v])=>v!=null&&typeof v!=='object'&&k!=='id').map(([key,value])=>h('div',{key},h('dt',null,key.replaceAll('_',' ')),h('dd',null,String(value))))),record.lines?.length>0&&h('ul',{className:'erp-item-detail'},record.lines.map((x,i)=>h('li',{key:i},`${x.account} ${x.account_name} · Debit ${money(x.debit)} · Credit ${money(x.credit)}`))),h('div',{className:'erp-actions'},btn('Print preview',()=>setMode('print')),
        destination==='products'&&link('Open Item Master',`${routeFor('items')}?record=${encodeURIComponent(record.id)}`,{onClick:close}),
        sourceKey&&destination!=='products'&&link('Open source',`${routeFor(sourceKey)}?record=${encodeURIComponent(record.id)}`,{onClick:close})))),
      mode==='print'&&record&&h(PrintView,{feature,row:record,state:data,onClose:()=>setMode('detail')}));
  }

  function ImportScreen() {
    const {data,repository}=useDemo();
    const [sheets,setSheets]=useState([]);
    const [filename,setFilename]=useState('');
    const [sheetIndex,setSheetIndex]=useState(0);
    const [mapping,setMapping]=useState({});
    const [feedback,setFeedback]=useState('');
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    const [confirm,setConfirm]=useState('');
    const [history,setHistory]=useState(null);
    const preview=useMemo(()=>previewWorkbook(sheets,mapping,data.products),[sheets,mapping,data.products]);
    const sheet=sheets[sheetIndex],header=sheet&&sheetHeaders(sheet);
    const issues=items=>downloadCSV('al-batra-import-errors.csv',[['Sheet','Row','Item code','Issue'],...items.map(x=>[x.sheet,x.row,x.sku,x.reason])]);
    const load=async file=>{
      if(!file) return;
      setBusy(true);setError('');setFeedback('');setSheets([]);
      try{setSheets(await readWorkbook(file));setFilename(file.name);setSheetIndex(0);setMapping({});}catch(e){setError(e.message);}finally{setBusy(false);}
    };
    return h('div',{className:'erp-space'},title('Excel Import & Reset','Import item master rows and supplier references into this browser.',btn('Reset demo',()=>setConfirm('reset')),'Administration'),
      flash(error),flash(feedback,false),
      panel(h('div',{className:'erp-space'},h('h2',null,'Upload catalogue'),h('p',null,'XLSX or CSV. Original item identifiers are preserved. Opening stock and financial history are outside this importer.'),
        h('input',{type:'file',accept:'.xlsx,.csv',disabled:busy,'aria-label':'Upload catalogue workbook',onChange:e=>load(e.target.files[0])}),busy&&h('p',{role:'status'},'Reading workbook…'))),
      sheet&&panel(h('div',{className:'erp-space'},
        h('h2',null,'Column mapping'),
        h('label',{className:'erp-field'},'Worksheet',h('select',{value:sheetIndex,onChange:e=>setSheetIndex(Number(e.target.value))},sheets.map((x,i)=>h('option',{key:i,value:i},x.name)))),
        h('div',{className:'erp-fields'},mappingFields.map(key=>h('label',{key,className:'erp-field'},key.replaceAll('_',' '),h('select',{value:mapping[sheet.name]?.[key]??header.mapping[key]??-1,onChange:e=>setMapping({...mapping,[sheet.name]:{...mapping[sheet.name],[key]:Number(e.target.value)}})},h('option',{value:-1},'Skip'),header.columns.map((x,i)=>h('option',{key:i,value:i},x||`Column ${i+1}`)))))),
        h('h2',null,'Import preview'),h('p',null,`${preview.rows.length} valid · ${preview.errors.length} issues across ${sheets.length} sheet(s)`),
        h('ul',null,preview.sheets.map(x=>h('li',{key:x.name},`${x.name}: ${x.accepted} accepted, ${x.rejected} rejected`))),
        h('ul',null,preview.rows.slice(0,6).map(row=>h('li',{key:row.id},`${row.sku} · ${row.part_number} · ${row.name}`))),
        preview.errors.slice(0,5).map(x=>h('p',{key:`${x.sheet}:${x.row}`},`${x.sheet} row ${x.row}: ${x.reason}`)),
        h('div',{className:'erp-actions'},btn('Download errors',()=>issues(preview.errors),{disabled:!preview.errors.length}),primary('Import valid rows',()=>setConfirm('import'),{disabled:!preview.rows.length})))),
      panel(h('div',{className:'erp-space'},h('h2',null,'Import history'),data.imports.map(x=>h('div',{key:x.id,className:'erp-toolbar'},btn(x.name,()=>setHistory(x)),h('span',null,`${x.date} · ${x.accepted} imported · ${x.rejected} rejected`))))),
      history&&h(Modal,{heading:history.name,onClose:()=>setHistory(null)},h('div',{className:'erp-dialog-body erp-space'},h('p',null,`${history.accepted} imported · ${history.rejected} rejected`),history.sheets?.map(x=>h('p',{key:x.name},`${x.name}: ${x.accepted} imported, ${x.rejected} rejected`)),btn('Download error report',()=>issues(history.issues||[])))),
      confirm&&h(Modal,{heading:confirm==='reset'?'Reset demo data?':'Confirm catalogue import',onClose:()=>setConfirm('')},h('div',{className:'erp-dialog-body erp-space'},
        h('p',null,confirm==='reset'?'Demo edits and documents in this browser will be discarded. The bundled sample catalogue will be restored.':`Add ${preview.rows.length} validated items. Existing items stay intact.`),
        h('div',{className:'erp-actions'},btn('Cancel',()=>setConfirm('')),primary(confirm==='reset'?'Restore sample dataset':'Confirm import',()=>{try{if(confirm==='reset'){repository.reset();setFeedback('Sample dataset restored.');}else{repository.import(preview,filename);setFeedback(`Imported ${preview.rows.length} items.`);}setSheets([]);setConfirm('');setError('');}catch(e){setError(e.message);setConfirm('');}})))));
  }

  const legacyFeature=entity=>features[({products:'items',customers:'customers',suppliers:'suppliers',invoices:'sales-invoices',quotations:'quotes',purchases:'purchase-orders'})[entity]]||{entity,key:entity,label:entity,master:false};
  const legacyCanEdit=(entity,row)=>canEdit(legacyFeature(entity),row);
  function LegacyRowActions({entity,record,onEdit}) {
    const {data,repository}=useDemo();
    const [confirm,setConfirm]=useState(false);
    const [error,setError]=useState('');
    const feature=legacyFeature(entity),row=find(data,entity,record.id);
    if(!row)return null;
    const restore=isArchived(row);
    const label=feature.master?'Archive record':'Remove draft';
    const change=()=>{
      try {if(restore)repository.restore(feature,row.id);else repository.archive(feature,row.id);}
      catch(e){setError(e.message);setConfirm(false);}
    };
    return h('div',{className:'erp-actions',onClick:event=>event.stopPropagation()},
      legacyCanEdit(entity,row)&&btn('Edit',onEdit,{'aria-label':`Edit ${numberOf(row)}`}),
      restore&&btn('Restore',change,{'aria-label':`Restore ${numberOf(row)}`}),
      !confirm&&canArchive(feature,row)&&btn(label,()=>setConfirm(true)),
      confirm&&h(React.Fragment,null,btn('Cancel',()=>setConfirm(false)),btn('Confirm '+label.toLowerCase(),change)),flash(error));
  }

  function Operations({featureKey}={}) {
    const {feature:routeKey}=useParams();
    const key=featureKey||routeKey;
    const feature=features[key];
    const navigate=useNavigate();
    useEffect(()=>{if(feature?.special==='settings')navigate('/demo/settings',{replace:true});},[feature,navigate]);
    if(!feature)return h('div',{className:'erp-space'},title('Function unavailable','Choose a function from the workspace navigation.'),link('Return to Dashboard','/demo'));
    if(feature.special==='settings')return null;
    if(feature.special==='import')return h(ImportScreen);
    return h(Records,{key,feature});
  }
  const titleFor=pathname=>{
    const direct=routeEntries.find(([path])=>pathname===`/demo/${path}`)?.[1];
    const alias=pathname.match(/^\/demo\/operations\/([^/]+)$/)?.[1];
    return features[direct||alias]?.label;
  };
  return {Login,Operations,TopBar,SidebarFunctions,WorkspaceGrid,DashboardOverview,dashboardSnapshot,ContextActions,LegacyRowActions,legacyCanEdit,routeEntries,sidebarSections,titleFor};
}
