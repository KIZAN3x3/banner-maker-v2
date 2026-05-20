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

// ── GitHub API ────────────────────────────────────────────
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

function toBase64(file) {
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
}

function jsonToB64(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
}

async function loadTabsFromGH() {
  const data = await ghGetContent("public/tabs.json");
  if (!data?.content) return [];
  const decoded = decodeURIComponent(
    atob(data.content.replace(/\n/g,""))
      .split("").map(c=>"%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join("")
  );
  const parsed = JSON.parse(decoded);
  if (!Array.isArray(parsed)) throw new Error("tabs.json の形式が不正です");
  return parsed;
}

async function loadPartsForTab(tabId) {
  const items = await ghGetDir(`public/stamps/${tabId}`);
  return items.filter(f=>f.type==="file" && f.name!=="index.json").map(f=>f.name);
}

// ★テンプレート読み込み
async function loadTemplateForTab(tabId) {
  const data = await ghGetContent(`public/templates/${tabId}/template.json`);
  if (!data?.content) return null;
  try {
    const decoded = decodeURIComponent(
      atob(data.content.replace(/\n/g,""))
        .split("").map(c=>"%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join("")
    );
    return JSON.parse(decoded);
  } catch { return null; }
}

async function triggerDeploy() {
  try { await fetch(VERCEL_DEPLOY_HOOK, { method:"POST" }); } catch {}
}

// ── App ───────────────────────────────────────────────────
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
      <header style={{ background:C.ink, height:56, display:"flex", alignItems:"center", padding:"0 16px", gap:12, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.g1},${C.g2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:C.white }}>管理</div>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.white, flex:1 }}>バナーメーカー管理者</p>
        <a href="/" style={{ fontSize:12, color:C.gray, textDecoration:"none" }}>← アプリへ</a>
      </header>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"20px 16px" }}>
        <TabManager />
      </div>

      <style>{`*{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} input::placeholder{color:#C0B8B0}`}</style>
    </div>
  );
}

// ── タブ管理 ──────────────────────────────────────────────
function TabManager() {
  const [tabs,    setTabs]    = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  useEffect(()=>{ reload(); },[]);

  const reload = async () => {
    setLoadErr("");
    try { setTabs(await loadTabsFromGH()); }
    catch(e) { setLoadErr("読み込みエラー: "+e.message); setTabs([]); }
  };

  const handleDelete = async (tab) => {
    if (!confirm(`「${tab.label}」を削除しますか？\n背景・サンプル・パーツ・テンプレートも削除されます。`)) return;
    try {
      const current = await loadTabsFromGH();
      const updated = current.filter(t=>t.id!==tab.id);
      await ghPut("public/tabs.json", jsonToB64(updated), `Delete tab: ${tab.label}`);
      try { await ghDelete(`public/${tab.bg.replace(/^\//,"")}`,     `Delete bg: ${tab.id}`); } catch {}
      try { await ghDelete(`public/${tab.sample.replace(/^\//,"")}`, `Delete sample: ${tab.id}`); } catch {}
      try {
        const parts = await loadPartsForTab(tab.id);
        for (const name of parts) {
          await ghDelete(`public/stamps/${tab.id}/${name}`, `Delete part: ${name}`);
        }
        await ghDelete(`public/stamps/${tab.id}/index.json`, `Delete parts index: ${tab.id}`);
      } catch {}
      // ★テンプレートも削除
      try { await ghDelete(`public/templates/${tab.id}/template.json`, `Delete template: ${tab.id}`); } catch {}
      setTabs(updated);
      await triggerDeploy();
    } catch(e) { alert("削除エラー: "+e.message); }
  };

  if (tabs===null) return <div style={{ textAlign:"center", padding:40 }}><Spinner size={32}/></div>;

  return (
    <div>
      {loadErr && <p style={{ color:C.red, fontSize:12, marginBottom:12, background:"#FEF2F2", padding:"10px 14px", borderRadius:8 }}>⚠️ {loadErr}</p>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <p style={{ margin:0, fontSize:16, fontWeight:700 }}>タブ管理（{tabs.length}件）</p>
        <button onClick={()=>setShowAdd(v=>!v)} style={{ padding:"8px 16px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:10, color:C.white, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {showAdd?"キャンセル":"＋ タブを追加"}
        </button>
      </div>

      {showAdd && <AddTabForm onAdded={(newTab)=>{ setTabs(prev=>[...(prev||[]),newTab]); setShowAdd(false); }} />}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {tabs.map(t=>(
          <TabCard key={t.id} tab={t}
            onDelete={()=>handleDelete(t)}
            onUpdate={(updated)=>setTabs(prev=>prev.map(p=>p.id===updated.id?updated:p))}
          />
        ))}
        {tabs.length===0&&!showAdd&&<p style={{ textAlign:"center", color:C.gray, padding:20 }}>タブがありません</p>}
      </div>
    </div>
  );
}

// ── タブカード ────────────────────────────────────────────
function TabCard({ tab, onDelete, onUpdate }) {
  const [open,       setOpen]       = useState(false);
  const [activePane, setActivePane] = useState("info");
  const [label,      setLabel]      = useState(tab.label);
  const [sampleFile, setSampleFile] = useState(null);
  const [samplePrev, setSamplePrev] = useState(null);
  const [bgFile,     setBgFile]     = useState(null);
  const [bgPrev,     setBgPrev]     = useState(null);
  const [status,     setStatus]     = useState("");
  const [msg,        setMsg]        = useState("");
  const size = SNS_SIZES.find(s=>s.w===tab.w&&s.h===tab.h)||SNS_SIZES[0];

  const sampleUrl = `${RAW_BASE}${tab.sample}?t=${tab.id}`;
  const bgUrl     = `${RAW_BASE}${tab.bg}?t=${tab.id}`;

  const handleUpdate = async () => {
    if (!label.trim()) { setMsg("タブ名を入力してください"); return; }
    setStatus("uploading"); setMsg("更新中...");
    try {
      if (sampleFile) { await ghPut(`public/${tab.sample.replace(/^\//,"")}`, await toBase64(sampleFile), `Update sample: ${tab.label}`); }
      if (bgFile)     { await ghPut(`public/${tab.bg.replace(/^\//,"")}`,     await toBase64(bgFile),     `Update bg: ${tab.label}`); }
      const updatedTab = { ...tab, label:label.trim() };
      const current    = await loadTabsFromGH();
      await ghPut("public/tabs.json", jsonToB64(current.map(t=>t.id===tab.id?updatedTab:t)), `Update tab: ${label}`);
      await triggerDeploy();
      setStatus("done"); setMsg("✅ 更新しました！");
      onUpdate(updatedTab);
    } catch(e) { setStatus("error"); setMsg("エラー: "+e.message); }
  };

  return (
    <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.grayLL}`, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
        <img src={sampleUrl} alt="" onError={e=>e.target.style.visibility="hidden"}
          style={{ width:40, height:56, objectFit:"cover", borderRadius:6, border:`1px solid ${C.grayLL}`, flexShrink:0, background:C.grayLL }} />
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tab.label}</p>
          <p style={{ margin:"2px 0 0", fontSize:10, color:C.gray }}>{size.label}　{tab.w}×{tab.h}px</p>
        </div>
        <button onClick={()=>{ setOpen(v=>!v); setMsg(""); setStatus(""); }}
          style={{ padding:"6px 12px", background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:8, color:C.ink, fontSize:12, cursor:"pointer", flexShrink:0 }}>
          {open?"閉じる":"編集"}
        </button>
        <button onClick={onDelete}
          style={{ padding:"6px 10px", background:"none", border:`1px solid ${C.red}`, borderRadius:8, color:C.red, fontSize:12, cursor:"pointer", flexShrink:0 }}>削除</button>
      </div>

      {open&&(
        <div style={{ borderTop:`1px solid ${C.grayLL}`, animation:"fadeUp 0.2s ease" }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${C.grayLL}` }}>
            {[["info","📋 タブ情報"],["parts","🧩 パーツ"],["template","🎨 テンプレート"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setActivePane(id)}
                style={{ flex:1, padding:"10px", background:"none", border:"none", borderBottom:`3px solid ${activePane===id?C.g1:"transparent"}`, color:activePane===id?C.g1:C.gray, fontSize:11, fontWeight:activePane===id?700:400, cursor:"pointer", fontFamily:"'Noto Sans JP',sans-serif" }}>
                {lbl}
              </button>
            ))}
          </div>

          {activePane==="info"&&(
            <div style={{ padding:"16px", background:C.cream }}>
              <label style={LS}>タブ名</label>
              <input value={label} onChange={e=>setLabel(e.target.value)} style={IS} />

              <label style={LS}>① サンプル画像を差し替え（任意）</label>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:10, color:C.gray }}>現在</p>
                  <img src={sampleUrl} alt="" onError={e=>e.target.style.visibility="hidden"}
                    style={{ width:48, height:68, objectFit:"cover", borderRadius:6, border:`1px solid ${C.grayLL}`, background:C.grayLL }} />
                </div>
                <div style={{ flex:1 }}><DropZone preview={samplePrev} onFile={f=>{ setSampleFile(f); setSamplePrev(URL.createObjectURL(f)); }} label="新しい画像をドロップまたはタップして選択" /></div>
              </div>

              <label style={LS}>② 背景画像を差し替え（任意）</label>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:10, color:C.gray }}>現在</p>
                  <img src={bgUrl} alt="" onError={e=>e.target.style.visibility="hidden"}
                    style={{ width:48, height:68, objectFit:"cover", borderRadius:6, border:`1px solid ${C.grayLL}`, background:C.grayLL }} />
                </div>
                <div style={{ flex:1 }}><DropZone preview={bgPrev} onFile={f=>{ setBgFile(f); setBgPrev(URL.createObjectURL(f)); }} label="新しい画像をドロップまたはタップして選択" /></div>
              </div>

              {msg&&<p style={{ margin:"0 0 10px", fontSize:12, color:status==="done"?C.green:status==="error"?C.red:C.g1 }}>{msg}</p>}
              <button onClick={handleUpdate} disabled={status==="uploading"}
                style={{ width:"100%", padding:"12px", background:status==="uploading"?C.grayL:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:10, color:C.white, fontSize:14, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:status==="uploading"?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {status==="uploading"?<><Spinner size={14} color={C.white}/>更新中...</>:"更新する"}
              </button>
            </div>
          )}

          {activePane==="parts"&&<PartsManager tabId={tab.id} />}

          {/* ★テンプレート管理 */}
          {activePane==="template"&&<TemplateManager tab={tab} />}
        </div>
      )}
    </div>
  );
}

// ── ★テンプレート管理 ────────────────────────────────────
function TemplateManager({ tab }) {
  const [elements, setElements] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [status,   setStatus]   = useState("");
  const imgInputRef = useRef();

  const CW = tab.w || 1080;
  const CH = tab.h || 1920;

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const tmpl = await loadTemplateForTab(tab.id);
      if (tmpl?.elements) setElements(tmpl.elements);
      setLoading(false);
    })();
  },[tab.id]);

  const addTextEl = () => {
    const el = {
      id: uid(), type:"text", text:"テキストを入力",
      font:"noto_sans", size:"medium", color:"#FFFFFF", vertical:false,
      shadow:false, outline:false, outlineColor:"#000000", outlineWidth:4,
      glow:false, glowColor:"#FF6600",
      x: CW/2, y: CH/2, scale:1, rotate:0, zIndex: elements.length,
      locked: false,
    };
    setElements(e=>[...e,el]);
  };

  const addImageEl = (file) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const el = {
          id: uid(), type:"image", src: ev.target.result,
          naturalW: img.width, naturalH: img.height,
          x: CW/2, y: CH/2, scale:1, rotate:0, zIndex: elements.length,
          locked: false,
        };
        setElements(e=>[...e,el]);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const updateEl = (id, patch) => setElements(e=>e.map(el=>el.id===id?{...el,...patch}:el));
  const deleteEl = (id) => setElements(e=>e.filter(el=>el.id!==id));
  const moveLayer = (id, dir) => {
    setElements(e=>{
      const arr=[...e].sort((a,b)=>a.zIndex-b.zIndex);
      const idx=arr.findIndex(el=>el.id===id);
      if(dir==="up"&&idx<arr.length-1)[arr[idx].zIndex,arr[idx+1].zIndex]=[arr[idx+1].zIndex,arr[idx].zIndex];
      else if(dir==="down"&&idx>0)[arr[idx].zIndex,arr[idx-1].zIndex]=[arr[idx-1].zIndex,arr[idx].zIndex];
      return arr;
    });
  };

  const save = async () => {
    setSaving(true); setMsg("保存中...");
    try {
      const tmpl = { elements };
      await ghPut(`public/templates/${tab.id}/template.json`, jsonToB64(tmpl), `Update template: ${tab.id}`);
      await triggerDeploy();
      setStatus("done"); setMsg("✅ テンプレートを保存しました！");
    } catch(e) { setStatus("error"); setMsg("エラー: "+e.message); }
    setSaving(false);
  };

  if (loading) return <div style={{ textAlign:"center", padding:24 }}><Spinner size={24}/></div>;

  const sortedEls = [...elements].sort((a,b)=>b.zIndex-a.zIndex);

  return (
    <div style={{ padding:"16px", background:C.cream }}>
      <p style={{ margin:"0 0 6px", fontSize:12, color:C.gray }}>
        ユーザーが「新規作成」したとき、このテンプレートのレイヤーが最初から配置されます。<br/>
        🔒固定レイヤーはユーザーが操作できません。
      </p>

      {/* ★キャンバスサイズ情報 */}
      <div style={{ background:C.white, borderRadius:8, padding:"8px 12px", border:`1px solid ${C.grayLL}`, marginBottom:12, fontSize:11, color:C.gray }}>
        キャンバスサイズ：{CW} × {CH} px　中心座標 x:{CW/2} y:{CH/2}
      </div>

      {/* ★追加ボタン */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={addTextEl} style={{ flex:1, padding:"10px", background:C.g1, border:"none", borderRadius:9, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer" }}>＋ テキスト追加</button>
        <label style={{ flex:1, padding:"10px", background:"#4A90D9", border:"none", borderRadius:9, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"center" }}>
          ＋ 画像追加
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0])addImageEl(e.target.files[0]); e.target.value=""; }} />
        </label>
      </div>

      {/* ★レイヤー一覧 */}
      {elements.length===0 ? (
        <p style={{ textAlign:"center", color:C.gray, padding:16, fontSize:12 }}>レイヤーがありません。上のボタンで追加してください。</p>
      ) : (
        <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.grayLL}`, overflow:"hidden", marginBottom:14 }}>
          <p style={{ margin:0, padding:"8px 12px", fontSize:11, fontWeight:700, color:C.gray, background:C.cream, borderBottom:`1px solid ${C.grayLL}` }}>レイヤー構成（↑↓で並び替え）</p>
          {sortedEls.map((el, idx)=>(
            <TemplateLayerRow
              key={el.id} el={el} idx={idx} total={sortedEls.length}
              onUpdate={patch=>updateEl(el.id,patch)}
              onDelete={()=>{ if(confirm("削除しますか？"))deleteEl(el.id); }}
              onMoveUp={()=>moveLayer(el.id,"up")}
              onMoveDown={()=>moveLayer(el.id,"down")}
            />
          ))}
        </div>
      )}

      {msg&&<p style={{ margin:"0 0 10px", fontSize:12, color:status==="done"?C.green:status==="error"?C.red:C.g1 }}>{msg}</p>}

      <button onClick={save} disabled={saving}
        style={{ width:"100%", padding:"13px", background:saving?C.grayL:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:11, color:C.white, fontSize:14, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:saving?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {saving?<><Spinner size={14} color={C.white}/>保存中...</>:"✦ テンプレートを保存する"}
      </button>
    </div>
  );
}

// ── ★テンプレートのレイヤー1行 ──────────────────────────
function TemplateLayerRow({ el, idx, total, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [open, setOpen] = useState(false);
  const isLocked = el.locked === true;

  const FONTS_LIST = [
    { id:"noto_sans",    name:"ゴシック（標準）" },
    { id:"noto_sans_bk", name:"ゴシック（太字）" },
    { id:"noto_serif",   name:"明朝（標準）" },
    { id:"mplus",        name:"ゴシック（丸め）" },
    { id:"mplus_round",  name:"丸ゴシック" },
    { id:"shippori",     name:"明朝（上品）" },
    { id:"zen_mincho",   name:"明朝（格調）" },
  ];

  return (
    <div style={{ borderBottom:idx<total-1?`1px solid ${C.grayLL}`:"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:C.white }}>
        <span style={{ fontSize:15, flexShrink:0 }}>{el.type==="text"?"✏️":"🖼"}</span>
        <span style={{ flex:1, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:C.ink }}>
          {el.type==="text" ? el.text : "画像"}
        </span>

        {/* ★固定/編集可トグル */}
        <button
          onClick={()=>onUpdate({locked:!isLocked})}
          style={{ flexShrink:0, padding:"4px 10px", background:isLocked?"#1E3A5F":"#E8F5E9", border:`1px solid ${isLocked?"#2563EB":"#4CAF50"}`, borderRadius:8, color:isLocked?"#60A5FA":"#2E7D32", fontSize:11, fontWeight:700, cursor:"pointer" }}>
          {isLocked ? "🔒 固定" : "✏️ 編集可"}
        </button>

        <button onClick={()=>setOpen(v=>!v)} style={{ flexShrink:0, padding:"4px 10px", background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:7, color:C.ink, fontSize:11, cursor:"pointer" }}>{open?"閉じる":"設定"}</button>
        <button onClick={onMoveUp}   style={SB()}>↑</button>
        <button onClick={onMoveDown} style={SB()}>↓</button>
        <button onClick={onDelete}   style={SB(C.red)}>✕</button>
      </div>

      {open&&(
        <div style={{ padding:"12px 14px", background:`${C.g1}06`, borderTop:`1px solid ${C.grayLL}`, animation:"fadeUp 0.2s ease" }}>

          {/* 位置 */}
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <label style={LS}>X位置</label>
              <input type="number" value={el.x} onChange={e=>onUpdate({x:Number(e.target.value)})} style={IS2} />
            </div>
            <div style={{ flex:1 }}>
              <label style={LS}>Y位置</label>
              <input type="number" value={el.y} onChange={e=>onUpdate({y:Number(e.target.value)})} style={IS2} />
            </div>
          </div>

          {/* スケール・回転 */}
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <label style={LS}>スケール</label>
              <input type="number" step="0.1" min="0.1" max="10" value={el.scale} onChange={e=>onUpdate({scale:Number(e.target.value)})} style={IS2} />
            </div>
            <div style={{ flex:1 }}>
              <label style={LS}>回転(°)</label>
              <input type="number" min="-180" max="180" value={el.rotate||0} onChange={e=>onUpdate({rotate:Number(e.target.value)})} style={IS2} />
            </div>
          </div>

          {/* テキスト専用設定 */}
          {el.type==="text"&&(
            <>
              <label style={LS}>テキスト内容</label>
              <textarea value={el.text} onChange={e=>onUpdate({text:e.target.value})}
                style={{ width:"100%", minHeight:60, padding:"8px 10px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:8, fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, resize:"vertical", outline:"none", marginBottom:10 }} />

              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <label style={LS}>フォント</label>
                  <select value={el.font} onChange={e=>onUpdate({font:e.target.value})} style={IS2}>
                    {FONTS_LIST.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={LS}>サイズ</label>
                  <select value={el.size} onChange={e=>onUpdate({size:e.target.value})} style={IS2}>
                    <option value="large">大</option>
                    <option value="medium">中</option>
                    <option value="small">小</option>
                  </select>
                </div>
              </div>

              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                <label style={{ ...LS, marginBottom:0 }}>文字色</label>
                <input type="color" value={el.color} onChange={e=>onUpdate({color:e.target.value})} style={{ width:40, height:32, borderRadius:6, border:`1px solid ${C.grayL}`, cursor:"pointer", padding:2 }} />
                <span style={{ fontSize:11, color:C.gray }}>{el.color}</span>
              </div>

              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                  <input type="checkbox" checked={el.vertical} onChange={e=>onUpdate({vertical:e.target.checked})} />縦組み
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                  <input type="checkbox" checked={el.shadow} onChange={e=>onUpdate({shadow:e.target.checked})} />シャドウ
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                  <input type="checkbox" checked={el.outline} onChange={e=>onUpdate({outline:e.target.checked})} />縁取り
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── パーツ管理 ────────────────────────────────────────────
function PartsManager({ tabId }) {
  const [parts,     setParts]     = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(()=>{ loadParts(); },[tabId]);

  const loadParts = async () => {
    setParts(null);
    const names = await loadPartsForTab(tabId);
    setParts(names);
  };

  const uploadParts = async (files) => {
    setUploading(true);
    const newNames = [];
    for (const file of files) {
      try {
        const b64 = await toBase64(file);
        await ghPut(`public/stamps/${tabId}/${file.name}`, b64, `Add part: ${file.name}`);
        newNames.push(file.name);
      } catch(e) { alert("アップロードエラー: "+e.message); }
    }
    const updated = [...(parts||[]), ...newNames];
    await ghPut(`public/stamps/${tabId}/index.json`,
      btoa(unescape(encodeURIComponent(JSON.stringify(updated)))),
      `Update parts index: ${tabId}`
    );
    setParts(updated);
    await triggerDeploy();
    setUploading(false);
  };

  const deletePart = async (name) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await ghDelete(`public/stamps/${tabId}/${name}`, `Delete part: ${name}`);
      const updated = (parts||[]).filter(p=>p!==name);
      await ghPut(`public/stamps/${tabId}/index.json`,
        btoa(unescape(encodeURIComponent(JSON.stringify(updated)))),
        `Update parts index: ${tabId}`
      );
      setParts(updated);
      await triggerDeploy();
    } catch(e) { alert("削除エラー: "+e.message); }
  };

  if (parts===null) return <div style={{ textAlign:"center", padding:24 }}><Spinner size={24}/></div>;

  return (
    <div style={{ padding:"16px", background:C.cream }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700 }}>パーツ（{parts.length}件）</p>
        <label style={{ padding:"7px 14px", background:uploading?C.grayL:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:9, color:C.white, fontSize:12, fontWeight:700, cursor:uploading?"not-allowed":"pointer" }}>
          {uploading?<><Spinner size={12} color={C.white}/> アップロード中...</>:"＋ パーツを追加"}
          <input type="file" accept="image/*" multiple style={{ display:"none" }} disabled={uploading}
            onChange={e=>{ uploadParts(Array.from(e.target.files)); e.target.value=""; }} />
        </label>
      </div>

      <div style={{ background:"#FFF8E1", border:"1px solid #F59E0B", borderRadius:8, padding:"8px 12px", marginBottom:12 }}>
        <p style={{ margin:0, fontSize:11, color:"#92400E" }}>📌 PNG推奨（透過背景推奨）　複数同時選択可能</p>
      </div>

      {parts.length===0 ? (
        <p style={{ textAlign:"center", color:C.gray, padding:16, fontSize:12 }}>パーツがありません</p>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {parts.map(name=>(
            <div key={name} style={{ background:C.white, borderRadius:10, border:`1px solid ${C.grayLL}`, overflow:"hidden", textAlign:"center" }}>
              <div style={{ background:"repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0 0/14px 14px", padding:8 }}>
                <img src={`${RAW_BASE}/stamps/${tabId}/${name}?t=${Date.now()}`} alt={name}
                  style={{ width:"100%", maxHeight:72, objectFit:"contain", display:"block", margin:"0 auto" }} />
              </div>
              <div style={{ padding:"6px 8px" }}>
                <p style={{ margin:0, fontSize:10, color:C.gray, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                <button onClick={()=>deletePart(name)}
                  style={{ marginTop:4, padding:"3px 10px", background:"none", border:`1px solid ${C.red}`, borderRadius:6, color:C.red, fontSize:10, cursor:"pointer" }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── タブ追加フォーム ──────────────────────────────────────
function AddTabForm({ onAdded }) {
  const [label,      setLabel]      = useState("");
  const [sizeId,     setSizeId]     = useState("reel");
  const [sampleFile, setSampleFile] = useState(null);
  const [samplePrev, setSamplePrev] = useState(null);
  const [bgFile,     setBgFile]     = useState(null);
  const [bgPrev,     setBgPrev]     = useState(null);
  const [status,     setStatus]     = useState("");
  const [msg,        setMsg]        = useState("");

  const submit = async () => {
    if (!label.trim()) { setMsg("タブ名を入力してください"); return; }
    if (!sampleFile)   { setMsg("サンプル画像を選択してください"); return; }
    if (!bgFile)       { setMsg("背景画像を選択してください"); return; }
    setStatus("uploading"); setMsg("① 背景画像をアップロード中...");
    try {
      const tabId  = "tab_" + Date.now();
      const bgName = `bg_${tabId}.png`;
      const smName = `sample_${tabId}.png`;
      const size   = SNS_SIZES.find(s=>s.id===sizeId)||SNS_SIZES[0];

      await ghPut(`public/${bgName}`, await toBase64(bgFile), `Add bg: ${label}`);
      setMsg("② サンプル画像をアップロード中...");
      await ghPut(`public/${smName}`, await toBase64(sampleFile), `Add sample: ${label}`);

      setMsg("③ パーツフォルダを初期化中...");
      await ghPut(`public/stamps/${tabId}/index.json`,
        btoa(unescape(encodeURIComponent(JSON.stringify([])))),
        `Init parts for: ${label}`
      );

      // ★テンプレートフォルダも初期化
      setMsg("④ テンプレートを初期化中...");
      await ghPut(`public/templates/${tabId}/template.json`,
        jsonToB64({ elements: [] }),
        `Init template for: ${label}`
      );

      setMsg("⑤ タブ情報を保存中...");
      const currentTabs = await loadTabsFromGH();
      const newTab = { id:tabId, label:label.trim(), bg:`/${bgName}`, sample:`/${smName}`, w:size.w, h:size.h };
      await ghPut("public/tabs.json", jsonToB64([...currentTabs, newTab]), `Add tab: ${label}`);

      await triggerDeploy();
      setStatus("done"); setMsg("✅ 追加しました！");
      onAdded(newTab);
    } catch(e) { setStatus("error"); setMsg("エラー: "+e.message); }
  };

  return (
    <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`1.5px solid ${C.g1}`, marginBottom:16, animation:"fadeUp 0.2s ease" }}>
      <p style={{ margin:"0 0 16px", fontSize:14, fontWeight:700, color:C.g1 }}>新規タブを追加</p>

      <label style={LS}>タブ名</label>
      <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="例：投票依頼" style={IS} />

      <label style={LS}>SNSサイズ</label>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {SNS_SIZES.map(s=>(
          <button key={s.id} onClick={()=>setSizeId(s.id)} style={{ padding:"8px 12px", background:sizeId===s.id?C.ink:C.cream, border:`1px solid ${sizeId===s.id?C.ink:C.grayL}`, borderRadius:8, color:sizeId===s.id?C.white:C.ink, fontSize:12, fontWeight:sizeId===s.id?700:400, cursor:"pointer" }}>
            {s.label}<br/><span style={{ fontSize:10, opacity:0.7 }}>{s.w}×{s.h}</span>
          </button>
        ))}
      </div>

      <label style={LS}>① サンプルバナー画像</label>
      <DropZone preview={samplePrev} onFile={f=>{ setSampleFile(f); setSamplePrev(URL.createObjectURL(f)); }} label="サンプル画像をドロップ / タップして選択" />

      <label style={{ ...LS, marginTop:12 }}>② 背景画像</label>
      <DropZone preview={bgPrev} onFile={f=>{ setBgFile(f); setBgPrev(URL.createObjectURL(f)); }} label="背景画像をドロップ / タップして選択" />

      {msg&&<p style={{ margin:"10px 0 0", fontSize:12, color:status==="done"?C.green:status==="error"?C.red:C.g1 }}>{msg}</p>}

      <button onClick={submit} disabled={status==="uploading"} style={{ width:"100%", marginTop:16, padding:"13px", background:status==="uploading"?C.grayL:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:14, fontWeight:700, cursor:status==="uploading"?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"'Noto Sans JP',sans-serif" }}>
        {status==="uploading"?<><Spinner size={16} color={C.white}/>アップロード中...</>:"✦ タブを追加する"}
      </button>
    </div>
  );
}

// ── DropZone ──────────────────────────────────────────────
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
const IS2 = { width:"100%", padding:"8px 10px", marginBottom:0, background:C.white, border:`1px solid ${C.grayL}`, borderRadius:7, fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, outline:"none" };
const SB  = (bg=C.grayL) => ({ padding:"4px 8px", background:bg, border:"none", borderRadius:5, color:bg===C.grayL?C.ink:C.white, fontSize:10, cursor:"pointer" });

function Spinner({ size=20, color=C.g1 }) {
  return <div style={{ width:size, height:size, flexShrink:0, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />;
}
