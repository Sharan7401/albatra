import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';

const files = ['index.html', 'index-B4sSgSHQ.js', 'index-yny9lcrr.css'];
const demo = 'dist/demo-runtime';
const modules = demo + '/modules';
mkdirSync(modules, {recursive: true});
for (const file of files) copyFileSync(file, 'dist/' + file);

const bundle = demo + '/workspace.js';
execFileSync(process.execPath, ['erp/integrate.mjs', files[1], bundle], {stdio: 'inherit'});
const code = readFileSync(bundle, 'utf8');
const localPdfCondition = '["127.0.0.1","localhost"].includes(window.location.hostname)';
if (!code.includes(localPdfCondition)) throw new Error('Demo PDF isolation hook was not found.');
writeFileSync(bundle, code.replace(localPdfCondition, 'true'));

for (const file of ['app.mjs', 'catalog.mjs', 'import.mjs', 'repository.mjs', 'workspace.css']) {
  copyFileSync('erp/' + file, modules + '/' + file);
}
writeFileSync(modules + '/client-catalogue.mjs', 'export default [];\n');

const index = readFileSync(files[0], 'utf8');
const demoPage = index
  .replace(/^.*rel="(?:icon|manifest)".*\n/gm, '')
  .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; object-src \'none\'; base-uri \'none\'">')
  .replace('<title>Al Batra Auto Spare Parts</title>', '<link rel="stylesheet" href="/erp/workspace.css">\n  <title>Al Batra ERP Demo</title>')
  .replace('/assets/index-B4sSgSHQ.js', '/demo-workspace.js');
if (!demoPage.includes('/demo-workspace.js') || !demoPage.includes('/erp/workspace.css')) {
  throw new Error('Demo document assets were not configured.');
}
writeFileSync(demo + '/index.html', demoPage);
console.log('Built the original staff site and isolated ERP demo.');
