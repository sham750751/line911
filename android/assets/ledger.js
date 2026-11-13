/* Money uses minor currency units. The exchange rate is RUB/CNY × 10,000. */
const Ledger = (() => {
  const places = ['Гуанчжоу','В пути','Москва'];
  const fail = message => { throw Error(message); };
  function int(v, min=0, max=1e13) {
    if (!Number.isSafeInteger(v) || v<min || v>max) fail('Проверь сумму или количество');
    return v;
  }
  function label(v) {
    if (typeof v!=='string' || !v.trim() || v.length>200) fail('Проверь текстовые поля');
    return v.trim();
  }
  function place(v) { if(!places.includes(v)) fail('Неизвестный склад'); return v; }
  const scale = (a,b,c) => Number((BigInt(a)*BigInt(b)+BigInt(c)/2n)/BigInt(c));
  function numeric(s, digits, positive=false) {
    const value=String(s ?? '').trim().replace(/\s/g,'').replace(',','.');
    if(!new RegExp('^\\d+(?:\\.\\d{1,'+Math.max(1,digits)+'})?$').test(value) || (!digits && value.includes('.'))) fail('Проверь число и знаки после запятой');
    const [a,b='']=value.split('.');
    return int(Number(a+b.padEnd(digits,'0')),positive?1:0);
  }
  function project(events) {
    if (!Array.isArray(events) || events.length>50000) fail('Неверный формат журнала');
    const state={orders:{},lots:{},sales:{},claims:{},profit:0,turnover:0,units:0,stock:0};
    const used=new Set();
    for(const e of events) {
      if(!e || !/^[a-zA-Z0-9-]{1,80}$/.test(e.id) || used.has(e.id) || !Number.isFinite(Date.parse(e.time))) fail('Повреждена запись журнала');
      used.add(e.id);
      if(e.type==='buy') {
        if(!Array.isArray(e.items)||!e.items.length||e.items.length>100) fail('Добавь товары');
        label(e.partner); place(e.place); int(e.rate,1,1e7); int(e.fees);
        const lines=e.items.map(i=>{label(i.name); if(i.sku)label(i.sku); return int(int(i.qty,1,1e7)*int(i.price,1));});
        const yuan=int(lines.reduce((a,b)=>a+b,0)), total=int(scale(yuan,e.rate,10000)+e.fees);
        state.orders[e.id]={...e,yuan,total,due:yuan-int(e.paid,0,yuan)};
        let before=0;
        e.items.forEach((i,k)=>{
          let after=before+lines[k], cost=scale(total,after,yuan)-scale(total,before,yuan);before=after;
          const id=e.id+'-'+k;
          state.lots[id]={id,order:e.id,...i,cost,dispatched:0,qtyAt:Object.fromEntries(places.map(p=>[p,p===e.place?i.qty:0]))};
        });
      } else if(e.type==='pay') {
        const x=e.side==='supplier'?state.orders[e.ref]:e.side==='client'?state.sales[e.ref]:e.side==='claim'?state.claims[e.ref]:null;
        if(!x || !used.has(e.ref)) fail('Документ не найден');
        x.due-=int(e.amount,1,x.due);
      } else if(['move','sale','defect'].includes(e.type)) {
        const l=state.lots[e.lot]; if(!l || !l.qtyAt) fail('Позиция не найдена');
        place(e.from);
        int(e.qty,1,l.qtyAt[e.from]);l.qtyAt[e.from]-=e.qty;
        if(e.type==='move') {
          place(e.to); if(e.from===e.to) fail('Выбери другой склад'); l.qtyAt[e.to]+=e.qty;
        } else if(e.type==='sale') {
          const value=int(e.qty*int(e.price,1)), base=scale(l.cost,l.dispatched+e.qty,l.qty)-scale(l.cost,l.dispatched,l.qty);
          l.dispatched+=e.qty;label(e.partner);
          state.sales[e.id]={...e,value,due:value-int(e.paid,0,value),base};
          state.turnover+=value;state.profit+=value-base;
        } else {
          label(e.reason);
          state.claims[e.id]={...e,open:e.qty,due:0,recovered:0,lost:0};
        }
      } else if(e.type==='resolve') {
        const x=state.claims[e.ref]; if(!x || !x.open) fail('Обращение уже закрыто');
        const l=state.lots[x.lot];int(e.qty,1,x.open);x.open-=e.qty;
        if(e.result==='replace') { l.qtyAt[place(e.to)]+=e.qty; x.recovered+=e.qty; }
        else if(e.result==='loss') {
          const base=scale(l.cost,l.dispatched+e.qty,l.qty)-scale(l.cost,l.dispatched,l.qty);
          l.dispatched+=e.qty; x.lost+=e.qty; x.due+=int(e.comp);
          state.profit+=e.comp-base;
        } else fail('Выбери решение');
      } else fail('Неизвестная операция');
    }
    for(const l of Object.values(state.lots)) {
      const n=Object.values(l.qtyAt).reduce((a,b)=>a+b,0); state.units+=n;
      state.stock+=scale(l.cost,n,l.qty);
    }
    return state;
  }
  return {places,project,numeric,scale};
})();
if(typeof module!=='undefined')module.exports=Ledger;
