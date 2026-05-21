import { useState, useRef, useEffect } from "react";

const ADMIN_PASSWORD     = "123123";
const GITHUB_OWNER       = "KIZAN3x3";
const GITHUB_REPO        = "banner-maker-v2";
const VERCEL_DEPLOY_HOOK = "https://api.vercel.com/v1/integrations/deploy/prj_J4dUU6AAwHjkqY6EDQIdwzxRKPsP/tjrYEm5kD5";
const RAW_BASE           = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/public`;

const C = {
  g1:"#EB6100", g2:"#F18D00",
  ink:"#18120A", white:"#FFFFFF", cream:"#FAF6F0",
  gray:"#9C8E80", grayL:"#D6CEC4", grayLL:"#EDE7DF",
  dark:"#0F0A05", green:"#22C55E", red:"#EF4444",
  blue:"#4A90D9",
};

const FONTS = [
  { id:"noto_sans",    name:"ゴシック（標準）", family:"'Noto Sans JP'",      weight:"700" },
  { id:"noto_sans_bk", name:"ゴシック（太字）", family:"'Noto Sans JP'",      weight:"900" },
  { id:"noto_serif",   name:"明朝（標準）",     family:"'Noto Serif JP'",     weight:"700" },
  { id:"mplus",        name:"ゴシック（丸め）", family:"'M PLUS 1p'",         weight:"700" },
  { id:"mplus_round",  name:"丸ゴシック",       family:"'M PLUS Rounded 1c'", weight:"700" },
  { id:"shippori",     name:"明朝（上品）",     family:"'Shippori Mincho'",   weight:"700" },
  { id:"zen_mincho",   name:"明朝（格調）",     family:"'Zen Old Mincho'",    weight:"700" },
];

const TEXT_SIZES = { large:120, medium:72, small:40 };

const SNS_SIZES = [
  { id:"reel",    label:"リール・ストーリーズ", w:1080, h:1920 },
  { id:"feed_v",  label:"フィード縦",           w:1080, h:1350 },
  { id:"feed_sq", label:"フィード正方形",        w:1080, h:1080 },
];

const uid = () => Math.random().toString(36).slice(2,9);
const imgCache = {};

async function ghPut(path, base64, message) {
  const res = await fetch(`/api/github?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: base64, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(`PUT失敗 [${res.status}]: ${err.error||""}`);
  }
}

async function ghDelete(path, message) {
  const res = await fetch(`/api/github?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(`DELETE失敗 [${res.status}]: ${err.error||""}`);
  }
}

async function ghGetDir(path) {
  const res = await fetch(`/api/github?path=${encodeURIComponent(path)}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.isDir) return [];
  return data.items || [];
}

async function ghGetContent(path) {
  const res = await fetch(`/api/github?path=${encodeURIComponent(path)}`);
  if (!res.ok) return null;
  return res.json();
}

// ★画像自動圧縮付きtoBase64
function toBase64(file) {
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        const MAX=800;
        let w=img.width, h=img.height;
        if(w>MAX||h>MAX){
          if(w>h){ h=Math.round(h*MAX/w); w=MAX; }
          else { w=Math.round(w*MAX/h); h=MAX; }
        }
        const canvas=document.createElement("canvas");
        canvas.width=w; canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        res(canvas.toDataURL("image/png",0.82).split(",")[1]);
      };
      img.onerror=rej;
      img.src=ev.target.result;
    };
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}

function jsonToB64(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
}

async function loadTemplatesFromGH() {
  const data = await ghGetContent("public/tabs.json");
  if (!data?.content) return [];
  const decoded = decodeURIComponent(
    atob(data.content.replace(/\n/g,""))
      .split("").map(c=>"%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join("")
  );
  const parsed = JSON.parse(decoded);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

async function loadPartsForTab(tabId) {
  const items = await ghGetDir(`public/stamps/${tabId}`);
  return items.filter(f=>f.type==="file" && f.name!=="index.json").map(f=>f.name);
}

async function triggerDeploy() {
  try { await fetch(VERCEL_DEPLOY_HOOK, { method:"POST" }); } catch {}
}

function drawCanvas(canvas, elements, bgImg, W, H, selectedId, CW, CH) {
  if(!canvas)return;
  const r=W/CW;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
  if(bgImg){ ctx.drawImage(bgImg,0,0,W,H); }
  else { const g=ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,"rgb(235,97,0)"); g.addColorStop(1,"rgb(241,141,0)"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  [...elements].sort((a,b)=>a.zIndex-b.zIndex).forEach(el=>{
    if(el.type==="image") drawImageEl(ctx,el,r,selectedId===el.id);
    else drawTextEl(ctx,el,r,selectedId===el.id);
  });
  ctx.restore();
}

function drawTextEl(ctx, el, r, isSelected) {
  const font=FONTS.find(f=>f.id===el.font)||FONTS[0];
  const fontSize=(TEXT_SIZES[el.size]||72)*el.scale*r;
  ctx.save();
  ctx.translate(el.x*r, el.y*r);
  if(el.rotate) ctx.rotate(el.rotate*Math.PI/180);
  ctx.font=`${font.weight} ${fontSize}px ${font.family},sans-serif`;
  const drawLine=(text,x,y)=>{
    if(el.outline){ctx.save();ctx.strokeStyle=el.outlineColor||"#000";ctx.lineWidth=(el.outlineWidth||4)*r;ctx.lineJoin="round";ctx.strokeText(text,x,y);ctx.restore();}
    if(el.shadow){ctx.save();ctx.shadowColor="rgba(0,0,0,0.7)";ctx.shadowOffsetX=2*r;ctx.shadowOffsetY=2*r;ctx.shadowBlur=2*r;ctx.fillStyle=el.color;ctx.fillText(text,x,y);ctx.restore();}
    ctx.fillStyle=el.color; ctx.fillText(text,x,y);
  };
  if(el.vertical){
    ctx.textAlign="center"; ctx.textBaseline="top";
    const chars=el.text.split("");
    const totalH=chars.length*fontSize*1.1;
    chars.forEach((ch,i)=>drawLine(ch,0,-totalH/2+i*fontSize*1.1));
  } else {
    ctx.textAlign="center"; ctx.textBaseline="middle";
    const lines=el.text.split("\n");
    const totalH=lines.length*fontSize*1.3;
    lines.forEach((line,i)=>drawLine(line,0,-totalH/2+(i+0.5)*fontSize*1.3));
  }
  if(isSelected){
    ctx.strokeStyle="rgba(235,97,0,0.9)"; ctx.lineWidth=2/r; ctx.setLineDash([6/r,3/r]);
    ctx.strokeRect(-80/r,-40/r,160/r,80/r); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawImageEl(ctx, el, r, isSelected) {
  if(!el.src)return;
  let img=imgCache[el.src];
  if(!img){ img=new Image(); img.crossOrigin="anonymous"; img.src=el.src; if(img.complete)imgCache[el.src]=img; }
  if(!img.complete)return;
  const w=el.naturalW*el.scale*r, h=el.naturalH*el.scale*r;
  ctx.save();
  ctx.translate(el.x*r,el.y*r);
  if(el.rotate) ctx.rotate(el.rotate*Math.PI/180);
  ctx.drawImage(img,-w/2,-h/2,w,h);
  if(isSelected){ctx.strokeStyle="rgba(235,97,0,0.9)";ctx.lineWidth=2;ctx.setLineDash([6,3]);ctx.strokeRect(-w/2,-h/2,w,h);ctx.setLineDash([]);}
  ctx.restore();
}

export default function Admin() {
  const [authed, setAuthed] = useState(()=>sessionStorage.getItem("bm_admin_auth")==="1");
  const [pw,     setPw]     = useState("");
  const [err,    setErr]    = useState("");

  const login = () => {
    if (pw===ADMIN_PASSWORD) { sessionStorage.setItem("bm_admin_auth","1"); setAuthed(true); }
    else { setErr("パスワードが違います"); setTimeout(()=>setErr(""),1500); }
  };

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:C.dark, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans JP',sans-serif" }}>
      <div style={{ background:C.ink, borderRadius:20, padding:"40px 32px", width:300, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg,${C.g1},${C.g2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:C.white, margin:"0 auto 14px" }}>管理</div>
          <p style={{ margin:0, fontSize:18, fontWeight:700, color:C.white }}>管理者ページ</p>
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="管理者パスワード"
          style={{ width:"100%", padding:"13px 16px", background:"#2A1E12", border:`1.5px solid ${err?C.red:C.grayL}`, borderRadius:10, color:C.white, fontSize:16, fontFamily:"'Noto Sans JP',sans-serif", outline:"none", boxSizing:"border-box" }} />
        {err&&<p style={{ color:C.red, fontSize:12, margin:"6px 0 0", textAlign:"center" }}>{err}</p>}
        <button onClick={login} style={{ width:"100%", marginTop:14, padding:"14px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:15, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer" }}>ログイン</button>
      </div>
      <style>{`input::placeholder{color:#5A4A38} *{box-sizing:border-box}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.cream, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, paddingBottom:60 }}>
      <header style={{ background:C.ink, height:56, display:"flex", alignItems:"center", padding:"0 16px", gap:12, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.g1},${C.g2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:C.white }}>管理</div>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.white, flex:1 }}>バナーメーカー管理者</p>
        <a href="/" style={{ fontSize:12, color:C.gray, textDecoration:"none" }}>← アプリへ</a>
      </header>
      <TemplateAdmin />
      <style>{`*{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} input::placeholder{color:#C0B8B0} textarea::placeholder{color:#C0B8B0}`}</style>
    </div>
  );
}

function TemplateAdmin() {
  const [templates, setTemplates] = useState(null);
  const [mode,      setMode]      = useState("list");
  const [editTarget,setEditTarget]= useState(null);
  const [loadErr,   setLoadErr]   = useState("");
  const [reordering,setReordering]= useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");

  useEffect(()=>{ reload(); },[]);

  const reload = async () => {
    setLoadErr("");
    try { setTemplates(await loadTemplatesFromGH()); }
    catch(e) { setLoadErr("読み込みエラー: "+e.message); setTemplates([]); }
  };

  // ★テンプレート並び替え
  const moveTemplate = (idx, dir) => {
    setTemplates(prev=>{
      const arr=[...prev];
      if(dir==="up"&&idx>0){ const tmp=arr[idx]; arr[idx]=arr[idx-1]; arr[idx-1]=tmp; }
      else if(dir==="down"&&idx<arr.length-1){ const tmp=arr[idx]; arr[idx]=arr[idx+1]; arr[idx+1]=tmp; }
      return arr;
    });
  };

  const saveOrder = async () => {
    setReordering(true); setSaveMsg("保存中...");
    try {
      await ghPut("public/tabs.json", jsonToB64(templates), "Reorder templates");
      await triggerDeploy();
      setSaveMsg("✅ 順番を保存しました！");
    } catch(e) { setSaveMsg("エラー: "+e.message); }
    setReordering(false);
    setTimeout(()=>setSaveMsg(""), 3000);
  };

  const handleDelete = async (tmpl) => {
    if (!confirm(`「${tmpl.label}」を削除しますか？`)) return;
    try {
      const current = await loadTemplatesFromGH();
      const updated = current.filter(t=>t.id!==tmpl.id);
      await ghPut("public/tabs.json", jsonToB64(updated), `Delete template: ${tmpl.label}`);
      try { await ghDelete(`public/${tmpl.bg.replace(/^\//,"")}`, `Delete bg`); } catch {}
      try { await ghDelete(`public/${tmpl.sample.replace(/^\//,"")}`, `Delete sample`); } catch {}
      try {
        const parts = await loadPartsForTab(tmpl.id);
        for (const name of parts) await ghDelete(`public/stamps/${tmpl.id}/${name}`, `Delete part`);
        await ghDelete(`public/stamps/${tmpl.id}/index.json`, `Delete parts index`);
      } catch {}
      try { await ghDelete(`public/templates/${tmpl.id}/template.json`, `Delete template`); } catch {}
      await triggerDeploy();
      setTemplates(updated);
    } catch(e) { alert("削除エラー: "+e.message); }
  };

  if (templates===null) return <div style={{ textAlign:"center", padding:60 }}><Spinner size={36}/></div>;

  if (mode==="create") return (
    <TemplateWizard
      onDone={(newTmpl)=>{ setTemplates(prev=>[...(prev||[]),newTmpl]); setMode("list"); }}
      onCancel={()=>setMode("list")}
    />
  );

  if (mode==="edit"&&editTarget) return (
    <TemplateEditor
      tmpl={editTarget}
      onDone={(updated)=>{ setTemplates(prev=>prev.map(t=>t.id===updated.id?updated:t)); setMode("list"); }}
      onCancel={()=>setMode("list")}
    />
  );

  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>
      {loadErr&&<p style={{ color:C.red, fontSize:12, marginBottom:12, background:"#FEF2F2", padding:"10px 14px", borderRadius:8 }}>⚠️ {loadErr}</p>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <p style={{ margin:0, fontSize:16, fontWeight:700 }}>テンプレート一覧（{templates.length}件）</p>
        <button onClick={()=>setMode("create")}
          style={{ padding:"10px 20px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:10, color:C.white, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          ＋ テンプレを追加
        </button>
      </div>

      {templates.length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:C.gray }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <p style={{ fontSize:14, fontWeight:700 }}>テンプレートがありません</p>
          <p style={{ fontSize:12 }}>「テンプレを追加」から作成してください</p>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
            {templates.map((tmpl,idx)=>(
              <div key={tmpl.id} style={{ background:C.white, borderRadius:14, border:`1px solid ${C.grayLL}`, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <img src={`${RAW_BASE}${tmpl.sample}?t=${tmpl.id}`} alt=""
                  onError={e=>e.target.style.visibility="hidden"}
                  style={{ width:44, height:60, objectFit:"cover", borderRadius:8, border:`1px solid ${C.grayLL}`, flexShrink:0, background:C.grayLL }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tmpl.label}</p>
                  <p style={{ margin:"3px 0 0", fontSize:11, color:C.gray }}>
                    {SNS_SIZES.find(s=>s.w===tmpl.w&&s.h===tmpl.h)?.label||"カスタム"}　{tmpl.w}×{tmpl.h}px
                  </p>
                </div>
                {/* ★並び替えボタン */}
                <button onClick={()=>moveTemplate(idx,"up")} disabled={idx===0}
                  style={{ padding:"5px 9px", background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:7, color:idx===0?C.grayL:C.ink, fontSize:12, cursor:idx===0?"default":"pointer", flexShrink:0 }}>↑</button>
                <button onClick={()=>moveTemplate(idx,"down")} disabled={idx===templates.length-1}
                  style={{ padding:"5px 9px", background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:7, color:idx===templates.length-1?C.grayL:C.ink, fontSize:12, cursor:idx===templates.length-1?"default":"pointer", flexShrink:0 }}>↓</button>
                <button onClick={()=>{ setEditTarget(tmpl); setMode("edit"); }}
                  style={{ padding:"7px 14px", background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:8, color:C.ink, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
                  編集
                </button>
                <button onClick={()=>handleDelete(tmpl)}
                  style={{ padding:"7px 12px", background:"none", border:`1px solid ${C.red}`, borderRadius:8, color:C.red, fontSize:12, cursor:"pointer", flexShrink:0 }}>
                  削除
                </button>
              </div>
            ))}
          </div>
          {/* ★順番保存ボタン */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={saveOrder} disabled={reordering}
              style={{ padding:"10px 20px", background:reordering?C.grayL:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:10, color:C.white, fontSize:13, fontWeight:700, cursor:reordering?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8 }}>
              {reordering?<><Spinner size={14} color={C.white}/>保存中...</>:"✦ 並び順を保存する"}
            </button>
            {saveMsg&&<span style={{ fontSize:12, color:saveMsg.startsWith("✅")?C.green:C.red }}>{saveMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function TemplateWizard({ onDone, onCancel }) {
  const [step,       setStep]       = useState(1);
  const [label,      setLabel]      = useState("");
  const [sizeId,     setSizeId]     = useState("reel");
  const [sampleFile, setSampleFile] = useState(null);
  const [samplePrev, setSamplePrev] = useState(null);
  const [bgFile,     setBgFile]     = useState(null);
  const [bgPrev,     setBgPrev]     = useState(null);
  const [elements,   setElements]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState("");

  const size = SNS_SIZES.find(s=>s.id===sizeId)||SNS_SIZES[0];

  const goStep2 = () => {
    if (!label.trim())  { setMsg("テンプレート名を入力してください"); return; }
    if (!sampleFile)    { setMsg("お手本画像を選択してください"); return; }
    if (!bgFile)        { setMsg("背景画像を選択してください"); return; }
    setMsg(""); setStep(2);
  };

  const save = async () => {
    setSaving(true); setMsg("保存中...");
    try {
      const tabId  = "tab_" + Date.now();
      const bgName = `bg_${tabId}.png`;
      const smName = `sample_${tabId}.png`;
      setMsg("① 背景画像をアップロード中...");
      await ghPut(`public/${bgName}`, await toBase64(bgFile), `Add bg: ${label}`);
      setMsg("② お手本画像をアップロード中...");
      await ghPut(`public/${smName}`, await toBase64(sampleFile), `Add sample: ${label}`);
      setMsg("③ パーツフォルダを初期化中...");
      await ghPut(`public/stamps/${tabId}/index.json`, btoa(unescape(encodeURIComponent(JSON.stringify([])))), `Init parts: ${label}`);
      setMsg("④ テンプレートを保存中...");
      await ghPut(`public/templates/${tabId}/template.json`, jsonToB64({ elements }), `Save template: ${label}`);
      setMsg("⑤ タブ情報を保存中...");
      const currentTabs = await loadTemplatesFromGH();
      const newTmpl = { id:tabId, label:label.trim(), bg:`/${bgName}`, sample:`/${smName}`, w:size.w, h:size.h };
      await ghPut("public/tabs.json", jsonToB64([...currentTabs, newTmpl]), `Add template: ${label}`);
      await triggerDeploy();
      setMsg("✅ 登録しました！");
      setTimeout(()=>onDone(newTmpl), 800);
    } catch(e) { setMsg("エラー: "+e.message); setSaving(false); }
  };

  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
        <button onClick={onCancel} style={{ background:"none", border:"none", color:C.gray, fontSize:13, cursor:"pointer", padding:0 }}>← 戻る</button>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:4 }}>
          {[1,2].map(n=>(
            <div key={n} style={{ display:"flex", alignItems:"center", gap:4, flex:1 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:step>=n?C.g1:C.grayLL, color:step>=n?C.white:C.gray, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{n}</div>
              <span style={{ fontSize:11, color:step>=n?C.g1:C.gray, fontWeight:step===n?700:400 }}>{n===1?"基本情報":"レイヤー編集"}</span>
              {n<2&&<div style={{ flex:1, height:2, background:step>n?C.g1:C.grayLL, borderRadius:1 }} />}
            </div>
          ))}
        </div>
      </div>

      {step===1&&(
        <div style={{ background:C.white, borderRadius:16, padding:"20px", border:`1px solid ${C.grayLL}`, animation:"fadeUp 0.2s ease" }}>
          <p style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>Step1：基本情報を入力</p>
          <label style={LS}>テンプレート名</label>
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="例：街頭演説バナー" style={IS} />
          <label style={LS}>SNSサイズ</label>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {SNS_SIZES.map(s=>(
              <button key={s.id} onClick={()=>setSizeId(s.id)} style={{ padding:"8px 12px", background:sizeId===s.id?C.ink:C.cream, border:`1px solid ${sizeId===s.id?C.ink:C.grayL}`, borderRadius:8, color:sizeId===s.id?C.white:C.ink, fontSize:12, fontWeight:sizeId===s.id?700:400, cursor:"pointer" }}>
                {s.label}<br/><span style={{ fontSize:10, opacity:0.7 }}>{s.w}×{s.h}</span>
              </button>
            ))}
          </div>
          <label style={LS}>① お手本画像（完成イメージ）</label>
          <DropZone preview={samplePrev} onFile={f=>{ setSampleFile(f); setSamplePrev(URL.createObjectURL(f)); }} label="お手本画像をドロップ / タップして選択" />
          <label style={{ ...LS, marginTop:12 }}>② 背景画像（ベース）</label>
          <DropZone preview={bgPrev} onFile={f=>{ setBgFile(f); setBgPrev(URL.createObjectURL(f)); }} label="背景画像をドロップ / タップして選択" />
          {msg&&<p style={{ color:C.red, fontSize:12, margin:"10px 0 0" }}>{msg}</p>}
          <button onClick={goStep2} style={{ width:"100%", marginTop:16, padding:"14px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            次へ → レイヤー編集
          </button>
        </div>
      )}

      {step===2&&(
        <LayerEditor
          bgDataUrl={bgPrev} bgPath={null} sampleUrl={samplePrev}
          canvasW={size.w} canvasH={size.h}
          elements={elements} setElements={setElements}
          saving={saving} msg={msg}
          onBack={()=>setStep(1)} onSave={save}
          saveLabel="✦ テンプレートとして登録する"
        />
      )}
    </div>
  );
}

function TemplateEditor({ tmpl, onDone, onCancel }) {
  const [step,      setStep]      = useState(1);
  const [label,     setLabel]     = useState(tmpl.label);
  const [sampleFile,setSampleFile]= useState(null);
  const [samplePrev,setSamplePrev]= useState(null);
  const [bgFile,    setBgFile]    = useState(null);
  const [bgPrev,    setBgPrev]    = useState(null);
  const [elements,  setElements]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const data = await ghGetContent(`public/templates/${tmpl.id}/template.json`);
        if (data?.content) {
          const decoded = decodeURIComponent(atob(data.content.replace(/\n/g,"")).split("").map(c=>"%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join(""));
          const parsed = JSON.parse(decoded);
          if (parsed?.elements) setElements(parsed.elements);
        }
      } catch {}
      setLoading(false);
    })();
  },[tmpl.id]);

  const goStep2 = () => { setMsg(""); setStep(2); };

  const save = async () => {
    setSaving(true); setMsg("保存中...");
    try {
      if (sampleFile) await ghPut(`public/${tmpl.sample.replace(/^\//,"")}`, await toBase64(sampleFile), `Update sample: ${label}`);
      if (bgFile)     await ghPut(`public/${tmpl.bg.replace(/^\//,"")}`,     await toBase64(bgFile),     `Update bg: ${label}`);
      await ghPut(`public/templates/${tmpl.id}/template.json`, jsonToB64({ elements }), `Update template: ${label}`);
      const updatedTmpl = { ...tmpl, label:label.trim() };
      const current = await loadTemplatesFromGH();
      await ghPut("public/tabs.json", jsonToB64(current.map(t=>t.id===tmpl.id?updatedTmpl:t)), `Update template: ${label}`);
      await triggerDeploy();
      setMsg("✅ 更新しました！");
      setTimeout(()=>onDone(updatedTmpl), 800);
    } catch(e) { setMsg("エラー: "+e.message); setSaving(false); }
  };

  if (loading) return <div style={{ textAlign:"center", padding:60 }}><Spinner size={36}/></div>;

  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
        <button onClick={step===2?()=>setStep(1):onCancel} style={{ background:"none", border:"none", color:C.gray, fontSize:13, cursor:"pointer", padding:0 }}>← 戻る</button>
        <p style={{ margin:0, fontSize:15, fontWeight:700, flex:1 }}>「{tmpl.label}」を編集</p>
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {[["1","基本情報"],["2","レイヤー編集"]].map(([n,lbl])=>(
          <button key={n} onClick={()=>Number(n)===2?goStep2():setStep(1)}
            style={{ flex:1, padding:"8px", background:step===Number(n)?C.ink:C.cream, border:`1px solid ${step===Number(n)?C.ink:C.grayL}`, borderRadius:8, color:step===Number(n)?C.white:C.gray, fontSize:12, fontWeight:step===Number(n)?700:400, cursor:"pointer" }}>
            {n}. {lbl}
          </button>
        ))}
      </div>

      {step===1&&(
        <div style={{ background:C.white, borderRadius:16, padding:"20px", border:`1px solid ${C.grayLL}`, animation:"fadeUp 0.2s ease" }}>
          <label style={LS}>テンプレート名</label>
          <input value={label} onChange={e=>setLabel(e.target.value)} style={IS} />
          <label style={LS}>お手本画像を差し替え（任意）</label>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
            <img src={`${RAW_BASE}${tmpl.sample}?t=${Date.now()}`} alt=""
              style={{ width:48, height:68, objectFit:"cover", borderRadius:6, border:`1px solid ${C.grayLL}`, background:C.grayLL, flexShrink:0 }} />
            <div style={{ flex:1 }}><DropZone preview={samplePrev} onFile={f=>{ setSampleFile(f); setSamplePrev(URL.createObjectURL(f)); }} label="新しい画像を選択" /></div>
          </div>
          <label style={LS}>背景画像を差し替え（任意）</label>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
            <img src={`${RAW_BASE}${tmpl.bg}?t=${Date.now()}`} alt=""
              style={{ width:48, height:68, objectFit:"cover", borderRadius:6, border:`1px solid ${C.grayLL}`, background:C.grayLL, flexShrink:0 }} />
            <div style={{ flex:1 }}><DropZone preview={bgPrev} onFile={f=>{ setBgFile(f); setBgPrev(URL.createObjectURL(f)); }} label="新しい画像を選択" /></div>
          </div>
          <button onClick={goStep2} style={{ width:"100%", padding:"13px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            次へ → レイヤー編集
          </button>
        </div>
      )}

      {step===2&&(
        <LayerEditor
          bgDataUrl={bgPrev} bgPath={`${RAW_BASE}${tmpl.bg}`}
          sampleUrl={samplePrev || `${RAW_BASE}${tmpl.sample}`}
          canvasW={tmpl.w||1080} canvasH={tmpl.h||1920}
          elements={elements} setElements={setElements}
          saving={saving} msg={msg}
          onBack={()=>setStep(1)} onSave={save}
          saveLabel="✦ 更新して保存する"
        />
      )}
    </div>
  );
}

function LayerEditor({ bgDataUrl, bgPath, sampleUrl, canvasW, canvasH, elements, setElements, saving, msg, onBack, onSave, saveLabel }) {
  const [selected, setSelected] = useState(null);
  const [editing,  setEditing]  = useState(null);
  const [bgImg,    setBgImg]    = useState(null);

  const canvasRef   = useRef(null);
  const dragging    = useRef(null);
  const pinchRef    = useRef({ lastDist:null });
  const lastTap     = useRef(0);
  const imgInputRef = useRef();

  const CW = canvasW || 1080;
  const CH = canvasH || 1920;
  const PW = Math.min(typeof window!=="undefined"?window.innerWidth-48:400, 480);
  const PH = Math.round(PW*CH/CW);
  const R  = PW/CW;

  useEffect(()=>{
    const src = bgDataUrl || bgPath;
    if (!src) return;
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.onload = ()=>setBgImg(bg);
    bg.src = src+(bgPath?`?t=${Date.now()}`:"");
  },[bgDataUrl, bgPath]);

  useEffect(()=>{
    if(!canvasRef.current)return;
    canvasRef.current.width=PW;
    canvasRef.current.height=PH;
    drawCanvas(canvasRef.current, elements, bgImg, PW, PH, selected, CW, CH);
  },[elements, bgImg, selected, PW, PH, CW, CH]);

  const getXY = (cx,cy)=>{
    if(!canvasRef.current)return{x:0,y:0};
    const rect=canvasRef.current.getBoundingClientRect();
    return{x:(cx-rect.left)/R, y:(cy-rect.top)/R};
  };

  // ★ダブルクリックでテキスト編集
  const onDoubleClick = (e)=>{
  const{x,y}=getXY(e.clientX,e.clientY);
  console.log("dblclick", x, y, elements.map(el=>({id:el.id,type:el.type,x:el.x,y:el.y})));
  const sorted=[...elements].filter(el=>el&&el.type==="text"&&!el.locked).sort((a,b)=>b.zIndex-a.zIndex);
  for(const el of sorted){
    const dist=Math.sqrt(Math.pow(x-el.x,2)+Math.pow(y-el.y,2));
    if(dist<500/R){
      setSelected(el.id); setEditing(el.id); return;
    }
  }
};

  const onMouseDown = (e)=>{
    if(!selected)return;
    const el=elements.find(el=>el.id===selected); if(!el)return;
    const{x,y}=getXY(e.clientX,e.clientY);
    dragging.current={id:el.id,startX:x,startY:y,origX:el.x,origY:el.y};
  };
  const onMouseMove = (e)=>{
    if(!dragging.current)return;
    const{x,y}=getXY(e.clientX,e.clientY);
    setElements(els=>els.map(el=>el.id===dragging.current.id?{...el,x:dragging.current.origX+(x-dragging.current.startX),y:dragging.current.origY+(y-dragging.current.startY)}:el));
  };
  const onMouseUp = ()=>{ dragging.current=null; };

  const onTouchStart = (e)=>{
    if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      pinchRef.current.lastDist=Math.sqrt(dx*dx+dy*dy);
    } else {
      const now=Date.now();
      if(now-lastTap.current<300){
        onDoubleClick({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});
      }
      lastTap.current=now;
      onMouseDown({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});
    }
  };
  const onTouchMove = (e)=>{
    e.preventDefault();
    if(e.touches.length===2&&selected){
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(pinchRef.current.lastDist){
        const ratio=dist/pinchRef.current.lastDist;
        setElements(els=>els.map(el=>el.id===selected?{...el,scale:Math.min(Math.max(el.scale*ratio,0.05),10)}:el));
      }
      pinchRef.current.lastDist=dist;
    } else onMouseMove({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});
  };
  const onTouchEnd = ()=>{ pinchRef.current.lastDist=null; onMouseUp(); };

  const updateEl = (id,patch)=>setElements(e=>e.map(el=>el.id===id?{...el,...patch}:el));
  const deleteEl = (id)=>{ setElements(e=>e.filter(el=>el.id!==id)); if(selected===id){setSelected(null);setEditing(null);} if(inlineEdit?.id===id)setInlineEdit(null); };
  const duplicateEl = (id)=>{
    const el=elements.find(el=>el.id===id); if(!el)return;
    const newEl={...JSON.parse(JSON.stringify(el)), id:uid(), x:el.x+30, y:el.y+30, zIndex:elements.length};
    setElements(e=>[...e,newEl]); setSelected(newEl.id);
  };
  const moveLayer = (id,dir)=>{
    setElements(e=>{
      const arr=[...e].sort((a,b)=>a.zIndex-b.zIndex);
      const idx=arr.findIndex(el=>el.id===id);
      if(dir==="up"&&idx<arr.length-1){ const tmp=arr[idx]; arr[idx]=arr[idx+1]; arr[idx+1]=tmp; }
      else if(dir==="down"&&idx>0){ const tmp=arr[idx]; arr[idx]=arr[idx-1]; arr[idx-1]=tmp; }
      return arr.map((el,i)=>({...el,zIndex:i}));
    });
  };

  const addTextEl = ()=>{
    const el={ id:uid(), type:"text", text:"テキストを入力", font:"noto_sans", size:"medium", color:"#FFFFFF", vertical:false, shadow:false, outline:false, outlineColor:"#000000", outlineWidth:4, glow:false, glowColor:"#FF6600", x:CW/2, y:CH/2, scale:1, rotate:0, zIndex:elements.length, locked:false };
    setElements(e=>[...e,el]); setSelected(el.id); setEditing(el.id);
  };

  const addImageEl = (file)=>{
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const MAX=800;
      let w=img.width, h=img.height;
      if(w>MAX||h>MAX){ if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;} }
      const canvas=document.createElement("canvas");
      canvas.width=w; canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      const src=canvas.toDataURL("image/png",0.82);
      const el={ id:uid(), type:"image", src, naturalW:w, naturalH:h, x:CW/2, y:CH/2, scale:0.3, rotate:0, zIndex:elements.length, locked:false };
      setElements(e=>[...e,el]); setSelected(el.id);
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
};

  const sortedEls = [...elements].sort((a,b)=>b.zIndex-a.zIndex);

  return (
    <div style={{ animation:"fadeUp 0.2s ease" }}>
      <p style={{ margin:"0 0 10px", fontSize:12, color:C.gray, textAlign:"center" }}>
        ドラッグで移動　ピンチで拡縮　ダブルクリックでテキスト編集　🔒固定にするとユーザーが操作できません
      </p>

      {sampleUrl&&(
        <div style={{ marginBottom:12, background:C.white, borderRadius:10, border:`1px solid ${C.grayLL}`, overflow:"hidden" }}>
          <p style={{ margin:0, padding:"6px 12px", fontSize:11, color:C.gray, background:C.cream, borderBottom:`1px solid ${C.grayLL}` }}>📌 お手本（参考）</p>
          <div style={{ padding:8, display:"flex", justifyContent:"center" }}>
            <img src={sampleUrl} style={{ maxHeight:180, maxWidth:"100%", objectFit:"contain", borderRadius:6, display:"block" }} />
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
        <div style={{ border:`2px solid ${selected?C.g1:C.grayL}`, borderRadius:6, overflow:"hidden", boxShadow:`0 6px 24px rgba(0,0,0,0.15)` }}>
          <canvas ref={canvasRef} width={PW} height={PH}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onDoubleClick={onDoubleClick}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{ display:"block", cursor:selected?"grab":"default", touchAction:"none", userSelect:"none" }} />
        </div>
      </div>
      <p style={{ textAlign:"center", fontSize:10, color:C.gray, marginBottom:12 }}>
        {selected?"ドラッグで移動　ピンチで拡縮":"↓ レイヤーを選んで操作"}
      </p>

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={addTextEl} style={{ flex:1, padding:"10px", background:C.g1, border:"none", borderRadius:9, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer" }}>＋ テキスト</button>
        <label style={{ flex:1, padding:"10px", background:C.blue, border:"none", borderRadius:9, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"center" }}>
          ＋ 画像
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0])addImageEl(e.target.files[0]); e.target.value=""; }} />
        </label>
      </div>

      {elements.length===0 ? (
        <div style={{ textAlign:"center", padding:"20px", color:C.gray, fontSize:12, background:C.white, borderRadius:12, border:`1px solid ${C.grayLL}`, marginBottom:14 }}>
          レイヤーがありません。上のボタンで追加してください。
        </div>
      ) : (
        <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.grayLL}`, overflow:"hidden", marginBottom:14 }}>
          <p style={{ margin:0, padding:"8px 12px", fontSize:11, fontWeight:700, color:C.gray, background:C.cream, borderBottom:`1px solid ${C.grayLL}` }}>レイヤー構成（上が前面）</p>
          {sortedEls.map((el,idx)=>{
            const isLocked = el.locked===true;
            const isSel = selected===el.id;
            return (
              <div key={el.id} style={{ borderBottom:idx<sortedEls.length-1?`1px solid ${C.grayLL}`:"none" }}>
                <div onClick={()=>{ setSelected(el.id); setEditing(null); }}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 12px", background:isSel?`${C.g1}10`:C.white, cursor:"pointer" }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{el.type==="text"?"✏️":"🖼"}</span>
                  <span style={{ flex:1, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:isSel?C.g1:C.ink, fontWeight:isSel?700:400 }}>
                    {el.type==="text"?el.text:"画像"}
                  </span>
                  <button onClick={e=>{e.stopPropagation();updateEl(el.id,{locked:!isLocked});}}
                    style={{ flexShrink:0, padding:"3px 8px", background:isLocked?"#1E3A5F":"#E8F5E9", border:`1px solid ${isLocked?"#2563EB":"#4CAF50"}`, borderRadius:7, color:isLocked?"#60A5FA":"#2E7D32", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    {isLocked?"🔒 固定":"✏️ 編集可"}
                  </button>
                  {isSel&&el.type==="text"&&(
                    <button onClick={e=>{e.stopPropagation();setEditing(v=>v===el.id?null:el.id);}}
                      style={{ flexShrink:0, padding:"3px 8px", background:C.g1, border:"none", borderRadius:7, color:C.white, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                      {editing===el.id?"閉じる":"テキスト編集"}
                    </button>
                  )}
                  <button onClick={e=>{e.stopPropagation();duplicateEl(el.id);}} style={SB(C.blue)}>複製</button>
                  <button onClick={e=>{e.stopPropagation();moveLayer(el.id,"up");}}   style={SB()}>↑</button>
                  <button onClick={e=>{e.stopPropagation();moveLayer(el.id,"down");}} style={SB()}>↓</button>
                  <button onClick={e=>{e.stopPropagation();if(confirm("削除？"))deleteEl(el.id);}} style={SB(C.red)}>✕</button>
                </div>

                {isSel&&(
                  <div style={{ padding:"8px 14px 10px", background:`${C.g1}06`, borderTop:`1px solid ${C.grayLL}`, display:"flex", flexDirection:"column", gap:6 }}>
                    <SliderRow label="🔄 回転" min={-180} max={180} value={el.rotate||0} onChange={v=>updateEl(el.id,{rotate:v})} unit="°" onReset={()=>updateEl(el.id,{rotate:0})} />
                    <SliderRow label="⤢ サイズ" min={0.05} max={10} step={0.01} value={el.scale||1} onChange={v=>updateEl(el.id,{scale:v})} unit="%" display={Math.round((el.scale||1)*100)} onReset={()=>updateEl(el.id,{scale:1})} />
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1 }}>
                        <label style={{ fontSize:10, color:C.gray }}>X座標</label>
                        <input type="number" value={Math.round(el.x)} onChange={e=>updateEl(el.id,{x:Number(e.target.value)})}
                          style={{ width:"100%", padding:"4px 8px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:6, fontSize:12, color:C.ink, outline:"none" }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={{ fontSize:10, color:C.gray }}>Y座標</label>
                        <input type="number" value={Math.round(el.y)} onChange={e=>updateEl(el.id,{y:Number(e.target.value)})}
                          style={{ width:"100%", padding:"4px 8px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:6, fontSize:12, color:C.ink, outline:"none" }} />
                      </div>
                    </div>
                  </div>
                )}

                {editing===el.id&&el.type==="text"&&(
                  <div style={{ padding:"12px 14px", background:`${C.g1}08`, borderTop:`1px solid ${C.g1}30`, animation:"fadeUp 0.15s ease" }}>
                    <label style={LS}>テキスト内容</label>
                    <textarea value={el.text} onChange={e=>updateEl(el.id,{text:e.target.value})}
                      style={{ width:"100%", minHeight:60, padding:"8px 10px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:8, fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, resize:"vertical", outline:"none", marginBottom:10 }} />
                    <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                      <div style={{ flex:1 }}>
                        <label style={LS}>フォント</label>
                        <select value={el.font} onChange={e=>updateEl(el.id,{font:e.target.value})} style={IS2}>
                          {FONTS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={LS}>サイズ</label>
                        <select value={el.size} onChange={e=>updateEl(el.id,{size:e.target.value})} style={IS2}>
                          <option value="large">大</option>
                          <option value="medium">中</option>
                          <option value="small">小</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <label style={{ ...LS, marginBottom:0 }}>文字色</label>
                      <input type="color" value={el.color} onChange={e=>updateEl(el.id,{color:e.target.value})} style={{ width:40, height:32, borderRadius:6, border:`1px solid ${C.grayL}`, cursor:"pointer", padding:2 }} />
                      <span style={{ fontSize:11, color:C.gray }}>{el.color}</span>
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                      {[["vertical","縦組み"],["shadow","シャドウ"],["outline","縁取り"]].map(([k,lbl])=>(
                        <label key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                          <input type="checkbox" checked={!!el[k]} onChange={e=>updateEl(el.id,{[k]:e.target.checked})} />{lbl}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {msg&&<p style={{ margin:"0 0 10px", fontSize:12, color:msg.startsWith("✅")?C.green:msg.startsWith("エラー")?C.red:C.g1, textAlign:"center" }}>{msg}</p>}

      <button onClick={onSave} disabled={saving}
        style={{ width:"100%", padding:"15px", background:saving?C.grayL:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:14, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:saving?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {saving?<><Spinner size={16} color={C.white}/>保存中...</>:saveLabel}
      </button>
    </div>
  );
}

function SliderRow({ label, min, max, step=1, value, onChange, unit, display, onReset }) {
  const isPercent = unit === "%";
  const shownVal = isPercent ? Math.round(value * 100) : (display !== undefined ? display : value);

  const handleInput = (raw) => {
    const n = Number(raw);
    if (isNaN(n)) return;
    const actual = isPercent ? Math.min(Math.max(n / 100, min), max) : Math.min(Math.max(n, min), max);
    onChange(actual);
  };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <span style={{ fontSize:11, color:C.gray, width:56, flexShrink:0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))} style={{ flex:1, accentColor:C.g1 }} />
      <input type="number"
        value={shownVal}
        min={isPercent ? Math.round(min*100) : min}
        max={isPercent ? Math.round(max*100) : max}
        step={isPercent ? 1 : step}
        onChange={e=>handleInput(e.target.value)}
        style={{ width:54, padding:"3px 6px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:6, fontSize:11, color:C.ink, outline:"none", textAlign:"right" }} />
      <span style={{ fontSize:11, color:C.gray, flexShrink:0 }}>{unit}</span>
      <button onClick={onReset} style={{ padding:"2px 6px", background:"none", border:`1px solid ${C.grayL}`, borderRadius:5, fontSize:10, color:C.gray, cursor:"pointer", flexShrink:0 }}>R</button>
    </div>
  );
}

function DropZone({ preview, onFile, label }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  return (
    <div onDragOver={e=>{ e.preventDefault(); setDrag(true); }} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{ e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f&&f.type.startsWith("image/"))onFile(f); }}
      onClick={()=>ref.current.click()}
      style={{ border:`2px dashed ${drag?C.g1:C.grayL}`, borderRadius:10, padding:18, background:drag?`${C.g1}08`:C.cream, cursor:"pointer", textAlign:"center", transition:"all 0.2s", marginBottom:4 }}>
      {preview ? <img src={preview} style={{ maxWidth:"100%", maxHeight:120, objectFit:"contain", borderRadius:6 }} />
               : <p style={{ margin:0, fontSize:12, color:C.gray }}>{label}</p>}
      <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0])onFile(e.target.files[0]); e.target.value=""; }} />
    </div>
  );
}

const LS  = { display:"block", fontSize:11, fontWeight:700, color:C.gray, marginBottom:5 };
const IS  = { width:"100%", padding:"10px 12px", marginBottom:14, background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:8, fontSize:14, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, outline:"none" };
const IS2 = { width:"100%", padding:"8px 10px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:7, fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, outline:"none" };
const SB  = (bg=C.grayL) => ({ padding:"4px 8px", background:bg, border:"none", borderRadius:5, color:bg===C.grayL?C.ink:C.white, fontSize:10, cursor:"pointer", flexShrink:0 });

function Spinner({ size=20, color=C.g1 }) {
  return <div style={{ width:size, height:size, flexShrink:0, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />;
}
