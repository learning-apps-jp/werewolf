(function(root){
'use strict';
const roles={
 villager:{name:'村人',team:'village',symbol:'◇',desc:'話し合いと投票で、人狼を見つけよう。'},
 wolf:{name:'人狼',team:'wolf',symbol:'☾',desc:'仲間と襲撃先を選び、人狼だと気づかれずに生き残ろう。'},
 seer:{name:'占い師',team:'village',symbol:'✧',desc:'毎晩1人を占い、人狼かどうかを調べられる。'},
 knight:{name:'騎士',team:'village',symbol:'♜',desc:'毎晩、自分以外の1人を人狼の襲撃から守れる。'},
 medium:{name:'霊媒師',team:'village',symbol:'❋',desc:'昼に追放された人が、人狼だったか分かる。'},
 mad:{name:'狂人',team:'wolf',special:true,symbol:'♢',desc:'人狼の味方。誰が人狼かは知らない。'},
 shared:{name:'共有者',team:'village',special:true,symbol:'∞',desc:'2人1組。お互いが村人陣営だと分かる。'},
 fanatic:{name:'狂信者',team:'wolf',special:true,symbol:'✦',desc:'人狼の味方。誰が人狼かを知っている。'}
};
function random(n){if(!Number.isInteger(n)||n<1)throw Error('抽選候補がありません');const max=4294967296-Math.floor(4294967296%n);let x;do{x=root.crypto.getRandomValues(new Uint32Array(1))[0];}while(x>=max);return x%n;}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function preset(n,kind='basic'){
 const c=Object.fromEntries(Object.keys(roles).map(k=>[k,0]));c.wolf=n<=6?1:n<=11?2:n<=16?3:4;c.seer=1;
 if(kind!=='beginner'){c.knight=1;c.medium=n>=8?1:0;}
 if(kind==='shared')c.shared=2;
 if(kind==='fanatic'){c.mad=0;c.fanatic=1;}
 c.villager=n-Object.values(c).reduce((a,b)=>a+b,0);return c;
}
function validate(c,n){
 if(!Number.isInteger(n)||n<5||n>20)return '参加人数は5〜20人にしてください。';
 if(Object.keys(c).some(k=>!roles[k])||Object.keys(roles).some(k=>!Number.isInteger(c[k])||c[k]<0))return '役職の人数を確認してください。';
 if(Object.values(c).reduce((a,b)=>a+b,0)!==n)return '役職の合計を参加人数に合わせてください。';
 if(c.wolf<1)return '人狼を1人以上入れてください。';
 if(c.wolf>=n-c.wolf)return '人狼が多すぎます。村人側の人数を増やしてください。';
 if(c.shared!==0&&c.shared!==2)return '共有者は0人か2人にしてください。';
 if(c.fanatic>1)return '狂信者は1人までにしてください。';
 return '';
}
function winner(g){let p=g.players.filter(p=>p.alive),w=p.filter(p=>p.role==='wolf').length,h=p.length-w;return w===0?'village':w>=h?'wolf':null;}
function create(names,c,settings){let error=validate(c,names.length);if(error)throw Error(error);let deck=shuffle(Object.entries(c).flatMap(([k,n])=>Array(n).fill(k))),clean=names.map((name,id)=>name.trim()||`参加者${id+1}`);return {version:1,players:clean.map((name,id)=>({id,name:clean.filter(n=>n===name).length>1?`${name}（席${id+1}）`:name,role:deck[id],alive:true,history:[],lastGuard:null})),counts:{...c},settings:{...settings},phase:'deal',i:0,day:1,night:0,actions:{},votes:{},round:0,candidates:[],events:[],results:{},pendingDead:[],winner:null,deadline:null,remaining:settings.minutes*60000};}
function ids(g){return g.players.filter(p=>p.alive).map(p=>p.id);}
function startNight(g,initial=false){g.phase='night';g.night=initial?0:g.day;g.i=0;g.queue=ids(g);g.actions={};g.results={};g.pendingDead=[];g.initial=initial;g.deadline=null;}
function validTargets(g,id){let p=g.players[id];return g.players.filter(t=>t.alive&&t.id!==id&&(p.role!=='wolf'||t.role!=='wolf')&&(p.role!=='knight'||g.settings.repeatGuard||t.id!==p.lastGuard)).map(t=>t.id);}
function submitNight(g,id,target){let p=g.players[id];if(!p?.alive)throw Error('行動できません');if(Object.hasOwn(g.actions,id))return g.results[id]||null;let active=!g.initial&&['wolf','seer','knight'].includes(p.role)||g.initial&&p.role==='seer'&&g.settings.firstSeer==='free';if(active){let targets=validTargets(g,id);if(targets.length&&!targets.includes(target))throw Error('対象を選んでください');if(!targets.length)target=null;}else target=null;g.actions[id]=target;
 let msg=null;
 if(p.role==='seer'){
  if(g.initial&&g.settings.firstSeer==='random'){let pool=g.players.filter(t=>t.alive&&t.id!==id&&t.role!=='wolf');if(pool.length)target=pool[random(pool.length)].id;}
  if(target!==null){msg=`${g.players[target].name}：${g.players[target].role==='wolf'?'人狼':'人狼ではない'}`;}
 }
 if(p.role==='medium'&&!g.initial&&g.lastExile!==null&&g.lastExile!==undefined){let t=g.players[g.lastExile];msg=`追放された${t.name}：${t.role==='wolf'?'人狼':'人狼ではない'}`;}
 if(msg){g.results[id]=msg;p.history.push({night:g.night,text:msg});}return msg;
}
function selectPlurality(values){let counts={};values.forEach(v=>{if(v!==null)counts[v]=(counts[v]||0)+1;});let entries=Object.entries(counts);if(!entries.length)return {target:null,tied:[]};let max=Math.max(...entries.map(e=>e[1])),tied=entries.filter(e=>e[1]===max).map(e=>Number(e[0]));return {target:tied[random(tied.length)],tied};}
function resolveNight(g){
 if(ids(g).some(id=>!Object.hasOwn(g.actions,id)))throw Error('夜の入力が完了していません');
 let dead=null,attack=null,tied=[];let alive=g.players.filter(p=>p.alive);
 if(!g.initial){let pick=selectPlurality(alive.filter(p=>p.role==='wolf').map(p=>g.actions[p.id]));attack=pick.target;tied=pick.tied;let protectedIds=alive.filter(p=>p.role==='knight').map(p=>g.actions[p.id]);if(attack!==null&&!protectedIds.includes(attack))dead=attack;}
 for(let p of alive)if(p.role==='knight'&&!g.initial)p.lastGuard=g.actions[p.id];
 g.pendingDead=dead===null?[]:[dead];g.events.push({type:'night',night:g.night,dead:[...g.pendingDead],attack,tied,actions:{...g.actions}});dawn(g);
}
function dawn(g){g.pendingDead.forEach(id=>g.players[id].alive=false);if(!g.initial)g.day++;g.phase='morning';g.winner=winner(g);g.deadline=null;g.remaining=g.settings.minutes*60000;}
function startVote(g){g.phase='vote';g.queue=ids(g);g.i=0;g.votes={};g.round=0;g.candidates=ids(g);g.deadline=null;}
function submitVote(g,id,target){if(!ids(g).includes(id)||id===target||!g.candidates.includes(target))throw Error('投票先を選んでください');g.votes[id]=target;}
function resolveVote(g){
 if(ids(g).some(id=>!Object.hasOwn(g.votes,id)))throw Error('投票が完了していません');
 let counts=Object.fromEntries(g.candidates.map(id=>[id,0]));Object.values(g.votes).forEach(id=>counts[id]++);let max=Math.max(...Object.values(counts)),tied=g.candidates.filter(id=>counts[id]===max);g.voteSummary=counts;
 g.events.push({type:'vote',day:g.day,round:g.round,votes:{...g.votes},counts:{...counts}});
 if(tied.length>1&&g.round===0){g.phase='tie';g.candidates=tied;return;}
 let exiled=tied.length===1?tied[0]:g.settings.tie==='random'?tied[random(tied.length)]:null;
 g.lastExile=exiled;if(exiled!==null)g.players[exiled].alive=false;
 g.events.push({type:'exile',day:g.day,id:exiled,tied});g.phase='exile';g.winner=winner(g);
}
function revote(g){g.phase='vote';g.queue=ids(g);g.i=0;g.votes={};g.round=1;}
const api={roles,random,shuffle,preset,validate,winner,create,ids,startNight,validTargets,submitNight,resolveNight,dawn,startVote,submitVote,resolveVote,revote};
if(typeof module!=='undefined')module.exports=api;else root.Werewolf=api;
})(globalThis);
