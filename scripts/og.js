// Renders the 1200x630 social share image (assets/og.png) from the hero
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(9000);
await p.addStyleTag({content:'.cta-dock,.drag-hint,.hero-rating,.hero-ui,.nav nav,.nav-call{display:none!important}'});
await p.waitForTimeout(500);await p.screenshot({path:'assets/og.png'});await b.close();})();
