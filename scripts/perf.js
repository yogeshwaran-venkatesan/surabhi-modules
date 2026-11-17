const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.addInitScript(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push([Math.round(e.startTime),Math.round(e.duration)]))).observe({type:'longtask',buffered:true});
 const mo=new MutationObserver(()=>{ if(!document.getElementById('loader') && document.body && !window.__ready){window.__ready=performance.now();} }); document.addEventListener('DOMContentLoaded',()=>mo.observe(document.body,{childList:true}));});
const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(12000);
console.log(await p.evaluate(()=>JSON.stringify({longTasks:window.__lt.slice(0,12),scrollUnlockedAt:Math.round(window.__ready||-1),fcp:Math.round((performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||-1)})));
await b.close();})();
