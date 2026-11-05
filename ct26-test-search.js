/* Safe addon: test titles + full content of Firestore tests; app.js untouched. */
(function () {
  'use strict';
  const ID='ct26-test-search-box';
  let query='', scheduled=false, loading=false, fetchedFor='', indexed=new Map();
  const normal=s=>String(s??'').toLocaleLowerCase('ru').replace(/ё/g,'е');
  function testPage(){return document.querySelector('.custom-tests-section');}
  function searchContent(value){
    if(value==null)return '';
    if(typeof value==='string'||typeof value==='number')return String(value);
    if(Array.isArray(value))return value.map(searchContent).join(' ');
    if(typeof value==='object')return Object.entries(value).filter(([key])=>!['gradingAnswers','accepted','answer','correctAnswer','teacherComment'].includes(key)).map(([,v])=>searchContent(v)).join(' ');
    return '';
  }
  async function buildIndex(){
    if(loading||!testPage())return;
    loading=true;
    try {
      const {auth,db,doc,getDoc,getDocs,collection,query:queryDb,where}=await import('./firebase-service.js');
      const user=auth.currentUser;
      if(!user)return;
      if(fetchedFor===user.uid)return;
      const profile=await getDoc(doc(db,'users',user.uid));
      const role=profile.data()?.role;
      if(role!=='teacher'){fetchedFor=user.uid;return;}
      const snapshot=await getDocs(queryDb(collection(db,'tests'),where('teacherId','==',user.uid)));
      const next=new Map();
      snapshot.forEach(d=>{
        const t=d.data();
        const value=normal(searchContent({title:t.title,structure:t.structure,questions:t.questions}));
        next.set(d.id,value);
        if(t.baseTestId)next.set(t.baseTestId,value);
      });
      indexed=next;
      fetchedFor=user.uid;
    }catch(err){console.warn('CT26: content search not available; title search remains.',err);}
    finally{loading=false;applyFilter();}
  }
  function ensure(){
    const section=testPage();if(!section||section.querySelector('#'+ID))return;
    const heading=section.querySelector('.section-title');if(!heading)return;
    const box=document.createElement('div');box.className='ct26-test-search';
    box.innerHTML='<label for="'+ID+'">Поиск по тестам и заданиям</label><div class="ct26-test-search-row"><input type="search" id="'+ID+'" autocomplete="off" placeholder="Название или слово из задания…" aria-label="Поиск по тестам и заданиям"><button class="ct26-search-clear" type="button" aria-label="Очистить поиск" title="Очистить поиск">✕</button></div><small class="ct26-search-count" aria-live="polite"></small>';
    heading.insertAdjacentElement('afterend',box);
    const input=box.querySelector('input');input.value=query;
    input.addEventListener('input',()=>{query=normal(input.value.trim());applyFilter();});
    box.querySelector('button').addEventListener('click',()=>{input.value='';query='';applyFilter();input.focus();});
  }
  function applyFilter(){
    if(!testPage())return;
    const cards=[...document.querySelectorAll('article.test-card')];let visible=0;
    cards.forEach(card=>{
      const title=normal([card.querySelector('h3')?.textContent,card.querySelector('.year-badge')?.textContent,card.querySelector('.test-no')?.textContent].join(' '));
      const testId=card.querySelector('[data-custom-test]')?.dataset.customTest||card.querySelector('[data-open-test]')?.dataset.openTest||card.querySelector('[data-edit-built-in]')?.dataset.editBuiltIn;
      const text=indexed.get(testId)||'';
      const found=!query||title.includes(query)||text.includes(query);
      card.hidden=!found;card.style.display=found?'':'none';if(found)visible++;
    });
    const counter=document.querySelector('.ct26-search-count');
    if(counter)counter.textContent=query?'Найдено: '+visible+' из '+cards.length:'Всего тестов: '+cards.length;
  }
  function refresh(){scheduled=false;if(!testPage())return;ensure();applyFilter();buildIndex();}
  const obs=new MutationObserver(mutations=>{
    if(!mutations.some(m=>m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.custom-tests-section,.test-grid,.test-card')||n.querySelector?.('.custom-tests-section,.test-grid,.test-card')))))return;
    if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}
  });
  obs.observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
