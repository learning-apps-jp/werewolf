const fs=require('fs'),path=require('path');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(__dirname,'style.css'),'utf8')+'</style>');
for(let f of ['engine.js','art.js','audio.js','game.js'])html=html.replace(`<script src="${f}"></script>`,()=>'<script>'+fs.readFileSync(path.join(__dirname,f),'utf8')+'</script>');
fs.writeFileSync(path.join(__dirname,'play.html'),html);console.log('Built werewolf/play.html');
