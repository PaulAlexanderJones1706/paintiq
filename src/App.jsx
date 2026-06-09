import { useState, useRef, useEffect } from "react";

// ─── CALCULATOR ───────────────────────────────────────────────────────────────

const DEFAULT_RATES = {
  interiorWalls: 22, interiorCeilings: 18, exteriorWalls: 28, eavesLm: 15, markup: 20,
};
const COND_M  = { excellent:1.0, good:1.06, fair:1.24, poor:1.45 };
const ACCS_M  = { easy:1.0, moderate:1.12, difficult:1.30, scaffolding:1.55 };
const SURF_M  = { render:1.0, brick:1.12, weatherboard:1.18, fibro:1.25, hebel:1.06 };
const STOR_M  = { "1":1.0, "2":1.12, "3+":1.32 };
const TRVL    = { under10:0, "10to25":250, "25to50":600, over50:1100 };
const FORM_DEFAULT = {
  propertyType:"house", units:"1", sizePerUnit:"150", storeys:"1",
  scope:"both", exteriorSurface:"render", eaves:false, fascia:false,
  condition:"good", access:"easy", highCeilings:false, featureWalls:false,
  distance:"under10", rush:false, projectName:""
};

function calcEst(f, r) {
  const nu=Math.max(1,parseInt(f.units)||1), fa=Math.max(10,parseFloat(f.sizePerUnit)||100);
  const ch=f.highCeilings?3.2:2.7, pr=Math.sqrt(fa)*4*1.15;
  const iwa=pr*ch*0.85*nu, ca=fa*nu, ep=Math.sqrt(fa)*4;
  const sn=parseInt(String(f.storeys).replace("+",""))||1, ewa=ep*ch*sn*nu*0.82;
  const cm=COND_M[f.condition]||1, am=ACCS_M[f.access]||1;
  const sm=SURF_M[f.exteriorSurface]||1, stm=STOR_M[f.storeys]||1;
  let items=[], base=0;
  const add=(l,d,c)=>{items.push({label:l,detail:d,cost:c});base+=c;};
  if(f.scope==="interior"||f.scope==="both"){
    add("Interior walls",`${Math.round(iwa)} m²`,iwa*r.interiorWalls*cm*am);
    add("Ceilings",`${Math.round(ca)} m²`,ca*r.interiorCeilings*cm);
    if(f.featureWalls)add("Feature walls",`${nu} accent walls`,nu*380);
  }
  if(f.scope==="exterior"||f.scope==="both"){
    add(`Exterior walls (${f.exteriorSurface||"render"})`,`${Math.round(ewa)} m²`,ewa*r.exteriorWalls*cm*am*sm*stm);
    if(f.eaves)add("Eaves",`${Math.round(ep*nu)} lm`,ep*nu*r.eavesLm*stm);
    if(f.fascia)add("Fascia",`${Math.round(ep*nu)} lm`,ep*nu*r.eavesLm*0.65*stm);
  }
  if(f.rush){const rx=base*0.25;add("Rush premium (25%)","",rx);}
  const tc=TRVL[f.distance]||0; if(tc>0)add("Travel & mobilisation","",tc);
  const mk=base*(r.markup/100); add(`Overhead & margin (${r.markup}%)`,"",mk);
  return{items,total:base,low:Math.round(base*0.90),high:Math.round(base*1.15)};
}
const $$=n=>"$"+Math.round(n).toLocaleString("en-AU");

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const FONTS_URL="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap";

// Paint swatch colour families
const SWATCHES=[
  ["#F5E0D0","#E8B090","#C4592A","#7A3018"],
  ["#C8DDD8","#7AB5A8","#1A6B58","#0A3028"],
  ["#C8D5E2","#7A9AB8","#1A3A5C","#081828"],
  ["#F8ECC0","#F5CC60","#E0980A","#8B5E00"],
];

const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#F5F2EC;--surf:#FFFFFF;--surf2:#F0EDE6;--bdr:#E2DCD4;
  --txt:#242020;--mut:#7A7068;--acc:#C4592A;--teal:#1A6B58;
  --navy:#1A3A5C;--hi:#E0980A;--grn:#1A7A3A;
  --fh:'Oswald',sans-serif;--fb:'Source Sans 3',sans-serif;
  --sh:0 2px 16px rgba(0,0,0,.07);--sh2:0 8px 40px rgba(0,0,0,.10);
}
html,body{background:var(--bg);color:var(--txt);font-family:var(--fb);}
h1,h2,h3,h4{font-family:var(--fh);letter-spacing:.02em;}
button{cursor:pointer;font-family:var(--fb);}
input,select,textarea{font-family:var(--fb);}

/* Buttons */
.bp{background:var(--acc);color:#fff;border:none;padding:13px 28px;border-radius:4px;
  font-family:var(--fh);font-size:15px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;transition:all .18s;}
.bp:hover{background:#A84020;transform:translateY(-1px);box-shadow:0 6px 20px rgba(196,89,42,.35);}
.bp:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none;}
.bt{background:var(--teal);color:#fff;border:none;padding:13px 28px;border-radius:4px;
  font-family:var(--fh);font-size:15px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;transition:all .18s;}
.bt:hover{background:#145A48;transform:translateY(-1px);}
.bs{background:transparent;color:var(--txt);border:2px solid var(--bdr);padding:11px 24px;
  border-radius:4px;font-family:var(--fh);font-size:14px;letter-spacing:.08em;
  text-transform:uppercase;transition:all .18s;}
.bs:hover{border-color:var(--acc);color:var(--acc);}
.bl{background:none;border:none;color:var(--mut);font-size:14px;padding:4px 0;
  transition:color .15s;text-decoration:none;}
.bl:hover{color:var(--acc);}

/* Tag/chip */
.tag{display:inline-flex;align-items:center;gap:6px;background:#fff;
  color:var(--acc);border:1.5px solid var(--acc);padding:4px 12px;
  border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;margin-bottom:14px;box-shadow:var(--sh);}
.tag::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--acc);flex-shrink:0;}

/* Nav */
.nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.97);
  backdrop-filter:blur(12px);border-bottom:3px solid var(--acc);box-shadow:0 2px 20px rgba(0,0,0,.06);}
.nav-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;
  justify-content:space-between;height:64px;padding:0 24px;}
.logo{font-family:var(--fh);font-size:24px;font-weight:700;background:none;
  border:none;color:var(--txt);letter-spacing:.04em;}
.logo span{color:var(--acc);}
.nl{background:none;border:none;color:var(--mut);font-size:13px;font-weight:600;
  padding:5px 10px;border-radius:3px;transition:color .15s;letter-spacing:.03em;}
.nl:hover,.nl.on{color:var(--acc);}

/* Layout */
.sec{padding:80px 24px;max-width:1200px;margin:0 auto;}
.g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px;}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;}
.g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}

/* Cards */
.card{background:#fff;border:1px solid var(--bdr);border-radius:8px;box-shadow:var(--sh);}
.card-accent{background:#fff;border:1px solid var(--bdr);border-radius:8px;
  box-shadow:var(--sh);border-top:4px solid var(--acc);}

/* Form elements */
.fi{width:100%;background:var(--surf2);border:1.5px solid var(--bdr);color:var(--txt);
  padding:10px 14px;border-radius:5px;font-size:15px;outline:none;transition:border-color .15s;}
.fi:focus{border-color:var(--acc);background:#fff;}
.fi option{background:#fff;}
.fl{display:block;color:var(--mut);font-size:12px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;margin-bottom:5px;}
.fg{margin-bottom:18px;}
.sb{flex:1;padding:11px 8px;background:#fff;border:1.5px solid var(--bdr);
  color:var(--mut);border-radius:5px;font-size:13px;font-weight:600;
  transition:all .15s;text-align:center;}
.sb.on{background:rgba(196,89,42,.08);border-color:var(--acc);color:var(--acc);}
.sb:hover:not(.on){border-color:rgba(196,89,42,.4);}

/* Paint swatch packages */
.pkg{background:#fff;border:1px solid var(--bdr);border-radius:8px;
  display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh2);transition:transform .2s;}
.pkg:hover{transform:translateY(-4px);}
.pkg-swatch{height:100px;display:flex;align-items:flex-end;padding:12px 20px;}
.pkg-body{padding:24px;display:flex;flex-direction:column;gap:14px;flex:1;}
.pi{display:flex;gap:10px;font-size:13px;color:var(--txt);line-height:1.5;align-items:flex-start;}
.pi::before{content:'✓';color:var(--grn);flex-shrink:0;font-weight:700;margin-top:1px;}

/* Quote tool */
.qt{max-width:720px;margin:0 auto;padding:40px 24px 80px;}
.pc{background:#fff;border:2px solid var(--bdr);border-radius:8px;
  padding:32px;cursor:pointer;text-align:center;transition:all .2s;box-shadow:var(--sh);}
.pc:hover,.pc.sel{border-color:var(--acc);box-shadow:0 8px 32px rgba(196,89,42,.15);}
.tip{background:#FFF8E8;border:1.5px solid #E0C060;border-radius:6px;
  padding:12px 16px;color:#7A5A00;font-size:13px;line-height:1.6;margin-bottom:20px;}
.rh{text-align:center;padding:32px;background:linear-gradient(135deg,var(--acc),#A84020);
  border-radius:8px;margin-bottom:20px;color:#fff;}
.li{display:flex;justify-content:space-between;align-items:baseline;
  padding:10px 0;border-bottom:1px solid var(--bdr);gap:12px;}
.li:last-child{border-bottom:none;}

/* Modal */
.modal{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;
  display:flex;align-items:center;justify-content:center;padding:24px;}
.modal-box{background:#fff;border:1px solid var(--bdr);border-radius:10px;
  padding:32px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;
  box-shadow:var(--sh2);}

/* Swatch strip */
.strip{display:flex;height:80px;border-radius:6px;overflow:hidden;box-shadow:var(--sh2);}
.strip-cell{flex:1;}

/* Hero */
.hero{background:var(--bg);padding:80px 24px 0;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;top:0;right:0;width:40%;height:100%;
  background:linear-gradient(180deg,rgba(196,89,42,.04) 0%,transparent 100%);pointer-events:none;}
.hero-in{max-width:1200px;margin:0 auto;}

/* Section accent bar */
.accent-bar{height:4px;background:linear-gradient(90deg,var(--acc),var(--teal),var(--hi),var(--navy));
  margin:0;}

/* Footer */
footer{background:var(--txt);color:#F0EDE6;padding:56px 24px 28px;}
.foot-link{background:none;border:none;color:rgba(240,237,230,.6);font-size:14px;
  cursor:pointer;padding:4px 0;display:block;margin-bottom:6px;transition:color .15s;text-align:left;}
.foot-link:hover{color:#fff;}

/* Stats bar */
.stats-bar{background:#fff;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);}

/* Feature card with left colour bar */
.fcard{background:#fff;border:1px solid var(--bdr);border-radius:8px;
  padding:24px;display:flex;gap:16px;box-shadow:var(--sh);}
.fcard-bar{width:4px;border-radius:4px;flex-shrink:0;}

/* Toggle */
.tog{display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;}
.tbox{width:18px;height:18px;border:2px solid var(--bdr);border-radius:3px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
.tbox.on{background:var(--acc);border-color:var(--acc);}

@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}

@media(max-width:768px){
  .nav-wide{display:none!important;}
  .hero{padding:60px 16px 0;}
  .sec{padding:60px 16px;}
}
`;

// ─── SWATCH STRIP COMPONENT ───────────────────────────────────────────────────

function SwatchStrip({ style }) {
  const colors = SWATCHES.flat();
  return (
    <div className="strip" style={style}>
      {colors.map((c,i) => <div key={i} className="strip-cell" style={{background:c}} />)}
    </div>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

function Toggle({checked,onChange,label}){
  return(
    <div className="tog" onClick={()=>onChange(!checked)}>
      <div className={`tbox ${checked?"on":""}`}>
        {checked&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
      </div>
      <span style={{color:"var(--txt)",fontSize:15,userSelect:"none"}}>{label}</span>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

function Navbar({page,nav}){
  const links=[["home","Home"],["tool","Quote Tool"],["packages","Packages"],
    ["growth","Website"],["leads","Lead Gen"],["voice","AI Voice"],["contact","Contact"]];
  return(
    <nav className="nav">
      <div className="nav-in">
        <button className="logo" onClick={()=>nav("home")}>Paint<span>IQ</span></button>
        <div className="nav-wide" style={{display:"flex",gap:2,alignItems:"center"}}>
          {links.map(([p,l])=>(
            <button key={p} className={`nl ${page===p?"on":""}`} onClick={()=>nav(p)}>{l}</button>
          ))}
          <button className="bp" style={{padding:"8px 20px",marginLeft:12,fontSize:13}} onClick={()=>nav("contact")}>Book Demo</button>
        </div>
      </div>
    </nav>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer({nav}){
  const cols=[
    ["Product",[["Quote Tool","tool"],["Website Growth","growth"],["Lead Generation","leads"],["AI Voice","voice"],["Packages","packages"]]],
    ["Company",[["Book a Demo","contact"],["Contact Us","contact"]]],
  ];
  return(
    <footer>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{marginBottom:8}}>
          <span style={{fontFamily:"var(--fh)",fontSize:30,fontWeight:700,color:"#fff"}}>Paint</span>
          <span style={{fontFamily:"var(--fh)",fontSize:30,fontWeight:700,color:"var(--acc)"}}>IQ</span>
        </div>
        <p style={{color:"rgba(240,237,230,.6)",fontSize:14,marginBottom:32}}>Quote faster. Capture more leads. Win more painting jobs.</p>
        <SwatchStrip style={{maxWidth:400,marginBottom:40,height:8,borderRadius:2}} />
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:28,marginBottom:40}}>
          {cols.map(([title,links])=>(
            <div key={title}>
              <div style={{fontFamily:"var(--fh)",fontSize:12,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(240,237,230,.5)",marginBottom:14}}>{title}</div>
              {links.map(([l,p])=><button key={l} className="foot-link" onClick={()=>nav(p)}>{l}</button>)}
            </div>
          ))}
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.1)",paddingTop:20,color:"rgba(240,237,230,.4)",fontSize:12}}>
          © 2025 PaintIQ. Built for Australian painting businesses. Estimates are indicative only.
        </div>
      </div>
    </footer>
  );
}

// ─── RATE CONFIG MODAL ────────────────────────────────────────────────────────

function RateModal({rates,setRates,onClose}){
  const [r,setR]=useState({...rates});
  const row=(key,label,unit)=>(
    <div key={key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <span style={{flex:1,color:"var(--txt)",fontSize:14}}>{label}</span>
      <input type="number" className="fi" style={{width:90,textAlign:"right"}}
        value={r[key]} onChange={e=>setR(p=>({...p,[key]:+e.target.value}))}/>
      <span style={{color:"var(--mut)",fontSize:13,width:40}}>{unit}</span>
    </div>
  );
  return(
    <div className="modal" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={{height:6,background:`linear-gradient(90deg,var(--acc),var(--teal))`,borderRadius:3,marginBottom:24}} />
        <h3 style={{fontSize:26,color:"var(--txt)",marginBottom:6}}>My Rates</h3>
        <p style={{color:"var(--mut)",fontSize:14,marginBottom:24}}>Set your rates. These apply to every estimate generated through your tool.</p>
        {row("interiorWalls","Interior walls","$/m²")}
        {row("interiorCeilings","Ceilings","$/m²")}
        {row("exteriorWalls","Exterior walls","$/m²")}
        {row("eavesLm","Eaves & fascia","$/lm")}
        {row("markup","Overhead & margin","%")}
        <hr style={{border:"none",borderTop:"1px solid var(--bdr)",margin:"20px 0"}}/>
        <div style={{display:"flex",gap:12}}>
          <button className="bp" style={{flex:1}} onClick={()=>{setRates(r);onClose();}}>Save Rates</button>
          <button className="bs" onClick={onClose}>Cancel</button>
        </div>
        <p style={{color:"var(--mut)",fontSize:12,marginTop:14,textAlign:"center"}}>
          <button className="bl" style={{fontSize:12}} onClick={()=>setR({...DEFAULT_RATES})}>Reset to defaults</button>
        </p>
      </div>
    </div>
  );
}

// ─── QUOTE: Entry ─────────────────────────────────────────────────────────────

function EntryScreen({onChoice}){
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div className="tag">Instant Estimate</div>
        <h1 style={{fontSize:"clamp(28px,5vw,48px)",color:"var(--txt)",marginBottom:10}}>Get a Painting Estimate</h1>
        <p style={{color:"var(--mut)",fontSize:16,maxWidth:480,margin:"0 auto"}}>Upload architectural plans for the most accurate result, or answer a few quick questions about the property.</p>
      </div>
      <div className="g2" style={{maxWidth:620,margin:"0 auto"}}>
        {[
          {key:"upload",icon:"📐",color:"var(--teal)",title:"Upload Plans",body:"Upload a PDF or image of architectural plans. AI reads measurements and generates a more accurate estimate.",badge:"Most accurate"},
          {key:"questionnaire",icon:"✏️",color:"var(--acc)",title:"Answer Questions",body:"No plans? Answer 10 questions about the property and scope of work. Takes about 3 minutes.",badge:"Quick & easy"},
        ].map(o=>(
          <div key={o.key} className="pc" onClick={()=>onChoice(o.key)}>
            <div style={{width:48,height:48,background:o.color,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 16px"}}>
              {o.icon}
            </div>
            <h2 style={{fontSize:22,color:"var(--txt)",marginBottom:8}}>{o.title}</h2>
            <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.6,marginBottom:16}}>{o.body}</p>
            <div style={{color:o.color,fontSize:13,fontWeight:700}}>{o.badge} →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── QUOTE: Plan Upload ───────────────────────────────────────────────────────

function PlanUploadPath({rates,onPrefill}){
  const [status,setStatus]=useState("idle");
  const [extracted,setExtracted]=useState(null);
  const [preview,setPreview]=useState(null);
  const [error,setError]=useState("");
  const inputRef=useRef();

  const handleFile=async(f)=>{
    if(!f)return;
    setError("");setStatus("processing");
    if(f.type.startsWith("image/")){const r=new FileReader();r.onload=e=>setPreview(e.target.result);r.readAsDataURL(f);}
    try{
      const b64=await new Promise((res,rej)=>{const rdr=new FileReader();rdr.onload=e=>res(e.target.result.split(",")[1]);rdr.onerror=()=>rej(new Error("read failed"));rdr.readAsDataURL(f);});
      const isPdf=f.type==="application/pdf";
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:[isPdf?{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}}:{type:"image",source:{type:"base64",media_type:f.type,data:b64}},{type:"text",text:`Analyse these architectural plans for a painting estimate. Return ONLY valid JSON (no markdown): {"units":number,"floorAreaPerUnit":number,"storeys":"1"|"2"|"3+","propertyType":"house"|"apartment"|"commercial"|"strata","confidence":"high"|"medium"|"low","notes":string}. If uncertain: units=1,floorAreaPerUnit=150,storeys="1",confidence="low".`}]}]})});
      const data=await resp.json();
      const raw=data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setExtracted(parsed);setStatus("done");
    }catch(e){setError("Could not process this file. Try a different file or use the questionnaire.");setStatus("idle");}
  };

  if(status==="processing")return(
    <div style={{textAlign:"center",padding:48}}>
      <div style={{width:64,height:64,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px"}}>🔍</div>
      <h3 style={{fontSize:22,color:"var(--txt)",marginBottom:8}}>Analysing Plans</h3>
      <p style={{color:"var(--mut)"}}>AI is reading your plans and extracting measurements...</p>
      <div style={{width:48,height:4,background:"var(--acc)",borderRadius:4,margin:"24px auto 0",animation:"pulse 1.2s ease-in-out infinite"}}/>
    </div>
  );

  if(status==="done"&&extracted){
    const prefilled={...FORM_DEFAULT,units:String(extracted.units||1),sizePerUnit:String(extracted.floorAreaPerUnit||150),storeys:extracted.storeys||"1",propertyType:extracted.propertyType||"house"};
    return(
      <div>
        <div className="tip">✅ Plans analysed — {extracted.confidence==="high"?"high confidence":"review figures below"}. {extracted.notes||""}</div>
        {preview&&<img src={preview} alt="Plan" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:8,marginBottom:16}}/>}
        <div className="card" style={{padding:24,marginBottom:20}}>
          <h3 style={{fontSize:18,color:"var(--txt)",marginBottom:14}}>Extracted Details</h3>
          <div className="g2" style={{gap:10}}>
            {[["Units / dwellings",extracted.units||1],["Floor area per unit",`${extracted.floorAreaPerUnit||150} m²`],["Storeys",extracted.storeys||1],["Property type",extracted.propertyType||"House"]].map(([k,v])=>(
              <div key={k} style={{background:"var(--surf2)",padding:"12px 16px",borderRadius:6,borderLeft:"3px solid var(--acc)"}}>
                <div style={{color:"var(--mut)",fontSize:12,marginBottom:2}}>{k}</div>
                <div style={{color:"var(--txt)",fontWeight:700,fontSize:16}}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="bp" style={{width:"100%"}} onClick={()=>onPrefill(prefilled)}>Continue — Complete Estimate →</button>
      </div>
    );
  }

  return(
    <div>
      <div className="tip">💡 <strong>Tip:</strong> Registered property owners can often request original building plans from their local council. Plans give a more accurate result than manual entry.</div>
      <div style={{border:"2px dashed var(--bdr)",borderRadius:8,padding:48,textAlign:"center",cursor:"pointer",background:"#fff",transition:"border-color .2s"}}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--acc)";}}
        onDragLeave={e=>{e.currentTarget.style.borderColor="var(--bdr)";}}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
        <div style={{width:56,height:56,background:"var(--surf2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>📁</div>
        <p style={{color:"var(--txt)",fontSize:16,fontWeight:600,marginBottom:6}}>Drop plans here or click to upload</p>
        <p style={{color:"var(--mut)",fontSize:13}}>PDF, PNG, JPG or JPEG · Max 10 MB</p>
        {error&&<p style={{color:"var(--acc)",fontSize:13,marginTop:12}}>{error}</p>}
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>
    </div>
  );
}

// ─── QUOTE: Questionnaire ─────────────────────────────────────────────────────

function Questionnaire({rates,onDone,prefilled}){
  const [f,setF]=useState(prefilled?{...FORM_DEFAULT,...prefilled}:{...FORM_DEFAULT});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div>
      {!prefilled&&<div className="tip">💡 <strong>No plans?</strong> Property owners can often request building plans from their local council for a more accurate estimate.</div>}
      {prefilled&&<div className="tip">✅ Plan data loaded — review below and complete the remaining fields.</div>}
      <div className="fg">
        <label className="fl">Property type</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["house","House"],["apartment","Apartment"],["commercial","Commercial"],["strata","Strata"]].map(([v,l])=>(
            <button key={v} className={`sb ${f.propertyType===v?"on":""}`} style={{flex:"none",padding:"10px 18px"}} onClick={()=>set("propertyType",v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="g2">
        <div className="fg"><label className="fl">Units / dwellings</label><input className="fi" type="number" min="1" value={f.units} onChange={e=>set("units",e.target.value)}/></div>
        <div className="fg"><label className="fl">Floor area per unit (m²)</label><input className="fi" type="number" min="10" value={f.sizePerUnit} onChange={e=>set("sizePerUnit",e.target.value)}/></div>
      </div>
      <div className="fg">
        <label className="fl">Storeys</label>
        <div style={{display:"flex",gap:8}}>
          {[["1","Single"],["2","Double"],["3+","3 or more"]].map(([v,l])=>(
            <button key={v} className={`sb ${f.storeys===v?"on":""}`} onClick={()=>set("storeys",v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="fg">
        <label className="fl">Scope of work</label>
        <div style={{display:"flex",gap:8}}>
          {[["interior","Interior only"],["exterior","Exterior only"],["both","Interior + Exterior"]].map(([v,l])=>(
            <button key={v} className={`sb ${f.scope===v?"on":""}`} onClick={()=>set("scope",v)}>{l}</button>
          ))}
        </div>
      </div>
      {(f.scope==="exterior"||f.scope==="both")&&(
        <div className="fg">
          <label className="fl">Exterior surface</label>
          <select className="fi" value={f.exteriorSurface} onChange={e=>set("exteriorSurface",e.target.value)}>
            <option value="render">Render / texture coat</option>
            <option value="brick">Face brick / masonry</option>
            <option value="weatherboard">Weatherboard / timber</option>
            <option value="fibro">Fibro cement (FC sheeting)</option>
            <option value="hebel">Hebel / AAC panels</option>
          </select>
        </div>
      )}
      {(f.scope==="exterior"||f.scope==="both")&&(
        <div className="card" style={{padding:"14px 20px",marginBottom:18}}>
          <p style={{color:"var(--mut)",fontSize:12,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Include in exterior scope</p>
          <Toggle checked={f.eaves} onChange={v=>set("eaves",v)} label="Eaves"/>
          <Toggle checked={f.fascia} onChange={v=>set("fascia",v)} label="Fascia boards"/>
        </div>
      )}
      <div className="g2">
        <div className="fg">
          <label className="fl">Building condition</label>
          <select className="fi" value={f.condition} onChange={e=>set("condition",e.target.value)}>
            <option value="excellent">Excellent — minimal prep</option>
            <option value="good">Good — standard prep</option>
            <option value="fair">Fair — extra prep needed</option>
            <option value="poor">Poor — significant repairs</option>
          </select>
        </div>
        <div className="fg">
          <label className="fl">Access difficulty</label>
          <select className="fi" value={f.access} onChange={e=>set("access",e.target.value)}>
            <option value="easy">Easy — open ground floor</option>
            <option value="moderate">Moderate — some restrictions</option>
            <option value="difficult">Difficult — heights, narrow</option>
            <option value="scaffolding">Scaffolding required</option>
          </select>
        </div>
      </div>
      {(f.scope==="interior"||f.scope==="both")&&(
        <div className="card" style={{padding:"14px 20px",marginBottom:18}}>
          <p style={{color:"var(--mut)",fontSize:12,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Interior extras</p>
          <Toggle checked={f.highCeilings} onChange={v=>set("highCeilings",v)} label="High ceilings (3m+)"/>
          <Toggle checked={f.featureWalls} onChange={v=>set("featureWalls",v)} label="Feature / accent walls"/>
        </div>
      )}
      <div className="g2">
        <div className="fg">
          <label className="fl">Distance from CBD</label>
          <select className="fi" value={f.distance} onChange={e=>set("distance",e.target.value)}>
            <option value="under10">Under 10 km</option>
            <option value="10to25">10 – 25 km</option>
            <option value="25to50">25 – 50 km</option>
            <option value="over50">50+ km (regional)</option>
          </select>
        </div>
        <div className="fg">
          <label className="fl">Timeline</label>
          <div style={{display:"flex",gap:8}}>
            <button className={`sb ${!f.rush?"on":""}`} onClick={()=>set("rush",false)}>Standard</button>
            <button className={`sb ${f.rush?"on":""}`} onClick={()=>set("rush",true)}>Rush (+25%)</button>
          </div>
        </div>
      </div>
      <div className="fg">
        <label className="fl">Project name (optional)</label>
        <input className="fi" type="text" placeholder="e.g. 42 Smith St full repaint" value={f.projectName} onChange={e=>set("projectName",e.target.value)}/>
      </div>
      <button className="bp" style={{width:"100%",fontSize:16,padding:"14px 0",marginTop:8}} onClick={()=>onDone(f)}>Get My Estimate →</button>
    </div>
  );
}

// ─── QUOTE: Lead Capture ──────────────────────────────────────────────────────

function LeadCapture({onSubmit}){
  const [l,setL]=useState({name:"",email:"",phone:"",address:""});
  const set=(k,v)=>setL(p=>({...p,[k]:v}));
  const valid=l.name.trim()&&l.email.trim()&&l.address.trim();
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:64,height:64,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>🔒</div>
        <h2 style={{fontSize:28,color:"var(--txt)",marginBottom:8}}>Your estimate is ready</h2>
        <p style={{color:"var(--mut)",fontSize:15,maxWidth:420,margin:"0 auto"}}>Enter your details to unlock the full cost breakdown. Your painter will be notified immediately.</p>
      </div>
      <div className="card" style={{padding:28}}>
        <div className="fg"><label className="fl">Full name *</label><input className="fi" type="text" placeholder="Jane Smith" value={l.name} onChange={e=>set("name",e.target.value)}/></div>
        <div className="g2">
          <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" placeholder="jane@email.com" value={l.email} onChange={e=>set("email",e.target.value)}/></div>
          <div className="fg"><label className="fl">Phone (optional)</label><input className="fi" type="tel" placeholder="0400 000 000" value={l.phone} onChange={e=>set("phone",e.target.value)}/></div>
        </div>
        <div className="fg"><label className="fl">Property address *</label><input className="fi" type="text" placeholder="12 Example Street, Sydney NSW 2000" value={l.address} onChange={e=>set("address",e.target.value)}/></div>
        <button className="bp" style={{width:"100%",fontSize:16,padding:"14px 0"}} disabled={!valid} onClick={()=>valid&&onSubmit(l)}>Reveal My Estimate →</button>
        <p style={{color:"var(--mut)",fontSize:12,textAlign:"center",marginTop:12}}>Details shared only with your painter. No spam. No cold calls.</p>
      </div>
    </div>
  );
}

// ─── QUOTE: Results ───────────────────────────────────────────────────────────

function ResultsCard({est,lead,form,onReset}){
  const [copied,setCopied]=useState(false);
  return(
    <div>
      <div className="rh">
        <div style={{fontSize:13,marginBottom:6,opacity:.8}}>Estimated project range</div>
        <div style={{fontFamily:"var(--fh)",fontSize:"clamp(32px,7vw,56px)",letterSpacing:"-0.01em"}}>{$$(est.low)} – {$$(est.high)}</div>
        <div style={{fontSize:13,marginTop:6,opacity:.7}}>
          {form.projectName&&<span style={{marginRight:8}}>{form.projectName} · </span>}Indicative estimate · not a formal quote
        </div>
      </div>
      <div className="card" style={{padding:24,marginBottom:16}}>
        <h3 style={{fontSize:18,color:"var(--txt)",marginBottom:16}}>Cost Breakdown</h3>
        {est.items.map((item,i)=>(
          <div key={i} className="li">
            <span style={{color:"var(--txt)",fontSize:15,flex:1}}>{item.label}</span>
            {item.detail&&<span style={{color:"var(--mut)",fontSize:13,marginRight:12}}>{item.detail}</span>}
            <span style={{color:"var(--txt)",fontWeight:700,fontSize:15}}>{$$(item.cost)}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,paddingTop:16,borderTop:"2px solid var(--acc)"}}>
          <span style={{fontFamily:"var(--fh)",fontSize:18,color:"var(--txt)"}}>Total estimate</span>
          <span style={{fontFamily:"var(--fh)",fontSize:28,color:"var(--acc)"}}>{$$(est.total)}</span>
        </div>
      </div>
      <div style={{background:"#F0FAF4",border:"1.5px solid #A0D4B0",borderRadius:8,padding:20,marginBottom:20}}>
        <p style={{color:"#1A5A2A",fontSize:14}}>✅ <strong>Lead captured.</strong> {lead.name}'s details and this estimate have been sent to the painter. They'll be in touch to confirm scope and book a site visit.</p>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <button className="bs" style={{flex:1}} onClick={()=>{const txt=`PaintIQ Estimate\n${form.projectName||lead.address}\n\nRange: ${$$(est.low)} – ${$$(est.high)}\n\nBreakdown:\n${est.items.map(i=>`${i.label}: ${$$(i.cost)}`).join("\n")}\n\nTotal: ${$$(est.total)}\n\nIndicative only.`;navigator.clipboard.writeText(txt).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});}}>{copied?"✓ Copied":"Copy Estimate"}</button>
        <button className="bl" style={{flex:1,textAlign:"center"}} onClick={onReset}>← New Estimate</button>
      </div>
      <p style={{color:"var(--mut)",fontSize:12,marginTop:16,lineHeight:1.6}}>This estimate uses approximate measurements and indicative rates. Actual costs vary based on site inspection. Always obtain a formal written quote before proceeding.</p>
    </div>
  );
}

// ─── QUOTE TOOL ORCHESTRATOR ──────────────────────────────────────────────────

function QuoteTool({rates,onRates}){
  const [step,setStep]=useState("entry");
  const [prefilled,setPrefilled]=useState(null);
  const [estForm,setEstForm]=useState(null);
  const [est,setEst]=useState(null);
  const [lead,setLead]=useState(null);
  const reset=()=>{setStep("entry");setPrefilled(null);setEstForm(null);setEst(null);setLead(null);};
  const handleQDone=f=>{setEstForm(f);setEst(calcEst(f,rates));setStep("lead");};
  const handleLead=l=>{setLead(l);setStep("result");};
  return(
    <div className="qt">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32,flexWrap:"wrap",gap:12}}>
        {step!=="entry"?<button className="bl" onClick={reset}>← Start over</button>:<div/>}
        <button className="bs" style={{padding:"8px 18px",fontSize:12}} onClick={onRates}>⚙ My Rates</button>
      </div>
      {step==="entry"&&<EntryScreen onChoice={s=>setStep(s)}/>}
      {step==="upload"&&<PlanUploadPath rates={rates} onPrefill={pf=>{setPrefilled(pf);setStep("questionnaire");}}/>}
      {step==="questionnaire"&&<Questionnaire rates={rates} onDone={handleQDone} prefilled={prefilled}/>}
      {step==="lead"&&<LeadCapture onSubmit={handleLead}/>}
      {step==="result"&&est&&<ResultsCard est={est} lead={lead} form={estForm} onReset={reset}/>}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

const FEATURES=[
  {color:"var(--acc)", icon:"⚡",t:"Quote in Minutes",b:"AI reads architectural plans or homeowners answer 10 questions. First-pass estimate generated immediately, every time."},
  {color:"var(--teal)",icon:"🎯",t:"Capture Every Lead",b:"A hard lead gate sits in front of every estimate. Name, email, phone and address — before numbers are revealed."},
  {color:"var(--navy)",icon:"📱",t:"Never Miss a Call",b:"AI voice answers 24/7. Qualifies callers, captures details and logs everything to your CRM automatically."},
  {color:"var(--hi)",  icon:"🌐",t:"Website That Converts",b:"A professional site built to turn visitors into quote requests — with your PaintIQ tool embedded directly."},
  {color:"var(--acc)", icon:"📊",t:"Know Your Numbers",b:"Track leads, conversions and pipeline in HubSpot. See what's working and what's not, every month."},
  {color:"var(--teal)",icon:"🔗",t:"HubSpot CRM Ready",b:"Every lead flows straight into HubSpot. No spreadsheets, no lost follow-ups. Every enquiry tracked automatically."},
];

function HomePage({nav}){
  return(
    <div>
      {/* HERO */}
      <div className="hero">
        <div className="hero-in">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center",paddingBottom:64}}>
            <div>
              <div className="tag">For Australian Painting Businesses</div>
              <h1 style={{fontSize:"clamp(44px,6vw,80px)",lineHeight:.95,color:"var(--txt)",marginBottom:20,letterSpacing:"-0.01em"}}>
                The Smarter Way to Grow Your Painting Business.
              </h1>
              <p style={{fontSize:19,color:"var(--mut)",lineHeight:1.65,marginBottom:32,maxWidth:480}}>
                Quote faster. Capture every lead. Never miss a call. PaintIQ gives painting businesses the complete growth system — built for Australian painters.
              </p>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <button className="bp" style={{fontSize:16,padding:"15px 36px"}} onClick={()=>nav("contact")}>Book a Demo</button>
                <button className="bs" onClick={()=>nav("tool")}>Try the Quote Tool →</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <SwatchStrip/>
              <div style={{display:"flex",gap:8}}>
                {SWATCHES.map((family,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                    {family.map((c,j)=>(
                      <div key={j} style={{height:24,background:c,borderRadius:2}}/>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="accent-bar"/>

      {/* STATS */}
      <div className="stats-bar">
        <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
          <div className="g4">
            {[["4,000+","Dulux network painters"],["3 min","Average time to estimate"],["100%","Leads captured before reveal"],["24/7","AI voice call answering"]].map(([n,l])=>(
              <div key={n} style={{textAlign:"center",padding:"8px 16px"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:40,fontWeight:700,color:"var(--acc)",lineHeight:1}}>{n}</div>
                <div style={{color:"var(--mut)",fontSize:13,marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROBLEM / SOLUTION */}
      <div style={{background:"var(--surf)"}}>
        <div className="sec">
          <div className="g2" style={{gap:48,alignItems:"center"}}>
            <div>
              <div className="tag">The Problem</div>
              <h2 style={{fontSize:"clamp(28px,4vw,48px)",color:"var(--txt)",lineHeight:1.05,marginBottom:16}}>Painters are too busy working to grow their business</h2>
              <p style={{color:"var(--mut)",fontSize:16,lineHeight:1.7,marginBottom:20}}>You're on the tools all day. Quotes pile up. Calls get missed. Your website hasn't been touched in years. Meanwhile better-marketed competitors are winning the jobs you should have.</p>
              {["Too long spent writing quotes manually","Missed calls while working on site","Website that doesn't generate leads","No system to follow up enquiries"].map(l=>(
                <div key={l} style={{display:"flex",gap:10,alignItems:"center",color:"var(--mut)",fontSize:15,marginBottom:10}}>
                  <div style={{width:20,height:20,background:"#FFE8E0",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"var(--acc)",fontSize:12,fontWeight:700}}>✗</span>
                  </div>{l}
                </div>
              ))}
            </div>
            <div style={{background:"var(--bg)",borderRadius:10,padding:32,border:"1px solid var(--bdr)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <div style={{width:4,height:32,background:"var(--teal)",borderRadius:2}}/>
                <span style={{fontFamily:"var(--fh)",fontSize:20,color:"var(--teal)"}}>With PaintIQ</span>
              </div>
              {["Quote generated in under 3 minutes","AI answers calls 24 hours a day","Website built to convert visitors","Every lead captured automatically"].map(l=>(
                <div key={l} style={{display:"flex",gap:10,alignItems:"center",color:"var(--txt)",fontSize:15,marginBottom:14}}>
                  <div style={{width:20,height:20,background:"#E0F4E8",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"var(--grn)",fontSize:12,fontWeight:700}}>✓</span>
                  </div>{l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{background:"var(--bg)"}}>
        <div className="sec">
          <div style={{textAlign:"center",marginBottom:48}}>
            <div className="tag">How It Works</div>
            <h2 style={{fontSize:"clamp(28px,4vw,48px)",color:"var(--txt)"}}>From website visitor to booked job</h2>
          </div>
          <div className="g4">
            {[
              {n:"01",c:"var(--acc)", t:"Homeowner gets a quote",b:"They upload plans or answer questions on your website. Takes under 3 minutes."},
              {n:"02",c:"var(--teal)",t:"You capture the lead",b:"Before the estimate is shown, they enter name, email, phone and property address."},
              {n:"03",c:"var(--navy)",t:"You get notified instantly",b:"Lead lands in your HubSpot. Job details, estimate range and contact info all ready."},
              {n:"04",c:"var(--hi)",  t:"You book the job",b:"Follow up fast, do a site visit, send a formal quote. Close more work."},
            ].map(s=>(
              <div key={s.n}>
                <div style={{width:56,height:56,background:s.c,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fh)",fontSize:22,fontWeight:700,color:"#fff",marginBottom:16}}>{s.n}</div>
                <h3 style={{fontSize:18,color:"var(--txt)",marginBottom:8}}>{s.t}</h3>
                <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{background:"var(--surf)"}}>
        <div className="sec">
          <div style={{textAlign:"center",marginBottom:40}}>
            <div className="tag">What's Included</div>
            <h2 style={{fontSize:"clamp(28px,4vw,48px)",color:"var(--txt)"}}>Everything you need to grow</h2>
          </div>
          <div className="g3">
            {FEATURES.map(f=>(
              <div key={f.t} className="fcard">
                <div className="fcard-bar" style={{background:f.color}}/>
                <div>
                  <div style={{fontSize:28,marginBottom:10}}>{f.icon}</div>
                  <h3 style={{fontSize:17,color:"var(--txt)",marginBottom:6}}>{f.t}</h3>
                  <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{f.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA BAND */}
      <div style={{background:"var(--acc)"}}>
        <div className="sec" style={{textAlign:"center",padding:"60px 24px"}}>
          <h2 style={{fontSize:"clamp(28px,4vw,48px)",color:"#fff",marginBottom:12}}>Try the Quote Tool now</h2>
          <p style={{color:"rgba(255,255,255,.8)",fontSize:17,maxWidth:480,margin:"0 auto 32px",lineHeight:1.6}}>No account needed. See exactly what your customers will experience.</p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <button style={{background:"#fff",color:"var(--acc)",border:"none",padding:"14px 36px",borderRadius:4,fontFamily:"var(--fh)",fontSize:16,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer",transition:"all .18s"}} onClick={()=>nav("tool")}>Try the Quote Tool</button>
            <button style={{background:"transparent",color:"#fff",border:"2px solid rgba(255,255,255,.6)",padding:"12px 28px",borderRadius:4,fontFamily:"var(--fh)",fontSize:15,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer",transition:"all .18s"}} onClick={()=>nav("packages")}>See Packages & Pricing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PACKAGES PAGE ────────────────────────────────────────────────────────────

const PKGS=[
  {swatch:["#C8DDD8","#7AB5A8","#1A6B58","#0A3028"],swatchBg:"#1A6B58",n:"01",name:"Quote Tool",tag:"Quote faster. Capture every lead.",best:"Painters who want a better quoting process right now",setup:"$497",mo:"$97/mo",
   items:["AI painting estimator","Plan upload + manual questionnaire","Lead capture before estimate reveal","Branded estimate result page","Email notification to painter","Basic lead reporting"]},
  {swatch:["#F5E0D0","#E8B090","#C4592A","#7A3018"],swatchBg:"#C4592A",n:"02",name:"Website Growth",tag:"A website that actually wins work.",best:"Painters who need a proper online presence",setup:"$1,997",mo:"$197/mo",feat:true,
   items:["Everything in Quote Tool","Conversion-focused website (5 pages)","Quote tool embedded on your site","Project gallery & testimonials","SEO-ready page structure","Mobile-first design","Monthly support included"]},
  {swatch:["#C8D5E2","#7A9AB8","#1A3A5C","#081828"],swatchBg:"#1A3A5C",n:"03",name:"Lead Engine",tag:"Consistent leads, month after month.",best:"Established painters wanting predictable growth",setup:"$3,497",mo:"$397/mo",
   items:["Everything in Website Growth","Campaign landing pages","Google Ads-ready structure","Email follow-up sequences","HubSpot CRM integration","Social media post templates","Monthly campaign review"]},
  {swatch:["#E0E0D8","#A8A89A","#484840","#202018"],swatchBg:"#2C2C24",n:"04",name:"Complete System",tag:"The full growth stack for serious painters.",best:"Growing businesses ready to scale",setup:"$5,997",mo:"$597/mo",
   items:["Everything in Lead Engine","AI voice call answering (24/7)","Missed call capture & qualification","Appointment booking via AI","CRM auto-logging of all calls","Automated follow-up sequences","Monthly performance dashboard"]},
];

function PackagesPage({nav}){
  return(
    <div>
      <div style={{background:"var(--surf)",borderBottom:"1px solid var(--bdr)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag">Packages & Pricing</div>
        <h1 style={{fontSize:"clamp(32px,5vw,60px)",color:"var(--txt)",marginBottom:12}}>Pick your starting point</h1>
        <p style={{color:"var(--mut)",fontSize:17,maxWidth:520,margin:"0 auto"}}>Start with the tool. Upgrade when you're ready. All packages include onboarding support.</p>
      </div>
      <div className="sec">
        <div className="g2" style={{gap:24,marginBottom:40}}>
          {PKGS.map(p=>(
            <div key={p.n} className="pkg">
              {/* Paint swatch top */}
              <div style={{height:100,background:p.swatchBg,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"12px 20px 16px"}}>
                <div style={{display:"flex",gap:4,marginBottom:8}}>
                  {p.swatch.map((c,i)=><div key={i} style={{flex:1,height:8,background:c,borderRadius:2,opacity:.9}}/>)}
                </div>
                <div style={{fontFamily:"var(--fh)",fontSize:13,color:"rgba(255,255,255,.8)",letterSpacing:".1em",textTransform:"uppercase"}}>PaintIQ {p.name}</div>
              </div>
              <div className="pkg-body">
                <div>
                  {p.feat&&<div style={{display:"inline-block",background:"var(--acc)",color:"#fff",fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",padding:"3px 10px",borderRadius:3,marginBottom:8}}>Most Popular</div>}
                  <h2 style={{fontSize:24,color:"var(--txt)",marginBottom:4}}>{p.name}</h2>
                  <p style={{color:"var(--acc)",fontSize:13,fontWeight:600,marginBottom:6}}>{p.tag}</p>
                  <p style={{color:"var(--mut)",fontSize:13}}>Best for: {p.best}</p>
                </div>
                <div style={{display:"flex",gap:20,padding:"14px 0",borderTop:"1px solid var(--bdr)",borderBottom:"1px solid var(--bdr)"}}>
                  <div>
                    <div style={{color:"var(--mut)",fontSize:11,textTransform:"uppercase",letterSpacing:".08em"}}>Setup</div>
                    <div style={{fontFamily:"var(--fh)",fontSize:26,color:"var(--txt)"}}>{p.setup}</div>
                  </div>
                  <div style={{color:"var(--bdr)",fontSize:18,alignSelf:"center"}}>+</div>
                  <div>
                    <div style={{color:"var(--mut)",fontSize:11,textTransform:"uppercase",letterSpacing:".08em"}}>Monthly</div>
                    <div style={{fontFamily:"var(--fh)",fontSize:26,color:"var(--txt)"}}>{p.mo}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
                  {p.items.map(i=><div key={i} className="pi">{i}</div>)}
                </div>
                <button className={p.feat?"bp":"bt"} style={{width:"100%",padding:"13px 0"}} onClick={()=>nav("contact")}>Get Started</button>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:24,textAlign:"center"}}>
          <p style={{color:"var(--mut)",fontSize:14}}>Not sure which package suits you?&ensp;
            <button className="bl" style={{color:"var(--acc)",fontSize:14}} onClick={()=>nav("contact")}>Book a free 20-min demo →</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE TOOL PAGE ──────────────────────────────────────────────────────────

function QuoteToolPage({rates,onRates}){
  return(
    <div>
      <div style={{background:"var(--surf)",borderBottom:"1px solid var(--bdr)",padding:"48px 24px",textAlign:"center"}}>
        <div className="tag">AI Estimator</div>
        <h1 style={{fontSize:"clamp(28px,5vw,50px)",color:"var(--txt)",marginBottom:10}}>The PaintIQ Quote Tool</h1>
        <p style={{color:"var(--mut)",fontSize:17,maxWidth:520,margin:"0 auto",lineHeight:1.6}}>Upload plans or answer questions. Get an instant indicative estimate. Lead captured before the numbers are revealed.</p>
      </div>
      <QuoteTool rates={rates} onRates={onRates}/>
    </div>
  );
}

// ─── CONTENT PAGE TEMPLATE ────────────────────────────────────────────────────

function ContentPage({tagLabel,title,subtitle,sections,ctaHead,ctaSub,ctaBtn,onCta}){
  return(
    <div>
      <div style={{background:"var(--surf)",borderBottom:"1px solid var(--bdr)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag">{tagLabel}</div>
        <h1 style={{fontSize:"clamp(26px,5vw,50px)",color:"var(--txt)",marginBottom:10,maxWidth:700,margin:"8px auto"}}>{title}</h1>
        <p style={{color:"var(--mut)",fontSize:16,maxWidth:500,margin:"14px auto 0",lineHeight:1.6}}>{subtitle}</p>
      </div>
      <div className="sec">
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:52}}>
            {s.type==="grid"&&(
              <>
                <h2 style={{fontSize:"clamp(22px,3vw,36px)",color:"var(--txt)",marginBottom:8}}>{s.heading}</h2>
                {s.sub&&<p style={{color:"var(--mut)",marginBottom:24,fontSize:15,lineHeight:1.6}}>{s.sub}</p>}
                <div className="g3">
                  {s.items.map((item,j)=>(
                    <div key={j} className="fcard">
                      <div className="fcard-bar" style={{background:["var(--acc)","var(--teal)","var(--navy)","var(--hi)","var(--acc)","var(--teal)"][j%6]}}/>
                      <div>
                        {item.icon&&<div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>}
                        <h3 style={{fontSize:16,color:"var(--txt)",marginBottom:6}}>{item.title}</h3>
                        <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {s.type==="split"&&(
              <div className="g2" style={{gap:48,alignItems:"center"}}>
                <div>
                  <h2 style={{fontSize:"clamp(22px,3vw,40px)",color:"var(--txt)",lineHeight:1.1,marginBottom:14}}>{s.heading}</h2>
                  <p style={{color:"var(--mut)",fontSize:16,lineHeight:1.7,marginBottom:16}}>{s.body}</p>
                  {s.bullets?.map(b=>(
                    <div key={b} style={{display:"flex",gap:10,marginBottom:12}}>
                      <div style={{width:20,height:20,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                        <span style={{color:"#fff",fontSize:11,fontWeight:700}}>→</span>
                      </div>
                      <span style={{color:"var(--txt)",fontSize:15}}>{b}</span>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:28}}>
                  {s.stats?.map(([n,l])=>(
                    <div key={l} style={{marginBottom:20,paddingBottom:20,borderBottom:"1px solid var(--bdr)"}}>
                      <div style={{fontFamily:"var(--fh)",fontSize:40,color:"var(--acc)",lineHeight:1}}>{n}</div>
                      <div style={{color:"var(--txt)",fontSize:14,marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{background:"var(--acc)",borderRadius:10,padding:40,textAlign:"center"}}>
          <h3 style={{fontSize:26,color:"#fff",marginBottom:8}}>{ctaHead}</h3>
          <p style={{color:"rgba(255,255,255,.8)",marginBottom:24,fontSize:15}}>{ctaSub}</p>
          <button style={{background:"#fff",color:"var(--acc)",border:"none",padding:"13px 32px",borderRadius:4,fontFamily:"var(--fh)",fontSize:15,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer"}} onClick={onCta}>{ctaBtn}</button>
        </div>
      </div>
    </div>
  );
}

function WebsiteGrowthPage({nav}){
  return <ContentPage tagLabel="Website Growth" title="A website that converts visitors into painting jobs"
    subtitle="Most painter websites look like a business card. PaintIQ websites are built to generate quote requests."
    sections={[
      {type:"split",heading:"Why most painter websites don't work",body:"Built once, never touched again. No quote tool. No lead capture. No calls to action. They look fine but do nothing to bring in work.",
       bullets:["Visitors don't know what to do next","No instant quoting or pricing tool","Not mobile-optimised for phones","Never updated or maintained"],
       stats:[["72%","of tradies rely on word of mouth alone"],["3×","more leads from sites with quote tools"]]},
      {type:"grid",heading:"What a PaintIQ website includes",
       items:[
         {icon:"🏠",title:"Conversion-focused design",body:"Built to turn visitors into quote requests. Clear calls to action on every page."},
         {icon:"🔧",title:"Quote tool built in",body:"Your PaintIQ estimator embedded directly. Visitors can quote without leaving your site."},
         {icon:"📸",title:"Project gallery",body:"Showcase your best work. Quality photos build trust and close jobs before the first call."},
         {icon:"⭐",title:"Testimonials & trust signals",body:"Reviews, credentials and before/afters. All the proof buyers need to choose you."},
         {icon:"🔍",title:"SEO-ready structure",body:"Proper page titles, meta descriptions, local SEO. Fast load times. Built in from day one."},
         {icon:"📱",title:"Mobile-first design",body:"Most homeowners search on phones. Your site looks and works perfectly on every device."},
       ]}
    ]}
    ctaHead="Ready to get a website that works?" ctaSub="We build it for you. No tech skills needed." ctaBtn="Book a Demo" onCta={()=>nav("contact")}/>;
}

function LeadGenPage({nav}){
  return <ContentPage tagLabel="Lead Generation" title="Stop waiting for referrals. Generate your own leads."
    subtitle="A great website is the foundation. Lead generation campaigns drive targeted traffic to it every week."
    sections={[
      {type:"split",heading:"Traffic doesn't happen automatically",body:"Even the best website needs people to find it. PaintIQ Lead Engine combines Google Ads, social campaigns and email to drive qualified homeowners to your quote tool.",
       bullets:["Google Ads targeting homeowners in your area","Facebook & Instagram campaigns for repaint season","Email campaigns to past clients and enquiries","Retargeting visitors who didn't enquire"],
       stats:[["5×","average return on ad spend for local trades"],["HubSpot","CRM — every lead tracked automatically"]]},
      {type:"grid",heading:"Everything in the lead engine",
       items:[
         {icon:"🎯",title:"Google Ads",body:"Target homeowners searching for painters near you. Pay only when someone clicks."},
         {icon:"📘",title:"Social campaigns",body:"Facebook and Instagram campaigns built for repaint season."},
         {icon:"📧",title:"Email sequences",body:"Automated follow-up to past clients, enquiries and unconverted leads."},
         {icon:"🔄",title:"Retargeting",body:"Reach people who visited your website but didn't get a quote."},
         {icon:"📊",title:"HubSpot CRM",body:"Every lead tracked. Every conversation logged. No lost follow-ups."},
         {icon:"📈",title:"Monthly review",body:"We review results and adjust campaigns each month to improve performance."},
       ]}
    ]}
    ctaHead="Ready to start generating consistent leads?" ctaSub="Most painting businesses see results within 60 days." ctaBtn="Book a Strategy Call" onCta={()=>nav("contact")}/>;
}

function AIVoicePage({nav}){
  return <ContentPage tagLabel="AI Voice" title="Never miss a job because you were on the tools"
    subtitle="Your phone rings while you're up a ladder. The caller hangs up. They call the next painter on Google. This is how you stop that."
    sections={[
      {type:"split",heading:"A missed call is a missed job",body:"The average painting business misses 3–5 calls per week. At an average job value of $3,500, that's significant revenue walking out the door every single week. PaintIQ AI Voice answers every call, every time.",
       bullets:["Answers calls 24/7 including weekends","Qualifies the caller and captures their details","Books a callback or site inspection time","Sends the lead to HubSpot automatically"],
       stats:[["24/7","AI call answering — no missed opportunities"],["$3,500","average painting job value lost per missed call"]]},
      {type:"grid",heading:"How AI Voice works",
       items:[
         {icon:"📞",title:"Call received",body:"A homeowner calls your business number while you're on site."},
         {icon:"🤖",title:"AI answers instantly",body:"Natural-sounding AI greets the caller as your business and asks how it can help."},
         {icon:"✅",title:"Lead qualified",body:"AI asks: what type of job, where, timeline, property type."},
         {icon:"📅",title:"Booking offered",body:"AI offers to book a callback or site inspection on your calendar."},
         {icon:"📲",title:"You get notified",body:"Summary text and email with caller details and job brief — straight away."},
         {icon:"💼",title:"CRM logged",body:"Lead created automatically in HubSpot. No manual data entry ever."},
       ]}
    ]}
    ctaHead="Stop losing jobs to a missed call" ctaSub="AI Voice is available as part of the Complete Growth System." ctaBtn="Enquire About AI Voice" onCta={()=>nav("contact")}/>;
}

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────

function ContactPage(){
  const [f,setF]=useState({name:"",business:"",email:"",phone:"",location:"",website:"",challenge:"",pkg:"unsure"});
  const [sent,setSent]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  if(sent)return(
    <div style={{textAlign:"center",padding:"100px 24px"}}>
      <div style={{width:80,height:80,background:"var(--teal)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"}}>🎉</div>
      <h1 style={{fontSize:40,color:"var(--txt)",marginBottom:12}}>We'll be in touch!</h1>
      <p style={{color:"var(--mut)",fontSize:17,maxWidth:440,margin:"0 auto",lineHeight:1.6}}>Thanks for reaching out. We'll review your details and get back to you within one business day to book your demo.</p>
    </div>
  );
  return(
    <div>
      <div style={{background:"var(--surf)",borderBottom:"3px solid var(--acc)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag">Get Started</div>
        <h1 style={{fontSize:"clamp(28px,5vw,50px)",color:"var(--txt)",marginBottom:10}}>Book a PaintIQ Demo</h1>
        <p style={{color:"var(--mut)",fontSize:16,maxWidth:460,margin:"12px auto 0",lineHeight:1.6}}>20 minutes. No pressure. We'll show you the tool, answer your questions and recommend the right package.</p>
      </div>
      <div className="sec" style={{maxWidth:680}}>
        <div className="g2">
          <div className="fg"><label className="fl">Your name</label><input className="fi" type="text" placeholder="Dave Smith" value={f.name} onChange={e=>set("name",e.target.value)}/></div>
          <div className="fg"><label className="fl">Business name</label><input className="fi" type="text" placeholder="Smith Painting Co" value={f.business} onChange={e=>set("business",e.target.value)}/></div>
        </div>
        <div className="g2">
          <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="dave@smithpainting.com.au" value={f.email} onChange={e=>set("email",e.target.value)}/></div>
          <div className="fg"><label className="fl">Phone</label><input className="fi" type="tel" placeholder="0400 000 000" value={f.phone} onChange={e=>set("phone",e.target.value)}/></div>
        </div>
        <div className="g2">
          <div className="fg"><label className="fl">Location</label><input className="fi" type="text" placeholder="Sydney, NSW" value={f.location} onChange={e=>set("location",e.target.value)}/></div>
          <div className="fg"><label className="fl">Current website (if any)</label><input className="fi" type="text" placeholder="www.smithpainting.com.au" value={f.website} onChange={e=>set("website onChange={e=>set("website",e.target.value)}/></div>
        </div>
        <div className="fg">
          <label className="fl">Package interest</label>
          <select className="fi" value={f.pkg} onChange={e=>set("pkg",e.target.value)}>
            <option value="quote-tool">Quote Tool — $497 setup + $97/mo</option>
            <option value="website">Website Growth — $1,997 + $197/mo</option>
            <option value="leads">Lead Engine — $3,497 + $397/mo</option>
            <option value="complete">Complete System — $5,997 + $597/mo</option>
            <option value="unsure">Not sure yet — need advice first</option>
          </select>
        </div>
        <div className="fg">
          <label className="fl">Biggest challenge right now</label>
          <textarea className="fi" rows={3} style={{resize:"vertical"}} placeholder="e.g. I spend too long writing quotes manually and miss calls when on site..." value={f.challenge} onChange={e=>set("challenge",e.target.value)}/>
        </div>
        <button className="bp" style={{width:"100%",fontSize:16,padding:"14px 0"}} onClick={()=>setSent(true)}>Book My Demo</button>
        <p style={{color:"var(--mut)",fontSize:12,textAlign:"center",marginTop:12}}>No spam. No cold calls. You will only hear from us about your demo.</p>
      </div>
    </div>
  );
}

export default function App(){
  const [page,setPage]=useState("home");
  const [rates,setRates]=useState({...DEFAULT_RATES});
  const [showRates,setShowRates]=useState(false);

  useEffect(()=>{
    const link=document.createElement("link");link.rel="stylesheet";link.href=FONTS_URL;
    document.head.appendChild(link);
    const style=document.createElement("style");style.textContent=CSS;
    document.head.appendChild(style);
    return()=>{try{document.head.removeChild(link);document.head.removeChild(style);}catch(e){}};
  },[]);

  const nav=p=>{setPage(p);try{window.scrollTo(0,0);}catch(e){}};

  return(
    <div style={{fontFamily:"'Source Sans 3',sans-serif",background:"#F5F2EC",color:"#242020",minHeight:"100vh"}}>
      {showRates&&<RateModal rates={rates} setRates={setRates} onClose={()=>setShowRates(false)}/>}
      <Navbar page={page} nav={nav}/>
      {page==="home"     &&<HomePage     nav={nav}/>}
      {page==="tool"     &&<QuoteToolPage rates={rates} onRates={()=>setShowRates(true)}/>}
      {page==="packages" &&<PackagesPage  nav={nav}/>}
      {page==="growth"   &&<WebsiteGrowthPage nav={nav}/>}
      {page==="leads"    &&<LeadGenPage   nav={nav}/>}
      {page==="voice"    &&<AIVoicePage   nav={nav}/>}
      {page==="contact"  &&<ContactPage/>}
      <Footer nav={nav}/>
    </div>
  );
}
