const BLOCKS = ["A1–A4","A5–A8","A9–A12","A13–A14","A15–A18","B1–B3","B4–B6","B7–B8","B9–B18","B19–B22"];
const blockFor = (s,n) => s === "A" ? (n<=4?BLOCKS[0]:n<=8?BLOCKS[1]:n<=12?BLOCKS[2]:n<=14?BLOCKS[3]:BLOCKS[4]) : (n<=3?BLOCKS[5]:n<=6?BLOCKS[6]:n<=8?BLOCKS[7]:n<=18?BLOCKS[8]:BLOCKS[9]);

function makeQuestions(aAnswers,bAnswers){
  return [
    ...aAnswers.map((answer,i)=>({id:`A${i+1}`,section:"A",block:blockFor("A",i+1),type:"choice",prompt:"Выберите номер правильного ответа в сборнике.",context:`Ответ на задание A${i+1}`,options:["1","2","3","4","5"],answer:String(answer),accepted:[String(answer)],points:1})),
    ...bAnswers.map((answer,i)=>({id:`B${i+1}`,section:"B",block:blockFor("B",i+1),type:"input",prompt:"Введите ответ из части B.",context:`Ответ на задание B${i+1}`,answer,accepted:Array.isArray(answer)?answer:[answer],points:2}))
  ];
}

function makeNativeQuestions(pageStart,aAnswers,bAnswers){
  const pageText=n=>String(window.NATIVE_2026_PAGES?.[n]||"").replace(/\n/g,"<br>");
  return [
    ...aAnswers.map((answer,i)=>({id:`A${i+1}`,section:"A",block:blockFor("A",i+1),type:"choice",prompt:`Выберите номер правильного ответа для A${i+1}.`,context:pageText(pageStart+(i<8?0:i<14?1:2)),options:["1","2","3","4","5"],answer:String(answer),accepted:[String(answer)],points:1})),
    ...bAnswers.map((answer,i)=>({id:`B${i+1}`,section:"B",block:blockFor("B",i+1),type:"input",prompt:i<3?"Заполните пропуск одним предлогом.":i<6?"Заполните пропуск одним словом.":i<8?"Введите одно слово, подходящее для двух предложений.":i<18?"Выпишите одно лишнее слово.":"Образуйте однокоренное слово.",context:pageText(pageStart+(i<8?2:3)),answer,accepted:[answer],points:2}))
  ];
}

const queueText=`While everyone hates waiting, queues are a fact of life. While it may not be possible to eliminate waiting, there are many ways to improve the waiting experience for your customers. <strong>(A1) ...</strong> why lifts have mirrors in them? The story is that when high-rise buildings <strong>(A2) ...</strong> common, visitors were frustrated by the long lift rides. So mirrors <strong>(A3) ...</strong> on the inside of the lifts. The complaints about the time spent in lifts dropped. This is because lift passengers were distracted by looking at themselves in the mirrors. An airport was constantly getting complaints about the long wait for luggage. When they moved the arrival gates further away, complaints stopped almost completely. The total time to get luggage stayed the same, but walking passengers felt productive because they <strong>(A4) ...</strong> towards their goal!`;
const irwinText=`Son of the well-known naturalists, Bob and Lyn Irwin, Steve developed a love for animals from a very young age. His father taught him everything he knew about reptiles. By the age of nine Steve had learnt how to trap and catch crocodiles at night. Actually, all of the crocodiles in their wildlife park, now <strong>(A9) ...</strong> as Australia Zoo, are ones which they had caught themselves. Living in the zoo, which his parents had started in Queensland, Steve learnt to love, respect and take care of animals. Soon, he took over the zoo. In 1992 Steve married Terri Raines, a conservationist. During their honeymoon they filmed their first television documentary. Steve Irwin soon became the most popular nature show host in the world. He was proud to <strong>(A10) ...</strong> his passion for animals with millions of viewers. Working with wildlife was a dream <strong>(A11) ...</strong> true for him. Steve was an exceptional man who <strong>(A12) ...</strong> his whole life to animals.`;
const tobyText=`<strong>Toby Harris, actor</strong><br><em>17-year-old Toby Harris has already appeared in a number of films</em><br><br>§ 1. Acting is something that I’ve been interested in for ages. My aunt belonged to a drama group, and I used to watch her shows when I was a child. But it was only when I was 11 that I joined a theatre club and started acting regularly. I had accompanied a school friend, who was nervous about going alone, and I signed up that same evening! My drama teacher was happy because she’d always said I was talented.<br><br>§ 2. A while later, a film director saw me in one of the club’s plays and asked me to be in her film. I said yes, and for me, that was the start of everything. I thought the film would be scary to do, as I was the youngest person at the film studio. I was really calm during the whole thing though, which I hadn’t expected. Everyone was so friendly! I didn’t have that much to do, not like the main star. He’s become very well known since we worked together. All his films are extremely successful.<br><br>§ 3. I’ve done a few films now. The last was a comedy, which I was glad to finish — it’s not something I find easy! I often get asked for tips about getting into films. Everyone thinks that who you know is important. Maybe that used to be true. Nowadays, it’s about experience. There are lots of directors looking for new actors for different film projects, so accept as much work as you can! Even two minutes on camera is useful. Also, ignore reviews. Positive comments are lovely to get, but people can also be unkind!<br><br>§ 4. Recently, I finished a big film, and now I’m planning for the future. I tried for a part in a television series; they chose someone else in the end unfortunately — I’m fine with it, though. It’s part of being an actor! I’m taking advantage of a break to do some horse riding. I was taught how to do it on an advanced acting course last year and I need to make sure I still remember everything — it’s good for my CV, to show I’d be good in action films, for example!`;
const journeyText=`B9. The most memorable journey what I ever made was riding from Istanbul to Beijing. As<br>B10. a child I was fascinated by stories of famous travellers and might dreamed of escaping<br>B11. my small town to travel the ancient routes they not wrote about through China and<br>B12. Central Asia. I spent a year cycling through some of the enough wildest parts of the earth<br>B13. and I loved seeing unfamiliar landscapes and getting to know another local people. Every<br>B14. day was different — I am rode through freezing rain and the heat and wind of the<br>B15. desert. Some of days were so tough that I didn’t know if I would be able to keep going.<br>B16. Sometimes I have felt lonely or bored of camping but on the whole it was an amazing<br>B17. experience. I learnt a lot about so different cultures, history and nature, and about myself<br>B18. and what I’m capable of. I can’t wait forward to get back on my bike for another trip!`;

const fullVariant1=[
  {id:"A1",section:"A",block:"A1–A4",type:"choice",prompt:"Выберите правильный вариант для A1.",context:queueText,options:["Have you ever wondered","Are you ever wondered","Were you ever wondered","Had you ever wondered","Will you ever be wondered"],answer:"Have you ever wondered",accepted:["Have you ever wondered"],points:1},
  {id:"A2",section:"A",block:"A1–A4",type:"choice",prompt:"Выберите правильный вариант для A2.",context:queueText,options:["become","were become","have become","are becoming","became"],answer:"became",accepted:["became"],points:1},
  {id:"A3",section:"A",block:"A1–A4",type:"choice",prompt:"Выберите правильный вариант для A3.",context:queueText,options:["put","were putting","were put","had put","have put"],answer:"were put",accepted:["were put"],points:1},
  {id:"A4",section:"A",block:"A1–A4",type:"choice",prompt:"Выберите правильный вариант для A4.",context:queueText,options:["were moved","have been moving","move","are moved","were moving"],answer:"were moving",accepted:["were moving"],points:1},
  {id:"A5",section:"A",block:"A5–A8",type:"choice",prompt:"Выберите правильную последовательность артиклей.",context:"... rich believe luck matters, but they also know that ... hard work makes it easier to weather ... storm when problems arise.",options:["A, —, a","The, —, the","—, a, —","The, a, —","The, a, a"],answer:"The, —, the",accepted:["The, —, the"],points:1},
  {id:"A6",section:"A",block:"A5–A8",type:"choice",prompt:"Выберите правильный вариант.",context:"The artist set up a course in painting for ... , hoping to inspire creativity in everyone who participates.",options:["growns’-up","grown’s-ups","growns-ups","grown-ups","growns-up"],answer:"grown-ups",accepted:["grown-ups"],points:1},
  {id:"A7",section:"A",block:"A5–A8",type:"choice",prompt:"Выберите правильный вариант.",context:"Esperanto is ... to learn than you might think as it’s a man-made language designed especially for effective communication.",options:["much more easier","much easy","more easier","the most easiest","much easier"],answer:"much easier",accepted:["much easier"],points:1},
  {id:"A8",section:"A",block:"A5–A8",type:"choice",prompt:"Выберите правильный вариант.",context:"Although in their mid-... , Rob and Jill take dance classes three times a week.",options:["seventieth","seventy","seventies","seventy’s","seventies’"],answer:"seventies",accepted:["seventies"],points:1},
  {id:"A9",section:"A",block:"A9–A12",type:"choice",prompt:"Выберите правильный вариант для A9.",context:irwinText,options:["familiar","known","referred","called","aware"],answer:"known",accepted:["known"],points:1},
  {id:"A10",section:"A",block:"A9–A12",type:"choice",prompt:"Выберите правильный вариант для A10.",context:irwinText,options:["refer","separate","share","contribute","pass"],answer:"share",accepted:["share"],points:1},
  {id:"A11",section:"A",block:"A9–A12",type:"choice",prompt:"Выберите правильный вариант для A11.",context:irwinText,options:["go","move","drive","come","arrive"],answer:"come",accepted:["come"],points:1},
  {id:"A12",section:"A",block:"A9–A12",type:"choice",prompt:"Выберите правильный вариант для A12.",context:irwinText,options:["spent","occupied","focused","passed","dedicated"],answer:"dedicated",accepted:["dedicated"],points:1},
  {id:"A13",section:"A",block:"A13–A14",type:"choice",prompt:"Выберите реплику-стимул, подходящую к ответной реплике.",context:"I’m afraid I don’t.",options:["Sorry to keep you waiting.","How many people were in the group?","Do you know much about business?","Is this machine difficult to use?","Can you give me a lift?"],answer:"Do you know much about business?",accepted:["Do you know much about business?"],points:1},
  {id:"A14",section:"A",block:"A13–A14",type:"choice",prompt:"Расположите реплики так, чтобы получился связный диалог.",context:"A. Brrrr! I’m cold. I thought it was supposed to get warmer today.<br>B. It certainly is not!<br>C. It must be the wind that makes it so cold. I’m freezing!<br>D. Me, too. Let’s go inside.<br>E. OK. It’s no fun standing out here, even if the sun is shining.<br>F. Yeah, I thought so, too. That’s what the weatherman said.",options:["AFCDEB","CBEFAD","AEDFBC","FEDBCA","DFABCE"],answer:"AFCDEB",accepted:["AFCDEB"],points:1},
  {id:"A15",section:"A",block:"A15–A18",type:"choice",prompt:"Toby decided to join a theatre club after ...",context:tobyText,options:["his teacher recommended it to him.","his aunt was involved in running it.","he saw other children acting in one of its plays.","he had attended a session with a friend."],answer:"he had attended a session with a friend.",accepted:["he had attended a session with a friend."],points:1},
  {id:"A16",section:"A",block:"A15–A18",type:"choice",prompt:"How did Toby feel about the first film he acted in?",context:tobyText,options:["excited about working with the famous people in it","surprised at how relaxed he felt when making it","pleased to have such a big part in it","amazed at how popular it was"],answer:"surprised at how relaxed he felt when making it",accepted:["surprised at how relaxed he felt when making it"],points:1},
  {id:"A17",section:"A",block:"A15–A18",type:"choice",prompt:"Toby advises young people interested in being in films to ...",context:tobyText,options:["take any roles that are offered.","watch a range of films by different directors.","get to know other people in the industry.","ask for people’s opinions about their performance."],answer:"take any roles that are offered.",accepted:["take any roles that are offered."],points:1},
  {id:"A18",section:"A",block:"A15–A18",type:"choice",prompt:"What is Toby going to do next?",context:tobyText,options:["teach on a course for advanced actors","star in a TV programme","play a part in an exciting film","practise a useful skill"],answer:"practise a useful skill",accepted:["practise a useful skill"],points:1},
  ...[
    ["B1","This is the first time that Miss Porter has spoken about her experience ... public.","in"],["B2","She is eternally grateful to her family ... their support.","for"],["B3","Let’s get rid ... some of these old newspapers.","of"],
    ["B4","She felt guilty about donating so ... money to charity and decided to contribute more the next time she had the opportunity.","little"],["B5","... the news influenced your decision to attend tomorrow’s event or not?","has"],["B6","Helen is one of those neighbours ... garden is always in bloom.","whose"],
    ["B7","Adrian’s clothes are baggy because he has ... a lot of weight.<br>My team played well but, unfortunately, we ... the game.","lost"],["B8","If you don’t leave early, we ... the risk of missing the plane.<br>He has ... his own company since he left school.","run"],
    ["B9",journeyText,"what"],["B10",journeyText,"might"],["B11",journeyText,"not"],["B12",journeyText,"enough"],["B13",journeyText,"another"],["B14",journeyText,"am"],["B15",journeyText,"of"],["B16",journeyText,"have"],["B17",journeyText,"so"],["B18",journeyText,"forward"],
    ["B19","Sea turtles face numerous challenges that are ... (WEAK) their populations across the globe.","weakening"],["B20","Human activities such as coastal development, pollution, and overfishing have ... (HEAVY) impacted their natural habitats.","heavily"],["B21","Conservationists remain ... (ANXIETY) about the future.","anxious"],["B22","Scientists are exploring various ... (POSSIBLE) to protect sea turtle species.","possibilities"]
  ].map(([id,context,answer])=>({id,section:"B",block:blockFor("B",Number(id.slice(1))),type:"input",prompt:Number(id.slice(1))<=3?"Заполните пропуск одним предлогом.":Number(id.slice(1))<=6?"Заполните пропуск одним словом.":Number(id.slice(1))<=8?"Введите одно слово, подходящее для двух предложений.":Number(id.slice(1))<=18?"Выпишите одно лишнее слово.":"Образуйте однокоренное слово.",context,answer,accepted:[answer],points:2}))
];

const tests2026=[
  {number:1,pages:"2–5",pageStart:1,format:"interactive",questions:fullVariant1},
  {number:2,pages:"6–9",pageStart:6,format:"interactive",questions:makeNativeQuestions(6,[3,4,1,2,5,5,3,4,3,1,4,2,4,5,2,1,3,2],["in","of","to","few","have","whose","set","run","about","enough","mine","these","might","do","very","such","another","which","disastrous","necessarily","possibilities","broadening"])},
  {number:3,pages:"10–13",pageStart:10,format:"interactive",questions:makeNativeQuestions(10,[2,3,4,1,5,1,2,4,5,2,3,4,4,5,2,3,1,3],["in","for","of","little","has","whose","lost","run","of","may","me","with","due","have","to","such","another","which","broadened","heavily","adventurous","necessities"])},
  {number:4,pages:"14–17",pageStart:14,format:"interactive",questions:makeNativeQuestions(14,[1,4,5,1,4,3,2,3,4,2,5,3,2,5,4,2,1,3],["in","of","to","little","are","whose","set","run","to","its","could","very","does","them","which","another","have","so","ambitious","possibilities","shortened","necessarily"])},
  {number:5,pages:"18–21",pageStart:18,format:"interactive",questions:makeNativeQuestions(18,[3,4,1,5,1,4,5,3,2,2,5,1,3,5,3,2,1,4],["in","of","of","little","has","whose","losing","run","very","ago","do","such","what","of","be","it","another","have","heavily","broadened","anxious","necessities"])},
  {number:6,pages:"22–25",pageStart:22,format:"interactive",questions:makeNativeQuestions(22,[1,4,5,2,4,1,3,2,1,5,5,4,5,2,3,1,4,3],["of","of","into","neither","is","which","taking","kept","may","have","it","like","from","of","which","another","do","very","largely","unbelievable","conclusions","renew"])},
  {number:7,pages:"26–29",pageStart:26,format:"interactive",questions:makeNativeQuestions(26,[3,2,4,1,5,1,3,5,2,4,3,5,4,2,1,4,3,2],["under","about","on","neither","was","which","taken","kept","of","what","are","very","to","us","may","such","have","it","descriptions","largely","recycle","unreliable"])},
  {number:8,pages:"30–33",pageStart:30,format:"interactive",questions:makeNativeQuestions(30,[5,1,2,5,4,1,3,2,2,4,5,3,4,1,2,3,4,1],["of","of","into","neither","was","which","took","kept","who","be","has","between","could","such","as","was","another","that","widely","unbelievable","conclusions","rethink"])},
  {number:9,pages:"34–37",pageStart:34,format:"interactive",questions:makeNativeQuestions(34,[3,5,4,2,2,1,4,5,2,3,2,1,4,5,3,3,1,4],["under","about","on","neither","was","which","taking","kept","that","another","was","may","either","so","enough","to","does","it","unreliable","explanations","negatively","review"])},
  {number:10,pages:"38–41",pageStart:38,format:"interactive",questions:makeNativeQuestions(38,[3,5,4,1,2,5,3,2,4,3,5,3,2,1,2,4,1,1],["of","of","into","neither","is","which","taken","kept","to","that","one","another","who","none","enough","can","such","to","largely","rethink","conclusions","unbearable"])}
];

function makeNativeQuestions2025(variant,aAnswers,bAnswers){
  const page=n=>String(window.NATIVE_2025_PAGES?.[`${variant}-${n}`]||"").replace(/\n/g,"<br>");
  return [
    ...aAnswers.map((answer,i)=>({id:`A${i+1}`,section:"A",block:blockFor("A",i+1),type:"choice",prompt:`Выберите номер правильного ответа для A${i+1}.`,context:i<10?page(1):i<14?page(2):`${page(2)}<br><br>${page(3)}`,options:["1","2","3","4","5"],answer:String(answer),accepted:[String(answer)],points:1})),
    ...bAnswers.map((answer,i)=>{const accepted=Array.isArray(answer)?answer:[answer];return {id:`B${i+1}`,section:"B",block:blockFor("B",i+1),type:"input",prompt:i<3?"Заполните пропуск одним предлогом.":i<6?"Заполните пропуск одним словом.":i<8?"Введите одно слово, подходящее для двух предложений.":i<18?"Выпишите одно лишнее слово.":"Образуйте однокоренное слово.",context:i<8?page(3):page(4),answer:accepted[0],accepted,points:2};})
  ];
}

const tests2025=[
  {number:1,format:"interactive",questions:makeNativeQuestions2025(1,[5,2,5,3,4,5,2,3,4,1,2,5,4,1,2,1,4,3],["at",["to","over"],"with","not","did","do","taken","fell","who","such","as","us","lots","have","enough","itself","every","to","simplifies","disastrous","entirely","requirements"])},
  {number:2,format:"interactive",questions:makeNativeQuestions2025(2,[4,3,1,5,1,5,2,2,3,4,2,5,4,1,3,1,2,4],["in","to","in","not","did","does","taken","fell","were","both","have","every","like","such","them","do","what","about","conclusions","diversity","justifies","immediately"])},
  {number:3,format:"interactive",questions:makeNativeQuestions2025(3,[2,3,1,4,2,5,3,3,4,5,4,1,2,5,3,2,1,4],["in",["to","over"],"with","not","did","do","taken","fell","that","enough","such","to","else","who","other","us","many","been","extremely","obesity","disastrous","simplifies"])},
  {number:4,format:"interactive",questions:makeNativeQuestions2025(4,[5,4,1,3,4,5,2,1,4,2,1,5,2,3,4,1,2,3],["at","to","in","not","did","does","taken","fell","be","such","lots","others","to","few","does","what","every","of","definitely","disastrous","obesity","clarifies"])},
  {number:5,format:"interactive",questions:makeNativeQuestions2025(5,[1,3,5,2,4,3,1,2,4,5,2,3,1,5,3,2,1,4],["in","on","with","not","did","does","taken","fell","either","do","others","lots","such","is","both","what","this","have","diversity","anxious","immediately","simplifies"])},
  {number:6,format:"interactive",questions:makeNativeQuestions2025(6,[1,4,2,5,4,3,5,2,5,1,4,5,3,4,1,2,2,3],["in","to","of","one","was","did","given","made","us","lots","was","them","who","could","each","has","few","such","absolutely",["symbolises","symbolizes"],"carelessness","stony"])},
  {number:7,format:"interactive",questions:makeNativeQuestions2025(7,[4,1,5,2,3,1,1,2,4,3,5,4,2,5,1,3,2,4],["to","to","by","one","were","does","taken","did","us","who","himself","others","been","lots","its","while","so","such","surely","rocky","helplessness",["symbolises","symbolizes"]])},
  {number:8,format:"interactive",questions:makeNativeQuestions2025(8,[5,2,3,1,5,4,1,3,2,4,5,2,1,3,4,2,1,4],["in","to","out","one","was","did","given","breaks","such","every","lots","are","do","who","them","been","either","about",["symbolises","symbolizes"],"grassy","helplessness","surely"])},
  {number:9,format:"interactive",questions:makeNativeQuestions2025(9,[3,4,2,1,5,3,2,1,5,2,4,3,1,5,2,4,1,3],["in","to","of","one","was","does","taken","made","who","by","have","us","may","much","every","else","lots","been","completely",["symbolises","symbolizes"],"rocky","helplessness"])},
  {number:10,format:"interactive",questions:makeNativeQuestions2025(10,[2,5,1,4,3,5,2,2,3,5,1,4,2,5,4,3,1,3],["in","to","by","one","were","does","given","does","them","have","that","much","it","enough","be","every","one","do","surely",["characterised","characterized"],"rocky","carelessness"])}
];

const years=[
  {year:"ЦЭ 2026",variantCount:5,questionCount:40,structure:"A1–A18 · B1–B22",source:"сборник_ЦЭ_ЦТ_2026_выровненный(1).docx",status:"ready"},
  {year:"ЦТ 2026",variantCount:5,questionCount:40,structure:"A1–A18 · B1–B22",source:"сборник_ЦЭ_ЦТ_2026_выровненный(1).docx",status:"ready"},
  {year:"Аналоги 2025",variantCount:15,questionCount:40,structure:"A1–A18 · B1–B22",source:"Teacher's Copy · тесты 26–40",status:"ready"},
  {year:"Аналоги 51–60",variantCount:10,questionCount:40,structure:"A1–A18 · B1–B22",source:"Teacher's Copy · тесты 51–60",status:"ready"}
];
const docxVariants=[
  ...tests2026.slice(0,5).map(t=>({...t,id:`ce-2026-v${t.number}`,title:`Вариант ${t.number}`,year:"ЦЭ 2026",number:t.number,questionCount:40,structure:"A1–A18 · B1–B22",maxPrimary:62,status:"ready"})),
  ...tests2026.slice(5,10).map((t,index)=>({...t,id:`ct-2026-v${index+1}`,title:`Вариант ${index+1}`,year:"ЦТ 2026",number:index+1,questionCount:40,structure:"A1–A18 · B1–B22",maxPrimary:62,status:"ready"}))
];
const normalizedAnswer=value=>String(value??"").toLowerCase().replace(/\s+([.,!?;:])/g,"$1").replace(/[\s’‘`–—-]+/g," ").replace(/[.,!?;:]+$/g,"").trim();
for(const test of docxVariants){
  const display=(window.DOCX_DISPLAY_TESTS||[]).find(item=>item.year===test.year&&item.number===test.number);
  if(!display)continue;
  test.questions=test.questions.map(original=>{
    const fresh=display.questions.find(item=>item.id===original.id);
    if(!fresh)return original;
    const question={...original};
    if(fresh.prompt)question.prompt=fresh.prompt;
    if(fresh.context)question.context=fresh.context;
    if(Array.isArray(fresh.options)&&fresh.options.length){
      const oldAnswer=String(original.answer??"");
      const numeric=/^[1-5]$/.test(oldAnswer)?Number(oldAnswer)-1:null;
      const matched=fresh.options.find(option=>normalizedAnswer(option)===normalizedAnswer(oldAnswer));
      question.options=fresh.options;
      question.answer=matched??(numeric!==null?fresh.options[numeric]:oldAnswer);
      question.accepted=[question.answer];
    }
    return question;
  });
}
const pdfVariants=(window.NEW_PDF_TESTS||[]).map(test=>({...test,maxPrimary:62,status:"ready"}));
const variants=[...docxVariants,...pdfVariants];

window.TEST_DATA={years,blocks:BLOCKS,variants,readyCount:variants.filter(v=>v.status==="ready").length};
