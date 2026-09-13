// Deterministic lifecycle checks against the real renderer with a fake GL driver.
// This verifies scheduling/resource ownership, not browser GPU speed or visual quality.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('components/visuals/orbital-engine.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createOrbitalEngine}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function scenario({mobile=false,reduced=false}={}){
 let next=0,draws=0,deletedBuffers=0,createdBuffers=0,deletedPrograms=0,disconnects=0;
 const frames=new Map(),observers=[],listeners=new Map();
 const target=name=>({addEventListener:(event,fn)=>listeners.set(`${name}:${event}`,fn),removeEventListener:event=>listeners.delete(`${name}:${event}`)});
 const motion={matches:reduced,...target('motion')};
 globalThis.matchMedia=q=>q.includes('reduced')?motion:{matches:mobile};
 globalThis.document={hidden:false,...target('document')};globalThis.devicePixelRatio=3;
 globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 globalThis.ResizeObserver=class{observe(){}disconnect(){disconnects++;}};
 globalThis.IntersectionObserver=class{constructor(fn){observers.push(fn);}observe(){}disconnect(){disconnects++;}};
 const constants={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,LINK_STATUS:35714,ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,STATIC_DRAW:35044,FLOAT:5126,TRIANGLES:4,UNSIGNED_SHORT:5123,DEPTH_TEST:2929,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256};
 const gl=new Proxy({...constants,createShader:()=>({}),createProgram:()=>({}),getProgramParameter:()=>true,getAttribLocation:()=>1,getUniformLocation:()=>1,createBuffer:()=>{createdBuffers++;return{};},deleteBuffer:()=>deletedBuffers++,deleteProgram:()=>deletedPrograms++,drawElements:()=>draws++},{get:(obj,key)=>obj[key]??(()=>{})});
 const canvas={dataset:{},width:0,height:0,getContext:()=>gl,getBoundingClientRect:()=>({width:720,height:640,left:0,top:0}),setPointerCapture(){},...target('canvas')};
 let ready=0,lost=0;const engine=createOrbitalEngine(canvas,()=>lost++,()=>ready++);
 const tick=time=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));};
 tick(100);assert.equal(ready,1);assert(draws>0);assert(canvas.width<=900&&canvas.height<=720);
 if(reduced)assert.equal(frames.size,0);else assert.equal(frames.size,1);
 observers[0]([{isIntersecting:false}]);assert.equal(frames.size,0);const before=draws;tick(200);assert.equal(draws,before);
 observers[0]([{isIntersecting:true}]);tick(250);assert(draws>before);
 document.hidden=true;listeners.get('document:visibilitychange')();assert.equal(frames.size,0);
 document.hidden=false;listeners.get('document:visibilitychange')();tick(300);
 engine.setActive(9);tick(350);assert.equal(canvas.dataset.active,'9');
 if(!reduced){for(let i=0;i<30;i++)tick(500+i*100);assert.equal(canvas.dataset.quality,'0.65');}
 engine.setPaused(true);tick(4000);assert.equal(frames.size,0);
 listeners.get('canvas:webglcontextlost')({preventDefault(){}});assert.equal(lost,1);assert.equal(frames.size,0);
 engine.dispose();assert.equal(listeners.size,0);assert.equal(disconnects,2);assert.equal(createdBuffers,deletedBuffers);assert.equal(deletedPrograms,1);assert.equal(frames.size,0);
 return {mobile,reduced,draws,createdBuffers,deletedBuffers,observersDisconnected:disconnects};
}
console.log(JSON.stringify({status:'PASS',scenarios:[scenario(),scenario({mobile:true}),scenario({reduced:true})]},null,2));
