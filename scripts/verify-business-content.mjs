import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const raw=fs.readFileSync('data/business-os.ts','utf8');
const compiled=ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const content=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const dictionaries=JSON.parse(fs.readFileSync('data/translations.json','utf8'));
const files=['components/haydev.tsx',...fs.readdirSync('components/sections').filter(x=>x.endsWith('.tsx')).map(x=>'components/sections/'+x)];
const sources=raw+'\n'+files.map(x=>fs.readFileSync(x,'utf8')).join('\n');
const keys=[...sources.matchAll(/['"]([^'"\n]*[А-Яа-яЁё][^'"\n]*)['"]/g)].map(x=>x[1]).filter(x=>!['Рус','Русский'].includes(x));
for(const locale of ['hy','en'])for(const key of keys)assert(dictionaries[locale][key],`${locale}: ${key}`);
for(const file of files)assert(!/Պտտեք միջուկը|Rotate core|Drag to rotate|Вращайте ядро/i.test(fs.readFileSync(file,'utf8')),file);
assert.equal(content.businessNodes.length,10);assert.equal(content.layers.length,5);assert.equal(content.industrySystems.length,8);
assert.equal(content.auditQuestions.length,8);
for(const question of content.auditQuestions){assert.equal(question.options.length,question.risk.length);assert(question.risk.every(x=>x===true||x===false||x===null));}
for(const locale of ['hy','ru','en']){
 const t=x=>dictionaries[locale][x]??x;
 const longest=content.auditQuestions.map(q=>`${t(q.title)} ${q.options.map(t).sort((a,b)=>b.length-a.length)[0]}`).join('\n');
 assert(longest.length<2600,'All audit answers must fit the 3000-character form limit with header and sector.');
}
console.log(JSON.stringify({status:'PASS',translatedKeys:keys.length,languages:3,nodes:10,layers:5,industries:8,auditQuestions:8,auditFitsForm:true,rotationPanelAbsent:true}));
