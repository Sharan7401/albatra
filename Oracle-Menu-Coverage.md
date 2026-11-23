# Oracle Main Menu coverage

The visible AL BATRA Oracle Main Menu screenshot contains 41 labeled business functions. A meeting overlay obscures part of the last column and the full Purchase Process label. The recording itself is not available for verification.

Open the routes below from the deployed preview or search for the function in the workspace. Remarks, settlement, and processing views share business records with their primary routes.

| # | Oracle menu | Demo |
|---:|---|---|
| 1 | Item Details | `/demo/items` |
| 2 | Material Transfer | `/demo/transfers` |
| 3 | Quotation to Customers | `/demo/quotes` |
| 4 | Customised Item Master Entry | `/demo/custom-item-entry` |
| 5 | Online Quotations | `/demo/online-quotes` |
| 6 | Sales Invoice | `/demo/sales-invoices` |
| 7 | Sales Return by Invoice | `/demo/invoice-returns` |
| 8 | Item Cost Modification | `/demo/costs` |
| 9 | Sales Commission Voucher | `/demo/commission-vouchers` |
| 10 | Sales Commission Return | `/demo/commission-returns` |
| 11 | Purchase Quotation Processing | `/demo/purchase-quotes` |
| 12 | Purchase Order Receipt | `/demo/purchase-receipts` |
| 13 | General Sales Return | `/demo/sales-returns` |
| 14 | Customer Payment Voucher | `/demo/customer-payment-vouchers` |
| 15 | Purchase Process… | `/demo/purchase-processing` |
| 16 | Stock Received Voucher | `/demo/stock-receipts` |
| 17 | Material Transfer Receipt | `/demo/transfer-receipts` |
| 18 | Purchase Returns | `/demo/purchase-returns` |
| 19 | Supplier Receipt Voucher | `/demo/supplier-receipt-vouchers` |
| 20 | Stock Adjustments | `/demo/stock-adjustments` |
| 21 | Customer Receipt Voucher | `/demo/customer-receipt-vouchers` |
| 22 | Supplier Payment Voucher | `/demo/supplier-payment-vouchers` |
| 23 | SRV with Variable Cost | `/demo/srv-variable-cost` |
| 24 | Customer Quotation Processing | `/demo/quote-processing` |
| 25 | Invoice Part Payments | `/demo/invoice-part-payments` |
| 26 | Sales Invoice with Remarks | `/demo/sales-invoice-remarks` |
| 27 | Customer Quotation with Remarks | `/demo/quote-remarks` |
| 28 | Material Delivery (Pre-Invoice) | `/demo/deliveries` |
| 29 | Last Year Pending Deliveries | `/demo/last-year-pending-deliveries` |
| 30 | Store Issue Voucher | `/demo/store-issues` |
| 31 | Customer LPO | `/demo/customer-lpos` |
| 32 | Generate Invoice from Delivery | `/demo/delivery-invoices` |
| 33 | SRV with Percentage | `/demo/srv-percentage` |
| 34 | Invoiced Delivery Details | `/demo/invoiced-deliveries` |
| 35 | Payments / Expenses Voucher | `/demo/expenses` |
| 36 | Payments / Expenses Returns | `/demo/expense-returns` |
| 37 | Online Material Transfer Receipt | `/demo/online-transfer-receipts` |
| 38 | Receipts / Income Voucher | `/demo/income` |
| 39 | Receipts / Income Returns | `/demo/income-returns` |
| 40 | Credit Note to Customers | `/demo/credit-notes` |
| 41 | Debit Note to Suppliers | `/demo/debit-notes` |

## Workflows requiring client validation

- **Customised Item Master Entry**. Shared catalogue and identifiers. Bin/shelf is a proposed field.
- **SRV with Variable Cost**. Unit acquisition cost is entered per line. Posting stores movement valuation and a balanced clearing entry.
- **SRV with Percentage**. Proposed formula applies a 0–100% landed-cost charge to the receipt’s base value, allocated by line value to the currency cent.
- **Last Year Pending Deliveries**. Previous calendar year. Open orders show remaining quantities. Delivered records awaiting invoicing open the conversion workflow.
- **Purchase Process…**. Existing purchase workflow with a prefilled outstanding receipt action. Exact label and alternate behavior are obscured in the screenshot.
- **Invoiced Delivery Details**. Open the posted delivery or linked invoice from report detail.

The preview uses synthetic transactions. The Oracle documentation describes [receipt costing](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/fapma/purchase-order-receipts.html), [value-based landed-cost allocation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2418831.html), and [separate fulfillment and billing statuses](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1220604.html). These are design references for the demo. The exact operating rules behind the AL BATRA buttons require review with the client.

Run `node erp/verify-oracle.mjs` to verify menu mapping, synthetic fixtures, and the new workflow scenarios.
