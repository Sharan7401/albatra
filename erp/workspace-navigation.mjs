export const workspaceGroups = [
  ['Dashboard', [['Shop Dashboard', 'dashboard']]],
  ['Sales', [
    ['Quotations', 'quotes'], ['Invoices', 'sales-invoices'], ['Delivery Notes', 'deliveries'],
    ['Customer Receipts', 'customer-receipt-vouchers'], ['Credit Notes', 'credit-notes'],
    ['Refunds', 'refunds'], ['Point of Sale', 'pos'],
  ]],
  ['Purchases', [
    ['Purchase Orders', 'purchase-orders'], ['Bills', 'supplier-bills'], ['Debit Notes', 'debit-notes'],
    ['Payments Made', 'supplier-payments'], ['Expenses', 'expenses'],
  ]],
  ['Inventory', [
    ['Inventory Dashboard', 'inventory'], ['Items', 'items'], ['Material Receive', 'stock-receipts'],
    ['Material Transfer', 'transfers'], ['Warehouses / Branches', 'branches'],
  ]],
  ['Banking', [['Banks', 'bank-accounts'], ['Bank Reconciliation', 'bank-reconciliation']]],
  ['Accounting', [
    ['Chart of Accounts', 'accounts'], ['General Ledger', 'ledger'], ['Journal Entries', 'journal-entries'],
    ['Fiscal Periods', 'fiscal-periods'], ['Opening Balances', 'opening-balances'],
  ]],
  ['People', [
    ['Customers', 'customers'], ['Vendors', 'suppliers'], ['Online Customers', 'online-customers'],
    ['B2B Customers', 'b2b-customers'], ['Drivers', 'drivers'],
  ]],
  ['Human Resources', [
    ['Employees / Roles & Permissions', 'users'], ['WPS', 'wps'], ['Documents', 'employee-documents'], ['Assets', 'employee-assets'],
  ]],
  ['Reports and Analysis', [
    ['Financial Reports', 'financial-summary'], ['Sales Reports', 'sales-report'], ['Bank Reports', 'bank-reports'],
    ['Inventory Reports', 'inventory-report'], ['General Reports', 'general-reports'], ['Custom Reports', 'custom-reports'],
  ]],
  ['Settings', [
    ['Account Settings', 'settings'], ['Print Settings', 'print-settings'], ['Document Templates', 'document-templates'],
    ['App Settings', 'app-settings'], ['Activity Logs', 'activity-logs'], ['Notifications', 'notifications'],
  ]],
];
export const workspaceMenu = workspaceGroups.flatMap(([group, entries]) =>
  entries.map(([label, key]) => ({group, label, key})));

export const dashboardWidgets = {
  metrics: 'Sales and stock indicators',
  performance: 'Sales performance',
  branches: 'Branch overview',
  activity: 'Operational activity',
  accounting: 'Accounting shortcuts',
  shop: 'Shop shortcuts',
};
export const dashboardPresets = {
  owner: {label: 'Owner', widgets: ['metrics', 'performance', 'branches', 'activity']},
  accountant: {label: 'Accountant', widgets: ['accounting', 'branches', 'metrics', 'performance']},
  shop: {label: 'Shop', widgets: ['shop', 'metrics', 'activity']},
};

export function dashboardPreferences(profile) {
  const layout = profile?.dashboardLayout;
  const preset = Object.hasOwn(dashboardPresets, layout?.preset) ? layout.preset : 'owner';
  const ordered = Array.isArray(layout?.order) ? layout.order : [];
  const hidden = Array.isArray(layout?.hidden) ? layout.hidden : [];
  const defaults = dashboardPresets[preset].widgets;
  const order = [...new Set([...ordered.filter(key => Object.hasOwn(dashboardWidgets, key)), ...defaults, ...Object.keys(dashboardWidgets)])];
  return {
    preset,
    order,
    hidden: Array.isArray(layout?.hidden)
      ? hidden.filter(key => Object.hasOwn(dashboardWidgets, key))
      : order.filter(key => !defaults.includes(key)),
  };
}

export const linkedWorkspaces = {
  'general-reports': [['Purchase activity', 'purchase-report'], ['Pending deliveries', 'last-year-pending-deliveries'], ['Transaction history', 'transaction-history'], ['Stock movements', 'movement-report']],
  'bank-reconciliation': [['Bank accounts', 'bank-accounts'], ['General Ledger', 'ledger']],
  'opening-balances': [['Chart of Accounts', 'accounts'], ['Journal Entries', 'journal-entries']],
  'custom-reports': [['Sales report', 'sales-report'], ['Inventory report', 'inventory-report'], ['Transaction history', 'transaction-history']],
  'print-settings': [['Preview an invoice', 'sales-invoices'], ['Preview a delivery note', 'deliveries']],
  'document-templates': [['Preview a quotation', 'quotes'], ['Preview an invoice', 'sales-invoices']],
  wps: [['Employee directory', 'users'], ['Employee documents', 'employee-documents']],
};
