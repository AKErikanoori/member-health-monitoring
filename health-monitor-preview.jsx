import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPTS = [
  "Produksi","Packing","Polibox","Delivery","Planning",
  "Quality Control","Engineering","Maintenance","Purchasing",
  "Logistik","HRD","Finance","General Affairs","IT / Digitalisasi","Manajemen",
];
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
const STD = {
  beratBadan:{std:"Ideal",judge:()=>null},
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
  N:{l:"Normal",e:"✅",bg:"#dcfce7",bd:"#4ade80",tx:"#15803d"},
  W:{l:"Perhatian",e:"⚠️",bg:"#fef9c3",bd:"#facc15",tx:"#92400e"},
  X:{l:"Bahaya",e:"🚨",bg:"#fee2e2",bd:"#f87171",tx:"#991b1b"},
  null:{l:"—",e:"",bg:"#f8fafc",bd:"#e2e8f0",tx:"#94a3b8"},
};
const DEPT_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444","#84cc16","#f97316","#6366f1","#14b8a6","#e11d48","#7c3aed","#0ea5e9","#22c55e"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const emptyData   = () => MONTHS.reduce((a,m)=>({...a,[m]:PARAMS.reduce((b,p)=>({...b,[p.key]:""}),{})}),{});
const deptColor   = d => DEPT_COLORS[DEPTS.indexOf(d) % DEPT_COLORS.length] || "#6b7280";
const getJudge    = (k,v,g,u) => v ? (STD[k]?.judge(v,g,u)||null) : null;
const getWorst    = m => {
  let w=null;
  MONTHS.forEach(mo=>PARAMS.forEach(p=>{
    const j=getJudge(p.key,m.data?.[mo]?.[p.key],m.gender,m.usia);
    if(j==="X")w="X"; else if(j==="W"&&w!=="X")w="W"; else if(j==="N"&&!w)w="N";
  }));
  return w;
};
const monthFill = (m,mo) => {
  const filled = PARAMS.filter(p=>m.data?.[mo]?.[p.key]).length;
  return Math.round(filled/PARAMS.length*100);
};

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
const load = async k => { try{ const r=await window.storage.get(k); return r?JSON.parse(r.value):null; }catch{ return null; } };
const save = async (k,v) => { try{ await window.storage.set(k,JSON.stringify(v)); }catch{} };

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────

function StatusBadge({j}) {
  const c = JC[j]||JC[null];
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,background:c.bg,color:c.tx,
      border:`1.5px solid ${c.bd}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
      {c.e && <span>{c.e}</span>}{c.l}
    </span>
  );
}

function Avatar({nama="?", worst, size=44}) {
  const c = worst ? (JC[worst]||JC[null]) : JC[null];
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:`linear-gradient(135deg,${c.bg},${c.bd})`,
      border:`2.5px solid ${c.bd}`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontWeight:900,fontSize:size*0.38,color:c.tx}}>
      {nama[0]?.toUpperCase()||"?"}
    </div>
  );
}

function PinPad({onSubmit, error, label}) {
  const [p,setP] = useState(["","","",""]);
  const refs = [useRef(),useRef(),useRef(),useRef()];
  useEffect(()=>{ refs[0].current?.focus(); },[]);
  const press = (i,v) => {
    if(!/^\d$/.test(v)&&v!=="")return;
    const n=[...p]; n[i]=v; setP(n);
    if(v&&i<3) refs[i+1].current?.focus();
    if(v&&i===3){const f=n.join(""); if(f.length===4)setTimeout(()=>onSubmit(f),80);}
  };
  const back = (i,e) => { if(e.key==="Backspace"&&!p[i]&&i>0){ refs[i-1].current?.focus(); } };
  return (
    <div>
      {label&&<p style={{textAlign:"center",color:"#64748b",fontSize:13,marginBottom:20}}>{label}</p>}
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
        {p.map((v,i)=>(
          <input key={i} ref={refs[i]} type="password" inputMode="numeric" maxLength={1} value={v}
            onChange={e=>press(i,e.target.value)} onKeyDown={e=>back(i,e)}
            style={{width:58,height:68,textAlign:"center",fontSize:30,fontWeight:900,fontFamily:"monospace",
              border:error?"2px solid #ef4444":`2px solid ${v?"#10b981":"#e2e8f0"}`,
              borderRadius:16,background:v?"#ecfdf5":"#fff",color:"#064e3b",
              outline:"none",boxShadow:v?"0 4px 14px rgba(16,185,129,0.25)":"0 1px 4px rgba(0,0,0,0.06)",
              transition:"all 0.15s"}}/>
        ))}
      </div>
      {error&&<div style={{textAlign:"center",color:"#dc2626",fontSize:13,fontWeight:600,
        background:"#fee2e2",borderRadius:10,padding:"10px 16px"}}>❌ PIN salah, coba lagi</div>}
    </div>
  );
}

function ProgressRing({pct, size=40}) {
  const r = (size-6)/2, circ = 2*Math.PI*r;
  const color = pct===100?"#22c55e":pct>0?"#f59e0b":"#e2e8f0";
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
        strokeLinecap="round" style={{transition:"stroke-dashoffset 0.4s"}}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{fill:pct===100?"#16a34a":"#64748b",fontSize:9,fontWeight:700,transform:"rotate(90deg)",transformOrigin:`${size/2}px ${size/2}px`}}>
        {pct}%
      </text>
    </svg>
  );
}

function DeptTag({dept}) {
  return <span style={{background:deptColor(dept)+"18",color:deptColor(dept),border:`1.5px solid ${deptColor(dept)}40`,
    borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{dept}</span>;
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

function HomeScreen({onRole}) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#064e3b 0%,#065f46 40%,#047857 70%,#059669 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:72,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🏥</div>
        <h1 style={{color:"#fff",fontSize:28,fontWeight:900,margin:0,letterSpacing:-1}}>Health Monitor</h1>
        <p style={{color:"#6ee7b7",fontSize:14,margin:"8px 0 0",fontWeight:500}}>PT Sugity Creatives</p>
      </div>
      <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={()=>onRole("admin")} style={{
          background:"#fff",border:"none",borderRadius:20,padding:"22px 24px",cursor:"pointer",
          display:"flex",alignItems:"center",gap:16,
          boxShadow:"0 8px 32px rgba(0,0,0,0.2)",transition:"transform 0.15s",textAlign:"left"}}>
          <div style={{width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,#065f46,#059669)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>💉</div>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:"#1e3a2f"}}>Admin — Suster</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Input & kelola data kesehatan member</div>
          </div>
          <span style={{marginLeft:"auto",fontSize:20,color:"#059669"}}>›</span>
        </button>
        <button onClick={()=>onRole("viewer")} style={{
          background:"rgba(255,255,255,0.12)",backdropFilter:"blur(10px)",
          border:"1.5px solid rgba(255,255,255,0.25)",borderRadius:20,padding:"22px 24px",cursor:"pointer",
          display:"flex",alignItems:"center",gap:16,transition:"transform 0.15s",textAlign:"left"}}>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.15)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>📊</div>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:"#fff"}}>Viewer — Management</div>
            <div style={{fontSize:12,color:"#a7f3d0",marginTop:2}}>Lihat laporan & status kesehatan</div>
          </div>
          <span style={{marginLeft:"auto",fontSize:20,color:"#6ee7b7"}}>›</span>
        </button>
      </div>
      <p style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginTop:32}}>Preview Mode · Data lokal</p>
    </div>
  );
}

function PinScreen({role, onSuccess, onBack}) {
  const [err,setErr] = useState(false);
  const isAdmin = role==="admin";
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(135deg,#064e3b,#059669)",padding:"20px 24px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#6ee7b7",fontSize:26,cursor:"pointer",padding:0,lineHeight:1}}>‹</button>
        <div>
          <div style={{color:"#fff",fontWeight:800,fontSize:17}}>{isAdmin?"Admin — Suster":"Viewer — Management"}</div>
          <div style={{color:"#6ee7b7",fontSize:11}}>Masukkan PIN untuk melanjutkan</div>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:380}}>
          <div style={{background:"#fff",borderRadius:24,padding:"36px 28px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:"1px solid #e2e8f0"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:52,marginBottom:12}}>{isAdmin?"💉":"📊"}</div>
              <h2 style={{fontWeight:900,fontSize:20,color:"#1e3a2f",margin:0}}>PIN {isAdmin?"Admin":"Viewer"}</h2>
            </div>
            <PinPad label={isAdmin?"PIN khusus Suster":"PIN khusus Management"} onSubmit={onSuccess} error={err}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({onSave}) {
  const [aPin,setAPin] = useState("");
  const [vPin,setVPin] = useState("");
  const [err,setErr] = useState("");
  const submit = () => {
    if(aPin.length!==4||!/^\d{4}$/.test(aPin)) return setErr("PIN Admin harus 4 digit angka");
    if(vPin.length!==4||!/^\d{4}$/.test(vPin)) return setErr("PIN Viewer harus 4 digit angka");
    if(aPin===vPin) return setErr("PIN Admin dan Viewer harus berbeda");
    onSave({admin:aPin, viewer:vPin});
  };
  const inp = {width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:22,
    fontFamily:"monospace",fontWeight:700,textAlign:"center",outline:"none",background:"#f8fafc",
    color:"#1e3a2f",boxSizing:"border-box",letterSpacing:8};
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#064e3b,#047857)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400,background:"#fff",borderRadius:24,padding:"36px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>⚙️</div>
          <h2 style={{fontWeight:900,fontSize:20,color:"#1e3a2f",margin:0}}>Setup Pertama</h2>
          <p style={{color:"#64748b",fontSize:13,margin:"8px 0 0"}}>Set PIN untuk Admin & Viewer</p>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:700,color:"#065f46",marginBottom:6,display:"block"}}>💉 PIN Admin (Suster)</label>
          <input style={inp} type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={aPin} onChange={e=>setAPin(e.target.value.replace(/\D/g,""))}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,fontWeight:700,color:"#065f46",marginBottom:6,display:"block"}}>📊 PIN Viewer (Management)</label>
          <input style={inp} type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={vPin} onChange={e=>setVPin(e.target.value.replace(/\D/g,""))}/>
        </div>
        {err&&<div style={{color:"#dc2626",fontSize:13,fontWeight:600,background:"#fee2e2",borderRadius:10,padding:"10px 14px",marginBottom:16}}>⚠️ {err}</div>}
        <button onClick={submit} style={{width:"100%",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:14,padding:"14px",fontSize:15,fontWeight:800,cursor:"pointer"}}>
          Simpan & Mulai →
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({members, onAdd, onSelect, onLogout, saving}) {
  const [search,setSearch] = useState("");
  const [filterDept,setFilterDept] = useState("Semua");
  const [filterStatus,setFilterStatus] = useState("Semua");
  const [activeMo] = useState(MONTHS[new Date().getMonth()>=4 ? Math.min(new Date().getMonth()-4,2) : 0] || MONTHS[0]);

  const counts = members.reduce((a,m)=>{const w=getWorst(m)||"null";a[w]=(a[w]||0)+1;return a},{});
  const usedDepts = [...new Set(members.map(m=>m.bagian))].filter(Boolean).sort();

  const filtered = members.filter(m=>{
    if(filterDept!=="Semua"&&m.bagian!==filterDept)return false;
    if(filterStatus!=="Semua"&&getWorst(m)!==filterStatus)return false;
    return m.nama.toLowerCase().includes(search.toLowerCase())||m.bagian.toLowerCase().includes(search.toLowerCase());
  });

  const statCards = [
    {n:members.length,l:"Total Member",bg:"#f0fdf4",c:"#059669",icon:"👥"},
    {n:counts["N"]||0,l:"Normal",bg:"#dcfce7",c:"#16a34a",icon:"✅"},
    {n:counts["W"]||0,l:"Perhatian",bg:"#fef9c3",c:"#a16207",icon:"⚠️"},
    {n:counts["X"]||0,l:"Bahaya",bg:"#fee2e2",c:"#dc2626",icon:"🚨"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <style>{`
        @media(min-width:768px){.admin-body{max-width:900px!important;}}
        .member-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.1)!important;transform:translateY(-1px);}
      `}</style>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#064e3b,#059669)",padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:900,margin:"0 auto"}}>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:18}}>🏥 Health Monitor</div>
            <div style={{color:"#6ee7b7",fontSize:11,marginTop:1}}>Admin Panel · {saving?"Menyimpan…":"Data tersimpan"}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={onAdd} style={{background:"#fff",color:"#059669",border:"none",borderRadius:12,padding:"8px 16px",fontWeight:800,fontSize:13,cursor:"pointer"}}>+ Tambah</button>
            <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:12,padding:"8px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Keluar</button>
          </div>
        </div>
      </div>

      <div className="admin-body" style={{padding:"20px 16px",maxWidth:900,margin:"0 auto"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          {statCards.map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:16,padding:"14px 10px",textAlign:"center",border:`1.5px solid ${s.c}30`}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:24,fontWeight:900,color:s.c,lineHeight:1}}>{s.n}</div>
              <div style={{fontSize:10,color:"#6b7280",marginTop:3,fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:16,border:"1px solid #e2e8f0",display:"flex",flexWrap:"wrap",gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍  Cari nama atau bagian..."
            style={{flex:"1 1 200px",padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}/>
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
            style={{flex:"1 1 140px",padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc",color:"#1e3a2f"}}>
            <option>Semua</option>
            {usedDepts.map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{flex:"1 1 120px",padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc",color:"#1e3a2f"}}>
            <option>Semua</option>
            <option value="N">✅ Normal</option>
            <option value="W">⚠️ Perhatian</option>
            <option value="X">🚨 Bahaya</option>
          </select>
        </div>

        {/* Member list */}
        <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:14,color:"#1e3a2f"}}>Daftar Member</span>
            <span style={{fontSize:12,color:"#6b7280"}}>{filtered.length} dari {members.length}</span>
          </div>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"40px 24px",color:"#94a3b8"}}>
              <div style={{fontSize:36,marginBottom:8}}>🔍</div>
              <div style={{fontSize:14}}>{members.length===0?"Belum ada member. Klik + Tambah.":"Tidak ditemukan."}</div>
            </div>
          )}
          {filtered.map((m,i)=>{
            const w=getWorst(m);
            return (
              <div key={m.id} className="member-card" onClick={()=>onSelect(m)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",
                  borderBottom:i<filtered.length-1?"1px solid #f8fafc":"none",
                  cursor:"pointer",background:"#fff",transition:"all 0.15s"}}>
                <Avatar nama={m.nama} worst={w} size={46}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e3a2f",marginBottom:3}}>{m.nama}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <DeptTag dept={m.bagian}/>
                    <span style={{fontSize:11,color:"#94a3b8"}}>{m.usia} thn · {m.gender}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <StatusBadge j={w}/>
                  <div style={{display:"flex",gap:4}}>
                    {MONTHS.map(mo=>(
                      <div key={mo} title={`${mo}: ${monthFill(m,mo)}%`}>
                        <ProgressRing pct={monthFill(m,mo)} size={28}/>
                      </div>
                    ))}
                  </div>
                </div>
                <span style={{color:"#cbd5e1",fontSize:18}}>›</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddMemberScreen({onSave, onBack}) {
  const [form,setForm] = useState({nama:"",bagian:"",usia:"",gender:"L"});
  const [err,setErr] = useState("");
  const F = (k,v) => setForm(p=>({...p,[k]:v}));
  const submit = () => {
    if(!form.nama.trim()) return setErr("Nama wajib diisi");
    if(!form.bagian) return setErr("Pilih bagian");
    onSave({...form, nama:form.nama.trim(), id:Date.now(), data:emptyData()});
  };
  const inp = {width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,
    outline:"none",background:"#f8fafc",color:"#1e3a2f",boxSizing:"border-box"};
  const lbl = {fontSize:12,fontWeight:700,color:"#065f46",marginBottom:6,display:"block"};
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <div style={{background:"linear-gradient(135deg,#064e3b,#059669)",padding:"16px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#6ee7b7",fontSize:26,cursor:"pointer",padding:0}}>‹</button>
        <div style={{color:"#fff",fontWeight:800,fontSize:17}}>Tambah Member Baru</div>
      </div>
      <div style={{padding:"24px 16px",maxWidth:520,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:20,padding:"24px",border:"1px solid #e2e8f0",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Nama Lengkap *</label>
            <input style={inp} placeholder="e.g. Budi Santoso" value={form.nama} onChange={e=>F("nama",e.target.value)}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Bagian / Departemen *</label>
            <select style={{...inp,appearance:"auto"}} value={form.bagian} onChange={e=>F("bagian",e.target.value)}>
              <option value="">Pilih bagian...</option>
              {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:12,marginBottom:20}}>
            <div style={{flex:1}}>
              <label style={lbl}>Usia (thn)</label>
              <input style={inp} type="number" placeholder="35" value={form.usia} onChange={e=>F("usia",e.target.value)}/>
            </div>
            <div style={{flex:1}}>
              <label style={lbl}>Gender</label>
              <select style={{...inp,appearance:"auto"}} value={form.gender} onChange={e=>F("gender",e.target.value)}>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>
          {err&&<div style={{color:"#dc2626",fontSize:13,fontWeight:600,background:"#fee2e2",borderRadius:10,padding:"10px 14px",marginBottom:16}}>⚠️ {err}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onBack} style={{flex:1,background:"#f8fafc",color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Batal</button>
            <button onClick={submit} style={{flex:2,background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:14,padding:"12px",fontSize:14,fontWeight:800,cursor:"pointer"}}>✅ Simpan Member</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberFormScreen({member, onSave, onDelete, onBack, isViewer=false}) {
  const [data,setData] = useState(JSON.parse(JSON.stringify(member.data||emptyData())));
  const [mo,setMo] = useState(MONTHS[0]);
  const [saved,setSaved] = useState(false);

  const handleSave = () => { onSave({...member,data}); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  const set = (p,v) => setData(prev=>({...prev,[mo]:{...prev[mo],[p]:v}}));

  const inp = {fontSize:14,fontFamily:"monospace",fontWeight:700};

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <style>{`@media(min-width:768px){.param-grid{display:grid!important;grid-template-columns:1fr 1fr;gap:12px!important;}}`}</style>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#064e3b,#059669)",padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,maxWidth:900,margin:"0 auto"}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#6ee7b7",fontSize:26,cursor:"pointer",padding:0}}>‹</button>
          <Avatar nama={member.nama} worst={getWorst(member)} size={40}/>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:16}}>{member.nama}</div>
            <div style={{color:"#6ee7b7",fontSize:11}}>{member.bagian} · {member.usia} thn · {member.gender}</div>
          </div>
          {saved&&<div style={{background:"#6ee7b7",color:"#064e3b",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700}}>✅ Tersimpan!</div>}
        </div>
      </div>

      <div style={{padding:"16px",maxWidth:900,margin:"0 auto"}}>
        {/* Month tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {MONTHS.map(m=>(
            <button key={m} onClick={()=>setMo(m)} style={{
              flex:1,padding:"10px 0",borderRadius:14,fontWeight:800,fontSize:14,cursor:"pointer",
              border:mo===m?"2px solid #059669":"2px solid #e2e8f0",
              background:mo===m?"linear-gradient(135deg,#059669,#047857)":"#fff",
              color:mo===m?"#fff":"#6b7280",
              boxShadow:mo===m?"0 4px 12px rgba(5,150,105,0.3)":"none",
              transition:"all 0.2s"}}>
              {m}
              <div style={{fontSize:9,opacity:0.8,marginTop:1}}>{monthFill(member,m)}% diisi</div>
            </button>
          ))}
        </div>

        {/* Params */}
        <div style={{background:"#fff",borderRadius:20,border:"1px solid #e2e8f0",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",fontWeight:800,fontSize:13,color:"#065f46",
            textTransform:"uppercase",letterSpacing:0.5}}>
            Hasil Pemeriksaan — {mo}
          </div>
          <div className="param-grid" style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            {PARAMS.map(p=>{
              const val=data[mo]?.[p.key]||"";
              const j=getJudge(p.key,val,member.gender,member.usia);
              const jc=JC[j]||JC[null];
              return (
                <div key={p.key} style={{background:val?jc.bg+"80":"#f8fafc",borderRadius:14,padding:"12px 14px",
                  border:`1.5px solid ${val?jc.bd:"#e2e8f0"}`,transition:"all 0.2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontWeight:700,fontSize:13,color:"#1e3a2f"}}>
                      {p.label} {p.unit&&<span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>({p.unit})</span>}
                    </label>
                    {val&&<StatusBadge j={j}/>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input style={{...inp,flex:1,padding:"8px 12px",borderRadius:10,
                      border:`1.5px solid ${val?jc.bd:"#e2e8f0"}`,background:val?jc.bg:"#fff",
                      color:"#1e3a2f",outline:"none"}}
                      placeholder={p.ph} value={val}
                      disabled={isViewer}
                      onChange={e=>set(p.key,e.target.value)}/>
                    <span style={{fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>Std: {STD[p.key].std}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary table */}
        <div style={{background:"#fff",borderRadius:20,border:"1px solid #e2e8f0",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",fontWeight:800,fontSize:13,color:"#065f46",textTransform:"uppercase",letterSpacing:0.5}}>Rekap 3 Bulan</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f8fafc"}}>
                <th style={{textAlign:"left",padding:"8px 16px",color:"#6b7280",fontWeight:700,borderBottom:"1px solid #f1f5f9"}}>Parameter</th>
                {MONTHS.map(m=><th key={m} colSpan={2} style={{textAlign:"center",padding:"8px",color:"#6b7280",fontWeight:700,borderBottom:"1px solid #f1f5f9"}}>{m}</th>)}
              </tr></thead>
              <tbody>
                {PARAMS.map((p,pi)=>(
                  <tr key={p.key} style={{background:pi%2===0?"#fff":"#f8fafc"}}>
                    <td style={{padding:"7px 16px",fontWeight:600,color:"#374151",whiteSpace:"nowrap"}}>{p.label}</td>
                    {MONTHS.map(m=>{
                      const v=data[m]?.[p.key]||"";
                      const j=getJudge(p.key,v,member.gender,member.usia);
                      const jc=JC[j]||JC[null];
                      return [
                        <td key={m+"v"} style={{textAlign:"center",padding:"7px 4px",fontWeight:700,color:v?jc.tx:"#cbd5e1"}}>{v||"—"}</td>,
                        <td key={m+"j"} style={{textAlign:"center",padding:"7px 8px"}}>{v&&<StatusBadge j={j}/>}</td>
                      ];
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!isViewer&&(
          <div style={{display:"flex",gap:10,paddingBottom:32}}>
            <button onClick={()=>onDelete(member.id)} style={{flex:1,background:"#fff",color:"#dc2626",border:"1.5px solid #fca5a5",borderRadius:14,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🗑 Hapus</button>
            <button onClick={handleSave} style={{flex:2,background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",border:"none",borderRadius:14,padding:"12px",fontSize:14,fontWeight:800,cursor:"pointer"}}>💾 Simpan Data {mo}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Viewer dashboard - reuses same layout, read-only
function ViewerDashboard({members, onSelect, onLogout}) {
  const [search,setSearch] = useState("");
  const [filterDept,setFilterDept] = useState("Semua");
  const [filterStatus,setFilterStatus] = useState("Semua");
  const counts = members.reduce((a,m)=>{const w=getWorst(m)||"null";a[w]=(a[w]||0)+1;return a},{});
  const usedDepts = [...new Set(members.map(m=>m.bagian))].filter(Boolean).sort();
  const filtered = members.filter(m=>{
    if(filterDept!=="Semua"&&m.bagian!==filterDept)return false;
    if(filterStatus!=="Semua"&&getWorst(m)!==filterStatus)return false;
    return m.nama.toLowerCase().includes(search.toLowerCase())||m.bagian.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <style>{`@media(min-width:768px){.vbody{max-width:900px!important;}}`}</style>
      <div style={{background:"linear-gradient(135deg,#1e3a5f,#2563eb)",padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:900,margin:"0 auto"}}>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:18}}>📊 Health Monitor</div>
            <div style={{color:"#93c5fd",fontSize:11,marginTop:1}}>Viewer · Read Only</div>
          </div>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:12,padding:"8px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Keluar</button>
        </div>
      </div>
      <div className="vbody" style={{padding:"20px 16px",maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          {[{n:members.length,l:"Total",bg:"#eff6ff",c:"#2563eb",e:"👥"},{n:counts["N"]||0,l:"Normal",bg:"#dcfce7",c:"#16a34a",e:"✅"},{n:counts["W"]||0,l:"Perhatian",bg:"#fef9c3",c:"#a16207",e:"⚠️"},{n:counts["X"]||0,l:"Bahaya",bg:"#fee2e2",c:"#dc2626",e:"🚨"}].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:16,padding:"14px 8px",textAlign:"center",border:`1.5px solid ${s.c}25`}}>
              <div style={{fontSize:18,marginBottom:3}}>{s.e}</div>
              <div style={{fontSize:24,fontWeight:900,color:s.c,lineHeight:1}}>{s.n}</div>
              <div style={{fontSize:10,color:"#6b7280",marginTop:3,fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:14,border:"1px solid #e2e8f0",display:"flex",flexWrap:"wrap",gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Cari..." style={{flex:"1 1 160px",padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}/>
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={{flex:"1 1 130px",padding:"9px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}>
            <option>Semua</option>{usedDepts.map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{flex:"1 1 110px",padding:"9px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}>
            <option>Semua</option><option value="N">✅ Normal</option><option value="W">⚠️ Perhatian</option><option value="X">🚨 Bahaya</option>
          </select>
        </div>
        <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
          {filtered.map((m,i)=>{
            const w=getWorst(m);
            return (
              <div key={m.id} onClick={()=>onSelect(m)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:i<filtered.length-1?"1px solid #f8fafc":"none",cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                <Avatar nama={m.nama} worst={w} size={44}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e3a2f"}}>{m.nama}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:3}}>
                    <DeptTag dept={m.bagian}/>
                    <span style={{fontSize:11,color:"#94a3b8"}}>{m.usia} thn · {m.gender}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <StatusBadge j={w}/>
                  <div style={{display:"flex",gap:4}}>{MONTHS.map(mo=><ProgressRing key={mo} pct={monthFill(m,mo)} size={28}/>)}</div>
                </div>
                <span style={{color:"#cbd5e1",fontSize:18}}>›</span>
              </div>
            );
          })}
          {filtered.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#94a3b8",fontSize:14}}>Tidak ada data</div>}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [members,setMembers] = useState([]);
  const [config,setConfig]   = useState(null); // {admin, viewer}
  const [screen,setScreen]   = useState("loading");
  const [role,setRole]       = useState(null);
  const [pinErr,setPinErr]   = useState(false);
  const [selected,setSelected] = useState(null);
  const [saving,setSaving]   = useState(false);

  // Load data
  useEffect(()=>{
    (async()=>{
      const [m,c] = await Promise.all([load("hm_members"), load("hm_config")]);
      setMembers(m||[]);
      setConfig(c);
      setScreen(c?"home":"setup");
    })();
  },[]);

  const persist = async (m) => { setSaving(true); await save("hm_members",m); setSaving(false); };

  const handleSetup = async (pins) => { await save("hm_config",pins); setConfig(pins); setScreen("home"); };

  const handlePin = (pin) => {
    if(role==="admin"&&pin===config.admin){ setPinErr(false); setScreen("admin"); }
    else if(role==="viewer"&&pin===config.viewer){ setPinErr(false); setScreen("viewer"); }
    else setPinErr(true);
  };

  const handleSaveMember = async (m) => {
    const updated = members.find(x=>x.id===m.id) ? members.map(x=>x.id===m.id?m:x) : [...members,m];
    setMembers(updated); await persist(updated);
    if(selected) setSelected(m);
  };
  const handleDeleteMember = async (id) => {
    if(!confirm("Hapus member ini?"))return;
    const updated=members.filter(m=>m.id!==id);
    setMembers(updated); await persist(updated); setScreen("admin"); setSelected(null);
  };
  const handleAddMember = async (m) => {
    const updated=[...members,m]; setMembers(updated); await persist(updated); setScreen("admin");
  };

  if(screen==="loading") return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#064e3b",color:"#6ee7b7",fontSize:18,fontFamily:"sans-serif"}}>🏥 Memuat…</div>;
  if(screen==="setup") return <SetupScreen onSave={handleSetup}/>;
  if(screen==="home") return <HomeScreen onRole={r=>{setRole(r);setPinErr(false);setScreen("pin");}}/>;
  if(screen==="pin") return <PinScreen role={role} onSuccess={handlePin} onBack={()=>setScreen("home")} error={pinErr}/>;
  if(screen==="admin") return <AdminDashboard members={members} saving={saving} onAdd={()=>setScreen("add")} onSelect={m=>{setSelected(m);setScreen("member-form");}} onLogout={()=>setScreen("home")}/>;
  if(screen==="add") return <AddMemberScreen onSave={handleAddMember} onBack={()=>setScreen("admin")}/>;
  if(screen==="member-form"&&selected) return <MemberFormScreen member={selected} onSave={handleSaveMember} onDelete={handleDeleteMember} onBack={()=>setScreen("admin")}/>;
  if(screen==="viewer") return <ViewerDashboard members={members} onSelect={m=>{setSelected(m);setScreen("viewer-detail");}} onLogout={()=>setScreen("home")}/>;
  if(screen==="viewer-detail"&&selected) return <MemberFormScreen member={selected} onSave={()=>{}} onDelete={()=>{}} onBack={()=>setScreen("viewer")} isViewer/>;
  return null;
}
