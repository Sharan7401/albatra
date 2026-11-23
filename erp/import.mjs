const names = {sku:['ITEM_CODE','Internal item code','SKU'],oem_number:['ORGINAL','ORIGINAL','OEM'],part_number:['CODE','Part number','Manufacturer part number'],barcode:['Barcode'],name:['DESCRIPTION','Name','Part name'],description:['ITEM_LONG_DESCRIPTION','Long description'],selling_price:['MRP PRICES','Selling price','Price'],cost_price:['AVG_COST','Cost'],description_ar:['Arabic description','Arabic name'],supplier_reference:['SUPPLIER NUMBERS','Supplier'],vehicle_make:['Manufacturer','Vehicle make','Brand']};
export const mappingFields=Object.keys(names);
const normalize = value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');
const reverse=new Map(Object.entries(names).flatMap(([key,list])=>list.map(label=>[normalize(label),key])));
export function sheetHeaders(sheet) {
  const reviews=sheet.rows.slice(0,15).map((cells,index)=>({index,count:cells.filter(x=>reverse.has(normalize(x))).length}));
  const header=reviews.sort((a,b)=>b.count-a.count)[0];
  const index=header?.index??0;
  const columns=sheet.rows[index]||[];
  return {index,columns,mapping:Object.fromEntries(columns.flatMap((value,c)=>reverse.has(normalize(value))?[[reverse.get(normalize(value)),c]]:[]))};
}
export function previewWorkbook(sheets,overrides={},products=[]) {
  const existing=new Set(products.map(x=>normalize(x.sku)));
  const rows=[],errors=[],summaries=[];
  for(const sheet of sheets) {
    const header=sheetHeaders(sheet), map={...header.mapping,...overrides[sheet.name]};
    let accepted=0,rejected=0;
    const mappingValid=['sku','name','part_number'].every(x=>Number.isInteger(map[x])&&map[x]>=0);
    if(!mappingValid) {
      errors.push({sheet:sheet.name,row:header.index+1,reason:'Map internal item code, manufacturer part number and description.'});
      summaries.push({name:sheet.name,accepted,rejected:1});
      continue;
    }
    for(let index=header.index+1;index<sheet.rows.length;index++) {
      const cells=sheet.rows[index];if(!cells.some(x=>String(x??'').trim())) continue;
      const row=Object.fromEntries(mappingFields.map(key=>[key,String(cells[map[key]]??'').trim()]));
      let reason='';
      if(!row.sku||!row.name||!row.part_number) reason='Missing item code, part number or description.';
      else if(existing.has(normalize(row.sku))) reason='Duplicate item code.';
      else if(['selling_price','cost_price'].some(k=>row[k]&&!/^\d+(\.\d+)?$/.test(row[k]))) reason='Price or cost is invalid.';
      if(reason) {errors.push({sheet:sheet.name,row:index+1,sku:row.sku,reason});rejected++;continue;}
      existing.add(normalize(row.sku));
      rows.push({...row,id:`client:${row.sku}`,category:'Imported catalogue',selling_price:row.selling_price?Number(row.selling_price):null,cost_price:row.cost_price?Number(row.cost_price):null,available:0,on_hand:0,reserved:0,reorder_level:0,status:'active',origin:'client-sample'});
      accepted++;
    }
    summaries.push({name:sheet.name,accepted,rejected});
  }
  return {rows,errors,sheets:summaries};
}
function readCSV(text) {
  const rows=[];let row=[], value='', quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&c===','){row.push(value);value='';}
    else if(!quoted&&c==='\n'){row.push(value.replace(/\r$/,''));rows.push(row);row=[];value='';}
    else value+=c;
  }
  if(quoted) throw new Error('Unbalanced quotes in CSV.');
  if(value||row.length) rows.push([...row,value.replace(/\r$/,'')]);
  return rows;
}
async function unzip(bytes) {
  const v=new DataView(bytes), raw=new Uint8Array(bytes), d=new TextDecoder();
  let end=v.byteLength-22;
  while(end>=Math.max(0,v.byteLength-65557)&&v.getUint32(end,true)!==0x06054b50) end--;
  if(end<0||v.getUint32(end,true)!==0x06054b50) throw new Error('The file is not a valid Excel workbook.');
  const count=v.getUint16(end+10,true), files=new Map();
  let p=v.getUint32(end+16,true), expanded=0;
  for(let i=0;i<count;i++){
    if(v.getUint32(p,true)!==0x02014b50) throw new Error('Invalid workbook directory.');
    const method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),uncompressed=v.getUint32(p+24,true);
    const len=v.getUint16(p+28,true), offset=v.getUint32(p+42,true);
    const name=d.decode(raw.subarray(p+46,p+46+len));p+=46+len+v.getUint16(p+30,true)+v.getUint16(p+32,true);
    if(!name.startsWith('xl/')||!(name.endsWith('.xml')||name.endsWith('.rels'))) continue;
    expanded+=uncompressed;if(expanded>35_000_000) throw new Error('Workbook exceeds the supported expanded size.');
    if(v.getUint32(offset,true)!==0x04034b50) throw new Error('Invalid workbook entry.');
    const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);
    const data=raw.slice(start,start+size);
    if(![0,8].includes(method)) throw new Error('Unsupported workbook compression.');
    const body=method===0?data:await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    files.set(name,d.decode(body));
  }
  return files;
}
const nodes=(parent,tag)=>parent?Array.from(parent.getElementsByTagNameNS('*',tag)):[];
const allText=(parent,tag)=>nodes(parent,tag).map(x=>x.textContent).join('');
export async function readWorkbook(file) {
  if(file.size>10_000_000||file.size<1) throw new Error('Choose a workbook between 1 byte and 10 MB.');
  if(/\.csv$/i.test(file.name)) return [{name:file.name,rows:readCSV((await file.text()).replace(/^\ufeff/,''))}];
  if(!/\.xlsx$/i.test(file.name)) throw new Error('Choose an XLSX or CSV file.');
  const files=await unzip(await file.arrayBuffer());
  const xml=name=>files.has(name)?new DOMParser().parseFromString(files.get(name),'application/xml'):null;
  const relationship=nodes(xml('xl/_rels/workbook.xml.rels'),'Relationship');
  const targets=new Map(relationship.map(n=>[n.getAttribute('Id'),n.getAttribute('Target')]));
  const strings=nodes(xml('xl/sharedStrings.xml'),'si').map(n=>allText(n,'t'));
  const sheets=[];
  for(const sheet of nodes(xml('xl/workbook.xml'),'sheet')) {
    let path=targets.get(sheet.getAttribute('r:id'))||'';
    if(path.startsWith('/')) path=path.slice(1); else path='xl/'+path;
    const tree=xml(path);
    if(!tree||nodes(tree,'parsererror').length) throw new Error('A worksheet could not be read.');
    const rows=[];
    for(const row of nodes(tree,'row')) {
      const index=Number(row.getAttribute('r')||rows.length+1)-1;
      if(index>25000) throw new Error('A worksheet exceeds 25,000 rows.');
      const values=[];
      for(const cell of nodes(row,'c')) {
        const col=(cell.getAttribute('r')||'A').match(/^[A-Z]+/i)?.[0]?.toUpperCase()||'A';
        const c=[...col].reduce((sum,x)=>sum*26+x.charCodeAt(0)-64,0)-1;
        const format=cell.getAttribute('t'),raw=allText(cell,'v');
        const value=format==='s'?strings[Number(raw)]??'':format==='inlineStr'?allText(cell,'t'):raw;
        values[c]=value;
      }
      while(rows.length<index) rows.push([]);
      rows[index]=Array.from(values,x=>x??'');
    }
    sheets.push({name:sheet.getAttribute('name'),rows});
  }
  if(!sheets.length) throw new Error('The workbook contains no worksheets.');
  return sheets;
}
export function downloadCSV(filename, rows) {
  const encode=value=>{
    let text=String(value??'');
    if(/^[=+\-@\t\r]/.test(text)&&typeof value!=='number') text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(encode).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
