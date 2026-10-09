import { Component } from "react";

const C = { g1:"#EB6100", g2:"#F18D00", ink:"#18120A", white:"#FFFFFF", cream:"#FAF6F0", gray:"#9C8E80", grayLL:"#EDE7DF" };

const NOTES = {
  app:   "保存した作品は消えていません（この端末に保存されています）。再読み込みしてお試しください。",
  admin: "保存済みのテンプレートには影響ありません。保存前の編集内容は失われている可能性があります。",
};

// 描画中の例外で白画面にならないよう、エラー画面と再読み込みボタンを表示する
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[BannerMaker]", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"'Noto Sans JP',sans-serif", color:C.ink, boxSizing:"border-box" }}>
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.grayLL}`, padding:"28px 20px", width:"100%", maxWidth:360, textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", boxSizing:"border-box" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>⚠️</div>
          <p style={{ margin:"0 0 10px", fontSize:18, fontWeight:700 }}>エラーが発生しました</p>
          <p style={{ margin:"0 0 20px", fontSize:13, color:C.gray, lineHeight:1.6 }}>{NOTES[this.props.variant] || NOTES.app}</p>
          <button onClick={()=>window.location.reload()}
            style={{ width:"100%", minHeight:52, padding:"14px", background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:"none", borderRadius:12, color:C.white, fontSize:16, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer" }}>
            再読み込み
          </button>
        </div>
      </div>
    );
  }
}
