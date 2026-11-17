const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(6000);
await p.evaluate(()=>document.getElementById('enquiry').scrollIntoView());await p.waitForTimeout(1500);await p.evaluate(()=>{window.__u=null;window.open=(u)=>{window.__u=u}});
await p.click('#enquiry button[type=submit]');console.log('empty:',await p.textContent('.form-status'));
await p.fill('input[name=name]','Ravi');await p.fill('input[name=phone]','9847012345');await p.fill('input[name=area]','Edappally');
await p.click('#enquiry button[type=submit]');console.log(decodeURIComponent(await p.evaluate(()=>window.__u)));
const hrefs=await p.$$eval('a',a=>a.map(x=>x.getAttribute('href')).filter(h=>!h||h==='#'));console.log('dead links',hrefs);
await b.close();})();
