const cfg = window.APP_CONFIG;
const ready = cfg && /^https:\/\/[^/]+\.supabase\.co$/.test(cfg.SUPABASE_URL) && !cfg.SUPABASE_URL.includes('YOUR_PROJECT') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith('YOUR_');
function apiHeaders(extra={}) {return {'apikey':cfg.SUPABASE_ANON_KEY,'Authorization':'Bearer '+cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json',...extra};}
async function request(path,options={}) {
  if(!ready) throw new Error('js/config.js にSupabase接続情報を設定してください。');
  const response=await fetch(cfg.SUPABASE_URL+'/rest/v1/'+path,{...options,headers:apiHeaders(options.headers||{})});
  if(!response.ok){let detail=await response.text();throw new Error('通信エラー '+response.status+' '+detail.slice(0,200));}
  if(response.status===204)return null;
  return response.json();
}
async function getRums(){return request('rums?select=*&is_published=eq.true&order=id.asc');}
async function getRum(id){const rows=await request('rums?select=*&id=eq.'+encodeURIComponent(id)+'&is_published=eq.true&limit=1');return rows[0]||null;}
async function getReviews(id){return request('published_reviews?select=nickname,dryness,body,oak_note,fruit_note,spice_note,preference_note,created_at&rum_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=1000');}
async function submitReview(payload){
  if(!ready) throw new Error('js/config.js にSupabase接続情報を設定してください。');
  const response = await fetch(cfg.SUPABASE_URL + '/functions/v1/submit-review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': cfg.SUPABASE_ANON_KEY
    },
    body: JSON.stringify(payload)
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('投稿サーバーからの応答を読み取れませんでした。'); }
  if (!response.ok) {
    if (response.status === 429) throw new Error('24時間の投稿上限に達しました。時間をおいてお試しください。');
    if (result?.error === 'IP_UNAVAILABLE') throw new Error('投稿元IPの検証が未設定です。管理者にお問い合わせください。');
    if (result?.error === 'FORBIDDEN_ORIGIN') throw new Error('投稿元サイトの許可設定を確認してください。');
    throw new Error('投稿エラー (' + response.status + '): ' + (result?.error || '送信できませんでした'));
  }
  if (result?.success !== true) throw new Error('投稿の受付を確認できませんでした。');
  return result;
}
function el(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;}
function picture(rum){const img=document.createElement('img');img.alt=rum.name+' のボトル写真';img.loading='lazy';img.onerror=()=>{img.replaceWith(el('div','no-photo','写真準備中'));};if(rum.image_path)img.src=rum.image_path;else return el('div','no-photo','写真準備中');return img;}
