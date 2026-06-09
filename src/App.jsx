import { useState, useRef, useEffect } from "react";

// ─── CALCULATOR ───────────────────────────────────────────────────────────────
const DEFAULT_RATES = { interiorWalls:22, interiorCeilings:18, exteriorWalls:28, eavesLm:15, markup:20 };
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
function calcEst(f,r){
  const nu=Math.max(1,parseInt(f.units)||1),fa=Math.max(10,parseFloat(f.sizePerUnit)||100);
  const ch=f.highCeilings?3.2:2.7,pr=Math.sqrt(fa)*4*1.15;
  const iwa=pr*ch*0.85*nu,ca=fa*nu,ep=Math.sqrt(fa)*4;
  const sn=parseInt(String(f.storeys).replace("+",""))||1,ewa=ep*ch*sn*nu*0.82;
  const cm=COND_M[f.condition]||1,am=ACCS_M[f.access]||1,sm=SURF_M[f.exteriorSurface]||1,stm=STOR_M[f.storeys]||1;
  let items=[],base=0;
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
  const tc=TRVL[f.distance]||0;if(tc>0)add("Travel & mobilisation","",tc);
  const mk=base*(r.markup/100);add(`Overhead & margin (${r.markup}%)`,"",mk);
  return{items,total:base,low:Math.round(base*0.90),high:Math.round(base*1.15)};
}
const $$=n=>"$"+Math.round(n).toLocaleString("en-AU");

// ─── FONTS & CSS ──────────────────────────────────────────────────────────────
const FONTS_URL="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap";

const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#FAFAF8; --surf:#FFFFFF; --surf2:#F2F0EB; --bdr:#E5E0D8;
  --txt:#1A1714; --mut:#7A7570; --acc:#E8420A; --teal:#0D6E56;
  --navy:#0F2744; --amber:#D4860A; --grn:#1A6B35;
  --fh:'Oswald',sans-serif; --fb:'Inter',sans-serif;
}
html,body{background:var(--bg);color:var(--txt);font-family:var(--fb);}
h1,h2,h3,h4{font-family:var(--fh);}
button{cursor:pointer;font-family:var(--fb);}
input,select,textarea{font-family:var(--fb);}

.bp{background:var(--acc);color:#fff;border:none;padding:14px 32px;border-radius:3px;
  font-family:var(--fh);font-size:14px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;transition:all .15s;}
.bp:hover{background:#C53509;transform:translateY(-1px);}
.bp:disabled{opacity:.4;cursor:not-allowed;transform:none;}
.bt{background:var(--teal);color:#fff;border:none;padding:14px 32px;border-radius:3px;
  font-family:var(--fh);font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;}
.bt:hover{background:#0A5A46;}
.bs{background:transparent;color:var(--txt);border:2px solid var(--txt);padding:12px 28px;
  border-radius:3px;font-family:var(--fh);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;}
.bs:hover{border-color:var(--acc);color:var(--acc);}
.bl{background:none;border:none;color:var(--mut);font-size:14px;padding:4px 0;transition:color .15s;cursor:pointer;}
.bl:hover{color:var(--acc);}

.nav{position:sticky;top:0;z-index:100;background:var(--txt);border-bottom:3px solid var(--acc);}
.nav-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 24px;}
.logo{font-family:var(--fh);font-size:22px;font-weight:800;background:none;border:none;color:#fff;letter-spacing:.02em;cursor:pointer;}
.logo-iq{color:var(--acc);}
.nl{background:none;border:none;color:rgba(255,255,255,.6);font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;transition:color .15s;cursor:pointer;}
.nl:hover,.nl.on{color:#fff;}

.sec{padding:80px 24px;max-width:1200px;margin:0 auto;}
.g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px;}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;}
.g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}
.g5{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;}

.tag{display:inline-flex;align-items:center;gap:6px;background:rgba(232,66,10,.08);
  color:var(--acc);padding:5px 12px;border-radius:2px;font-size:11px;font-weight:700;
  letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px;font-family:var(--fh);}

.card{background:#fff;border:1px solid var(--bdr);border-radius:4px;}
.feat-card{background:#fff;border:1px solid var(--bdr);border-radius:4px;padding:22px;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;}
.feat-card:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(0,0,0,.10);border-color:var(--acc);}
.prod-item{background:#fff;border:1px solid var(--bdr);border-radius:4px;display:flex;align-items:center;gap:20px;padding:20px 24px;flex-wrap:wrap;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;}
.prod-item:hover{transform:translateY(-4px);box-shadow:0 14px 36px rgba(0,0,0,.09);border-color:var(--acc);}
.pkg-card{background:#fff;border-radius:4px;overflow:hidden;display:flex;flex-wrap:wrap;transition:transform .22s ease,box-shadow .22s ease;}
.pkg-card:hover{transform:translateY(-5px);box-shadow:0 18px 44px rgba(0,0,0,.11);}

.fi{width:100%;background:var(--surf2);border:1.5px solid var(--bdr);color:var(--txt);
  padding:10px 14px;border-radius:3px;font-size:15px;outline:none;transition:border-color .15s;}
.fi:focus{border-color:var(--acc);background:#fff;}
.fl{display:block;color:var(--mut);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px;}
.fg{margin-bottom:18px;}
.sb{flex:1;padding:10px 8px;background:#fff;border:1.5px solid var(--bdr);color:var(--mut);
  border-radius:3px;font-size:12px;font-weight:600;transition:all .15s;text-align:center;cursor:pointer;}
.sb.on{background:rgba(232,66,10,.06);border-color:var(--acc);color:var(--acc);}
.sb:hover:not(.on){border-color:rgba(232,66,10,.4);}

.tog{display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;}
.tbox{width:18px;height:18px;border:2px solid var(--bdr);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
.tbox.on{background:var(--acc);border-color:var(--acc);}

.tip{background:#FFFBF0;border:1.5px solid #F0D070;border-radius:3px;padding:12px 16px;color:#7A5500;font-size:13px;line-height:1.6;margin-bottom:20px;}

.qt{max-width:720px;margin:0 auto;padding:40px 24px 80px;}
.pc{background:#fff;border:2px solid var(--bdr);border-radius:6px;padding:28px;cursor:pointer;text-align:center;transition:all .2s;}
.pc:hover{border-color:var(--acc);}

.rh{text-align:center;padding:32px;background:var(--acc);border-radius:4px;margin-bottom:20px;color:#fff;}
.li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bdr);gap:12px;font-size:14px;}
.li:last-child{border-bottom:none;}

.modal{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
.modal-box{background:#fff;border-radius:6px;padding:32px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}

.stroke-bg{position:relative;overflow:hidden;}
.stroke-bg::before,.stroke-bg::after{content:'';position:absolute;pointer-events:none;opacity:.06;}

.hero{background:var(--txt);padding:100px 24px 80px;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;top:-20%;right:-10%;width:70%;height:140%;
  background:var(--acc);clip-path:polygon(15% 0%,100% 0%,100% 100%,0% 100%);opacity:.08;}

footer{background:var(--txt);color:rgba(255,255,255,.7);padding:56px 24px 28px;}
.flink{background:none;border:none;color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;padding:4px 0;display:block;transition:color .15s;text-align:left;}
.flink:hover{color:#fff;}

.prod-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:2px;font-family:var(--fh);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}

.stat-num{font-family:var(--fh);font-size:clamp(40px,6vw,72px);font-weight:800;line-height:1;letter-spacing:-.02em;}

@keyframes pulse{0%,100%{opacity:.2}50%{opacity:1}}

.step-num{font-family:var(--fh);font-size:72px;font-weight:800;line-height:1;opacity:.08;position:absolute;top:-10px;left:-8px;}

@media(max-width:768px){
  .nav-wide{display:none!important;}
  .nav-hamburger{display:flex!important;}
  .hero{padding:72px 16px 56px;}
  .sec{padding:52px 16px;}
  .mob-col,.mob-col-s{grid-template-columns:1fr!important;gap:28px!important;}
  .g4{grid-template-columns:repeat(2,1fr)!important;}
  .step-num{font-size:48px;}
  .pkg-card{flex-direction:column;}
}
@media(max-width:480px){
  .g4{grid-template-columns:1fr!important;}
  .g3{grid-template-columns:1fr!important;}
}
.mob-col{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;}
.mob-col-s{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;}
.nav-hamburger{display:none;background:none;border:none;cursor:pointer;flex-direction:column;gap:5px;padding:8px;align-items:center;justify-content:center;}
.nav-hamburger span{width:22px;height:2px;background:#fff;display:block;border-radius:2px;transition:all .2s;}
.mob-nav{position:absolute;top:60px;left:0;right:0;background:var(--txt);border-top:1px solid rgba(255,255,255,.1);padding:16px 20px;flex-direction:column;gap:2px;z-index:99;display:none;}
.mob-nav.open{display:flex;}
.mob-nav .nl{text-align:left;padding:10px 12px;font-size:14px;border-radius:4px;}
.mob-nav .nl:hover{background:rgba(255,255,255,.05);}
.mob-cta{margin-top:8px;}
`;

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({checked,onChange,label}){
  return(
    <div className="tog" onClick={()=>onChange(!checked)}>
      <div className={`tbox ${checked?"on":""}`}>{checked&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}</div>
      <span style={{color:"var(--txt)",fontSize:15,userSelect:"none"}}>{label}</span>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({page,nav}){
  const [open,setOpen]=useState(false);
  const links=[["home","Home"],["tool","Quote Tool"],["packages","Packages"],["growth","Website"],["leads","Lead Gen"],["voice","Voice"],["contact","Demo"]];
  const go=p=>{nav(p);setOpen(false);};
  return(
    <nav className="nav" style={{position:"sticky"}}>
      <div className="nav-in">
        <button className="logo" onClick={()=>go("home")}>Paint<span className="logo-iq">IQ</span></button>
        <div className="nav-wide" style={{display:"flex",gap:2,alignItems:"center"}}>
          {links.map(([p,l])=>(
            <button key={p} className={`nl ${page===p?"on":""}`} onClick={()=>go(p)}>{l}</button>
          ))}
          <button className="bp" style={{padding:"8px 18px",marginLeft:12,fontSize:12}} onClick={()=>go("contact")}>Book Demo</button>
        </div>
        <button className="nav-hamburger" onClick={()=>setOpen(o=>!o)} aria-label="Menu">
          <span style={{transform:open?"rotate(45deg) translate(5px,5px)":"none"}}/>
          <span style={{opacity:open?0:1}}/>
          <span style={{transform:open?"rotate(-45deg) translate(5px,-5px)":"none"}}/>
        </button>
      </div>
      <div className={`mob-nav ${open?"open":""}`}>
        {links.map(([p,l])=>(
          <button key={p} className={`nl ${page===p?"on":""}`} onClick={()=>go(p)}>{l}</button>
        ))}
        <button className="bp mob-cta" style={{fontSize:13,padding:"11px 0",width:"100%",marginTop:4}} onClick={()=>go("contact")}>Book Demo</button>
      </div>
    </nav>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({nav}){
  const igColors=["#E8420A","#0D6E56","#0F2744","#7A2090","#D4860A","#C53509","#2A9E7E","#3A72A8","#A840C0"];
  const colHd={fontFamily:"var(--fh)",fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--acc)",marginBottom:16,fontWeight:700};
  return(
    <footer style={{background:"var(--txt)",color:"rgba(255,255,255,.65)"}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"56px 24px 0"}}>
        <div style={{marginBottom:40,paddingBottom:32,borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div>
            <div><span style={{fontFamily:"var(--fh)",fontSize:32,fontWeight:700,color:"#fff"}}>Paint</span><span style={{fontFamily:"var(--fh)",fontSize:32,fontWeight:700,color:"var(--acc)"}}>IQ</span></div>
            <p style={{fontSize:13,marginTop:6,maxWidth:340,lineHeight:1.65,color:"rgba(255,255,255,.45)"}}>The complete growth system for Australian painting businesses. Quote faster. Win more jobs at a higher fee.</p>
          </div>
          <button className="bp" style={{alignSelf:"flex-start",fontSize:12,padding:"11px 22px"}} onClick={()=>nav("contact")}>Book a demo</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:32,marginBottom:40}}>
          <div>
            <div style={colHd}>Products</div>
            {[["PaintIQ Quote Tool","tool"],["PaintIQ Website","growth"],["PaintIQ Voice","voice"],["PaintIQ Social","leads"],["PaintIQ Leads","leads"],["All Packages","packages"]].map(([l,p])=>(
              <button key={l} className="flink" onClick={()=>nav(p)}>{l}</button>
            ))}
          </div>
          <div>
            <div style={colHd}>Company</div>
            {[["Book a Demo","contact"],["Contact Us","contact"]].map(([l,p])=>(
              <button key={l} className="flink" onClick={()=>nav(p)}>{l}</button>
            ))}
          </div>
          <div>
            <div style={colHd}>Contact</div>
            <p style={{fontSize:13,lineHeight:1.8,color:"rgba(255,255,255,.5)",marginBottom:14}}>46 Coreen Avenue<br/>Terrey Hills NSW 2084<br/>Australia</p>
            <p style={{fontSize:13,marginBottom:8,display:"flex",gap:8,alignItems:"baseline"}}>
              <span style={{color:"rgba(255,255,255,.35)",fontFamily:"var(--fh)",fontSize:10,letterSpacing:".08em",textTransform:"uppercase"}}>T</span>
              <a href="tel:0400000000" style={{color:"var(--acc)",textDecoration:"none"}}>0400 000 000</a>
            </p>
            <p style={{fontSize:13,display:"flex",gap:8,alignItems:"baseline"}}>
              <span style={{color:"rgba(255,255,255,.35)",fontFamily:"var(--fh)",fontSize:10,letterSpacing:".08em",textTransform:"uppercase"}}>E</span>
              <a href="mailto:hello@paintiq.au" style={{color:"var(--acc)",textDecoration:"none"}}>hello@paintiq.au</a>
            </p>
          </div>
          <div>
            <div style={colHd}>PaintIQ on Instagram</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,marginBottom:10}}>
              {igColors.map((c,i)=>(
                <div key={i} style={{aspectRatio:"1",background:c,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="rgba(255,255,255,.5)" stroke="none"/></svg>
                </div>
              ))}
            </div>
            <a href="https://instagram.com/paintiq.au" target="_blank" rel="noopener noreferrer" style={{color:"var(--acc)",fontSize:12,textDecoration:"none",fontFamily:"var(--fh)",letterSpacing:".08em",textTransform:"uppercase"}}>@paintiq.au →</a>
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.07)",padding:"20px 0"}}>
          <p style={{fontSize:11,lineHeight:1.7,color:"rgba(255,255,255,.28)",maxWidth:900}}>
            <strong style={{color:"rgba(255,255,255,.38)"}}>Important:</strong> All painting estimates generated by PaintIQ are indicative only and do not constitute a formal quote. Estimates are based on approximate measurements and standard industry rates. Actual costs will vary depending on site conditions, specific requirements, material choices and individual painter pricing. Always obtain a formal written quote from a licensed painting contractor before proceeding with any work. PaintIQ is a technology and marketing platform and does not provide painting services directly.
          </p>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.05)",padding:"16px 0 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <p style={{fontSize:11,color:"rgba(255,255,255,.25)"}}>© 2025 PaintIQ. All rights reserved. ABN: XX XXX XXX XXX</p>
          <div style={{display:"flex",gap:20}}>
            {["Privacy Policy","Terms of Use","Copyright"].map(l=>(
              <button key={l} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",fontSize:11,cursor:"pointer",padding:0,fontFamily:"var(--fb)"}}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── RATE MODAL ───────────────────────────────────────────────────────────────
function RateModal({rates,setRates,onClose}){
  const [r,setR]=useState({...rates});
  const row=(key,label,unit)=>(
    <div key={key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <span style={{flex:1,color:"var(--txt)",fontSize:14}}>{label}</span>
      <input type="number" className="fi" style={{width:90,textAlign:"right"}} value={r[key]} onChange={e=>setR(p=>({...p,[key]:+e.target.value}))}/>
      <span style={{color:"var(--mut)",fontSize:13,width:40}}>{unit}</span>
    </div>
  );
  return(
    <div className="modal" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <h3 style={{fontFamily:"var(--fh)",fontSize:24,marginBottom:6}}>My Rates</h3>
        <p style={{color:"var(--mut)",fontSize:14,marginBottom:24}}>Set your rates. These apply to every estimate generated through your tool.</p>
        {row("interiorWalls","Interior walls","$/m²")}
        {row("interiorCeilings","Ceilings","$/m²")}
        {row("exteriorWalls","Exterior walls","$/m²")}
        {row("eavesLm","Eaves & fascia","$/lm")}
        {row("markup","Overhead & margin","%")}
        <hr style={{border:"none",borderTop:"1px solid var(--bdr)",margin:"20px 0"}}/>
        <div style={{display:"flex",gap:12}}>
          <button className="bp" style={{flex:1}} onClick={()=>{setRates(r);onClose();}}>Save</button>
          <button className="bs" onClick={onClose}>Cancel</button>
        </div>
        <p style={{color:"var(--mut)",fontSize:12,marginTop:12,textAlign:"center"}}>
          <button className="bl" style={{fontSize:12}} onClick={()=>setR({...DEFAULT_RATES})}>Reset defaults</button>
        </p>
      </div>
    </div>
  );
}

// ─── QUOTE: Entry ─────────────────────────────────────────────────────────────
function EntryScreen({onChoice,onFileDropped}){
  const inputRef=useRef();
  const handleDrop=f=>{if(f){onFileDropped(f);onChoice("upload");}};
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div className="tag">Instant estimate</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,5vw,44px)",fontWeight:800,marginBottom:8}}>Upload your plans. Get an instant estimate.</h1>
        <p style={{color:"var(--mut)",fontSize:15,maxWidth:480,margin:"0 auto"}}>AI reads your architectural plans and generates an indicative estimate in seconds.</p>
      </div>
      <div className="tip" style={{maxWidth:640,margin:"0 auto 16px"}}>
        💡 <strong>Council plans tip:</strong> Registered property owners can request original building plans from their local council — free of charge. Plans give the most accurate estimate of any method. <span style={{opacity:.7}}>Search "[your council name] building plans request".</span>
      </div>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div
          style={{border:"2.5px dashed var(--acc)",borderRadius:6,padding:"48px 32px",textAlign:"center",cursor:"pointer",background:"rgba(232,66,10,.02)",transition:"all .2s"}}
          onClick={()=>inputRef.current?.click()}
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.background="rgba(232,66,10,.06)";e.currentTarget.style.borderStyle="solid";}}
          onDragLeave={e=>{e.currentTarget.style.background="rgba(232,66,10,.02)";e.currentTarget.style.borderStyle="dashed";}}
          onDrop={e=>{e.preventDefault();e.currentTarget.style.background="rgba(232,66,10,.02)";e.currentTarget.style.borderStyle="dashed";handleDrop(e.dataTransfer.files[0]);}}
        >
          <div style={{width:64,height:64,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px"}}>📐</div>
          <p style={{fontFamily:"var(--fh)",fontSize:20,fontWeight:700,marginBottom:6}}>Drop your plans here</p>
          <p style={{color:"var(--mut)",fontSize:14,marginBottom:20}}>or click to choose a file</p>
          <button className="bp" style={{fontSize:13,padding:"10px 28px"}} onClick={e=>{e.stopPropagation();inputRef.current?.click();}}>Choose file</button>
          <p style={{color:"var(--mut)",fontSize:12,marginTop:14}}>PDF, PNG, JPG or JPEG · Max 10 MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleDrop(e.target.files[0]);}}/>
        </div>
        <div style={{textAlign:"center",margin:"20px 0 8px"}}>
          <span style={{color:"var(--mut)",fontSize:13,fontWeight:500}}>No plans? Try a different method</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {key:"photos",icon:"📷",title:"Upload photos",body:"Take photos of each room or exterior — AI reads them"},
            {key:"questionnaire",icon:"✏️",title:"Room by room",body:"Select which rooms need painting and we calculate the rest"},
          ].map(o=>(
            <div key={o.key} onClick={()=>onChoice(o.key)} style={{background:"#fff",border:"1px solid var(--bdr)",borderRadius:4,padding:"14px 16px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",transition:"border-color .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--acc)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bdr)"}>
              <span style={{fontSize:22,flexShrink:0}}>{o.icon}</span>
              <div>
                <div style={{fontFamily:"var(--fh)",fontSize:14,fontWeight:700,marginBottom:2}}>{o.title}</div>
                <div style={{color:"var(--mut)",fontSize:12}}>{o.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE: Plan Upload ───────────────────────────────────────────────────────
function PlanUploadPath({rates,onPrefill,autoFile}){
  const [status,setStatus]=useState("idle");
  const [extracted,setExtracted]=useState(null);
  const [preview,setPreview]=useState(null);
  const [error,setError]=useState("");
  const inputRef=useRef();

  useEffect(()=>{if(autoFile)handleFile(autoFile);},[autoFile]);

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
    }catch(e){setError("Could not process this file. Try a different format or use the room-by-room option.");setStatus("idle");}
  };

  if(status==="processing")return(
    <div style={{textAlign:"center",padding:48}}>
      <div style={{width:56,height:56,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px"}}>🔍</div>
      <h3 style={{fontFamily:"var(--fh)",fontSize:22,marginBottom:8}}>Analysing plans</h3>
      <p style={{color:"var(--mut)"}}>AI is reading your plans and extracting measurements...</p>
      <div style={{width:48,height:3,background:"var(--acc)",borderRadius:2,margin:"20px auto 0",animation:"pulse 1.2s ease-in-out infinite"}}/>
    </div>
  );

  if(status==="done"&&extracted){
    const prefilled={...FORM_DEFAULT,units:String(extracted.units||1),sizePerUnit:String(extracted.floorAreaPerUnit||150),storeys:extracted.storeys||"1",propertyType:extracted.propertyType||"house"};
    return(
      <div>
        <div className="tip">✅ Plans analysed — {extracted.confidence==="high"?"high confidence":"please review the details below"}. {extracted.notes||""}</div>
        {preview&&<img src={preview} alt="Plan" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:4,marginBottom:14}}/>}
        <div className="card" style={{padding:24,marginBottom:20}}>
          <h3 style={{fontFamily:"var(--fh)",fontSize:18,marginBottom:14}}>Extracted details</h3>
          <div className="g2" style={{gap:10}}>
            {[["Units / dwellings",extracted.units||1],["Floor area per unit",`${extracted.floorAreaPerUnit||150} m²`],["Storeys",extracted.storeys||1],["Property type",extracted.propertyType||"House"]].map(([k,v])=>(
              <div key={k} style={{background:"var(--surf2)",padding:"12px 16px",borderRadius:3,borderLeft:"3px solid var(--acc)"}}>
                <div style={{color:"var(--mut)",fontSize:11,marginBottom:2}}>{k}</div>
                <div style={{fontWeight:600,fontSize:16}}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="bp" style={{width:"100%"}} onClick={()=>onPrefill(prefilled)}>Continue — complete estimate →</button>
      </div>
    );
  }

  return(
    <div>
      <div className="tip">💡 <strong>Council plans tip:</strong> Property owners can request original building plans from their local council at no cost. Plans give the most accurate estimate possible.</div>
      <div style={{border:"2px dashed var(--bdr)",borderRadius:4,padding:44,textAlign:"center",cursor:"pointer",background:"#fff",transition:"border-color .2s"}}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--acc)";}}
        onDragLeave={e=>{e.currentTarget.style.borderColor="var(--bdr)";}}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
        <div style={{fontSize:40,marginBottom:10}}>📁</div>
        <p style={{fontWeight:600,fontSize:16,marginBottom:6}}>Drop plans here or click to upload</p>
        <p style={{color:"var(--mut)",fontSize:13}}>PDF, PNG, JPG or JPEG · Max 10 MB</p>
        {error&&<p style={{color:"var(--acc)",fontSize:13,marginTop:10}}>{error}</p>}
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>
    </div>
  );
}

// ─── QUOTE: Photo Upload ──────────────────────────────────────────────────────
function PhotoUploadPath({rates,onPrefill}){
  const [status,setStatus]=useState("idle");
  const [photos,setPhotos]=useState([]);
  const [error,setError]=useState("");
  const inputRef=useRef();

  const handleFiles=async(files)=>{
    const arr=Array.from(files).slice(0,6);
    setPhotos(arr.map(f=>URL.createObjectURL(f)));
    setError("");setStatus("processing");
    try{
      const b64s=await Promise.all(arr.map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res({data:e.target.result.split(",")[1],type:f.type});r.onerror=()=>rej();r.readAsDataURL(f);})));
      const content=[...b64s.map(b=>({type:"image",source:{type:"base64",media_type:b.type,data:b.data}})),{type:"text",text:`Analyse these photos of a property to estimate painting scope. Photos may show rooms, exterior walls, or other areas. Return ONLY valid JSON (no markdown): {"units":number,"floorAreaPerUnit":number,"storeys":"1"|"2"|"3+","propertyType":"house"|"apartment"|"commercial"|"strata","scope":"interior"|"exterior"|"both","confidence":"high"|"medium"|"low","notes":string}. Use your best judgment from the photos. If uncertain use: units=1,floorAreaPerUnit=150,storeys="1",scope="both",confidence="low".`}];
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content}]})});
      const data=await resp.json();
      const raw=data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const prefilled={...FORM_DEFAULT,units:String(parsed.units||1),sizePerUnit:String(parsed.floorAreaPerUnit||150),storeys:parsed.storeys||"1",propertyType:parsed.propertyType||"house",scope:parsed.scope||"both"};
      onPrefill(prefilled);
    }catch(e){setError("Could not analyse these photos. Please try the room-by-room option instead.");setStatus("idle");}
  };

  if(status==="processing")return(
    <div style={{textAlign:"center",padding:48}}>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
        {photos.slice(0,4).map((p,i)=><img key={i} src={p} alt="" style={{width:72,height:72,objectFit:"cover",borderRadius:3}}/>)}
      </div>
      <h3 style={{fontFamily:"var(--fh)",fontSize:22,marginBottom:8}}>Analysing photos</h3>
      <p style={{color:"var(--mut)"}}>AI is reading your photos and estimating scope...</p>
      <div style={{width:48,height:3,background:"var(--acc)",borderRadius:2,margin:"20px auto 0",animation:"pulse 1.2s ease-in-out infinite"}}/>
    </div>
  );

  return(
    <div>
      <div className="tip">📸 <strong>Photo tips:</strong> Take photos of each room, exterior walls, and any areas needing painting. More photos = more accurate estimate. Up to 6 photos.</div>
      <div style={{border:"2px dashed var(--bdr)",borderRadius:4,padding:44,textAlign:"center",cursor:"pointer",background:"#fff"}}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--acc)";}}
        onDragLeave={e=>{e.currentTarget.style.borderColor="var(--bdr)";}}
        onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}>
        <div style={{fontSize:40,marginBottom:10}}>📷</div>
        <p style={{fontWeight:600,fontSize:16,marginBottom:6}}>Drop photos here or click to upload</p>
        <p style={{color:"var(--mut)",fontSize:13}}>Up to 6 photos · PNG, JPG or JPEG</p>
        {error&&<p style={{color:"var(--acc)",fontSize:13,marginTop:10}}>{error}</p>}
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
      </div>
    </div>
  );
}

// ─── QUOTE: Room Selector ────────────────────────────────────────────────────
function RoomSelectorPath({rates,onDone}){
  const ROOMS=[
    {id:"bed",label:"Bedrooms",icon:"🛏",size:14},
    {id:"living",label:"Living rooms",icon:"🛋",size:22},
    {id:"kitchen",label:"Kitchens",icon:"🍳",size:12},
    {id:"dining",label:"Dining rooms",icon:"🍽",size:14},
    {id:"bath",label:"Bathrooms",icon:"🚿",size:8},
    {id:"hall",label:"Hallways",icon:"🚪",size:10},
    {id:"garage",label:"Garages",icon:"🚗",size:20},
    {id:"laundry",label:"Laundry",icon:"🧺",size:7},
  ];
  const [counts,setCounts]=useState({});
  const [scope,setScope]=useState("interior");
  const [condition,setCondition]=useState("good");
  const [storeys,setStoreys]=useState("1");
  const [rush,setRush]=useState(false);

  const inc=(id)=>setCounts(p=>({...p,[id]:(p[id]||0)+1}));
  const dec=(id)=>setCounts(p=>({...p,[id]:Math.max(0,(p[id]||0)-1)}));
  const total=Object.entries(counts).reduce((s,[id,n])=>{const r=ROOMS.find(r=>r.id===id);return s+(r?r.size*n:0);},0);

  const handleSubmit=()=>{
    if(total<1)return;
    const f={...FORM_DEFAULT,sizePerUnit:String(total),units:"1",scope,condition,storeys,rush};
    onDone(f);
  };

  return(
    <div>
      <div className="tip">💡 Select how many of each room needs painting. We calculate the floor area automatically.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:20}}>
        {ROOMS.map(r=>(
          <div key={r.id} style={{background:"#fff",border:"1px solid var(--bdr)",borderRadius:3,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <span style={{fontSize:18,marginRight:6}}>{r.icon}</span>
              <span style={{fontSize:13,fontWeight:500}}>{r.label}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>dec(r.id)} style={{width:24,height:24,border:"1px solid var(--bdr)",borderRadius:2,background:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <span style={{fontSize:14,fontWeight:600,minWidth:16,textAlign:"center"}}>{counts[r.id]||0}</span>
              <button onClick={()=>inc(r.id)} style={{width:24,height:24,border:"1px solid var(--acc)",borderRadius:2,background:"var(--acc)",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>
        ))}
      </div>
      {total>0&&<div style={{background:"rgba(232,66,10,.06)",border:"1px solid rgba(232,66,10,.2)",borderRadius:3,padding:"10px 14px",marginBottom:16,fontSize:14}}>
        Estimated total area: <strong>{total} m²</strong> across {Object.values(counts).reduce((a,b)=>a+b,0)} rooms
      </div>}
      <div className="fg">
        <label className="fl">Scope</label>
        <div style={{display:"flex",gap:8}}>
          {[["interior","Interior only"],["exterior","Exterior only"],["both","Both"]].map(([v,l])=>(
            <button key={v} className={`sb ${scope===v?"on":""}`} onClick={()=>setScope(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="g2">
        <div className="fg">
          <label className="fl">Building condition</label>
          <select className="fi" value={condition} onChange={e=>setCondition(e.target.value)}>
            <option value="excellent">Excellent — minimal prep</option>
            <option value="good">Good — standard prep</option>
            <option value="fair">Fair — extra prep needed</option>
            <option value="poor">Poor — significant repairs</option>
          </select>
        </div>
        <div className="fg">
          <label className="fl">Storeys</label>
          <div style={{display:"flex",gap:8}}>
            {[["1","1"],["2","2"],["3+","3+"]].map(([v,l])=>(
              <button key={v} className={`sb ${storeys===v?"on":""}`} onClick={()=>setStoreys(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <Toggle checked={rush} onChange={setRush} label="Rush job needed (+25% premium)"/>
      <button className="bp" style={{width:"100%",marginTop:16,padding:"14px 0",fontSize:15}} disabled={total<1} onClick={handleSubmit}>
        Get my estimate →
      </button>
    </div>
  );
}

// ─── QUOTE: Questionnaire ────────────────────────────────────────────────────
function Questionnaire({rates,onDone,prefilled}){
  const [f,setF]=useState(prefilled?{...FORM_DEFAULT,...prefilled}:{...FORM_DEFAULT});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div>
      {prefilled&&<div className="tip">✅ Data loaded — review and complete any remaining fields.</div>}
      <div className="fg">
        <label className="fl">Property type</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["house","House"],["apartment","Apartment"],["commercial","Commercial"],["strata","Strata"]].map(([v,l])=>(
            <button key={v} className={`sb ${f.propertyType===v?"on":""}`} style={{flex:"none",padding:"9px 16px"}} onClick={()=>set("propertyType",v)}>{l}</button>
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
          <p style={{color:"var(--mut)",fontSize:11,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Include in exterior scope</p>
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
          <p style={{color:"var(--mut)",fontSize:11,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Interior extras</p>
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
      <button className="bp" style={{width:"100%",fontSize:15,padding:"14px 0",marginTop:8}} onClick={()=>onDone(f)}>Get my estimate →</button>
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
        <div style={{width:56,height:56,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:24}}>🔒</div>
        <h2 style={{fontFamily:"var(--fh)",fontSize:28,fontWeight:800,marginBottom:8}}>Your estimate is ready</h2>
        <p style={{color:"var(--mut)",fontSize:15,maxWidth:400,margin:"0 auto"}}>Enter your details to unlock the full cost breakdown. Your painter will be notified immediately.</p>
      </div>
      <div className="card" style={{padding:28}}>
        <div className="fg"><label className="fl">Full name *</label><input className="fi" type="text" placeholder="Jane Smith" value={l.name} onChange={e=>set("name",e.target.value)}/></div>
        <div className="g2">
          <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" placeholder="jane@email.com" value={l.email} onChange={e=>set("email",e.target.value)}/></div>
          <div className="fg"><label className="fl">Phone (optional)</label><input className="fi" type="tel" placeholder="0400 000 000" value={l.phone} onChange={e=>set("phone",e.target.value)}/></div>
        </div>
        <div className="fg"><label className="fl">Property address *</label><input className="fi" type="text" placeholder="12 Example Street, Sydney NSW 2000" value={l.address} onChange={e=>set("address",e.target.value)}/></div>
        <button className="bp" style={{width:"100%",fontSize:15,padding:"14px 0"}} disabled={!valid} onClick={()=>valid&&onSubmit(l)}>Reveal my estimate →</button>
        <p style={{color:"var(--mut)",fontSize:11,textAlign:"center",marginTop:10}}>Details shared only with your painter. No spam.</p>
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
        <div style={{fontSize:12,opacity:.8,marginBottom:4,letterSpacing:".06em",textTransform:"uppercase",fontFamily:"var(--fh)"}}>Estimated project range</div>
        <div style={{fontFamily:"var(--fh)",fontSize:"clamp(32px,7vw,56px)",fontWeight:800,letterSpacing:"-.02em"}}>{$$(est.low)} – {$$(est.high)}</div>
        <div style={{fontSize:12,marginTop:6,opacity:.7}}>
          {form.projectName&&<span style={{marginRight:8}}>{form.projectName} · </span>}Indicative estimate · not a formal quote
        </div>
      </div>
      <div className="card" style={{padding:24,marginBottom:14}}>
        <h3 style={{fontFamily:"var(--fh)",fontSize:18,marginBottom:14}}>Cost breakdown</h3>
        {est.items.map((item,i)=>(
          <div key={i} className="li">
            <span style={{flex:1}}>{item.label}</span>
            {item.detail&&<span style={{color:"var(--mut)",marginRight:10}}>{item.detail}</span>}
            <span style={{fontWeight:600}}>{$$(item.cost)}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:14,borderTop:"2px solid var(--acc)"}}>
          <span style={{fontFamily:"var(--fh)",fontSize:18,fontWeight:700}}>Total estimate</span>
          <span style={{fontFamily:"var(--fh)",fontSize:28,fontWeight:800,color:"var(--acc)"}}>{$$(est.total)}</span>
        </div>
      </div>
      <div style={{background:"rgba(13,110,86,.06)",border:"1px solid rgba(13,110,86,.2)",borderRadius:3,padding:16,marginBottom:16}}>
        <p style={{color:"var(--teal)",fontSize:14}}>✅ <strong>Lead captured.</strong> {lead.name} has been connected with the painter. They will be in touch to confirm scope and book your site visit.</p>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <button className="bs" style={{flex:1}} onClick={()=>{const txt=`PaintIQ Estimate\n${form.projectName||lead.address}\n\nRange: ${$$(est.low)} – ${$$(est.high)}\n\nBreakdown:\n${est.items.map(i=>`${i.label}: ${$$(i.cost)}`).join("\n")}\n\nTotal: ${$$(est.total)}\n\nIndicative only.`;navigator.clipboard.writeText(txt).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});}}>{copied?"✓ Copied":"Copy estimate"}</button>
        <button className="bl" style={{flex:1,textAlign:"center"}} onClick={onReset}>← New estimate</button>
      </div>
      <p style={{color:"var(--mut)",fontSize:11,marginTop:14,lineHeight:1.6}}>This estimate uses approximate measurements and indicative industry rates. Actual costs vary based on site inspection. Always obtain a formal written quote before proceeding.</p>
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
  const [pendingFile,setPendingFile]=useState(null);
  const reset=()=>{setStep("entry");setPrefilled(null);setEstForm(null);setEst(null);setLead(null);setPendingFile(null);};
  const handleQDone=f=>{setEstForm(f);setEst(calcEst(f,rates));setStep("lead");};
  const handlePrefill=pf=>{setPrefilled(pf);setStep("questionnaire");};
  const handleLead=l=>{setLead(l);setStep("result");};
  const handleFileDropped=f=>{setPendingFile(f);};
  return(
    <div className="qt">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
        {step!=="entry"?<button className="bl" onClick={reset}>← Start over</button>:<div/>}
        <button className="bs" style={{padding:"7px 16px",fontSize:11}} onClick={onRates}>⚙ My Rates</button>
      </div>
      {step==="entry"&&<EntryScreen onChoice={s=>setStep(s)} onFileDropped={handleFileDropped}/>}
      {step==="upload"&&<PlanUploadPath rates={rates} onPrefill={handlePrefill} autoFile={pendingFile}/>}
      {step==="photos"&&<PhotoUploadPath rates={rates} onPrefill={handlePrefill}/>}
      {step==="questionnaire"&&<Questionnaire rates={rates} onDone={handleQDone} prefilled={prefilled}/>}
      {step==="lead"&&<LeadCapture onSubmit={handleLead}/>}
      {step==="result"&&est&&<ResultsCard est={est} lead={lead} form={estForm} onReset={reset}/>}
    </div>
  );
}

// ─── REVENUE ESTIMATOR ───────────────────────────────────────────────────────
function RevenueEstimator({nav}){
  const PRODS=[
    {id:"quote", name:"PaintIQ Quote Tool", price:99,  mult:1.20, badge:"+20% win rate",    color:"#E8420A", desc:"Faster quotes = more jobs won"},
    {id:"web",   name:"PaintIQ Website",    price:149, mult:1.35, badge:"+35% enquiries",   color:"#0D6E56", desc:"More visitors become leads"},
    {id:"voice", name:"PaintIQ Voice",      price:149, mult:1.22, badge:"+22% call capture",color:"#0F2744", desc:"Every missed call = won job"},
    {id:"social",name:"PaintIQ Social",     price:199, mult:1.15, badge:"+15% visibility",  color:"#7A2090", desc:"Stay front of mind between jobs"},
    {id:"leads", name:"PaintIQ Leads",      price:297, mult:1.28, badge:"+28% traffic",     color:"#D4860A", desc:"Paid campaigns bring new clients"},
  ];
  const REVENUE_OPTIONS=[5000,8000,10000,15000,20000,25000,30000,40000,50000,75000,100000];
  const [revenue,setRevenue]=useState(20000);
  const [sel,setSel]=useState({quote:true,web:false,voice:false,social:false,leads:false});
  const toggle=id=>setSel(p=>({...p,[id]:!p[id]}));

  const totalMult=PRODS.reduce((m,p)=>sel[p.id]?m*p.mult:m,1);
  const totalCost=PRODS.reduce((c,p)=>sel[p.id]?c+p.price:c,0);
  const newRev=Math.round(revenue*totalMult);
  const extraRev=newRev-revenue;
  const roi=totalCost>0?Math.round(extraRev/totalCost):0;
  const fmtK=n=>n>=1000?"$"+Math.round(n/1000)+"K":"$"+n;
  const fmt2=n=>"$"+Math.round(n).toLocaleString("en-AU");

  return(
    <div style={{background:"var(--txt)"}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"64px 24px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div className="tag" style={{background:"rgba(232,66,10,.15)",borderColor:"rgba(232,66,10,.3)"}}>Revenue estimator</div>
          <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,46px)",fontWeight:800,color:"#fff",marginBottom:10}}>See what PaintIQ could mean for your business</h2>
          <p style={{color:"rgba(255,255,255,.55)",fontSize:15,maxWidth:480,margin:"0 auto"}}>Adjust your current revenue and toggle products to see your estimated growth.</p>
        </div>

        <div className="mob-col-s">

          {/* LEFT — inputs */}
          <div>
            <div style={{marginBottom:24}}>
              <label style={{display:"block",fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:10}}>Your current monthly revenue</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {REVENUE_OPTIONS.map(v=>(
                  <button key={v} onClick={()=>setRevenue(v)} style={{padding:"8px 14px",borderRadius:3,border:`1.5px solid ${revenue===v?"var(--acc)":"rgba(255,255,255,.12)"}`,background:revenue===v?"rgba(232,66,10,.12)":"transparent",color:revenue===v?"var(--acc)":"rgba(255,255,255,.55)",fontFamily:"var(--fh)",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    {fmtK(v)}
                  </button>
                ))}
              </div>
            </div>

            <label style={{display:"block",fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:12}}>Add PaintIQ products</label>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {PRODS.map(p=>(
                <div key={p.id} onClick={()=>toggle(p.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:3,border:`1.5px solid ${sel[p.id]?p.color:"rgba(255,255,255,.1)"}`,background:sel[p.id]?`rgba(255,255,255,.04)`:"transparent",cursor:"pointer",transition:"all .18s"}}>
                  <div style={{width:20,height:20,borderRadius:2,border:`2px solid ${sel[p.id]?p.color:"rgba(255,255,255,.2)"}`,background:sel[p.id]?p.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                    {sel[p.id]&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:sel[p.id]?"#fff":"rgba(255,255,255,.6)",fontFamily:"var(--fh)"}}>{p.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:1}}>{p.desc}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:sel[p.id]?p.color:"rgba(255,255,255,.4)",fontFamily:"var(--fh)"}}>${p.price}/mo</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:1}}>{p.badge}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — output */}
          <div style={{position:"sticky",top:80}}>
            <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:6,padding:28,marginBottom:16}}>
              <div className="mob-col-s" style={{marginBottom:24}}>
                <div style={{background:"rgba(255,255,255,.04)",borderRadius:4,padding:"16px 20px"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:6}}>Without PaintIQ</div>
                  <div style={{fontFamily:"var(--fh)",fontSize:"clamp(22px,3vw,32px)",fontWeight:800,color:"rgba(255,255,255,.45)",lineHeight:1}}>{fmt2(revenue)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginTop:4}}>per month</div>
                </div>
                <div style={{background:`rgba(232,66,10,.08)`,border:"1px solid rgba(232,66,10,.2)",borderRadius:4,padding:"16px 20px"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:6}}>With PaintIQ</div>
                  <div style={{fontFamily:"var(--fh)",fontSize:"clamp(22px,3vw,32px)",fontWeight:800,color:"#fff",lineHeight:1}}>{fmt2(newRev)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4}}>per month</div>
                </div>
              </div>

              <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:20,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:"clamp(18px,3vw,28px)",fontWeight:800,color:"var(--acc)",lineHeight:1}}>+{fmt2(extraRev)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4}}>extra per month</div>
                </div>
                <div style={{textAlign:"center",borderLeft:"1px solid rgba(255,255,255,.07)",borderRight:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:"clamp(18px,3vw,28px)",fontWeight:800,color:"#fff",lineHeight:1}}>{totalCost>0?"$"+totalCost:"-"}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4}}>monthly investment</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:"clamp(18px,3vw,28px)",fontWeight:800,color:totalCost>0?"#4ADE80":"rgba(255,255,255,.25)",lineHeight:1}}>{totalCost>0?roi+"×":"—"}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4}}>return on investment</div>
                </div>
              </div>
            </div>

            {totalCost>0&&(
              <div style={{background:"rgba(232,66,10,.08)",border:"1px solid rgba(232,66,10,.15)",borderRadius:4,padding:"12px 16px",marginBottom:14,fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.5}}>
                For every <strong style={{color:"#fff"}}>${totalCost}/month</strong> you invest, PaintIQ is estimated to return <strong style={{color:"var(--acc)"}}>{fmt2(extraRev)}</strong> in additional monthly revenue — a <strong style={{color:"var(--acc)"}}>{roi}× ROI</strong>.
              </div>
            )}

            <p style={{fontSize:11,color:"rgba(255,255,255,.25)",lineHeight:1.6,marginBottom:16}}>Estimates based on average Australian painting business data and industry win-rate research. Individual results vary. Not a guarantee of income.</p>

            <button className="bp" style={{width:"100%",padding:"13px 0",fontSize:14}} onClick={()=>nav("contact")}>
              Get this growth system →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({nav}){
  const PRODUCTS=[
    {color:"#E8420A",name:"PaintIQ Quote Tool",desc:"Instant AI estimates. Every lead captured before the numbers are revealed."},
    {color:"#0D6E56",name:"PaintIQ Website",desc:"A conversion-focused site with your quote tool built right in."},
    {color:"#0F2744",name:"PaintIQ Voice",desc:"AI answers every call 24/7. Never miss a job because you were on the tools."},
    {color:"#7A2090",name:"PaintIQ Social",desc:"Stay visible to homeowners between jobs with done-for-you social content."},
    {color:"#D4860A",name:"PaintIQ Leads",desc:"Google Ads, email campaigns and retargeting to drive qualified enquiries."},
  ];

  return(
    <div>
      {/* HERO */}
      <div className="hero">
        <div style={{maxWidth:1200,margin:"0 auto",position:"relative"}}>
          <div className="mob-col">
            <div>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(232,66,10,.15)",border:"1px solid rgba(232,66,10,.3)",borderRadius:2,padding:"5px 12px",marginBottom:20}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"var(--acc)",display:"inline-block"}}/>
                <span style={{fontFamily:"var(--fh)",fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"var(--acc)"}}>For Australian painting businesses</span>
              </div>
              <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(44px,6vw,80px)",fontWeight:800,lineHeight:.9,color:"#fff",marginBottom:24,letterSpacing:"-.02em"}}>
                Double Your Painting Business<br/><span style={{color:"var(--acc)"}}>in 12 Months.</span>
              </h1>
              <p style={{fontSize:18,color:"rgba(255,255,255,.65)",lineHeight:1.65,marginBottom:24,maxWidth:460}}>
                The complete growth system for Australian painters. Quote instantly. Capture every lead. Answer every call. Win more jobs at a higher fee.
              </p>
              <div style={{display:"inline-flex",flexWrap:"wrap",gap:"10px 24px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:3,padding:"12px 18px",marginBottom:24,fontSize:13,color:"rgba(255,255,255,.75)"}}>
                {["Deploy in days","No effort from you","No cost up front","Monthly fee only","Starts from $99/month"].map((t,i)=>(
                  <span key={t} style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"var(--acc)",fontWeight:700}}>✓</span>{t}
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <button className="bp" style={{fontSize:14,padding:"14px 32px"}} onClick={()=>nav("contact")}>Book a demo</button>
                <button onClick={()=>nav("tool")} style={{background:"transparent",color:"#fff",border:"2px solid rgba(255,255,255,.3)",padding:"12px 28px",borderRadius:3,fontFamily:"var(--fh)",fontSize:13,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer",transition:"all .15s"}}>Try quote tool →</button>
              </div>
            </div>
            <div>
              {/* Paint swatch strips */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[
                  ["#FF8A6A","#E8420A","#C53509","#8B2206"],
                  ["#6DD4B8","#2A9E7E","#0D6E56","#084A3A"],
                  ["#7AA8D4","#3A72A8","#0F2744","#081828"],
                  ["#F4C86A","#E09020","#D4860A","#8B5A04"],
                  ["#CC80E0","#A840C0","#7A2090","#4A1260"],
                ].map((row,i)=>(
                  <div key={i} style={{display:"flex",gap:4,height:32}}>
                    {row.map((c,j)=>(
                      <div key={j} style={{flex:1,background:c,borderRadius:2,position:"relative"}}>
                        {j===3&&<div style={{position:"absolute",bottom:4,right:6,width:8,height:8,borderRadius:"50%",background:"rgba(255,255,255,.3)"}}/>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{marginTop:16,padding:"14px 16px",background:"rgba(255,255,255,.06)",borderRadius:3,border:"1px solid rgba(255,255,255,.1)"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:6}}>Research-backed</div>
                <p style={{fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.5}}>62% of homeowners who don't get an immediate response call the next painter on Google. The first painter to respond wins the job 15–35% more often — and can charge a premium for it.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{background:"#fff",borderBottom:"1px solid var(--bdr)"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
          <div className="g4">
            {[
              ["$8K–$15K","Average residential painting job in Australia"],
              ["62%","Of homeowners call the next painter if you don't answer"],
              ["35%","Win rate improvement from responding instantly"],
              ["2.25×","Average business growth with the full PaintIQ system"],
            ].map(([n,l])=>(
              <div key={n} style={{textAlign:"center",padding:"8px 16px",borderRight:"1px solid var(--bdr)"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(24px,3vw,36px)",fontWeight:800,color:"var(--acc)",lineHeight:1}}>{n}</div>
                <div style={{color:"var(--mut)",fontSize:12,marginTop:4,lineHeight:1.4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REVENUE ESTIMATOR */}
      <RevenueEstimator nav={nav}/>

      {/* DOUBLE YOUR BUSINESS */}
      <div style={{background:"var(--surf2)"}}>
        <div className="sec">
          <div style={{textAlign:"center",marginBottom:48}}>
            <div className="tag">The PaintIQ effect</div>
            <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(28px,4vw,52px)",fontWeight:800,marginBottom:12}}>How painters double their business in 12 months</h2>
            <p style={{color:"var(--mut)",maxWidth:520,margin:"0 auto",fontSize:16,lineHeight:1.65}}>Three small improvements across your sales funnel compound into a business transformation.</p>
          </div>
          <div className="g3" style={{gap:2,marginBottom:32}}>
            {[
              {n:"01",color:"var(--acc)",title:"+40% more enquiries",sub:"Better website, social presence and lead campaigns drive more homeowners to your quote tool.",from:"20 enquiries/mo",to:"28 enquiries/mo"},
              {n:"02",color:"var(--teal)",title:"+40% better conversion",sub:"Responding instantly with a quote — before your competitors even call back — wins more jobs.",from:"25% win rate",to:"35% win rate"},
              {n:"03",color:"var(--navy)",title:"+15% higher job value",sub:"A professional first impression commands premium pricing. Homeowners pay more for certainty.",from:"$8,000 avg job",to:"$9,200 avg job"},
            ].map(s=>(
              <div key={s.n} style={{background:"#fff",padding:28,borderRadius:4,position:"relative",overflow:"hidden",border:"1px solid var(--bdr)"}}>
                <div className="step-num">{s.n}</div>
                <div style={{position:"relative"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:22,fontWeight:800,color:s.color,marginBottom:8}}>{s.title}</div>
                  <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65,marginBottom:16}}>{s.sub}</p>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{background:"var(--surf2)",padding:"5px 10px",borderRadius:2,fontSize:12,color:"var(--mut)",fontFamily:"var(--fh)"}}>{s.from}</span>
                    <span style={{color:"var(--acc)",fontWeight:700}}>→</span>
                    <span style={{background:"rgba(232,66,10,.08)",padding:"5px 10px",borderRadius:2,fontSize:12,color:"var(--acc)",fontFamily:"var(--fh)",fontWeight:700}}>{s.to}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"var(--acc)",borderRadius:4,padding:28,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
            <div>
              <div style={{fontFamily:"var(--fh)",fontSize:13,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.7)",marginBottom:6}}>The result</div>
              <div style={{fontFamily:"var(--fh)",fontSize:"clamp(24px,4vw,40px)",fontWeight:800,color:"#fff",lineHeight:1}}>$40K/mo → $90K/mo</div>
              <p style={{color:"rgba(255,255,255,.75)",fontSize:14,marginTop:6}}>Based on 20 enquiries/month, 25% base conversion, $8,000 average job. Results vary.</p>
            </div>
            <button onClick={()=>nav("packages")} style={{background:"#fff",color:"var(--acc)",border:"none",padding:"13px 28px",borderRadius:3,fontFamily:"var(--fh)",fontSize:13,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer"}}>See how it works →</button>
          </div>
        </div>
      </div>

      {/* PROBLEM / SOLUTION */}
      <div style={{background:"#fff"}}>
        <div className="sec">
          <div className="g2" style={{gap:48,alignItems:"center"}}>
            <div>
              <div className="tag">The problem</div>
              <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,44px)",fontWeight:800,lineHeight:1.05,marginBottom:16}}>Painters are too busy working to grow their business</h2>
              <p style={{color:"var(--mut)",fontSize:16,lineHeight:1.7,marginBottom:20}}>You are on the tools all day. Quotes pile up. Calls get missed. Your website has not been touched in years. Meanwhile better-marketed competitors are winning the jobs you should have.</p>
              {["Too long spent writing quotes manually","Missed calls when working on site","Website that does not generate leads","No system to follow up enquiries quickly"].map(l=>(
                <div key={l} style={{display:"flex",gap:10,marginBottom:10,fontSize:14,color:"var(--mut)"}}>
                  <span style={{color:"#E84040",fontWeight:700,marginTop:1}}>✗</span>{l}
                </div>
              ))}
            </div>
            <div>
              <div style={{borderLeft:"4px solid var(--acc)",paddingLeft:24,marginBottom:20}}>
                <div style={{fontFamily:"var(--fh)",fontSize:15,fontWeight:700,color:"var(--acc)",marginBottom:8}}>With PaintIQ</div>
                {["Quote generated in under 3 minutes","AI answers calls 24 hours a day","Website built to convert visitors","Every lead captured automatically"].map(l=>(
                  <div key={l} style={{display:"flex",gap:10,marginBottom:12,fontSize:15}}>
                    <span style={{color:"var(--teal)",fontWeight:700}}>✓</span>{l}
                  </div>
                ))}
              </div>
              <div style={{background:"var(--txt)",borderRadius:4,padding:20,color:"#fff"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:13,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:8}}>What Australian research shows</div>
                <p style={{fontSize:14,lineHeight:1.65,color:"rgba(255,255,255,.8)"}}>Trades businesses in Australia win jobs less by being cheaper and more by responding faster and communicating well. The painter who responds first with a professional quote wins the job — and can charge more for it.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 PRODUCTS */}
      <div style={{background:"var(--surf2)"}}>
        <div className="sec">
          <div style={{textAlign:"center",marginBottom:48}}>
            <div className="tag">5 Smart Products</div>
            <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,48px)",fontWeight:800,marginBottom:12}}>Pick what you need. Add more as you grow.</h2>
            <p style={{color:"var(--mut)",maxWidth:500,margin:"0 auto",fontSize:16}}>Start with just the Quote Tool. Add Voice, Social and Leads when you are ready. Pay only for what you use.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {PRODUCTS.map((p,i)=>(
              <div key={p.name} className="prod-item">
                <div style={{width:48,height:48,background:p.color,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontFamily:"var(--fh)",fontSize:16,fontWeight:800,color:"#fff"}}>0{i+1}</span>
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:18,fontWeight:800,marginBottom:4}}>{p.name}</div>
                  <p style={{color:"var(--mut)",fontSize:14}}>{p.desc}</p>
                </div>
                <button className="bs" style={{fontSize:11,padding:"8px 16px",borderColor:p.color,color:p.color,flexShrink:0}} onClick={()=>nav("packages")}>Learn more →</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{background:"#fff"}}>
        <div className="sec">
          <div style={{textAlign:"center",marginBottom:48}}>
            <div className="tag">How it works</div>
            <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,48px)",fontWeight:800}}>From visitor to booked job in minutes</h2>
          </div>
          <div className="g4">
            {[
              {n:"01",c:"var(--acc)",t:"Homeowner gets a quote",b:"They upload plans, photos or answer questions on your website. Takes under 3 minutes."},
              {n:"02",c:"var(--teal)",t:"You capture the lead",b:"Before the estimate is revealed they enter name, email, phone and property address."},
              {n:"03",c:"var(--navy)",t:"You get notified instantly",b:"Lead lands in your HubSpot. Job details, estimate range and contact info — ready to go."},
              {n:"04",c:"var(--amber)",t:"You book the job",b:"Follow up fast, visit the site, send a formal quote. Close more work at better rates."},
            ].map(s=>(
              <div key={s.n} style={{position:"relative"}}>
                <div style={{width:48,height:48,background:s.c,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fh)",fontSize:18,fontWeight:800,color:"#fff",marginBottom:14}}>{s.n}</div>
                <h3 style={{fontFamily:"var(--fh)",fontSize:17,fontWeight:700,marginBottom:8}}>{s.t}</h3>
                <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{background:"var(--txt)",padding:"72px 24px",textAlign:"center"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(28px,4vw,52px)",fontWeight:800,color:"#fff",marginBottom:12}}>Ready to double your painting business?</h2>
          <p style={{color:"rgba(255,255,255,.6)",fontSize:17,marginBottom:32,lineHeight:1.65}}>Book a free 20-minute demo. We will show you the system, answer your questions and put together a plan for your business.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="bp" style={{fontSize:15,padding:"15px 36px"}} onClick={()=>nav("contact")}>Book a demo</button>
            <button onClick={()=>nav("tool")} style={{background:"transparent",color:"#fff",border:"2px solid rgba(255,255,255,.3)",padding:"13px 28px",borderRadius:3,fontFamily:"var(--fh)",fontSize:13,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer"}}>Try quote tool →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PACKAGES PAGE ────────────────────────────────────────────────────────────
const PKGS=[
  {color:"#E8420A",n:"01",name:"PaintIQ Quote Tool",tag:"Quote faster. Capture every lead.",setup:"$97",mo:"$97/mo",
   items:["AI painting estimator (3 paths)","Plan upload, photo AI, room selector","Lead capture before estimate reveal","Branded estimate result page","Email notification to painter","HubSpot CRM sync"]},
  {color:"#0D6E56",n:"02",name:"PaintIQ Website",tag:"A website that converts visitors into jobs.",setup:"$149",mo:"$149/mo",feat:true,
   items:["Quote Tool included","5-page conversion website","Project gallery & testimonials","SEO-ready structure","Mobile-first design","Monthly support & updates"]},
  {color:"#0F2744",n:"03",name:"PaintIQ Voice",tag:"Answer every call, 24/7.",setup:"$149",mo:"$149/mo",
   items:["AI answers calls 24/7","Full job qualification","HubSpot lead logging","SMS follow-up to caller","Appointment booking","Monthly call report"]},
  {color:"#7A2090",n:"04",name:"PaintIQ Social",tag:"Stay visible between jobs.",setup:"$199",mo:"$199/mo",
   items:["16 posts/month Facebook + Instagram","Before/after job photo content","Google Business posts","Review generation prompts","Monthly engagement report","Reels & short video content"]},
  {color:"#D4860A",n:"05",name:"PaintIQ Leads",tag:"Drive qualified homeowners to you.",setup:"$297",mo:"$297/mo",
   items:["Google Business optimisation","Review management system","Local SEO foundation","Google Ads management","Email follow-up sequences","Monthly strategy call"]},
];

function PackagesPage({nav}){
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag">Packages & pricing</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(32px,5vw,60px)",fontWeight:800,color:"#fff",marginBottom:12}}>Pick what you need</h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:17,maxWidth:520,margin:"0 auto"}}>Start with one product. Stack as many as you want. No cost up front. Monthly fee only. Starts from $99/month.</p>
      </div>
      <div className="sec">
        <div style={{display:"flex",flexDirection:"column",gap:20,marginBottom:40}}>
          {PKGS.map(p=>(
            <div key={p.n} className="pkg-card" style={{border:`2px solid ${p.feat?"var(--acc)":"var(--bdr)"}`}}>
              <div style={{width:8,background:p.color,flexShrink:0}}/>
              <div style={{flex:1,padding:28,display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div style={{flex:2,minWidth:200}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:p.color,marginBottom:6,fontWeight:700}}>Product {p.n}</div>
                  <h2 style={{fontFamily:"var(--fh)",fontSize:22,fontWeight:800,marginBottom:4}}>{p.name}</h2>
                  <p style={{color:"var(--mut)",fontSize:14,marginBottom:16}}>{p.tag}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {p.items.map(i=>(
                      <div key={i} style={{display:"flex",gap:6,fontSize:13,color:"var(--txt)",alignItems:"flex-start"}}>
                        <span style={{color:"var(--teal)",fontWeight:700,marginTop:1,flexShrink:0}}>✓</span>{i}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12,alignItems:"flex-end",minWidth:140}}>
                  {p.feat&&<div style={{background:"var(--acc)",color:"#fff",fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",padding:"4px 10px",borderRadius:2,fontFamily:"var(--fh)"}}>Most popular</div>}
                  <div style={{textAlign:"right"}}>
                    <div style={{color:"var(--mut)",fontSize:11,textTransform:"uppercase",letterSpacing:".06em"}}>Per month</div>
                    <div style={{fontFamily:"var(--fh)",fontSize:32,fontWeight:800,color:"var(--txt)"}}>{p.mo}</div>
                  </div>
                  <button className="bp" style={{background:p.color,padding:"11px 22px",fontSize:12}} onClick={()=>nav("contact")}>Get started</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"var(--surf2)",borderRadius:4,padding:24,textAlign:"center",border:"1px solid var(--bdr)"}}>
          <p style={{color:"var(--mut)",fontSize:14}}>Want everything? Bundle all 5 products for <strong style={{color:"var(--txt)"}}>$699/month</strong> — save over $190/month. <button className="bl" style={{color:"var(--acc)",fontSize:14}} onClick={()=>nav("contact")}>Talk to us →</button></p>
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE TOOL PAGE ──────────────────────────────────────────────────────────
function QuoteToolPage({rates,onRates}){
  return(
    <div>
      {/* HERO */}
      <div style={{background:"var(--txt)",padding:"64px 24px 52px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="tag">PaintIQ Quote Tool</div>
          <div className="mob-col">
            <div>
              <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(32px,5vw,58px)",fontWeight:800,color:"#fff",lineHeight:.95,marginBottom:20,letterSpacing:"-.01em"}}>
                Give every homeowner an instant quote.<br/><span style={{color:"var(--acc)"}}>Capture every lead.</span>
              </h1>
              <p style={{color:"rgba(255,255,255,.65)",fontSize:16,lineHeight:1.7,marginBottom:24,maxWidth:440}}>
                Most painters take days to quote. The homeowner calls three painters and books the first one who responds. PaintIQ Quote Tool puts you first — every time.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
                {[
                  ["Homeowner visits your website and requests a quote","They upload plans, take photos, or answer room-by-room questions"],
                  ["AI generates an indicative estimate instantly","No waiting. No back and forth. No site visit required yet."],
                  ["Before the estimate is revealed — you capture the lead","Name, email, phone and property address. Every single time."],
                  ["You get notified immediately","Job details land in your inbox and HubSpot. You follow up first."],
                ].map(([t,d],i)=>(
                  <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                      <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{i+1}</span>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:2}}>{t}</div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,.45)",lineHeight:1.5}}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {stat:"62%",text:"Of homeowners call the next painter if no one responds quickly"},
                {stat:"15–35%",text:"Win rate improvement for painters who respond with an instant quote"},
                {stat:"100%",text:"Of leads captured before the estimate is revealed — yours to follow up"},
                {stat:"$8K–$15K",text:"Average residential painting job value in Australia"},
              ].map(s=>(
                <div key={s.stat} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:4,padding:"16px 20px",display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:26,fontWeight:800,color:"var(--acc)",lineHeight:1,flexShrink:0,minWidth:80}}>{s.stat}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.55)",lineHeight:1.5}}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WHY THE LEAD GATE MATTERS */}
      <div style={{background:"var(--surf2)",borderBottom:"1px solid var(--bdr)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>
          <div style={{display:"flex",gap:32,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:1,minWidth:280}}>
              <div style={{fontFamily:"var(--fh)",fontSize:13,fontWeight:700,color:"var(--acc)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Why the lead gate matters</div>
              <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.65}}>Every other quoting tool shows the estimate for free. PaintIQ captures the homeowner's details first — so even if they get three quotes, you have their contact information and can follow up. No lead ever walks away anonymous.</p>
            </div>
            <div style={{flex:1,minWidth:280}}>
              <div style={{fontFamily:"var(--fh)",fontSize:13,fontWeight:700,color:"var(--teal)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Three ways to get an estimate</div>
              <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.65}}>Upload architectural plans for maximum accuracy, take photos of the property for an AI-read estimate, or select rooms one by one for a quick result. No plans? Council tip below will help. All three paths capture the lead before reveal.</p>
            </div>
          </div>
        </div>
      </div>

      <QuoteTool rates={rates} onRates={onRates}/>
    </div>
  );
}

// ─── CONTENT PAGES (template) ─────────────────────────────────────────────────
function ContentPage({color,tagLabel,title,heroSteps,heroStats,whyLeft,whyRight,sections,ctaHead,ctaSub,ctaBtn,onCta}){
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px 52px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>{tagLabel}</div>
          <div className="mob-col">
            <div>
              <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(30px,5vw,54px)",fontWeight:800,color:"#fff",lineHeight:.95,marginBottom:20,letterSpacing:"-.01em"}}>{title}</h1>
              {heroSteps&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {heroSteps.map(([t,d],i)=>(
                    <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                        <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{i+1}</span>
                      </div>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:2}}>{t}</div>
                        <div style={{fontSize:13,color:"rgba(255,255,255,.45)",lineHeight:1.5}}>{d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {heroStats&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {heroStats.map(([stat,text])=>(
                  <div key={stat} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:4,padding:"16px 20px",display:"flex",gap:16,alignItems:"center"}}>
                    <div style={{fontFamily:"var(--fh)",fontSize:26,fontWeight:800,color,lineHeight:1,flexShrink:0,minWidth:80}}>{stat}</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,.55)",lineHeight:1.5}}>{text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {(whyLeft||whyRight)&&(
        <div style={{background:"var(--surf2)",borderBottom:"1px solid var(--bdr)"}}>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px",display:"flex",gap:32,flexWrap:"wrap",alignItems:"center"}}>
            {whyLeft&&<div style={{flex:1,minWidth:280}}>
              <div style={{fontFamily:"var(--fh)",fontSize:12,fontWeight:700,color,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>{whyLeft[0]}</div>
              <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.65}}>{whyLeft[1]}</p>
            </div>}
            {whyRight&&<div style={{flex:1,minWidth:280}}>
              <div style={{fontFamily:"var(--fh)",fontSize:12,fontWeight:700,color:"var(--teal)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>{whyRight[0]}</div>
              <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.65}}>{whyRight[1]}</p>
            </div>}
          </div>
        </div>
      )}
      <div className="sec">
        {sections.map((s,i)=>(
          <div key={i} style={{marginBottom:52}}>
            {s.type==="split"&&(
              <div className="g2" style={{gap:48,alignItems:"center"}}>
                <div>
                  <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(22px,3vw,38px)",fontWeight:800,lineHeight:1.1,marginBottom:14}}>{s.heading}</h2>
                  <p style={{color:"var(--mut)",fontSize:16,lineHeight:1.7,marginBottom:16}}>{s.body}</p>
                  {s.bullets?.map(b=>(
                    <div key={b} style={{display:"flex",gap:10,marginBottom:12}}>
                      <span style={{color,fontWeight:700,marginTop:2}}>→</span>
                      <span style={{fontSize:15}}>{b}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"var(--surf2)",borderRadius:4,padding:28,borderLeft:`4px solid ${color}`}}>
                  {s.stats?.map(([n,l])=>(
                    <div key={l} style={{marginBottom:20,paddingBottom:20,borderBottom:"1px solid var(--bdr)"}}>
                      <div style={{fontFamily:"var(--fh)",fontSize:40,fontWeight:800,color,lineHeight:1}}>{n}</div>
                      <div style={{fontSize:14,marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {s.type==="grid"&&(
              <>
                <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(20px,3vw,34px)",fontWeight:800,marginBottom:8}}>{s.heading}</h2>
                {s.sub&&<p style={{color:"var(--mut)",marginBottom:24,fontSize:15,lineHeight:1.6}}>{s.sub}</p>}
                <div className="g3">
                  {s.items.map((item,j)=>(
                    <div key={j} className="feat-card" style={{borderTop:`3px solid ${["var(--acc)","var(--teal)","var(--navy)","var(--amber)","var(--acc)","var(--teal)"][j%6]}`}}>
                      <h3 style={{fontFamily:"var(--fh)",fontSize:16,fontWeight:700,marginBottom:6}}>{item.title}</h3>
                      <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{item.body}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        <div style={{background:color,borderRadius:4,padding:36,textAlign:"center"}}>
          <h3 style={{fontFamily:"var(--fh)",fontSize:26,fontWeight:800,color:"#fff",marginBottom:8}}>{ctaHead}</h3>
          <p style={{color:"rgba(255,255,255,.75)",marginBottom:20,fontSize:15}}>{ctaSub}</p>
          <button style={{background:"#fff",color,border:"none",padding:"12px 28px",borderRadius:3,fontFamily:"var(--fh)",fontSize:13,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer"}} onClick={onCta}>{ctaBtn}</button>
        </div>
      </div>
    </div>
  );
}

function WebsiteGrowthPage({nav}){
  return <ContentPage color="var(--teal)" tagLabel="PaintIQ Website"
    title={"A website that turns visitors into booked painting jobs."}
    heroSteps={[
      ["Homeowner searches Google for a painter in your area","They find your professional PaintIQ website — fast, mobile-ready, built to convert"],
      ["They use the built-in PaintIQ Quote Tool instantly","No phone call needed. An estimate in under 3 minutes, right on your site"],
      ["Their details are captured before the estimate is revealed","Name, email, phone and address — every single visitor who requests a quote"],
      ["You get notified and follow up first","You already have their details. You call before your competitors even know they exist"],
    ]}
    heroStats={[
      ["72%","Of tradies still rely on word of mouth — with no website working for them"],
      ["3×","More leads generated by sites with an embedded quote tool"],
      ["68%","Of homeowners search for tradies on mobile — your site is built for it"],
      ["3 days","From sign-up to your new PaintIQ website going live"],
    ]}
    whyLeft={["Why most painter websites fail","Most painter websites are built once and never touched again. No quote tool. No lead capture. No calls to action. They look like a business card when they should be working like a salesperson — 24 hours a day."]}
    whyRight={["What makes a PaintIQ website different","Every PaintIQ website is built around one goal: converting visitors into quote requests. The PaintIQ Quote Tool is embedded directly, SEO is built in from day one, and the design is mobile-first. It works while you are on the tools."]}
    sections={[
      {type:"grid",heading:"What your PaintIQ website includes",items:[
        {title:"Conversion-focused design",body:"Built to turn visitors into quote requests. Clear calls to action on every page."},
        {title:"PaintIQ Quote Tool built in",body:"Visitors can get an instant estimate without leaving your site. Every lead captured."},
        {title:"Project gallery",body:"Showcase your best work. Quality before/after photos build trust and close jobs."},
        {title:"Testimonials & trust signals",body:"Reviews, credentials and before/afters — all the proof buyers need to choose you."},
        {title:"SEO-ready structure",body:"Proper page titles, meta descriptions, local SEO. Fast load times. Day one."},
        {title:"Mobile-first design",body:"Most homeowners search on phones. Your site works perfectly on every device."},
      ]},
    ]}
    ctaHead="Ready for a website that works for you?" ctaSub="We build it. You approve it. Live in 3 days. No cost up front." ctaBtn="Book a demo"
    onCta={()=>nav("contact")}/>;
}

function LeadGenPage({nav}){
  return <ContentPage color="var(--amber)" tagLabel="PaintIQ Social + Leads"
    title={"Stop waiting for referrals. Generate your own leads."}
    heroSteps={[
      ["Homeowners see your work on Instagram and Facebook between jobs","Consistent social content keeps your business front of mind for when they need a painter"],
      ["Google Ads bring homeowners actively searching right now","Targeted campaigns put your quote tool in front of people ready to book"],
      ["They land on your site and get an instant estimate","Your PaintIQ Quote Tool captures every lead before the numbers are revealed"],
      ["Every lead flows straight into HubSpot for follow-up","No spreadsheets. No lost enquiries. Every lead tracked from first contact to booked job"],
    ]}
    heroStats={[
      ["5×","Average return on ad spend for local trade services in Australia"],
      ["$8K–$15K","Average residential painting job value — one lead pays for months of campaigns"],
      ["60 days","Most painting businesses see measurable results within the first two months"],
      ["16 posts","Per month across Facebook and Instagram — done entirely for you"],
    ]}
    whyLeft={["Why a great website is not enough","Even the best website needs people to find it. Most painters are invisible online — no Google presence, no social media, no campaigns. Meanwhile their competitors are showing up every time a homeowner searches."]}
    whyRight={["PaintIQ Leads and Social combined","PaintIQ Social builds your brand visibility between jobs. PaintIQ Leads drives targeted traffic through Google Ads, retargeting and email campaigns. Together they create a steady, predictable flow of new enquiries every month."]}
    sections={[
      {type:"grid",heading:"What is included",items:[
        {title:"Google Ads management",body:"Target homeowners searching for painters near you. Pay only when someone clicks."},
        {title:"Social media content",body:"16 posts per month across Facebook and Instagram. Before/after photos, project stories."},
        {title:"Email sequences",body:"Automated follow-up to past clients, unconverted leads and seasonal campaigns."},
        {title:"Retargeting",body:"Reach people who visited your website but did not get a quote. Bring them back."},
        {title:"HubSpot CRM",body:"Every lead tracked. Every conversation logged. No lost follow-ups. Ever."},
        {title:"Monthly review",body:"We review results and adjust campaigns each month to improve what is working."},
      ]},
    ]}
    ctaHead="Ready to start generating consistent leads?" ctaSub="Most painting businesses see results within 60 days. No cost up front." ctaBtn="Book a strategy call"
    onCta={()=>nav("contact")}/>;
}

function AIVoicePage({nav}){
  return <ContentPage color="var(--navy)" tagLabel="PaintIQ Voice"
    title={"Answer every call. Win every job you earned."}
    heroSteps={[
      ["Your phone rings while you are up a ladder or under a house","You cannot answer. Without PaintIQ Voice, that caller moves on to the next painter immediately"],
      ["PaintIQ Voice answers instantly — as your business","Natural-sounding AI greets the caller professionally, using your business name"],
      ["AI qualifies the caller and captures every detail","What type of job, where, timeline, contact details — everything you need to follow up"],
      ["You receive a full lead summary the moment the call ends","Name, job brief and contact info in your inbox and HubSpot. You call back first"],
    ]}
    heroStats={[
      ["62%","Of homeowners do not leave a voicemail — they call the next painter on Google"],
      ["3–5","Missed calls per week for the average Australian painting business"],
      ["$8K–$15K","Average job value lost every time you miss a call"],
      ["24/7","AI answers on weekends, after hours and every time — without fail"],
    ]}
    whyLeft={["The true cost of a missed call","Most painters do not realise how much revenue they lose to missed calls. A homeowner calls three painters. The first to answer and respond professionally gets the job. If your phone goes to voicemail, that job is gone — no matter how good your work is."]}
    whyRight={["PaintIQ Voice changes the equation","Every call answered. Every lead qualified. Every detail captured and sent straight to you. PaintIQ Voice acts as a professional receptionist for your painting business, 24 hours a day — so you never lose a job to a missed call again."]}
    sections={[
      {type:"grid",heading:"How PaintIQ Voice works",items:[
        {title:"Call received",body:"A homeowner calls your business number while you are on site or unavailable."},
        {title:"AI answers instantly",body:"Natural-sounding AI greets the caller as your business and asks how it can help."},
        {title:"Lead qualified",body:"AI asks: what type of job, location, timeline, property type."},
        {title:"Booking offered",body:"AI offers to book a callback or site inspection on your calendar."},
        {title:"You get notified",body:"Summary text and email with caller details and job brief — straight away."},
        {title:"CRM logged",body:"Lead created automatically in HubSpot. No manual data entry ever."},
      ]},
    ]}
    ctaHead="Stop losing jobs to a missed call" ctaSub="PaintIQ Voice is $149/month. One extra job pays for years of the service." ctaBtn="Get PaintIQ Voice"
    onCta={()=>nav("contact")}/>;
}

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────
function ContactPage(){
  const [f,setF]=useState({name:"",business:"",email:"",phone:"",location:"",website:"",challenge:"",pkg:"unsure"});
  const [sent,setSent]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  if(sent)return(
    <div style={{textAlign:"center",padding:"100px 24px"}}>
      <div style={{width:64,height:64,background:"var(--teal)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px"}}>✓</div>
      <h1 style={{fontFamily:"var(--fh)",fontSize:40,fontWeight:800,marginBottom:12}}>We will be in touch!</h1>
      <p style={{color:"var(--mut)",fontSize:17,maxWidth:440,margin:"0 auto",lineHeight:1.6}}>Thanks for reaching out. We will review your details and be back within one business day to book your demo.</p>
    </div>
  );
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag">Get started</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(28px,5vw,50px)",fontWeight:800,color:"#fff",marginBottom:10}}>Book a PaintIQ demo</h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:16,maxWidth:460,margin:"12px auto 0",lineHeight:1.6}}>20 minutes. No pressure. We will show you the system and put together a plan for your business.</p>
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
          <div className="fg"><label className="fl">Current website (if any)</label><input className="fi" type="text" placeholder="www.smithpainting.com.au" value={f.website} onChange={e=>set("website",e.target.value)}/></div>
        </div>
        <div className="fg">
          <label className="fl">Which products interest you?</label>
          <select className="fi" value={f.pkg} onChange={e=>set("pkg",e.target.value)}>
            <option value="quote">PaintIQ Quote Tool — $97/mo</option>
            <option value="website">PaintIQ Website — $149/mo</option>
            <option value="voice">PaintIQ Voice — $149/mo</option>
            <option value="social">PaintIQ Social — $199/mo</option>
            <option value="leads">PaintIQ Leads — $297/mo</option>
            <option value="bundle">Everything — $699/mo (save $190)</option>
            <option value="unsure">Not sure yet — need advice first</option>
          </select>
        </div>
        <div className="fg">
          <label className="fl">Biggest challenge right now</label>
          <textarea className="fi" rows={3} style={{resize:"vertical"}} placeholder="e.g. I spend too long writing quotes manually and miss calls when I am on site..." value={f.challenge} onChange={e=>set("challenge",e.target.value)}/>
        </div>
        <button className="bp" style={{width:"100%",fontSize:15,padding:"14px 0"}} onClick={()=>setSent(true)}>Book my demo →</button>
        <p style={{color:"var(--mut)",fontSize:12,textAlign:"center",marginTop:12}}>No spam. No cold calls. You will only hear from us about your demo.</p>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
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
    <div style={{fontFamily:"'Inter',sans-serif",background:"#FAFAF8",color:"#1A1714",minHeight:"100vh"}}>
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
