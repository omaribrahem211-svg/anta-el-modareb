import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const dom=new JSDOM('<div id="test"></div>',{url:'http://localhost/'});
globalThis.window=dom.window; globalThis.document=dom.window.document;
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react');
const {createRoot}=await import('react-dom/client');
const applied=[];
const ids=Array.from({length:11},(_,i)=>`p${i}`);
const team={id:'nt_TEST',name:'test',flag:'X',worldRank:1,stats:{won:0,drawn:0,lost:0,played:0},trophies:[],
  players:Array.from({length:12},(_,i)=>({id:`p${i}`,name:`Player${i}`,position:i===0?'GK':'CM',overallRating:80-i,age:25})),
  tactics:{startingPlayerIds:ids}};
const ctx={nationalTeamsState:{teams:[team],friendlyMatches:[],pendingJobOffers:[],userNationalTeamId:team.id},userNationalTeam:team,
  setNationalTeamLineup:(v)=>applied.push(v),refreshNationalTeamCallUp(){},resignFromNationalTeam(){}};
const bundle=await build({entryPoints:['src/components/national/NationalTeamView.tsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',plugins:[{name:'test-context',setup(b){
  b.onResolve({filter:/GameContext$/},()=>({path:'ctx',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useGame=()=>globalThis.gameTestContext;',loader:'js'}));
}}]});
const sandbox={module:{exports:{}},require:createRequire(import.meta.url),gameTestContext:ctx};
sandbox.globalThis=sandbox;
vm.runInNewContext(bundle.outputFiles[0].text,sandbox);
const View=sandbox.module.exports.default;
const root=createRoot(document.getElementById('test'));
await React.act(async()=>root.render(React.createElement(View)));
const click=async(text)=>{
  const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
  assert.ok(b,`missing ${text}`);
  await React.act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
};
await click('التشكيلة');
await click('Player1');
assert.equal(applied.at(-1),null);
await click('Player11');
const chosen=applied.at(-1);
assert.equal(chosen.length,11,'replacement should complete XI');
assert.ok(!chosen.includes('p1'),'deselected player must remain out');
assert.ok(chosen.includes('p11'),'replacement should be selected');
await React.act(async()=>root.unmount());
console.log('PASS: NT lineup retains incomplete draft across two clicks and applies replacement XI');
