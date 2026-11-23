// Each entry defines a menu function and its editable data contract.
const field = (key, label, type = 'text', required = false) => ({key, label, type, required});
const name = field('name', 'Name', 'text', true);
const notes = field('notes', 'Remarks', 'textarea');
const branch = field('branch_id', 'Branch', 'branches', true);
const customer = field('customer_id', 'Customer', 'customers', true);
const supplier = field('supplier_id', 'Supplier', 'suppliers', true);
const item = field('product_id', 'Item', 'products', true);
const ref = (entity, label, required = true) => field('source_id', label, entity, required);
const amount = field('amount', 'Amount', 'money', true);
const method = field('method', 'Payment type', 'paymentTypes', true);
const date = field('date', 'Document date', 'date', true);
const numbered = (key, label, entity, fields, options = {}) => ({key,label,entity,fields,...options});
const master = (key, label, entity, fields, options = {}) => numbered(key,label,entity,fields,{master:true,...options});
const doc = (key,label,entity,fields,options={}) => numbered(key,label,entity,[date,...fields,notes],options);
const lines = {lines:true};
const report = (key,label,mode) => ({key,label,report:mode});
const category = field('category','Category','categories');
const price = field('selling_price','Selling price','money');
const simple = (key,label) => master(key,label,key,[name,field('name_ar','Arabic name','arabic'),notes]);
export const groups = [
  ['Inventory', [
    master('items','Item Master','products',[name,field('sku','Internal item code','text',true),field('part_number','Manufacturer part number','text',true),field('oem_number','Original identifier'),field('barcode','Barcode'),field('description_ar','Arabic description','arabic'),field('description','Long description','textarea'),category,field('vehicle_make','Brand','brands'),field('unit','Unit','units'),field('supplier_id','Supplier','suppliers'),field('supersede_id','Superseded by','products'),price,field('cost_price','Average cost','cost'),field('reorder_level','Reorder level','quantity')]),
    simple('categories','Categories'),simple('brands','Brands'),simple('units','Units'),
    doc('prices','Item Pricing','prices',[item,field('customer_id','Customer override','customers'),{...price,required:true}],{post:'price'}),
    doc('costs','Item Cost Modifications','costs',[item,field('cost_price','New average cost','cost',true)],{post:'cost'}),
    doc('stock-receipts','Stock Receipts','stockReceipts',[branch],{...lines,post:'stockIn'}),
    doc('stock-adjustments','Stock Adjustments','stockAdjustments',[branch,field('direction','Direction','Increase|Decrease',true)],{...lines,post:'adjust'}),
    report('supersessions','Item Supersessions','supersessions'),report('item-transactions','Item Transactions','movements'),
    report('branch-quantities','Branch Quantities','stock'),report('item-history','Item History','history'),
  ]],
  ['Sales', [
    doc('sales-invoices','Sales Invoices','invoices',[branch,customer,field('discount','Discount (QAR)','money')],{...lines,post:'invoice',number:'invoice_number'}),
    doc('sales-invoice-remarks','Sales Invoices with Remarks','invoices',[branch,customer,field('discount','Discount (QAR)','money')],{...lines,post:'invoice',number:'invoice_number',remarks:true}),
    doc('invoice-returns','Sales Returns by Invoice','salesReturns',[branch,customer,ref('invoices','Original invoice')],{...lines,post:'return',variant:'linked'}),
    doc('sales-returns','General Sales Returns','salesReturns',[branch,customer],{...lines,post:'return',variant:'general',proposed:true}),
    doc('commission-vouchers','Sales Commission Vouchers','commissions',[branch,field('salesperson','Salesperson','text',true),ref('invoices','Invoice'),amount],{post:'voucher',proposed:true}),
    doc('commission-returns','Commission Returns','commissionReturns',[branch,ref('commissions','Commission voucher'),amount],{post:'voucher',proposed:true}),
  ]],
  ['Quotations', [
    doc('quotes','Customer Quotations','quotations',[branch,customer,field('valid_until','Valid until','date')],{...lines,post:'quote',number:'quote_number'}),
    doc('quote-processing','Quotation Processing','quotations',[branch,customer,field('valid_until','Valid until','date')],{...lines,post:'quote',number:'quote_number',show:'work'}),
    doc('quote-remarks','Quotations with Remarks','quotations',[branch,customer,field('valid_until','Valid until','date')],{...lines,post:'quote',number:'quote_number',remarks:true}),
    doc('online-quotes','Online Quotations','quotations',[branch,customer,field('valid_until','Valid until','date')],{...lines,post:'quote',number:'quote_number',variant:'online',proposed:true}),
    doc('quote-approvals','Quotation Approvals','quotations',[branch,customer,field('valid_until','Valid until','date')],{...lines,post:'quote',number:'quote_number',show:'approval'}),
    doc('quote-to-invoice','Quotation-to-Invoice Conversion','quotations',[branch,customer,field('valid_until','Valid until','date')],{...lines,post:'quote',number:'quote_number',show:'conversion'}),
  ]],
  ['Purchases', [
    doc('purchase-quotes','Purchase Quotation Processing','purchaseQuotes',[branch,supplier],{...lines,post:'purchaseQuote',proposed:true}),
    doc('purchase-orders','Purchase Orders','purchases',[branch,supplier,ref('purchaseQuotes','Supplier quotation',false)],{...lines,post:'purchase',number:'po_number'}),
    doc('purchase-receipts','Purchase Order Receipts','purchaseReceipts',[branch,supplier,ref('purchases','Purchase order')],{...lines,post:'purchaseReceipt'}),
    doc('purchase-returns','Purchase Returns','purchaseReturns',[branch,supplier,ref('purchaseReceipts','Goods receipt')],{...lines,post:'purchaseReturn',proposed:true}),
    doc('purchase-processing','Purchase Processing','purchases',[branch,supplier,ref('purchaseQuotes','Supplier quotation',false)],{...lines,post:'purchase',number:'po_number',show:'work'}),
  ]],
  ['Warehouse', [
    doc('transfers','Material Transfers','transfers',[branch,field('to_branch_id','Destination branch','branches',true)],{...lines,post:'transfer'}),
    doc('transfer-receipts','Material Transfer Receipts','transferReceipts',[branch,ref('transfers','Dispatched transfer')],{...lines,post:'transferReceipt'}),
    doc('online-transfer-receipts','Online Transfer Receipts','transferReceipts',[branch,ref('transfers','Dispatched transfer')],{...lines,post:'transferReceipt',variant:'online',proposed:true}),
    doc('store-issues','Store Issue Vouchers','storeIssues',[branch,field('recipient','Issued to','text',true)],{...lines,post:'stockOut',proposed:true}),
    doc('deliveries','Pre-Invoice Deliveries','deliveries',[branch,customer,ref('orders','Sales order',false)],{...lines,post:'delivery',proposed:true}),
    report('invoiced-deliveries','Invoiced Deliveries','invoicedDeliveries'),
    doc('delivery-invoices','Invoice Generation from Delivery','deliveries',[branch,customer,ref('orders','Sales order',false)],{...lines,post:'delivery',show:'conversion',proposed:true}),
  ]],
  ['Customers', [
    master('customers','Customer Master','customers',[name,field('code','Customer code'),field('classification','Cash / credit','Cash|Credit',true),field('phone','Phone'),field('email','Email','email'),field('credit_limit','Credit limit','money'),notes]),
    master('customer-classification','Cash / Credit Classification','customers',[name,field('code','Customer code'),field('classification','Cash / credit','Cash|Credit',true),field('credit_limit','Credit limit','money'),notes]),
    report('customer-history','Customer History','customerHistory'),
    doc('customer-pricing','Customer-Specific Pricing','prices',[item,customer,{...price,required:true}],{post:'price',show:'customer'}),
    master('credit-limits','Customer Credit Limits','customers',[name,field('classification','Cash / credit','Cash|Credit',true),field('credit_limit','Credit limit','money',true),notes]),
    report('customer-statements','Customer Statements','customerStatement'),
    doc('customer-lpos','Customer LPO Records','customerLpos',[branch,customer,field('external_number','Customer LPO reference','text',true)],{...lines,post:'voucher',proposed:true}),
  ]],
  ['Suppliers', [
    master('suppliers','Supplier Master','suppliers',[name,field('code','Supplier code'),field('phone','Phone'),field('email','Email','email'),field('payment_terms','Payment terms'),notes]),
    report('supplier-transactions','Supplier Transactions','supplierHistory'),
    doc('supplier-receipts','Supplier Receipts','supplierReceipts',[branch,supplier,amount,method],{post:'voucher',proposed:true}),
    doc('supplier-payments','Supplier Payments','supplierPayments',[branch,supplier,ref('purchases','Purchase order / bill'),amount,method],{post:'supplierPayment'}),
    doc('supplier-debits','Supplier Debit Notes','supplierDebitNotes',[branch,supplier,ref('purchases','Purchase order / bill'),amount],{post:'supplierDebit',proposed:true}),
  ]],
  ['Finance', [
    doc('customer-payment-vouchers','Customer Payment Vouchers','customerPaymentsOut',[branch,customer,amount,method],{post:'voucher',proposed:true}),
    doc('customer-receipt-vouchers','Customer Receipt Vouchers','customerPayments',[branch,customer,ref('invoices','Invoice'),amount,method],{post:'customerPayment'}),
    doc('supplier-payment-vouchers','Supplier Payment Vouchers','supplierPayments',[branch,supplier,ref('purchases','Purchase order / bill'),amount,method],{post:'supplierPayment'}),
    doc('supplier-receipt-vouchers','Supplier Receipt Vouchers','supplierReceipts',[branch,supplier,amount,method],{post:'voucher',proposed:true}),
    doc('invoice-part-payments','Invoice Part Payments','customerPayments',[branch,customer,ref('invoices','Invoice'),amount,method],{post:'customerPayment'}),
    doc('expenses','Expense Vouchers','expenses',[branch,field('account','Expense account','text',true),amount,method],{post:'voucher',proposed:true}),
    doc('expense-returns','Expense Returns','expenseReturns',[branch,ref('expenses','Expense voucher'),amount],{post:'voucher',proposed:true}),
    doc('income','Income Vouchers','income',[branch,field('account','Income account','text',true),amount,method],{post:'voucher',proposed:true}),
    doc('income-returns','Income Returns','incomeReturns',[branch,ref('income','Income voucher'),amount],{post:'voucher',proposed:true}),
    doc('credit-notes','Customer Credit Notes','customerCredits',[branch,customer,ref('invoices','Invoice'),amount],{post:'customerCredit',proposed:true}),
    doc('debit-notes','Supplier Debit Notes','supplierDebitNotes',[branch,supplier,ref('purchases','Purchase order / bill'),amount],{post:'supplierDebit',proposed:true}),
    doc('journal-entries','Journal Entries','journal',[branch,field('name','Description','text',true)],{journal:true,post:'manualJournal'}),
  ]],
  ['Reports', [
    report('inventory-report','Inventory Reports','stock'),report('movement-report','Stock Movements','movements'),
    report('branch-stock','Branch Stock','stock'),report('sales-report','Sales Reports','sales'),
    report('purchase-report','Purchase Reports','purchases'),report('customer-outstanding','Customer Outstanding','receivables'),
    report('supplier-outstanding','Supplier Outstanding','payables'),report('transaction-history','Transaction History','history'),
    report('financial-summary','Financial Summaries','financial'),
  ]],
  ['Administration', [
    master('users','Users','demoUsers',[name,field('email','Email','email',true),field('role','Role','roles',true),field('branch_id','Home branch','branches'),notes],{proposed:true}),
    master('roles','Roles','roles',[name,field('discount_limit','Invoice discount limit','money'),notes],{proposed:true}),
    master('branches','Branches','branches',[name,field('code','Branch code','text',true),field('city','City'),field('address','Address'),notes]),
    simple('paymentTypes','Payment Types'),
    master('numbering','Document Numbering','numbering',[field('document','Document type','text',true),field('prefix','Prefix','text',true),field('next','Next number','quantity',true)]),
    {key:'settings',label:'Application Settings',special:'settings'},
    {key:'import',label:'Excel Import & Reset',special:'import'},
  ]],
];
export const features = Object.fromEntries(groups.flatMap(([group, entries]) => entries.map(entry=>[entry.key,{...entry,group}])));
Object.assign(features,{
  accounts:{key:'accounts',label:'Chart of Accounts',group:'Finance',entity:'demoAccounts',master:true,fields:[field('code','Account code','text',true),name,field('account_type','Account type','Asset|Liability|Equity|Income|Expense',true),notes]},
  ledger:{key:'ledger',label:'General Ledger',group:'Finance',report:'journal'},
  financials:{key:'financials',label:'Financial Statements',group:'Finance',report:'financial'},
});
export const extraLinks = [
  ['POS Terminal','pos'],['Sales Orders','orders'],['Notifications','notifications'],
  ['Sales Performance','performance'],['Procurement Insights','procurement'],['Chart of Accounts','accounts'],
  ['General Ledger','ledger'],['Financial Statements','financials'],
];
export const numberOf = record=>record?.number || record?.invoice_number || record?.quote_number || record?.po_number || record?.order_number || record?.sku || record?.code || record?.name || record?.id || '';
