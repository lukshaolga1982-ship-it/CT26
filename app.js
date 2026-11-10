import { auth, db, watchAuth, loginWithStudentLogin, loginWithTeacherEmail, logout, createStudent, collection, doc, getDoc, getDocs, query, where, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "./firebase-service.js";

const LIBRARY_API="https://ct26-library-api.lukshaolga1982.workers.dev";
const $ = (s, p=document) => p.querySelector(s);
const app = $("#app");
const state = {view:"dashboard",role:"teacher",loginRole:"student",user:null,authLoading:true,year:"ЦЭ 2026",test:null,index:0,answers:{},optionOrder:{},timer:null,seconds:120*60,students:[],attempts:[],externalResults:[],customTests:[],builtInOverrides:[],messages:[],books:[],reviews:[],messageStudentId:null,attemptId:null,saveTimer:null,revisionErrors:new Set(),revisionComments:{}};
const scale={0:0,1:1,2:2,3:3,4:4,5:8,6:12,7:15,8:18,9:21,10:24,11:26,12:28,13:29,14:31,15:32,16:34,17:35,18:36,19:37,20:38,21:39,22:40,23:41,24:42,25:43,26:44,27:45,28:46,29:47,30:48,31:49,32:50,33:51,34:52,35:53,36:54,37:55,38:56,39:57,40:58,41:59,42:60,43:61,44:63,45:64,46:65,47:66,48:68,49:69,50:70,51:72,52:73,53:75,54:77,55:79,56:81,57:84,58:87,59:91,60:95,61:99,62:100};
// Отметка ЦЭ определяется по тестовому (стобалльному) результату.
const ceGradeRanges=[[1,0,1],[2,2,2],[3,3,10],[4,11,20],[5,21,29],[6,30,37],[7,38,47],[8,48,65],[9,66,79],[10,80,100]];
function ceGrade(score){if(score===null||score===undefined||score==='')return null;const n=Number(score);if(!Number.isInteger(n)||n<0||n>100)return null;return ceGradeRanges.find(([,from,to])=>n>=from&&n<=to)?.[0]??null}
function attemptGrade(attempt){return Number(attempt.maxPrimary??62)===62?ceGrade(attempt.testScore):null}
function gradeDisplay(attempt){const grade=attemptGrade(attempt);return grade===null?'—':`${grade} / 10`}
const icons={dash:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',tests:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 0 4 2 4 5"/></svg>',chart:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'};
const teacherNav=[['dashboard','Главная','dash'],['tests','Тесты','tests'],['students','Учащиеся','users'],['results','Результаты','chart'],['messages','Сообщения','users'],['library','Справочник','tests']];
const studentNav=[['student-home','Главная','dash'],['tests','Тесты','tests'],['student-results','Мои результаты','chart'],['mistakes','Мои ошибки','users'],['messages','Сообщения','users'],['library','Справочник','tests']];

function shell(content,title,eyebrow='Кабинет учителя'){
  const nav=state.user.role==='teacher'?teacherNav:studentNav;const initials=state.user.name.split(' ').map(x=>x[0]).slice(0,2).join('');
  const unread=unreadMessagesCount();
  return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="logo"><div class="logo-mark">ЦТ</div><div class="logo-copy"><strong>Английский язык</strong><span>ЦЭ / ЦТ · 2020–2026</span></div></div><nav class="nav">${nav.map(([id,label,ic])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${icons[ic]}${label}${id==='messages'&&unread?`<b class="unread-badge">${unread}</b>`:''}</button>`).join('')}</nav><div class="sidebar-foot"><div class="user-mini"><div class="avatar">${initials}</div><div><strong>${state.user.name}</strong><span>${state.user.role==='teacher'?'Учитель':state.user.group}</span></div><button class="logout" id="logout" title="Выйти">↗</button></div></div></aside><main class="main"><header class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="mobile-menu" id="menuBtn">☰</button><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div></div><div class="actions"><button class="icon-btn" aria-label="Уведомления">⌁</button>${state.user.role==='teacher'?'<button class="primary" id="createStudentTop">+ Создать ученика</button>':''}</div></header>${content}</main><nav class="mobile-bar">${nav.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${label}${id==='messages'&&unread?` (${unread})`:''}</button>`).join('')}</nav></div>`;
}

function render(){clearInterval(state.timer);if(state.authLoading){app.innerHTML='<main class="loading-screen"><div class="logo-mark">ЦТ</div><p>Загрузка кабинета…</p></main>';return}if(!state.user)return renderLogin();if(state.view==='test')return renderTest();if(state.view==='result')return renderResult();const views={dashboard:dashboard(),tests:tests(),students:students(),results:results(),messages:messagesView(),library:libraryView(),'student-home':studentDashboard(),'student-results':studentResults(),mistakes:mistakes()};const titles={dashboard:`Добрый вечер, ${state.user.name.split(' ')[0]}!`,tests:state.user.role==='teacher'?'Банк тестов':'Доступные тесты',students:'Учащиеся',results:'Результаты',messages:'Сообщения',library:'Справочник','student-home':`Привет, ${state.user.name.split(' ')[0]}!`,'student-results':'Мои результаты',mistakes:'Мои ошибки'};app.innerHTML=shell(views[state.view],titles[state.view],state.user.role==='teacher'?'Кабинет учителя':'Кабинет ученика');bindCommon();bindListFilters();if(state.view==='messages')markConversationRead();if(state.view==='library')bindLibrary();if(state.view==='results')bindProgressControls();}
function bindCommon(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});$('#menuBtn')?.addEventListener('click',()=>$('#sidebar').classList.toggle('open'));$('#createStudentTop')?.addEventListener('click',createStudentModal);$('#logout')?.addEventListener('click',async()=>{await logout();state.view='dashboard'});document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startTest("ЦЭ 2026",+b.dataset.start));document.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>{state.year=b.dataset.year;render()});document.querySelectorAll('[data-open-test]').forEach(b=>b.onclick=()=>{const variant=builtInById(b.dataset.openTest);if(variant?.status==='ready')launchTest(variant);else if(variant)sourceModal(variant)});document.querySelectorAll('[data-custom-test]').forEach(b=>b.onclick=()=>startCustomTest(b.dataset.customTest));$('#importTestFile')?.addEventListener('change',importTestFromFile);document.querySelectorAll('[data-toggle-test]').forEach(b=>b.onclick=()=>toggleTestAccess(b.dataset.toggleTest));document.querySelectorAll('[data-test-audience]').forEach(b=>b.onclick=()=>testAudienceModal(b.dataset.testAudience));document.querySelectorAll('[data-regrade-test]').forEach(b=>b.onclick=()=>previewRegrade(b.dataset.regradeTest));document.querySelectorAll('[data-edit-test]').forEach(b=>b.onclick=()=>editCustomTest(b.dataset.editTest));document.querySelectorAll('[data-edit-built-in]').forEach(b=>b.onclick=()=>editBuiltInTest(b.dataset.editBuiltIn));document.querySelectorAll('[data-delete-test]').forEach(b=>b.onclick=()=>confirmDeleteTest(b.dataset.deleteTest));document.querySelectorAll('[data-edit-student]').forEach(b=>b.onclick=()=>editStudentName(b.dataset.editStudent));document.querySelectorAll('[data-delete-student]').forEach(b=>b.onclick=()=>confirmDeleteStudent(b.dataset.deleteStudent));$('#buildFromReady')?.addEventListener('click',customTestBuilderModal);$('#createManualTest')?.addEventListener('click',()=>manualTestModal());document.querySelectorAll('[data-modal]').forEach(b=>b.onclick=()=>assignmentModal(b.dataset.modal));document.querySelectorAll('[data-review-attempt]').forEach(b=>b.onclick=()=>reviewAttempt(b.dataset.reviewAttempt));document.querySelectorAll('[data-delete-attempt]').forEach(b=>b.onclick=()=>confirmDeleteAttempt(b.dataset.deleteAttempt));document.querySelectorAll('[data-attempt-errors]').forEach(b=>b.onclick=()=>showAttemptErrors(b.dataset.attemptErrors));document.querySelectorAll('[data-error-detail]').forEach(b=>b.onclick=()=>showErrorDetail(b.dataset.errorDetail,b.dataset.questionId));document.querySelectorAll('[data-resume-attempt]').forEach(b=>b.onclick=()=>resumeAttempt(b.dataset.resumeAttempt));document.querySelectorAll('[data-student-errors]').forEach(b=>b.onclick=()=>showStudentErrors(b.dataset.studentErrors));document.querySelectorAll('[data-student-attempts]').forEach(b=>b.onclick=()=>showStudentAttempts(b.dataset.studentAttempts));document.querySelectorAll('[data-message-student]').forEach(b=>b.onclick=()=>{state.messageStudentId=b.dataset.messageStudent;render()});$('#sendMessage')?.addEventListener('click',sendMessage);}

function renderLogin(){app.innerHTML=`<main class="login-page"><section class="brand-panel"><div class="login-brand"><div class="logo-mark">ЦТ</div><span>Английский язык</span></div><div><p class="eyebrow">Подготовка к ЦЭ и ЦТ</p><h1>Все тесты.<br>Весь прогресс.<br>В одном месте.</h1><p>Решайте варианты по годам, повторяйте ошибки и следите за результатом.</p></div><b>2020 — 2026</b></section><section class="login-side"><form class="login-card" id="loginForm"><p class="eyebrow">Добро пожаловать</p><h2>Вход в личный кабинет</h2><p>${state.loginRole==='teacher'?'Введите электронную почту учителя и пароль Firebase.':'Введите логин и пароль, которые выдал учитель.'}</p><div class="role-switch"><button type="button" data-role="student" class="${state.loginRole==='student'?'active':''}">Ученик</button><button type="button" data-role="teacher" class="${state.loginRole==='teacher'?'active':''}">Учитель</button></div><div class="field"><label>${state.loginRole==='teacher'?'Email':'Логин'}</label><input id="login" autocomplete="username" placeholder="${state.loginRole==='teacher'?'lukshaolga1982@gmail.com':'Введите логин'}" required></div><div class="field"><label>Пароль</label><div class="password-field"><input id="password" type="password" autocomplete="current-password" placeholder="Введите пароль" required><button type="button" id="showPassword">Показать</button></div></div><div id="loginError" class="login-error"></div><button class="primary login-submit" type="submit">Войти</button></form></section></main>`;document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{state.loginRole=b.dataset.role;renderLogin()});$('#showPassword').onclick=()=>{const p=$('#password');p.type=p.type==='password'?'text':'password'};$('#loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;button.textContent='Вход…';$('#loginError').textContent='';try{if(state.loginRole==='teacher')await loginWithTeacherEmail($('#login').value,$('#password').value);else await loginWithStudentLogin($('#login').value,$('#password').value)}catch(error){console.error(error);$('#loginError').textContent='Не удалось войти. Проверьте логин, пароль и выбранную роль.';button.disabled=false;button.textContent='Войти'}}}

function dashboard(){const scored=completedAttempts(),average=scored.length?Math.round(scored.reduce((s,a)=>s+(a.testScore??a.primaryScore??0),0)/scored.length):0;return `<section class="hero"><div class="hero-copy"><p class="eyebrow">Подготовка без лишнего</p><h2>Результаты учеников — ясно и по каждому заданию</h2><p>Назначайте варианты, собирайте собственные тесты и сразу замечайте темы, которые требуют повторения.</p><div class="hero-actions"><button class="primary" data-modal="assignment">Создать задание</button><button class="ghost" data-view="results">Посмотреть результаты</button></div></div><div class="hero-badge">ЦЭ<small>2026</small></div></section>
<section class="grid stats"><div class="stat"><div class="stat-head"><span>Учащиеся</span><em>реальные аккаунты</em></div><strong>${state.students.length}</strong></div><div class="stat"><div class="stat-head"><span>Средний балл</span><em>по завершённым</em></div><strong>${average}</strong></div><div class="stat"><div class="stat-head"><span>Работы на проверке</span><em>часть B</em></div><strong>${state.attempts.filter(a=>a.manualReviewStatus==='pending').length}</strong></div><div class="stat"><div class="stat-head"><span>Выполнено</span><em>все попытки</em></div><strong>${scored.length}</strong></div></section>
<section class="grid two-col"><div class="card"><div class="card-head"><h3>Текущие задания</h3><a data-view="tests">Все задания →</a></div>${assignment('A1–B22','Вариант 1 · до 26 августа',68,'due')}${assignment('B1–B8','Предлоги и вставка слов · 14 учеников',82,'')}${assignment('Работа над ошибками','Индивидуальная подборка',100,'done')}</div><div class="card"><div class="card-head"><h3>По блокам</h3><a data-view="results">Аналитика →</a></div><div class="block-bars">${[['A1–A4',86],['A5–A8',74],['A9–A12',68],['B1–B3',61],['B19–B22',57]].map(([b,v])=>`<div class="block-row"><span>${b}</span><div class="progress"><i style="width:${v}%"></i></div><b>${v}%</b></div>`).join('')}</div></div></section>`}
function assignment(name,meta,progress,status){return `<div class="assignment"><div class="assignment-icon">${name[0]}</div><div><strong>${name}</strong><span>${meta}</span><div class="progress"><i style="width:${progress}%"></i></div></div><span class="status ${status}">${status==='done'?'Выполнено':status==='due'?'Срок скоро':progress+'%'}</span></div>`}

function hasScore(a){return a.testScore!==undefined&&a.testScore!==null}
function completedAttempts(studentId=null){return state.attempts.filter(a=>(!studentId||a.studentId===studentId)&&hasScore(a))}
function studentMetrics(studentId){const completed=completedAttempts(studentId),scores=completed.map(a=>Number(a.testScore)||0),errors=completed.reduce((sum,a)=>sum+Object.values(a.questionResultsSnapshot||{}).filter(r=>!r.correct).length,0);return {completedTests:completed.length,totalErrors:errors,progressPercent:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,bestScore:scores.length?Math.max(...scores):0}}
function attemptMoment(a){return a.submittedAt||a.returnedAt||a.startedAt||a.createdAt||null}
function timestampValue(value){if(!value)return 0;if(typeof value.seconds==='number')return value.seconds*1000;if(typeof value.toDate==='function')return value.toDate().getTime();const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0}
function attemptDate(a){const value=attemptMoment(a),date=value?.toDate?.()||(value?new Date(timestampValue(value)):null);return date&&Number.isFinite(date.getTime())?date.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}
function attemptIdentity(a){return a.testId||`${a.year||''}::${a.variantNumber||''}`}
function attemptNumber(a){if(a.attemptNumber)return a.attemptNumber;const peers=state.attempts.filter(x=>x.studentId===a.studentId&&attemptIdentity(x)===attemptIdentity(a)).sort((x,y)=>timestampValue(attemptMoment(x))-timestampValue(attemptMoment(y)));const index=peers.findIndex(x=>x.id===a.id);return index>=0?index+1:1}
function nextAttemptNumber(studentId,testId){const peers=state.attempts.filter(a=>a.studentId===studentId&&attemptIdentity(a)===testId);return Math.max(0,...peers.map(a=>Number(a.attemptNumber)||attemptNumber(a)||0))+1}
function attemptLabel(a){return `Попытка №${attemptNumber(a)}${a.revisionOf?' · доработка':''}`}
function studentDashboard(){const completed=completedAttempts(),approved=completed.filter(a=>a.reviewStatus==='approved'),best=completed.length?Math.max(...completed.map(a=>a.testScore||0)):0,totalErrors=approved.reduce((sum,a)=>sum+Object.values(a.questionResultsSnapshot||{}).filter(r=>!r.correct).length,0),progress=completed.length?Math.round(completed.reduce((s,a)=>s+(a.testScore||0),0)/completed.length):0;return `<section class="hero has-image"><div class="hero-copy"><p class="eyebrow">Твоя подготовка</p><h2>Продолжай в своём темпе</h2><p>Выбирай варианты 2025 и 2026 годов, отправляй ответы и следи за реальным прогрессом.</p><div class="hero-actions"><button class="primary" data-view="tests">Выбрать тест</button><button class="ghost" data-view="mistakes">Повторить ошибки</button></div></div><img class="hero-illustration" src="assets/study-hero.png" alt="Ученик готовится к тесту по английскому языку"></section><section class="grid stats"><div class="stat"><div class="stat-head"><span>Выполнено</span><em>все попытки</em></div><strong>${completed.length}</strong></div><div class="stat"><div class="stat-head"><span>Лучший балл</span><em>из 100</em></div><strong>${best}</strong></div><div class="stat"><div class="stat-head"><span>Готовые тесты</span><em>2025–2026</em></div><strong>${TEST_DATA.readyCount}</strong></div><div class="stat"><div class="stat-head"><span>Открытые ошибки</span><em>после проверки</em></div><strong>${totalErrors}</strong></div></section><section class="grid student-summary"><div class="card tracker"><div class="tracker-ring" style="--p:${progress}%"><div><strong>${progress}%</strong><span>общий прогресс</span></div></div><div><div class="card-head"><h3>Трекер прогресса</h3><span class="status done">по результатам</span></div><p>Показатель обновляется после каждой отправленной попытки, включая доработки.</p></div></div><div class="card"><div class="card-head"><h3>Что делать дальше</h3><span class="error-total">${totalErrors} ошибок</span></div><p>Открой раздел «Тесты», выбери 2025 или 2026 год и один из десяти вариантов.</p><button class="secondary" data-view="tests">Перейти к тестам</button></div></section>`}
function attemptStatus(a){if(!hasScore(a))return '<span class="status">В процессе</span>';if(a.reviewStatus==='approved')return '<span class="status done">Проверено</span>';if(a.reviewStatus==='revision_requested')return '<span class="status revision">Отправлено на доработку</span>';return '<span class="status due">На проверке</span>'}
function revisionChildFor(attempt){return state.attempts.filter(item=>item.revisionOf===attempt.id).sort((a,b)=>timestampValue(attemptMoment(b))-timestampValue(attemptMoment(a)))[0]||null}
function studentAttemptAction(a){if(a.reviewStatus==='revision_requested'){const child=revisionChildFor(a);return child?`<span class="status done">Создана ${escapeAttr(attemptLabel(child))}</span>`:`<button class="primary" data-resume-attempt="${escapeAttr(a.id)}">Доработать</button>`}if(a.reviewStatus==='approved')return `<button class="secondary" data-attempt-errors="${escapeAttr(a.id)}">Посмотреть разбор</button>`;return 'Ответы скрыты'}
// Группировка в интерфейсе: Firestore и отдельные попытки остаются без изменений.
function attemptDisplayName(a){return a.testTitle||`${a.year||'Тест'} · Вариант ${a.variantNumber||'—'}`}
function groupedAttempts(source){
  const map=new Map();
  for(const a of source){
    const key=JSON.stringify([a.studentId||'',attemptIdentity(a)]);
    if(!map.has(key))map.set(key,[]);
    map.get(key).push(a);
  }
  return [...map.values()].map(items=>{
    items.sort((a,b)=>(timestampValue(attemptMoment(a))-timestampValue(attemptMoment(b)))||(Number(attemptNumber(a))-Number(attemptNumber(b))));
    const revisions=items.filter(a=>a.revisionOf);
    const first=items[0],latest=items[items.length-1];
    const firstScored=items.find(hasScore),lastScored=[...items].reverse().find(hasScore);
    return {items,first,latest,firstScored,lastScored,revisions,studentId:latest.studentId,title:attemptDisplayName(latest),lastTime:timestampValue(attemptMoment(latest))};
  }).sort((a,b)=>b.lastTime-a.lastTime);
}
function groupStatus(g){
  const a=g.latest;
  const revision=Boolean(a.revisionOf);
  if(a.reviewStatus==='revision_requested')return '<span class="status revision">Ожидает доработки</span>';
  if(a.status==='in-progress')return `<span class="status due">${revision?'Доработка начата':'В процессе'}</span>`;
  if(a.reviewStatus==='approved')return `<span class="status done">${revision?'Доработка проверена':'Проверено'}</span>`;
  return `<span class="status due">${revision?'Доработка на проверке':'На проверке'}</span>`;
}
function groupProgress(g){
  const a=g.firstScored,b=g.lastScored;
  if(!a)return '—';
  if(!b||a.id===b.id)return `${a.testScore??'—'} / 100`;
  const delta=Number(b.testScore)-Number(a.testScore);
  const d=Number.isFinite(delta)?` (${delta>0?'+':''}${delta})`:'';
  return `${a.testScore??'—'} → ${b.testScore??'—'} / 100${d}`;
}
function teacherAttemptHistory(g){
  // Keep each attempt inside its parent test row. Never nest a second table.
  return `<details class="attempt-history"><summary>История: ${g.items.length} ${g.items.length===1?'попытка':'попыток'} · раскрыть</summary><div style="display:grid;gap:10px;margin-top:12px;min-width:300px">${g.items.map(a=>`<div style="border:1px solid #e0e9e5;border-radius:12px;padding:12px;background:#f8fbfa;display:grid;gap:8px"><div><strong>${escapeAttr(attemptLabel(a))}</strong> <span style="font-size:12px;color:#64748b">${attemptDate(a)}</span></div><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px"><span>Первичный: <b>${a.primaryScore??'—'} / ${a.maxPrimary??62}</b></span><span>Тестовый: <b>${a.testScore??'—'} / 100</b></span><span>Отметка: <b>${gradeDisplay(a)}</b></span></div><div>${attemptStatus(a)}</div><div class="result-actions"><button class="secondary" data-review-attempt="${escapeAttr(a.id)}">Открыть</button><button class="danger" data-delete-attempt="${escapeAttr(a.id)}">Удалить</button></div></div>`).join('')}</div></details>`;
}
function studentAttemptHistory(g){
  return `<details class="attempt-history"><summary>Все попытки (${g.items.length}) · раскрыть</summary><div style="display:grid;gap:10px;margin-top:12px;min-width:300px">${g.items.map(a=>`<div style="border:1px solid #e0e9e5;border-radius:12px;padding:12px;background:#f8fbfa;display:grid;gap:8px"><div><strong>${escapeAttr(attemptLabel(a))}</strong> <span style="font-size:12px;color:#64748b">${attemptDate(a)}</span></div><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px"><span>Первичный: <b>${a.primaryScore??'—'} / ${a.maxPrimary??62}</b></span><span>Тестовый: <b>${a.testScore??'—'} / 100</b></span><span>Отметка: <b>${gradeDisplay(a)}</b></span></div><div>${attemptStatus(a)}</div><div>${studentAttemptAction(a)}</div></div>`).join('')}</div></details>`;
}
function studentResults(){
  const groups=groupedAttempts(completedAttempts());
  return `<div class="section-title"><div><h2>Мои работы</h2><p>Один тест — одна строка. Внутри сохраняется вся история попыток и доработок.</p></div></div><div class="card table-wrap">${groups.length?`<table class="table"><thead><tr><th>Тест</th><th>Результат и изменение</th><th>Последняя попытка</th><th>Состояние</th></tr></thead><tbody>${groups.map(g=>`<tr><td><strong>${escapeAttr(g.title)}</strong><div class="group-attempt-detail">${studentAttemptHistory(g)}</div></td><td class="score">${groupProgress(g)}</td><td>${escapeAttr(attemptLabel(g.latest))} · ${attemptDate(g.latest)}</td><td>${groupStatus(g)}${g.latest.reviewStatus==='revision_requested'&&!revisionChildFor(g.latest)?`<div style="margin-top:8px">${studentAttemptAction(g.latest)}</div>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty"><strong>Работ пока нет</strong>Выберите готовый вариант и отправьте ответы.</div>'}</div>`;
}
function errorPreviewText(q){return String(q.context||q.before||q.prompt||'Открыть упражнение').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,180)}
function mistakes(){const rows=state.attempts.filter(a=>a.reviewStatus==='approved').flatMap(errorRows);return `<div class="section-title"><div><h2>${rows.length} ${rows.length===1?'ошибка':'ошибок'} для повторения</h2><p>Откройте карточку, чтобы увидеть упражнение, свой ответ и объяснение учителя.</p></div>${rows.length?'<button class="secondary" data-view="tests">Открыть тесты</button>':''}</div>${rows.length?`<div class="student-error-grid">${rows.map(row=>`<article class="student-error-card"><div class="student-error-head"><span class="question-id">${escapeAttr(row.questionId)}</span><span class="status revision">Ошибка</span></div><p class="error-source">${escapeAttr(`${row.attempt.year||'—'} · Вариант ${row.attempt.variantNumber||'—'}`)}</p><h3>${escapeAttr(row.question.prompt||'Задание')}</h3><p class="error-preview">${escapeAttr(errorPreviewText(row.question))}${errorPreviewText(row.question).length>=180?'…':''}</p><div class="mini-answer"><small>Ваш ответ</small><strong>${escapeAttr(row.studentAnswer)}</strong></div>${row.teacherComment?'<span class="comment-present">Есть комментарий учителя</span>':''}<button class="primary error-open" data-error-detail="${escapeAttr(row.attempt.id)}" data-question-id="${escapeAttr(row.questionId)}">Посмотреть ошибку</button></article>`).join('')}</div>`:'<div class="card empty"><strong>Разбора пока нет</strong>После проверки учителем здесь появятся карточки конкретных ошибок.</div>'}`}

function builtInOverrideFor(baseId){return state.builtInOverrides.find(test=>test.baseTestId===baseId)}
function effectiveBuiltInTest(base){const override=builtInOverrideFor(base.id);if(!override)return base;const keys=override.gradingAnswers||{};return {...base,...override,id:base.id,baseTestId:base.id,kind:'built-in',status:'ready',questions:(override.questions||base.questions).map(q=>({...q,accepted:keys[q.id]||q.accepted||(q.answer!==undefined?[q.answer]:[]),answer:(keys[q.id]||[])[0]??q.answer})),questionCount:(override.questions||base.questions).length}}
function builtInById(id){const base=TEST_DATA.variants.find(v=>v.id===id);return base?effectiveBuiltInTest(base):null}
// Student-only test card summary, using attempts already loaded for this account.
function studentTestCardResult(testId){
  if(state.user?.role!=='student')return '';
  const attempts=state.attempts.filter(a=>a.studentId===state.user.uid&&a.testId===testId);
  const finished=attempts.filter(a=>a.status==='scored'&&hasScore(a))
    .sort((a,b)=>timestampValue(attemptMoment(b))-timestampValue(attemptMoment(a)));
  if(finished.length){
    const last=finished[0];
    const score=Number(last.testScore);
    const scoreText=Number.isFinite(score)?`${Math.max(0,Math.min(100,score))} / 100`:'— / 100';
    return `<div class="student-card-result" aria-label="Тест выполнен, последний тестовый балл ${scoreText}"><span class="student-card-result-check">✓ Решён</span><strong>${scoreText}</strong>${finished.length>1?`<small>Попыток: ${finished.length}</small>`:''}</div>`;
  }
  if(attempts.some(a=>a.status==='in-progress'))return '<div class="student-card-result student-card-result-pending">◷ Начат, не завершён</div>';
  return '';
}
function tests(){const meta=TEST_DATA.years.find(y=>y.year===state.year);const variants=TEST_DATA.variants.filter(v=>v.year===state.year).map(effectiveBuiltInTest);const customSection=`<section class="custom-tests-section"><div class="section-title"><div><h2>${state.user.role==='teacher'?'Мои тесты':'Тесты учителя'}</h2><p>${state.customTests.length?'Готовые авторские и составленные работы.':'Здесь появятся тесты, созданные учителем.'}</p></div>${state.user.role==='teacher'?'<div class="hero-actions"><button class="secondary" id="buildFromReady">Собрать из готовых</button><label class="primary import-button">↑ Загрузить Word / PDF<input id="importTestFile" type="file" accept=".docx,.pdf" hidden></label><button class="primary" id="createManualTest">+ Создать новый тест</button></div>':''}</div>${state.customTests.length?`<div class="grid test-grid">${state.customTests.map((v,i)=>`<article class="test-card custom-test-card"><div class="stripe"></div><span class="year-badge">Авторский</span><div class="test-no">${i+1}</div><h3>${escapeAttr(v.title)}</h3><p>${v.questionCount||v.questions.length} заданий · ${escapeAttr(v.structure||'Составлено учителем')}</p><div class="test-meta"><span class="status ${v.status==='published'?'done':'revision'}">${v.status==='published'?'Открыт':'Закрыт'}</span>${studentTestCardResult(v.id)}${state.user.role==='teacher'||v.status==='published'?`<button class="secondary" data-custom-test="${escapeAttr(v.id)}">${state.user.role==='teacher'?'Просмотр':'Решать'}</button>`:''}</div>${state.user.role==='teacher'?`<div class="manage-actions"><button class="secondary" data-toggle-test="${escapeAttr(v.id)}">${v.status==='published'?'🔒 Закрыть доступ':'🔓 Открыть доступ'}</button><button class="ghost" data-test-audience="${escapeAttr(v.id)}">👥 ${v.audienceMode==='selected'?'Выбраны: '+(v.allowedStudentIds||[]).length:'Все учащиеся'}</button><button class="ghost" data-edit-test="${escapeAttr(v.id)}">Редактировать</button><button class="secondary" data-regrade-test="${escapeAttr(v.id)}">↻ Пересчитать результаты</button><button class="danger" data-delete-test="${escapeAttr(v.id)}">Удалить</button></div>`:''}</article>`).join('')}</div>`:'<div class="card empty"><strong>Авторских тестов пока нет</strong>Загрузите Word/PDF либо создайте тест вручную.</div>'}</section>`;return `${customSection}<div class="section-title"><div><h2>Новый банк тестов</h2><p><strong>${state.year}</strong> · ${meta.variantCount} вариантов · ${meta.structure}</p></div></div><div class="filters">${TEST_DATA.years.map(y=>`<button class="filter ${y.year===state.year?'active':''}" data-year="${y.year}">${y.year}</button>`).join('')}</div><div class="content-notice"><strong>Встроенные тесты можно исправлять</strong><span>Изменения учителя автоматически используются в новых попытках учеников. Уже завершённые попытки сохраняют прежнюю версию.</span></div><div class="grid test-grid" style="margin-top:16px">${variants.map(v=>`<article class="test-card"><div class="stripe"></div><span class="year-badge">${v.year}</span><div class="test-no">${v.number}</div><h3>${escapeAttr(v.title)}</h3><p>${v.questionCount} заданий · ${escapeAttr(v.structure)}</p><div class="test-meta"><span class="status ${builtInOverrideFor(v.id)?'revision':'done'}">${builtInOverrideFor(v.id)?'Отредактирован учителем':'Готов к решению'}</span>${studentTestCardResult(v.id)}<button class="secondary" data-open-test="${v.id}">Решать</button></div>${state.user.role==='teacher'?`<div class="manage-actions"><button class="ghost" data-edit-built-in="${escapeAttr(v.id)}">Редактировать тест и ответы</button><button class="secondary" data-regrade-test="${escapeAttr(v.id)}">↻ Пересчитать результаты</button></div>`:''}</article>`).join('')}</div>`}

const listFilters={students:{query:'',sort:'name'},results:{query:'',sort:'newest'}};
function listToolbar(kind){const f=listFilters[kind];const opts=kind==='students'?[['name','По имени (А–Я)'],['nameDesc','По имени (Я–А)'],['group','По группе'],['scoreDesc','Средний балл: высокий'],['scoreAsc','Средний балл: низкий'],['attempts','Больше попыток']]:[['newest','Сначала новые'],['oldest','Сначала старые'],['name','По имени (А–Я)'],['scoreDesc','Баллы: высокие'],['scoreAsc','Баллы: низкие'],['test','По названию теста']];return `<div class="list-toolbar"><label><span>Поиск учащегося</span><input type="search" id="listSearch" placeholder="Имя, фамилия${kind==='students'?', логин или группа':''}" value="${escapeAttr(f.query)}" autocomplete="off"></label><label><span>Сортировка</span><select id="listSort">${opts.map(([v,t])=>`<option value="${v}" ${f.sort===v?'selected':''}>${t}</option>`).join('')}</select></label><span id="listCount" aria-live="polite"></span></div>`}
function applyListFilters(){const kind=state.view;if(!listFilters[kind])return;const f=listFilters[kind],body=document.querySelector('.filtered-list tbody');if(!body)return;const rows=[...body.children].filter(el=>el.tagName==='TR'),q=f.query.trim().toLocaleLowerCase('ru');let visible=0;rows.forEach(r=>{const show=!q||(r.dataset.search||'').toLocaleLowerCase('ru').includes(q);r.hidden=!show;if(show)visible++});const cmp=(a,b)=>a.localeCompare(b,'ru',{numeric:true,sensitivity:'base'});rows.sort((a,b)=>{const name=()=>cmp(a.dataset.name||'',b.dataset.name||'');switch(f.sort){case 'name':return name();case 'nameDesc':return -name();case 'group':return cmp(a.dataset.group||'',b.dataset.group||'')||name();case 'scoreDesc':return (+b.dataset.score||0)-(+a.dataset.score||0);case 'scoreAsc':return (+a.dataset.score||0)-(+b.dataset.score||0);case 'attempts':return (+b.dataset.attempts||0)-(+a.dataset.attempts||0);case 'oldest':return (+a.dataset.time||0)-(+b.dataset.time||0);case 'newest':return (+b.dataset.time||0)-(+a.dataset.time||0);case 'test':return cmp(a.dataset.test||'',b.dataset.test||'');default:return 0}});rows.forEach(r=>body.appendChild(r));const count=$('#listCount');if(count)count.textContent=`Показано: ${visible} из ${rows.length}`;const empty=$('#listEmpty');if(empty)empty.hidden=visible!==0;}
function bindListFilters(){const kind=state.view;if(!listFilters[kind])return;$('#listSearch')?.addEventListener('input',e=>{listFilters[kind].query=e.target.value;applyListFilters()});$('#listSort')?.addEventListener('change',e=>{listFilters[kind].sort=e.target.value;applyListFilters()});applyListFilters()}
function students(){return `<div class="section-title"><div><h2>${state.students.length} учащихся</h2><p>Прогресс рассчитывается по всем сохранённым попыткам, включая доработки.</p></div><button class="primary" onclick="createStudentModal()">+ Создать ученика</button></div>${listToolbar("students")}<div class="card table-wrap filtered-list">${state.students.length?`<table class="table"><thead><tr><th>Ученик</th><th>Логин</th><th>Группа</th><th>Попыток</th><th>Все ошибки</th><th>Средний балл</th><th>Действия</th></tr></thead><tbody>${state.students.map(s=>{const m=studentMetrics(s.id);return `<tr data-search="${escapeAttr([s.displayName,s.login,s.groupId].join(" "))}" data-name="${escapeAttr(s.displayName||"")}" data-group="${escapeAttr(s.groupId||"")}" data-score="${m.progressPercent}" data-attempts="${m.completedTests}"><td><strong>${escapeAttr(s.displayName||'Без имени')}</strong></td><td><code>${escapeAttr(s.login||'—')}</code></td><td>${escapeAttr(s.groupId||'Без группы')}</td><td><button class="secondary" data-student-attempts="${escapeAttr(s.id)}">${m.completedTests} · посмотреть</button></td><td><button class="secondary" data-student-errors="${escapeAttr(s.id)}">${m.totalErrors} · посмотреть</button></td><td><div class="progress" style="width:90px"><i style="width:${m.progressPercent}%"></i></div><small>${m.progressPercent}%</small></td><td><button class="secondary" data-edit-student="${escapeAttr(s.id)}">✎ Изменить имя</button> <button class="danger" data-delete-student="${escapeAttr(s.id)}">Удалить</button></td></tr>`}).join('')}</tbody></table><p id="listEmpty" class="empty" hidden>По вашему запросу учащиеся не найдены.</p>`:'<div class="empty"><strong>Учеников пока нет</strong>Создайте первый аккаунт — он сразу появится в этой таблице.</div>'}</div>`}


// Аналитика: онлайн-попытки и введённые учителем результаты РТ / ЦТ / ЦЭ.
const progressFilter={student:'all',source:'all'};
function progressDate(row){
  if(row.external)return String(row.examDate||'');
  const moment=attemptMoment(row);
  const value=timestampValue(moment);
  return value?new Date(value).toISOString().slice(0,10):'';
}
function progressRows(){
  const online=completedAttempts().filter(a=>Number.isFinite(Number(a.testScore))).map(a=>({
    id:a.id,studentId:a.studentId,score:Number(a.testScore),primary:a.primaryScore??null,maxPrimary:a.maxPrimary??62,
    date:progressDate(a),source:'Сайт',title:a.testTitle||`${a.year||'Тест'} · Вариант ${a.variantNumber||'—'}`,external:false
  }));
  const external=state.externalResults.filter(r=>Number.isFinite(Number(r.testScore))).map(r=>({
    ...r,score:Number(r.testScore),primary:r.primaryScore??null,date:String(r.examDate||''),
    source:r.examType||'РТ',title:r.title||r.examType||'РТ',external:true
  }));
  return [...online,...external].filter(r=>r.score>=0&&r.score<=100).sort((a,b)=>a.date.localeCompare(b.date));
}
// Аналитика по типам заданий: учитываются только проверенные ответы, без предположений.
const TASK_SECTIONS=[
 {id:'a-grammar',label:'А1–А8 · Грамматика',part:'A',start:1,end:8},
 {id:'a-vocabulary',label:'А9–А12 · Лексика',part:'A',start:9,end:12},
 {id:'a-communication',label:'А13–А14 · Речевые ситуации',part:'A',start:13,end:14},
 {id:'a-reading',label:'А15–А18 · Чтение',part:'A',start:15,end:18},
 {id:'b-prepositions',label:'В1–В3 · Предлоги',part:'B',start:1,end:3},
 {id:'b-grammar',label:'В4–В8 · Грамматика и лексика',part:'B',start:4,end:8},
 {id:'b-extra',label:'В9–В18 · Лишнее слово',part:'B',start:9,end:18},
 {id:'b-transform',label:'В19 · Трансформация',part:'B',start:19,end:19},
 {id:'b-wordform',label:'В20–В22 · Словообразование',part:'B',start:20,end:22}
];
const sectionFilter={mode:'latest'};
function questionSection(question){
  const match=String(question?.id||'').trim().toUpperCase().match(/^([ABАВ])\s*0*(\d{1,2})$/);
  if(!match)return null;
  const letter=match[1]==='А'?'A':match[1]==='В'?'B':match[1];
  const number=Number(match[2]);
  return TASK_SECTIONS.find(b=>b.part===letter&&number>=b.start&&number<=b.end)||null;
}
function sectionDataForAttempt(attempt){
  if(!attempt||!Array.isArray(attempt.questionsSnapshot)||!attempt.questionResultsSnapshot)return [];
  const tally=new Map();
  for(const q of attempt.questionsSnapshot){
    const section=questionSection(q),outcome=attempt.questionResultsSnapshot[q.id];
    if(!section||!outcome||typeof outcome.correct!=='boolean')continue;
    const points=Number(q.points)>0?Number(q.points):(section.part==='A'?1:2);
    const current=tally.get(section.id)||{id:section.id,label:section.label,earned:0,max:0,correct:0,questions:0};
    current.max+=points;
    current.earned+=outcome.correct?points:0;
    current.correct+=outcome.correct?1:0;
    current.questions++;
    tally.set(section.id,current);
  }
  return [...tally.values()];
}
function sectionAnalysis(){
  const selected=progressRows().filter(r=>(progressFilter.student==='all'||r.studentId===progressFilter.student)&&(progressFilter.source==='all'||r.source===progressFilter.source));
  const attemptMap=new Map(completedAttempts().map(a=>[a.id,a]));
  const online=selected.filter(r=>!r.external).map(r=>attemptMap.get(r.id)).filter(Boolean);
  const excluded=selected.filter(r=>r.external).length;
  let relevant=online;
  if(sectionFilter.mode==='latest'){
    const last=new Map();
    for(const a of online){const prev=last.get(a.studentId);if(!prev||timestampValue(attemptMoment(a))>=timestampValue(attemptMoment(prev)))last.set(a.studentId,a)}
    relevant=[...last.values()];
  }
  const sums=new Map();
  for(const a of relevant){for(const row of sectionDataForAttempt(a)){
    const prev=sums.get(row.id)||{...row,earned:0,max:0,correct:0,questions:0};
    prev.earned+=row.earned;prev.max+=row.max;prev.correct+=row.correct;prev.questions+=row.questions;
    sums.set(row.id,prev);
  }}
  const data=TASK_SECTIONS.map(section=>sums.get(section.id)).filter(v=>v&&v.max>0);
  const subtitle=sectionFilter.mode==='latest'?'Последняя проверенная попытка каждого ученика':'Все проверенные попытки (включая пересдачи)';
  return `<section class="card" style="padding:22px;margin-bottom:22px">
    <div class="card-head"><div><h2>Результаты по разделам</h2><p>${subtitle}. Процент = набранные баллы / возможные баллы раздела.</p></div></div>
    <div class="form-grid" style="margin:14px 0"><label class="field"><span>Учитывать попытки</span><select id="sectionMode"><option value="latest" ${sectionFilter.mode==='latest'?'selected':''}>Только последние</option><option value="all" ${sectionFilter.mode==='all'?'selected':''}>Все попытки</option></select></label></div>
    ${data.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Раздел</th><th>Получено</th><th>Максимум</th><th>Выполнение</th></tr></thead><tbody>${data.map(row=>{const pct=Math.round(row.earned/row.max*100);return `<tr><td>${escapeAttr(row.label)}</td><td>${row.earned}</td><td>${row.max}</td><td style="min-width:190px"><strong>${pct}%</strong><div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div></td></tr>`}).join('')}</tbody></table></div>`:'<p class="empty">Для анализа разделов пока нет проверенных заданий с номерами А1–А18 и В1–В22. Общие баллы сохранены и отображаются выше.</p>'}
    <p style="font-size:13px;margin-top:12px;color:var(--muted,#64748b)">Учитываются только задания, для которых сохранён результат проверки. ${excluded?'Внешних результатов без разбивки: '+excluded+'. ':''}РТ / ЦТ / ЦЭ с одним общим баллом не распределяются по разделам автоматически. Для авторских тестов с другой нумерацией разбивка пока не рассчитывается.</p>
  </section>`;
}
function progressPanel(){
  const filtered=progressRows().filter(r=>(progressFilter.student==='all'||r.studentId===progressFilter.student)&&(progressFilter.source==='all'||r.source===progressFilter.source));
  const avg=filtered.length?Math.round(filtered.reduce((sum,r)=>sum+r.score,0)/filtered.length):null;
  const ids=progressFilter.student==='all'?[...new Set(filtered.map(r=>r.studentId))]:[progressFilter.student];
  const byStudent=ids.map(id=>{const a=filtered.filter(r=>r.studentId===id);return {id,name:state.students.find(s=>s.id===id)?.displayName||'Ученик',rows:a,first:a[0]?.score,last:a.at(-1)?.score}}).filter(x=>x.rows.length).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  const trend=byStudent.filter(x=>x.rows.length>=2);
  const svg=progressFilter.student==='all'
    ? `<div class="table-wrap"><table class="table"><thead><tr><th>Учащийся</th><th>Результатов</th><th>Первый</th><th>Последний</th><th>Изменение</th><th>Средний /100</th></tr></thead><tbody>${byStudent.map(x=>{const diff=x.last-x.first;const mean=Math.round(x.rows.reduce((sum,r)=>sum+r.score,0)/x.rows.length);return `<tr><td>${escapeAttr(x.name)}</td><td>${x.rows.length}</td><td>${x.first}</td><td><strong>${x.last}</strong></td><td>${x.rows.length<2?'—':diff>0?'+'+diff:diff}</td><td>${mean}</td></tr>`}).join('')}</tbody></table></div>`
    : progressChart(filtered);
  return `<section class="card" style="padding:22px;margin-bottom:22px">
    <div class="card-head"><div><h2>Динамика результатов</h2><p>Тесты на сайте и результаты РТ / ЦТ / ЦЭ, внесённые вручную</p></div><button class="primary" id="newExternalResult">+ Добавить результат РТ / ЦТ</button></div>
    <div class="form-grid" style="margin:18px 0;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
      <label class="field"><span>Учащийся</span><select id="progressStudent"><option value="all">Все учащиеся</option>${state.students.map(st=>`<option value="${escapeAttr(st.id)}" ${progressFilter.student===st.id?'selected':''}>${escapeAttr(st.displayName||st.login)}</option>`).join('')}</select></label>
      <label class="field"><span>Источник</span><select id="progressSource">${[['all','Все результаты'],['Сайт','Тесты на сайте'],['РТ','Репетиционное тестирование'],['ЦТ','Централизованное тестирование'],['ЦЭ','Централизованный экзамен']].map(([v,n])=>`<option value="${v}" ${progressFilter.source===v?'selected':''}>${n}</option>`).join('')}</select></label>
    </div>
    <div class="grid stats" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px"><div class="stat"><span>Всего результатов</span><strong>${filtered.length}</strong></div><div class="stat"><span>Средний тестовый балл</span><strong>${avg??'—'}</strong></div><div class="stat"><span>Учащихся с динамикой</span><strong>${trend.length}</strong></div></div>
    ${filtered.length?svg:'<p class="empty">Пока нет результатов по выбранным фильтрам.</p>'}
    <h3 style="margin:24px 0 10px">Все результаты по датам</h3><div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Ученик</th><th>Источник</th><th>Работа</th><th>Первичный</th><th>Тестовый</th><th>Отметка</th><th>Действия</th></tr></thead><tbody>${[...filtered].reverse().map(r=>`<tr><td>${escapeAttr(r.date||'—')}</td><td>${escapeAttr(state.students.find(st=>st.id===r.studentId)?.displayName||'Ученик')}</td><td>${escapeAttr(r.source)}</td><td>${escapeAttr(r.title)}</td><td>${r.primary===null?'—':`${r.primary} / ${r.maxPrimary??62}`}</td><td><strong>${r.score}/100</strong></td><td>${ceGrade(r.score)??'—'}/10</td><td>${r.external?`<button class="secondary" data-external-edit="${escapeAttr(r.id)}">Изменить</button> <button class="danger" data-external-delete="${escapeAttr(r.id)}">Удалить</button>`:'Автоматически'}</td></tr>`).join('')}</tbody></table></div>
  </section>`;
}
function progressChart(rows){
  if(!rows.length)return '';
  const ordered=[...rows].sort((a,b)=>a.date.localeCompare(b.date));
  const w=760,h=260,left=43,right=20,top=22,bottom=38,plotW=w-left-right,plotH=h-top-bottom;
  const x=i=>left+(ordered.length<2?plotW/2:i*plotW/(ordered.length-1));
  const y=score=>top+(100-score)*plotH/100;
  const line=ordered.map((r,i)=>`${x(i)},${y(r.score)}`).join(' ');
  return `<div style="overflow-x:auto"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="График тестовых баллов по датам" style="width:100%;max-width:850px;display:block;margin:auto">
   ${[0,25,50,75,100].map(v=>`<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" stroke="#dce3ed"/><text x="${left-9}" y="${y(v)+4}" font-size="12" text-anchor="end" fill="#65758e">${v}</text>`).join('')}
   <polyline points="${line}" fill="none" stroke="#3158d8" stroke-width="3" stroke-linejoin="round"/>${ordered.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.score)}" r="5" fill="${r.external?'#e58a3c':'#3158d8'}"><title>${escapeAttr(r.date)} · ${escapeAttr(r.source)}: ${r.score}/100</title></circle>`).join('')}
   <text x="${left}" y="${h-12}" fill="#65758e" font-size="12">${escapeAttr(ordered[0].date)}</text><text x="${w-right}" y="${h-12}" text-anchor="end" fill="#65758e" font-size="12">${escapeAttr(ordered.at(-1).date)}</text></svg><p style="text-align:center;font-size:13px">🔵 Тест на сайте &nbsp; 🟠 РТ / ЦТ / ЦЭ</p></div>`;
}
function bindProgressControls(){
  $('#progressStudent')?.addEventListener('change',e=>{progressFilter.student=e.target.value;render()});
  $('#progressSource')?.addEventListener('change',e=>{progressFilter.source=e.target.value;render()});
  $('#sectionMode')?.addEventListener('change',e=>{sectionFilter.mode=e.target.value;render()});
  $('#newExternalResult')?.addEventListener('click',()=>externalResultModal());
  document.querySelectorAll('[data-external-edit]').forEach(b=>b.addEventListener('click',()=>externalResultModal(b.dataset.externalEdit)));
  document.querySelectorAll('[data-external-delete]').forEach(b=>b.addEventListener('click',()=>deleteExternalResult(b.dataset.externalDelete)));
}
function externalResultModal(id=null){
  const row=state.externalResults.find(r=>r.id===id);
  modal(`<h2>${row?'Изменить':'Добавить'} результат РТ / ЦТ / ЦЭ</h2><p>Результат хранится отдельно от тестов сайта. Дата и тестовый балл обязательны.</p>
    <div class="form-grid"><label class="field"><span>Учащийся</span><select id="externalStudent">${state.students.map(st=>`<option value="${escapeAttr(st.id)}" ${row?.studentId===st.id||!row&&progressFilter.student===st.id?'selected':''}>${escapeAttr(st.displayName||st.login)}</option>`).join('')}</select></label>
    <label class="field"><span>Тип тестирования</span><select id="externalType">${['РТ','ЦТ','ЦЭ'].map(type=>`<option ${row?.examType===type?'selected':''}>${type}</option>`).join('')}</select></label>
    <label class="field"><span>Дата тестирования</span><input type="date" id="externalDate" value="${escapeAttr(row?.examDate||new Date().toISOString().slice(0,10))}"></label>
    <label class="field"><span>Название / этап</span><input id="externalTitle" value="${escapeAttr(row?.title||'')}" placeholder="РТ. Этап 1"></label>
    <label class="field"><span>Тестовый балл (0–100)</span><input type="number" id="externalScore" min="0" max="100" step="1" value="${row?.testScore??''}" required></label>
    <label class="field"><span>Первичный (если известен)</span><input type="number" id="externalPrimary" min="0" max="62" step="1" value="${row?.primaryScore??''}" placeholder="Необязательно"></label></div>
    <p id="externalGradePreview">Отметка: ${ceGrade(row?.testScore)??'—'}/10</p>
    <div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="externalSave">Сохранить результат</button></div>`);
  $('#externalScore').addEventListener('input',()=>$('#externalGradePreview').textContent=`Отметка: ${ceGrade($('#externalScore').value)??'—'}/10`);
  $('#externalSave').addEventListener('click',async()=>{
    const scoreText=$('#externalScore').value.trim(),score=Number(scoreText),primaryText=$('#externalPrimary').value.trim();
    const primary=primaryText===''?null:Number(primaryText),studentId=$('#externalStudent').value,examDate=$('#externalDate').value;
    if(!studentId||!examDate||!/^\d{4}-\d{2}-\d{2}$/.test(examDate)||scoreText===''||!Number.isInteger(score)||score<0||score>100||primary!==null&&(!Number.isInteger(primary)||primary<0||primary>62))return toast('Проверьте дату и баллы: тестовый 0–100, первичный 0–62');
    const payload={teacherId:state.user.uid,studentId,examType:$('#externalType').value,examDate,title:$('#externalTitle').value.trim(),testScore:score,primaryScore:primary,maxPrimary:primary===null?null:62,grade10:ceGrade(score),updatedAt:serverTimestamp()};
    $('#externalSave').disabled=true;
    try {if(id)await updateDoc(doc(db,'externalResults',id),payload);else await addDoc(collection(db,'externalResults'),{...payload,createdAt:serverTimestamp()});await loadAccountData();closeModal();render();toast('Результат сохранён')}
    catch(error){console.error(error);$('#externalSave').disabled=false;toast('Не удалось сохранить результат. Проверьте правила Firestore.')}
  });
}
function deleteExternalResult(id){
  const row=state.externalResults.find(r=>r.id===id);if(!row)return;
  modal(`<h2>Удалить результат?</h2><p>${escapeAttr(row.examType)} · ${escapeAttr(row.examDate)} · ${row.testScore}/100. Это не затронет попытки на сайте.</p><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="danger" id="externalDeleteConfirm">Удалить</button></div>`);
  $('#externalDeleteConfirm').onclick=async()=>{try{await deleteDoc(doc(db,'externalResults',id));await loadAccountData();closeModal();render();toast('Результат удалён')}catch(error){console.error(error);toast('Не удалось удалить результат')}};
}
function results(){
  const studentName=id=>state.students.find(s=>s.id===id)?.displayName||'Ученик';
  const groups=groupedAttempts(completedAttempts());
  return `${progressPanel()}${sectionAnalysis()}<div class="section-title"><div><h2>Работы учащихся</h2><p>Все попытки одного теста объединены. Раскройте историю, чтобы проверить доработку или открыть прежний результат.</p></div></div>${listToolbar('results')}<div class="card table-wrap filtered-list" style="margin-top:16px">${groups.length?`<table class="table"><thead><tr><th>Ученик</th><th>Работа и история</th><th>Попытки</th><th>Тестовые баллы</th><th>Состояние</th><th>Быстрое действие</th></tr></thead><tbody>${groups.map(g=>`<tr data-search="${escapeAttr([studentName(g.studentId),g.title].join(' '))}" data-name="${escapeAttr(studentName(g.studentId))}" data-score="${Number(g.lastScored?.testScore)||0}" data-time="${g.lastTime}" data-test="${escapeAttr(g.title)}"><td><strong>${escapeAttr(studentName(g.studentId))}</strong></td><td><strong>${escapeAttr(g.title)}</strong>${teacherAttemptHistory(g)}</td><td>${g.items.length}${g.revisions.length?` · доработок: ${g.revisions.length}`:''}</td><td class="score">${groupProgress(g)}</td><td>${groupStatus(g)}</td><td><button class="secondary" data-review-attempt="${escapeAttr(g.latest.id)}">Открыть последнюю</button></td></tr>`).join('')}</tbody></table><p id="listEmpty" class="empty" hidden>По вашему запросу результаты не найдены.</p>`:'<div class="empty"><strong>Результатов пока нет</strong>После первой отправленной работы она появится здесь.</div>'}</div>`;
}

function unreadMessagesCount(){return state.messages.filter(m=>m.senderId!==state.user?.uid&&(state.user?.role==='teacher'?!m.readByTeacher:!m.readByStudent)).length}
function messageTime(message){const date=message.createdAt?.toDate?.();return date?date.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'только что'}
function messagesView(){const teacher=state.user.role==='teacher';if(teacher&&!state.messageStudentId&&state.students.length)state.messageStudentId=state.students[0].id;const studentId=teacher?state.messageStudentId:state.user.uid,thread=state.messages.filter(m=>m.studentId===studentId).sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0)),student=state.students.find(s=>s.id===studentId),studentAttempts=state.attempts.filter(a=>a.studentId===studentId);return `<div class="messages-layout">${teacher?`<aside class="card conversation-list"><h3>Ученики</h3>${state.students.map(s=>{const count=state.messages.filter(m=>m.studentId===s.id&&m.senderRole==='student'&&!m.readByTeacher).length;return `<button data-message-student="${escapeAttr(s.id)}" class="conversation-person ${s.id===studentId?'active':''}"><span>${escapeAttr(s.displayName||s.login)}</span>${count?`<b>${count}</b>`:''}</button>`}).join('')||'<div class="empty">Нет учеников</div>'}</aside>`:''}<section class="card chat-card"><div class="card-head"><div><h3>${teacher?escapeAttr(student?.displayName||'Выберите ученика'):'Учитель'}</h3><p>${teacher?'Личная переписка с учеником':'Здесь можно задать вопрос учителю'}</p></div></div><div class="message-thread">${thread.length?thread.map(m=>`<article class="message-bubble ${m.senderId===state.user.uid?'mine':''}">${m.attemptLabel?`<small class="message-test">${escapeAttr(m.attemptLabel)}</small>`:''}<p>${escapeAttr(m.text)}</p><time>${messageTime(m)}</time></article>`).join(''):'<div class="empty"><strong>Сообщений пока нет</strong>Начните диалог.</div>'}</div>${studentId?`<div class="message-compose">${studentAttempts.length?`<select id="messageAttempt"><option value="">Без привязки к тесту</option>${studentAttempts.map(a=>`<option value="${escapeAttr(a.id)}">${escapeAttr(`${a.year||'—'} · Вариант ${a.variantNumber||'—'}`)}</option>`).join('')}</select>`:''}<textarea id="messageText" rows="3" placeholder="Напишите сообщение…"></textarea><button class="primary" id="sendMessage">Отправить</button></div>`:''}</section></div>`}
async function sendMessage(){const textValue=$('#messageText')?.value.trim();if(!textValue)return toast('Введите сообщение');const teacher=state.user.role==='teacher',studentId=teacher?state.messageStudentId:state.user.uid,teacherId=teacher?state.user.uid:state.user.createdBy,attemptId=$('#messageAttempt')?.value||'',attempt=state.attempts.find(a=>a.id===attemptId),button=$('#sendMessage');button.disabled=true;try{await addDoc(collection(db,'messages'),{teacherId,studentId,senderId:state.user.uid,senderRole:state.user.role,text:textValue,attemptId,attemptLabel:attemptId?`${attempt?.year||'—'} · Вариант ${attempt?.variantNumber||'—'}`:'',readByTeacher:teacher,readByStudent:!teacher,createdAt:serverTimestamp()});await loadMessages();render();toast('Сообщение отправлено')}catch(error){console.error(error);button.disabled=false;toast('Не удалось отправить сообщение')}}
async function loadMessages(){if(!state.user)return;try{const field=state.user.role==='teacher'?'teacherId':'studentId',snapshot=await getDocs(query(collection(db,'messages'),where(field,'==',state.user.uid)));state.messages=snapshot.docs.map(d=>({id:d.id,...d.data()}))}catch(error){console.warn('Сообщения пока недоступны. Вход и тесты продолжат работать.',error);state.messages=[]}}
async function markConversationRead(){const teacher=state.user.role==='teacher',studentId=teacher?state.messageStudentId:state.user.uid,pending=state.messages.filter(m=>m.studentId===studentId&&m.senderId!==state.user.uid&&(teacher?!m.readByTeacher:!m.readByStudent));if(!pending.length)return;try{for(const message of pending)await updateDoc(doc(db,'messages',message.id),teacher?{readByTeacher:true}:{readByStudent:true});pending.forEach(message=>{if(teacher)message.readByTeacher=true;else message.readByStudent=true})}catch(error){console.error(error)}}

function testForAttempt(attempt){return builtInById(attempt.testId)||state.customTests.find(v=>v.id===attempt.testId)||(TEST_DATA.variants.find(v=>v.year===attempt.year&&v.number===attempt.variantNumber)?effectiveBuiltInTest(TEST_DATA.variants.find(v=>v.year===attempt.year&&v.number===attempt.variantNumber)):null)}
function correctAnswerFor(attempt,questionId){const test=testForAttempt(attempt),question=test?.questions.find(q=>q.id===questionId),values=question?.accepted||(question?.answer!==undefined?[question.answer]:[])||(test?.gradingAnswers?.[questionId]||[]);const resolved=values.length?values:(test?.gradingAnswers?.[questionId]||[]);return resolved.filter(value=>value!==undefined&&value!==null).join(' / ')||'Ключ не найден'}
function questionForAttempt(attempt,questionId){return attemptQuestions(attempt).find(q=>q.id===questionId)||{id:questionId,prompt:'Задание'} }
function errorRows(attempt){return Object.entries(attempt.questionResultsSnapshot||{}).filter(([,result])=>!result.correct).map(([questionId,result])=>({attempt,questionId,question:questionForAttempt(attempt,questionId),studentAnswer:result.studentAnswer||'Нет ответа',correctAnswer:result.correctAnswer||correctAnswerFor(attempt,questionId),teacherComment:result.teacherComment||''}))}
function exercisePreview(q){const context=q.context||[q.before,q.after].filter(Boolean).join(' ... ')||'';const options=(q.options||[]).length?`<div class="review-options">${q.options.map(option=>`<span>${escapeAttr(option)}</span>`).join('')}</div>`:'';return `<div class="error-exercise"><strong>${escapeAttr(q.id)} · ${escapeAttr(q.prompt||'Задание')}</strong>${context?`<div class="context">${escapeAttr(context)}</div>`:''}${options}</div>`}
function errorsTable(rows){return rows.length?`<div class="error-review-list">${rows.map(row=>`<article class="error-review-card"><p class="error-test-label">${row.attempt.year||'—'} · Вариант ${row.attempt.variantNumber||'—'}</p>${exercisePreview(row.question)}<div class="answer-comparison"><div class="wrong-answer"><small>Ответ ученика</small><strong>${escapeAttr(row.studentAnswer)}</strong></div><div class="right-answer"><small>Правильный ответ</small><strong>${escapeAttr(row.correctAnswer)}</strong></div></div>${row.teacherComment?`<div class="teacher-note"><strong>Комментарий учителя:</strong> ${escapeAttr(row.teacherComment)}</div>`:''}</article>`).join('')}</div>`:'<div class="empty"><strong>Ошибок нет</strong>В этой работе все ответы правильные.</div>'}
function showErrorDetail(attemptId,questionId){const attempt=state.attempts.find(a=>a.id===attemptId);if(!attempt||attempt.reviewStatus!=='approved')return toast('Разбор этой работы пока недоступен');const rows=errorRows(attempt),index=rows.findIndex(row=>row.questionId===questionId);if(index<0)return toast('Ошибка не найдена');const row=rows[index],prev=rows[index-1],next=rows[index+1];closeModal();modal(`<div class="card-head"><div><p class="eyebrow">Ошибка ${index+1} из ${rows.length}</p><h2>${escapeAttr(row.questionId)} · разбор задания</h2></div><button class="ghost" data-close>Закрыть</button></div>${attempt.teacherComment?`<div class="teacher-note"><strong>Общий комментарий учителя</strong><br>${escapeAttr(attempt.teacherComment)}</div>`:''}${errorsTable([row])}<div class="error-detail-nav"><button class="ghost" id="previousError" ${prev?'':'disabled'}>← Предыдущая</button><button class="primary" id="nextError" ${next?'':'disabled'}>Следующая →</button></div>`,true);if(prev)$('#previousError').onclick=()=>showErrorDetail(attemptId,prev.questionId);if(next)$('#nextError').onclick=()=>showErrorDetail(attemptId,next.questionId)}
function showAttemptErrors(attemptId){const attempt=state.attempts.find(item=>item.id===attemptId);if(!attempt)return toast('Работа не найдена');if(state.user.role==='student'&&attempt.reviewStatus!=='approved')return toast('Разбор откроется после проверки учителем');const student=state.students.find(item=>item.id===attempt.studentId);modal(`<div class="card-head"><div><p class="eyebrow">Разбор работы</p><h2>${escapeAttr(student?.displayName||state.user.name||'Ученик')}</h2><p>${attempt.year||'—'} · Вариант ${attempt.variantNumber||'—'}</p></div><button class="ghost" data-close>Закрыть</button></div>${attempt.teacherComment?`<div class="teacher-note"><strong>Комментарий учителя</strong><br>${escapeAttr(attempt.teacherComment)}</div>`:''}${errorsTable(errorRows(attempt))}`,true)}
function showStudentErrors(studentId){const student=state.students.find(item=>item.id===studentId);const attempts=state.attempts.filter(item=>item.studentId===studentId&&hasScore(item));const rows=attempts.flatMap(errorRows);modal(`<div class="card-head"><div><p class="eyebrow">Все сохранённые ошибки</p><h2>${escapeAttr(student?.displayName||'Ученик')}</h2><p>${attempts.length} завершённых работ · ${rows.length} ошибок</p></div><button class="ghost" data-close>Закрыть</button></div>${errorsTable(rows)}`,true)}
function showStudentAttempts(studentId){
  const student=state.students.find(item=>item.id===studentId);
  const groups=groupedAttempts(completedAttempts(studentId));
  const count=groups.reduce((sum,g)=>sum+g.items.length,0);
  modal(`<div class="card-head"><div><p class="eyebrow">История работ</p><h2>${escapeAttr(student?.displayName||'Ученик')}</h2><p>${groups.length} тестов · ${count} завершённых попыток</p></div><button class="ghost" data-close>Закрыть</button></div>${groups.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Работа</th><th>Попытки</th><th>Тестовые баллы</th><th>Состояние</th></tr></thead><tbody>${groups.map(g=>`<tr><td><strong>${escapeAttr(g.title)}</strong>${teacherAttemptHistory(g)}</td><td>${g.items.length}</td><td class="score">${groupProgress(g)}</td><td>${groupStatus(g)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><strong>Завершённых попыток пока нет</strong></div>'}`,true);
  document.querySelectorAll('[data-review-attempt]').forEach(b=>b.onclick=()=>reviewAttempt(b.dataset.reviewAttempt));
  document.querySelectorAll('[data-delete-attempt]').forEach(b=>b.onclick=()=>confirmDeleteAttempt(b.dataset.deleteAttempt));
}
function attemptQuestions(attempt){const stored=attempt.questionsSnapshot||[];if(stored.some(q=>q.context||q.prompt||q.before))return stored;return testForAttempt(attempt)?.questions||stored}
function reviewQuestionMarkup(attempt,q){const result=attempt.questionResultsSnapshot?.[q.id]||{},answer=result.studentAnswer||attempt.answersSnapshot?.[q.id]||'Нет ответа';return `<section class="review-item ${result.correct?'':'wrong'}"><div class="review-item-head"><strong>${escapeAttr(q.id)} · ${escapeAttr(q.prompt||q.block||'Задание')}</strong><span class="status ${result.correct?'done':'revision'}">${result.correct?'Верно':'Ошибка'}</span></div>${q.context?`<div class="context review-context">${escapeAttr(q.context)}</div>`:''}<div class="review-answer"><div><small>Ответ ученика</small><strong>${escapeAttr(answer)}</strong></div><div><small>Правильный ответ</small><strong>${escapeAttr(result.correctAnswer||correctAnswerFor(attempt,q.id))}</strong></div></div><label class="field"><span>Комментарий к заданию</span><textarea class="review-comment" data-comment-id="${escapeAttr(q.id)}" placeholder="Объясните ошибку или подскажите, что повторить…">${escapeAttr(result.teacherComment||'')}</textarea></label></section>`}
function reviewAttempt(attemptId){const attempt=state.attempts.find(a=>a.id===attemptId);if(!attempt)return toast('Работа не найдена');const student=state.students.find(s=>s.id===attempt.studentId),questions=attemptQuestions(attempt);modal(`<div class="card-head"><div><p class="eyebrow">Проверка работы</p><h2>${escapeAttr(student?.displayName||'Ученик')}</h2><p>${escapeAttr(attempt.testTitle||`${attempt.year||'—'} · Вариант ${attempt.variantNumber||'—'}`)} · ${escapeAttr(attemptLabel(attempt))} · ${attemptDate(attempt)} · ${attempt.primaryScore??'—'} / ${attempt.maxPrimary??62} первичных · ${attempt.testScore??'—'} / 100 тестовых · отметка ${gradeDisplay(attempt)}</p></div><button class="ghost" data-close>Закрыть</button></div><div class="field"><label>Общий комментарий ученику</label><textarea id="generalReviewComment" class="review-comment" placeholder="Общий итог, рекомендации и темы для повторения…">${escapeAttr(attempt.teacherComment||'')}</textarea></div><div class="review-list">${questions.map(q=>reviewQuestionMarkup(attempt,q)).join('')}</div><div class="review-actions"><button class="ghost" id="saveReviewDraft">Сохранить комментарии</button><button class="danger" id="requestRevision">На доработку</button><button class="primary" id="approveAttempt">Проверено</button></div>`,true);$('#saveReviewDraft').onclick=()=>saveAttemptReview(attempt,'pending');$('#requestRevision').onclick=()=>saveAttemptReview(attempt,'revision_requested');$('#approveAttempt').onclick=()=>saveAttemptReview(attempt,'approved')}
async function saveAttemptReview(attempt,reviewStatus){const comments=Object.fromEntries([...document.querySelectorAll('[data-comment-id]')].map(el=>[el.dataset.commentId,el.value.trim()])),results={...attempt.questionResultsSnapshot};Object.keys(results).forEach(id=>results[id]={...results[id],teacherComment:comments[id]||''});const status=reviewStatus==='revision_requested'?'returned':'scored';try{await updateDoc(doc(db,'attempts',attempt.id),{status,reviewStatus,manualReviewStatus:reviewStatus,teacherComment:$('#generalReviewComment').value.trim(),questionResultsSnapshot:results,reviewedAt:reviewStatus==='approved'?serverTimestamp():null,returnedAt:reviewStatus==='revision_requested'?serverTimestamp():null});await loadAccountData();closeModal();render();toast(reviewStatus==='approved'?'Работа проверена. Ошибки открыты ученику.':reviewStatus==='revision_requested'?'Работа отправлена на доработку.':'Комментарии сохранены.')}catch(error){console.error(error);toast('Не удалось сохранить проверку. Проверьте правила Firestore.')}}
function confirmDeleteAttempt(attemptId){const attempt=state.attempts.find(a=>a.id===attemptId);if(!attempt)return toast('Результат не найден');const student=state.students.find(s=>s.id===attempt.studentId);modal(`<h2>Удалить результат?</h2><p>Работа <strong>${escapeAttr(student?.displayName||'ученика')}</strong> — ${attempt.year||'—'}, вариант ${attempt.variantNumber||'—'} — будет удалена без возможности восстановления.</p><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="danger" id="deleteAttemptConfirm">Удалить результат</button></div>`);$('#deleteAttemptConfirm').onclick=async()=>{const button=$('#deleteAttemptConfirm');button.disabled=true;button.textContent='Удаление…';try{await deleteDoc(doc(db,'attempts',attemptId));await loadAccountData();closeModal();render();toast('Результат ученика удалён')}catch(error){console.error(error);button.disabled=false;button.textContent='Удалить результат';toast('Не удалось удалить результат. Проверьте правила Firestore.')}}}
function resumeAttempt(attemptId){const attempt=state.attempts.find(a=>a.id===attemptId);if(!attempt||attempt.reviewStatus!=='revision_requested')return toast('Работа недоступна для доработки');const notes=Object.entries(attempt.questionResultsSnapshot||{}).filter(([,r])=>r.teacherComment).map(([id,r])=>`<div class="teacher-note"><strong>${escapeAttr(id)}:</strong> ${escapeAttr(r.teacherComment)}</div>`).join('');modal(`<h2>Работа возвращена на доработку</h2>${attempt.teacherComment?`<div class="teacher-note"><strong>Комментарий учителя</strong><br>${escapeAttr(attempt.teacherComment)}</div>`:''}${notes?`<div class="review-list" style="margin-top:12px">${notes}</div>`:''}<p>Ваши прежние ответы сохранены. После исправлений отправьте работу повторно.</p><div class="modal-actions"><button class="ghost" data-close>Позже</button><button class="primary" id="startRevision">Открыть работу</button></div>`);$('#startRevision').onclick=()=>startRevisionAttempt(attempt)}
async function startRevisionAttempt(attempt){let variant=testForAttempt(attempt);if(!variant)return toast('Исходный тест не найден');if(variant.kind==='custom'||variant.kind==='built-in'){const keys=variant.gradingAnswers||{};variant={...variant,questions:variant.questions.map(q=>({...q,accepted:keys[q.id]||q.accepted||[]}))}}try{const number=Math.max(attemptNumber(attempt)+1,nextAttemptNumber(state.user.uid,attempt.testId)),rootAttemptId=attempt.rootAttemptId||attempt.id;const created=await addDoc(collection(db,'attempts'),{studentId:state.user.uid,teacherId:state.user.createdBy,testId:attempt.testId,year:variant.year||attempt.year||'Авторский',variantNumber:variant.number||variant.title||attempt.variantNumber,testTitle:variant.title||attempt.testTitle||'',status:'in-progress',reviewStatus:'draft',attemptNumber:number,revisionOf:attempt.id,rootAttemptId,questionsSnapshot:variant.questions.map(q=>questionWithoutKey(q)),answersSnapshot:{...(attempt.answersSnapshot||{})},startedAt:serverTimestamp(),createdAt:serverTimestamp()});closeModal();state.test=variant;state.index=0;state.answers={...(attempt.answersSnapshot||{})};state.revisionErrors=new Set(Object.entries(attempt.questionResultsSnapshot||{}).filter(([,r])=>!r.correct).map(([id])=>id));state.revisionComments=Object.fromEntries(Object.entries(attempt.questionResultsSnapshot||{}).map(([id,r])=>[id,r.teacherComment||'']));state.optionOrder=createOptionOrder(variant);state.seconds=(variant.timeLimit||120)*60;state.attemptId=created.id;state.view='test';render()}catch(error){console.error(error);toast('Не удалось создать новую попытку для доработки')}}

function shuffledOptions(options){const result=[...(options||[])];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
function createOptionOrder(variant){return Object.fromEntries(variant.questions.filter(q=>q.type==='choice'||q.type==='inline-choice').map(q=>[q.id,shuffledOptions(q.options)]))}
function optionsFor(q){return state.optionOrder[q.id]||q.options||[]}
async function launchTest(variant){state.test=variant;state.index=0;state.answers={};state.revisionErrors=new Set();state.revisionComments={};state.optionOrder=createOptionOrder(variant);state.seconds=(variant.timeLimit||120)*60;state.attemptId=null;if(state.user?.role==='student'){try{const number=nextAttemptNumber(state.user.uid,variant.id),attempt=await addDoc(collection(db,"attempts"),{studentId:state.user.uid,teacherId:state.user.createdBy,testId:variant.id,year:variant.year||'Авторский',variantNumber:variant.number||variant.title,testTitle:variant.title||'',status:"in-progress",reviewStatus:"draft",attemptNumber:number,questionsSnapshot:variant.questions.map(q=>questionWithoutKey(q)),answersSnapshot:{},startedAt:serverTimestamp(),createdAt:serverTimestamp()});state.attemptId=attempt.id}catch(error){console.error(error);toast('Не удалось начать тест. Проверьте профиль ученика и правила Firestore.');return}}state.view='test';render()}
async function startTest(year,number){const base=TEST_DATA.variants.find(v=>v.year===year&&v.number===number&&v.status==='ready'),variant=base?effectiveBuiltInTest(base):null;if(!variant){toast('Этот вариант ещё переносится в интерактивный формат');return}await launchTest(variant)}
async function startCustomTest(testId){let variant=state.customTests.find(v=>v.id===testId);if(!variant)return toast('Тест не найден');if(state.user.role!=='teacher'&&!studentCanAccessCustomTest(variant))return toast('Доступ к тесту закрыт');if(state.user.role==='teacher'){try{const keySnap=await getDoc(doc(db,"answerKeys",testId)),keys=keySnap.data()?.answers||{};variant={...variant,questions:variant.questions.map(q=>({...q,accepted:keys[q.id]||[]}))}}catch(error){console.error(error)}}else{const keys=variant.gradingAnswers||{};variant={...variant,questions:variant.questions.map(q=>({...q,accepted:keys[q.id]||[]}))}}await launchTest(variant)}
function renderTest(){const q=state.test.questions[state.index];const pdf=`${state.test.sourceUrl}#page=${state.test.pageStart}&view=FitH`;app.innerHTML=shell(`<div class="source-test-layout"><section class="source-panel card"><div class="card-head"><div><h3>Оригинальный сборник · страницы ${state.test.pages}</h3><p>Найдите задание ${q.id} и внесите ответ справа.</p></div><a class="secondary" href="${pdf}" target="_blank" rel="noopener">Открыть отдельно ↗</a></div><object class="source-pdf" data="${pdf}" type="application/pdf"><div class="pdf-fallback"><p>Встроенный просмотр PDF недоступен в этом браузере.</p><a class="primary" href="${pdf}" target="_blank" rel="noopener">Открыть сборник</a></div></object></section><aside class="answer-panel"><div class="card question-card"><div class="card-head"><span class="question-id">${q.id}</span><span class="status">${q.block}</span></div><h2>${q.prompt}</h2>${questionBody(q)}<div class="test-nav"><button class="ghost" id="prev" ${state.index===0?'disabled':''}>← Назад</button><button class="primary" id="next">${state.index===state.test.questions.length-1?'Завершить':'Далее →'}</button></div></div><div class="card answer-map"><div class="card-head"><h3>Бланк ответов</h3><span class="timer" id="timer">120:00</span></div><div class="q-grid">${state.test.questions.map((x,i)=>`<button class="q-btn ${isQuestionAnswered(x)?'answered':''} ${i===state.index?'current':''}" data-q="${i}">${x.id}</button>`).join('')}</div><div class="progress"><i style="width:${Math.round(answeredTaskCount()/totalTaskCount()*100)}%"></i></div><p class="autosave-note">Заполнено ${answeredTaskCount()} из ${totalTaskCount()}. Ответы сохраняются во время работы.</p></div></aside></div>`,'Тестирование',`${state.test.year} · Вариант ${state.test.number}`);bindCommon();bindQuestionInputs(q);document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{saveText(q);state.index=+b.dataset.q;renderTest()});$('#prev').onclick=()=>{saveText(q);if(state.index>0)state.index--;renderTest()};$('#next').onclick=()=>{saveText(q);if(state.index<state.test.questions.length-1){state.index++;renderTest()}else confirmFinish()};startTimer()}
function questionBody(q){if(q.type==='choice')return `<div class="context">${q.context}</div><div class="options">${optionsFor(q).map((o,i)=>`<button class="option ${state.answers[q.id]===o?'selected':''}" data-answer="${escapeAttr(o)}"><b>${String.fromCharCode(65+i)}</b>${o}</button>`).join('')}</div>`;if(q.type==='inline-choice')return `<div class="inline-task">${q.before}<select class="inline-select" id="inlineSelect"><option value="">выберите…</option>${optionsFor(q).map(o=>`<option ${state.answers[q.id]===o?'selected':''}>${o}</option>`).join('')}</select>${q.after}</div>`;if(q.type==='group-input')return `<div class="group-tasks">${q.items.map((item,i)=>`<div class="group-row"><b>${i+1}.</b><span>${item.before}<input class="inline-input" data-item="${item.id}" value="${escapeAttr(state.answers[item.id]||'')}" autocomplete="off" aria-label="Ответ ${item.id}">${item.after}</span></div>`).join('')}</div>`;return `<div class="context">${q.context}</div><input class="answer-input" id="textAnswer" value="${escapeAttr(state.answers[q.id]||'')}" placeholder="Введите ответ" autocomplete="off">`}
function bindQuestionInputs(q){document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{state.answers[q.id]=b.dataset.answer;persistProgress();renderTest()});$('#inlineSelect')?.addEventListener('change',e=>{state.answers[q.id]=e.target.value;persistProgress();renderTest()});$('#textAnswer')?.addEventListener('input',e=>{state.answers[q.id]=e.target.value;persistProgress()});document.querySelectorAll('[data-item]').forEach(i=>i.addEventListener('input',e=>{state.answers[e.target.dataset.item]=e.target.value;persistProgress()}))}
function totalTaskCount(){return state.test.questions.reduce((n,q)=>n+(q.items?.length||1),0)}
function answeredTaskCount(){return state.test.questions.reduce((n,q)=>n+(q.items?q.items.filter(i=>state.answers[i.id]).length:(state.answers[q.id]?1:0)),0)}
function isQuestionAnswered(q){return q.items?q.items.every(i=>state.answers[i.id]):Boolean(state.answers[q.id])}
function saveText(q){if(q.type==='input'&&$('#textAnswer'))state.answers[q.id]=$('#textAnswer').value;persistProgress()}
function persistProgress(){if(!state.attemptId||state.user?.role!=='student')return;clearTimeout(state.saveTimer);state.saveTimer=setTimeout(async()=>{try{await updateDoc(doc(db,"attempts",state.attemptId),{answersSnapshot:{...state.answers},lastSavedAt:serverTimestamp()})}catch(error){console.error(error);toast('Не удалось сохранить ответы в облаке')}},450)}
function startTimer(){clearInterval(state.timer);const paint=()=>{const el=$('#timer');if(el)el.textContent=`${String(Math.floor(state.seconds/60)).padStart(2,'0')}:${String(state.seconds%60).padStart(2,'0')}`};paint();state.timer=setInterval(()=>{state.seconds--;paint();if(state.seconds<=0){clearInterval(state.timer);finishTest()}},1000)}
function confirmFinish(){modal(`<h2>Завершить тест?</h2><p>Вы ответили на ${answeredTaskCount()} из ${totalTaskCount()} заданий. После отправки изменить ответы нельзя.</p><div class="modal-actions"><button class="ghost" data-close>Вернуться</button><button class="primary" id="finish">Отправить ответы</button></div>`);$('#finish').onclick=finishTest}
function normalize(v){return String(v||'').trim().toLowerCase().replace(/[’‘`]/g,"'").replace(/[–—−]/g,'-').replace(/\s+/g,' ')}
function calculateAttemptResult(test,answers){let primary=0,correct=0;const results={};for(const q of test.questions){const accepted=q.accepted||(q.answer!==undefined?[q.answer]:[]),ok=accepted.some(a=>normalize(a)===normalize(answers[q.id])),points=ok?(q.points||(q.section==='A'?1:2)):0;primary+=points;if(ok)correct++;results[q.id]={correct:ok,points,studentAnswer:answers[q.id]||'',correctAnswer:accepted.join(' / '),teacherComment:''}}const max=test.questions.reduce((sum,q)=>sum+(q.points||(q.section==='A'?1:2)),0),percent=max?Math.round(primary/max*100):0;return {primary,max,correct,total:test.questions.length,percent,testScore:max===62?scale[primary]:percent,results}}
async function finishTest(){clearInterval(state.timer);clearTimeout(state.saveTimer);closeModal();const scored=calculateAttemptResult(state.test,state.answers);if(state.user.role==='teacher'){state.result=scored;state.view='result';render();return}if(!state.attemptId){toast('Попытка не была создана');state.view='student-home';render();return}modal('<h2>Отправляем работу…</h2><p>Баллы появятся сразу, а ошибки — после проверки учителем.</p>');try{await updateDoc(doc(db,"attempts",state.attemptId),{answersSnapshot:{...state.answers},status:"scored",reviewStatus:"pending",submittedAt:serverTimestamp(),lastSavedAt:serverTimestamp(),primaryScore:scored.primary,testScore:scored.testScore,grade10:scored.max===62?ceGrade(scored.testScore):null,correctCount:scored.correct,maxPrimary:scored.max,questionResultsSnapshot:scored.results,manualReviewStatus:"pending"});sendEmailNotification({studentName:state.user.name,testLabel:state.test.kind==='custom'?state.test.title:`${state.test.year} · Вариант ${state.test.number}`,testScore:scored.testScore,primaryScore:scored.primary,maxPrimary:scored.max});state.result={...scored,pendingReview:true};state.attemptId=null;await loadAccountData();closeModal();state.view='result';render()}catch(error){console.error(error);closeModal();toast('Не удалось отправить работу. Проверьте правила Firestore.')}}
function sendEmailNotification(payload){const url=window.EMAIL_NOTIFICATION_URL;if(!url)return;fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}).catch(error=>console.error('Email notification failed',error))}
function renderResult(){const r=state.result,custom=state.test?.kind==='custom';app.innerHTML=shell(`<div class="card" style="max-width:760px;margin:20px auto;text-align:center"><p class="eyebrow">Работа завершена</p><h2>Результат сохранён</h2><div class="result-ring" style="--score:${r.percent}%"><div><strong>${r.testScore??r.percent}</strong><span>из 100</span></div></div><div class="grid result-stats"><div class="stat"><span>Первичный балл</span><strong>${r.primary} / ${r.max}</strong></div><div class="stat"><span>Тестовый балл</span><strong>${r.testScore??r.percent} / 100</strong></div><div class="stat"><span>Отметка</span><strong>${r.max===62?(ceGrade(r.testScore)??"—")+" / 10":"—"}</strong></div><div class="stat"><span>Правильных</span><strong>${r.correct} / ${r.total}</strong></div><div class="stat"><span>Время</span><strong>${(state.test.timeLimit||120)-Math.floor(state.seconds/60)} мин</strong></div></div><p>Правильные ответы будут доступны по настройке учителя.</p><div class="hero-actions" style="justify-content:center"><button class="primary" data-view="${state.user.role==='teacher'?'results':'student-results'}">К результатам</button><button class="ghost" ${custom?`data-custom-test="${escapeAttr(state.test.id)}"`:`onclick="startTest(state.test.year,state.test.number)"`}>Повторить тест</button></div></div>`,'Результат',custom?state.test.title:`${state.test.year} · Вариант ${state.test.number}`);bindCommon()}

function sourceModal(variant){const meta=TEST_DATA.years.find(y=>y.year===variant.year);modal(`<h2>${variant.year} · ${variant.title}</h2><p>Источник <strong>${meta.source}</strong> добавлен в каталог. Оригинальная структура: ${variant.structure}, всего ${variant.questionCount} заданий.</p><p>Этот вариант ожидает точного переноса текста и ручной сверки ключей. До завершения проверки ученикам он не назначается.</p><div class="modal-actions"><button class="primary" data-close>Понятно</button></div>`)}

function createStudentModal(){modal(`<h2>Создать аккаунт ученика</h2><p>Ученик войдёт в свой кабинет по логину и паролю, которые вы ему сообщите.</p><div class="form-grid"><div class="field"><label>Имя и фамилия</label><input id="studentName" placeholder="Марта Коваль" required></div><div class="field"><label>Группа</label><select id="studentGroup"><option>11 класс</option><option>10 класс</option><option>Без группы</option></select></div><div class="field"><label>Логин</label><input id="studentLogin" placeholder="marta" autocomplete="off" required></div><div class="field"><label>Пароль</label><input id="studentPassword" type="password" placeholder="Не менее 8 символов" autocomplete="new-password" required></div></div><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="makeStudent">Создать аккаунт</button></div>`);$('#makeStudent').onclick=async()=>{const button=$('#makeStudent'),displayName=$('#studentName').value.trim(),login=normalize($('#studentLogin').value),password=$('#studentPassword').value,groupId=$('#studentGroup').value;if(!displayName||login.length<3||password.length<8){toast('Заполните имя, логин и пароль от 8 символов');return}button.disabled=true;button.textContent='Создание…';try{await createStudent({displayName,login,password,groupId});await loadAccountData();closeModal();render();toast(`Аккаунт ${login} создан`)}catch(error){console.error(error);button.disabled=false;button.textContent='Создать аккаунт';toast(error.message||'Не удалось создать ученика')}}}
function editStudentName(studentId){
  if(state.user?.role!=='teacher')return;
  const student=state.students.find(item=>item.id===studentId);
  if(!student)return toast('Учащийся не найден');
  // Only the display name is edited: authentication login, UID and test history stay unchanged.
  const current=student.displayName||'';
  modal(`<h2>Изменить имя учащегося</h2><p>Логин, пароль и сохранённые результаты не изменятся.</p>
    <div class="field"><label for="editStudentDisplayName">Имя и фамилия</label><input id="editStudentDisplayName" maxlength="120" value="${escapeAttr(current)}" autocomplete="off" placeholder="Имя Фамилия"></div>
    <div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="saveStudentDisplayName">Сохранить</button></div>`);
  const input=$('#editStudentDisplayName');
  const button=$('#saveStudentDisplayName');
  input.focus();input.select();
  const save=async()=>{
    const name=input.value.trim().replace(/\s+/g,' ');
    if(!name)return toast('Введите имя и фамилию');
    if(name.length>120)return toast('Имя слишком длинное');
    if(name===current){closeModal();return;}
    button.disabled=true;button.textContent='Сохранение…';
    try{
      await updateDoc(doc(db,'users',studentId),{displayName:name});
      // Keep the current list and search in sync without reloading all Firebase collections.
      student.displayName=name;
      closeModal();render();toast('Имя и фамилия обновлены');
    }catch(error){console.error(error);button.disabled=false;button.textContent='Сохранить';toast('Не удалось сохранить имя. Проверьте права Firestore.');}
  };
  button.onclick=save;
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save();}};
}
function confirmDeleteStudent(studentId){const student=state.students.find(item=>item.id===studentId);if(!student)return;modal(`<h2>Удалить ученика?</h2><p><strong>${escapeAttr(student.displayName||student.login)}</strong> исчезнет из списка и больше не сможет войти в кабинет. Сохранённые результаты останутся в истории учителя.</p><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="danger" id="deleteStudentConfirm">Удалить ученика</button></div>`);$('#deleteStudentConfirm').onclick=async()=>{const button=$('#deleteStudentConfirm');button.disabled=true;button.textContent='Удаление…';try{await updateDoc(doc(db,'users',studentId),{active:false,deletedAt:serverTimestamp(),deletedBy:state.user.uid});await loadAccountData();closeModal();render();toast('Ученик удалён и его вход заблокирован')}catch(error){console.error(error);button.disabled=false;button.textContent='Удалить ученика';toast('Не удалось удалить ученика. Проверьте правила Firestore.')}}}
async function editCustomTest(testId){const test=state.customTests.find(item=>item.id===testId);if(!test)return;try{const keySnap=await getDoc(doc(db,'answerKeys',testId));const answers=keySnap.exists()?keySnap.data().answers||{}:{};const questions=test.questions.map(question=>({...cleanFirestoreValue(question),accepted:answers[question.id]||[],answer:(answers[question.id]||[])[0]||''}));manualTestModal({...test,questions})}catch(error){console.error(error);toast('Не удалось открыть тест для редактирования')}}
async function editBuiltInTest(baseId){const base=TEST_DATA.variants.find(item=>item.id===baseId);if(!base)return toast('Тест не найден');const override=builtInOverrideFor(baseId);try{let answers=override?.gradingAnswers||{};if(override?.id){const keySnap=await getDoc(doc(db,'answerKeys',override.id));if(keySnap.exists())answers=keySnap.data().answers||answers}const sourceQuestions=override?.questions||base.questions,questions=sourceQuestions.map(question=>{const fallback=base.questions.find(q=>q.id===question.id),accepted=answers[question.id]||fallback?.accepted||(fallback?.answer!==undefined?[fallback.answer]:[]);return {...cleanFirestoreValue(question),accepted,answer:accepted[0]||''}});manualTestModal({...base,...override,id:override?.id||null,builtInBaseId:base.id,kind:'built-in-override',title:override?.title||base.title,questions,timeLimit:override?.timeLimit||base.timeLimit||120})}catch(error){console.error(error);toast('Не удалось открыть встроенный тест для редактирования')}}
async function saveBuiltInOverride(baseId,title,questions,timeLimit=120){const base=TEST_DATA.variants.find(item=>item.id===baseId);if(!base)throw new Error('Base test not found');const existing=builtInOverrideFor(baseId),id=existing?.id||`builtin-${state.user.uid}-${baseId}`,publicQuestions=questions.map(questionWithoutKey),answers=Object.fromEntries(questions.map(q=>[q.id,(q.accepted||(q.answer!==undefined?[q.answer]:[])).filter(v=>v!==undefined&&v!==null)])),gradingAnswers=Object.fromEntries(questions.map(q=>[q.id,answers[q.id]]));const documentData={title,teacherId:state.user.uid,kind:'built-in-override',baseTestId:base.id,year:base.year,variantNumber:base.number,number:base.number,questionCount:questions.length,status:'published',format:'interactive',structure:base.structure,questions:publicQuestions,gradingAnswers,timeLimit,updatedAt:serverTimestamp()};if(!existing)documentData.createdAt=serverTimestamp();await setDoc(doc(db,'tests',id),documentData,{merge:Boolean(existing)});await setDoc(doc(db,'answerKeys',id),{answers,teacherId:state.user.uid,baseTestId:base.id,updatedAt:serverTimestamp()},{merge:true});await loadCustomTests();closeModal();render();toast('Изменения сохранены и будут использоваться в новых попытках учеников')}
function confirmDeleteTest(testId){const test=state.customTests.find(item=>item.id===testId);if(!test)return;modal(`<h2>Удалить тест?</h2><p>Авторский тест <strong>${escapeAttr(test.title)}</strong> будет удалён. Уже сохранённые результаты учеников останутся в истории.</p><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="danger" id="deleteTestConfirm">Удалить тест</button></div>`);$('#deleteTestConfirm').onclick=async()=>{const button=$('#deleteTestConfirm');button.disabled=true;button.textContent='Удаление…';try{await Promise.all([deleteDoc(doc(db,'tests',testId)),deleteDoc(doc(db,'answerKeys',testId))]);await loadCustomTests();closeModal();render();toast('Тест удалён')}catch(error){console.error(error);button.disabled=false;button.textContent='Удалить тест';toast('Не удалось удалить тест. Проверьте правила Firestore.')}}}
function cleanFirestoreValue(value){return JSON.parse(JSON.stringify(value))}
function questionWithoutKey(question){const copy=cleanFirestoreValue(question);delete copy.answer;delete copy.accepted;return copy}
async function saveTeacherTest(title,questions,structure='Авторский тест',timeLimit=120,existingId=null){
  const id=existingId||`custom-${state.user.uid}-${Date.now()}`,publicQuestions=questions.map(questionWithoutKey);
  const answers=Object.fromEntries(questions.map(q=>[q.id,(q.accepted||(q.answer!==undefined?[q.answer]:[])).filter(v=>v!==undefined&&v!==null)]));
  const gradingAnswers=Object.fromEntries(questions.map(q=>[q.id,answers[q.id]]));
  const priorTest=state.customTests.find(t=>t.id===existingId);const documentData={audienceMode:priorTest?.audienceMode||'all',allowedStudentIds:priorTest?.allowedStudentIds||[],title,teacherId:state.user.uid,kind:'custom',year:'Авторский',variantNumber:title,number:title,questionCount:questions.length,status:(existingId?(state.customTests.find(t=>t.id===existingId)?.status||'draft'):'draft'),format:'interactive',structure,questions:publicQuestions,gradingAnswers,timeLimit,updatedAt:serverTimestamp()};
  if(!existingId)documentData.createdAt=serverTimestamp();
  await setDoc(doc(db,'tests',id),documentData,{merge:Boolean(existingId)});
  await setDoc(doc(db,'answerKeys',id),{answers,teacherId:state.user.uid,updatedAt:serverTimestamp()});
  await loadCustomTests();closeModal();render();toast(existingId?'Изменения теста сохранены':'Тест сохранён закрытым. Проверьте и откройте доступ.');
}
function studentCanAccessCustomTest(test){
  if(!test||test.status!=='published')return false;
  if(test.audienceMode!=='selected')return true;
  return Array.isArray(test.allowedStudentIds)&&test.allowedStudentIds.includes(state.user.uid);
}
function testAudienceModal(testId){
  if(state.user?.role!=='teacher')return;
  const test=state.customTests.find(t=>t.id===testId);if(!test)return;
  const selected=new Set(test.allowedStudentIds||[]);
  const students=[...state.students].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ru'));
  modal(`<h2>Кому доступен тест</h2><p><strong>${escapeAttr(test.title)}</strong></p><p>Закрытый тест остаётся недоступным всем независимо от этого выбора.</p>
    <label class="picker-item"><input type="radio" name="testAudienceMode" value="all" ${test.audienceMode!=='selected'?'checked':''}> Всем учащимся</label>
    <label class="picker-item"><input type="radio" name="testAudienceMode" value="selected" ${test.audienceMode==='selected'?'checked':''}> Только выбранным учащимся</label>
    <div id="testAudienceStudents" style="max-height:290px;overflow:auto;margin:12px 0;padding:10px;border:1px solid #ddd;border-radius:10px">
    <input id="audienceSearch" type="search" placeholder="Поиск по имени или группе" style="width:100%;margin-bottom:10px">
    <div id="audienceChoices">${students.map(st=>`<label class="picker-item" data-audience-name="${escapeAttr(((st.name||'')+' '+(st.group||'')).toLowerCase())}"><input type="checkbox" data-audience-uid="${escapeAttr(st.uid||st.id)}" ${selected.has(st.uid||st.id)?'checked':''}> ${escapeAttr(st.name||st.login||st.id)} ${st.group?' · '+escapeAttr(st.group):''}</label>`).join('')||'<p>Учащиеся не найдены.</p>'}</div></div>
    <div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="saveTestAudience">Сохранить доступ</button></div>`);
  const refresh=()=>{$('#testAudienceStudents').hidden=document.querySelector('input[name="testAudienceMode"]:checked')?.value!=='selected'};
  document.querySelectorAll('input[name="testAudienceMode"]').forEach(r=>r.onchange=refresh);refresh();
  $('#audienceSearch').oninput=e=>document.querySelectorAll('[data-audience-name]').forEach(el=>el.hidden=!el.dataset.audienceName.includes(e.target.value.trim().toLowerCase()));
  $('#saveTestAudience').onclick=async()=>{
    const mode=document.querySelector('input[name="testAudienceMode"]:checked')?.value||'all';
    const ids=[...document.querySelectorAll('[data-audience-uid]:checked')].map(x=>x.dataset.audienceUid);
    if(mode==='selected'&&!ids.length)return toast('Выберите хотя бы одного ученика');
    try{await updateDoc(doc(db,'tests',testId),{audienceMode:mode,allowedStudentIds:mode==='selected'?ids:[],updatedAt:serverTimestamp()});await loadCustomTests();closeModal();render();toast('Список доступа сохранён')}
    catch(e){console.error(e);toast('Не удалось сохранить доступ. Проверьте правила Firestore')}
  };
}
async function toggleTestAccess(testId){
  if(state.user?.role!=='teacher')return;
  const test=state.customTests.find(t=>t.id===testId);
  if(!test)return;
  const next=test.status==='published'?'draft':'published';
  if(next==='published'&&(!test.questions?.length||test.questions.some(q=>!q.context)||test.questions.some(q=>!(test.gradingAnswers?.[q.id]||[]).length)))return toast('Перед публикацией заполните правильные ответы во всех заданиях');
  try{await updateDoc(doc(db,'tests',testId),{status:next,updatedAt:serverTimestamp()});await loadCustomTests();render();toast(next==='published'?'Тест открыт для учащихся':'Доступ к тесту закрыт')}catch(e){console.error(e);toast('Не удалось изменить доступ')}
}

// Import is deliberately reviewed before publishing. Parsers do not infer correct keys.
function parseImportedTasks(raw){
  // Import paragraphs may contain inline options, tabs, or one option per line.
  const lines=raw.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  const questions=[];let current=null;let section='A';
  const questionStart=/^([ABАВБ])\s*(\d{1,2})\s*[.)]\s*(.*)$/i;
  const optionStart=/(^|\s)([1-5])\s*[).]\s*/g;
  function appendLine(q,line){
    // Reading passage: paragraph numbers (§ 1, § 2...) are never answer options.
    // Our import-ready Word files encode passage line breaks as literal \n.
    if(q.section==='A' && /^A(?:15|16|17|18)$/.test(q.id) && /^Текст к заданиям\s*A15\s*[–-]\s*A18\s*:/i.test(line)){
      q.context+=(q.context?'\n':'')+line.replace(/\\n/g,'\n');
      return;
    }
    // Option 1 may be preceded by a short label, but options must be numbered in sequence.
    if(q.section==='A'){
      const hits=[...line.matchAll(optionStart)].map(m=>({index:m.index+(m[1]?.length||0),end:m.index+m[0].length,n:+m[2]}));
      const first=hits.findIndex(h=>h.n===1);
      if(first>=0){
        const options=hits.slice(first);
        const valid=options.every((h,i)=>h.n===i+1);
        if(valid && options.length>=2){
          const prefix=line.slice(0,options[0].index).trim();
          if(prefix && !/^(?:варианты(?:\s+ответа)?|answers|options)\s*:?$/i.test(prefix))q.context+=(q.context?'\n':'')+prefix;
          options.forEach((h,i)=>{
            const value=line.slice(h.end,i+1<options.length?options[i+1].index:line.length).trim();
            if(value)q.options.push(value);
          });
          q.type='choice';return;
        }
      }
      // Handles Word layouts where each answer is a separate paragraph.
      const single=line.match(/^([1-5])\s*[).]\s*(\S.*)$/);
      if(single && +single[1]===q.options.length+1){q.options.push(single[2].trim());q.type='choice';return;}
    }
    q.context+=(q.context?'\n':'')+line;
  }
  for(const line of lines){
    if(/^Часть\s*[BВБ]\b/i.test(line))section='B';
    const m=line.match(questionStart);
    if(m){
      if(current)questions.push(current);
      section=/[BВБ]/i.test(m[1])?'B':'A';
      current={id:section+m[2],section,block:section,type:section==='A'?'choice':'input',prompt:section==='A'?'Выберите один правильный ответ.':'Запишите краткий ответ.',context:'',options:[],accepted:[],points:section==='A'?1:2};
      if(m[3])appendLine(current,m[3]);
    }else if(current)appendLine(current,line);
  }
  if(current)questions.push(current);
  // Reading comprehension only (A15–A18 in the provided RT documents):
  // The DOCX stores the reading passage, then a newline and the question.
  // Keep that question in the instruction (prompt), the passage in the task text
  // (context), and the numbered choices in options. Leave ALL other tasks intact.
  for(const q of questions){
    if(q.section!=='A'||!/^A(?:15|16|17|18)$/.test(q.id))continue;
    if(!/^Текст к заданиям\s*A15\s*[–-]\s*A18\s*:/i.test(q.context))continue;
    const parts=q.context.split('\n').map(p=>p.trim()).filter(Boolean);
    if(parts.length<3)continue;
    const question=parts.pop();
    if(!/[?…]|\.\.\.$/.test(question))continue;
    q.prompt=question;
    q.context=parts.join('\n').replace(/^Текст к заданиям\s*A15\s*[–-]\s*A18\s*:\s*/i,'').trim();
    q.block='A15–A18';
  }
  // B9–B18: a single continuous extra-word passage shared by all ten tasks.
  // Repeat the ENTIRE text in the task-text field for every item, preserving
  // original line numbers so pupils can locate the line they must check.
  const extraWordItems=questions.filter(q=>q.section==='B' && /^B(?:9|1[0-8])$/.test(q.id));
  if(extraWordItems.length===10){
    const fullPassage=extraWordItems.map(q=>`${q.id}. ${q.context.trim()}`).join('\n');
    for(const q of extraWordItems){
      q.prompt=`Найдите одно лишнее слово в строке ${q.id}.`;
      q.context=fullPassage;
      q.block='B9–B18';
      q.type='input';
      q.options=[];
    }
  }
  return questions;
}
function loadExternalScript(src){return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>reject(new Error('Не удалось загрузить модуль импорта'));document.head.appendChild(tag)})}
async function importTestFromFile(e){
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(state.user?.role!=='teacher')return;
 if(file.size>15*1024*1024)return toast('Максимальный размер файла — 15 МБ');
 toast('Чтение файла…');
 try{
  let raw='';
  if(/\.docx$/i.test(file.name)){
   if(!window.mammoth)await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.0/mammoth.browser.min.js');
   const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});raw=result.value;
  }else if(/\.pdf$/i.test(file.name)){
   if(!window.pdfjsLib)await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   if(pdf.numPages>100)throw new Error('Слишком много страниц (максимум 100)');
   for(let pageIndex=1;pageIndex<=pdf.numPages;pageIndex++){
    const page=await pdf.getPage(pageIndex);const content=await page.getTextContent();
    // Line grouping based on page coordinates helps preserve numbered task boundaries.
    let lastY=null;for(const item of content.items){const y=Math.round(item.transform?.[5]||0);if(lastY!==null&&Math.abs(y-lastY)>3)raw+='\n';raw+=item.str+' ';lastY=y}raw+='\n';
   }
  }else return toast('Поддерживаются только DOCX и PDF');
  const questions=parseImportedTasks(raw);
  if(!questions.length)throw new Error('В документе не удалось найти текст (возможно, это скан PDF)');
  const title=file.name.replace(/\.(docx|pdf)$/i,'');
  const missing=questions.filter(q=>q.section==='A'&&q.options.length<2);
  toast(`Найдено ${questions.length} заданий; без вариантов ответа: ${missing.length}. Проверьте текст и ответы.`);
  manualTestModal({title,questions,timeLimit:120,structure:'Импортировано из '+file.name});
 }catch(err){console.error(err);toast(err.message||'Ошибка импорта файла')}
}

function readyQuestionSources(){return TEST_DATA.variants.filter(v=>v.status==='ready').map(effectiveBuiltInTest).flatMap(test=>test.questions.map(question=>({key:`${test.id}::${question.id}`,test,question})))}
function customTestBuilderModal(){
  const sources=readyQuestionSources(),selected=new Set();
  modal(`<div class="card-head"><div><p class="eyebrow">Конструктор</p><h2>Собрать тест из готовых заданий</h2><p>Фильтруйте банк и отмечайте нужные задания.</p></div><button class="ghost" data-close>Закрыть</button></div><div class="form-grid builder-filters"><div class="field"><label>Название теста</label><input id="builderTitle" placeholder="Повторение грамматики"></div><div class="field"><label>Год</label><select id="builderYear"><option value="all">Все годы</option><option>2026</option><option>2025</option></select></div><div class="field"><label>Вариант</label><select id="builderVariant"><option value="all">Все варианты</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}">Вариант ${i+1}</option>`).join('')}</select></div><div class="field"><label>Блок</label><select id="builderBlock"><option value="all">Все блоки</option>${['A1–A4','A5–A8','A9–A12','A13–A14','A15–A18','B1–B3','B4–B6','B7–B8','B9–B18','B19–B22'].map(x=>`<option>${x}</option>`).join('')}</select></div></div><div class="builder-toolbar"><strong id="selectedCount">Выбрано: 0</strong><button class="secondary" id="selectVisible">Выбрать показанные</button></div><div class="question-picker" id="questionPicker"></div><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="saveBuiltTest">Создать тест</button></div>`,true);
  const paint=()=>{const year=$('#builderYear').value,variant=$('#builderVariant').value,block=$('#builderBlock').value;const visible=sources.filter(item=>(year==='all'||String(item.test.year)===year)&&(variant==='all'||String(item.test.number)===variant)&&(block==='all'||item.question.block===block));$('#questionPicker').innerHTML=visible.map(item=>`<label class="picker-item"><input type="checkbox" data-source-key="${escapeAttr(item.key)}" ${selected.has(item.key)?'checked':''}><span><strong>${item.test.year} · Вариант ${item.test.number} · ${escapeAttr(item.question.id)}</strong><small>${escapeAttr(item.question.block||item.question.section)} · ${escapeAttr(item.question.prompt||'Задание')}</small></span></label>`).join('')||'<div class="empty">По выбранным фильтрам заданий нет.</div>';document.querySelectorAll('[data-source-key]').forEach(input=>input.onchange=()=>{input.checked?selected.add(input.dataset.sourceKey):selected.delete(input.dataset.sourceKey);$('#selectedCount').textContent=`Выбрано: ${selected.size}`});$('#selectVisible').onclick=()=>{visible.forEach(item=>selected.add(item.key));paint()}};
  ['builderYear','builderVariant','builderBlock'].forEach(id=>$(`#${id}`).onchange=paint);paint();
  $('#saveBuiltTest').onclick=async()=>{const title=$('#builderTitle').value.trim();if(!title)return toast('Введите название теста');if(!selected.size)return toast('Выберите хотя бы одно задание');const chosen=sources.filter(item=>selected.has(item.key)).map((item,index)=>{const q=cleanFirestoreValue(item.question);q.sourceLabel=`${item.test.year} · Вариант ${item.test.number} · ${q.id}`;q.id=`Q${index+1}`;q.points=q.section==='A'?1:2;return q});const button=$('#saveBuiltTest');button.disabled=true;button.textContent='Сохранение…';try{await saveTeacherTest(title,chosen,'Составлен из готовых заданий')}catch(error){console.error(error);button.disabled=false;button.textContent='Создать тест';toast('Не удалось сохранить тест. Проверьте правила Firestore.')}};
}
function manualQuestionRow(index,question={}){const section=question.section||'A',type=question.type==='input'||question.type==='text'?'text':'choice',accepted=question.accepted||(question.answer!==undefined?[question.answer]:[]);return `<section class="manual-question" data-manual-question><div class="card-head"><strong>Задание ${index}</strong><button class="ghost remove-question" type="button">Удалить</button></div><div class="form-grid"><div class="field"><label>Номер задания</label><input class="mq-id" value="${escapeAttr(question.id||index)}" placeholder="A1"></div><div class="field"><label>Часть</label><select class="mq-section"><option value="A" ${section==='A'?'selected':''}>A · 1 балл</option><option value="B" ${section==='B'?'selected':''}>B · 2 балла</option></select></div><div class="field"><label>Тип ответа</label><select class="mq-type"><option value="choice" ${type==='choice'?'selected':''}>Выбор варианта</option><option value="text" ${type==='text'?'selected':''}>Ввод слова или фразы</option></select></div><div class="field"><label>Блок</label><input class="mq-block" value="${escapeAttr(question.block||'')}" placeholder="A1–A4"></div></div><div class="field"><label>Инструкция</label><input class="mq-prompt" value="${escapeAttr(question.prompt||'')}" placeholder="Выберите правильный вариант."></div><div class="field"><label>Текст задания</label><textarea class="mq-context" rows="4" placeholder="Введите предложение или полный текст с пропуском…">${escapeAttr(question.context||'')}</textarea></div><div class="form-grid"><div class="field"><label>Варианты ответа — каждый с новой строки</label><textarea class="mq-options" rows="5" placeholder="has turned&#10;will turn&#10;is turned">${escapeAttr((question.options||[]).join('\n'))}</textarea></div><div class="field"><label>Правильные ответы — каждый с новой строки</label><textarea class="mq-answers" rows="5" placeholder="is turned">${escapeAttr(accepted.join('\n'))}</textarea></div></div></section>`}
function manualTestModal(existing=null){
  const initialQuestions=existing?.questions?.length?existing.questions:[{}],builtIn=Boolean(existing?.builtInBaseId);let count=initialQuestions.length;modal(`<div class="card-head"><div><p class="eyebrow">${existing?'Редактирование':'Новый материал'}</p><h2>${builtIn?'Редактировать встроенный тест и ответы':existing?'Редактировать тест':'Создать новый тест'}</h2><p>${builtIn?'Изменения будут применяться к новым попыткам ваших учеников. Уже сохранённые попытки останутся без изменений.':'Добавьте собственные задания. Для части B можно указать несколько допустимых ответов.'}</p></div><button class="ghost" data-close>Закрыть</button></div><div class="form-grid"><div class="field"><label>Название теста</label><input id="manualTitle" value="${escapeAttr(existing?.title||'')}" placeholder="Тест по предлогам"></div><div class="field"><label>Ограничение времени, минут</label><input id="manualTime" type="number" min="1" value="${existing?.timeLimit||45}"></div></div><div id="manualQuestions">${initialQuestions.map((question,index)=>manualQuestionRow(index+1,question)).join('')}</div><button class="secondary" id="addManualQuestion" type="button">+ Добавить задание</button><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="saveManualTest">${existing?'Сохранить изменения':'Сохранить тест'}</button></div>`,true);
  const bindRemove=()=>document.querySelectorAll('.remove-question').forEach(button=>button.onclick=()=>{if(document.querySelectorAll('[data-manual-question]').length===1)return toast('В тесте должно остаться хотя бы одно задание');button.closest('[data-manual-question]').remove()});bindRemove();$('#addManualQuestion').onclick=()=>{$('#manualQuestions').insertAdjacentHTML('beforeend',manualQuestionRow(++count));bindRemove()};
  $('#saveManualTest').onclick=async()=>{const title=$('#manualTitle').value.trim();if(!title)return toast('Введите название теста');const timeLimit=Math.max(1,+$('#manualTime').value||45),questions=[];for(const [index,row] of [...document.querySelectorAll('[data-manual-question]')].entries()){const id=$('.mq-id',row).value.trim()||String(index+1),section=$('.mq-section',row).value,type=$('.mq-type',row).value,prompt=$('.mq-prompt',row).value.trim(),context=$('.mq-context',row).value.trim(),options=$('.mq-options',row).value.split('\n').map(v=>v.trim()).filter(Boolean),accepted=$('.mq-answers',row).value.split('\n').map(v=>v.trim()).filter(Boolean);if(questions.some(question=>question.id===id))return toast(`Номер задания ${id} повторяется`);if(!context)return toast(`Заполните текст задания ${index+1}`);if(type==='choice'&&options.length<2)return toast(`Добавьте минимум два варианта в задании ${index+1}`);questions.push({id,section,block:$('.mq-block',row).value.trim()||section,type:type==='text'?'input':'choice',prompt:prompt||'Выполните задание.',context,options:type==='choice'?options:[],accepted,answer:accepted[0],points:section==='A'?1:2})}const button=$('#saveManualTest');button.disabled=true;button.textContent='Сохранение…';try{if(builtIn)await saveBuiltInOverride(existing.builtInBaseId,title,questions,timeLimit);else await saveTeacherTest(title,questions,existing?.structure||'Создан учителем',timeLimit,existing?.id||null)}catch(error){console.error(error);button.disabled=false;button.textContent=existing?'Сохранить изменения':'Сохранить тест';toast('Не удалось сохранить тест. Проверьте правила Firestore.')}};
}
function assignmentModal(type){modal(`<h2>${type==='custom'?'Собрать тест':'Новое задание'}</h2><p>Выберите режим и правила выполнения.</p><div class="field"><label>Режим</label><select><option>Полный тест A1–B22</option><option>Тренировка по блокам</option><option>Тест из выбранных заданий</option><option>Случайная подборка</option><option>Повторение ошибок</option></select></div><div class="form-grid"><div class="field"><label>Попыток</label><input type="number" value="2" min="1"></div><div class="field"><label>Время, минут</label><input type="number" value="120" min="1"></div><div class="field"><label>Дата окончания</label><input type="date"></div><div class="field"><label>Ответы</label><select><option>После дедлайна</option><option>Сразу</option><option>После всех попыток</option><option>Не показывать</option></select></div></div><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="saveAssignment">Продолжить</button></div>`);$('#saveAssignment').onclick=()=>{closeModal();toast('Задание сохранено как черновик')}}
function modal(html,wide=false){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal ${wide?'modal-wide':''}">${html}</div></div>`);document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()}}
function closeModal(){$('#modal')?.remove()}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function escapeAttr(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
const renderTextQuestionBody = questionBody;
questionBody = function renderQuestionBody(q){
  if(!q.image)return renderTextQuestionBody(q);
  const image=`<figure class="task-sheet"><img src="${q.image}" alt="Страница с заданиями, содержащая ${q.id}" loading="eager"></figure>`;
  if(q.type==='choice')return `${image}<div class="options compact-options">${optionsFor(q).map((o,i)=>`<button class="option ${state.answers[q.id]===o?'selected':''}" data-answer="${escapeAttr(o)}"><b>${i+1}</b>Вариант ${o}</button>`).join('')}</div>`;
  return `${image}<input class="answer-input" id="textAnswer" value="${escapeAttr(state.answers[q.id]||'')}" placeholder="Введите ответ для ${q.id}" autocomplete="off">`;
};

const renderPdfTest = renderTest;
renderTest = function renderCurrentTest(){
  if(state.test?.format !== 'interactive') return renderPdfTest();
  const q=state.test.questions[state.index],revision=state.revisionErrors.has(q.id);
  app.innerHTML=shell(`<div class="test-layout interactive-layout"><section class="card question-card interactive-question ${revision?'revision-question':''}"><div class="card-head"><span class="question-id">${q.id}</span><span class="status">${q.block}</span></div>${q.sourceLabel?`<p class="source-label">Источник: ${escapeAttr(q.sourceLabel)}</p>`:''}${revision?`<div class="revision-banner"><strong>Здесь была ошибка</strong>${state.revisionComments[q.id]?`<span>${escapeAttr(state.revisionComments[q.id])}</span>`:''}</div>`:''}<h2>${q.prompt}</h2>${questionBody(q)}<div class="test-nav"><button class="ghost" id="prev" ${state.index===0?'disabled':''}>← Назад</button><button class="primary" id="next">${state.index===state.test.questions.length-1?'Завершить':'Далее →'}</button></div></section><aside class="test-side"><div class="card"><div class="card-head"><h3>${state.test.kind==='custom'?escapeAttr(state.test.title):`${state.test.year} · Вариант ${state.test.number}`}</h3><span class="timer" id="timer">${state.test.timeLimit||120}:00</span></div><div class="q-grid">${state.test.questions.map((x,i)=>`<button class="q-btn ${state.revisionErrors.has(x.id)?'has-error':''} ${isQuestionAnswered(x)?'answered':''} ${i===state.index?'current':''}" data-q="${i}">${x.id}</button>`).join('')}</div><div class="progress" style="margin-top:18px"><i style="width:${Math.round(answeredTaskCount()/totalTaskCount()*100)}%"></i></div><p class="autosave-note">Заполнено ${answeredTaskCount()} из ${totalTaskCount()}.</p></div></aside></div>`,'Тестирование',state.test.kind==='custom'?state.test.title:`${state.test.year} · Вариант ${state.test.number}`);
  bindCommon();
  bindQuestionInputs(q);
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{saveText(q);state.index=+b.dataset.q;renderTest()});
  $('#prev').onclick=()=>{saveText(q);if(state.index>0)state.index--;renderTest()};
  $('#next').onclick=()=>{saveText(q);if(state.index<state.test.questions.length-1){state.index++;renderTest()}else confirmFinish()};
  startTimer();
};

const renderScoredResult = renderResult;
renderResult = function renderCurrentResult(){
  if(!state.result?.pending) return renderScoredResult();
  app.innerHTML=shell(`<div class="card" style="max-width:760px;margin:20px auto;text-align:center"><p class="eyebrow">Работа отправлена</p><h2>Ответы сохранены</h2><div class="result-ring" style="--score:100%"><div><strong>✓</strong><span>в Firestore</span></div></div><div class="grid result-stats"><div class="stat"><span>Заполнено</span><strong>${state.result.answered} / ${state.result.total}</strong></div><div class="stat"><span>Статус</span><strong>На проверке</strong></div><div class="stat"><span>Проверит</span><strong>Учитель</strong></div></div><p>Результат появится в разделе «Мои результаты» после входа учителя.</p><div class="hero-actions" style="justify-content:center"><button class="primary" data-view="student-results">К моим результатам</button><button class="ghost" data-view="tests">К тестам</button></div></div>`,'Работа отправлена',`${state.test.year} · Вариант ${state.test.number}`);
  bindCommon();
};

const renderTestsCatalog = tests;
tests = function render2026Catalog(){
  return renderTestsCatalog().replace('5 полных вариантов готовы к решению','10 вариантов 2026 готовы к решению').replace('Задания открываются из оригинального сборника, ответы вводятся в интерактивный бланк.','Каждый вариант открывается отдельно, ответы вводятся в интерактивный бланк.');
};

// Учитель пересчитывает только уже завершённые попытки. Исходные значения сохраняются в audit-поле.
async function previewRegrade(testId){
  if(state.user?.role!=='teacher')return;
  const base=TEST_DATA.variants.find(v=>v.id===testId);
  const override=base?builtInOverrideFor(testId):null;
  const test=base?(override||effectiveBuiltInTest(base)):state.customTests.find(t=>t.id===testId);
  if(!test)return toast('Тест не найден');
  let keys={};
  try{
    const keyId=base?(override?.id||null):testId;
    if(keyId){const snap=await getDoc(doc(db,'answerKeys',keyId));keys=snap.exists()?snap.data().answers||{}:{}}
    if(!Object.keys(keys).length&&base){const effective=effectiveBuiltInTest(base);keys=Object.fromEntries((effective.questions||[]).map(q=>[q.id,q.accepted||(q.answer!==undefined?[q.answer]:[])]));}
  }catch(e){console.error(e);return toast('Не удалось получить новые ключи ответов')}
  const attempts=state.attempts.filter(a=>a.testId===testId&&a.teacherId===state.user.uid&&a.status==='scored'&&hasScore(a));
  if(!attempts.length)return modal('<h2>Пересчёт результатов</h2><p>Для этого теста пока нет завершённых попыток.</p><div class="modal-actions"><button class="primary" data-close>Закрыть</button></div>');
  const changes=[],skipped=[];
  for(const a of attempts){
    if(!Array.isArray(a.questionsSnapshot)||!a.questionsSnapshot.length||!a.answersSnapshot){skipped.push(a.id);continue}
    const results={},missing=[];let primary=0,correct=0,max=0;
    for(const q of a.questionsSnapshot){
      const accepted=keys[q.id];
      if(!Array.isArray(accepted)||!accepted.length){missing.push(q.id);continue}
      const weight=Number(q.points)||(q.section==='A'?1:2);
      const studentAnswer=a.answersSnapshot[q.id]??'';
      const isCorrect=accepted.some(ans=>normalize(ans)===normalize(studentAnswer));
      const pts=isCorrect?weight:0;max+=weight;primary+=pts;if(isCorrect)correct++;
      results[q.id]={...(a.questionResultsSnapshot?.[q.id]||{}),correct:isCorrect,points:pts,studentAnswer,correctAnswer:accepted.join(' / ')};
    }
    if(missing.length){skipped.push(a.id+' ('+missing.join(', ')+')');continue}
    const testScore=max===62?scale[primary]:max?Math.round(primary/max*100):0;
    if(!Number.isFinite(testScore)){skipped.push(a.id);continue}
    const grade10=max===62?ceGrade(testScore):null;
    if(primary===Number(a.primaryScore)&&testScore===Number(a.testScore)&&correct===Number(a.correctCount))continue;
    changes.push({a,primary,testScore,grade10,correct,max,results});
  }
  const description=changes.length?`<div class="card table-wrap"><table class="table"><thead><tr><th>Ученик</th><th>Первичный</th><th>Тестовый</th><th>Отметка</th></tr></thead><tbody>${changes.slice(0,80).map(c=>{const person=state.students.find(s=>s.id===c.a.studentId);return `<tr><td>${escapeAttr(person?.displayName||c.a.studentId)}</td><td>${c.a.primaryScore??'—'} → ${c.primary}</td><td>${c.a.testScore??'—'} → ${c.testScore}</td><td>${attemptGrade(c.a)??'—'} → ${c.grade10??'—'}</td></tr>`}).join('')}</tbody></table></div>`:'<p>Баллы не изменятся — новых отличий от сохранённых результатов нет.</p>';
  modal(`<h2>Пересчитать результаты: ${escapeAttr(test.title||testId)}</h2><p>Проверено попыток: ${attempts.length}. Изменятся: <strong>${changes.length}</strong>. Пропущено из-за отсутствия ответов или ключей: <strong>${skipped.length}</strong>. ${changes.length>80?'Показаны первые 80 изменений.':''}</p>${description}<p><strong>Важно:</strong> сохраняются ответы ученика, комментарии учителя и старые баллы в истории перерасчётов. Пересчитываются только завершённые попытки, не внешние РТ/ЦТ.</p><div class="modal-actions"><button class="ghost" data-close>Отмена</button>${changes.length?'<button class="primary" id="confirmRegrade">Подтвердить перерасчёт</button>':''}</div>`);
  const confirm=$('#confirmRegrade');if(!confirm)return;
  confirm.onclick=async()=>{
    confirm.disabled=true;let saved=0;
    for(const c of changes){
      try{
        const history=Array.isArray(c.a.regradeHistory)?c.a.regradeHistory:[];
        if(history.length>=50)throw new Error('Лимит истории перерасчётов (50) для попытки '+c.a.id);
        await updateDoc(doc(db,'attempts',c.a.id),{
          regradeHistory:[...history,{at:new Date().toISOString(),by:state.user.uid,oldPrimary:c.a.primaryScore??null,oldTestScore:c.a.testScore??null,oldGrade:c.a.grade10??null,newPrimary:c.primary,newTestScore:c.testScore,newGrade:c.grade10}],
          primaryScore:c.primary,testScore:c.testScore,grade10:c.grade10,correctCount:c.correct,maxPrimary:c.max,
          questionResultsSnapshot:c.results,lastRegradedAt:serverTimestamp(),lastRegradedBy:state.user.uid
        });saved++;
      }catch(err){console.error('Regrade failed',c.a.id,err);break}
    }
    await loadAccountData();closeModal();render();toast(saved===changes.length?`Пересчитано попыток: ${saved}`:`Пересчитано ${saved} из ${changes.length}. Проверьте консоль и права Firestore.`);
  };
}

async function scoreSubmittedAttempts(){
  const pending=state.attempts.filter(a=>a.status==='submitted');
  for(const attempt of pending){
    const keySnap=await getDoc(doc(db,"answerKeys",attempt.testId));
    const keys=keySnap.data()?.answers||{};
    let primary=0,correct=0;
    const results={};
    for(const q of attempt.questionsSnapshot||[]){
      const ok=(keys[q.id]||[]).some(a=>normalize(a)===normalize(attempt.answersSnapshot?.[q.id]));
      const points=ok?(q.section==='A'?1:2):0;
      primary+=points;if(ok)correct++;
      results[q.id]={correct:ok,points,studentAnswer:attempt.answersSnapshot?.[q.id]||'',correctAnswer:(keys[q.id]||[]).join(' / ')};
    }
    const max=(attempt.questionsSnapshot||[]).reduce((n,q)=>n+(q.section==='A'?1:2),0);
    const testScore=max===62?scale[primary]:(max?Math.round(primary/max*100):0);
    await updateDoc(doc(db,"attempts",attempt.id),{status:"scored",scoredAt:serverTimestamp(),primaryScore:primary,testScore,grade10:max===62?ceGrade(testScore):null,correctCount:correct,maxPrimary:max,questionResultsSnapshot:results,manualReviewStatus:"available",scaleVersion:max===62?'2026':'percent'});
  }
  return pending.length;
}

async function publishBuiltInTests(){
  // Встроенный банк хранится в файлах проекта. Изменения учителя сохраняются
  // отдельными override-документами и поэтому не перезаписываются при входе.
  return true;
}

async function loadCustomTests(){
  const ownerId=state.user.role==='teacher'?state.user.uid:state.user.createdBy;
  if(!ownerId){state.customTests=[];state.builtInOverrides=[];return}
  let testDocs;
  if(state.user.role==='teacher'){
    testDocs=await getDocs(query(collection(db,'tests'),where('teacherId','==',ownerId)));
  }else{
    // Server-side access filtering; the Firestore rules must match these two queries.
    // Query each audience independently so one missing index does not hide the other group.
    const queries=[
      query(collection(db,'tests'),where('teacherId','==',ownerId),where('status','==','published'),where('audienceMode','==','all')),
      query(collection(db,'tests'),where('teacherId','==',ownerId),where('status','==','published'),where('allowedStudentIds','array-contains',state.user.uid))
    ];
    const results=await Promise.allSettled(queries.map(q=>getDocs(q)));
    const failures=results.filter(r=>r.status==='rejected');
    if(failures.length===results.length){throw failures[0].reason;}
    if(failures.length){
      console.warn('Не все группы доступных тестов загружены:',...failures.map(r=>r.reason));
      setTimeout(()=>toast('Часть тестов не загрузилась. Проверьте индексы Firestore.'),100);
    }
    const map=new Map(results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value.docs).map(d=>[d.id,d]));
    testDocs={docs:[...map.values()]};
  }
  const all=testDocs.docs.map(snapshot=>({id:snapshot.id,...snapshot.data()})).filter(test=>test.teacherId===ownerId&&(state.user.role==='teacher'||studentCanAccessCustomTest(test))&&Array.isArray(test.questions));
  state.customTests=all.filter(test=>test.kind==='custom');
  state.builtInOverrides=all.filter(test=>test.kind==='built-in-override'&&test.baseTestId);
}

async function loadAccountData(){
  if(!state.user)return;
  try { await loadCustomTests(); }
  catch(error) {
    console.error('Не удалось загрузить тесты; кабинет продолжит работу:', error);
    state.customTests=[]; state.builtInOverrides=[];
    setTimeout(()=>toast('Не удалось загрузить список тестов. Проверьте индексы и правила Firestore.'),100);
  }
  try { await loadMessages(); } catch(error) {console.error('Ошибка сообщений:',error); state.messages=[];}
  try { await loadLibrary(); } catch(error) {console.error('Ошибка справочников:',error); state.books=[]; state.reviews=[];}
  if(state.user.role==='teacher'){
    const [studentDocs,attemptDocs]=await Promise.all([
      getDocs(query(collection(db,"users"),where("createdBy","==",state.user.uid))),
      getDocs(query(collection(db,"attempts"),where("teacherId","==",state.user.uid)))
    ]);
    state.students=studentDocs.docs.map(d=>({id:d.id,...d.data()})).filter(student=>student.active!==false);
    state.attempts=attemptDocs.docs.map(d=>({id:d.id,...d.data()}));
    try {
      const externalDocs=await getDocs(query(collection(db,'externalResults'),where('teacherId','==',state.user.uid)));
      state.externalResults=externalDocs.docs.map(d=>({id:d.id,...d.data()}));
    } catch(error) { console.warn('Внешние результаты не загружены; тесты работают:',error);state.externalResults=[]; }
  }else{
    const attemptDocs=await getDocs(query(collection(db,"attempts"),where("studentId","==",state.user.uid)));
    state.students=[];state.externalResults=[];
    state.attempts=attemptDocs.docs.map(d=>({id:d.id,...d.data()}));
  }
}

watchAuth(async firebaseUser=>{
  state.authLoading=false;
  if(!firebaseUser){state.user=null;render();return}
  try{
    const profileSnap=await getDoc(doc(db,"users",firebaseUser.uid));
    if(!profileSnap.exists())throw new Error("Профиль пользователя не найден в Firestore");
    const profile=profileSnap.data();
    if(profile.active===false)throw new Error("Аккаунт ученика удалён учителем");
    state.user={uid:firebaseUser.uid,role:profile.role,name:profile.displayName||firebaseUser.displayName||firebaseUser.email,group:profile.groupId||"Без группы",createdBy:profile.createdBy||null,login:profile.login||firebaseUser.email};
    state.role=profile.role;
    state.view=profile.role==='teacher'?'dashboard':'student-home';
    if(profile.role==='teacher'){
      try{await publishBuiltInTests()}catch(syncError){console.error("Не удалось синхронизировать встроенные тесты",syncError);setTimeout(()=>toast('Кабинет открыт, но тесты не удалось синхронизировать'),100)}
    }
    try { await loadAccountData(); }
    catch(loadError) {console.error('Частичная ошибка загрузки кабинета:',loadError);setTimeout(()=>toast('Часть данных не загрузилась. Проверьте Firestore.'),100);}
    if(profile.role==='teacher'){
      try{ if(await scoreSubmittedAttempts())await loadAccountData(); }
      catch(scoreError){console.error('Ошибка пересчёта результатов:',scoreError)}
    }
    render();
  }catch(error){console.error(error);await logout();state.user=null;render();}
});

window.startTest=startTest;window.createStudentModal=createStudentModal;window.toast=toast;render();


// Библиотека PDF: файлы в R2; метаданные и назначения в Firestore.
async function libraryRequest(path,options={}){
 const token=await auth.currentUser.getIdToken();
 const response=await fetch(`${LIBRARY_API}${path}`,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});
 if(!response.ok){let error;try{error=(await response.json()).error}catch{}throw new Error(error||`Ошибка API: ${response.status}`)}
 return response;
}
async function loadLibrary(){
 try{
  const owner=state.user.role==='teacher'?state.user.uid:state.user.createdBy;
  const [books,reviews]=await Promise.all([
   getDocs(query(collection(db,'libraryBooks'),where('teacherId','==',owner))),
   getDocs(query(collection(db,'libraryReviews'),where('teacherId','==',owner)))
  ]);
  state.books=books.docs.map(d=>({id:d.id,...d.data()}));
  state.reviews=reviews.docs.map(d=>({id:d.id,...d.data()}));
 }catch(e){console.error('Справочник:',e);state.books=[];state.reviews=[]}
}
function reviewTargets(review){return review.studentIds?.includes(state.user.uid)||review.groupIds?.includes(state.user.group)||review.allStudents===true}
function libraryView(){
 const teacher=state.user.role==='teacher';
 const books=state.books.map(b=>`<article class="card"><h3>📘 ${escapeAttr(b.title)}</h3><p>${escapeAttr(b.description||'PDF-справочник')}</p><div class="library-actions"><button class="secondary" data-book-open="${escapeAttr(b.id)}">Открыть</button>${teacher?`<button class="danger" data-book-delete="${escapeAttr(b.id)}">Удалить</button>`:''}</div></article>`).join('');
 const reviews=state.reviews.filter(r=>teacher||reviewTargets(r)).map(r=>{const book=state.books.find(b=>b.id===r.bookId);if(!book)return '';const done=!!r.doneBy?.[state.user.uid];const completed=Object.keys(r.doneBy||{}).length;return `<article class="card"><h3>${escapeAttr(r.topic||book.title)}</h3><p>📘 ${escapeAttr(book.title)} · стр. ${escapeAttr(r.pages||'1')}</p>${r.comment?`<p>${escapeAttr(r.comment)}</p>`:''}${r.due?`<p>Срок: ${escapeAttr(r.due)}</p>`:''}${teacher?`<p>Отметили повторение: ${completed}</p><button class="danger" data-review-delete="${escapeAttr(r.id)}">Удалить назначение</button>`:`<button class="secondary" data-book-open="${escapeAttr(book.id)}" data-page="${escapeAttr(String(r.pages||'1').match(/\d+/)?.[0]||'1')}">Открыть страницы</button> <button class="primary" data-review-done="${escapeAttr(r.id)}" ${done?'disabled':''}>${done?'✓ Повторил(а)':'Я повторил(а)'}</button>`}</article>`}).join('');
 return `<section class="section-title"><div><h2>Электронная библиотека</h2><p>PDF-справочники и страницы для повторения</p></div></section>${teacher?`<div class="card library-form"><h3>Добавить PDF-справочник</h3><form id="libraryUpload"><input id="libraryTitle" required maxlength="150" placeholder="Название справочника"><input id="libraryDescription" maxlength="300" placeholder="Описание (необязательно)"><input id="libraryFile" type="file" accept="application/pdf,.pdf" required><button class="primary" type="submit">Загрузить PDF</button></form></div>`:''}<div class="library-grid">${books||'<p>Справочников пока нет.</p>'}</div>${teacher?`<div class="card library-form"><h3>Назначить страницы</h3><form id="reviewForm"><select id="reviewBook" required>${state.books.map(b=>`<option value="${escapeAttr(b.id)}">${escapeAttr(b.title)}</option>`).join('')}</select><input id="reviewTopic" required placeholder="Тема (например, Articles)"><input id="reviewPages" required placeholder="Страницы, например 45–48" pattern="[0-9 ,–\-]+"><textarea id="reviewComment" placeholder="Комментарий учителя"></textarea><input id="reviewDue" type="date"><select id="reviewTarget"><option value="all">Все учащиеся</option>${[...new Set(state.students.map(s=>s.groupId).filter(Boolean))].map(g=>`<option value="group:${escapeAttr(g)}">Группа: ${escapeAttr(g)}</option>`).join('')}${state.students.map(s=>`<option value="student:${escapeAttr(s.id)}">${escapeAttr(s.displayName)}</option>`).join('')}</select><button type="submit" class="primary">Назначить</button></form></div>`:''}<h2 style="margin:24px 0 12px">${teacher?'Выданные задания':'Мне повторить'}</h2><div class="library-grid">${reviews||'<p>Назначений пока нет.</p>'}</div>`;
}
function bindLibrary(){
 $('#libraryUpload')?.addEventListener('submit',async e=>{
  e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;
  const file=$('#libraryFile').files[0];
  try{
   if(!file||file.size>25*1024*1024)throw new Error('Выберите PDF размером до 25 МБ');
   const response=await libraryRequest('/upload',{method:'PUT',headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name)},body:file});
   const {key}=await response.json();
   try{await addDoc(collection(db,'libraryBooks'),{title:$('#libraryTitle').value.trim(),description:$('#libraryDescription').value.trim(),key,teacherId:state.user.uid,createdAt:serverTimestamp()})}
   catch(err){await libraryRequest('/file/'+key,{method:'DELETE'}).catch(()=>{});throw err}
   await loadLibrary();render();toast('Справочник загружен');
  }catch(err){toast(`Не удалось загрузить PDF: ${err.message}`);button.disabled=false}
 });
 $('#reviewForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const target=$('#reviewTarget').value;
  try{
   await addDoc(collection(db,'libraryReviews'),{teacherId:state.user.uid,bookId:$('#reviewBook').value,topic:$('#reviewTopic').value.trim(),pages:$('#reviewPages').value.trim(),comment:$('#reviewComment').value.trim(),due:$('#reviewDue').value,allStudents:target==='all',groupIds:target.startsWith('group:')?[target.slice(6)]:[],studentIds:target.startsWith('student:')?[target.slice(8)]:[],doneBy:{},createdAt:serverTimestamp()});
   await loadLibrary();render();toast('Страницы назначены');
  }catch(err){toast(`Ошибка назначения: ${err.message}`)}
 });
 document.querySelectorAll('[data-book-open]').forEach(b=>b.onclick=async()=>{
  const book=state.books.find(x=>x.id===b.dataset.bookOpen);if(!book)return;
  const tab=window.open('about:blank','_blank');
  try{const blob=await (await libraryRequest('/file/'+book.key)).blob();const url=URL.createObjectURL(blob);if(tab)tab.location.href=url+`#page=${parseInt(b.dataset.page||'1',10)}`;else toast('Разрешите всплывающие окна');setTimeout(()=>URL.revokeObjectURL(url),300000)}catch(err){tab?.close();toast(`Не удалось открыть PDF: ${err.message}`)}
 });
 document.querySelectorAll('[data-review-done]').forEach(b=>b.onclick=async()=>{
  try{await updateDoc(doc(db,'libraryReviews',b.dataset.reviewDone),{[`doneBy.${state.user.uid}`]:true});await loadLibrary();render();toast('Повторение отмечено')}catch(err){toast(err.message)}
 });
 document.querySelectorAll('[data-review-delete]').forEach(b=>b.onclick=async()=>{
  if(!confirm('Удалить назначение?'))return;try{await deleteDoc(doc(db,'libraryReviews',b.dataset.reviewDelete));await loadLibrary();render()}catch(err){toast(err.message)}
 });
 document.querySelectorAll('[data-book-delete]').forEach(b=>b.onclick=async()=>{
  const book=state.books.find(x=>x.id===b.dataset.bookDelete);if(!book||!confirm('Удалить справочник и его назначения?'))return;
  try{await libraryRequest('/file/'+book.key,{method:'DELETE'});await deleteDoc(doc(db,'libraryBooks',book.id));for(const r of state.reviews.filter(x=>x.bookId===book.id))await deleteDoc(doc(db,'libraryReviews',r.id));await loadLibrary();render();toast('Справочник удалён')}catch(err){toast(err.message)}
 });
}
