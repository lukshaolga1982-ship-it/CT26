(function structureNativeTests(){
  const clean=s=>String(s||"")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/\r/g,"")
    .replace(/[ \t]+/g," ")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();

  const fixEnglishOcr=s=>clean(s).split("\n").map(line=>{
    const latin=(line.match(/[A-Za-z]/g)||[]).length,cyr=(line.match(/[А-Яа-яЁё]/g)||[]).length;
    if(latin<=cyr||latin<5)return line;
    const words=[[/\bаге\b/g,"are"],[/\bапа\b/g,"and"],[/\bав\b/g,"as"],[/\bопе\b/g,"one"],[/\bопг\b/g,"our"],[/\bоё\b/g,"of"],[/\bог\b/g,"or"],[/\bпр\b/g,"up"],[/\bепа\b/g,"end"],[/\bтопеу\b/g,"money"],[/\bтапу\b/g,"many"],[/\bГуе\b/g,"I've"],[/\bГ’уе\b/g,"I've"],[/\bГа\b/g,"I'd"],[/\bГт\b/g,"I'm"],[/\bТ’т\b/g,"I'm"],[/\bТ'П\b/g,"I'll"],[/\$0|%0/g,"to"],[/\bв0\b/g,"so"],[/\bа%\b|\bа\$\b/g,"at"],[/a 10% of/g,"a lot of"],[/\b([Hh]e|[Ss]he|[Ii]t) 15\b/g,(_,x)=>`${x} is`],[/\bThere 15\b/g,"There is"],[/£et/g,"get"],[/\bIguess\b/g,"I guess"],[/§1\.1live/g,"§ 1. I live"]];
    for(const [a,b] of words)line=line.replace(a,b);
    const map={а:"a",е:"e",о:"o",р:"p",с:"c",х:"x",у:"y",к:"k",м:"m",т:"t",н:"h",в:"b",п:"n",г:"r",д:"d",л:"l",А:"A",Е:"E",О:"O",Р:"P",С:"C",Х:"X",У:"Y",К:"K",М:"M",Т:"T",Н:"H",В:"B",П:"N",Г:"R",Д:"D",Л:"L"};
    return line.replace(/[аеорсхукмтнвпгдлАЕОРСХУКМТНВПГДЛ]/g,ch=>map[ch]||ch);
  }).join("\n");

  const normaliseLabels=s=>fixEnglishOcr(s)
    .replace(/(^|\s)[lI]\s*\)/g,(_,lead)=>`${lead}1)`)
    .replace(/[АA]\s*1[QO](?=\s*[.)])/g,"A10")
    .replace(/[АA]\s*[Пп](?=\s*(?:[.)]|1\s*\)))/g,"A11")
    .replace(/[Дд](?=\s*15(?:[.)]|\s))/g,"A")
    .replace(/[АA]\s*[Бб](?=\s*[.)])/g,"A6")
    .replace(/[АA]\s*[lI]\s*[lI](?=\s*(?:[.)]|1\s*\)))/g,"A11")
    .replace(/[АA]\s*[lI](?=\s*(?:[.)]|1\s*\)))/g,"A1")
    .replace(/[АA]\s*[iI]s(?=\s*[.)])/g,"A15")
    .replace(/[АA]\s*[Зз](?=\s*(?:[.)]|1\s*\)))/g,"A3")
    .replace(/[АA](?=\s*\d)/g,"A")
    .replace(/[ВB](?=\s*\d)/g,"B")
    .replace(/[Зз8](?=\s*\))/g,"3")
    .replace(/&(?=\s*\))/g,"4")
    .replace(/\bBIO(?=\s*[.)])/g,"B10")
    .replace(/\bAT\s*7(?=\s*(?:[.)]|\s))/g,"A17");

  const labelRe=id=>new RegExp(`(?:^|\\n)\\s*[|!;¢&§~:.]*\\s*[TIТІ]?\\s*${id[0]}\\s*${id.slice(1)}(?!\\d)\\s*(?:[.),]\\s*|(?=\\s))`,"gi");
  const locate=(text,id,from=0)=>{const re=labelRe(id);re.lastIndex=from;const m=re.exec(text);return m?{start:m.index,end:re.lastIndex}:null};
  const block=(text,id,nextId)=>{const here=locate(text,id);if(!here)return "";const next=nextId?locate(text,nextId,here.end):null;return text.slice(here.end,next?next.start:text.length).trim()};
  const afterInstruction=s=>{
    const lines=clean(s).split("\n");
    let cut=0;
    for(let i=0;i<lines.length;i++)if(/Прочитайте|Выберите|ЧАСТЬ/i.test(lines[i]))cut=i+1;
    return lines.slice(cut).filter(x=>!/^\s*[—_=#|]+\s*$/.test(x)).join("\n").trim();
  };
  const html=s=>clean(s)
    .replace(/a 10% of/g,"a lot of")
    .replace(/\bthis 15\b/g,"this is")
    .replace(/\bRye\b/g,"I've")
    .replace(/\n/g,"<br>");

  function parseOptions(raw){
    const text=clean(raw).replace(/\b5\s+(?=[A-ZА-Я]{5,})/g,"5) "), marks=[];let m;
    const re=/(?:^|(?<=\s))([1-5])\s*\)/g;
    while((m=re.exec(text)))marks.push({n:+m[1],start:m.index,end:re.lastIndex});
    if(!marks.length)return {context:text,options:[]};
    const options={};
    marks.forEach((mark,i)=>{
      const end=i+1<marks.length?marks[i+1].start:text.length;
      let value=text.slice(mark.end,end).replace(/\s+/g," ").trim();
      value=value.split(/\s+(?=Прочитайте|Выберите|Укажите|ЧАСТЬ|ВАРИАНТ)/i)[0];
      value=value.replace(/^[—–-]+\s*/,"").replace(/[|]+$/g,"").trim();
      if(value&&!options[mark.n])options[mark.n]=value;
    });
    return {context:text.slice(0,marks[0].start).trim(),options:[1,2,3,4,5].map(n=>options[n]).filter(Boolean)};
  }

  function sourceFor(test){
    if(test.year===2025)return [1,2,3,4].map(n=>window.NATIVE_2025_PAGES?.[`${test.number}-${n}`]||"").join("\n");
    const start=2+(test.number-1)*4;
    return [0,1,2,3].map(n=>window.NATIVE_2026_PAGES?.[start+n]||"").join("\n");
  }

  function sharedPrefix(text,id){
    const hit=locate(text,id);if(!hit)return "";
    if(id==="A15"){
      const start=Math.max(text.lastIndexOf("Прочитайте текст",hit.start),text.lastIndexOf("Прочитайте TEKCT",hit.start));
      if(start>=0){let value=text.slice(start,hit.start),firstBreak=value.indexOf("\n");if(firstBreak>=0)value=value.slice(firstBreak+1);const trailing=Math.max(value.lastIndexOf("Выберите один"),value.lastIndexOf("Выберите OAMH"));if(trailing>=0)value=value.slice(0,trailing);return clean(value);}
    }
    let previous=0;
    for(const candidate of ["A1","A5","A9","A13","A14","A15","B1","B9","B19"]){
      if(candidate===id)break;
      const p=locate(text,candidate,previous);if(p&&p.start<hit.start)previous=p.start;
    }
    return afterInstruction(text.slice(previous,hit.start));
  }

  function bShared(text,first,lastNext){
    const a=locate(text,first),b=locate(text,lastNext,a?.end||0);
    return a?text.slice(a.start,b?b.start:text.length).trim():"";
  }

  for(const test of window.TEST_DATA.variants.filter(v=>v.status==="ready"&&!(v.year===2026&&v.number===1))){
    const text=normaliseLabels(sourceFor(test));
    const passages={
      A1:sharedPrefix(text,"A1"),
      A9:sharedPrefix(text,"A9"),
      A15:sharedPrefix(text,"A15"),
      B9:bShared(text,"B9","B19"),
      B19:(()=>{const marks=[text.lastIndexOf("Прочитайте текст. От"),text.lastIndexOf("Прочитайте текст. OT"),text.lastIndexOf("От приведенных в скобках"),text.lastIndexOf("OT приведенных B скобках")];const p=Math.max(...marks);if(p<0)return "";const lines=text.slice(p).split("\n");let start=lines.findIndex(line=>{const latin=(line.match(/[A-Za-z]/g)||[]).length,cyr=(line.match(/[А-Яа-яЁё]/g)||[]).length;return latin>20&&latin>cyr*2&&!/Прочитайте|Заполните|Помните/i.test(line)});return clean(lines.slice(Math.max(0,start)).join("\n"));})()
    };

    test.questions.forEach((q,i)=>{
      const n=Number(q.id.slice(1));
      if(q.section==="A"){
        const next=n<18?`A${n+1}`:"B1";
        let rawBlock=block(text,q.id,next);
        if(n===14&&!rawBlock){const from=locate(text,"A13")?.end||0,start=text.indexOf("Расположите реплики",from),end=text.indexOf("Прочитайте текст",start+1);if(start>=0)rawBlock=text.slice(start,end>start?end:text.length);}
        const parsed=parseOptions(rawBlock);
        let context=parsed.context;
        if(n<=4)context=passages.A1;
        else if(n>=9&&n<=12)context=passages.A9;
        else if(n>=15)context=`${passages.A15}${parsed.context?`\n\n${parsed.context}`:""}`;
        if(parsed.options.length>=4){
          const oldIndex=Number(q.answer);
          q.options=parsed.options;
          if(Number.isInteger(oldIndex)&&oldIndex>=1&&oldIndex<=parsed.options.length){q.answer=parsed.options[oldIndex-1];q.accepted=[q.answer];}
        }
        if((n===7||n===8)&&/^\d$/.test(q.options?.[0]||"")){const oldIndex=Number(q.answer);q.options=[1,2,3,4,5].map(x=>`Фрагмент ${x}`);q.answer=q.options[oldIndex-1];q.accepted=[q.answer];}
        if(context)q.context=html(context);
      }else{
        const next=n<22?`B${n+1}`:null;
        let context=n<=8?block(text,q.id,next):n<=18?passages.B9:passages.B19;
        if(context)q.context=html(context);
      }
      delete q.image;
    });
  }

  const exactOverrides={
    "2026-3-A5":["—, —, a","a, —, the","the, —, —","—, the, a","a, the, —"],
    "2026-4-A14":["CDFAEB","BFDACE","DABECF","BFCAED","DEBCFA"]
  };
  for(const [key,options] of Object.entries(exactOverrides)){
    const [year,variant,id]=key.split("-");
    const q=window.TEST_DATA.variants.find(t=>t.year===Number(year)&&t.number===Number(variant))?.questions.find(x=>x.id===id);
    if(!q)continue;
    const answerIndex=key==="2026-3-A5"?5:5;
    q.options=options;q.answer=options[answerIndex-1];q.accepted=[q.answer];
  }
})();
