const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(6000);
await p.evaluate(()=>window.scrollTo(0,6.5*900));await p.waitForTimeout(2500);
await p.click('[data-collection=sage-oak]');await p.click('[data-top=marble]');await p.waitForTimeout(1500);
await p.screenshot({path:'shots/cfg.png'});
console.log(await p.textContent('#look-label'), decodeURIComponent(await p.getAttribute('#look-cta','href')));
await b.close();})();
