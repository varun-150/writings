#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.cwd();
const fail = [];
const pass = (s) => console.log('PASS  ' + s);
const bad = (s) => fail.push(s);
const htmlFiles = fs.readdirSync(root, {withFileTypes:true}).filter(x => x.isFile() && /\.html$/i.test(x.name)).map(x => path.join(root,x.name)).sort();
function attrs(tag) {
  const out = {};
  const body = tag.replace(/^<[^\s/>]+|\/?>$/g,'');
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  let m;
  while ((m = re.exec(body))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
function markupOnly(s) { return s.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,''); }
function targetFor(file, value) {
  if (!value || !value.trim() || value.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return null;
  const part = value.trim().split('#')[0].split('?')[0];
  if (!part) return null;
  let decoded;
  try { decoded = decodeURIComponent(part); } catch (_) { bad(path.basename(file)+': malformed URL encoding in '+value); return null; }
  return decoded.startsWith('/') ? path.resolve(root,'.'+decoded) : path.resolve(path.dirname(file),decoded);
}
function checkPage(file) {
  const rel = path.relative(root,file).replaceAll(path.sep,'/');
  const source = fs.readFileSync(file,'utf8');
  const markup = markupOnly(source);
  const idSet = new Set(), duplicates = new Set();
  let m;
  const idRe = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  while ((m=idRe.exec(markup))) { const id=m[1] ?? m[2]; if(idSet.has(id)) duplicates.add(id); idSet.add(id); }
  if (duplicates.size) bad(rel+': duplicate IDs: '+[...duplicates].join(', '));
  const h1s = (markup.match(/<h1\b/gi)||[]).length;
  if (h1s!==1) bad(rel+': expected one static h1, found '+h1s);
  if (!/<a\b[^>]*class\s*=\s*(?:"[^"]*\bskip-link\b[^"]*"|'[^']*\bskip-link\b[^']*')/i.test(markup)) bad(rel+': missing skip link');

  let imgs=0;
  const imgRe=/<img\b[^>]*>/gi;
  while ((m=imgRe.exec(markup))) { imgs++; const a=attrs(m[0]); if(!Object.prototype.hasOwnProperty.call(a,'alt')) bad(rel+': image missing alt'); const t=targetFor(file,a.src); if(t&&!fs.existsSync(t)) bad(rel+': missing image '+a.src); }

  const tagRe=/<(?:a|link|script|source|video|audio|iframe|img)\b[^>]*>/gi;
  while ((m=tagRe.exec(markup))) { const a=attrs(m[0]); for(const key of ['href','src','poster']) { const t=targetFor(file,a[key]); if(t&&!fs.existsSync(t)) bad(rel+': broken local '+key+' '+a[key]); } }
  const anchors=/<a\b[^>]*>/gi;
  while ((m=anchors.exec(markup))) { const a=attrs(m[0]); if(a.href&&a.href.startsWith('#')&&a.href.length>1&&!idSet.has(a.href.slice(1))) bad(rel+': dead fragment '+a.href); }

  const scripts=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let inline=0;
  while ((m=scripts.exec(source))) {
    const a=attrs('<script '+m[1]+'>');
    if(Object.prototype.hasOwnProperty.call(a,'src')) continue;
    if(a.type&&!/^(?:(?:text|application)\/javascript|module)$/i.test(a.type)) continue;
    if(!m[2].trim()) continue;
    inline++;
    try { new vm.Script(m[2],{filename:rel+' inline JS'}); } catch(e) { bad(rel+': inline JS parse error: '+e.message); }
  }
  if(!duplicates.size&&h1s===1) pass(rel+': one h1, unique IDs, '+imgs+' image(s), '+inline+' inline script(s)');
}
if(!htmlFiles.some(f=>path.basename(f).toLowerCase()==='index.html')) bad('root index.html is missing');
for(const file of htmlFiles) checkPage(file);

const indexFile=path.join(root,'index.html');
if(fs.existsSync(indexFile)) {
  const html=fs.readFileSync(indexFile,'utf8');
  const cards=[...html.matchAll(/<a\b(?=[^>]*\bclass\s*=\s*"[^"]*\bbook-card\b)[^>]*>/gi)];
  const pages=htmlFiles.filter(f=>path.basename(f).toLowerCase()!=='index.html');
  const targets=[];
  cards.forEach((m,i)=>{
    const a=attrs(m[0]);
    if(!a.href) bad('index.html: story card '+(i+1)+' lacks href');
    if(!a['aria-label']) bad('index.html: story card '+(i+1)+' lacks accessible name');
    if(!a['data-category']) bad('index.html: story card '+(i+1)+' lacks category');
    const t=targetFor(indexFile,a.href);
    if(!t) bad('index.html: story card '+(i+1)+' must use a local URL');
    else if(!fs.existsSync(t)) bad('index.html: broken story href '+a.href);
    else targets.push(path.resolve(t));
  });
  if(cards.length!==pages.length) bad('index.html: '+cards.length+' story cards vs '+pages.length+' story pages');
  if(new Set(targets).size!==targets.length) bad('index.html: duplicate story destinations');
  pages.forEach(p=>{if(!targets.includes(path.resolve(p))) bad('index.html: story page unreachable: '+path.basename(p));});
  const stat=html.match(/<span\b[^>]*\bid\s*=\s*"total-story-count"[^>]*>(\d+)<\/span>/i);
  if(!stat||Number(stat[1])!==cards.length) bad('index.html: story statistic does not match links');
  if(!html.includes('class="archive-primary-action" href="#story-bookshelf"')) bad('index.html: missing primary archive action');
  if(!/id\s*=\s*"story-bookshelf"/.test(html)) bad('index.html: archive action target missing');
  if(!/JavaScript is off\. Every story remains available below/i.test(html)) bad('index.html: no-JavaScript fallback missing');
  if(!html.includes('const storage = window.localStorage')) bad('index.html: reading storage is not guarded');
  if(!html.includes('target.origin !== window.location.origin')) bad('index.html: saved progress URL is not constrained to same origin');
  if(cards.length===pages.length&&new Set(targets).size===cards.length) pass('archive: '+cards.length+' native story links reach all story pages');
}
const js=path.join(root,'story-cinematic.js');
if(!fs.existsSync(js)) bad('story-cinematic.js is missing');
else {try {new vm.Script(fs.readFileSync(js,'utf8'),{filename:'story-cinematic.js'});pass('story-cinematic.js parses');}catch(e){bad('story-cinematic.js parse error: '+e.message);}}
for(const name of ['wr-ui.css','story-cinematic.css']) {
  const file=path.join(root,name);
  if(!fs.existsSync(file)){bad(name+' missing');continue;}
  const css=fs.readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const open=(css.match(/\{/g)||[]).length, close=(css.match(/\}/g)||[]).length;
  if(open!==close) bad(name+': unbalanced CSS braces '+open+'/'+close);
  else pass(name+': balanced CSS ('+open+' blocks)');
}
if(fail.length){console.error('\nFAILED '+fail.length+' checks:');fail.forEach(x=>console.error('FAIL  '+x));process.exitCode=1;}
else pass('Source audit passed across '+htmlFiles.length+' root HTML pages.');
