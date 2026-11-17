const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const [w,h,t] of [[1600,900,'d'],[390,844,'m']]){const p=await b.newPage({viewport:{width:w,height:h}});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(5000);
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(2500);
console.log(t, await p.evaluate(()=>{const r=document.querySelector('.mega-word').getBoundingClientRect();return [r.left,r.right,innerWidth,document.querySelector('.mega-word').scrollWidth]}));
await p.screenshot({path:`shots/foot-${t}.png`});}
await b.close();})();
