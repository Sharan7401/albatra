# Al Batra ERP private demo preview

This branch is the isolated Vercel Preview build of the existing React app. It has no API rewrites to production. Vercel Authentication must remain enabled for preview deployments.

The Executive Dashboard opens after demo login. ERP workflows live inside the original sidebar and share the existing browser-local data store.

The hosted build includes a linked, clearly labelled sample walkthrough for the ERP modules. It is added once to each browser demo store. Use **Excel Import & Reset** to read client catalogues locally in the browser. The import has no upload endpoint.
 
The source bundle remains pinned to the existing deployment. The build applies the small demo integration and bundles the editable implementation in `erp/`.
