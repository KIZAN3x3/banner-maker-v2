import { useState, useRef, useEffect, useCallback } from "react";

const fl = document.createElement("link");
fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&family=Zen+Maru+Gothic:wght@400&family=Noto+Serif+JP:wght@400&family=Kosugi+Maru&family=Zen+Kurenaido&display=swap";
document.head.appendChild(fl);
fl.onload = () => {
  ["Noto Sans JP","Zen Maru Gothic","Noto Serif JP","Kosugi Maru","Zen Kurenaido"].forEach(f=>{
    document.fonts.load(`700 16px '${f}'`).catch(()=>{});
  });
};

const GITHUB_OWNER = "KIZAN3x3";
const GITHUB_REPO  = "banner-maker-v2";
const RAW_BASE     = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/public`;

const C = {
  g1:"#EB6100", g2:"#F18D00",
  ink:"#18120A", inkS:"#3D2E1E",
  white:"#FFFFFF", cream:"#FAF6F0",
  gray:"#9C8E80", grayL:"#D6CEC4", grayLL:"#EDE7DF",
  dark:"#0F0A05",
};

const FONTS = [
  { id:"noto_sans_bold",  name:"ゴシック（太字）", family:"'Noto Sans JP'",    weight:"700" },
  { id:"zen_maru",        name:"丸ゴシック",        family:"'Zen Maru Gothic'", weight:"400" },
  { id:"noto_serif",      name:"明朝（標準）",       family:"'Noto Serif JP'",  weight:"400" },
  { id:"kosugi_maru",     name:"コスギ丸",           family:"'Kosugi Maru'",    weight:"400" },
  { id:"zen_kurenaido",   name:"禅 紅椿",            family:"'Zen Kurenaido'",  weight:"400" },
];

const TEXT_SIZES = { large:120, medium:72, small:40 };
const PASSWORD   = "123";
const SS_KEY     = "banner_maker_v2";

const uid = () => Math.random().toString(36).slice(2,9);

const defaultText = (zIndex=0) => ({
  id:uid(), type:"text", text:"テキストを入力",
  font:FONTS[0].id, size:"medium", color:"#FFFFFF", vertical:false,
  shadow:false, outline:false, outlineColor:"#000000", outlineWidth:4,
  glow:false, glowColor:"#FF6600",
  x:540, y:960, scale:1, rotate:0, zIndex,
  locked: false,
});

const defaultImage = (src, w, h, zIndex=0) => ({
  id:uid(), type:"image", src, naturalW:w, naturalH:h,
  x:540, y:960, scale:1, rotate:0, zIndex,
  locked: false,
});

const imgCache = {};

async function fetchTabs() {
  try {
    const res = await fetch(`${RAW_BASE}/tabs.json?t=${Date.now()}`);
    if (!res.ok) return [];
    const tabs = await res.json();
    return tabs.map(t => ({ ...t, bg: RAW_BASE + t.bg, sample: RAW_BASE + t.sample }));
  } catch { return []; }
}

async function fetchTemplateForTab(tabId) {
  try {
    const res = await fetch(`${RAW_BASE}/templates/${tabId}/template.json?t=${Date.now()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default function App() {
  const [authed, setAuthed] = useState(()=>sessionStorage.getItem("bm_auth")==="1");
  if (!authed) return <PasswordScreen onAuth={()=>{ sessionStorage.setItem("bm_auth","1"); setAuthed(true); }} />;
  return <MainApp />;
}

function PasswordScreen({ onAuth }) {
  const [pw,  setPw]  = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (pw===PASSWORD) onAuth();
    else { setErr(true); setTimeout(()=>setErr(false),1200); }
  };
  return (
    <div style={{ minHeight:"100vh", background:C.dark, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans JP',sans-serif" }}>
      <div style={{ background:C.ink, borderRadius:20, padding:"40px 32px", width:300, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg,${C.g1},${C.g2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:C.white, margin:"0 auto 14px" }}>BM</div>
          <p style={{ margin:0, fontSize:20, fontWeight:700, color:C.white }}>バナーメーカー</p>
          <p style={{ margin:"6px 0 0", fontSize:12, color:C.gray }}>パスワードを入力してください</p>
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="パスワード"
          style={{ width:"100%", padding:"13px 16px", background:err?"#3D0A0A":"#2A1E12", border:`1.5px solid ${err?"#CC3333":C.grayL}`, borderRadius:10, color:C.white, fontSize:16, fontFamily:"'Noto Sans JP',sans-serif", outline:"none", boxSizing:"border-box" }} />
        {err&&<p style={{ color:"#CC3333", fontSize:12, margin:"6px 0 0", textAlign:"center" }}>パスワードが違います</p>}
        <button onClick={submit} style={{ width:"100%", marginTop:14, padding:"14px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:15, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer" }}>ログイン</button>
      </div>
      <style>{`input::placeholder{color:#5A4A38} *{box-sizing:border-box}`}</style>
    </div>
  );
}

function MainApp() {
  const [tabs,       setTabs]       = useState([]);
  const [tabsLoaded, setTabsLoaded] = useState(false);
  const [activeTab,  setActiveTab]  = useState(null);
  const [screen,     setScreen]     = useState("home");
  const [elements,   setElements]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [editing,    setEditing]    = useState(null);
  const [history,    setHistory]    = useState([]);
  const [saves,      setSaves]      = useState(()=>{ try{return JSON.parse(localStorage.getItem(SS_KEY)||"{}");}catch{return {};} });
  const [bgImg,      setBgImg]      = useState(null);
  const [sampleImg,  setSampleImg]  = useState(null);
  const [downloadUrl,setDownloadUrl]= useState(null);
  const [generating, setGenerating] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  const previewRef = useRef(null);

  const tab = tabs.find(t=>t.id===activeTab);
  const CW_ = tab?.w || 1080;
  const CH_ = tab?.h || 1920;
  const PW  = Math.min(typeof window!=="undefined"?window.innerWidth-48:380, 420);
  const PH  = Math.round(PW*CH_/CW_);
  const R   = PW/CW_;

  useEffect(()=>{
    document.fonts.ready.then(()=>
      Promise.all(FONTS.map(f=>document.fonts.load(`${f.weight} 48px ${f.family}`)))
        .then(()=>setFontsReady(true)).catch(()=>setFontsReady(true))
    );
    fetchTabs().then(loaded=>{ setTabs(loaded); if(loaded.length>0)setActiveTab(loaded[0].id); setTabsLoaded(true); });
  },[]);

  useEffect(()=>{
    if(!tab)return;
    setBgImg(null); setSampleImg(null);
    const ts=Date.now();
    const bg=new Image(); bg.crossOrigin="anonymous"; bg.onload=()=>setBgImg(bg); bg.onerror=()=>{}; bg.src=tab.bg+"?t="+ts;
    const sm=new Image(); sm.crossOrigin="anonymous"; sm.onload=()=>setSampleImg(sm); sm.src=tab.sample+"?t="+ts;
  },[activeTab]);

  useEffect(()=>{
    if(screen!=="preview"||!previewRef.current)return;
    previewRef.current.width=PW; previewRef.current.height=PH;
    drawCanvas(previewRef.current,elements,bgImg,PW,PH,selected,CW_,CH_);
  },[screen,elements,bgImg,fontsReady,PW,PH,selected,CW_,CH_]);

  const pushHistory = useCallback((els)=>{ setHistory(h=>[...h.slice(-49),JSON.parse(JSON.stringify(els))]); },[]);
  const undo = ()=>{ if(!history.length)return; setElements(history[history.length-1]); setHistory(h=>h.slice(0,-1)); };

  const addText = ()=>{
    pushHistory(elements);
    const el=defaultText(elements.length);
    setElements(e=>[...e,el]);
    setSelected(el.id);
    setEditing(el.id);
  };

  const addImage = (file)=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        pushHistory(elements);
        const el=defaultImage(ev.target.result,img.width,img.height,0);
        setElements(e=>{ const updated=e.map(el=>({...el,zIndex:el.zIndex+1})); return [el,...updated]; });
        setSelected(el.id);
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const updateEl = (id,patch)=>setElements(e=>e.map(el=>el.id===id?{...el,...patch}:el));
  const deleteEl = (id)=>{ pushHistory(elements); setElements(e=>e.filter(el=>el.id!==id)); setSelected(null); setEditing(null); };
  const duplicateEl = (id)=>{
    const el=elements.find(el=>el.id===id); if(!el)return;
    pushHistory(elements);
    const newEl={...JSON.parse(JSON.stringify(el)), id:uid(), x:el.x+30, y:el.y+30, zIndex:elements.length};
    setElements(e=>[...e,newEl]); setSelected(newEl.id);
  };
  const moveLayer = (id,dir)=>{
    pushHistory(elements);
    setElements(e=>{
      const arr=[...e].sort((a,b)=>a.zIndex-b.zIndex);
      const idx=arr.findIndex(el=>el.id===id);
      if(dir==="up"&&idx<arr.length-1){ const tmp=arr[idx]; arr[idx]=arr[idx+1]; arr[idx+1]=tmp; }
      else if(dir==="down"&&idx>0){ const tmp=arr[idx]; arr[idx]=arr[idx-1]; arr[idx-1]=tmp; }
      return arr.map((el,i)=>({...el,zIndex:i}));
    });
  };

  const startNew = async () => {
    setElements([]); setSelected(null); setEditing(null); setHistory([]);
    const tmpl = await fetchTemplateForTab(tab.id);
    if (tmpl && Array.isArray(tmpl.elements) && tmpl.elements.length > 0) {
      tmpl.elements.forEach(el=>{
        if(el.type==="image"&&el.src){
          const img=new Image(); img.crossOrigin="anonymous";
          img.onload=()=>{ imgCache[el.src]=img; };
          img.src=el.src;
        }
      });
      setElements(tmpl.elements);
    }
    setScreen("preview");
  };

  const saveWork = ()=>{
    const key=`${activeTab}_${Date.now()}`;
    const defaultName=`${tab?.label||""} ${new Date().toLocaleDateString("ja-JP")}`;
    const name=window.prompt("保存名を入力してください", defaultName);
    if(name===null)return;
    const work={ id:key, tab:activeTab, name:name||defaultName, elements:JSON.parse(JSON.stringify(elements)), createdAt:Date.now() };
    const updated={...saves,[key]:work}; setSaves(updated); localStorage.setItem(SS_KEY,JSON.stringify(updated)); alert("保存しました！");
  };
  const renameWork = (id)=>{
    const work=saves[id]; if(!work)return;
    const name=window.prompt("新しい名前を入力してください", work.name);
    if(name===null||!name.trim())return;
    const updated={...saves,[id]:{...work,name:name.trim()}}; setSaves(updated); localStorage.setItem(SS_KEY,JSON.stringify(updated));
  };
  const loadWork  = (work)=>{ setElements(work.elements); setSelected(null); setEditing(null); setHistory([]); setScreen("preview"); };
  const deleteWork= (id)=>{ const u={...saves}; delete u[id]; setSaves(u); localStorage.setItem(SS_KEY,JSON.stringify(u)); };

  const generate = async()=>{
    setGenerating(true); await new Promise(r=>setTimeout(r,80));
    const canvas=document.createElement("canvas"); canvas.width=CW_; canvas.height=CH_;
    const ctx2=canvas.getContext("2d", {alpha:true});
    ctx2.clearRect(0,0,CW_,CH_);
    drawCanvas(canvas,elements,bgImg,CW_,CH_,null,CW_,CH_);
    setDownloadUrl(canvas.toDataURL("image/png")); setGenerating(false); setScreen("done");
  };
  const reset = ()=>{ setElements([]); setSelected(null); setEditing(null); setHistory([]); setDownloadUrl(null); setScreen("home"); };

  const tabSaves = Object.values(saves).filter(s=>s.tab===activeTab).sort((a,b)=>b.createdAt-a.createdAt);

  if (!tabsLoaded) return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans JP',sans-serif" }}>
      <div style={{ textAlign:"center" }}><Spinner size={40}/><p style={{ marginTop:16, color:C.gray }}>読み込み中...</p></div>
    </div>
  );

  if (tabs.length===0) return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans JP',sans-serif", padding:20 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
        <p style={{ fontSize:16, fontWeight:700, color:C.ink, margin:"0 0 8px" }}>テンプレートがありません</p>
        <p style={{ fontSize:13, color:C.gray }}>管理者ページでテンプレートを追加してください</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.cream, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, overflowY:"auto" }}>
      <AppHeader screen={screen} onBack={screen==="preview"?()=>setScreen("home"):screen==="done"?()=>setScreen("preview"):null} onSave={screen==="preview"?saveWork:null} onUndo={screen==="preview"&&history.length>0?undo:null} />
        {screen==="home"&&(
          <div style={{ background:C.white, borderBottom:`1px solid ${C.grayLL}`, display:"flex", overflowX:"auto", position:"sticky", top:56, zIndex:100, WebkitOverflowScrolling:"touch" }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ flexShrink:0, padding:"11px 14px", background:"none", border:"none", borderBottom:`3px solid ${activeTab===t.id?C.g1:"transparent"}`, color:activeTab===t.id?C.g1:C.gray, fontSize:12, fontWeight:activeTab===t.id?700:400, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer" }}>{t.label}</button>
            ))}
          </div>
        )}
        {screen==="home"    && <HomeScreen tab={tab} tabSaves={tabSaves} onNew={startNew} onLoad={loadWork} onDelete={deleteWork} onRename={renameWork} />}
        {screen==="preview" && <PreviewScreen tab={tab} elements={elements} setElements={setElements} selected={selected} setSelected={setSelected} editing={editing} setEditing={setEditing} bgImg={bgImg} sampleImg={sampleImg} canvasRef={previewRef} PW={PW} PH={PH} R={R} addText={addText} addImage={addImage} updateEl={updateEl} deleteEl={deleteEl} duplicateEl={duplicateEl} moveLayer={moveLayer} pushHistory={pushHistory} onGenerate={generate} generating={generating} />}
        {screen==="done"    && <DoneScreen downloadUrl={downloadUrl} onReset={reset} onBack={()=>setScreen("preview")} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} *{box-sizing:border-box} input::placeholder{color:#C0B8B0} textarea::placeholder{color:#C0B8B0}`}</style>
    </div>
  );
}

function AppHeader({ screen, onBack, onSave, onUndo }) {
  return (
    <header style={{ background:C.ink, height:56, display:"flex", alignItems:"center", padding:"0 16px", gap:10, position:"sticky", top:0, zIndex:300, boxShadow:"0 2px 20px #00000055" }}>
      {onBack ? <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:C.white, fontSize:26, lineHeight:1, padding:"0 8px 0 0", marginLeft:-4 }}>‹</button>
               : <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.g1},${C.g2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:C.white }}>BM</div>}
      <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.white, flex:1 }}>バナーメーカー</p>
      <div style={{ display:"flex", gap:8 }}>
        {onUndo&&<button onClick={onUndo} style={{ background:`${C.white}15`, border:"none", borderRadius:8, padding:"6px 12px", color:C.white, fontSize:12, cursor:"pointer" }}>↩ 戻す</button>}
        {onSave&&<button onClick={onSave} style={{ background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:8, padding:"6px 14px", color:C.white, fontSize:12, fontWeight:700, cursor:"pointer" }}>保存</button>}
      </div>
    </header>
  );
}

function HomeScreen({ tab, tabSaves, onNew, onLoad, onDelete, onRename }) {
  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px 40px" }}>
      <button onClick={onNew} style={{ width:"100%", padding:"18px", background:`linear-gradient(135deg,${C.g1} 7%,${C.g2} 97%)`, border:"none", borderRadius:14, color:C.white, fontSize:16, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer", boxShadow:`0 4px 20px ${C.g1}45`, marginBottom:24 }}>＋ 新規作成</button>
      {tabSaves.length>0&&(
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:C.inkS, marginBottom:12 }}>保存済み</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {tabSaves.map(work=>(
              <div key={work.id} style={{ background:C.white, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.grayLL}`, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{work.name}</p>
                    <button onClick={()=>onRename(work.id)} style={{ flexShrink:0, padding:"2px 8px", background:"none", border:`1px solid ${C.grayL}`, borderRadius:6, color:C.gray, fontSize:10, cursor:"pointer" }}>✏️</button>
                  </div>
                  <p style={{ margin:"3px 0 0", fontSize:11, color:C.gray }}>{work.elements.length}個の要素</p>
                </div>
                <button onClick={()=>onLoad(work)} style={{ padding:"8px 16px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:8, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>編集</button>
                <button onClick={()=>{if(confirm("削除しますか？"))onDelete(work.id);}} style={{ padding:"8px 12px", background:"none", border:`1px solid ${C.grayL}`, borderRadius:8, color:C.gray, fontSize:12, cursor:"pointer", flexShrink:0 }}>削除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewScreen({ tab, elements, setElements, selected, setSelected, editing, setEditing, bgImg, sampleImg, canvasRef, PW, PH, R, addText, addImage, updateEl, deleteEl, duplicateEl, moveLayer, pushHistory, onGenerate, generating }) {
  const dragging    = useRef(null);
  const pinchRef    = useRef({ lastDist:null });
  const lastTap     = useRef(0);
  const lastClick   = useRef(0);
  const imgInputRef = useRef();
  const [inlineEdit, setInlineEdit] = useState(null);

  const getXY = (cx,cy)=>{ if(!canvasRef.current)return{x:0,y:0}; const rect=canvasRef.current.getBoundingClientRect(); return{x:(cx-rect.left)/R,y:(cy-rect.top)/R}; };

  const activateInlineEdit = (cx, cy)=>{
    const{x,y}=getXY(cx,cy);
    const sorted=[...elements].filter(el=>el&&el.type==="text"&&!el.locked).sort((a,b)=>b.zIndex-a.zIndex);
    for(const el of sorted){
      const dist=Math.sqrt(Math.pow(x-el.x,2)+Math.pow(y-el.y,2));
      if(dist<200){
        setSelected(el.id);
        const fs=(TEXT_SIZES[el.size]||72)*el.scale*R;
        const lines=el.text.split("\n");
        const w=Math.max(120, Math.max(...lines.map(l=>l.length))*fs*0.65);
        const h=Math.max(fs*1.5, lines.length*fs*1.4);
        setInlineEdit({ id:el.id, x:el.x*R, y:el.y*R, w, h, fs, font:el.font, color:el.color });
        return true;
      }
    }
    return false;
  };

  const onCanvasClick = (e)=>{
    const now=Date.now();
    if(now-lastClick.current<400){ activateInlineEdit(e.clientX, e.clientY); lastClick.current=0; }
    else { lastClick.current=now; }
  };

  const onMouseDown = (e)=>{
    if(inlineEdit)return;
    if(!selected)return;
    const el=elements.find(el=>el.id===selected); if(!el||el.locked)return;
    const{x,y}=getXY(e.clientX,e.clientY);
    pushHistory(elements);
    dragging.current={id:el.id,startX:x,startY:y,origX:el.x,origY:el.y};
  };
  const onMouseMove = (e)=>{
    if(!dragging.current)return;
    const{x,y}=getXY(e.clientX,e.clientY);
    updateEl(dragging.current.id,{x:dragging.current.origX+(x-dragging.current.startX),y:dragging.current.origY+(y-dragging.current.startY)});
  };
  const onMouseUp = ()=>{ dragging.current=null; };

  const onTouchStart = (e)=>{
    if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      pinchRef.current.lastDist=Math.sqrt(dx*dx+dy*dy);
    } else {
      const now=Date.now();
      if(now-lastTap.current<300){ activateInlineEdit(e.touches[0].clientX, e.touches[0].clientY); lastTap.current=0; }
      else { lastTap.current=now; onMouseDown({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY}); }
    }
  };
  const onTouchMove = (e)=>{
    e.preventDefault();
    if(e.touches.length===2&&selected){
      const el=elements.find(el=>el.id===selected); if(el?.locked)return;
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(pinchRef.current.lastDist){ const ratio=dist/pinchRef.current.lastDist; setElements(els=>els.map(el=>el.id===selected?{...el,scale:Math.min(Math.max(el.scale*ratio,0.1),8)}:el)); }
      pinchRef.current.lastDist=dist;
    } else onMouseMove({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});
  };
  const onTouchEnd = ()=>{ pinchRef.current.lastDist=null; onMouseUp(); };

  const sortedEls = [...elements].sort((a,b)=>b.zIndex-a.zIndex);

  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"12px 16px 40px" }}>
      {sampleImg&&(
        <div style={{ marginBottom:12, border:`1px solid ${C.grayL}` }}>
          <p style={{ margin:0, padding:"6px 12px", fontSize:11, color:C.gray, background:C.white }}>📌 お手本（参考）</p>
          <img src={sampleImg.src} style={{ width:"50%", display:"block" }} />
        </div>
      )}

      <p style={{ textAlign:"center", fontSize:11, color:C.gray, margin:"0 0 8px", background:`${C.grayLL}`, padding:"6px", borderRadius:8 }}>
        💡 キャンバス以外の場所で画面スクロールできます
      </p>

      <div style={{ position:"relative", overflow:"hidden", border:`2px solid ${selected?C.g1:C.grayL}`, boxShadow:`0 8px 32px ${C.g1}20`, transition:"border-color 0.2s" }}>
        <canvas ref={canvasRef} width={PW} height={PH}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onClick={onCanvasClick}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ display:"block", cursor:selected?"grab":"default", touchAction:"none", userSelect:"none" }} />
        {inlineEdit&&(()=>{
          const el=elements.find(el=>el.id===inlineEdit.id);
          if(!el)return null;
          const font=FONTS.find(f=>f.id===el.font)||FONTS[0];
          return (
            <textarea autoFocus value={el.text}
              onChange={e=>updateEl(el.id,{text:e.target.value})}
              onBlur={()=>setInlineEdit(null)}
              onKeyDown={e=>{ if(e.key==="Escape")setInlineEdit(null); }}
              style={{ position:"absolute", left:Math.max(0,inlineEdit.x-inlineEdit.w/2), top:Math.max(0,inlineEdit.y-inlineEdit.h/2), width:Math.min(inlineEdit.w,PW), minHeight:inlineEdit.h, fontSize:inlineEdit.fs, fontFamily:font.family+",sans-serif", fontWeight:font.weight, color:el.color, background:"rgba(0,0,0,0.5)", border:`2px solid ${C.g1}`, borderRadius:4, outline:"none", resize:"none", textAlign:"center", padding:"4px", lineHeight:1.3, boxSizing:"border-box", zIndex:10, caretColor:C.white, overflow:"hidden" }} />
          );
        })()}
      </div>

      <p style={{ textAlign:"center", fontSize:10, color:C.gray, marginTop:5 }}>
        {selected?"ドラッグで移動　ピンチで拡縮　ダブルタップでテキスト編集":"↓ レイヤーで要素を選んでください"}
      </p>

      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addText} style={TB(C.g1)}>＋ テキスト</button>
        <label style={TB("#4A90D9")}>
          ＋ 画像
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{if(e.target.files[0])addImage(e.target.files[0]);e.target.value="";}} />
        </label>
      </div>

      {elements.length>0&&(
        <div style={{ marginTop:12, background:C.white, borderRadius:12, border:`1px solid ${C.grayLL}`, overflow:"hidden" }}>
          <p style={{ margin:0, padding:"10px 14px", fontSize:12, fontWeight:700, color:C.inkS, borderBottom:`1px solid ${C.grayLL}`, background:C.cream }}>レイヤー（上が前面）　↑↓で並び替え</p>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {sortedEls.map((el,idx)=>{
              const isLocked = el.locked === true;
              return (
                <div key={el.id} style={{ borderBottom:idx<sortedEls.length-1?`1px solid ${C.grayLL}`:"none" }}>
                  <div onClick={()=>{ if(!isLocked){ setSelected(el.id); if(editing!==el.id)setEditing(null); } }}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:selected===el.id?`${C.g1}10`:isLocked?`#F5F5F5`:C.white, cursor:isLocked?"not-allowed":"pointer" }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{isLocked?"🔒":el.type==="text"?"✏️":"🖼"}</span>
                    <span style={{ flex:1, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:isLocked?C.gray:selected===el.id?C.g1:C.ink, fontWeight:selected===el.id?700:400 }}>
                      {el.type==="text"?el.text:"画像"}
                    </span>
                    {isLocked ? (
                      <span style={{ fontSize:10, color:C.gray, background:C.grayLL, padding:"2px 8px", borderRadius:10, flexShrink:0 }}>固定</span>
                    ) : (
                      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                        {selected===el.id&&el.type==="text"&&editing!==el.id&&(
                          <button onClick={e=>{e.stopPropagation();setEditing(el.id);}} style={{ padding:"4px 10px", background:C.g1, border:"none", borderRadius:6, color:C.white, fontSize:11, fontWeight:700, cursor:"pointer" }}>編集</button>
                        )}
                        <button onClick={e=>{e.stopPropagation();duplicateEl(el.id);}} style={SB("#4A90D9")}>複製</button>
                        <button onClick={e=>{e.stopPropagation();moveLayer(el.id,"up");}}   style={SB()}>↑</button>
                        <button onClick={e=>{e.stopPropagation();moveLayer(el.id,"down");}} style={SB()}>↓</button>
                        <button onClick={e=>{e.stopPropagation();if(confirm("削除？"))deleteEl(el.id);}} style={SB("#CC3333")}>✕</button>
                      </div>
                    )}
                  </div>
                  {!isLocked&&selected===el.id&&editing!==el.id&&(
                    <div style={{ padding:"8px 14px 10px", background:`${C.g1}06`, borderTop:`1px solid ${C.grayLL}`, display:"flex", flexDirection:"column", gap:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:C.gray, flexShrink:0, width:48 }}>🔄 回転</span>
                        <input type="range" min="-180" max="180" value={el.rotate||0} onChange={e=>updateEl(el.id,{rotate:Number(e.target.value)})} style={{ flex:1, accentColor:C.g1 }} />
                        <span style={{ fontSize:11, color:C.gray, width:38, textAlign:"right", flexShrink:0 }}>{el.rotate||0}°</span>
                        <button onClick={()=>updateEl(el.id,{rotate:0})} style={{ padding:"2px 8px", background:"none", border:`1px solid ${C.grayL}`, borderRadius:5, fontSize:10, color:C.gray, cursor:"pointer", flexShrink:0 }}>R</button>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:C.gray, flexShrink:0, width:48 }}>⤢ サイズ</span>
                        <input type="range" min="0.05" max="5" step="0.01" value={el.scale||1} onChange={e=>updateEl(el.id,{scale:Number(e.target.value)})} style={{ flex:1, accentColor:C.g1 }} />
                        <span style={{ fontSize:11, color:C.gray, width:38, textAlign:"right", flexShrink:0 }}>{Math.round((el.scale||1)*100)}%</span>
                        <button onClick={()=>updateEl(el.id,{scale:1})} style={{ padding:"2px 8px", background:"none", border:`1px solid ${C.grayL}`, borderRadius:5, fontSize:10, color:C.gray, cursor:"pointer", flexShrink:0 }}>R</button>
                      </div>
                    </div>
                  )}
                  {!isLocked&&editing===el.id&&el.type==="text"&&(
                    <div style={{ padding:"14px", background:`${C.g1}08`, borderTop:`1px solid ${C.g1}30`, animation:"fadeUp 0.2s ease" }}>
                      <textarea value={el.text} onChange={e=>updateEl(el.id,{text:e.target.value})} style={{ width:"100%", minHeight:72, padding:"10px", background:C.white, border:`1px solid ${C.grayL}`, borderRadius:8, fontSize:15, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, resize:"vertical", outline:"none", marginBottom:10 }} />
                      <label style={LS}>フォント</label>
                      <select value={el.font} onChange={e=>updateEl(el.id,{font:e.target.value})} style={SS}>{FONTS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
                      <label style={LS}>サイズ</label>
                      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                        {[["large","大"],["medium","中"],["small","小"]].map(([v,l])=>(
                          <button key={v} onClick={()=>updateEl(el.id,{size:v})} style={{ flex:1, padding:"8px", background:el.size===v?C.ink:C.cream, border:`1px solid ${el.size===v?C.ink:C.grayL}`, borderRadius:8, fontSize:13, fontWeight:700, color:el.size===v?C.white:C.ink, cursor:"pointer" }}>{l}</button>
                        ))}
                      </div>
                      <label style={LS}>組方向</label>
                      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                        {[[false,"横組み"],[true,"縦組み"]].map(([v,l])=>(
                          <button key={String(v)} onClick={()=>updateEl(el.id,{vertical:v})} style={{ flex:1, padding:"8px", background:el.vertical===v?C.ink:C.cream, border:`1px solid ${el.vertical===v?C.ink:C.grayL}`, borderRadius:8, fontSize:13, color:el.vertical===v?C.white:C.ink, cursor:"pointer" }}>{l}</button>
                        ))}
                      </div>
                      <label style={LS}>文字色</label>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <input type="color" value={el.color} onChange={e=>updateEl(el.id,{color:e.target.value})} style={{ width:44, height:36, borderRadius:8, border:`1px solid ${C.grayL}`, cursor:"pointer", padding:2 }} />
                        <span style={{ fontSize:12, color:C.gray }}>{el.color}</span>
                      </div>
                      <label style={LS}>回転</label>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                        <input type="range" min="-180" max="180" value={el.rotate||0} onChange={e=>updateEl(el.id,{rotate:Number(e.target.value)})} style={{ flex:1, accentColor:C.g1 }} />
                        <span style={{ fontSize:11, color:C.gray, width:38, flexShrink:0 }}>{el.rotate||0}°</span>
                        <button onClick={()=>updateEl(el.id,{rotate:0})} style={{ padding:"2px 8px", background:"none", border:`1px solid ${C.grayL}`, borderRadius:5, fontSize:10, color:C.gray, cursor:"pointer" }}>R</button>
                      </div>
                      <label style={LS}>エフェクト</label>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <input type="checkbox" id={`sh_${el.id}`} checked={el.shadow} onChange={e=>updateEl(el.id,{shadow:e.target.checked})} />
                          <label htmlFor={`sh_${el.id}`} style={{ fontSize:13, cursor:"pointer" }}>ドロップシャドウ</label>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <input type="checkbox" id={`ol_${el.id}`} checked={el.outline} onChange={e=>updateEl(el.id,{outline:e.target.checked})} />
                          <label htmlFor={`ol_${el.id}`} style={{ fontSize:13, cursor:"pointer" }}>縁取り</label>
                          {el.outline&&<><input type="color" value={el.outlineColor} onChange={e=>updateEl(el.id,{outlineColor:e.target.value})} style={{ width:32, height:28, borderRadius:6, border:"none", cursor:"pointer" }} /><input type="range" min="1" max="20" value={el.outlineWidth} onChange={e=>updateEl(el.id,{outlineWidth:Number(e.target.value)})} style={{ flex:1 }} /><span style={{ fontSize:11, color:C.gray }}>{el.outlineWidth}px</span></>}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <input type="checkbox" id={`gl_${el.id}`} checked={el.glow} onChange={e=>updateEl(el.id,{glow:e.target.checked})} />
                          <label htmlFor={`gl_${el.id}`} style={{ fontSize:13, cursor:"pointer" }}>外光（グロー）</label>
                          {el.glow&&<input type="color" value={el.glowColor} onChange={e=>updateEl(el.id,{glowColor:e.target.value})} style={{ width:32, height:28, borderRadius:6, border:"none", cursor:"pointer" }} />}
                        </div>
                      </div>
                      <button onClick={()=>setEditing(null)} style={{ width:"100%", padding:"12px", background:C.ink, border:"none", borderRadius:10, color:C.white, fontSize:14, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer" }}>✅ 編集完了</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={onGenerate} disabled={generating} style={{ width:"100%", marginTop:16, padding:"16px", background:generating?`${C.g1}60`:`linear-gradient(135deg,${C.g1} 7%,${C.g2} 97%)`, border:"none", borderRadius:14, color:C.white, fontSize:15, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:generating?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {generating?<><Spinner size={18} color={C.white}/>生成中...</>:"✦ バナーを生成する"}
      </button>
    </div>
  );
}

function DoneScreen({ downloadUrl, onReset, onBack }) {
  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"36px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:68, height:68, borderRadius:"50%", margin:"0 auto 12px", background:`linear-gradient(135deg,${C.g1} 7%,${C.g2} 97%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, boxShadow:`0 8px 28px ${C.g1}50` }}>✓</div>
        <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>バナー完成！</h2>
        <p style={{ margin:"6px 0 0", fontSize:12, color:C.gray }}>PNG</p>
      </div>
      {downloadUrl&&(
        <div style={{ borderRadius:12, overflow:"hidden", border:`2px solid ${C.g1}`, marginBottom:18, display:"flex", justifyContent:"center", maxHeight:480 }}>
          <img src={downloadUrl} style={{ height:480, width:"auto", display:"block" }} />
        </div>
      )}
      <a href={downloadUrl} download={`banner_${new Date().toLocaleDateString("ja-JP").replace(/\//g,"-")}_${Date.now()}.png`} style={{ display:"block", width:"100%", padding:"17px", background:`linear-gradient(135deg,${C.g1} 7%,${C.g2} 97%)`, borderRadius:14, textAlign:"center", color:C.white, fontSize:15, fontWeight:700, textDecoration:"none", fontFamily:"'Noto Sans JP',sans-serif", boxShadow:`0 6px 28px ${C.g1}50`, marginBottom:10 }}>↓ ダウンロード（PNG）</a>
      <button onClick={onBack}  style={{ width:"100%", padding:"13px", background:"transparent", border:`1.5px solid ${C.grayL}`, borderRadius:14, color:C.inkS, fontSize:14, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer", marginBottom:8 }}>← 編集に戻る</button>
      <button onClick={onReset} style={{ width:"100%", padding:"13px", background:"transparent", border:`1.5px solid ${C.grayL}`, borderRadius:14, color:C.gray, fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer" }}>最初からやり直す</button>
    </div>
  );
}

function drawCanvas(canvas, elements, bgImg, W, H, selectedId, CW, CH) {
  if(!canvas)return;
  const r=W/CW; const ctx=canvas.getContext("2d", {alpha:true});
  ctx.clearRect(0,0,W,H); ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
  if(bgImg){ ctx.drawImage(bgImg,0,0,W,H); }
  else { const g=ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,"rgb(235,97,0)"); g.addColorStop(1,"rgb(241,141,0)"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  [...elements].sort((a,b)=>a.zIndex-b.zIndex).forEach(el=>{ if(el.type==="image") drawImageEl(ctx,el,r,selectedId===el.id); else drawTextEl(ctx,el,r,selectedId===el.id); });
  ctx.restore();
}

function drawTextEl(ctx, el, r, isSelected) {
  const font=FONTS.find(f=>f.id===el.font)||FONTS[0];
  const fontSize=(TEXT_SIZES[el.size]||72)*el.scale*r;
  ctx.save(); ctx.translate(el.x*r, el.y*r);
  if(el.rotate) ctx.rotate(el.rotate*Math.PI/180);
  ctx.font=`${font.weight} ${fontSize}px ${font.family},sans-serif`;
  ctx.fillStyle=el.color;
  const drawLine=(text,x,y)=>{
    if(el.outline){ctx.save();ctx.strokeStyle=el.outlineColor;ctx.lineWidth=(el.outlineWidth||4)*r;ctx.lineJoin="round";ctx.strokeText(text,x,y);ctx.restore();}
    if(el.shadow){ctx.save();ctx.shadowColor="rgba(0,0,0,0.7)";ctx.shadowOffsetX=2*r;ctx.shadowOffsetY=2*r;ctx.shadowBlur=2*r;ctx.fillStyle=el.color;ctx.fillText(text,x,y);ctx.restore();}
    if(el.glow){ctx.save();ctx.shadowColor=el.glowColor;ctx.shadowBlur=30*r;ctx.fillStyle=el.color;ctx.fillText(text,x,y);ctx.restore();}
    ctx.fillStyle=el.color; ctx.fillText(text,x,y);
  };
  if(el.vertical){
    ctx.textAlign="center"; ctx.textBaseline="top";
    const chars=el.text.split(""); const totalH=chars.length*fontSize*1.1;
    chars.forEach((ch,i)=>drawLine(ch,0,-totalH/2+i*fontSize*1.1));
  } else {
    ctx.textAlign="center"; ctx.textBaseline="middle";
    const lines=el.text.split("\n"); const totalH=lines.length*fontSize*1.3;
    lines.forEach((line,i)=>drawLine(line,0,-totalH/2+(i+0.5)*fontSize*1.3));
  }
  if(isSelected&&!el.locked){
    const hw=getElHalfW(el)*el.scale*r, hh=getElHalfH(el)*el.scale*r;
    ctx.strokeStyle="rgba(235,97,0,0.9)"; ctx.lineWidth=2; ctx.setLineDash([6,3]);
    ctx.strokeRect(-hw,-hh,hw*2,hh*2); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawImageEl(ctx, el, r, isSelected) {
  if(!el.src)return;
  let img=imgCache[el.src];
  if(!img){ img=new Image(); img.crossOrigin="anonymous"; img.src=el.src; if(img.complete)imgCache[el.src]=img; }
  if(!img.complete)return;
  const w=el.naturalW*el.scale*r, h=el.naturalH*el.scale*r;
  ctx.save(); ctx.translate(el.x*r,el.y*r);
  if(el.rotate) ctx.rotate(el.rotate*Math.PI/180);
  ctx.drawImage(img,-w/2,-h/2,w,h);
  if(isSelected&&!el.locked){ctx.strokeStyle="rgba(235,97,0,0.9)";ctx.lineWidth=2;ctx.setLineDash([6,3]);ctx.strokeRect(-w/2,-h/2,w,h);ctx.setLineDash([]);}
  ctx.restore();
}

function getElHalfW(el){ if(el.type==="image")return el.naturalW/2; const fs=TEXT_SIZES[el.size]||72; if(el.vertical)return fs*0.6; return Math.max(...el.text.split("\n").map(l=>l.length))*fs*0.55; }
function getElHalfH(el){ if(el.type==="image")return el.naturalH/2; const fs=TEXT_SIZES[el.size]||72; if(el.vertical)return el.text.length*fs*1.1/2; return el.text.split("\n").length*fs*1.3/2; }

const TB=(bg)=>({ padding:"9px 16px", background:bg, border:"none", borderRadius:10, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Noto Sans JP',sans-serif", display:"flex", alignItems:"center", gap:4 });
const SB=(bg=C.grayL)=>({ padding:"4px 8px", background:bg, border:"none", borderRadius:5, color:bg===C.grayL?C.ink:C.white, fontSize:10, cursor:"pointer" });
const LS={ display:"block", fontSize:11, fontWeight:700, color:C.gray, marginBottom:5 };
const SS={ width:"100%", padding:"9px 12px", marginBottom:10, background:C.cream, border:`1px solid ${C.grayL}`, borderRadius:8, fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, outline:"none" };

function Spinner({ size=20, color=C.g1 }) {
  return <div style={{ width:size, height:size, flexShrink:0, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />;
}
