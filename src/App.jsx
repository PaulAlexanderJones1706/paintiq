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
const FONTS_URL="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap";

const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#FAFAF8; --surf:#FFFFFF; --surf2:#F2F0EB; --bdr:#E5E0D8;
  --txt:#1A1714; --mut:#7A7570; --acc:#E8420A; --teal:#0D6E56;
  --navy:#0F2744; --amber:#D4860A; --purple:#7A2090; --grn:#1A6B35;
  --fh:'Oswald',sans-serif; --fb:'Inter',sans-serif; --fl:'Space Grotesk',sans-serif;
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
.bs{background:transparent;color:var(--txt);border:2px solid var(--txt);padding:12px 28px;
  border-radius:3px;font-family:var(--fh);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;}
.bs:hover{border-color:var(--acc);color:var(--acc);}
.bw{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.3);padding:12px 28px;border-radius:3px;font-family:var(--fh);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;}
.bw:hover{border-color:#fff;}
.bl{background:none;border:none;color:var(--mut);font-size:14px;padding:4px 0;transition:color .15s;cursor:pointer;}
.bl:hover{color:var(--acc);}

.nav{position:sticky;top:0;z-index:100;background:var(--txt);border-bottom:3px solid var(--acc);}
.nav-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 24px;}
.logo{font-family:var(--fh);font-size:22px;font-weight:700;background:none;border:none;color:#fff;letter-spacing:.02em;cursor:pointer;}
.logo-iq{color:var(--acc);}
.nl{background:none;border:none;color:rgba(255,255,255,.6);font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;transition:color .15s;cursor:pointer;font-family:var(--fb);}
.nl:hover,.nl.on{color:#fff;}

.sec{padding:76px 24px;max-width:1200px;margin:0 auto;}
.g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px;}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;}
.g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}

.tag{display:inline-flex;align-items:center;gap:6px;background:rgba(232,66,10,.08);
  color:var(--acc);padding:5px 12px;border-radius:2px;font-size:11px;font-weight:700;
  letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px;font-family:var(--fh);}

.card{background:#fff;border:1px solid var(--bdr);border-radius:4px;}
.feat-card{background:#fff;border:1px solid var(--bdr);border-radius:4px;padding:22px;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;}
.feat-card:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(0,0,0,.10);border-color:var(--acc);}
.path-card{background:#fff;border:1.5px solid var(--bdr);border-radius:5px;padding:26px;cursor:pointer;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;text-align:left;}
.path-card:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(0,0,0,.10);}
.tile{border-radius:5px;padding:20px;cursor:pointer;transition:transform .22s ease,box-shadow .22s ease;color:#fff;position:relative;overflow:hidden;}
.tile:hover{transform:translateY(-5px);box-shadow:0 18px 44px rgba(0,0,0,.18);}
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
.ok{background:rgba(13,110,86,.06);border:1.5px solid rgba(13,110,86,.25);border-radius:3px;padding:12px 16px;color:var(--teal);font-size:13px;line-height:1.6;margin-bottom:20px;}

.qt{max-width:720px;margin:0 auto;padding:40px 24px 80px;}
.rh{text-align:center;padding:32px;background:var(--acc);border-radius:4px;margin-bottom:20px;color:#fff;}
.li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bdr);gap:12px;font-size:14px;}
.li:last-child{border-bottom:none;}

.modal{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
.modal-box{background:#fff;border-radius:6px;padding:32px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}

.hero{background:var(--txt);padding:96px 24px 72px;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;top:-20%;right:-10%;width:70%;height:140%;
  background:var(--acc);clip-path:polygon(15% 0%,100% 0%,100% 100%,0% 100%);opacity:.07;}

footer{background:var(--txt);color:rgba(255,255,255,.7);}
.flink{background:none;border:none;color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;padding:4px 0;display:block;transition:color .15s;text-align:left;font-family:var(--fb);}
.flink:hover{color:#fff;}

.step-num{font-family:var(--fh);font-size:72px;font-weight:700;line-height:1;opacity:.08;position:absolute;top:-10px;left:-8px;}
@keyframes pulse{0%,100%{opacity:.2}50%{opacity:1}}

.mob-col{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;}
.mob-col-s{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;}
.nav-hamburger{display:none;background:none;border:none;cursor:pointer;flex-direction:column;gap:5px;padding:8px;align-items:center;justify-content:center;}
.nav-hamburger span{width:22px;height:2px;background:#fff;display:block;border-radius:2px;transition:all .2s;}
.mob-nav{position:absolute;top:60px;left:0;right:0;background:var(--txt);border-top:1px solid rgba(255,255,255,.1);padding:16px 20px;flex-direction:column;gap:2px;z-index:99;display:none;}
.mob-nav.open{display:flex;}
.mob-nav .nl{text-align:left;padding:10px 12px;font-size:14px;border-radius:4px;}
.mob-nav .nl:hover{background:rgba(255,255,255,.05);}

@media(max-width:768px){
  .nav-wide{display:none!important;}
  .nav-hamburger{display:flex!important;}
  .hero{padding:64px 16px 52px;}
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
`;

// ─── SHARED ───────────────────────────────────────────────────────────────────
function Toggle({checked,onChange,label}){
  return(
    <div className="tog" onClick={()=>onChange(!checked)}>
      <div className={`tbox ${checked?"on":""}`}>{checked&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}</div>
      <span style={{color:"var(--txt)",fontSize:15,userSelect:"none"}}>{label}</span>
    </div>
  );
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({size=26,dark=false,onClick,icon=true,tagline=false}){
  const iconSz=Math.round(size*1.7);
  const r=Math.round(iconSz*0.24);
  return(
    <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:size*0.42,background:"none",border:"none",cursor:onClick?"pointer":"default",padding:0}}>
      {icon&&(
        <span style={{width:iconSz,height:iconSz,borderRadius:r,background:"#E8420A",display:"inline-flex",flexShrink:0,position:"relative",overflow:"hidden"}}>
          <svg width={iconSz} height={iconSz} viewBox="0 0 46 46" style={{display:"block"}}>
            <path d="M23 9 C23 9 14 23 14 31 a9 9 0 1 0 18 0 C32 23 23 9 23 9 Z" fill="#FFFFFF"/>
          </svg>
        </span>
      )}
      <span style={{display:"inline-flex",flexDirection:"column",alignItems:"flex-start",lineHeight:1}}>
        <span style={{fontFamily:"var(--fl)",fontSize:size,fontWeight:700,letterSpacing:"-.02em",color:dark?"#fff":"#1A1714"}}>paint<span style={{color:"#E8420A"}}>IQ</span></span>
        {tagline&&<span style={{fontFamily:"var(--fb)",fontSize:Math.max(8,size*0.3),fontWeight:600,letterSpacing:".22em",color:dark?"rgba(255,255,255,.45)":"#9A958F",marginTop:size*0.22,textTransform:"uppercase"}}>Grow your business</span>}
      </span>
    </button>
  );
}

function Navbar({page,nav}){
  const [open,setOpen]=useState(false);
  const [subOpen,setSubOpen]=useState(false);
  const MODULES=[
    ["growth","PaintIQ Website","#0D6E56"],
    ["tool","PaintIQ Quote Tool","#E8420A"],
    ["voice","PaintIQ Voice","#0F2744"],
    ["leads","PaintIQ Social + Leads","#D4860A"],
  ];
  const go=p=>{nav(p);setOpen(false);setSubOpen(false);};
  return(
    <nav className="nav">
      <div className="nav-in">
        <Logo size={22} dark onClick={()=>go("home")}/>
        <div className="nav-wide" style={{display:"flex",gap:2,alignItems:"center"}}>
          <button className={`nl ${page==="home"?"on":""}`} onClick={()=>go("home")}>Home</button>
          <div style={{position:"relative"}} onMouseEnter={()=>setSubOpen(true)} onMouseLeave={()=>setSubOpen(false)}>
            <button className={`nl ${page==="system"?"on":""}`} onClick={()=>go("system")}>The Growth System ▾</button>
            {subOpen&&(
              <div style={{position:"absolute",top:"100%",left:0,background:"var(--txt)",border:"1px solid rgba(255,255,255,.12)",borderTop:"2px solid var(--acc)",borderRadius:"0 0 4px 4px",minWidth:230,padding:"8px 0",boxShadow:"0 14px 36px rgba(0,0,0,.3)",zIndex:101}}>
                <button onClick={()=>go("system")} style={{display:"block",width:"100%",textAlign:"left",padding:"9px 18px",background:"none",border:"none",color:"rgba(255,255,255,.55)",fontSize:12,fontFamily:"var(--fb)",fontWeight:500,cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.08)",marginBottom:4}}>Overview — The Customer Journey</button>
                {MODULES.map(([p,l,c])=>(
                  <button key={p} onClick={()=>go(p)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",padding:"9px 18px",background:"none",border:"none",color:"rgba(255,255,255,.7)",fontSize:13,fontFamily:"var(--fb)",cursor:"pointer",transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{width:9,height:9,borderRadius:2,background:c,flexShrink:0}}/>{l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className={`nl ${page==="start"?"on":""}`} onClick={()=>go("start")}>How to Start</button>
          <button className={`nl ${page==="tool"?"on":""}`} onClick={()=>go("tool")}>Quote Tool</button>
          <button className={`nl ${page==="pricing"?"on":""}`} onClick={()=>go("pricing")}>Pricing</button>
          <button className="bp" style={{padding:"8px 18px",marginLeft:12,fontSize:12}} onClick={()=>go("contact")}>Book a Demo</button>
        </div>
        <button className="nav-hamburger" onClick={()=>setOpen(o=>!o)} aria-label="Menu">
          <span style={{transform:open?"rotate(45deg) translate(5px,5px)":"none"}}/>
          <span style={{opacity:open?0:1}}/>
          <span style={{transform:open?"rotate(-45deg) translate(5px,-5px)":"none"}}/>
        </button>
      </div>
      <div className={`mob-nav ${open?"open":""}`}>
        <button className={`nl ${page==="home"?"on":""}`} onClick={()=>go("home")}>Home</button>
        <button className={`nl ${page==="system"?"on":""}`} onClick={()=>go("system")}>The Growth System</button>
        <div style={{paddingLeft:14,borderLeft:"2px solid rgba(255,255,255,.1)",marginLeft:12,marginBottom:4}}>
          {MODULES.map(([p,l,c])=>(
            <button key={p} onClick={()=>go(p)} className="nl" style={{display:"flex",alignItems:"center",gap:9,fontSize:13}}>
              <span style={{width:8,height:8,borderRadius:2,background:c,flexShrink:0}}/>{l}
            </button>
          ))}
        </div>
        <button className={`nl ${page==="start"?"on":""}`} onClick={()=>go("start")}>How to Start</button>
        <button className={`nl ${page==="tool"?"on":""}`} onClick={()=>go("tool")}>Quote Tool</button>
        <button className={`nl ${page==="pricing"?"on":""}`} onClick={()=>go("pricing")}>Pricing</button>
        <button className="bp" style={{fontSize:13,padding:"11px 0",width:"100%",marginTop:8}} onClick={()=>go("contact")}>Book a Demo</button>
      </div>
    </nav>
  );
}

function Footer({nav}){
  const igColors=["#E8420A","#0D6E56","#0F2744","#7A2090","#D4860A","#C53509","#2A9E7E","#3A72A8","#A840C0"];
  const colHd={fontFamily:"var(--fh)",fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--acc)",marginBottom:16,fontWeight:700};
  return(
    <footer>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"56px 24px 0"}}>
        <div style={{marginBottom:40,paddingBottom:32,borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div>
            <Logo size={26} dark icon tagline/>
            <p style={{fontSize:13,marginTop:6,maxWidth:340,lineHeight:1.65,color:"rgba(255,255,255,.45)"}}>The complete growth system for Australian painting businesses. Customers arrive quoted, qualified and ready to book.</p>
          </div>
          <button className="bp" style={{alignSelf:"flex-start",fontSize:12,padding:"11px 22px"}} onClick={()=>nav("contact")}>Book a demo</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:32,marginBottom:40}}>
          <div>
            <div style={colHd}>Products</div>
            {[["PaintIQ Quote Tool","tool"],["PaintIQ Website","growth"],["PaintIQ Voice","voice"],["PaintIQ Social + Leads","leads"],["The Full System","system"]].map(([l,p])=>(
              <button key={l} className="flink" onClick={()=>nav(p)}>{l}</button>
            ))}
          </div>
          <div>
            <div style={colHd}>Company</div>
            {[["Pricing","pricing"],["Book a Demo","contact"],["Contact Us","contact"]].map(([l,p])=>(
              <button key={l} className="flink" onClick={()=>nav(p)}>{l}</button>
            ))}
          </div>
          <div>
            <div style={colHd}>Contact</div>
            <p style={{fontSize:13,lineHeight:1.8,color:"rgba(255,255,255,.5)",marginBottom:14}}>46 Coreen Avenue<br/>Terrey Hills NSW 2084<br/>Australia</p>
            <p style={{fontSize:13,marginBottom:8,display:"flex",gap:8,alignItems:"baseline"}}>
              <span style={{color:"rgba(255,255,255,.35)",fontFamily:"var(--fh)",fontSize:10,letterSpacing:".08em"}}>T</span>
              <a href="tel:+61413455408" style={{color:"var(--acc)",textDecoration:"none"}}>+61 413 455 408</a>
            </p>
            <p style={{fontSize:13,display:"flex",gap:8,alignItems:"baseline"}}>
              <span style={{color:"rgba(255,255,255,.35)",fontFamily:"var(--fh)",fontSize:10,letterSpacing:".08em"}}>E</span>
              <a href="mailto:paul.jones@alexim.com.au" style={{color:"var(--acc)",textDecoration:"none"}}>paul.jones@alexim.com.au</a>
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
            <strong style={{color:"rgba(255,255,255,.4)"}}>Important:</strong> All painting estimates generated by PaintIQ are indicative only and do not constitute a formal quote. Estimates are based on approximate measurements and standard industry rates. Actual costs will vary depending on site conditions, specific requirements, material choices and individual painter pricing. Always obtain a formal written quote from a licensed painting contractor before proceeding with any work. PaintIQ is a technology and marketing platform and does not provide painting services directly. Revenue and growth figures shown are indicative scenarios based on industry research and are not a guarantee of results.
          </p>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.05)",padding:"16px 0 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <p style={{fontSize:11,color:"rgba(255,255,255,.25)"}}>© 2026 PaintIQ. All rights reserved. ABN: 14 778 795 286</p>
          <div style={{display:"flex",gap:20}}>
            {["Privacy Policy","Terms of Use","Copyright"].map(l=>(
              <button key={l} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",fontSize:11,cursor:"pointer",padding:0}}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

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

// ─── QUOTE: Entry (upload-first) ─────────────────────────────────────────────
function EntryScreen({onChoice,onFileDropped}){
  const inputRef=useRef();
  const handleDrop=f=>{if(f){onFileDropped(f);onChoice("upload");}};
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div className="tag">Instant estimate</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,5vw,44px)",fontWeight:700,marginBottom:8}}>Upload your plans. Get an instant estimate.</h1>
        <p style={{color:"var(--mut)",fontSize:15,maxWidth:480,margin:"0 auto"}}>Takes under 3 minutes. No phone call needed.</p>
      </div>
      <div className="tip" style={{maxWidth:640,margin:"0 auto 16px"}}>
        💡 <strong>Council plans tip:</strong> Registered property owners can request original building plans from their local council — free of charge. Plans give the most accurate estimate of any method.
      </div>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div
          style={{border:"2.5px dashed var(--acc)",borderRadius:6,padding:"44px 32px",textAlign:"center",cursor:"pointer",background:"rgba(232,66,10,.02)",transition:"all .2s"}}
          onClick={()=>inputRef.current?.click()}
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.background="rgba(232,66,10,.06)";}}
          onDragLeave={e=>{e.currentTarget.style.background="rgba(232,66,10,.02)";}}
          onDrop={e=>{e.preventDefault();e.currentTarget.style.background="rgba(232,66,10,.02)";handleDrop(e.dataTransfer.files[0]);}}
        >
          <div style={{width:64,height:64,background:"var(--acc)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px"}}>📐</div>
          <p style={{fontFamily:"var(--fh)",fontSize:20,fontWeight:700,marginBottom:6}}>Drop your plans here</p>
          <p style={{color:"var(--mut)",fontSize:14,marginBottom:18}}>or click to choose a file</p>
          <button className="bp" style={{fontSize:13,padding:"10px 28px"}} onClick={e=>{e.stopPropagation();inputRef.current?.click();}}>Choose file</button>
          <p style={{color:"var(--mut)",fontSize:12,marginTop:12}}>PDF, PNG, JPG or JPEG · Max 10 MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleDrop(e.target.files[0]);}}/>
        </div>
        <div style={{textAlign:"center",margin:"18px 0 8px"}}>
          <span style={{color:"var(--mut)",fontSize:13,fontWeight:500}}>No plans? No problem — two more ways:</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {key:"photos",icon:"📷",title:"Upload photos",body:"Snap each room or the exterior on your phone"},
            {key:"rooms",icon:"✏️",title:"Room by room",body:"Tap which rooms need painting — we do the maths"},
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

// ─── QUOTE: Plan Upload (AI with graceful fallback) ──────────────────────────
function PlanUploadPath({onPrefill,autoFile}){
  const [status,setStatus]=useState("idle");
  const [preview,setPreview]=useState(null);
  const inputRef=useRef();
  const startedRef=useRef(false);

  const fallback=(f)=>{onPrefill({...FORM_DEFAULT,projectName:f?f.name.replace(/\.[^.]+$/,""):"",_note:"plans"});};

  const handleFile=async(f)=>{
    if(!f)return;
    setStatus("processing");
    if(f.type.startsWith("image/")){const r=new FileReader();r.onload=e=>setPreview(e.target.result);r.readAsDataURL(f);}
    try{
      const b64=await new Promise((res,rej)=>{const rdr=new FileReader();rdr.onload=e=>res(e.target.result.split(",")[1]);rdr.onerror=()=>rej(new Error("read failed"));rdr.readAsDataURL(f);});
      const isPdf=f.type==="application/pdf";
      const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),25000);
      const resp=await fetch("/api/analyse",{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"plans",files:[{kind:isPdf?"pdf":"image",media_type:f.type,data:b64}]})});
      clearTimeout(t);
      if(!resp.ok)throw new Error("api");
      const data=await resp.json();
      if(!data.ok)throw new Error("api");
      const p=data.result||{};
      onPrefill({...FORM_DEFAULT,units:String(p.units||1),sizePerUnit:String(p.floorAreaPerUnit||150),storeys:p.storeys||"1",propertyType:p.propertyType||"house",_note:"plans-ai"});
    }catch(e){fallback(f);}
  };

  useEffect(()=>{if(autoFile&&!startedRef.current){startedRef.current=true;handleFile(autoFile);}},[autoFile]);

  if(status==="processing")return(
    <div style={{textAlign:"center",padding:48}}>
      {preview&&<img src={preview} alt="Plan" style={{width:120,height:120,objectFit:"cover",borderRadius:4,marginBottom:14}}/>}
      <h3 style={{fontFamily:"var(--fh)",fontSize:22,marginBottom:8}}>Reading your plans…</h3>
      <p style={{color:"var(--mut)"}}>One moment — preparing your estimate.</p>
      <div style={{width:48,height:3,background:"var(--acc)",borderRadius:2,margin:"20px auto 0",animation:"pulse 1.2s ease-in-out infinite"}}/>
    </div>
  );

  return(
    <div>
      <div className="tip">💡 <strong>Council plans tip:</strong> Property owners can request original building plans from their local council at no cost.</div>
      <div style={{border:"2.5px dashed var(--acc)",borderRadius:6,padding:44,textAlign:"center",cursor:"pointer",background:"rgba(232,66,10,.02)"}}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();}}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
        <div style={{fontSize:40,marginBottom:10}}>📐</div>
        <p style={{fontWeight:600,fontSize:16,marginBottom:6}}>Drop plans here or click to upload</p>
        <p style={{color:"var(--mut)",fontSize:13}}>PDF, PNG, JPG or JPEG · Max 10 MB</p>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>
    </div>
  );
}

// ─── QUOTE: Photo Upload (AI with graceful fallback) ─────────────────────────
function PhotoUploadPath({onPrefill}){
  const [status,setStatus]=useState("idle");
  const [photos,setPhotos]=useState([]);
  const inputRef=useRef();

  const handleFiles=async(files)=>{
    const arr=Array.from(files).slice(0,6);
    if(!arr.length)return;
    setPhotos(arr.map(f=>URL.createObjectURL(f)));
    setStatus("processing");
    try{
      const b64s=await Promise.all(arr.map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res({data:e.target.result.split(",")[1],type:f.type});r.onerror=()=>rej();r.readAsDataURL(f);})));
      const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),25000);
      const resp=await fetch("/api/analyse",{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"photos",files:b64s.map(b=>({kind:"image",media_type:b.type,data:b.data}))})});
      clearTimeout(t);
      if(!resp.ok)throw new Error("api");
      const data=await resp.json();
      if(!data.ok)throw new Error("api");
      const p=data.result||{};
      onPrefill({...FORM_DEFAULT,units:String(p.units||1),sizePerUnit:String(p.floorAreaPerUnit||150),storeys:p.storeys||"1",propertyType:p.propertyType||"house",scope:p.scope||"both",_note:"photos-ai"});
    }catch(e){onPrefill({...FORM_DEFAULT,_note:"photos"});}
  };

  if(status==="processing")return(
    <div style={{textAlign:"center",padding:48}}>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
        {photos.slice(0,4).map((p,i)=><img key={i} src={p} alt="" style={{width:72,height:72,objectFit:"cover",borderRadius:3}}/>)}
      </div>
      <h3 style={{fontFamily:"var(--fh)",fontSize:22,marginBottom:8}}>Reading your photos…</h3>
      <p style={{color:"var(--mut)"}}>One moment — preparing your estimate.</p>
      <div style={{width:48,height:3,background:"var(--acc)",borderRadius:2,margin:"20px auto 0",animation:"pulse 1.2s ease-in-out infinite"}}/>
    </div>
  );

  return(
    <div>
      <div className="tip">📸 <strong>Photo tips:</strong> Snap each room, the exterior walls, and any areas needing painting. Up to 6 photos.</div>
      <div style={{border:"2.5px dashed var(--bdr)",borderRadius:6,padding:44,textAlign:"center",cursor:"pointer",background:"#fff"}}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();}}
        onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}>
        <div style={{fontSize:40,marginBottom:10}}>📷</div>
        <p style={{fontWeight:600,fontSize:16,marginBottom:6}}>Drop photos here or click to upload</p>
        <p style={{color:"var(--mut)",fontSize:13}}>Up to 6 photos · PNG, JPG or JPEG</p>
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
      </div>
    </div>
  );
}

// ─── QUOTE: Room Selector ────────────────────────────────────────────────────
function RoomSelectorPath({onDone}){
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
  const inc=id=>setCounts(p=>({...p,[id]:(p[id]||0)+1}));
  const dec=id=>setCounts(p=>({...p,[id]:Math.max(0,(p[id]||0)-1)}));
  const total=Object.entries(counts).reduce((s,[id,n])=>{const r=ROOMS.find(x=>x.id===id);return s+(r?r.size*n:0);},0);
  return(
    <div>
      <div className="tip">✏️ Tap how many of each room needs painting — we calculate the area automatically.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:18}}>
        {ROOMS.map(r=>(
          <div key={r.id} style={{background:"#fff",border:"1px solid var(--bdr)",borderRadius:3,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><span style={{fontSize:18,marginRight:6}}>{r.icon}</span><span style={{fontSize:13,fontWeight:500}}>{r.label}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>dec(r.id)} style={{width:26,height:26,border:"1px solid var(--bdr)",borderRadius:2,background:"#fff",fontSize:15,cursor:"pointer"}}>−</button>
              <span style={{fontSize:14,fontWeight:600,minWidth:16,textAlign:"center"}}>{counts[r.id]||0}</span>
              <button onClick={()=>inc(r.id)} style={{width:26,height:26,border:"1px solid var(--acc)",borderRadius:2,background:"var(--acc)",color:"#fff",fontSize:15,cursor:"pointer"}}>+</button>
            </div>
          </div>
        ))}
      </div>
      {total>0&&<div className="ok">Estimated area: <strong>{total} m²</strong> across {Object.values(counts).reduce((a,b)=>a+b,0)} rooms</div>}
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
      <button className="bp" style={{width:"100%",marginTop:12,padding:"14px 0",fontSize:15}} disabled={total<1} onClick={()=>onDone({...FORM_DEFAULT,sizePerUnit:String(total),units:"1",scope,condition,storeys})}>Get my estimate →</button>
    </div>
  );
}

// ─── QUOTE: Confirm details (questionnaire) ──────────────────────────────────
function Questionnaire({onDone,prefilled}){
  const [f,setF]=useState(prefilled?{...FORM_DEFAULT,...prefilled}:{...FORM_DEFAULT});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const note=prefilled?._note;
  return(
    <div>
      {note==="plans"&&<div className="ok">✅ <strong>Plans received.</strong> Confirm a few quick details below — your estimate is seconds away.</div>}
      {note==="photos"&&<div className="ok">✅ <strong>Photos received.</strong> Confirm a few quick details below — your estimate is seconds away.</div>}
      {(note==="plans-ai"||note==="photos-ai")&&<div className="ok">✅ <strong>Details extracted automatically.</strong> Review below and adjust anything that looks off.</div>}
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
          {[["interior","Interior"],["exterior","Exterior"],["both","Both"]].map(([v,l])=>(
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
          <label className="fl">Access</label>
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
        <h2 style={{fontFamily:"var(--fh)",fontSize:28,fontWeight:700,marginBottom:8}}>Your estimate is ready</h2>
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
        <div style={{fontFamily:"var(--fh)",fontSize:"clamp(32px,7vw,56px)",fontWeight:700,letterSpacing:"-.02em"}}>{$$(est.low)} – {$$(est.high)}</div>
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
          <span style={{fontFamily:"var(--fh)",fontSize:28,fontWeight:700,color:"var(--acc)"}}>{$$(est.total)}</span>
        </div>
      </div>
      <div className="ok">✅ <strong>Lead captured.</strong> {lead.name} has been connected with the painter. They will be in touch to confirm scope and book your site visit.</div>
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
  const handlePrefill=pf=>{setPrefilled(pf);setStep("confirm");};
  const handleLead=l=>{setLead(l);setStep("result");};
  return(
    <div className="qt">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        {step!=="entry"?<button className="bl" onClick={reset}>← Start over</button>:<div/>}
        <button className="bs" style={{padding:"7px 16px",fontSize:11}} onClick={onRates}>⚙ My Rates</button>
      </div>
      {step==="entry"&&<EntryScreen onChoice={s=>setStep(s)} onFileDropped={f=>setPendingFile(f)}/>}
      {step==="upload"&&<PlanUploadPath onPrefill={handlePrefill} autoFile={pendingFile}/>}
      {step==="photos"&&<PhotoUploadPath onPrefill={handlePrefill}/>}
      {step==="rooms"&&<RoomSelectorPath onDone={handleQDone}/>}
      {step==="confirm"&&<Questionnaire onDone={handleQDone} prefilled={prefilled}/>}
      {step==="lead"&&<LeadCapture onSubmit={handleLead}/>}
      {step==="result"&&est&&<ResultsCard est={est} lead={lead} form={estForm} onReset={reset}/>}
    </div>
  );
}

// ─── HOME PAGE — messaging flow for painters ──────────────────────────────────
function HomePage({nav}){
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
              <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(40px,6vw,76px)",fontWeight:700,lineHeight:.96,color:"#fff",marginBottom:18,letterSpacing:"-.02em"}}>
                Less chasing.<br/>More painting.<br/><span style={{color:"var(--acc)"}}>Equals more money.</span>
              </h1>
              <p style={{fontSize:18,color:"rgba(255,255,255,.7)",lineHeight:1.6,marginBottom:24,maxWidth:460}}>
                PaintIQ delivers smoking-hot leads, ready to book — so you spend less time chasing customers and more time painting. Book a demo and see how.
              </p>
              <div style={{display:"inline-flex",flexWrap:"wrap",gap:"8px 20px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:3,padding:"11px 16px",marginBottom:24,fontSize:13,color:"rgba(255,255,255,.75)"}}>
                {["Live in days","No effort from you","No cost up front","From $99/month"].map(t=>(
                  <span key={t} style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"var(--acc)",fontWeight:700}}>✓</span>{t}
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <button className="bp" style={{fontSize:14,padding:"14px 32px"}} onClick={()=>nav("contact")}>Book a demo</button>
                <button className="bw" onClick={()=>nav("tool")}>Try the quote tool →</button>
              </div>
            </div>
            <div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[
                  ["#FF8A6A","#E8420A","#C53509","#8B2206"],
                  ["#6DD4B8","#2A9E7E","#0D6E56","#084A3A"],
                  ["#7AA8D4","#3A72A8","#0F2744","#081828"],
                  ["#F4C86A","#E09020","#D4860A","#8B5A04"],
                  ["#CC80E0","#A840C0","#7A2090","#4A1260"],
                ].map((row,i)=>(
                  <div key={i} style={{display:"flex",gap:4,height:30}}>
                    {row.map((c,j)=><div key={j} style={{flex:1,background:c,borderRadius:2}}/>)}
                  </div>
                ))}
              </div>
              <div style={{marginTop:14,padding:"13px 16px",background:"rgba(255,255,255,.06)",borderRadius:3,border:"1px solid rgba(255,255,255,.1)"}}>
                <p style={{fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.55}}><strong style={{color:"#fff"}}>The research is clear:</strong> 62% of homeowners won't leave a voicemail — they call the next painter. The first painter to respond professionally wins the job 15–35% more often, and can charge a premium for it.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHAT GROWTH ACTUALLY TAKES */}
      <div style={{background:"#fff"}}>
        <div className="sec" style={{paddingBottom:56}}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <div className="tag">Here's the thing</div>
            <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,44px)",fontWeight:700,marginBottom:12}}>To grow, you need the right customers</h2>
            <p style={{color:"var(--mut)",maxWidth:580,margin:"0 auto",fontSize:16,lineHeight:1.65}}>Not just any enquiry. You want serious property owners who are ready to go, value a quality paint job — and ideally within 20 minutes of home.</p>
          </div>
          <div className="g3" style={{gap:18,maxWidth:900,margin:"0 auto"}}>
            {[
              {icon:"🎯",t:"Ready to go",b:"Serious about their paint job — not tyre-kickers wasting your time"},
              {icon:"🏡",t:"Value quality",b:"They understand what a great paint job does for their property"},
              {icon:"📍",t:"Close to home",b:"Within easy reach, so travel doesn't eat your day"},
            ].map(c=>(
              <div key={c.t} style={{background:"var(--surf2)",borderRadius:5,padding:"22px 20px",textAlign:"center"}}>
                <div style={{fontSize:30,marginBottom:10}}>{c.icon}</div>
                <h3 style={{fontFamily:"var(--fh)",fontSize:17,fontWeight:700,marginBottom:6}}>{c.t}</h3>
                <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.6}}>{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THE WASTED TIME */}
      <div style={{background:"var(--surf2)"}}>
        <div className="sec">
          <div className="mob-col" style={{gap:44}}>
            <div>
              <div className="tag">The old way</div>
              <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(24px,3.5vw,40px)",fontWeight:700,lineHeight:1.05,marginBottom:16}}>Normally, that's a LOT of work — and most of it is wasted</h2>
              <p style={{color:"var(--mut)",fontSize:16,lineHeight:1.7,marginBottom:18}}>Finding those customers and winning them normally means doing all of this yourself — usually at night, after a full day on the tools:</p>
              {[
                "Chasing leads and answering every call",
                "Driving across town to quote jobs that go nowhere",
                "Writing up quotes by hand, late at night",
                "Following up people who never reply",
                "Posting on social media when you remember",
                "Missing calls while you're up a ladder",
              ].map(l=>(
                <div key={l} style={{display:"flex",gap:10,marginBottom:11,fontSize:15,color:"var(--mut)"}}>
                  <span style={{color:"#E84040",fontWeight:700,flexShrink:0}}>✗</span>{l}
                </div>
              ))}
            </div>
            <div>
              <div style={{background:"var(--txt)",borderRadius:6,padding:"32px 28px",color:"#fff"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:48,fontWeight:700,color:"var(--acc)",lineHeight:1,marginBottom:8}}>Hours</div>
                <div style={{fontFamily:"var(--fh)",fontSize:22,fontWeight:700,marginBottom:14}}>every single week</div>
                <p style={{fontSize:15,color:"rgba(255,255,255,.7)",lineHeight:1.7}}>Time spent on customer admin is time you're not painting, not with family, and not making money. Worse — half those enquiries were never going to book anyway. It's the most frustrating part of running a paint business.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THE SOLUTION */}
      <div style={{background:"#fff"}}>
        <div className="sec">
          <div style={{textAlign:"center",marginBottom:44}}>
            <div className="tag">The PaintIQ way</div>
            <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,44px)",fontWeight:700,marginBottom:12}}>Hot customers arrive ready to book</h2>
            <p style={{color:"var(--mut)",maxWidth:580,margin:"0 auto",fontSize:16,lineHeight:1.65}}>PaintIQ flips it around. Instead of you chasing customers, the right ones come to you — already quoted and ready to meet.</p>
          </div>
          <div className="g3" style={{gap:20,marginBottom:36}}>
            {[
              {n:"01",c:"var(--purple)",t:"They arrive at your website",b:"The right property owners find you — through search, social and smart campaigns."},
              {n:"02",c:"var(--acc)",t:"They quote themselves",b:"Your AI quote tool answers their biggest question instantly, while they're hot and interested."},
              {n:"03",c:"var(--navy)",t:"They book a meeting with you",b:"PaintIQ books them in. You meet, talk through the job, agree the spec and win the work."},
            ].map(s=>(
              <div key={s.n} style={{position:"relative",background:"var(--surf2)",borderRadius:5,padding:"28px 24px",overflow:"hidden"}}>
                <div className="step-num">{s.n}</div>
                <div style={{position:"relative"}}>
                  <div style={{width:40,height:5,background:s.c,borderRadius:2,marginBottom:14}}/>
                  <h3 style={{fontFamily:"var(--fh)",fontSize:20,fontWeight:700,marginBottom:8}}>{s.t}</h3>
                  <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.7}}>{s.b}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"var(--acc)",borderRadius:6,padding:"28px 32px",textAlign:"center"}}>
            <p style={{fontFamily:"var(--fh)",fontSize:"clamp(18px,2.5vw,26px)",fontWeight:700,color:"#fff",lineHeight:1.3,maxWidth:720,margin:"0 auto"}}>
              You work LESS on chasing customers — and spend MORE time on the painting. The part you actually love.
            </p>
          </div>
        </div>
      </div>

      {/* PROOF BAND */}
      <div style={{background:"var(--txt)"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"44px 24px"}}>
          <div className="g4">
            {[
              ["62%","of homeowners won't leave a voicemail — they call the next painter"],
              ["15–35%","more jobs won by the painter who responds first with a quote"],
              ["$8K–$15K","average residential painting job in Australia"],
              ["20 min","the ideal radius for the jobs worth winning"],
            ].map(([n,l])=>(
              <div key={n} style={{textAlign:"center",padding:"8px 16px"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,3vw,40px)",fontWeight:700,color:"var(--acc)",lineHeight:1}}>{n}</div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginTop:6,lineHeight:1.5}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW / EARLY ADOPTER */}
      <div style={{background:"var(--surf2)"}}>
        <div className="sec" style={{textAlign:"center"}}>
          <div className="tag">Be early</div>
          <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(26px,4vw,44px)",fontWeight:700,marginBottom:14,maxWidth:760,marginLeft:"auto",marginRight:"auto"}}>PaintIQ is new. It's AI. It's built for Aussie paint businesses.</h2>
          <p style={{color:"var(--mut)",maxWidth:560,margin:"0 auto 32px",fontSize:16,lineHeight:1.7}}>The painters who embrace it will grow — doing less of the customer-chasing stuff, and more of the work they love. Beat your competitors to it.</p>
          <div className="g3" style={{gap:18,maxWidth:920,margin:"0 auto 36px"}}>
            {[
              {icon:"🧮",c:"var(--acc)",t:"Try the Quote Tool",b:"See exactly what your customers will experience.",btn:"Try it now →",page:"tool"},
              {icon:"🧩",c:"var(--teal)",t:"See the Growth System",b:"How the whole system delivers hot leads ready to book.",btn:"How it works →",page:"system"},
              {icon:"📈",c:"var(--navy)",t:"Check Your ROI",b:"Put in your numbers, see what PaintIQ could add.",btn:"Run the numbers →",page:"pricing"},
            ].map(p=>(
              <div key={p.t} className="path-card" onClick={()=>nav(p.page)}>
                <div style={{width:48,height:48,background:p.c,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16}}>{p.icon}</div>
                <h3 style={{fontFamily:"var(--fh)",fontSize:20,fontWeight:700,marginBottom:8}}>{p.t}</h3>
                <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65,marginBottom:14}}>{p.b}</p>
                <span style={{color:p.c,fontFamily:"var(--fh)",fontSize:13,fontWeight:700,letterSpacing:".04em",textTransform:"uppercase"}}>{p.btn}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="bp" style={{fontSize:15,padding:"15px 36px"}} onClick={()=>nav("contact")}>Sign up today</button>
            <button className="bs" onClick={()=>nav("contact")}>Book a demo — we'll show you how</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GROWTH SYSTEM PAGE — the customer journey funnel ─────────────────────────
function SystemPage({nav}){
  const JOURNEY=[
    {step:"BE FOUND",by:"by property owners & managers",product:"PaintIQ Leads",price:"$297/mo",c:"#D4860A",page:"leads",d:"Smart campaigns put you in front of the right property owners — the serious ones, close to home."},
    {step:"SHOW YOUR EXPERTISE",by:"build trust before they call",product:"PaintIQ Social",price:"$199/mo",c:"#7A2090",page:"leads",d:"Done-for-you social content shows off your work and proves you're the real deal."},
    {step:"OUTLINE YOUR SERVICES",by:"give them somewhere to land",product:"PaintIQ Website",price:"$149/mo",c:"#0D6E56",page:"growth",d:"A professional site that shows what you do and turns visitors into enquiries."},
    {step:"ANSWER THEIR BIG QUESTION",by:"while they're hot & on your site",product:"PaintIQ Quote Tool",price:"$99/mo",c:"#E8420A",page:"tool",d:"\"How much will it cost?\" — answered instantly. Every lead captured before the reveal."},
    {step:"CAPTURE EVERY PROSPECT",by:"never miss one again",product:"PaintIQ Voice",price:"$149/mo",c:"#0F2744",page:"voice",d:"AI answers every call 24/7, qualifies the job, and makes sure no hot prospect slips away."},
  ];
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px 56px",textAlign:"center"}}>
        <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>The Growth System · The Customer Journey</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(30px,5vw,56px)",fontWeight:700,color:"#fff",marginBottom:12}}>How PaintIQ delivers you<br/><span style={{color:"var(--acc)"}}>smoking hot leads, ready to book.</span></h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:16,maxWidth:560,margin:"0 auto",lineHeight:1.65}}>Each PaintIQ product handles one stage of your customer's journey — from never having heard of you, to sitting in front of you ready to start.</p>
      </div>

      <div className="sec" style={{paddingTop:56}}>
        <div style={{display:"flex",flexDirection:"column",gap:0,maxWidth:780,margin:"0 auto"}}>
          {JOURNEY.map((j,i)=>(
            <div key={j.step}>
              <div className="tile" style={{background:j.c,cursor:"pointer"}} onClick={()=>nav(j.page)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:220}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fh)",fontSize:13,fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <div style={{fontFamily:"var(--fh)",fontSize:18,fontWeight:700,letterSpacing:".02em"}}>{j.step}</div>
                    </div>
                    <div style={{fontSize:12,opacity:.7,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10,marginLeft:38}}>{j.by}</div>
                    <p style={{fontSize:14,opacity:.9,lineHeight:1.6,marginLeft:38,maxWidth:380}}>{j.d}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"var(--fh)",fontSize:16,fontWeight:700}}>{j.product}</div>
                    <div style={{fontSize:13,opacity:.85,marginTop:2}}>{j.price}</div>
                    <div style={{fontSize:11,opacity:.7,marginTop:6}}>Learn more →</div>
                  </div>
                </div>
              </div>
              <div style={{textAlign:"center",color:"var(--acc)",fontSize:22,padding:"8px 0",fontWeight:700}}>↓</div>
            </div>
          ))}
          {/* ANCHOR — MEETS */}
          <div style={{background:"var(--txt)",borderRadius:6,padding:"30px 28px",color:"#fff",border:"2px solid var(--acc)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:220}}>
                <div style={{display:"inline-block",background:"var(--acc)",color:"#fff",fontFamily:"var(--fh)",fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",padding:"4px 10px",borderRadius:2,marginBottom:12}}>The outcome</div>
                <h2 style={{fontFamily:"var(--fh)",fontSize:24,fontWeight:700,marginBottom:8}}>🔥 PaintIQ Meets</h2>
                <p style={{fontSize:15,color:"rgba(255,255,255,.75)",lineHeight:1.65,maxWidth:440}}>The whole system is anchored by the booking service. PaintIQ Meets books your now-red-hot prospect into an in-person or online meeting. All you do is talk through the quote, connect in person, and book the job.</p>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"var(--fh)",fontSize:22,fontWeight:700,color:"var(--acc)"}}>Included</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>free with any product</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:44}}>
          <h3 style={{fontFamily:"var(--fh)",fontSize:"clamp(20px,3vw,30px)",fontWeight:700,marginBottom:10}}>That's a prospect who's on fire — and all you did was turn up.</h3>
          <p style={{color:"var(--mut)",fontSize:15,maxWidth:520,margin:"0 auto 24px",lineHeight:1.65}}>Want to know how to roll this out for your business? You don't need all of it at once.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="bp" style={{fontSize:14,padding:"14px 32px"}} onClick={()=>nav("start")}>How to get started →</button>
            <button className="bs" onClick={()=>nav("contact")}>Book a demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOW TO START PAGE — onboarding / deployment order ────────────────────────
function StartPage({nav}){
  const ORDER=[
    {n:"01",product:"PaintIQ Website",price:"$149/mo",c:"#0D6E56",page:"growth",when:"If you don't have a good website yet",d:"Start here. We build you a professional site in 3 days — with the Quote Tool built right in. Already have a site you like? Skip to step 2."},
    {n:"02",product:"PaintIQ Quote Tool",price:"$99/mo",c:"#E8420A",page:"tool",when:"The engine of the whole system",d:"Goes on your website (ours or yours). Customers quote themselves instantly — and you capture every lead. This is where most painters start."},
    {n:"03",product:"PaintIQ Meets",price:"Included",c:"#1A3A5C",page:"contact",when:"Free with any product",d:"The booking service. Turns a hot quote into a booked meeting in your calendar, automatically. Comes free — switch it on and go."},
    {n:"04",product:"PaintIQ Voice",price:"$149/mo",c:"#0F2744",page:"voice",when:"When you can't afford to miss a call",d:"AI answers every call 24/7 so no hot prospect ever slips away while you're on the tools."},
    {n:"05",product:"PaintIQ Social",price:"$199/mo",c:"#7A2090",page:"leads",when:"When you want to stay visible",d:"Done-for-you content keeps you in front of property owners between jobs and builds your reputation."},
    {n:"06",product:"PaintIQ Leads",price:"$297/mo",c:"#D4860A",page:"leads",when:"When you're ready to turn on the tap",d:"Paid campaigns actively drive the right property owners to your site. The accelerator — add it when you want to grow fast."},
  ];
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px 56px",textAlign:"center"}}>
        <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>How to Start · Onboarding</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(30px,5vw,56px)",fontWeight:700,color:"#fff",marginBottom:12}}>Deploy it your way —<br/><span style={{color:"var(--acc)"}}>one piece at a time, or all at once.</span></h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:16,maxWidth:600,margin:"0 auto",lineHeight:1.65}}>It all depends on how much you want to grow, how fast you want to stop wasting time on bad enquiries, and how quickly you want to start booking more jobs at higher fees. Here's the order most paint businesses adopt PaintIQ.</p>
      </div>

      <div className="sec" style={{paddingTop:56}}>
        <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:820,margin:"0 auto"}}>
          {ORDER.map(o=>(
            <div key={o.n} style={{background:"#fff",border:"1px solid var(--bdr)",borderRadius:5,padding:"22px 24px",display:"flex",gap:20,alignItems:"flex-start",flexWrap:"wrap",transition:"transform .2s,box-shadow .2s",cursor:"pointer"}} className="feat-card" onClick={()=>nav(o.page)}>
              <div style={{width:52,height:52,background:o.c,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fh)",fontSize:20,fontWeight:700,color:"#fff",flexShrink:0}}>{o.n}</div>
              <div style={{flex:1,minWidth:240}}>
                <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap",marginBottom:4}}>
                  <h3 style={{fontFamily:"var(--fh)",fontSize:20,fontWeight:700}}>{o.product}</h3>
                  <span style={{fontFamily:"var(--fh)",fontSize:15,fontWeight:700,color:o.c}}>{o.price}</span>
                </div>
                <div style={{fontSize:12,color:o.c,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>{o.when}</div>
                <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{o.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:44,background:"var(--surf2)",borderRadius:6,padding:"32px 28px",border:"1px solid var(--bdr)",textAlign:"center"}}>
          <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(22px,3vw,34px)",fontWeight:700,marginBottom:12}}>Start with one. Or take the lot.</h2>
          <p style={{color:"var(--mut)",fontSize:15,maxWidth:600,margin:"0 auto 8px",lineHeight:1.7}}>Most painters start with the Quote Tool on a website — then add Voice, Social and Leads as they feel the difference. The more you switch on, the more of your customer journey runs itself.</p>
          <p style={{color:"var(--mut)",fontSize:15,maxWidth:600,margin:"0 auto 24px",lineHeight:1.7}}>Want everything working together from day one? Take the full system for <strong style={{color:"var(--txt)"}}>$699/month</strong> and save over $190.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="bp" style={{fontSize:14,padding:"14px 32px"}} onClick={()=>nav("pricing")}>See pricing & ROI →</button>
            <button className="bs" onClick={()=>nav("contact")}>Book a demo</button>
          </div>
        </div>
      </div>
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
  const REVENUE_OPTIONS=[5000,10000,15000,20000,30000,40000,50000,75000,100000];
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
    <div style={{background:"var(--txt)",borderRadius:6,padding:"36px 28px"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(22px,3.5vw,36px)",fontWeight:700,color:"#fff",marginBottom:8}}>Run your numbers</h2>
        <p style={{color:"rgba(255,255,255,.55)",fontSize:14,maxWidth:440,margin:"0 auto"}}>Pick your current revenue, toggle products, watch the return.</p>
      </div>
      <div className="mob-col-s">
        <div>
          <label style={{display:"block",fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:10}}>Your current monthly revenue</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:22}}>
            {REVENUE_OPTIONS.map(v=>(
              <button key={v} onClick={()=>setRevenue(v)} style={{padding:"8px 13px",borderRadius:3,border:`1.5px solid ${revenue===v?"var(--acc)":"rgba(255,255,255,.12)"}`,background:revenue===v?"rgba(232,66,10,.12)":"transparent",color:revenue===v?"var(--acc)":"rgba(255,255,255,.55)",fontFamily:"var(--fh)",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>{fmtK(v)}</button>
            ))}
          </div>
          <label style={{display:"block",fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:10}}>Add PaintIQ products</label>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {PRODS.map(p=>(
              <div key={p.id} onClick={()=>toggle(p.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:3,border:`1.5px solid ${sel[p.id]?p.color:"rgba(255,255,255,.1)"}`,background:sel[p.id]?"rgba(255,255,255,.04)":"transparent",cursor:"pointer",transition:"all .18s"}}>
                <div style={{width:20,height:20,borderRadius:2,border:`2px solid ${sel[p.id]?p.color:"rgba(255,255,255,.2)"}`,background:sel[p.id]?p.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {sel[p.id]&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:sel[p.id]?"#fff":"rgba(255,255,255,.6)",fontFamily:"var(--fh)"}}>{p.name}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>{p.desc}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:sel[p.id]?p.color:"rgba(255,255,255,.4)",fontFamily:"var(--fh)"}}>${p.price}/mo</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{p.badge}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:6,padding:24,marginBottom:14}}>
            <div className="mob-col-s" style={{gap:14,marginBottom:22}}>
              <div style={{background:"rgba(255,255,255,.04)",borderRadius:4,padding:"14px 18px"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:6}}>Without PaintIQ</div>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(20px,3vw,30px)",fontWeight:700,color:"rgba(255,255,255,.45)",lineHeight:1}}>{fmt2(revenue)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginTop:4}}>per month</div>
              </div>
              <div style={{background:"rgba(232,66,10,.08)",border:"1px solid rgba(232,66,10,.2)",borderRadius:4,padding:"14px 18px"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:6}}>With PaintIQ</div>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(20px,3vw,30px)",fontWeight:700,color:"#fff",lineHeight:1}}>{fmt2(newRev)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:4}}>per month</div>
              </div>
            </div>
            <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:18,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(16px,2.5vw,24px)",fontWeight:700,color:"var(--acc)",lineHeight:1}}>+{fmt2(extraRev)}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:4}}>extra / month</div>
              </div>
              <div style={{textAlign:"center",borderLeft:"1px solid rgba(255,255,255,.07)",borderRight:"1px solid rgba(255,255,255,.07)"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(16px,2.5vw,24px)",fontWeight:700,color:"#fff",lineHeight:1}}>{totalCost>0?"$"+totalCost:"—"}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:4}}>investment</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:"clamp(16px,2.5vw,24px)",fontWeight:700,color:totalCost>0?"#4ADE80":"rgba(255,255,255,.25)",lineHeight:1}}>{totalCost>0?roi+"×":"—"}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:4}}>ROI</div>
              </div>
            </div>
          </div>
          {totalCost>0&&(
            <div style={{background:"rgba(232,66,10,.08)",border:"1px solid rgba(232,66,10,.15)",borderRadius:4,padding:"11px 14px",marginBottom:12,fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.5}}>
              Every <strong style={{color:"#fff"}}>${totalCost}/month</strong> invested returns an estimated <strong style={{color:"var(--acc)"}}>{fmt2(extraRev)}</strong> in additional monthly revenue.
            </div>
          )}
          <p style={{fontSize:11,color:"rgba(255,255,255,.25)",lineHeight:1.6,marginBottom:14}}>Indicative scenario based on industry-average uplifts for Australian painting businesses. Not a guarantee of results.</p>
          <button className="bp" style={{width:"100%",padding:"13px 0",fontSize:14}} onClick={()=>nav("contact")}>Get this growth system →</button>
        </div>
      </div>
    </div>
  );
}

// ─── PRICING PAGE ─────────────────────────────────────────────────────────────
const PKGS=[
  {color:"#E8420A",n:"01",name:"PaintIQ Quote Tool",tag:"Quote in minutes. Capture every lead.",mo:"$99/mo",
   items:["AI estimator on your website","Plan upload, photos, or room-by-room","Lead captured before estimate reveal","Instant email notification to you","HubSpot CRM sync","Your own rates built in"]},
  {color:"#0D6E56",n:"02",name:"PaintIQ Website",tag:"A site that converts. Live in 3 days.",mo:"$149/mo",feat:true,
   items:["Quote Tool included","5-page conversion website","Project gallery & testimonials","Mobile-first, SEO-ready","Monthly support & updates","No cost up front"]},
  {color:"#0F2744",n:"03",name:"PaintIQ Voice",tag:"Every call answered, 24/7.",mo:"$149/mo",
   items:["AI answers as your business","Qualifies every caller","Books callbacks & site visits","SMS follow-up to caller","Lead logged in HubSpot","Monthly call report"]},
  {color:"#7A2090",n:"04",name:"PaintIQ Social",tag:"Stay visible between jobs.",mo:"$199/mo",
   items:["16 posts/month FB + Instagram","Before/after content done for you","Google Business posts","Review generation prompts","Monthly engagement report","Reels & short video"]},
  {color:"#D4860A",n:"05",name:"PaintIQ Leads",tag:"Turn on the tap.",mo:"$297/mo",
   items:["Google Ads management","Local SEO foundation","Campaign landing pages","Email follow-up sequences","Retargeting campaigns","Monthly strategy call"]},
  {color:"#1A3A5C",n:"+",name:"PaintIQ Meets",tag:"The booking engine. Free with any product.",mo:"Included",
   items:["Online & in-person meeting booking","Books hot prospects into your calendar","Automatic reminders to reduce no-shows","Syncs with your existing calendar","Comes free with any PaintIQ product","The anchor that closes the loop"]},
];

function PricingPage({nav}){
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>Pricing</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(30px,5vw,56px)",fontWeight:700,color:"#fff",marginBottom:12}}>Pick what you need.<br/><span style={{color:"var(--acc)"}}>Add more as you grow.</span></h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:16,maxWidth:520,margin:"0 auto"}}>No cost up front. Monthly fee only. Cancel anytime. From $99/month.</p>
      </div>
      <div className="sec">
        <div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:36}}>
          {PKGS.map(p=>(
            <div key={p.n} className="pkg-card" style={{border:`2px solid ${p.feat?"var(--acc)":"var(--bdr)"}`}}>
              <div style={{width:8,background:p.color,flexShrink:0}}/>
              <div style={{flex:1,padding:26,display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div style={{flex:2,minWidth:220}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:p.color,marginBottom:6,fontWeight:700}}>Product {p.n}</div>
                  <h2 style={{fontFamily:"var(--fh)",fontSize:22,fontWeight:700,marginBottom:4}}>{p.name}</h2>
                  <p style={{color:"var(--mut)",fontSize:14,marginBottom:14}}>{p.tag}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px 18px"}}>
                    {p.items.map(i=>(
                      <div key={i} style={{display:"flex",gap:6,fontSize:13,alignItems:"flex-start"}}>
                        <span style={{color:"var(--teal)",fontWeight:700,flexShrink:0}}>✓</span>{i}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end",minWidth:130}}>
                  {p.feat&&<div style={{background:"var(--acc)",color:"#fff",fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",padding:"4px 10px",borderRadius:2,fontFamily:"var(--fh)"}}>Most popular</div>}
                  <div style={{textAlign:"right"}}>
                    <div style={{color:"var(--mut)",fontSize:11,textTransform:"uppercase",letterSpacing:".06em"}}>Per month</div>
                    <div style={{fontFamily:"var(--fh)",fontSize:30,fontWeight:700}}>{p.mo}</div>
                  </div>
                  <button className="bp" style={{background:p.color,padding:"11px 22px",fontSize:12}} onClick={()=>nav("contact")}>Get started</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"var(--surf2)",borderRadius:4,padding:22,textAlign:"center",border:"1px solid var(--bdr)",marginBottom:48}}>
          <p style={{fontSize:15}}>Want everything? <strong>All 5 products for $699/month</strong> — save over $190/month. <button className="bl" style={{color:"var(--acc)",fontSize:15}} onClick={()=>nav("contact")}>Talk to us →</button></p>
        </div>
        <RevenueEstimator nav={nav}/>
      </div>
    </div>
  );
}

// ─── QUOTE TOOL PAGE ──────────────────────────────────────────────────────────
function QuoteToolPage({rates,onRates}){
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"56px 24px 48px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>PaintIQ Quote Tool · $99/mo</div>
          <div className="mob-col">
            <div>
              <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(30px,5vw,52px)",fontWeight:700,color:"#fff",lineHeight:.98,marginBottom:18}}>
                The painter who quotes first <span style={{color:"var(--acc)"}}>wins the job.</span>
              </h1>
              <p style={{color:"rgba(255,255,255,.65)",fontSize:15,lineHeight:1.7,marginBottom:20,maxWidth:440}}>
                This is the exact tool your customers will use on your website. Try it yourself — upload plans, snap photos or tap through rooms, and watch the estimate appear.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {[
                  ["Homeowner requests a quote on your site","Plans, photos or room-by-room — under 3 minutes"],
                  ["Estimate generated instantly","Built on your rates, not generic numbers"],
                  ["Lead captured before the reveal","Name, email, phone, address — every time"],
                  ["You're notified immediately","Straight to your inbox and HubSpot. You call first."],
                ].map(([t,d],i)=>(
                  <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{i+1}</span>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{t}</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {[
                ["62%","of homeowners won't leave a voicemail — they call the next painter"],
                ["15–35%","more jobs won by responding first with a professional quote"],
                ["100%","of leads captured before the estimate is revealed"],
                ["$99/mo","on your existing website — nothing up front"],
              ].map(([stat,text])=>(
                <div key={stat} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:4,padding:"14px 18px",display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:24,fontWeight:700,color:"var(--acc)",lineHeight:1,flexShrink:0,minWidth:78}}>{stat}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.55)",lineHeight:1.5}}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <QuoteTool rates={rates} onRates={onRates}/>
    </div>
  );
}

// ─── CONTENT PAGE TEMPLATE ────────────────────────────────────────────────────
function ContentPage({color,tagLabel,title,heroSteps,heroStats,whyLeft,whyRight,gridHeading,gridItems,ctaHead,ctaSub,ctaBtn,onCta}){
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"56px 24px 48px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>{tagLabel}</div>
          <div className="mob-col">
            <div>
              <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(28px,5vw,50px)",fontWeight:700,color:"#fff",lineHeight:.98,marginBottom:18}}>{title}</h1>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {heroSteps.map(([t,d],i)=>(
                  <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{i+1}</span>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{t}</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {heroStats.map(([stat,text])=>(
                <div key={stat} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:4,padding:"14px 18px",display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{fontFamily:"var(--fh)",fontSize:24,fontWeight:700,color,lineHeight:1,flexShrink:0,minWidth:78}}>{stat}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.55)",lineHeight:1.5}}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{background:"var(--surf2)",borderBottom:"1px solid var(--bdr)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"26px 24px",display:"flex",gap:32,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:280}}>
            <div style={{fontFamily:"var(--fh)",fontSize:12,fontWeight:700,color,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>{whyLeft[0]}</div>
            <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.65}}>{whyLeft[1]}</p>
          </div>
          <div style={{flex:1,minWidth:280}}>
            <div style={{fontFamily:"var(--fh)",fontSize:12,fontWeight:700,color:"var(--teal)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>{whyRight[0]}</div>
            <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.65}}>{whyRight[1]}</p>
          </div>
        </div>
      </div>
      <div className="sec">
        <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(20px,3vw,34px)",fontWeight:700,marginBottom:24}}>{gridHeading}</h2>
        <div className="g3" style={{marginBottom:48}}>
          {gridItems.map((item,j)=>(
            <div key={j} className="feat-card" style={{borderTop:`3px solid ${["var(--acc)","var(--teal)","var(--navy)","var(--amber)","var(--acc)","var(--teal)"][j%6]}`}}>
              <h3 style={{fontFamily:"var(--fh)",fontSize:16,fontWeight:700,marginBottom:6}}>{item.title}</h3>
              <p style={{color:"var(--mut)",fontSize:14,lineHeight:1.65}}>{item.body}</p>
            </div>
          ))}
        </div>
        <div style={{background:color,borderRadius:4,padding:36,textAlign:"center"}}>
          <h3 style={{fontFamily:"var(--fh)",fontSize:26,fontWeight:700,color:"#fff",marginBottom:8}}>{ctaHead}</h3>
          <p style={{color:"rgba(255,255,255,.75)",marginBottom:20,fontSize:15}}>{ctaSub}</p>
          <button style={{background:"#fff",color,border:"none",padding:"12px 28px",borderRadius:3,fontFamily:"var(--fh)",fontSize:13,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer"}} onClick={onCta}>{ctaBtn}</button>
        </div>
      </div>
    </div>
  );
}

function WebsiteGrowthPage({nav}){
  return <ContentPage color="var(--teal)" tagLabel="PaintIQ Website · $149/mo"
    title={<span>A website that turns visitors into <span style={{color:"var(--teal)"}}>booked jobs.</span></span>}
    heroSteps={[
      ["Homeowner searches for a painter in your area","They find your professional PaintIQ site — fast, mobile-ready, built to convert"],
      ["They quote themselves with the built-in tool","An estimate in under 3 minutes, right on your site. No phone call needed"],
      ["Their details are captured before the reveal","Every visitor who requests a quote becomes a lead you can follow up"],
      ["You're notified and you call first","Before your competitors even know they exist"],
    ]}
    heroStats={[
      ["72%","of tradies still rely on word of mouth alone — invisible online"],
      ["3×","more leads from sites with an embedded quote tool"],
      ["3 days","from sign-up to your new website going live"],
      ["$0","up front — monthly fee only, cancel anytime"],
    ]}
    whyLeft={["Why most painter websites fail","Built once, never touched again. No quote tool, no lead capture, no reason for a visitor to act. They look like a business card when they should be working like a salesperson — 24 hours a day."]}
    whyRight={["What makes a PaintIQ website different","One goal: turning visitors into quote requests. The Quote Tool is embedded, SEO is built in from day one, and the design is mobile-first. It works while you're on the tools."]}
    gridHeading="What your PaintIQ website includes"
    gridItems={[
      {title:"Conversion-focused design",body:"Built to turn visitors into quote requests. Clear calls to action on every page."},
      {title:"PaintIQ Quote Tool built in",body:"Visitors get an instant estimate without leaving your site. Every lead captured."},
      {title:"Project gallery",body:"Showcase your best work. Quality before/after photos close jobs before the first call."},
      {title:"Testimonials & trust signals",body:"Reviews, credentials and proof — everything buyers need to choose you."},
      {title:"SEO-ready structure",body:"Local SEO, fast load times, proper structure. Built in from day one."},
      {title:"Mobile-first design",body:"Most homeowners search on phones. Your site works perfectly on every device."},
    ]}
    ctaHead="Ready for a website that works for you?" ctaSub="We build it. You approve it. Live in 3 days. No cost up front." ctaBtn="Book a demo"
    onCta={()=>nav("contact")}/>;
}

function LeadGenPage({nav}){
  return <ContentPage color="var(--amber)" tagLabel="PaintIQ Social $199/mo · PaintIQ Leads $297/mo"
    title={<span>Stop waiting for referrals. <span style={{color:"var(--amber)"}}>Generate your own leads.</span></span>}
    heroSteps={[
      ["Homeowners see your work between jobs","Done-for-you social content keeps you front of mind on Facebook and Instagram"],
      ["Google Ads catch buyers searching right now","Targeted campaigns put your quote tool in front of people ready to book"],
      ["They land on your site and quote themselves","Your Quote Tool captures every lead before the numbers are revealed"],
      ["Every lead lands in HubSpot for follow-up","No spreadsheets, no lost enquiries — tracked from first click to booked job"],
    ]}
    heroStats={[
      ["5×","average return on ad spend for local trade services in Australia"],
      ["$8K–$15K","average painting job — one lead pays for months of campaigns"],
      ["60 days","most painting businesses see measurable results inside two months"],
      ["16 posts","per month, done entirely for you"],
    ]}
    whyLeft={["Why a great website isn't enough","Even the best website needs traffic. Most painters are invisible online — no Google presence, no social, no campaigns. Their competitors show up every time a homeowner searches. They don't."]}
    whyRight={["Social + Leads together","PaintIQ Social builds visibility between jobs. PaintIQ Leads drives targeted traffic through Google Ads, retargeting and email. Together: a steady, predictable flow of new enquiries every month."]}
    gridHeading="What's included"
    gridItems={[
      {title:"Google Ads management",body:"Target homeowners searching for painters near you. Pay only when someone clicks."},
      {title:"Social content done for you",body:"16 posts a month across Facebook and Instagram. Before/afters, project stories."},
      {title:"Email sequences",body:"Automated follow-up to past clients, unconverted leads and seasonal campaigns."},
      {title:"Retargeting",body:"Reach people who visited but didn't quote. Bring them back."},
      {title:"HubSpot CRM",body:"Every lead tracked. Every conversation logged. No lost follow-ups."},
      {title:"Monthly review",body:"We review results and sharpen campaigns every month."},
    ]}
    ctaHead="Ready for a predictable flow of leads?" ctaSub="Most painting businesses see results within 60 days. No cost up front." ctaBtn="Book a strategy call"
    onCta={()=>nav("contact")}/>;
}

function AIVoicePage({nav}){
  return <ContentPage color="var(--navy)" tagLabel="PaintIQ Voice · $149/mo"
    title={<span>Answer every call. <span style={{color:"#7AA8D4"}}>Win every job you earned.</span></span>}
    heroSteps={[
      ["Your phone rings while you're up a ladder","Without PaintIQ Voice, that caller hangs up and dials the next painter"],
      ["PaintIQ Voice answers instantly — as your business","Natural-sounding AI greets the caller professionally with your business name"],
      ["It qualifies the job and captures every detail","Job type, location, timeline, contact details — everything you need"],
      ["You get the full lead the moment the call ends","Summary in your inbox and HubSpot. You call back first, as the boss"],
    ]}
    heroStats={[
      ["62%","of homeowners won't leave a voicemail — they call the next painter"],
      ["3–5","missed calls per week for the average painting business"],
      ["$8K–$15K","the job value walking out the door with every missed call"],
      ["24/7","answered — weekends, after hours, every single time"],
    ]}
    whyLeft={["The true cost of a missed call","A homeowner calls three painters. The first to answer professionally gets the job — no matter who paints better. If your phone goes to voicemail, that job is gone."]}
    whyRight={["PaintIQ Voice changes the equation","Every call answered. Every lead qualified. Every detail captured and sent straight to you. A professional receptionist for your painting business, 24 hours a day."]}
    gridHeading="How PaintIQ Voice works"
    gridItems={[
      {title:"Call received",body:"A homeowner calls your number while you're on site or unavailable."},
      {title:"AI answers instantly",body:"Natural-sounding AI greets the caller as your business."},
      {title:"Lead qualified",body:"Job type, location, timeline, property type — all captured."},
      {title:"Booking offered",body:"A callback or site inspection booked into your calendar."},
      {title:"You're notified",body:"Summary text and email with caller details — straight away."},
      {title:"CRM logged",body:"Lead created automatically in HubSpot. No data entry ever."},
    ]}
    ctaHead="Stop losing jobs to a missed call" ctaSub="One extra job pays for years of PaintIQ Voice." ctaBtn="Get PaintIQ Voice"
    onCta={()=>nav("contact")}/>;
}

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────
function ContactPage(){
  const [f,setF]=useState({name:"",business:"",email:"",phone:"",location:"",website:"",challenge:"",pkg:"unsure"});
  const [sent,setSent]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  if(sent)return(
    <div style={{textAlign:"center",padding:"100px 24px"}}>
      <div style={{width:64,height:64,background:"var(--teal)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",color:"#fff"}}>✓</div>
      <h1 style={{fontFamily:"var(--fh)",fontSize:40,fontWeight:700,marginBottom:12}}>We'll be in touch!</h1>
      <p style={{color:"var(--mut)",fontSize:17,maxWidth:440,margin:"0 auto",lineHeight:1.6}}>Thanks for reaching out. We'll review your details and be back within one business day to book your demo.</p>
    </div>
  );
  return(
    <div>
      <div style={{background:"var(--txt)",padding:"64px 24px",textAlign:"center"}}>
        <div className="tag" style={{background:"rgba(255,255,255,.06)",color:"#fff",borderColor:"rgba(255,255,255,.15)"}}>Get started</div>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(28px,5vw,50px)",fontWeight:700,color:"#fff",marginBottom:10}}>Book a PaintIQ demo</h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:16,maxWidth:460,margin:"12px auto 0",lineHeight:1.6}}>20 minutes. No pressure. We'll show you the system and put together a plan for your business.</p>
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
            <option value="quote">PaintIQ Quote Tool — $99/mo</option>
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
          <textarea className="fi" rows={3} style={{resize:"vertical"}} placeholder="e.g. I spend too long writing quotes and miss calls when I'm on site..." value={f.challenge} onChange={e=>set("challenge",e.target.value)}/>
        </div>
        <button className="bp" style={{width:"100%",fontSize:15,padding:"14px 0"}} onClick={()=>setSent(true)}>Book my demo →</button>
        <p style={{color:"var(--mut)",fontSize:12,textAlign:"center",marginTop:12}}>No spam. No cold calls. You'll only hear from us about your demo.</p>
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
      {page==="home"    &&<HomePage     nav={nav}/>}
      {page==="system"  &&<SystemPage   nav={nav}/>}
      {page==="start"   &&<StartPage    nav={nav}/>}
      {page==="tool"    &&<QuoteToolPage rates={rates} onRates={()=>setShowRates(true)}/>}
      {page==="pricing" &&<PricingPage  nav={nav}/>}
      {page==="growth"  &&<WebsiteGrowthPage nav={nav}/>}
      {page==="leads"   &&<LeadGenPage  nav={nav}/>}
      {page==="voice"   &&<AIVoicePage  nav={nav}/>}
      {page==="contact" &&<ContactPage/>}
      <Footer nav={nav}/>
    </div>
  );
}
