"""Build: bundles src/main.js with esbuild and inlines CSS + JS into index.html."""
import subprocess
js = subprocess.run(['npx', 'esbuild', 'src/main.js', '--bundle', '--minify', '--format=iife', '--target=es2019'],
                    capture_output=True, text=True, check=True).stdout
css = open('src/style.css').read()
html = open('src/head.part').read() + open('src/body.part').read()
html = html.replace('/*__CSS__*/', css).replace('<script>/*__JS__*/</script>', '<script>' + js.replace('</script', '<\\/script') + '</script>')
import os
os.makedirs('public', exist_ok=True)
for out in ('index.html', 'public/index.html'):   # root = GitHub Pages, public/ = Vercel
    open(out, 'w').write(html)
import shutil
for f in os.listdir('assets'):                      # share image etc. → served at site root
    shutil.copy(os.path.join('assets', f), os.path.join('public', f))
    shutil.copy(os.path.join('assets', f), f)
print(len(html) // 1024, 'KB -> index.html + public/index.html')
