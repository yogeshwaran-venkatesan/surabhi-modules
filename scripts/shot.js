const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const only = process.argv[2];
  for (const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]) {
    if (only && only!==tag) continue;
    const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:1, hasTouch: tag==='m', isMobile: tag==='m' });
    const errs=[]; p.on('console',m=>{ if((m.type()==='error'||m.type()==='warning') && !/GL Driver|GPU stall/.test(m.text())) errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
    await p.goto('file://'+process.cwd()+'/index.html'); await p.waitForTimeout(1200); await p.screenshot({path:`shots/${tag}-load.png`});
    await p.waitForTimeout(5500);
    const ov = await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    const stops = {0:0,1:2.05,2:3.4,3:4.75,4:6.5};
    for (const [i,v] of Object.entries(stops)){ await p.evaluate(y=>window.scrollTo(0,y), v*h); await p.waitForTimeout(2600); await p.screenshot({path:`shots/${tag}-${i}.png`}); }
    for (const [sel,n] of [['.statement','st'],['#services','svc'],['.proof','proof'],['#process','proc'],['#visit','visit'],['.footer','foot']]) {
      await p.evaluate(s=>window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY), sel); await p.waitForTimeout(1800); await p.screenshot({path:`shots/${tag}-${n}.png`});
    }
    console.log(tag,'overflow',ov,'errs',errs.slice(0,8));
  }
  await b.close();
})();
