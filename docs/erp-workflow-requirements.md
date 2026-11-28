# Al Batra ERP workflow requirements

The sidebar and grid expose the same modules. Search finds module names and items. The active branch is visible throughout the workspace. Dashboard layout is personal to each user, with Owner, Accountant and Shop presets, widget selection and ordering, and a reset to defaults. A dashboard preset never grants access to records.

## Modules and workflows

| Area | Screen | What the user does |
| --- | --- | --- |
| Dashboard | Shop dashboard | Choose a branch and date range. Owners track sales, margin, stock, receivables and exceptions. Accountants review cash, unpaid invoices, supplier balances and close tasks. Shop staff see today's sales, low stock, transfers and quick-entry actions. |
| Sales | Quotations | Price items for a customer, set validity, approve discounts, send the quote and convert accepted lines into an invoice or fulfilment workflow. Keep the source reference. |
| Sales | Invoices | Invoice approved items or delivered quantities, calculate totals in QAR, post receivables, track paid and outstanding amounts, and print or export the invoice. |
| Sales | Delivery Notes | Pick items from a branch, record partial delivery and proof of handover, and invoice outstanding delivered quantities once. |
| Sales | Customer Receipts | Record payment, allocate to one or more invoices, print a receipt, and reconcile with the bank or cash drawer. |
| Sales | Credit Notes | Reference the original invoice, record price or quantity adjustments, approve and post the credit. Update stock only when a physical return is received. |
| Sales | Refunds | Reference the original receipt or approved credit, check the available refundable balance, approve payout and record the settlement. |
| Sales | Point of Sale | Open a till, scan items, check branch stock, record tender, issue a receipt, and reconcile the till at close. |
| Purchases | Purchase Orders | Set supplier, branch, items, costs and expected receipt date. Approve and track partial deliveries. |
| Purchases | Bills | Record the supplier invoice, match PO and accepted quantities where applicable, flag variances, post payables and track due dates. |
| Purchases | Debit Notes | Link a supplier bill or return, document the adjustment, approve it and update the outstanding supplier balance. |
| Purchases | Payments Made | Record and allocate payment to supplier bills. Capture bank reference and preserve unapplied balances. |
| Purchases | Expenses | Record branch, expense account, payee, amount, payment method and receipt. Review and post. |
| Inventory | Inventory Dashboard | Review on-hand, in-transit, low-stock and movement totals by branch. Open the transaction detail. |
| Inventory | Items | Maintain SKU, descriptions, brands, units, fitment, barcodes, pricing and reorder level. Review movement and cost history. |
| Inventory | Material Receive | Receive against a PO or approved manual receipt, check quantities and condition, and post accepted stock to the branch. |
| Inventory | Material Transfer | Request and dispatch from the source branch, track stock in transit, and confirm receipt or discrepancies at the destination. |
| Inventory | Warehouses / Branches | Maintain locations and stock ownership. Assign staff access and retire locations after open movements are resolved. |
| Banking | Banks | Maintain bank accounts, linked ledger accounts, currency and activation status. Restrict account details. |
| Banking | Bank Reconciliation | Import statement lines, match ledger transactions, investigate differences and close the statement period with an audit trail. |
| Accounting | Chart of Accounts | Maintain account codes, types, hierarchy and posting eligibility. |
| Accounting | General Ledger | Filter posted entries by account, branch and period. Open source documents and export the selected view. |
| Accounting | Journal Entries | Enter balanced debit and credit lines, review and post to an open period, then reverse with a linked entry when required. |
| Accounting | Fiscal Periods | Define periods, close after review and restrict reopening to authorized users. |
| Accounting | Opening Balances | Stage opening balances by account and subledger, validate totals, approve and post one traceable cutover batch. |
| People | Customers | Maintain one customer record, credit terms, branch and contact details, with sales and receivables history. |
| People | Vendors | Maintain supplier records, terms and contacts, with bills, payments and outstanding balances. |
| People | Online Customers | Filter the shared customer master by online channel and review linked online orders and contact history. |
| People | B2B Customers | Filter the shared customer master by B2B segment and manage agreed pricing, credit terms and contacts. |
| People | Drivers | Maintain driver status, branch and licence expiry. Link drivers to deliveries and handover history. |
| Human Resources | Employees / Roles & Permissions | Maintain employee profiles and separately assign roles and branch scope. Enforce permissions on the server for staff records. |
| Human Resources | WPS | Review payroll by period, validate salary totals and required employer, payer and employee fields, generate the bank-approved Salary Information File after bank acceptance testing, and track acknowledgement. |
| Human Resources | Documents | Manage employee document type, issue and expiry dates, restricted attachment access and expiry follow-up. |
| Human Resources | Assets | Assign and return company assets, recording condition and assignment history. |
| Reports and Analysis | Financial Reports | Run trial balance, profit and loss, balance sheet and ageing from posted records, with period and branch filters. |
| Reports and Analysis | Sales Reports | Analyse sales, discounts and returns by branch, customer, item and period. |
| Reports and Analysis | Bank Reports | Review cash and bank activity, cleared and outstanding items, and statement reconciliation status. |
| Reports and Analysis | Inventory Reports | Review stock, movements, ageing and valuation by branch and item. |
| Reports and Analysis | General Reports | Open operational reports for purchases, open deliveries and transaction history. |
| Reports and Analysis | Custom Reports | Select an approved data source, columns and filters, save a report definition, and export accessible results. |
| Settings | Account Settings | Maintain company information, default currency and authorized account preferences. |
| Settings | Print Settings | Choose page size, margins and visibility of print fields. Preview before saving. |
| Settings | Document Templates | Maintain templates by document type, preview with sample data and activate a version. |
| Settings | App Settings | Manage personal sidebar, dashboard preset and widget preferences. Manage shared defaults with administrator privileges. |
| Settings | Activity Logs | Inspect actions with actor, time, branch and source reference. Filter and export for review. |
| Settings | Notifications | View alerts, mark them read and configure supported delivery preferences. |

## Posting and review

- Use stable links from source documents to derived records. Prevent duplicate posting and over-allocation for partial receipts, deliveries, payments, credits and refunds.
- Use the stock movement ledger for quantities and the posted journal for account balances. Preserve posting history and apply corrections through linked reversals.
- Check branch scope, permissions, approval thresholds and open fiscal period at the point of posting. Give the operator a specific reason when an operation is blocked.
- Confirm workflow definitions with Al Batra before production use, particularly direct invoices versus delivery-first stock posting, POS till close, supplier bill matching, valuation, bank import formats and cutover balances.
- The current repository publishes the staff shell separately from an isolated ERP demo that uses synthetic records and browser storage. Production workflows need the authorized staff backend, branch permissions, migration and end-to-end acceptance tests.

Qatar WPS reference https://www.cbq.com.qa/en/corporate/domestic-banking/cash-management-and-solutions/wages-protection-system
