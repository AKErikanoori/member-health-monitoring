import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPTS = ["Produksi","Packing","Polibox","Delivery","Planning","Quality Control",
  "Engineering","Maintenance","Purchasing","Logistik","HRD","Finance","General Affairs",
  "IT / Digitalisasi","Manajemen"];
const MONTHS = ["Mei","Jun","Jul"];
const PARAMS = [
  {key:"beratBadan",label:"Berat Badan",unit:"kg",ph:"68"},
  {key:"tensi",label:"Tensi",unit:"mmHg",ph:"120/80"},
  {key:"gulaDarah",label:"Gula Darah",unit:"mg/dL",ph:"95"},
  {key:"kolesterol",label:"Kolesterol",unit:"mg/dL",ph:"180"},
  {key:"asamUrat",label:"Asam Urat",unit:"mg/dL",ph:"5.5"},
  {key:"bodyFat",label:"Body Fat",unit:"%",ph:"22"},
  {key:"viseral",label:"Visceral Fat",unit:"lvl",ph:"7"},
  {key:"bmi",label:"BMI",unit:"",ph:"22.5"},
  {key:"bodyAge",label:"Body Age",unit:"thn",ph:"32"},
];

// ─── KPI CLASSIFICATION (4 critical indicators) ───────────────────────────────
// Sources: AHA/ACC 2017, ADA 2024, WHO, Kemenkes RI 2021
const KPI = {
  kolesterol: {
    label:"Kolesterol",
    ref:"≥ 200 mg/dL",
    refFull:"Tinggi: ≥200 mg/dL · Borderline: 200–239 · High: ≥240 (AHA/ACC)",
    isTinggi: v => +v >= 200,
  },
  gulaDarah: {
    label:"Gula Darah",
    ref:"≥ 100 mg/dL",
    refFull:"Tinggi: ≥100 mg/dL · Pre-diabetes: 100–125 · DM: ≥126 (ADA 2024)",
    isTinggi: v => +v >= 100,
  },
  tensi: {
    label:"Tensi",
    ref:"≥ 140/90 mmHg",
    refFull:"Tinggi: ≥140 sys atau ≥90 dia (Hipertensi Stage 2 – JNC 8 / Kemenkes RI)",
    isTinggi: v => { const[s,d]=(v||"").split("/").map(Number); return s>=140||d>=90; },
  },
  bmi: {
    label:"BMI",
    ref:"> 30",
    refFull:"Tinggi: >30 (Obese Class I – WHO) · Asia: >27.5 termasuk risiko",
    isTinggi: v => +v > 30,
  },
};
const KPI_KEYS = Object.keys(KPI);

// Get which KPIs are "tinggi" for a member (uses latest month with KPI data)
const getKpiBad = (m) => {
  const latestMo = [...MONTHS].reverse().find(mo => KPI_KEYS.some(k => m.data?.[mo]?.[k]));
  if (!latestMo) return [];
  return KPI_KEYS.filter(k => m.data?.[latestMo]?.[k] && KPI[k].isTinggi(m.data[latestMo][k]));
};

// BAHAYA = 2+ KPI tinggi | PERHATIAN = 1 KPI tinggi | NORMAL = 0 KPI tinggi
const getKpiStatus = (m) => {
  const hasAnyData = KPI_KEYS.some(k => MONTHS.some(mo => m.data?.[mo]?.[k]));
  if (!hasAnyData) return null;
  const bad = getKpiBad(m);
  if (bad.length >= 2) return "X";
  if (bad.length === 1) return "W";
  return "N";
};

const getLatestMonth = (m) =>
  [...MONTHS].reverse().find(mo => KPI_KEYS.some(k => m.data?.[mo]?.[k])) || null;

// Per-param individual judge (for form color coding)
const PARAM_JUDGE = {
  beratBadan:{judge:()=>null,std:"Ideal"},
  tensi:{std:"<120/80",judge:v=>{const[s,d]=(v||"").split("/").map(Number);if(!s||!d)return null;if(s<120&&d<80)return"N";if(s<140&&d<90)return"W";return"X";}},
  gulaDarah:{std:"<100",judge:v=>{const n=+v;if(!n)return null;return n<100?"N":n<126?"W":"X";}},
  kolesterol:{std:"<200",judge:v=>{const n=+v;if(!n)return null;return n<200?"N":n<240?"W":"X";}},
  asamUrat:{std:"L≤7/P≤6",judge:(v,g)=>{const n=+v;if(!n)return null;const l=g==="P"?6:7;return n<=l?"N":n<=l+1?"W":"X";}},
  bodyFat:{std:"<25%",judge:v=>{const n=+v;if(!n)return null;return n<25?"N":n<30?"W":"X";}},
  viseral:{std:"≤9",judge:v=>{const n=+v;if(!n)return null;return n<=9?"N":n<=14?"W":"X";}},
  bmi:{std:"18.5–24.9",judge:v=>{const n=+v;if(!n)return null;return(n>=18.5&&n<25)?"N":n<30?"W":"X";}},
  bodyAge:{std:"≤Usia",judge:(v,_,u)=>{const n=+v,a=+u;if(!n||!a)return null;return n<=a?"N":n<=a+5?"W":"X";}},
};

const JC = {
  N:{l:"Normal",e:"✅",bg:"#dcfce7",bd:"#4ade80",tx:"#15803d",dark:"#166534"},
  W:{l:"Perhatian",e:"⚠️",bg:"#fef9c3",bd:"#facc15",tx:"#92400e",dark:"#78350f"},
  X:{l:"Bahaya",e:"🚨",bg:"#fee2e2",bd:"#f87171",tx:"#991b1b",dark:"#7f1d1d"},
  null:{l:"Belum diisi",e:"—",bg:"#f8fafc",bd:"#e2e8f0",tx:"#94a3b8",dark:"#475569"},
};
const DEPT_COLORS=["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444","#84cc16","#f97316","#6366f1","#14b8a6","#e11d48","#7c3aed","#0ea5e9","#22c55e"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const emptyData   = () => MONTHS.reduce((a,m)=>({...a,[m]:PARAMS.reduce((b,p)=>({...b,[p.key]:""}),{})}),{});
const deptColor   = d => DEPT_COLORS[DEPTS.indexOf(d)%DEPT_COLORS.length]||"#6b7280";
const monthFill   = (m,mo) => Math.round(PARAMS.filter(p=>m.data?.[mo]?.[p.key]).length/PARAMS.length*100);
const load = async k => { try{ const r=await window.storage.get(k); return r?JSON.parse(r.value):null; }catch{ return null; } };
const save = async (k,v) => { try{ await window.storage.set(k,JSON.stringify(v)); }catch{} };

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function StatusBadge({j,small=false}) {
  const c=JC[j]||JC[null];
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:c.bg,color:c.tx,
    border:`1.5px solid ${c.bd}`,borderRadius:20,padding:small?"2px 7px":"3px 10px",
    fontSize:small?10:11,fontWeight:700,whiteSpace:"nowrap"}}>{c.e&&<span style={{fontSize:small?9:10}}>{c.e}</span>}{c.l}</span>;
}

function Avatar({nama="?",status,size=44}) {
  const c=JC[status]||JC[null];
  return <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
    background:`linear-gradient(135deg,${c.bg},${c.bd})`,border:`2.5px solid ${c.bd}`,
    display:"flex",alignItems:"center",justifyContent:"center",
    fontWeight:900,fontSize:size*0.38,color:c.tx}}>{nama[0]?.toUpperCase()||"?"}</div>;
}

function DeptTag({dept,small=false}) {
  const c=deptColor(dept);
  return <span style={{background:c+"18",color:c,border:`1.5px solid ${c}40`,
    borderRadius:6,padding:small?"1px 6px":"2px 8px",fontSize:small?10:11,fontWeight:700,whiteSpace:"nowrap"}}>{dept}</span>;
}

function PinPad({onSubmit,error,label}) {
  const [p,setP]=useState(["","","",""]);
  const refs=[useRef(),useRef(),useRef(),useRef()];
  useEffect(()=>refs[0].current?.focus(),[]);
  const press=(i,v)=>{
    if(!/^\d$/.test(v)&&v!=="")return;
    const n=[...p]; n[i]=v; setP(n);
    if(v&&i<3)refs[i+1].current?.focus();
    if(v&&i===3){const f=n.join(""); if(f.length===4)setTimeout(()=>onSubmit(f),80);}
  };
  const back=(i,e)=>{if(e.key==="Backspace"&&!p[i]&&i>0)refs[i-1].current?.focus();};
  return (
    <div>
      {label&&<p style={{textAlign:"center",color:"#64748b",fontSize:13,marginBottom:20}}>{label}</p>}
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
        {p.map((v,i)=>(
          <input key={i} ref={refs[i]} type="password" inputMode="numeric" maxLength={1} value={v}
            onChange={e=>press(i,e.target.value)} onKeyDown={e=>back(i,e)}
            style={{width:58,height:68,textAlign:"center",fontSize:30,fontWeight:900,fontFamily:"monospace",
              border:error?"2px solid #ef4444":`2px solid ${v?"#10b981":"#e2e8f0"}`,
              borderRadius:16,background:v?"#ecfdf5":"#fff",color:"#064e3b",outline:"none",
              boxShadow:v?"0 4px 14px rgba(16,185,129,.25)":"0 1px 4px rgba(0,0,0,.06)",transition:"all .15s"}}/>
        ))}
      </div>
      {error&&<div style={{textAlign:"center",color:"#dc2626",fontSize:13,fontWeight:600,background:"#fee2e2",borderRadius:10,padding:"10px 16px"}}>❌ PIN salah, coba lagi</div>}
    </div>
  );
}

// ─── STATUS PANEL (slide-in when stat card clicked) ───────────────────────────
function StatusPanel({status, members, onSelectMember, onClose}) {
  const jc = JC[status]||JC[null];
  const filteredM = members.filter(m=>getKpiStatus(m)===status);

  // Group by dept
  const usedDepts = DEPTS.filter(d=>filteredM.some(m=>m.bagian===d));

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.45)",backdropFilter:"blur(3px)",display:"flex",justifyContent:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:"min(420px,100%)",background:"#fff",height:"100%",display:"flex",flexDirection:"column",
          boxShadow:"-4px 0 32px rgba(0,0,0,.2)",animation:"slideIn .25s ease"}}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${jc.dark}e0,${jc.dark})`,padding:"20px 20px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{color:"#fff",fontWeight:900,fontSize:20}}>{jc.e} Member {jc.l}</div>
              <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:2}}>{filteredM.length} orang ditemukan</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",width:32,height:32,borderRadius:8,fontSize:16,cursor:"pointer",fontWeight:700}}>✕</button>
          </div>

          {/* KPI Legend for X and W */}
          {status!=="N"&&(
            <div style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700,marginBottom:6,letterSpacing:.5,textTransform:"uppercase"}}>
                {status==="X"?"≥ 2 KPI Tinggi":"1 KPI Tinggi"}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {KPI_KEYS.map(k=>(
                  <span key={k} style={{background:"rgba(255,255,255,.25)",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:600}}>{KPI[k].label}: {KPI[k].ref}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Member list */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {filteredM.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:"#94a3b8"}}>
              <div style={{fontSize:36,marginBottom:8}}>🎉</div>
              <div style={{fontSize:14}}>Tidak ada member dalam kategori ini</div>
            </div>
          )}
          {usedDepts.map(dept=>{
            const dm = filteredM.filter(m=>m.bagian===dept);
            return (
              <div key={dept} style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:deptColor(dept),flexShrink:0}}/>
                  <span style={{fontWeight:800,fontSize:12,color:"#1e3a2f",textTransform:"uppercase",letterSpacing:.4}}>{dept}</span>
                  <span style={{fontSize:11,color:"#94a3b8"}}>({dm.length})</span>
                </div>
                {dm.map(m=>{
                  const badList = getKpiBad(m);
                  const latMo = getLatestMonth(m);
                  return (
                    <div key={m.id} onClick={()=>onSelectMember(m)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:12,
                        border:"1.5px solid #e2e8f0",marginBottom:6,cursor:"pointer",background:"#f8fafc",
                        transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="#f0fdf4";e.currentTarget.style.borderColor="#bbf7d0";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#e2e8f0";}}>
                      <Avatar nama={m.nama} status={status} size={38}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#1e3a2f"}}>{m.nama}</div>
                        <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{m.usia} thn · {m.gender} · {latMo}</div>
                        {badList.length>0&&(
                          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>
                            {badList.map(k=>(
                              <span key={k} style={{background:jc.bg,color:jc.tx,border:`1px solid ${jc.bd}`,
                                borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>
                                {KPI[k].label} {KPI[k].ref}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{color:"#94a3b8",fontSize:16}}>›</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── KPI REFERENCE CARD ───────────────────────────────────────────────────────
function KpiReferenceCard() {
  const [open,setOpen] = useState(false);
  return (
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",marginBottom:14,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",padding:"12px 16px",display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
        <span style={{fontSize:16}}>📋</span>
        <span style={{fontWeight:700,fontSize:13,color:"#1e3a2f"}}>Referensi Nilai KPI Kesehatan</span>
        <span style={{marginLeft:"auto",color:"#059669",fontWeight:700,fontSize:12}}>{open?"Tutup ▲":"Lihat ▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"0 16px 16px"}}>
          <div style={{background:"#f0fdf4",borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#065f46",lineHeight:1.7}}>
            <strong>Klasifikasi Status:</strong><br/>
            🚨 <strong>BAHAYA</strong> — ≥ 2 dari 4 KPI tinggi secara bersamaan<br/>
            ⚠️ <strong>PERHATIAN</strong> — tepat 1 dari 4 KPI tinggi<br/>
            ✅ <strong>NORMAL</strong> — tidak ada KPI yang tinggi
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#f0fdf4"}}>
                  {["Indikator","Nilai Tinggi","Referensi"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#065f46",borderBottom:"1.5px solid #d1fae5",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KPI_KEYS.map((k,i)=>(
                  <tr key={k} style={{background:i%2===0?"#fff":"#f8fafc"}}>
                    <td style={{padding:"7px 10px",fontWeight:700,color:"#1e3a2f",whiteSpace:"nowrap"}}>{KPI[k].label}</td>
                    <td style={{padding:"7px 10px",color:"#dc2626",fontWeight:700,whiteSpace:"nowrap"}}>{KPI[k].ref}</td>
                    <td style={{padding:"7px 10px",color:"#6b7280",fontSize:10,lineHeight:1.4}}>{KPI[k].refFull}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:10,color:"#94a3b8",marginTop:8,lineHeight:1.5}}>
            * Sumber: AHA/ACC 2017, ADA 2024, JNC 8, WHO, Kemenkes RI 2021. Nilai ini berlaku untuk pria dan wanita dewasa.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({members, isAdmin, onAdd, onSelect, onLogout, saving}) {
  const [search,setSearch]         = useState("");
  const [filterStatus,setFilterStatus] = useState("Semua");
  const [statusPanel,setStatusPanel]   = useState(null); // N/W/X
  const [collapsedDepts,setCollapsedDepts] = useState({});

  const counts = members.reduce((a,m)=>{
    const s = getKpiStatus(m);
    if(s) a[s]=(a[s]||0)+1;
    else a.noData=(a.noData||0)+1;
    return a;
  },{N:0,W:0,X:0,noData:0});

  const filteredAll = members.filter(m=>{
    if(filterStatus!=="Semua"&&getKpiStatus(m)!==filterStatus)return false;
    return m.nama.toLowerCase().includes(search.toLowerCase())||
           m.bagian.toLowerCase().includes(search.toLowerCase());
  });

  // Group by dept
  const usedDepts = DEPTS.filter(d=>filteredAll.some(m=>m.bagian===d));
  const toggleDept = d => setCollapsedDepts(p=>({...p,[d]:!p[d]}));

  const hdrBg = isAdmin
    ? "linear-gradient(135deg,#064e3b 0%,#059669 100%)"
    : "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)";

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <style>{`
        @media(min-width:768px){.dash-body{max-width:940px!important}}
        @media(min-width:768px){.stat-row{grid-template-columns:repeat(4,1fr)!important}}
        .stat-card{cursor:pointer;transition:transform .15s,box-shadow .15s}
        .stat-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.12)!important}
        .member-row:hover{background:#f0fdf4!important}
        .dept-member-row:hover{background:#f0fdf4!important}
      `}</style>

      {/* Header */}
      <div style={{background:hdrBg,padding:"16px 20px",position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 12px rgba(0,0,0,.15)"}}>
        <div className="dash-body" style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:940,margin:"0 auto"}}>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:18}}>{isAdmin?"💉":"📊"} Health Monitor</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11,marginTop:1}}>
              {isAdmin?"Admin · Suster":"Viewer · Management"} {saving?"· 🔄 Saving…":"· 🟢 Live"}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {isAdmin&&<button onClick={onAdd} style={{background:"#fff",color:"#059669",border:"none",borderRadius:12,padding:"8px 16px",fontWeight:800,fontSize:13,cursor:"pointer"}}>+ Tambah</button>}
            <button onClick={onLogout} style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:12,padding:"8px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Keluar</button>
          </div>
        </div>
      </div>

      <div className="dash-body" style={{padding:"20px 16px",maxWidth:940,margin:"0 auto"}}>

        {/* ── STAT CARDS (clickable) ── */}
        <div className="stat-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[
            {s:null,n:members.length,l:"Total Member",bg:"#f0fdf4",c:"#059669",bd:"#bbf7d0",e:"👥",clickable:false},
            {s:"N",n:counts.N,l:"Normal",bg:"#dcfce7",c:"#16a34a",bd:"#4ade80",e:"✅",clickable:true},
            {s:"W",n:counts.W,l:"Perhatian",bg:"#fef9c3",c:"#a16207",bd:"#facc15",e:"⚠️",clickable:true},
            {s:"X",n:counts.X,l:"Bahaya",bg:"#fee2e2",c:"#dc2626",bd:"#f87171",e:"🚨",clickable:true},
          ].map((s,i)=>(
            <div key={i} className={s.clickable?"stat-card":""} onClick={s.clickable?()=>setStatusPanel(s.s):undefined}
              style={{background:s.bg,borderRadius:18,padding:"16px 10px",textAlign:"center",
                border:`1.5px solid ${s.bd}`,position:"relative",
                boxShadow:s.clickable?"0 2px 8px rgba(0,0,0,.06)":"none"}}>
              <div style={{fontSize:22,marginBottom:4}}>{s.e}</div>
              <div style={{fontSize:28,fontWeight:900,color:s.c,lineHeight:1}}>{s.n}</div>
              <div style={{fontSize:11,color:"#6b7280",marginTop:4,fontWeight:600}}>{s.l}</div>
              {s.clickable&&<div style={{position:"absolute",bottom:6,right:10,fontSize:10,color:s.c,fontWeight:700,opacity:.7}}>Klik untuk detail ›</div>}
            </div>
          ))}
        </div>

        {/* KPI Reference */}
        <KpiReferenceCard/>

        {/* Filters */}
        <div style={{background:"#fff",borderRadius:14,padding:12,marginBottom:14,border:"1px solid #e2e8f0",display:"flex",flexWrap:"wrap",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Cari nama atau bagian..."
            style={{flex:"1 1 200px",padding:"10px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{flex:"1 1 150px",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}>
            <option value="Semua">Semua Status</option>
            <option value="N">✅ Normal</option>
            <option value="W">⚠️ Perhatian</option>
            <option value="X">🚨 Bahaya</option>
          </select>
        </div>

        {/* ── GROUPED MEMBER LIST ── */}
        {filteredAll.length===0&&(
          <div style={{background:"#fff",borderRadius:18,border:"1px solid #e2e8f0",padding:"40px 24px",textAlign:"center",color:"#94a3b8"}}>
            <div style={{fontSize:36,marginBottom:8}}>🔍</div>
            <div style={{fontSize:14}}>{members.length===0?"Belum ada member. Klik + Tambah.":"Tidak ditemukan."}</div>
          </div>
        )}

        {usedDepts.map(dept=>{
          const dm = filteredAll.filter(m=>m.bagian===dept);
          const dc = dm.reduce((a,m)=>{const s=getKpiStatus(m)||"null";a[s]=(a[s]||0)+1;return a},{});
          const collapsed = collapsedDepts[dept];
          const dc_color = deptColor(dept);

          return (
            <div key={dept} style={{background:"#fff",borderRadius:18,border:"1px solid #e2e8f0",marginBottom:12,overflow:"hidden"}}>
              {/* Dept header */}
              <div onClick={()=>toggleDept(dept)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",
                  background:"#f8fafc",borderBottom:collapsed?"none":"1px solid #e2e8f0",
                  cursor:"pointer",userSelect:"none"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:dc_color,flexShrink:0}}/>
                <span style={{fontWeight:800,fontSize:14,color:"#1e3a2f",flex:1}}>{dept}</span>
                <span style={{fontSize:12,color:"#94a3b8",marginRight:8}}>{dm.length} member</span>
                {/* Status mini counts */}
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  {dc["X"]>0&&<span style={{background:"#fee2e2",color:"#991b1b",border:"1px solid #f87171",borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:700}}>🚨{dc["X"]}</span>}
                  {dc["W"]>0&&<span style={{background:"#fef9c3",color:"#92400e",border:"1px solid #facc15",borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:700}}>⚠️{dc["W"]}</span>}
                  {dc["N"]>0&&<span style={{background:"#dcfce7",color:"#15803d",border:"1px solid #4ade80",borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:700}}>✅{dc["N"]}</span>}
                </div>
                <span style={{color:"#94a3b8",fontSize:16,transform:collapsed?"rotate(0deg)":"rotate(90deg)",transition:"transform .2s"}}>›</span>
              </div>

              {/* Members */}
              {!collapsed&&dm.map((m,i)=>{
                const kpist = getKpiStatus(m);
                const badList = getKpiBad(m);
                return (
                  <div key={m.id} className="dept-member-row" onClick={()=>onSelect(m)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",
                      borderBottom:i<dm.length-1?"1px solid #f8fafc":"none",
                      cursor:"pointer",background:"#fff",transition:"background .1s"}}>
                    <Avatar nama={m.nama} status={kpist} size={44}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1e3a2f",marginBottom:3}}>{m.nama}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>{m.usia} thn · {m.gender}
                        {getLatestMonth(m)&&<span style={{marginLeft:6,background:"#f1f5f9",padding:"0 5px",borderRadius:4}}>Data: {getLatestMonth(m)}</span>}
                      </div>
                      {badList.length>0&&(
                        <div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>
                          {badList.map(k=>(
                            <span key={k} style={{
                              background:kpist==="X"?"#fee2e2":"#fef9c3",
                              color:kpist==="X"?"#991b1b":"#92400e",
                              border:`1px solid ${kpist==="X"?"#f87171":"#facc15"}`,
                              borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>
                              {KPI[k].label}↑
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                      <StatusBadge j={kpist}/>
                      <div style={{display:"flex",gap:3}}>
                        {MONTHS.map(mo=>{
                          const pct=monthFill(m,mo);
                          return (
                            <div key={mo} title={`${mo}: ${pct}%`}
                              style={{width:24,height:5,borderRadius:3,background:pct===100?"#22c55e":pct>0?"#f59e0b":"#e2e8f0",transition:"width .3s"}}/>
                          );
                        })}
                      </div>
                    </div>
                    <span style={{color:"#cbd5e1",fontSize:18}}>›</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Status Panel Overlay */}
      {statusPanel&&(
        <StatusPanel status={statusPanel} members={members}
          onSelectMember={m=>{setStatusPanel(null);onSelect(m);}}
          onClose={()=>setStatusPanel(null)}/>
      )}
    </div>
  );
}

// ─── SETUP, HOME, PIN (reused from v4) ───────────────────────────────────────
function HomeScreen({onRole}) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#064e3b 0%,#065f46 40%,#047857 70%,#059669 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <div style={{textAlign:"center",marginBottom:44}}>
        <div style={{fontSize:76,marginBottom:14,animation:"float 3s ease-in-out infinite"}}>🏥</div>
        <h1 style={{color:"#fff",fontSize:30,fontWeight:900,margin:0,letterSpacing:-1}}>Health Monitor</h1>
        <p style={{color:"#6ee7b7",fontSize:14,margin:"8px 0 0",fontWeight:500}}>PT Sugity Creatives</p>
      </div>
      <div style={{width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={()=>onRole("admin")}
          style={{background:"#fff",border:"none",borderRadius:22,padding:"22px 24px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,boxShadow:"0 8px 32px rgba(0,0,0,.25)",textAlign:"left",width:"100%"}}>
          <div style={{width:54,height:54,borderRadius:16,background:"linear-gradient(135deg,#065f46,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>💉</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:16,color:"#1e3a2f"}}>Admin — Suster</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>Input & kelola data kesehatan</div>
          </div>
          <span style={{fontSize:22,color:"#059669"}}>›</span>
        </button>
        <button onClick={()=>onRole("viewer")}
          style={{background:"rgba(255,255,255,.12)",backdropFilter:"blur(10px)",border:"1.5px solid rgba(255,255,255,.25)",borderRadius:22,padding:"22px 24px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,textAlign:"left",width:"100%"}}>
          <div style={{width:54,height:54,borderRadius:16,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>📊</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:16,color:"#fff"}}>Viewer — Management</div>
            <div style={{fontSize:12,color:"#a7f3d0",marginTop:3}}>Lihat laporan & status kesehatan</div>
          </div>
          <span style={{fontSize:22,color:"#6ee7b7"}}>›</span>
        </button>
      </div>
      <p style={{color:"rgba(255,255,255,.4)",fontSize:11,marginTop:32}}>Preview Mode · Data lokal</p>
    </div>
  );
}

function PinScreen({role,onSuccess,onBack}) {
  const [err,setErr]=useState(false);
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",display:"flex",flexDirection:"column"}}>
      <div style={{background:role==="admin"?"linear-gradient(135deg,#064e3b,#059669)":"linear-gradient(135deg,#1e3a5f,#2563eb)",padding:"20px 24px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:28,cursor:"pointer",padding:0,opacity:.8}}>‹</button>
        <div style={{color:"#fff",fontWeight:800,fontSize:17}}>{role==="admin"?"Admin — Suster":"Viewer — Management"}</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:380,background:"#fff",borderRadius:24,padding:"40px 28px",boxShadow:"0 4px 24px rgba(0,0,0,.08)",border:"1px solid #e2e8f0"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:56,marginBottom:14}}>{role==="admin"?"💉":"📊"}</div>
            <h2 style={{fontWeight:900,fontSize:22,color:"#1e3a2f",margin:0}}>PIN {role==="admin"?"Admin":"Viewer"}</h2>
          </div>
          <PinPad label={role==="admin"?"PIN khusus Suster":"PIN khusus Management"} onSubmit={onSuccess} error={err}/>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({onSave}) {
  const [aPin,setAPin]=useState(""); const [vPin,setVPin]=useState(""); const [err,setErr]=useState("");
  const submit=()=>{
    if(aPin.length!==4||!/^\d{4}$/.test(aPin))return setErr("PIN Admin harus 4 digit angka");
    if(vPin.length!==4||!/^\d{4}$/.test(vPin))return setErr("PIN Viewer harus 4 digit angka");
    if(aPin===vPin)return setErr("PIN Admin dan Viewer harus berbeda");
    onSave({admin:aPin,viewer:vPin});
  };
  const inp={width:"100%",padding:"14px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:24,fontFamily:"monospace",fontWeight:700,textAlign:"center",outline:"none",background:"#f8fafc",color:"#1e3a2f",letterSpacing:10};
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#064e3b,#047857)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400,background:"#fff",borderRadius:24,padding:"40px 28px",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:12}}>⚙️</div>
          <h2 style={{fontWeight:900,fontSize:22,color:"#1e3a2f",margin:0}}>Setup Pertama</h2>
          <p style={{color:"#64748b",fontSize:13,margin:"8px 0 0",lineHeight:1.6}}>Buat PIN untuk Admin & Viewer.<br/>Lakukan ini hanya sekali.</p>
        </div>
        {[["💉 PIN Admin (Suster)",aPin,setAPin],["📊 PIN Viewer (Management)",vPin,setVPin]].map(([lbl,val,set],i)=>(
          <div key={i} style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:"#065f46",marginBottom:6,display:"block"}}>{lbl}</label>
            <input style={inp} type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={val} onChange={e=>set(e.target.value.replace(/\D/g,""))}/>
          </div>
        ))}
        {err&&<div style={{color:"#dc2626",fontSize:13,fontWeight:600,background:"#fee2e2",borderRadius:10,padding:"10px 14px",marginBottom:16}}>⚠️ {err}</div>}
        <button onClick={submit} style={{width:"100%",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer"}}>
          Simpan & Mulai →
        </button>
      </div>
    </div>
  );
}

function AddMemberScreen({onSave,onBack}) {
  const [form,setForm]=useState({nama:"",bagian:"",usia:"",gender:"L"}); const [err,setErr]=useState("");
  const F=(k,v)=>setForm(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!form.nama.trim())return setErr("Nama wajib diisi");
    if(!form.bagian)return setErr("Pilih bagian");
    onSave({...form,nama:form.nama.trim(),id:Date.now(),data:emptyData()});
  };
  const inp={width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,outline:"none",background:"#f8fafc",color:"#1e3a2f"};
  const lbl={fontSize:12,fontWeight:700,color:"#065f46",marginBottom:6,display:"block"};
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <div style={{background:"linear-gradient(135deg,#064e3b,#059669)",padding:"16px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:28,cursor:"pointer",padding:0,opacity:.8}}>‹</button>
        <div style={{color:"#fff",fontWeight:800,fontSize:17}}>Tambah Member Baru</div>
      </div>
      <div style={{padding:"24px 16px",maxWidth:520,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:20,padding:"24px",border:"1px solid #e2e8f0",boxShadow:"0 2px 12px rgba(0,0,0,.05)"}}>
          <div style={{marginBottom:14}}><label style={lbl}>Nama Lengkap *</label><input style={inp} placeholder="e.g. Budi Santoso" value={form.nama} onChange={e=>F("nama",e.target.value)}/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Bagian / Departemen *</label>
            <select style={{...inp,appearance:"auto"}} value={form.bagian} onChange={e=>F("bagian",e.target.value)}>
              <option value="">Pilih bagian…</option>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:12,marginBottom:20}}>
            <div style={{flex:1}}><label style={lbl}>Usia (thn)</label><input style={inp} type="number" placeholder="35" value={form.usia} onChange={e=>F("usia",e.target.value)}/></div>
            <div style={{flex:1}}><label style={lbl}>Gender</label>
              <select style={{...inp,appearance:"auto"}} value={form.gender} onChange={e=>F("gender",e.target.value)}>
                <option value="L">Laki-laki (L)</option><option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>
          {err&&<div style={{color:"#dc2626",fontSize:13,fontWeight:600,background:"#fee2e2",borderRadius:10,padding:"10px 14px",marginBottom:14}}>⚠️ {err}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onBack} style={{flex:1,background:"#f8fafc",color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Batal</button>
            <button onClick={submit} style={{flex:2,background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:14,padding:"12px",fontSize:14,fontWeight:800,cursor:"pointer"}}>✅ Simpan Member</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberFormScreen({member,onSave,onDelete,onBack,isViewer=false}) {
  const [data,setData]=useState(JSON.parse(JSON.stringify(member.data||emptyData())));
  const [mo,setMo]=useState(MONTHS[0]); const [saved,setSaved]=useState(false);
  const handleSave=()=>{ onSave({...member,data}); setSaved(true); setTimeout(()=>setSaved(false),2500); };
  const set=(p,v)=>setData(prev=>({...prev,[mo]:{...prev[mo],[p]:v}}));
  const kpist = getKpiStatus({...member,data});
  const badList = getKpiBad({...member,data});

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <style>{`@media(min-width:768px){.pform{max-width:940px!important}.pgrid{display:grid!important;grid-template-columns:1fr 1fr;gap:12px!important}}`}</style>
      <div style={{background:isViewer?"linear-gradient(135deg,#1e3a5f,#2563eb)":"linear-gradient(135deg,#064e3b,#059669)",padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
        <div className="pform" style={{display:"flex",alignItems:"center",gap:12,maxWidth:940,margin:"0 auto"}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",fontSize:28,cursor:"pointer",padding:0,opacity:.8}}>‹</button>
          <Avatar nama={member.nama} status={kpist} size={42}/>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:16}}>{member.nama}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11}}>{member.bagian} · {member.usia} thn · {member.gender}</div>
          </div>
          <StatusBadge j={kpist}/>
          {saved&&<div style={{background:"#6ee7b7",color:"#064e3b",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700}}>✅ Tersimpan!</div>}
        </div>
      </div>

      <div className="pform" style={{padding:16,maxWidth:940,margin:"0 auto"}}>
        {/* KPI summary for this member */}
        {badList.length>0&&(
          <div style={{background:kpist==="X"?"#fee2e2":"#fef9c3",borderRadius:14,padding:"12px 16px",marginBottom:14,
            border:`1.5px solid ${kpist==="X"?"#f87171":"#facc15"}`}}>
            <div style={{fontWeight:700,fontSize:13,color:kpist==="X"?"#991b1b":"#92400e",marginBottom:6}}>
              {kpist==="X"?"🚨 BAHAYA — Beberapa KPI tinggi:":"⚠️ PERHATIAN — KPI tinggi:"}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {badList.map(k=>(
                <span key={k} style={{background:"rgba(255,255,255,.7)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700,
                  color:kpist==="X"?"#991b1b":"#92400e"}}>
                  {KPI[k].label}: {KPI[k].ref}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Month tabs */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {MONTHS.map(m=>(
            <button key={m} onClick={()=>setMo(m)} style={{flex:1,padding:"10px 0",borderRadius:14,fontWeight:800,fontSize:14,cursor:"pointer",
              border:mo===m?"none":"2px solid #e2e8f0",
              background:mo===m?(isViewer?"linear-gradient(135deg,#1e3a5f,#2563eb)":"linear-gradient(135deg,#059669,#047857)"):"#fff",
              color:mo===m?"#fff":"#6b7280",boxShadow:mo===m?"0 4px 14px rgba(0,0,0,.2)":"none",transition:"all .2s"}}>
              {m}<div style={{fontSize:9,opacity:.8,marginTop:2}}>{monthFill(member,m)}% diisi</div>
            </button>
          ))}
        </div>

        {/* Params */}
        <div style={{background:"#fff",borderRadius:20,border:"1px solid #e2e8f0",overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",fontWeight:800,fontSize:13,color:"#065f46",textTransform:"uppercase",letterSpacing:.5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Hasil Pemeriksaan — {mo}</span>
            <div style={{display:"flex",gap:4}}>
              {KPI_KEYS.map(k=>{
                const val=data[mo]?.[k]||"";
                const bad=val&&KPI[k].isTinggi(val);
                return val?(
                  <span key={k} style={{background:bad?"#fee2e2":"#dcfce7",color:bad?"#991b1b":"#15803d",
                    borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700,border:`1px solid ${bad?"#f87171":"#4ade80"}`}}>
                    {KPI[k].label}{bad?"↑":"✓"}
                  </span>
                ):null;
              })}
            </div>
          </div>
          <div className="pgrid" style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            {PARAMS.map(p=>{
              const val=data[mo]?.[p.key]||"";
              const j=PARAM_JUDGE[p.key]?.judge(val,member.gender,member.usia)||null;
              const isKpi=KPI_KEYS.includes(p.key);
              const kpiBad=isKpi&&val&&KPI[p.key].isTinggi(val);
              const jc_=j?(JC[j]||JC[null]):JC[null];
              return (
                <div key={p.key} style={{background:val?jc_.bg+"80":"#f8fafc",borderRadius:14,padding:"12px 14px",
                  border:`${isKpi?"2px":"1.5px"} solid ${val?jc_.bd:"#e2e8f0"}`,transition:"all .2s",position:"relative"}}>
                  {isKpi&&<div style={{position:"absolute",top:6,right:8,fontSize:9,fontWeight:700,
                    color:"#94a3b8",textTransform:"uppercase",letterSpacing:.4}}>KPI</div>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontWeight:700,fontSize:13,color:"#1e3a2f"}}>
                      {p.label} {p.unit&&<span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>({p.unit})</span>}
                    </label>
                    {val&&kpiBad&&<span style={{background:"#fee2e2",color:"#991b1b",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,border:"1px solid #f87171"}}>🚨 KPI Tinggi</span>}
                    {val&&!kpiBad&&j&&<StatusBadge j={j} small/>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input style={{flex:1,padding:"9px 12px",borderRadius:10,border:`1.5px solid ${val?jc_.bd:"#e2e8f0"}`,
                      background:val?jc_.bg:"#fff",color:"#1e3a2f",outline:"none",fontSize:15,fontFamily:"monospace",fontWeight:700}}
                      placeholder={p.ph} value={val} disabled={isViewer}
                      onChange={e=>set(p.key,e.target.value)}/>
                    <span style={{fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>
                      {isKpi?`KPI: ${KPI[p.key].ref}`:PARAM_JUDGE[p.key]?.std}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rekap 3 bulan */}
        <div style={{background:"#fff",borderRadius:20,border:"1px solid #e2e8f0",overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",fontWeight:800,fontSize:13,color:"#065f46",textTransform:"uppercase",letterSpacing:.5}}>Rekap 3 Bulan</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f8fafc"}}>
                <th style={{textAlign:"left",padding:"8px 16px",color:"#6b7280",fontWeight:700,borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>Parameter</th>
                {MONTHS.map(m=><th key={m} colSpan={2} style={{textAlign:"center",padding:"8px",color:"#6b7280",fontWeight:700,borderBottom:"1px solid #f1f5f9"}}>{m}</th>)}
              </tr></thead>
              <tbody>{PARAMS.map((p,pi)=>(
                <tr key={p.key} style={{background:pi%2===0?"#fff":"#f8fafc"}}>
                  <td style={{padding:"7px 16px",fontWeight:KPI_KEYS.includes(p.key)?800:600,color:"#374151",whiteSpace:"nowrap"}}>
                    {p.label}{KPI_KEYS.includes(p.key)&&<span style={{color:"#059669",fontSize:9,fontWeight:700,marginLeft:4}}>KPI</span>}
                  </td>
                  {MONTHS.map(m=>{
                    const v=data[m]?.[p.key]||"";
                    const j=PARAM_JUDGE[p.key]?.judge(v,member.gender,member.usia)||null;
                    const kpiBad=KPI_KEYS.includes(p.key)&&v&&KPI[p.key].isTinggi(v);
                    const jc_=j?(JC[j]||JC[null]):JC[null];
                    return [
                      <td key={m+"v"} style={{textAlign:"center",padding:"7px 4px",fontWeight:700,color:v?jc_.tx:"#cbd5e1"}}>{v||"—"}</td>,
                      <td key={m+"j"} style={{textAlign:"center",padding:"6px 8px"}}>
                        {kpiBad&&<span style={{background:"#fee2e2",color:"#991b1b",borderRadius:4,padding:"1px 5px",fontSize:10,fontWeight:700}}>↑KPI</span>}
                        {!kpiBad&&v&&<StatusBadge j={j} small/>}
                      </td>
                    ];
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {!isViewer&&(
          <div style={{display:"flex",gap:10,paddingBottom:32}}>
            <button onClick={()=>onDelete(member.id)} style={{flex:1,background:"#fff",color:"#dc2626",border:"1.5px solid #fca5a5",borderRadius:14,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🗑 Hapus</button>
            <button onClick={handleSave} style={{flex:2,background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:14,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer"}}>💾 Simpan Data {mo}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [members,setMembers]=useState([]);
  const [config,setConfig]=useState(null);
  const [screen,setScreen]=useState("loading");
  const [role,setRole]=useState(null);
  const [pinErr,setPinErr]=useState(false);
  const [selected,setSelected]=useState(null);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    (async()=>{
      const [m,c]=await Promise.all([load("hm_members"),load("hm_config")]);
      setMembers(m||[]); setConfig(c);
      setScreen(c?"home":"setup");
    })();
  },[]);

  const persist=async m=>{ setSaving(true); await save("hm_members",m); setSaving(false); };

  const handlePin=pin=>{
    if(role==="admin"&&pin===config.admin){setPinErr(false);setScreen("admin");}
    else if(role==="viewer"&&pin===config.viewer){setPinErr(false);setScreen("viewer");}
    else setPinErr(true);
  };
  const handleSaveMember=async m=>{
    const updated=members.find(x=>x.id===m.id)?members.map(x=>x.id===m.id?m:x):[...members,m];
    setMembers(updated); await persist(updated);
    if(selected?.id===m.id)setSelected(m);
  };
  const handleDelete=async id=>{
    if(!confirm("Hapus member ini?"))return;
    const updated=members.filter(m=>m.id!==id);
    setMembers(updated); await persist(updated);
    setScreen(role==="admin"?"admin":"viewer"); setSelected(null);
  };
  const handleAdd=async m=>{ const updated=[...members,m]; setMembers(updated); await persist(updated); setScreen("admin"); };

  if(screen==="loading")return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#064e3b",color:"#6ee7b7",fontSize:18,fontFamily:"sans-serif"}}>🏥 Loading…</div>;
  if(screen==="setup")return <SetupScreen onSave={async p=>{await save("hm_config",p);setConfig(p);setScreen("home");}}/>;
  if(screen==="home")return <HomeScreen onRole={r=>{setRole(r);setPinErr(false);setScreen("pin");}}/>;
  if(screen==="pin")return <PinScreen role={role} onSuccess={handlePin} onBack={()=>setScreen("home")}/>;
  if(screen==="admin")return <Dashboard members={members} isAdmin saving={saving} onAdd={()=>setScreen("add")} onSelect={m=>{setSelected(m);setScreen("form");}} onLogout={()=>setScreen("home")}/>;
  if(screen==="add")return <AddMemberScreen onSave={handleAdd} onBack={()=>setScreen("admin")}/>;
  if(screen==="form"&&selected)return <MemberFormScreen member={selected} onSave={handleSaveMember} onDelete={handleDelete} onBack={()=>setScreen(role==="admin"?"admin":"viewer")}/>;
  if(screen==="viewer")return <Dashboard members={members} isAdmin={false} saving={false} onAdd={()=>{}} onSelect={m=>{setSelected(m);setScreen("form");}} onLogout={()=>setScreen("home")}/>;
  return null;
}
