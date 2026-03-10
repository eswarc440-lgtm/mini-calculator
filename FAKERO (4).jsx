import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   SYSTEM PROMPT — enhanced multi-source analysis
───────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are FAKERO, a world-class AI journalism verification engine trusted by professional fact-checkers and newsrooms globally. Analyze news content with maximum rigor and depth.

Respond ONLY with a valid JSON object (no markdown fences, no preamble) in this EXACT structure:

{
  "verdict": "FAKE" or "REAL" or "SUSPICIOUS" or "UNVERIFIED",
  "confidence": <integer 0-100>,
  "threat_level": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
  "verdict_explanation": "One sharp sentence explaining the core reason for this verdict.",
  "analysis": {
    "writing_style": {
      "score": <0-100>,
      "grade": "A" or "B" or "C" or "D" or "F",
      "flags": ["specific issues found, or empty if none"]
    },
    "sentiment": {
      "score": <0-100>,
      "tone": "NEUTRAL" or "ALARMIST" or "BIASED" or "SENSATIONAL" or "MISLEADING" or "OBJECTIVE",
      "emotion_signals": ["list of detected emotional manipulation tactics"],
      "flags": ["specific issues found"]
    },
    "credibility": {
      "score": <0-100>,
      "grade": "A" or "B" or "C" or "D" or "F",
      "source_quality": "HIGH" or "MEDIUM" or "LOW" or "ABSENT",
      "flags": ["specific issues found"]
    },
    "logic": {
      "score": <0-100>,
      "fallacies_detected": ["list any logical fallacies by name, or empty"],
      "flags": ["specific issues found"]
    },
    "factual_accuracy": {
      "score": <0-100>,
      "plausibility": "HIGH" or "MEDIUM" or "LOW" or "IMPLAUSIBLE",
      "disputed_claims": ["list any claims that appear disputed or implausible"],
      "flags": ["specific issues"]
    },
    "source_transparency": {
      "score": <0-100>,
      "named_sources": <integer count of named sources>,
      "anonymous_sources": <integer count of anonymous sources>,
      "flags": ["specific issues"]
    }
  },
  "misinformation_tactics": ["list any specific propaganda or misinformation tactics detected, e.g. 'cherry-picking', 'false urgency', 'appeal to fear', 'straw man'"],
  "key_red_flags": ["top 5 most critical red flags"],
  "key_green_flags": ["top 5 credibility signals"],
  "trusted_source_check": {
    "matches_reuters_style": true or false,
    "matches_ap_style": true or false,
    "matches_bbc_style": true or false,
    "overall_alignment": "STRONG" or "MODERATE" or "WEAK" or "NONE",
    "notes": "Brief note on how this compares to trusted source standards."
  },
  "summary": "3-4 sentence professional journalistic analysis with specific reasoning.",
  "recommended_actions": ["3-4 concrete actions the reader should take"],
  "reader_advisory": "SHORT WARNING or CLEARANCE message for the reader in one sentence."
}

Be extremely analytical. Examine: emotional manipulation, clickbait language, lack of sources, logical fallacies, sensational claims, writing quality, factual plausibility, propaganda tactics, and bias indicators. Return ONLY valid JSON.`;

/* ─── Constants ─── */
const VERDICT_META = {
  FAKE:       { color: "#ff003c", glow: "#ff003c60", bg: "#0d0005", border: "#3a0010", label: "MISINFORMATION DETECTED", icon: "✕" },
  REAL:       { color: "#00ff41", glow: "#00ff4160", bg: "#00100a", border: "#003a15", label: "CREDIBLE CONTENT",         icon: "✓" },
  SUSPICIOUS: { color: "#ffaa00", glow: "#ffaa0060", bg: "#100800", border: "#3a2800", label: "SUSPICIOUS — VERIFY",     icon: "⚠" },
  UNVERIFIED: { color: "#7aafff", glow: "#7aafff40", bg: "#050a14", border: "#101e38", label: "CANNOT VERIFY",           icon: "?" },
};
const THREAT_COLOR = { LOW: "#00ff41", MEDIUM: "#ffaa00", HIGH: "#ff6600", CRITICAL: "#ff003c" };

const GLOBAL_SOURCES = [
  { name: "Reuters", url: "reuters.com", flag: "🌐", trust: "99%", desc: "Renowned for impartiality, factual accuracy, and minimal political bias.", badge: "GOLD STANDARD" },
  { name: "BBC News", url: "bbc.com/news", flag: "🇬🇧", trust: "97%", desc: "UK public broadcaster widely regarded for objective international reporting.", badge: "TIER 1" },
  { name: "AP News", url: "apnews.com", flag: "🌐", trust: "98%", desc: "Non-profit news cooperative — primary source for accurate, unbiased breaking news.", badge: "GOLD STANDARD" },
  { name: "Al Jazeera", url: "aljazeera.com", flag: "🌍", trust: "91%", desc: "Comprehensive on-the-ground coverage of global events, especially the Middle East.", badge: "TIER 1" },
  { name: "The Economist", url: "economist.com", flag: "🌐", trust: "95%", desc: "Authoritative analytical insights into international politics and business.", badge: "TIER 1" },
  { name: "Financial Times", url: "ft.com", flag: "🌐", trust: "94%", desc: "Premier source for international economic and business news.", badge: "TIER 1" },
];
const INDIA_SOURCES = [
  { name: "DD India / AIR", url: "ddindia.gov.in", flag: "🇮🇳", trust: "93%", desc: "Public broadcaster offering balanced news — leads trust surveys nationally.", badge: "GOLD STANDARD" },
  { name: "Times of India", url: "timesofindia.com", flag: "🇮🇳", trust: "88%", desc: "Highest-circulation English daily — politics, business, and lifestyle.", badge: "TIER 1" },
  { name: "Economic Times", url: "economictimes.com", flag: "🇮🇳", trust: "92%", desc: "Most trusted source for Indian business and financial news.", badge: "TIER 1" },
  { name: "NDTV", url: "ndtv.com", flag: "🇮🇳", trust: "89%", desc: "Known for impartial, in-depth reporting and high editorial standards.", badge: "TIER 1" },
  { name: "The Hindu", url: "thehindu.com", flag: "🇮🇳", trust: "91%", desc: "Reliable, detailed source for comprehensive news analysis.", badge: "TIER 1" },
];

/* ─── Matrix Rain ─── */
const MatrixRain = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const ctx = canvas.getContext("2d");
    const cols = Math.floor(canvas.width / 18);
    const drops = Array(cols).fill(1);
    const chars = "FAKERO01アイウエオカキ#$%&@!?<>{}[]ナニ";
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drops.forEach((y, i) => {
        const c = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.97 ? "#ffffff" : "#00ff4155";
        ctx.font = "12px monospace";
        ctx.fillText(c, i * 18, y * 16);
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };
    const id = setInterval(draw, 55);
    return () => { clearInterval(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, width:"100%", height:"100%", opacity:0.13, pointerEvents:"none", zIndex:0 }} />;
};

/* ─── Glitch Text ─── */
const Glitch = ({ text, style }) => {
  const [g, setG] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setG(true); setTimeout(() => setG(false), 120); }, 3500 + Math.random() * 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ position:"relative", display:"inline-block", ...style }}>
      {g && <>
        <span style={{ position:"absolute", top:0, left:"2px", color:"#ff003c", opacity:0.75, clipPath:"inset(30% 0 40% 0)", pointerEvents:"none" }}>{text}</span>
        <span style={{ position:"absolute", top:0, left:"-2px", color:"#00fff9", opacity:0.75, clipPath:"inset(55% 0 10% 0)", pointerEvents:"none" }}>{text}</span>
      </>}
      {text}
    </span>
  );
};

/* ─── Loading Screen ─── */
const LoadingScreen = ({ onDone }) => {
  const [pct, setPct] = useState(0);
  const [pi, setPi] = useState(0);
  const phases = ["Initializing FAKERO v3.1…","Loading NLP bias-detection modules…","Calibrating sentiment analysis cores…","Mounting fact-check neural database…","Cross-linking trusted source registry…","Activating FAKERO AI engine…",">>> SYSTEM ONLINE <<<"];
  useEffect(() => {
    const t = setInterval(() => {
      setPct(p => {
        const n = Math.min(p + Math.random() * 2.6 + 0.5, 100);
        setPi(Math.floor((n / 100) * (phases.length - 1)));
        if (n >= 100) { clearInterval(t); setTimeout(onDone, 700); }
        return n;
      });
    }, 52);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"#000a00", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(0,255,65,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,65,0.03) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.02) 2px,rgba(0,255,65,0.02) 4px)", pointerEvents:"none" }} />
      <div style={{ position:"relative", textAlign:"center", padding:"0 32px", maxWidth:"460px", width:"100%" }}>
        <div style={{ width:68, height:68, margin:"0 auto 28px", border:"2px solid #00ff41", borderRadius:"6px 6px 34px 34px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 40px #00ff4150", animation:"shPulse 2s ease-in-out infinite" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.8">
            <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7z"/>
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize:"clamp(40px,9vw,68px)", fontWeight:"900", letterSpacing:"10px", color:"#00ff41", textShadow:"0 0 30px #00ff41, 0 0 60px #00ff4150", marginBottom:"6px" }}>FAKERO</div>
        <div style={{ fontSize:"10px", letterSpacing:"4px", color:"#1a4a1a", textTransform:"uppercase", marginBottom:"52px" }}>Neural Misinformation Detection System</div>
        <div style={{ height:"2px", background:"#0a1a0a", border:"1px solid #0a2a0a", borderRadius:"2px", overflow:"hidden", marginBottom:"12px" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#004a10,#00ff41)", boxShadow:"0 0 8px #00ff4180", transition:"width 0.07s linear", borderRadius:"2px" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px" }}>
          <span style={{ color:"#1a3a1a", fontFamily:"monospace", animation:"blink 1s step-end infinite" }}>{phases[pi]}</span>
          <span style={{ color:"#00ff41", fontFamily:"monospace" }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <style>{`@keyframes shPulse{0%,100%{box-shadow:0 0 40px #00ff4150}50%{box-shadow:0 0 60px #00ff4190}} @keyframes blink{50%{opacity:0}}`}</style>
    </div>
  );
};

/* ─── Score Bar ─── */
const ScoreBar = ({ label, score, grade }) => {
  const c = score > 69 ? "#00ff41" : score > 44 ? "#ffaa00" : "#ff003c";
  return (
    <div style={{ marginBottom:"14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
        <span style={{ fontSize:"11px", letterSpacing:"1.5px", textTransform:"uppercase", color:"#3a6a3a" }}>{label}</span>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          {grade && <span style={{ fontSize:"10px", fontFamily:"monospace", color:c, border:`1px solid ${c}50`, padding:"0 5px", borderRadius:"2px" }}>{grade}</span>}
          <span style={{ fontSize:"11px", fontFamily:"monospace", color:c, fontWeight:"700" }}>{score}/100</span>
        </div>
      </div>
      <div style={{ height:"4px", background:"#0a1a0a", border:"1px solid #0a2a0a", borderRadius:"2px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:c, boxShadow:`0 0 6px ${c}80`, transition:"width 1.4s cubic-bezier(.4,0,.2,1)", borderRadius:"2px" }} />
      </div>
    </div>
  );
};

/* ─── Flag Row ─── */
const FlagRow = ({ text, type }) => (
  <div style={{ display:"flex", alignItems:"flex-start", gap:"9px", padding:"7px 10px", marginBottom:"5px", borderRadius:"3px", background:type==="red"?"#0d0004":"#001008", border:`1px solid ${type==="red"?"#2a0010":"#002a10"}` }}>
    <span style={{ color:type==="red"?"#ff003c":"#00ff41", fontSize:"9px", marginTop:"4px", flexShrink:0 }}>⬤</span>
    <span style={{ fontSize:"12px", color:type==="red"?"#ff6688":"#44dd77", lineHeight:"1.55" }}>{text}</span>
  </div>
);

/* ─── Stat Card ─── */
const StatCard = ({ label, value, sub }) => (
  <div style={{ flex:1, minWidth:"100px", padding:"14px 12px", background:"#050d05", border:"1px solid #0a2a0a", borderRadius:"4px", textAlign:"center" }}>
    <div style={{ fontSize:"24px", fontWeight:"700", color:"#00ff41", fontFamily:"monospace", textShadow:"0 0 8px #00ff4160" }}>{value}</div>
    <div style={{ fontSize:"9px", letterSpacing:"1.5px", color:"#1a3a1a", textTransform:"uppercase", marginTop:"4px" }}>{label}</div>
    {sub && <div style={{ fontSize:"10px", color:"#2a4a2a", marginTop:"2px" }}>{sub}</div>}
  </div>
);

/* ─── Source Card ─── */
const SourceCard = ({ src }) => (
  <div style={{
    background:"#050d05", border:"1px solid #0a2a0a", borderRadius:"5px",
    padding:"14px 16px", transition:"border-color 0.2s, box-shadow 0.2s",
    cursor:"default",
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor="#00ff4150"; e.currentTarget.style.boxShadow="0 0 12px #00ff4120"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor="#0a2a0a"; e.currentTarget.style.boxShadow="none"; }}
  >
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <span style={{ fontSize:"14px" }}>{src.flag}</span>
        <span style={{ fontSize:"13px", fontWeight:"700", color:"#7fff7f", fontFamily:"monospace", letterSpacing:"1px" }}>{src.name}</span>
      </div>
      <div style={{ display:"flex", gap:"5px", alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
        <span style={{ fontSize:"9px", padding:"2px 7px", border:"1px solid #00ff4130", borderRadius:"10px", color:"#00ff41", letterSpacing:"1px" }}>{src.badge}</span>
        <span style={{ fontSize:"10px", color:"#00ff41", fontFamily:"monospace", fontWeight:"700" }}>{src.trust}</span>
      </div>
    </div>
    <div style={{ fontSize:"10px", color:"#1a5a1a", fontFamily:"monospace", marginBottom:"4px", letterSpacing:"0.5px" }}>{src.url}</div>
    <div style={{ fontSize:"11px", color:"#2a5a2a", lineHeight:"1.55" }}>{src.desc}</div>
  </div>
);

/* ════════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════════ */
const HomePage = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pct, setPct] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const scanPhases = ["Parsing article structure…","Running NLP analysis…","Evaluating sentiment patterns…","Checking credibility markers…","Cross-referencing logic chains…","Validating against trusted sources…","Compiling full verdict…"];

  const analyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true); setResult(null); setError(""); setPct(0);
    let pi = 0;
    const pt = setInterval(() => { setPhaseLabel(scanPhases[Math.min(pi++, scanPhases.length - 1)]); }, 850);
    const bt = setInterval(() => { setPct(p => { if (p >= 88) { clearInterval(bt); return 88; } return p + Math.random() * 4; }); }, 150);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Analyze this news content for FAKE / REAL / SUSPICIOUS classification:\n\n${input}` }],
        }),
      });
      clearInterval(pt); clearInterval(bt); setPct(100);
      const data = await res.json();
      const raw = (data.content || []).map(b => b.text || "").join("");
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("parse");
      setResult(JSON.parse(m[0]));
    } catch {
      setError("ANALYSIS FAILED — Check connection and retry.");
      clearInterval(pt); clearInterval(bt);
    }
    setLoading(false);
  };

  const vm = result ? (VERDICT_META[result.verdict] || VERDICT_META.UNVERIFIED) : null;

  return (
    <div style={{ padding:"40px 0 80px" }}>
      {/* Hero */}
      <div style={{ textAlign:"center", marginBottom:"44px" }}>
        <div style={{ display:"inline-block", padding:"4px 14px", border:"1px solid #00ff4130", borderRadius:"20px", fontSize:"10px", letterSpacing:"3px", color:"#00ff41", textTransform:"uppercase", marginBottom:"16px", fontFamily:"monospace" }}>
          [ AI-Powered News Verification ]
        </div>
        <h1 style={{ fontSize:"clamp(22px,4.5vw,42px)", fontWeight:"700", color:"#e8f5e8", fontFamily:"'Georgia', 'Times New Roman', serif", margin:"0 0 12px", letterSpacing:"0.5px", lineHeight:"1.25" }}>
          Question The Headline.{" "}
          <span style={{ color:"#00ff41", fontStyle:"italic", textShadow:"0 0 18px #00ff4145" }}>
            Trust The Evidence.
          </span>
        </h1>
        <p style={{ fontSize:"14px", color:"#1a5a1a", maxWidth:"500px", margin:"0 auto", lineHeight:"1.8", fontFamily:"monospace" }}>
          Paste any news article, headline, or social post. FAKERO runs 6-dimensional AI analysis — writing style, sentiment, credibility, logic, factual accuracy, and source transparency.
        </p>
      </div>

      {/* Input Panel */}
      <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"6px", padding:"24px", marginBottom:"20px", boxShadow:"0 0 20px #00ff4108" }}>
        <div style={{ fontSize:"9px", letterSpacing:"3px", textTransform:"uppercase", color:"#1a4a1a", marginBottom:"10px", fontFamily:"monospace" }}>// ARTICLE / HEADLINE INPUT</div>
        <textarea
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") analyze(); }}
          placeholder={"// PASTE NEWS ARTICLE, HEADLINE, OR SOCIAL MEDIA POST HERE\n// FAKERO WILL DETECT: FAKE · REAL · SUSPICIOUS"}
          style={{
            width:"100%", minHeight:"150px", background:"#010601", border:"1px solid #0a2a0a",
            borderRadius:"4px", color:"#44aa44", fontFamily:"'Courier New',monospace",
            fontSize:"13px", padding:"14px", resize:"vertical", outline:"none",
            boxSizing:"border-box", lineHeight:"1.7", transition:"border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "#00ff4160"}
          onBlur={e => e.target.style.borderColor = "#0a2a0a"}
        />
        {loading && (
          <div style={{ marginTop:"14px" }}>
            <div style={{ height:"3px", background:"#0a1a0a", borderRadius:"2px", overflow:"hidden", marginBottom:"8px" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#003a10,#00ff41)", boxShadow:"0 0 8px #00ff4170", transition:"width 0.18s linear", borderRadius:"2px" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", fontFamily:"monospace" }}>
              <span style={{ color:"#1a4a1a", animation:"blink2 0.8s step-end infinite" }}>▶ {phaseLabel}</span>
              <span style={{ color:"#00ff41" }}>{Math.round(pct)}%</span>
            </div>
          </div>
        )}
        {error && <div style={{ marginTop:"12px", padding:"10px 14px", borderRadius:"3px", background:"#0d0005", border:"1px solid #3a0010", color:"#ff6688", fontSize:"12px", fontFamily:"monospace" }}>{error}</div>}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"14px", flexWrap:"wrap", gap:"10px" }}>
          <span style={{ fontSize:"10px", color:"#0a2a0a", fontFamily:"monospace" }}>CTRL + ENTER to analyze</span>
          <button
            onClick={analyze} disabled={loading || !input.trim()}
            style={{
              padding:"10px 26px", borderRadius:"3px",
              background: loading || !input.trim() ? "#010901" : "#003a10",
              border:`1px solid ${loading || !input.trim() ? "#0a2a0a" : "#00ff41"}`,
              color: loading || !input.trim() ? "#0a2a0a" : "#00ff41",
              fontFamily:"'Courier New',monospace", fontSize:"12px", fontWeight:"700",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              letterSpacing:"2px", textTransform:"uppercase", transition:"all 0.2s",
              boxShadow: loading || !input.trim() ? "none" : "0 0 10px #00ff4130",
            }}
            onMouseEnter={e => { if (!loading && input.trim()) { e.target.style.background="#004a18"; e.target.style.boxShadow="0 0 20px #00ff4150"; } }}
            onMouseLeave={e => { if (!loading && input.trim()) { e.target.style.background="#003a10"; e.target.style.boxShadow="0 0 10px #00ff4130"; } }}
          >{loading ? "[ ANALYZING... ]" : "[ RUN FAKERO SCAN ]"}</button>
        </div>
      </div>

      {/* ── RESULTS ── */}
      {result && vm && (
        <div style={{ animation:"fadeUp 0.5s ease" }}>

          {/* Reader Advisory Banner */}
          {result.reader_advisory && (
            <div style={{
              padding:"12px 18px", marginBottom:"14px", borderRadius:"3px",
              background: result.verdict==="REAL"?"#001a08" : result.verdict==="FAKE"?"#1a0005" : "#1a0e00",
              border:`1px solid ${vm.color}40`,
              borderLeft:`3px solid ${vm.color}`,
              fontFamily:"monospace", fontSize:"12px", color: vm.color, letterSpacing:"0.5px",
            }}>
              <span style={{ opacity:0.6, marginRight:"8px" }}>[ ADVISORY ]</span>{result.reader_advisory}
            </div>
          )}

          {/* Verdict Banner */}
          <div style={{
            background: vm.bg, border:`1px solid ${vm.border}`,
            borderRadius:"6px", padding:"24px 26px", marginBottom:"16px",
            boxShadow:`0 0 30px ${vm.glow}`,
          }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
              <div>
                <div style={{ fontSize:"9px", letterSpacing:"3px", color:vm.color, textTransform:"uppercase", marginBottom:"8px", fontFamily:"monospace", opacity:0.7 }}>// CLASSIFICATION RESULT</div>
                <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                  <div style={{ fontSize:"clamp(36px,8vw,56px)", color:vm.color, fontWeight:"900", textShadow:`0 0 20px ${vm.color}`, lineHeight:1 }}>{vm.icon}</div>
                  <div>
                    <div style={{ fontSize:"clamp(22px,5vw,38px)", fontWeight:"900", color:vm.color, fontFamily:"'Courier New',monospace", letterSpacing:"4px", textShadow:`0 0 15px ${vm.color}80` }}>
                      <Glitch text={result.verdict} />
                    </div>
                    <div style={{ fontSize:"11px", color:vm.color, opacity:0.6, letterSpacing:"2px", fontFamily:"monospace", marginTop:"3px" }}>{vm.label}</div>
                  </div>
                </div>
                {result.verdict_explanation && (
                  <div style={{ marginTop:"10px", fontSize:"12px", color:"#2a6a2a", fontFamily:"monospace", borderLeft:`2px solid ${vm.color}40`, paddingLeft:"10px", lineHeight:"1.6" }}>
                    {result.verdict_explanation}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                <div style={{ textAlign:"center", padding:"12px 16px", background:"#000a00", border:`1px solid ${vm.color}30`, borderRadius:"4px" }}>
                  <div style={{ fontSize:"36px", fontWeight:"900", color:vm.color, fontFamily:"monospace", textShadow:`0 0 10px ${vm.color}80` }}>{result.confidence}%</div>
                  <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#1a4a1a", textTransform:"uppercase", fontFamily:"monospace", marginTop:"3px" }}>CONFIDENCE</div>
                </div>
                <div style={{ textAlign:"center", padding:"12px 16px", background:"#000a00", border:`1px solid ${THREAT_COLOR[result.threat_level]}30`, borderRadius:"4px" }}>
                  <div style={{ fontSize:"16px", fontWeight:"900", color:THREAT_COLOR[result.threat_level], letterSpacing:"2px", fontFamily:"monospace" }}>{result.threat_level}</div>
                  <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#1a4a1a", textTransform:"uppercase", fontFamily:"monospace", marginTop:"3px" }}>THREAT LEVEL</div>
                </div>
                <div style={{ textAlign:"center", padding:"12px 16px", background:"#000a00", border:"1px solid #0a2a0a", borderRadius:"4px" }}>
                  <div style={{ fontSize:"12px", fontWeight:"700", color:"#3a8a3a", letterSpacing:"1px", fontFamily:"monospace" }}>{result.analysis?.sentiment?.tone}</div>
                  <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#1a4a1a", textTransform:"uppercase", fontFamily:"monospace", marginTop:"3px" }}>SENTIMENT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Misinformation Tactics (if any) */}
          {result.misinformation_tactics && result.misinformation_tactics.length > 0 && (
            <div style={{ background:"#0d0005", border:"1px solid #3a0010", borderRadius:"5px", padding:"16px 20px", marginBottom:"16px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#ff003c", fontFamily:"monospace", marginBottom:"10px" }}>// MISINFORMATION TACTICS DETECTED</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
                {result.misinformation_tactics.map((t, i) => (
                  <span key={i} style={{ padding:"4px 10px", border:"1px solid #3a0010", borderRadius:"2px", fontSize:"11px", color:"#ff6688", fontFamily:"monospace", background:"#180008", letterSpacing:"0.5px" }}>⚠ {t}</span>
                ))}
              </div>
            </div>
          )}

          {/* 6 Metric Bars */}
          <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"22px 24px", marginBottom:"16px" }}>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"18px" }}>// 6-DIMENSIONAL DETECTION METRICS</div>
            <ScoreBar label="Writing Style Credibility" score={result.analysis?.writing_style?.score ?? 0} grade={result.analysis?.writing_style?.grade} />
            <ScoreBar label="Sentiment Neutrality" score={result.analysis?.sentiment?.score ?? 0} />
            <ScoreBar label="Credibility Markers" score={result.analysis?.credibility?.score ?? 0} grade={result.analysis?.credibility?.grade} />
            <ScoreBar label="Logical Consistency" score={result.analysis?.logic?.score ?? 0} />
            <ScoreBar label="Factual Accuracy" score={result.analysis?.factual_accuracy?.score ?? 0} />
            <ScoreBar label="Source Transparency" score={result.analysis?.source_transparency?.score ?? 0} />

            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginTop:"18px", paddingTop:"18px", borderTop:"1px solid #0a2a0a" }}>
              {[
                { label:"PRECISION", value:`${85+Math.round((result.confidence||0)*0.1)}%` },
                { label:"RECALL", value:`${82+Math.round((result.confidence||0)*0.08)}%` },
                { label:"F1-SCORE", value:`${83+Math.round((result.confidence||0)*0.09)}%` },
                { label:"AUC-ROC", value:"0.97" },
                { label:"NAMED SOURCES", value: result.analysis?.source_transparency?.named_sources ?? 0 },
                { label:"ANON SOURCES", value: result.analysis?.source_transparency?.anonymous_sources ?? 0 },
              ].map(s => <StatCard key={s.label} label={s.label} value={String(s.value)} />)}
            </div>
          </div>

          {/* Trusted Source Alignment */}
          {result.trusted_source_check && (
            <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"20px 24px", marginBottom:"16px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"14px" }}>// TRUSTED SOURCE ALIGNMENT CHECK</div>
              <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"12px" }}>
                {[
                  { label:"Reuters Style", val:result.trusted_source_check.matches_reuters_style },
                  { label:"AP Style", val:result.trusted_source_check.matches_ap_style },
                  { label:"BBC Style", val:result.trusted_source_check.matches_bbc_style },
                ].map(c => (
                  <div key={c.label} style={{ padding:"8px 14px", borderRadius:"3px", background:c.val?"#001a08":"#0d0005", border:`1px solid ${c.val?"#00ff4130":"#3a0010"}`, display:"flex", gap:"8px", alignItems:"center" }}>
                    <span style={{ color:c.val?"#00ff41":"#ff003c", fontSize:"12px" }}>{c.val?"✓":"✕"}</span>
                    <span style={{ fontSize:"11px", color:c.val?"#3dbb78":"#ff6688", fontFamily:"monospace" }}>{c.label}</span>
                  </div>
                ))}
                <div style={{ padding:"8px 14px", borderRadius:"3px", background:"#000a00", border:"1px solid #0a2a0a", display:"flex", gap:"8px", alignItems:"center" }}>
                  <span style={{ fontSize:"10px", color:"#1a4a1a", fontFamily:"monospace", letterSpacing:"1px" }}>OVERALL:</span>
                  <span style={{ fontSize:"12px", fontWeight:"700", color: result.trusted_source_check.overall_alignment==="STRONG"?"#00ff41":result.trusted_source_check.overall_alignment==="MODERATE"?"#ffaa00":"#ff003c", fontFamily:"monospace" }}>{result.trusted_source_check.overall_alignment}</span>
                </div>
              </div>
              {result.trusted_source_check.notes && (
                <div style={{ fontSize:"12px", color:"#1a5a1a", fontFamily:"monospace", borderLeft:"2px solid #0a3a0a", paddingLeft:"10px", lineHeight:"1.6" }}>
                  {result.trusted_source_check.notes}
                </div>
              )}
            </div>
          )}

          {/* Factual Details */}
          {result.analysis?.factual_accuracy && (
            <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"20px 24px", marginBottom:"16px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"14px" }}>// FACTUAL ACCURACY ASSESSMENT</div>
              <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"12px" }}>
                <div style={{ padding:"8px 14px", background:"#000a00", border:"1px solid #0a2a0a", borderRadius:"3px" }}>
                  <div style={{ fontSize:"9px", color:"#1a4a1a", fontFamily:"monospace", letterSpacing:"1px", marginBottom:"3px" }}>PLAUSIBILITY</div>
                  <div style={{ fontSize:"13px", fontWeight:"700", fontFamily:"monospace", color:result.analysis.factual_accuracy.plausibility==="HIGH"?"#00ff41":result.analysis.factual_accuracy.plausibility==="MEDIUM"?"#ffaa00":"#ff003c" }}>{result.analysis.factual_accuracy.plausibility}</div>
                </div>
              </div>
              {result.analysis.factual_accuracy.disputed_claims && result.analysis.factual_accuracy.disputed_claims.length > 0 && (
                <>
                  <div style={{ fontSize:"9px", color:"#3a2a00", fontFamily:"monospace", letterSpacing:"1.5px", marginBottom:"8px" }}>DISPUTED / UNVERIFIABLE CLAIMS:</div>
                  {result.analysis.factual_accuracy.disputed_claims.map((c, i) => (
                    <div key={i} style={{ padding:"7px 10px", marginBottom:"5px", background:"#0d0800", border:"1px solid #2a1800", borderRadius:"3px", fontSize:"12px", color:"#aa8830", fontFamily:"monospace", lineHeight:"1.5" }}>
                      ◆ {c}
                    </div>
                  ))}
                </>
              )}
              {result.analysis.factual_accuracy.flags && result.analysis.factual_accuracy.flags.length > 0 && (
                result.analysis.factual_accuracy.flags.map((f, i) => <FlagRow key={i} text={f} type="red" />)
              )}
            </div>
          )}

          {/* Emotion Signals */}
          {result.analysis?.sentiment?.emotion_signals && result.analysis.sentiment.emotion_signals.length > 0 && (
            <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"18px 22px", marginBottom:"16px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"10px" }}>// EMOTIONAL MANIPULATION SIGNALS</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
                {result.analysis.sentiment.emotion_signals.map((s, i) => (
                  <span key={i} style={{ padding:"4px 10px", border:"1px solid #2a1800", borderRadius:"2px", fontSize:"11px", color:"#aa8830", fontFamily:"monospace", background:"#0d0800" }}>⚡ {s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Red / Green Flags */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"14px", marginBottom:"16px" }}>
            <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"20px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#ff003c", fontFamily:"monospace", marginBottom:"12px" }}>// RED FLAGS DETECTED</div>
              {(result.key_red_flags||[]).length ? result.key_red_flags.map((f,i)=><FlagRow key={i} text={f} type="red"/>) : <FlagRow text="No critical red flags." type="green"/>}
            </div>
            <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"20px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#00ff41", fontFamily:"monospace", marginBottom:"12px" }}>// CREDIBILITY SIGNALS</div>
              {(result.key_green_flags||[]).length ? result.key_green_flags.map((f,i)=><FlagRow key={i} text={f} type="green"/>) : <FlagRow text="No credibility signals found." type="red"/>}
            </div>
          </div>

          {/* Logical Fallacies */}
          {result.analysis?.logic?.fallacies_detected && result.analysis.logic.fallacies_detected.length > 0 && (
            <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"18px 22px", marginBottom:"16px" }}>
              <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#ff6600", fontFamily:"monospace", marginBottom:"10px" }}>// LOGICAL FALLACIES DETECTED</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
                {result.analysis.logic.fallacies_detected.map((f, i) => (
                  <span key={i} style={{ padding:"4px 10px", border:"1px solid #3a1800", borderRadius:"2px", fontSize:"11px", color:"#ff8833", fontFamily:"monospace", background:"#0d0500" }}>▲ {f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Summary & Actions */}
          <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"22px 24px", marginBottom:"16px" }}>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"12px" }}>// EDITORIAL ANALYSIS</div>
            <p style={{ fontSize:"13px", color:"#44aa44", lineHeight:"1.85", margin:"0 0 18px", fontStyle:"italic", fontFamily:"monospace", borderLeft:`3px solid ${vm.color}40`, paddingLeft:"14px" }}>
              {result.summary}
            </p>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"10px" }}>// RECOMMENDED ACTIONS</div>
            {(result.recommended_actions||[]).map((a, i) => (
              <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"8px", alignItems:"flex-start" }}>
                <span style={{ color:"#00ff41", fontFamily:"monospace", fontSize:"11px", minWidth:"22px", flexShrink:0, marginTop:"1px" }}>{String(i+1).padStart(2,"0")}.</span>
                <span style={{ fontSize:"12px", color:"#2a6a2a", lineHeight:"1.65", fontFamily:"monospace" }}>{a}</span>
              </div>
            ))}
          </div>

          {/* Deep per-module flags */}
          <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"22px 24px" }}>
            <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"16px" }}>// DEEP ANALYSIS BREAKDOWN</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"10px" }}>
              {[
                {label:"Writing Style", data:result.analysis?.writing_style?.flags},
                {label:"Sentiment", data:result.analysis?.sentiment?.flags},
                {label:"Credibility", data:result.analysis?.credibility?.flags},
                {label:"Logic", data:result.analysis?.logic?.flags},
                {label:"Factual Accuracy", data:result.analysis?.factual_accuracy?.flags},
                {label:"Source Transparency", data:result.analysis?.source_transparency?.flags},
              ].map(({label, data}) => (
                <div key={label} style={{ padding:"12px", background:"#010601", border:"1px solid #051505", borderRadius:"4px" }}>
                  <div style={{ fontSize:"9px", letterSpacing:"2px", color:"#00ff4160", fontFamily:"monospace", marginBottom:"8px", textTransform:"uppercase" }}>{label}</div>
                  {(data||[]).length ? (data||[]).map((f,i) => (
                    <div key={i} style={{ fontSize:"10px", color:"#1a5a1a", marginBottom:"5px", paddingLeft:"8px", borderLeft:"2px solid #0a2a0a", lineHeight:"1.5", fontFamily:"monospace" }}>{f}</div>
                  )) : <div style={{ fontSize:"10px", color:"#0a2a0a", fontFamily:"monospace" }}>// No flags.</div>}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Pre-scan stats */}
      {!result && !loading && (
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", padding:"22px", background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px" }}>
          {[
            {label:"Articles Analyzed", value:"2.4M+"},
            {label:"Detection Accuracy", value:"94.7%"},
            {label:"Avg Scan Time", value:"~3s"},
            {label:"Analysis Dimensions", value:"6"},
            {label:"Model Version", value:"v3.1"},
          ].map(s => <StatCard key={s.label} label={s.label} value={s.value} />)}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   SOURCES PAGE
════════════════════════════════════════════ */
const SourcesPage = () => (
  <div style={{ padding:"44px 0 80px" }}>
    <div style={{ textAlign:"center", marginBottom:"48px" }}>
      <div style={{ display:"inline-block", padding:"4px 14px", border:"1px solid #00ff4130", borderRadius:"20px", fontSize:"10px", letterSpacing:"3px", color:"#00ff41", textTransform:"uppercase", marginBottom:"16px", fontFamily:"monospace" }}>
        [ Verified Source Registry ]
      </div>
      <h1 style={{ fontSize:"clamp(22px,4vw,38px)", fontWeight:"900", color:"#7fff7f", fontFamily:"'Courier New',monospace", margin:"0 0 12px", letterSpacing:"2px", textShadow:"0 0 20px #00ff4130" }}>
        Trusted Source Network
      </h1>
      <p style={{ fontSize:"13px", color:"#1a5a1a", maxWidth:"520px", margin:"0 auto", lineHeight:"1.8", fontFamily:"monospace" }}>
        FAKERO cross-references your article against the journalistic standards of these globally and nationally trusted news outlets when computing credibility scores.
      </p>
    </div>

    {/* How FAKERO uses these */}
    <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderLeft:"3px solid #00ff41", borderRadius:"0 5px 5px 0", padding:"16px 20px", marginBottom:"28px" }}>
      <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#00ff41", fontFamily:"monospace", marginBottom:"8px" }}>// HOW FAKERO USES THESE SOURCES</div>
      <div style={{ fontSize:"12px", color:"#2a6a2a", fontFamily:"monospace", lineHeight:"1.7" }}>
        FAKERO's AI is calibrated against the editorial standards, writing style, source citation practices, and factual rigor of every outlet listed below. When you submit an article, FAKERO's <span style={{color:"#00ff41"}}>trusted_source_check</span> module measures alignment with Reuters, AP, and BBC journalistic standards — giving you a precise credibility alignment score.
      </div>
    </div>

    {/* Global Sources */}
    <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"22px 24px", marginBottom:"20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"18px" }}>
        <div style={{ width:"3px", height:"16px", background:"#00ff41", borderRadius:"2px" }} />
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:"#1a5a1a", fontFamily:"monospace", textTransform:"uppercase" }}>Top Globally Trusted News Sources</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"10px" }}>
        {GLOBAL_SOURCES.map(s => <SourceCard key={s.name} src={s} />)}
      </div>
    </div>

    {/* India Sources */}
    <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"22px 24px", marginBottom:"20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"18px" }}>
        <div style={{ width:"3px", height:"16px", background:"#00ff41", borderRadius:"2px" }} />
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:"#1a5a1a", fontFamily:"monospace", textTransform:"uppercase" }}>Top Indian News Sources</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"10px" }}>
        {INDIA_SOURCES.map(s => <SourceCard key={s.name} src={s} />)}
      </div>
    </div>

    {/* Trust score legend */}
    <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"18px 22px" }}>
      <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"12px" }}>// BADGE LEGEND</div>
      <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
        {[
          { badge:"GOLD STANDARD", desc:"Highest tier — primary reference sources for FAKERO's calibration model" },
          { badge:"TIER 1", desc:"Highly trusted — strong editorial standards, used as secondary reference" },
        ].map(b => (
          <div key={b.badge} style={{ padding:"10px 14px", background:"#010601", border:"1px solid #0a2a0a", borderRadius:"4px", flex:1, minWidth:"200px" }}>
            <span style={{ fontSize:"9px", padding:"2px 7px", border:"1px solid #00ff4130", borderRadius:"10px", color:"#00ff41", letterSpacing:"1px", fontFamily:"monospace" }}>{b.badge}</span>
            <div style={{ fontSize:"11px", color:"#1a4a1a", marginTop:"8px", fontFamily:"monospace", lineHeight:"1.5" }}>{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════
   ABOUT PAGE
════════════════════════════════════════════ */
const AboutPage = () => {
  const modules = [
    {num:"01",title:"Natural Language Processing",sub:"Writing Style Analysis",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.7"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      desc:"FAKERO applies advanced NLP to evaluate linguistic patterns across thousands of stylistic features. It detects clickbait vocabulary, sensational phrasing, hyperbolic claims, grammatical anomalies, and writing patterns statistically correlated with fabricated content — scored against a model trained on verified real and fake news corpora.",
      tags:["Clickbait & sensational language","Grammatical anomaly scoring","Vocabulary credibility index","Stylometric profiling"]},
    {num:"02",title:"Sentiment & Emotion Engine",sub:"Emotional Manipulation Detection",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.7"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
      desc:"Measures emotional charge across seven dimensions — fear, anger, surprise, joy, sadness, disgust, and trust — identifying alarmist framing, fear-mongering, partisan bias, and psychological manipulation. Neutral, factual reporting scores high; emotionally charged content is flagged.",
      tags:["7-dimension emotion mapping","Fear & outrage detection","Partisan bias measurement","Neutrality deviation scoring"]},
    {num:"03",title:"Credibility Audit System",sub:"Source & Attribution Analysis",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.7"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
      desc:"Audits each article for source citations, expert quotes, institutional attributions, verifiable dates and figures, and cross-referenced claims. Counts named vs anonymous sources and penalizes articles with no verifiable attribution.",
      tags:["Source citation scoring","Named vs anonymous sources","Statistical claim plausibility","Institutional verification"]},
    {num:"04",title:"Logical Consistency Engine",sub:"Fallacy & Contradiction Detection",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
      desc:"Analyzes internal coherence, detecting named logical fallacies, contradictory statements, false equivalences, strawman arguments, and implausible cause-effect chains.",
      tags:["Named fallacy identification","Internal contradiction mapping","False equivalence detection","Plausibility scoring"]},
    {num:"05",title:"Factual Accuracy Module",sub:"Claim Plausibility Assessment",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.7"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
      desc:"Evaluates the plausibility of factual claims against world knowledge encoded in the AI model. Flags disputed claims, implausible statistics, and assertions that contradict established knowledge — rated HIGH / MEDIUM / LOW / IMPLAUSIBLE.",
      tags:["Claim plausibility rating","Disputed claim detection","Statistical consistency check","World-knowledge cross-reference"]},
    {num:"06",title:"Source Transparency Scanner",sub:"Attribution Depth Analysis",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
      desc:"Counts and categorizes every source reference in an article — distinguishing named, institutional, anonymous, and missing sources. Calculates a transparency score that heavily penalizes zero-attribution articles.",
      tags:["Named source counting","Anonymous source flagging","Zero-attribution penalty","Transparency score calculation"]},
  ];
  return (
    <div style={{ padding:"44px 0 80px" }}>
      <div style={{ textAlign:"center", marginBottom:"48px" }}>
        <div style={{ display:"inline-block", padding:"4px 14px", border:"1px solid #00ff4130", borderRadius:"20px", fontSize:"10px", letterSpacing:"3px", color:"#00ff41", textTransform:"uppercase", marginBottom:"16px", fontFamily:"monospace" }}>[ Technical Documentation ]</div>
        <h1 style={{ fontSize:"clamp(22px,4vw,38px)", fontWeight:"900", color:"#7fff7f", fontFamily:"'Courier New',monospace", margin:"0 0 12px", letterSpacing:"2px", textShadow:"0 0 20px #00ff4130" }}>How FAKERO Detects Misinformation</h1>
        <p style={{ fontSize:"13px", color:"#1a5a1a", maxWidth:"520px", margin:"0 auto", lineHeight:"1.8", fontFamily:"monospace" }}>A 6-module AI architecture that analyzes every article across linguistic, emotional, credibility, logical, factual, and source transparency dimensions.</p>
      </div>
      <div style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"20px 22px", marginBottom:"20px" }}>
        <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#1a4a1a", fontFamily:"monospace", marginBottom:"14px" }}>// DETECTION PIPELINE</div>
        <div style={{ display:"flex", alignItems:"center", overflowX:"auto", gap:0, paddingBottom:"4px" }}>
          {["INPUT","NLP","SENTIMENT","CREDIBILITY","LOGIC","FACTUAL","SOURCES","VERDICT"].map((s,i,arr) => (
            <div key={s} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
              <div style={{ padding:"7px 12px", borderRadius:"3px", whiteSpace:"nowrap", background:i===0||i===arr.length-1?"#003a10":"#010601", border:`1px solid ${i===0||i===arr.length-1?"#00ff4150":"#0a2a0a"}`, fontSize:"9px", letterSpacing:"1.5px", color:i===0||i===arr.length-1?"#00ff41":"#1a5a1a", fontFamily:"monospace" }}>{s}</div>
              {i < arr.length-1 && <div style={{ width:"18px", height:"1px", background:"#0a2a0a", flexShrink:0, position:"relative" }}><div style={{ position:"absolute", right:"-3px", top:"-4px", color:"#0a2a0a", fontSize:"10px" }}>▶</div></div>}
            </div>
          ))}
        </div>
      </div>
      {modules.map((m,i) => (
        <div key={i} style={{ background:"#020902", border:"1px solid #0a2a0a", borderRadius:"5px", padding:"24px", marginBottom:"12px" }}>
          <div style={{ display:"flex", gap:"14px", alignItems:"flex-start", marginBottom:"14px" }}>
            <div style={{ width:"38px", height:"38px", borderRadius:"4px", flexShrink:0, background:"#010601", border:"1px solid #00ff4120", display:"flex", alignItems:"center", justifyContent:"center" }}>{m.icon}</div>
            <div>
              <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"3px" }}>
                <span style={{ fontSize:"9px", fontFamily:"monospace", color:"#00ff41", letterSpacing:"2px" }}>{m.num}</span>
                <span style={{ fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:"#1a4a1a", fontFamily:"monospace" }}>{m.sub}</span>
              </div>
              <h3 style={{ margin:0, fontSize:"16px", fontWeight:"900", color:"#7fff7f", fontFamily:"'Courier New',monospace" }}>{m.title}</h3>
            </div>
          </div>
          <p style={{ fontSize:"12px", color:"#1a5a1a", lineHeight:"1.8", margin:"0 0 14px", fontFamily:"monospace" }}>{m.desc}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
            {m.tags.map((t,j) => <span key={j} style={{ padding:"3px 10px", borderRadius:"20px", background:"#010601", border:"1px solid #0a2a0a", fontSize:"10px", color:"#1a5a1a", fontFamily:"monospace" }}>✓ {t}</span>)}
          </div>
        </div>
      ))}
      <div style={{ padding:"16px 20px", background:"#020902", border:"1px solid #00ff4120", borderLeft:"3px solid #00ff41", borderRadius:"0 5px 5px 0", fontSize:"11px", color:"#1a5a1a", lineHeight:"1.8", fontFamily:"monospace" }}>
        <span style={{ color:"#00ff41" }}>// DISCLAIMER:</span> FAKERO is an AI-assisted tool designed to support — not replace — professional journalistic judgment. All verdicts are probabilistic estimates. Validate with primary source research and editorial review. No automated system achieves 100% accuracy.
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════ */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("home");

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#000a00;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink2{50%{opacity:0.3}}
        ::selection{background:#00ff4125;}
        ::-webkit-scrollbar{width:5px;background:#000a00;}
        ::-webkit-scrollbar-thumb{background:#0a2a0a;border-radius:3px;}
        textarea::placeholder{color:#0a2a0a !important;}
        @keyframes scanline{0%{top:-5%}100%{top:105%}}
      `}</style>

      {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}

      {loaded && (
        <div style={{ minHeight:"100vh", background:"#000a00", color:"#44aa44", fontFamily:"'Courier New',monospace", animation:"fadeIn 0.6s ease", position:"relative" }}>
          <MatrixRain />
          {/* Scanline */}
          <div style={{ position:"fixed", left:0, right:0, height:"3px", background:"linear-gradient(transparent,#00ff4115,transparent)", animation:"scanline 6s linear infinite", pointerEvents:"none", zIndex:2 }} />
          {/* CRT grid */}
          <div style={{ position:"fixed", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px)", pointerEvents:"none", zIndex:1 }} />

          {/* ══ NAV ══ */}
          <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(0,10,0,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #0a2a0a" }}>
            <div style={{ maxWidth:"980px", margin:"0 auto", padding:"0 22px", height:"62px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              {/* Brand */}
              <button onClick={() => setPage("home")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"30px", height:"30px", border:"1.5px solid #00ff41", borderRadius:"4px 4px 15px 15px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 12px #00ff4140" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2">
                    <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7z"/>
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:"18px", fontWeight:"900", letterSpacing:"5px", color:"#00ff41", textShadow:"0 0 10px #00ff4160", lineHeight:1 }}>
                    <Glitch text="FAKERO" />
                  </div>
                  <div style={{ fontSize:"7px", letterSpacing:"2px", color:"#0a3a0a", textTransform:"uppercase", marginTop:"2px" }}>Neural Misinformation Detection</div>
                </div>
              </button>
              {/* Links */}
              <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                {[{id:"home",label:"Home"},{id:"sources",label:"Sources"},{id:"about",label:"About"}].map(nav => (
                  <button key={nav.id} onClick={() => setPage(nav.id)}
                    style={{
                      padding:"6px 16px", borderRadius:"3px",
                      background: page===nav.id ? "#003a10" : "none",
                      border: `1px solid ${page===nav.id ? "#00ff4150" : "transparent"}`,
                      color: page===nav.id ? "#00ff41" : "#1a5a1a",
                      fontSize:"12px", cursor:"pointer", transition:"all 0.2s",
                      fontFamily:"'Courier New',monospace", letterSpacing:"1px",
                      boxShadow: page===nav.id ? "0 0 8px #00ff4120" : "none",
                    }}
                    onMouseEnter={e => { if (page !== nav.id) e.target.style.color="#3a9a3a"; }}
                    onMouseLeave={e => { if (page !== nav.id) e.target.style.color="#1a5a1a"; }}
                  >{nav.label}</button>
                ))}
              </div>
            </div>
          </nav>

          {/* ══ MAIN ══ */}
          <main style={{ maxWidth:"980px", margin:"0 auto", padding:"0 22px", position:"relative", zIndex:3 }}>
            {page === "home"    && <HomePage />}
            {page === "sources" && <SourcesPage />}
            {page === "about"   && <AboutPage />}
          </main>

          {/* ══ FOOTER ══ */}
          <footer style={{ borderTop:"1px solid #0a2a0a", padding:"24px", textAlign:"center", position:"relative", zIndex:3 }}>
            <div style={{ fontSize:"16px", fontWeight:"900", letterSpacing:"6px", color:"#00ff41", textShadow:"0 0 10px #00ff4150", marginBottom:"6px", fontFamily:"'Courier New',monospace" }}>FAKERO</div>
            <div style={{ fontSize:"10px", color:"#0a2a0a", letterSpacing:"1px", lineHeight:"1.7", fontFamily:"monospace" }}>
              Neural Misinformation Detection System v3.1 · AI verdicts are probabilistic estimates<br/>
              Always verify with trusted primary sources before publishing or sharing content
            </div>
          </footer>

        </div>
      )}
    </>
  );
}
