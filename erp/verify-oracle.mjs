import assert from 'node:assert/strict';
import {features,oracleMenu} from './catalog.mjs';
import {createDemoRepository,pendingDeliveriesForYear,stockReceiptCosts,purchaseStatistics,knownStock} from './repository.mjs';
import {dashboardPreferences,dashboardPresets,linkedWorkspaces,workspaceMenu} from './workspace-navigation.mjs';

const menu = [
  [
    "Item Details",
    "items"
  ],
  [
    "Material Transfer",
    "transfers"
  ],
  [
    "Quotation to Customers",
    "quotes"
  ],
  [
    "Customised Item Master Entry",
    "custom-item-entry"
  ],
  [
    "Online Quotations",
    "online-quotes"
  ],
  [
    "Sales Invoice",
    "sales-invoices"
  ],
  [
    "Sales Return by Invoice",
    "invoice-returns"
  ],
  [
    "Item Cost Modification",
    "costs"
  ],
  [
    "Sales Commission Voucher",
    "commission-vouchers"
  ],
  [
    "Sales Commission Return",
    "commission-returns"
  ],
  [
    "Purchase Quotation Processing",
    "purchase-quotes"
  ],
  [
    "Purchase Order Receipt",
    "purchase-receipts"
  ],
  [
    "General Sales Return",
    "sales-returns"
  ],
  [
    "Customer Payment Voucher",
    "customer-payment-vouchers"
  ],
  [
    "Pur Process With Statistics",
    "purchase-processing"
  ],
  [
    "Stock Received Voucher",
    "stock-receipts"
  ],
  [
    "Material Transfer Receipt",
    "transfer-receipts"
  ],
  [
    "Purchase Returns",
    "purchase-returns"
  ],
  [
    "Supplier Receipt Voucher",
    "supplier-receipt-vouchers"
  ],
  [
    "Stock Adjustments",
    "stock-adjustments"
  ],
  [
    "Customer Receipt Voucher",
    "customer-receipt-vouchers"
  ],
  [
    "Supplier Payment Voucher",
    "supplier-payment-vouchers"
  ],
  [
    "SRV with Variable Cost",
    "srv-variable-cost"
  ],
  [
    "Customer Quotation Processing",
    "quote-processing"
  ],
  [
    "Invoice Part Payments",
    "invoice-part-payments"
  ],
  [
    "Sales Invoice with Remarks",
    "sales-invoice-remarks"
  ],
  [
    "Customer Quotation with Remarks",
    "quote-remarks"
  ],
  [
    "Material Delivery (Pre-Invoice)",
    "deliveries"
  ],
  [
    "Last Year Pending Deliveries",
    "last-year-pending-deliveries"
  ],
  [
    "Store Issue Voucher",
    "store-issues"
  ],
  [
    "Customer LPO",
    "customer-lpos"
  ],
  [
    "Generate Invoice from Delivery",
    "delivery-invoices"
  ],
  [
    "SRV with Percentage",
    "srv-percentage"
  ],
  [
    "Invoiced Delivery Details",
    "invoiced-deliveries"
  ],
  [
    "Payments / Expenses Voucher",
    "expenses"
  ],
  [
    "Payments / Expenses Returns",
    "expense-returns"
  ],
  [
    "Online Material Transfer Receipt",
    "online-transfer-receipts"
  ],
  [
    "Receipts / Income Voucher",
    "income"
  ],
  [
    "Receipts / Income Returns",
    "income-returns"
  ],
  [
    "Credit Note to Customers",
    "credit-notes"
  ],
  [
    "Debit Note to Suppliers",
    "debit-notes"
  ]
];

const seed=()=>({products:[],branches:[{id:'a',name:'A'},{id:'b',name:'B'}],customers:[],suppliers:[],quotations:[],orders:[],purchases:[],invoices:[],notifications:[],settings:{currency:'QAR'}});
const state=new Map(),storage={getItem:key=>state.get(key),setItem:(key,value)=>state.set(key,value)};
const desk=createDemoRepository(seed,{rows:[]},storage,{examples:true});
const data=desk.get();
assert.equal(menu.length,41);
assert.deepEqual(oracleMenu.map(({label,key})=>[label,key]),menu);
assert.equal(new Set(menu.map(([,key])=>key)).size,41);
for(const [label,key] of menu) {
  const feature=features[key];
  assert(feature,label+' must resolve');
  if(feature.entity) {
    const rows=data[feature.entity];
    assert(rows.some(row=>(!feature.variant||(row.variant||(row.source_id?'linked':'general'))===feature.variant)&&(!feature.remarks||Boolean(row.notes||row.remarks))),label+' must have a walkthrough record');
  }
}
const walkthroughPO=data.purchases.find(order=>order.status==='partially_received');
assert.deepEqual(purchaseStatistics([walkthroughPO]),{openOrders:1,receivedOrders:0,openLines:1,outstandingValue:100});
const product=data.products.find(item=>item.sku==='DEMO-FLT');
const variable=features['srv-variable-cost'],percent=features['srv-percentage'];
const values={branch_id:'a',date:'2026-11-23',items:[{product_id:product.id,quantity:3,unit_price:10},{product_id:product.id,quantity:1,unit_price:13}]};
const draft=desk.save(variable,values);
desk.save(variable,{reference:'COST/01'},draft);
desk.archive(variable,draft);
desk.restore(variable,draft);
desk.action(variable,draft,'post');
assert.throws(()=>desk.action(variable,draft,'post'),/no longer available/);
assert.throws(()=>desk.archive(variable,draft),/unposted/);
const initialStock=knownStock(desk.get(),product.id,'a');
assert.throws(()=>desk.save(percent,{...values,cost_percent:101}),/0 to 100/);
assert.throws(()=>desk.save(variable,{...values,items:[{...values.items[0],unit_price:''}]}),/unit cost/);
const receipt=desk.save(percent,{...values,cost_percent:7.5});
desk.action(percent,receipt,'post');
const updated=desk.get(),posted=updated.stockReceipts.find(row=>row.id===receipt);
assert.equal(posted.subtotal,43);
assert.equal(posted.surcharge_total,3.23);
assert.equal(posted.total,46.23);
assert.equal(updated.movements.find(x=>x.source_id===receipt).receipt_value,46.23);
assert.equal(knownStock(updated,product.id,'a'),initialStock+4);
const journal=updated.journal.find(x=>x.source_id===receipt);
assert.deepEqual(journal.lines.map(x=>[x.account,x.debit,x.credit]),[['1200',46.23,0],['2020',0,46.23]]);
assert.equal(stockReceiptCosts([{quantity:1,unit_price:0.04},{quantity:1,unit_price:0.04}],10).surcharge,0.01);
const year=new Date().getUTCFullYear()-1;
const pending=pendingDeliveriesForYear(updated,year);
assert.equal(pending.filter(x=>x.queueEntity==='orders'&&x.id.startsWith('demo:oracle:')).at(0).items[0].quantity,2);
const delivery=pending.find(x=>x.queueEntity==='deliveries'&&x.id.startsWith('demo:oracle:'));
const stockBefore=knownStock(updated,product.id,'a');
desk.action(features['delivery-invoices'],delivery.id,'convert');
assert(!pendingDeliveriesForYear(desk.get(),year).some(x=>x.id===delivery.id));
assert.equal(knownStock(desk.get(),product.id,'a'),stockBefore);
const itemId=desk.save(features['custom-item-entry'],{name:'Custom catalogue item',sku:'C-001',part_number:'P-001',bin_location:'B-02'});
assert.equal(desk.get().products.find(row=>row.id===itemId).bin_location,'B-02');
assert.deepEqual(createDemoRepository(seed,{rows:[]},storage,{examples:true}).get(),JSON.parse(JSON.stringify(desk.get())));
desk.reset();
assert.equal(desk.get().stockReceipts.filter(x=>x.receipt_cost).length,2);
console.log('41 menu mappings, demo records, valued receipts, posting guards, delivery backlog and shared Item Master passed.');
assert.equal(workspaceMenu.length,46);
assert.equal(new Set(workspaceMenu.map(({key})=>key)).size,46);
const legacyRoutes=['dashboard','inventory','pos','notifications'];
for(const {key} of workspaceMenu) assert(features[key]||Object.hasOwn(linkedWorkspaces,key)||['app-settings',...legacyRoutes].includes(key),key);
for(const [preset,{widgets}] of Object.entries(dashboardPresets)) {
  const layout=dashboardPreferences({dashboardLayout:{preset}});
  assert.deepEqual(layout.order.filter(key=>!layout.hidden.includes(key)),widgets);
}
assert.equal(dashboardPreferences({dashboardLayout:{preset:'unknown'}}).preset,'owner');
desk.profile({dashboardLayout:{preset:'shop',order:['shop','activity','unknown','shop'],hidden:['activity']}});
const persisted=dashboardPreferences(createDemoRepository(seed,{rows:[]},storage,{examples:true}).get().profile);
assert.deepEqual(persisted.order.slice(0,2),['shop','activity']);
assert.deepEqual(persisted.hidden,['activity']);
const onlineId=desk.save(features['online-customers'],{name:'Online test',classification:'Cash'});
assert.equal(desk.get().customers.find(row=>row.id===onlineId).customer_segment,'online');
const bank=features['bank-accounts'];
const account=desk.get().demoAccounts[0].id;
assert.throws(()=>desk.save(bank,{name:'Main bank',bank_name:'Demo Bank',account_last_four:'12345',account_id:account}),/last four/);
const bankId=desk.save(bank,{name:'Main bank',bank_name:'Demo Bank',account_last_four:'0123',account_id:account});
assert.equal(desk.get().bankAccounts.find(row=>row.id===bankId).account_last_four,'0123');
const fiscal=features['fiscal-periods'];
desk.save(fiscal,{name:'2027 January',start_date:'2027-01-01',end_date:'2027-01-31'});
assert.throws(()=>desk.save(fiscal,{name:'Overlapping',start_date:'2027-01-31',end_date:'2027-02-28'}),/overlaps/);
const draftBill=features['supplier-bills'];
const billId=desk.save(draftBill,{branch_id:'a',supplier_id:desk.get().suppliers[0].id,external_number:'A123',due_date:'2027-01-15',amount:12});
assert.equal(desk.get().supplierBills.find(row=>row.id===billId).status,'draft');
assert.throws(()=>desk.action(draftBill,billId,'post'),/no longer available/);
console.log('46 ERP entries, persisted dashboards, customer segments, bank account validation and draft controls passed.');
