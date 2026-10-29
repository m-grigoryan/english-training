from pathlib import Path
root=Path(__file__).resolve().parent
script='\n'.join((root/name).read_text() for name in ['dictionary.js','core.js','storage.js','importer.js','app.js'])
assert '</script' not in script.lower()
html=(root/'template.html').read_text().replace('__ENGLISH_STYLE__',(root/'style.css').read_text()).replace('__ENGLISH_SCRIPT__',script)
(root/'dist').mkdir(exist_ok=True)
for output in [root/'dist/EnglishTraining.html',root.parent/'EnglishTraining.html',root.parent/'index.html']:output.write_text(html)
print('Built the standalone English Training app.')
