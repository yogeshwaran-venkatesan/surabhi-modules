// Counts WebGL draws while the page sits idle in the hero and at the configurator (should drop to ~0 after 10 s)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:800}});
await p.addInitScript(()=>{window.__draws=0;const o=WebGL2RenderingContext.prototype.drawElements;WebGL2RenderingContext.prototype.drawElements=function(...a){window.__draws++;return o.apply(this,a)};
 const o2=WebGL2RenderingContext.prototype.drawArrays;WebGL2RenderingContext.prototype.drawArrays=function(...a){window.__draws++;return o2.apply(this,a)};});
const t0=Date.now();await p.goto('file://'+process.cwd()+'/index.html');
await p.waitForFunction(()=>!document.getElementById('loader'),null,{timeout:20000});console.log('loader gone after',Date.now()-t0,'ms');
await p.mouse.move(5,5);await p.waitForTimeout(20000);
const a=await p.evaluate(()=>window.__draws);await p.waitForTimeout(3000);const b2=await p.evaluate(()=>window.__draws);
console.log('hero idle draws in 3s (after 20s idle):',b2-a);
await p.evaluate(()=>window.scrollTo(0,6.5*innerHeight));await p.waitForTimeout(15000);
const c=await p.evaluate(()=>window.__draws);await p.waitForTimeout(3000);const d=await p.evaluate(()=>window.__draws);
console.log('configurator idle draws in 3s:',d-c);
await b.close();})();
