import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'erp-demo-preview') {
  throw new Error('This build is restricted to the designated Vercel preview branch.');
}
execFileSync(process.execPath,['erp/integrate.mjs','index-B4sSgSHQ.js'],{stdio:'inherit'});
mkdirSync('dist/assets',{recursive:true});
mkdirSync('dist/erp',{recursive:true});
for (const file of ['index-B4sSgSHQ.js','index-yny9lcrr.css']) copyFileSync(file,'dist/assets/'+file);
for (const file of ['app.mjs','catalog.mjs','import.mjs','repository.mjs','workspace.css']) copyFileSync('erp/'+file,'dist/erp/'+file);
let app = readFileSync('dist/assets/index-B4sSgSHQ.js','utf8');
app = app.replace('["127.0.0.1","localhost"].includes(window.location.hostname)','true');
writeFileSync('dist/assets/index-B4sSgSHQ.js',app);
writeFileSync('dist/erp/client-catalogue.mjs','export default [];\n');
const html = readFileSync('index.html','utf8').replace(/^.*rel="(?:icon|manifest)".*\n/gm,'');
writeFileSync('dist/index.html',html);
writeFileSync('dist/staff.html','<!doctype html><meta charset="utf-8"><title>Al Batra Demo</title><main><h1>Private demo preview</h1><p>Staff authentication is available in the existing deployment.</p><a href="/demo/login">Open demo login</a></main>');
console.log('Built isolated demo preview.');
