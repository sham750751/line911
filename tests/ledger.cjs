const assert=require('node:assert/strict');
const L=require('../android/assets/ledger.js');
const events=[];
function add(type,fields){const row={id:'e'+(events.length+1),time:new Date().toISOString(),type,...fields};const s=L.project([...events,row]);events.push(row);return s}
let s=add('buy',{partner:'Тест',rate:130000,fees:52000,paid:25000,place:'Гуанчжоу',items:[{name:'A',qty:3,price:10000},{name:'B',qty:1,price:10000}]});
assert.equal(s.orders.e1.due,15000);assert.equal(s.orders.e1.total,572000);assert.equal(s.lots['e1-0'].cost,429000);
const lot='e1-0';
add('move',{lot,from:'Гуанчжоу',to:'Москва',qty:3});
s=add('sale',{lot,from:'Москва',qty:1,price:180000,paid:50000,partner:'Клиент'});
assert.equal(s.sales.e3.due,130000);assert.equal(s.profit,37000);
s=add('defect',{lot,from:'Москва',qty:2,reason:'Тест'});
assert.equal(s.units,1);assert.throws(()=>add('sale',{lot,from:'Москва',qty:1,partner:'X',price:1,paid:0}));
s=add('resolve',{ref:'e4',result:'replace',qty:1,to:'Москва'});assert.equal(s.units,2);
s=add('resolve',{ref:'e4',result:'loss',qty:1,comp:100000});assert.equal(s.profit,-6000);assert.equal(s.claims.e4.due,100000);
s=add('pay',{side:'claim',ref:'e4',amount:75000});assert.equal(s.claims.e4.due,25000);
s=add('pay',{side:'client',ref:'e3',amount:130000});assert.equal(s.sales.e3.due,0);
s=add('pay',{side:'supplier',ref:'e1',amount:15000});assert.equal(s.orders.e1.due,0);assert.equal(s.profit,-6000);
assert.throws(()=>add('pay',{side:'supplier',ref:'e1',amount:1}));
assert.equal(L.numeric('13,4512',4),134512);assert.throws(()=>L.numeric('1.5',0));
console.log('Purchase, cost allocation, stock movements, credit sale, claims, settlements, and balance limits OK');
const buy={type:'buy',partner:'A',place:'Москва',rate:10000,paid:0,fees:1,items:[{name:'A',qty:2,price:100}]};
const sale={type:'sale',lot:'t0-0',qty:1,price:200,paid:100,partner:'B',from:'Москва'};
function replay(...rows){return L.project(rows.map((r,i)=>({...r,id:'t'+i,time:'2026-11-13T08:00:00Z'})))}
let q=replay(buy,sale);assert.equal(q.stock+q.sales.t1.base,201);assert.equal(q.stock,100);
const ret={type:'return',ref:'t1',qty:1,to:'Москва',condition:'defect',reason:'DOA'};
q=replay(buy,sale,ret);
assert.equal(q.profit,0);assert.equal(q.turnover,0);assert.equal(q.sales.t1.due,0);assert.equal(q.returns.t2.due,100);
assert.equal(q.stock+q.quarantine,201);assert.equal(q.units,1);
q=replay(buy,sale,ret,{type:'resolve',ref:'t2',result:'replace',qty:1,to:'Москва'},
 {type:'pay',ref:'t2',side:'refund',amount:100},sale);
assert.equal(q.returns.t2.due,0);assert.equal(q.units,1);assert.equal(q.quarantine,0);
assert.throws(()=>replay(buy,sale,ret,ret));
q=replay(buy,{...sale,paid:0},{...ret,condition:'stock'});assert.equal(q.returns.t2.due,0);assert.equal(q.stock,201);
q=replay(buy,{...sale,qty:2,paid:400},ret,{...ret,condition:'stock'});
assert.equal(q.returns.t2.due+q.returns.t3.due,400);assert.equal(q.profit,0);
assert.throws(()=>L.project([{...buy,time:'2026-11-13'}]));
console.log('Partial-unit cost conservation and paid, unpaid, partial and defective customer returns OK');
