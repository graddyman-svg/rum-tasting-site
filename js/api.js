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
async function submitReview(payload){return request('reviews',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});}
function el(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;}
function picture(rum){const img=document.createElement('img');img.alt=rum.name+' のボトル写真';img.loading='lazy';img.onerror=()=>{img.replaceWith(el('div','no-photo','写真準備中'));};if(rum.image_path)img.src=rum.image_path;else return el('div','no-photo','写真準備中');return img;}
