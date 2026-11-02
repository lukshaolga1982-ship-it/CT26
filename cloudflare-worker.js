// Cloudflare Worker — R2 PDF library for CT26.
// Bind R2 as LIBRARY_BUCKET. Set FIREBASE_PROJECT_ID=ct-25-26.
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
const b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const decode=s=>JSON.parse(new TextDecoder().decode(b64(s)));
async function verify(token,env){
  if(!token)throw new Error('Требуется авторизация');
  const parts=token.split('.');if(parts.length!==3)throw new Error('Некорректный токен');
  const head=decode(parts[0]),payload=decode(parts[1]);
  if(head.alg!=='RS256'||!head.kid||payload.aud!==env.FIREBASE_PROJECT_ID||payload.iss!==`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`||!payload.sub||payload.exp<=Date.now()/1000||payload.iat>Date.now()/1000||!payload.auth_time)throw new Error('Недействительный токен');
  const keys=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if(!keys.ok)throw new Error('Не удалось проверить подпись');
  const jwk=(await keys.json()).keys.find(k=>k.kid===head.kid);if(!jwk)throw new Error('Ключ проверки не найден');
  const cryptoKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const good=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',cryptoKey,b64(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if(!good)throw new Error('Подпись токена неверна');
  const profileRes=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/users/${encodeURIComponent(payload.sub)}`,{headers:{authorization:`Bearer ${token}`}});
  if(!profileRes.ok)throw new Error('Нет доступа к профилю');
  const profile=(await profileRes.json()).fields||{};
  if(profile.active?.booleanValue===false)throw new Error('Профиль неактивен');
  const role=profile.role?.stringValue;
  if(!['teacher','student'].includes(role))throw new Error('Недопустимая роль');
  return {uid:payload.sub,role,teacherId:role==='teacher'?payload.sub:profile.createdBy?.stringValue};
}
function cors(origin){return {'access-control-allow-origin':origin||'null','access-control-allow-methods':'GET,PUT,DELETE,OPTIONS','access-control-allow-headers':'Authorization,Content-Type,X-File-Name','vary':'Origin','cache-control':'no-store'};}
export default {async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=origin&&(/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)||/^http:\/\/localhost(?::\d+)?$/i.test(origin)||/^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin));
  const headers=cors(allowed?origin:'');
  if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers});
  if(origin&&!allowed)return json({error:'Источник запроса не разрешён'},403,headers);
  try{
    if(!env.LIBRARY_BUCKET||!env.FIREBASE_PROJECT_ID)return json({error:'Настройте R2 binding и FIREBASE_PROJECT_ID'},503,headers);
    const url=new URL(request.url);if(url.pathname==='/health')return json({ok:true},200,headers);
    const user=await verify((request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,''),env);
    if(url.pathname==='/upload'&&request.method==='PUT'){
      if(user.role!=='teacher')return json({error:'Только учитель может загружать PDF'},403,headers);
      const fileName=request.headers.get('X-File-Name')||'guide.pdf';
      const contentType=request.headers.get('content-type')||'';
      if(contentType.split(';')[0].trim()!=='application/pdf')return json({error:'Нужен PDF'},400,headers);
      const size=Number(request.headers.get('content-length')||0);
      if(size>25*1024*1024)return json({error:'Максимальный размер 25 МБ'},413,headers);
      const bytes=await request.arrayBuffer();
      if(bytes.byteLength>25*1024*1024||bytes.byteLength<5||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'Файл не является PDF или слишком большой'},400,headers);
      const id=crypto.randomUUID();const key=`${user.uid}/${id}.pdf`;
      await env.LIBRARY_BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{name:fileName.slice(0,150)}});
      return json({key,id},201,headers);
    }
    const m=url.pathname.match(/^\/file\/([a-zA-Z0-9_-]+)\/([a-f0-9-]{36})\.pdf$/);
    if(m&&request.method==='GET'){
      if(user.teacherId!==m[1])return json({error:'Доступ запрещён'},403,headers);
      const object=await env.LIBRARY_BUCKET.get(`${m[1]}/${m[2]}.pdf`);
      if(!object)return json({error:'Файл не найден'},404,headers);
      return new Response(object.body,{headers:{...headers,'content-type':'application/pdf','content-disposition':'inline; filename="guide.pdf"','content-length':String(object.size),'x-content-type-options':'nosniff'}});
    }
    if(m&&request.method==='DELETE'){
      if(user.role!=='teacher'||user.uid!==m[1])return json({error:'Доступ запрещён'},403,headers);
      await env.LIBRARY_BUCKET.delete(`${m[1]}/${m[2]}.pdf`);return json({ok:true},200,headers);
    }
    return json({error:'Маршрут не найден'},404,headers);
  }catch(e){return json({error:String(e.message||e)},401,headers);}
}};
