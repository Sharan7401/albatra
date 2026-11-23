import {features, numberOf} from './catalog.mjs';

export const STORAGE_KEY = 'albatra.erp.demo.v2';
const id = () => globalThis.crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const copy = value => structuredClone(value);
const norm = value => String(value ?? '').trim().toLowerCase();
const asNumber = value => Number(value || 0);
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const find = (state, entity, key) => state[entity]?.find(row => row.id === key);
const sum = (rows, key) => money(rows.reduce((total,row) => total + asNumber(row[key]), 0));
const fail = reason => { throw new Error(reason); };
const entries = ['prices','costs','stockReceipts','stockAdjustments','salesReturns','commissions','commissionReturns','purchaseQuotes','purchaseReceipts','purchaseReturns','transfers','transferReceipts','storeIssues','deliveries','customerLpos','supplierReceipts','supplierPayments','supplierDebitNotes','customerPaymentsOut','customerPayments','expenses','expenseReturns','income','incomeReturns','customerCredits','movements','activity','imports','numbering','journal'];
const prefixes = {invoices:'INV',quotations:'QT',purchases:'PO',orders:'SO',transfers:'MTN',transferReceipts:'MTR',salesReturns:'SR',purchaseReceipts:'GRN',purchaseReturns:'PR',customerPayments:'CRV',supplierPayments:'SPV',deliveries:'DN',customerLpos:'LPO',commissions:'SCV',commissionReturns:'SCR',stockReceipts:'GR',stockAdjustments:'ADJ',expenses:'EXP',income:'INC'};
const suggestion = row => ({id:row,name:row});
const totalFor = lines => money(lines.reduce((total,line) => total + money(line.quantity * line.unit_price),0));
const stockKey = (product,branch) => `${product}|${branch}`;
const numberField = {invoices:'invoice_number',quotations:'quote_number',purchases:'po_number',orders:'order_number'};
const dateField = {invoices:'invoice_date',quotations:'quote_date',purchases:'order_date',orders:'order_date'};
const isDraft = row => !row?.status || ['draft','new','under_review','prepared','sent'].includes(row.status);
const locked = row => !isDraft(row);
const add = (state,entity,row) => { (state[entity] ??= []).unshift(row); };
const linkNames = (state,row) => {
  for (const [table,key] of [['branches','branch'],['customers','customer'],['suppliers','supplier'],['products','product']]) {
    if (row[`${key}_id`]) row[`${key}_name`] = find(state,table,row[`${key}_id`])?.name || row[`${key}_name`] || '';
  }
  return row;
};
function allocate(state,entity) {
  const settings = state.settings;
  const settingKey = {invoices:'invoice',quotations:'quote',purchases:'purchase',orders:'order',customerPayments:'payment'}[entity];
  const config = state.numbering.find(x=>x.document === entity);
  const prefix = config?.prefix || settings[`${settingKey}_prefix`] || prefixes[entity] || entity.toUpperCase().slice(0,5);
  const numbers = (state[entity] || []).map(numberOf);
  let next = Math.max(1,asNumber(config?.next || settings[`next_${settingKey}`]));
  for (const value of numbers) {
    if (value.startsWith(prefix+'-')) next = Math.max(next, asNumber(value.slice(prefix.length+1)) + 1 || 1);
  }
  if (config) config.next = next + 1;
  return `${prefix}-${String(next).padStart(5,'0')}`;
}
function audit(state,feature,row,event) {
  add(state,'activity',{id:id(),date:today(),timestamp:new Date().toISOString(),name:numberOf(row),status:event,entity:feature.entity,feature:feature.key,product_id:row.product_id,branch_id:row.branch_id,customer_id:row.customer_id,supplier_id:row.supplier_id,items:row.items || [],notes:feature.label});
}
const knownStock = (state,product,branch) => asNumber(state.stock[stockKey(product,branch)]);
function refreshProduct(state,productId) {
  const product = find(state,'products',productId);
  if (product) {
    product.on_hand = state.branches.reduce((sum,branch)=>sum+knownStock(state,productId,branch.id),0);
    product.available = Math.max(0,product.on_hand-asNumber(product.reserved));
  }
}
function move(state,row,lines,branch,direction,kind) {
  if (!find(state,'branches',branch) && branch !== 'IN-TRANSIT') fail('Select a valid branch.');
  const quantities = new Map();
  for (const line of lines) quantities.set(line.product_id,(quantities.get(line.product_id)||0)+direction*line.quantity);
  for (const [product,qty] of quantities) {
    const key = stockKey(product,branch);
    const next = Math.round((knownStock(state,product,branch)+qty)*1000)/1000;
    if (next < 0) fail(`Insufficient stock: ${find(state,'products',product)?.sku} has ${knownStock(state,product,branch)} at this location.`);
    state.stock[key]=next;
    add(state,'movements',{id:id(),date:row.date || today(),number:numberOf(row),product_id:product,name:find(state,'products',product)?.name,branch_id:branch,quantity:qty,status:kind,source_id:row.id});
    refreshProduct(state,product);
  }
}
function sourceFor(state,row,entity,{looseBranch=false,party}={}) {
  const source = find(state,entity,row.source_id);
  if (!source || ['cancelled','void'].includes(source.status)) fail('Select a valid source document.');
  if (!looseBranch && source.branch_id && row.branch_id !== source.branch_id) fail('The branch must match the source.');
  if (party && source[party] && row[party] !== source[party]) fail('The account must match the source.');
  return source;
}
function assertRemaining(base, used, requested) {
  const quantities = new Map();
  for (const line of base) quantities.set(line.product_id,(quantities.get(line.product_id)||0)+asNumber(line.quantity));
  for (const line of [...used,...requested]) quantities.set(line.product_id,(quantities.get(line.product_id)||0)-asNumber(line.quantity));
  if ([...quantities.values()].some(q=>q < -0.000001)) fail('This quantity exceeds the remaining quantity on the source document.');
}
const postedRows = (state,entity,sourceId) => state[entity].filter(r=>r.source_id === sourceId && r.status === 'posted');
function settle(state,row,entity,kind) {
  const sale = entity === 'invoices';
  const source = sourceFor(state,row,entity,{party:sale?'customer_id':'supplier_id'});
  if (sale && source.status === 'draft') fail('Post the invoice first.');
  if (!sale && !source.bill_number && !['received','partially_received'].includes(source.status)) fail('Receive the purchase before settling it.');
  const total = asNumber(sale ? source.total : (source.bill_total || source.total));
  const paid = asNumber(sale ? source.amount_paid : source.bill_amount_paid);
  const credited = asNumber(source.credit_total);
  if (row.amount > money(total-paid-credited)) fail('Amount exceeds the outstanding balance.');
  if (kind === 'credit') source.credit_total = money(credited+row.amount);
  else if (sale) source.amount_paid = money(paid+row.amount);
  else source.bill_amount_paid = money(paid+row.amount);
  const balance = money(total - asNumber(sale ? source.amount_paid : source.bill_amount_paid) - asNumber(source.credit_total));
  if (sale) { source.balance=balance; source.status=balance===0?'paid':'partial'; }
  else { source.bill_balance=balance; source.bill_status=balance===0?'paid':'partial'; }
  if (sale && source.order_id) {
    const order=find(state,'orders',source.order_id);
    if (order) {order.amount_paid=source.amount_paid;order.payment_status=source.status;}
  }
}
function invoice(state,row,{issueStock=true}={}) {
  const customer = find(state,'customers',row.customer_id);
  const credit = norm(customer?.classification) === 'credit';
  const limit = asNumber(customer?.credit_limit);
  const open = state.invoices.filter(x=>x.id!==row.id && x.customer_id===row.customer_id && !['draft','cancelled'].includes(x.status)).reduce((s,x)=>s+invoiceBalance(x),0);
  if (credit && limit > 0 && money(open+row.total)>limit) fail('This invoice exceeds the customer credit limit.');
  if (issueStock) move(state,row,row.items,row.branch_id,-1,'Sales issue');
  row.amount_paid=0;
  row.balance=row.total;
  row.status='unpaid';
}
export const invoiceBalance = row => Math.max(0,money(asNumber(row.total)-asNumber(row.amount_paid)-asNumber(row.credit_total)));
export const purchaseBalance = row => Math.max(0,money(asNumber(row.bill_total || (['received','partially_received'].includes(row.status)?row.total:0))-asNumber(row.bill_amount_paid)-asNumber(row.credit_total)));

const demoAccounts=[
  ['1010','Cash and bank','Asset'],['1100','Trade receivables','Asset'],['1200','Inventory','Asset'],
  ['2010','Trade payables','Liability'],['4100','Sales revenue','Income'],
  ['4200','Other income','Income'],['5100','Operating expenses','Expense'],
  ['5200','Commission expense','Expense'],['4300','Sales credits','Income'],
];
const journalRules={
  invoice:['1100','4100'],purchaseReceipt:['1200','2010'],purchaseReturn:['2010','1200'],
  customerPayment:['1010','1100'],supplierPayment:['2010','1010'],
  customerCredit:['4300','1100'],supplierDebit:['2010','1200'],
  supplierReceipts:['1010','2010'],customerPaymentsOut:['1100','1010'],
  expenses:['5100','1010'],expenseReturns:['1010','5100'],income:['1010','4200'],
  incomeReturns:['4200','1010'],commissions:['5200','1010'],commissionReturns:['1010','5200'],
};
function journal(state,row,kind,value,description) {
  const sides=journalRules[kind];
  const amount=money(value||0);
  if(!sides||amount<=0) return;
  const number=allocate(state,'journal');
  const lines=sides.map((account,index)=>({account,account_name:state.demoAccounts.find(x=>x.code===account)?.name||account,debit:index===0?amount:0,credit:index===1?amount:0}));
  add(state,'journal',{id:id(),number,name:description,source_id:row.id,source_number:numberOf(row),branch_id:row.branch_id,date:row.date||today(),total:amount,status:'posted',lines});
}
function post(state,feature,row,action) {
  if (action === 'approve') {
    row.status=feature.post==='quote'?'accepted':'approved';
    return;
  }
  if (action === 'convert') {
    if (row.invoice_id || row.converted_invoice_id) fail('This document already has an invoice.');
    if (!row.items?.length) fail('This document has no item lines.');
    const number=allocate(state,'invoices');
    const issued = linkNames(state,{...copy(row),id:id(),number,invoice_number:number,invoice_date:today(),date:today(),source_id:row.id,status:'draft',variant:'',origin:'demo',discount:asNumber(row.discount),total:money(row.total || totalFor(row.items))});
    invoice(state,issued,{issueStock:feature.post!=='delivery'});
    add(state,'invoices',issued);
    journal(state,issued,'invoice',issued.total,'Issued invoice');
    row.invoice_id=issued.id;
    row.converted_invoice_id=issued.id;
    row.status=feature.post==='delivery'?'invoiced':'converted';
    return;
  }
  switch (feature.post) {
    case 'quote': row.status='sent'; return;
    case 'purchaseQuote': row.status='approved'; return;
    case 'purchase': {
      if (row.source_id) {
        const quote=sourceFor(state,row,'purchaseQuotes',{party:'supplier_id'});
        if (quote.status!=='approved') fail('Approve the supplier quotation first.');
        if (quote.purchase_order_id) fail('This supplier quotation already has a purchase order.');
        quote.purchase_order_id=row.id; quote.status='converted';
      }
      row.status='approved'; return;
    }
    case 'invoice': invoice(state,row); journal(state,row,'invoice',row.total,feature.label);return;
    case 'stockIn': move(state,row,row.items,row.branch_id,1,'Stock receipt'); break;
    case 'stockOut': move(state,row,row.items,row.branch_id,-1,'Store issue'); break;
    case 'adjust': move(state,row,row.items,row.branch_id,row.direction==='Decrease'?-1:1,'Stock adjustment'); break;
    case 'transfer':
      if (!row.to_branch_id || row.branch_id===row.to_branch_id) fail('Choose a different destination branch.');
      move(state,row,row.items,row.branch_id,-1,'Transfer dispatch');
      move(state,row,row.items,'IN-TRANSIT',1,'Transfer in transit');
      row.status='dispatched'; return;
    case 'transferReceipt': {
      const transfer=sourceFor(state,row,'transfers',{looseBranch:true});
      if (transfer.to_branch_id!==row.branch_id || !['dispatched','partial'].includes(transfer.status)) fail('Select an outstanding transfer to this destination.');
      const used=postedRows(state,'transferReceipts',transfer.id).flatMap(x=>x.items);
      assertRemaining(transfer.items,used,row.items);
      move(state,row,row.items,'IN-TRANSIT',-1,'Transfer transit release');
      move(state,row,row.items,row.branch_id,1,'Transfer receipt');
      transfer.status=Math.abs([...used,...row.items].reduce((t,x)=>t+x.quantity,0)-transfer.items.reduce((t,x)=>t+x.quantity,0))<0.000001?'received':'partial';
      break;
    }
    case 'purchaseReceipt': {
      const purchase=sourceFor(state,row,'purchases',{party:'supplier_id'});
      if (!['approved','sent','partially_received','ordered'].includes(purchase.status)) fail('Choose an approved purchase with outstanding quantities.');
      const previouslyReceived=(purchase.items||[]).map(x=>({...x,quantity:asNumber(x.received_qty)}));
      assertRemaining(purchase.items,previouslyReceived,row.items);
      move(state,row,row.items,row.branch_id,1,'Purchase receipt');
      const received=new Map();
      for (const line of row.items) received.set(line.product_id,(received.get(line.product_id)||0)+line.quantity);
      for (const line of purchase.items) {
        const quantity=Math.min(Math.max(0,line.quantity-asNumber(line.received_qty)),received.get(line.product_id)||0);
        line.received_qty=asNumber(line.received_qty)+quantity;
        received.set(line.product_id,(received.get(line.product_id)||0)-quantity);
      }
      purchase.status=purchase.items.every(x=>x.received_qty>=x.quantity)?'received':'partially_received';
      purchase.bill_total=money(purchase.items.reduce((s,x)=>s+asNumber(x.received_qty)*asNumber(x.unit_price || x.unit_cost),0));
      purchase.bill_balance=purchaseBalance(purchase);
      break;
    }
    case 'purchaseReturn': {
      const receipt=sourceFor(state,row,'purchaseReceipts',{party:'supplier_id'});
      if (receipt.status!=='posted') fail('Post the source receipt first.');
      assertRemaining(receipt.items,postedRows(state,'purchaseReturns',receipt.id).flatMap(x=>x.items),row.items);
      move(state,row,row.items,row.branch_id,-1,'Purchase return'); break;
    }
    case 'return': {
      if (row.source_id) {
        const original=sourceFor(state,row,'invoices',{party:'customer_id'});
        if (original.status==='draft') fail('Post the original invoice first.');
        assertRemaining(original.items || [],postedRows(state,'salesReturns',original.id).flatMap(x=>x.items),row.items);
      }
      move(state,row,row.items,row.branch_id,1,'Sales return'); break;
    }
    case 'delivery':
      if (row.source_id) {
        const order=sourceFor(state,row,'orders',{party:'customer_id'});
        if (['completed','delivered','invoiced'].includes(order.status)) fail('This order was already fulfilled.');
        const deliveries=state.deliveries.filter(x=>x.source_id===order.id&&['delivered','invoiced'].includes(x.status));
        assertRemaining(order.items,deliveries.flatMap(x=>x.items),row.items);
      }
      move(state,row,row.items,row.branch_id,-1,'Delivery');
      row.status='delivered';return;
    case 'price': if (!row.customer_id) find(state,'products',row.product_id).selling_price=row.selling_price;break;
    case 'cost': find(state,'products',row.product_id).cost_price=row.cost_price;break;
    case 'customerPayment': settle(state,row,'invoices','payment');break;
    case 'supplierPayment': settle(state,row,'purchases','payment');break;
    case 'customerCredit': settle(state,row,'invoices','credit');break;
    case 'supplierDebit': settle(state,row,'purchases','credit');break;
    case 'voucher': {
      const sourceType=feature.fields.find(x=>x.key==='source_id')?.type;
      if (sourceType && row.source_id) {
        const source=sourceFor(state,row,sourceType);
        if (['commissionReturns','expenseReturns','incomeReturns'].includes(feature.entity)) {
          if (source.status!=='posted') fail('Post the original voucher first.');
          if (row.amount + sum(postedRows(state,feature.entity,source.id),'amount')>asNumber(source.amount)) fail('Return exceeds the source voucher amount.');
        }
      }
      break;
    }
    default: fail('This document does not support posting.');
  }
  row.status='posted';
  journal(state,row,feature.post==='voucher'?feature.entity:feature.post,row.amount??row.total,feature.label);
}

export function validate(state,feature,row) {
  for (const f of feature.fields) {
    const v=row[f.key];
    if (f.required && !String(v ?? '').trim()) fail(`${f.label} is required.`);
    if (v != null && v !== '' && ['money','quantity','cost'].includes(f.type)) {
      if (!Number.isFinite(Number(v)) || Number(v)<0) fail(`${f.label} must be a non-negative number.`);
      row[f.key]=f.type==='money'?money(v):Number(v);
    }
    if (f.type==='email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail('Enter a valid email address.');
    if (Array.isArray(state[f.type]) && v && !find(state,f.type,v)) fail(`Select a valid ${f.label.toLowerCase()}.`);
  }
  if (feature.entity==='numbering'&&(!Number.isInteger(row.next)||row.next<1||!prefixes[row.document]&&!numberField[row.document]&&!entries.includes(row.document))) fail('Choose an existing document type and a positive sequence number.');
  if (feature.entity==='products'&&row.barcode&&state.products.some(x=>x.id!==row.id&&norm(x.barcode)===norm(row.barcode))) fail('This barcode is already assigned to another item.');
  if (row.amount != null && asNumber(row.amount)<=0) fail('Amount must be greater than zero.');
  if (feature.lines) {
    if (!row.items?.length) fail('Add at least one item.');
    row.items=row.items.map(line=>{
      const product=find(state,'products',line.product_id);
      const quantity=Number(line.quantity),price=Number(line.unit_price || 0);
      if (!product || !Number.isFinite(quantity) || quantity<=0 || !Number.isFinite(price) || price<0) fail('Each line needs an item, a positive quantity and a valid price.');
      return {...line,name:product.name,sku:product.sku,quantity,unit_price:money(price),total:money(quantity*price)};
    });
    row.subtotal=totalFor(row.items);
    if (asNumber(row.discount)>row.subtotal) fail('Discount cannot exceed the subtotal.');
    if (asNumber(row.discount)>asNumber(find(state,'roles',state.profile.role)?.discount_limit)) fail('The discount exceeds the current demo role limit.');
    row.total=money(row.subtotal-asNumber(row.discount));
  }
  const uniqueness=({products:'sku',branches:'code',numbering:'document',demoUsers:'email',demoAccounts:'code'})[feature.entity] || (['categories','brands','units','paymentTypes','roles'].includes(feature.entity)?'name':null);
  if (uniqueness && row[uniqueness] && state[feature.entity].some(x=>x.id!==row.id&&norm(x[uniqueness])===norm(row[uniqueness]))) fail(`${uniqueness} is already in use.`);
  if (feature.entity==='products' && row.supersede_id) {
    const visited=new Set([row.id]);
    for(let next=row.supersede_id;next;next=find(state,'products',next)?.supersede_id) {
      if(visited.has(next)) fail('Supersession cannot form a cycle.');
      visited.add(next);
    }
  }
}
export function permittedActions(feature,row) {
  if(!row || feature.master || !feature.post) return [];
  if(feature.post==='quote') {
    if(row.status==='accepted' && !row.invoice_id && !row.converted_invoice_id) return [['convert','Generate invoice']];
    if(['sent','prepared','under_review'].includes(row.status)) return [['approve','Approve quotation']];
    if(isDraft(row)) return [['post','Submit quotation']];
    return [];
  }
  if(feature.post==='delivery'&&row.status==='delivered') return [['convert','Generate invoice']];
  if(isDraft(row)) return [['post',({transfer:'Dispatch transfer',transferReceipt:'Receive stock',purchaseReceipt:'Post receipt',purchase:'Approve purchase order',invoice:'Post invoice'})[feature.post] || 'Post document']];
  return [];
}

function seedState(original, imported) {
  const state=copy(original);
  Object.assign(state,Object.fromEntries(entries.map(k=>[k,[]])));
  state.categories=[...new Set([...state.products.map(x=>x.category),'Imported catalogue'].filter(Boolean))].map(suggestion);
  state.brands=['Toyota','Nissan','Other'].map(suggestion);
  state.units=['Each','Set','Pack','Litre'].map(suggestion);
  state.paymentTypes=['Cash','Card','Bank transfer','Cheque','Credit'].map(suggestion);
  state.roles=[{id:'demo-admin',name:'Demo Administrator',discount_limit:500},{id:'demo-sales',name:'Demo Sales',discount_limit:50}];
  state.demoUsers=[];
  state.demoAccounts=demoAccounts.map(([code,name,account_type])=>({id:code,code,name,account_type}));
  state.profile={name:'Demo Operator',role:'demo-admin',branch_id:'all'};
  state.stock={};
  for (const entity of ['orders','quotations','invoices','purchases']) {
    for (const row of state[entity]) {
      if (!row.customer_id && row.customer_name) row.customer_id=state.customers.find(x=>norm(x.name)===norm(row.customer_name))?.id;
      if (!row.supplier_id && row.supplier_name) row.supplier_id=state.suppliers.find(x=>norm(x.name)===norm(row.supplier_name))?.id;
    }
  }
  for(const p of state.products) {
    p.part_number ||= p.oem_number || p.sku;
    if(p.vehicle_make && !find(state,'brands',p.vehicle_make)) state.brands.push(suggestion(p.vehicle_make));
    // The recovered fixture supplies aggregate stock only.
    state.stock[stockKey(p.id,state.branches[0].id)]=asNumber(p.on_hand ?? (asNumber(p.available)+asNumber(p.reserved)));
  }
  if(imported?.rows?.length) applyImport(state,imported,'Bundled client workbook');
  return state;
}

export function applyImport(state,preview,filename) {
  for (const candidate of preview.rows) {
    const conflict=state.products.some(x=>norm(x.sku)===norm(candidate.sku));
    if(conflict) fail(`Catalogue changed: duplicate ${candidate.sku}. Preview again.`);
    const row={...candidate};
    if(row.supplier_reference) {
      let existing=state.suppliers.find(x=>norm(x.name)===norm(row.supplier_reference));
      if(!existing) {existing={id:id(),name:row.supplier_reference,origin:'client-sample'};add(state,'suppliers',existing);}
      row.supplier_id=existing.id;
    }
    if(row.vehicle_make && !find(state,'brands',row.vehicle_make)) state.brands.push(suggestion(row.vehicle_make));
    add(state,'products',row);
  }
  add(state,'imports',{id:id(),date:today(),name:filename,accepted:preview.rows.length,rejected:preview.errors.length,issues:preview.errors,sheets:preview.sheets});
}
export function createDemoRepository(original, imported, storage=globalThis.localStorage) {
  const initial=()=>seedState(original(),imported);
  let state;
  let startupError='';
  try {
    const raw=storage?.getItem(STORAGE_KEY);
    state=raw?JSON.parse(raw):initial();
    state.journal??=[];
    state.demoAccounts??=demoAccounts.map(([code,name,account_type])=>({id:code,code,name,account_type}));
    if(!Array.isArray(state.products)||!state.stock||!state.profile) fail('Invalid saved demo data.');
  } catch { state=initial();startupError='Saved demo data was unavailable. The sample dataset was opened.'; }
  const listeners=new Set();
  const commit = (make,replace=false)=>{
    const next=replace?make():copy(state);
    const result=replace?undefined:make(next);
    try { storage?.setItem(STORAGE_KEY,JSON.stringify(next)); }
    catch { fail('Demo storage is full or blocked. This change was not saved.'); }
    state=next;
    listeners.forEach(fn=>fn());
    return result;
  };
  const api={
    get:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},startupError,
    add:(entity,row)=>commit(s=>{
      if(entity==='products' && s.products.some(x=>norm(x.sku)===norm(row.sku))) fail('Item code already exists.');
      add(s,entity,row);
      if(entity==='products' && asNumber(row.on_hand??row.available)>0) move(s,{...row,number:row.sku},[{product_id:row.id,quantity:asNumber(row.on_hand??row.available)}],s.branches[0].id,1,'Demo opening stock');
    }),
    update:(entity,key,patch)=>commit(s=>{
      const row=find(s,entity,key);
      if(!row) return;
      if(entity==='products' && patch.sku && s.products.some(x=>x.id!==key&&norm(x.sku)===norm(patch.sku))) fail('Item code already exists.');
      if(entity==='products' && 'available' in patch) {
        const difference=asNumber(patch.available)-asNumber(row.available);
        if(difference) move(s,{...row,number:row.sku},[{product_id:key,quantity:Math.abs(difference)}],s.branches[0].id,Math.sign(difference),'Catalogue adjustment');
        const {available,on_hand,...rest}=patch;
        Object.assign(row,rest);
      } else Object.assign(row,patch);
    }),
    remove:(entity,key)=>commit(s=>{s[entity]=s[entity].filter(x=>x.id!==key);}),
    updateSettings:patch=>commit(s=>Object.assign(s.settings,patch)),
    reset:()=>commit(initial,true),
    profile:patch=>commit(s=>Object.assign(s.profile,patch)),
    save:(feature,values,recordId)=>commit(s=>{
      const current=find(s,feature.entity,recordId);
      if(recordId&&!current) fail('Record no longer exists.');
      if(current&&!feature.master&&locked(current)) fail('Only drafts can be changed.');
      const row=linkNames(s,{...current,...copy(values),id:current?.id||id()});
      if(!feature.master) {
        row.date ||= today();row.status ||= 'draft';row.variant ||= feature.variant || '';
        row.number ||= current ? numberOf(current) : allocate(s,feature.entity);
        if(numberField[feature.entity]) row[numberField[feature.entity]]=row.number;
        if(dateField[feature.entity]) row[dateField[feature.entity]]=row.date;
      }
      validate(s,feature,row);
      if(current) s[feature.entity][s[feature.entity].indexOf(current)]=row;
      else add(s,feature.entity,row);
      audit(s,feature,row,current?'Edited':'Created');
      return row.id;
    }),
    action:(feature,key,action)=>commit(s=>{
      const row=find(s,feature.entity,key);
      if(!permittedActions(feature,row).some(([value])=>value===action)) fail('The action is no longer available.');
      validate(s,feature,row);
      post(s,feature,row,action);
      audit(s,feature,row,action);
    }),
    import:(preview,filename)=>commit(s=>applyImport(s,preview,filename)),
    pos:({seller,branch,lines,method,tendered})=>commit(s=>{
      const feature=features['sales-invoices'];
      if(!lines.length||!seller.trim()||!find(s,'branches',branch)) fail('Enter salesperson, branch and items.');
      const total=totalFor(lines);
      if (!Number.isFinite(Number(tendered))||Number(tendered)<0) fail('Tendered amount is invalid.');
      const paid=method==='credit'?0:money(Math.min(tendered||total,total));
      const orderNumber=allocate(s,'orders'),invoiceNumber=allocate(s,'invoices');
      const order={id:id(),order_number:orderNumber,branch_id:branch,salesperson:seller,customer_name:'Walk-in customer',order_date:today(),items:lines,total,status:'completed',amount_paid:paid,payment_status:paid===total?'paid':paid?'partial':'unpaid'};
      const row=linkNames(s,{id:id(),invoice_number:invoiceNumber,order_id:order.id,branch_id:branch,customer_name:order.customer_name,invoice_date:today(),date:today(),items:lines,total,status:order.payment_status,amount_paid:paid,balance:money(total-paid)});
      move(s,row,lines,branch,-1,'POS sale');
      order.invoice_id=row.id;
      add(s,'orders',order);add(s,'invoices',row);
      if(paid)add(s,'customerPayments',{id:id(),number:allocate(s,'customerPayments'),source_id:row.id,branch_id:branch,date:today(),amount:paid,method,status:'posted',customer_name:order.customer_name});
      journal(s,row,'invoice',total,'POS invoice');
      if(paid) journal(s,row,'customerPayment',paid,'POS receipt');
      audit(s,feature,row,'POS checkout');
      return {orderNumber,invoiceNumber,seller,total,paid,change:money(Math.max(0,(tendered||total)-total)),branch:row.branch_name};
    }),
  };
  return api;
}
export function dashboardSnapshot(state) {
  const scope=state.branches.find(branch=>branch.id===state.profile?.branch_id)?.id;
  const branches=scope?state.branches.filter(branch=>branch.id===scope):state.branches;
  const products=state.products.filter(product=>product.status!=='archived');
  const visible=row=>!scope||row.branch_id===scope;
  const scoped={
    ...state,branches,products:products.map(product=>{
      const onHand=branches.reduce((quantity,branch)=>quantity+knownStock(state,product.id,branch.id),0);
      const reserved=(!scope||scope===state.branches[0]?.id)?asNumber(product.reserved):0;
      return {...product,on_hand:onHand,available:Math.max(0,onHand-reserved)};
    }),
  };
  for(const key of ['invoices','orders','quotations','purchases']) scoped[key]=state[key].filter(visible);
  const branchRows=branches.map(branch=>{
    const invoices=state.invoices.filter(row=>row.branch_id===branch.id&&!['draft','cancelled'].includes(row.status));
    const purchases=state.purchases.filter(row=>row.branch_id===branch.id&&!['draft','cancelled'].includes(row.status));
    return {
      id:branch.id,name:branch.name,
      stockedItems:products.filter(product=>knownStock(state,product.id,branch.id)>0).length,
      invoiceCount:invoices.length,invoiced:sum(invoices,'total'),
      receivables:money(invoices.reduce((total,row)=>total+invoiceBalance(row),0)),
      payables:money(purchases.reduce((total,row)=>total+purchaseBalance(row),0)),
      incomingTransfers:state.transfers.filter(row=>row.to_branch_id===branch.id&&['dispatched','partial'].includes(row.status)).length,
    };
  });
  return {data:scoped,branches:branchRows,scope,clientItems:products.filter(product=>product.origin==='client-sample').length};
}

export function historicalPrice(state,productId,customerId,branchId) {
  const override=state.prices.find(r=>r.product_id===productId && r.customer_id===customerId && r.status==='posted');
  const related=[...state.invoices].filter(r=>!['draft','cancelled'].includes(r.status)&&r.customer_id===customerId&&(!branchId||r.branch_id===branchId)).sort((a,b)=>String(b.invoice_date||b.date).localeCompare(String(a.invoice_date||a.date)));
  const prior=related.flatMap(r=>r.items||[]).find(r=>r.product_id===productId);
  return override?.selling_price ?? prior?.unit_price ?? find(state,'products',productId)?.selling_price ?? 0;
}
export {today,find,numberOf,locked,knownStock};
