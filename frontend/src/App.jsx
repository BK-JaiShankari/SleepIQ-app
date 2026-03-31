import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

const _f = document.createElement("link");
_f.rel = "stylesheet";
_f.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
document.head.appendChild(_f);

const API = "http://localhost:8000";
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Saturday","Sunday"];
const EXERCISES_LIST = ["None","Running","Strength Training","Yoga"];

const INIT = {
  Age:28,Weight:70,Height:170,Body_Fat_Percentage:20,Muscle_Mass:40,
  Medication:0,Smoker:0,Alcohol_Consumption:0,Stress_Level:5,Mood:7,
  Exercise_Intensity:5,Exercise_Duration:45,Steps:8000,Calories_Burned:400,
  Distance_Covered:5,Calories_Intake:2000,Water_Intake:2.5,Heart_Rate:72,
  Blood_Oxygen_Level:98,Skin_Temperature:36.5,Screen_Time:3,
  Notifications_Received:20,Gender_Male:1,Gender_Other:0,
  Medical_Conditions_Hypertension:0,Medical_Conditions_None:1,
  Day_of_Week_Monday:0,Day_of_Week_Saturday:0,Day_of_Week_Sunday:0,
  Day_of_Week_Thursday:0,Day_of_Week_Tuesday:0,Day_of_Week_Wednesday:0,
  Exercise_Type_Running:1,Exercise_Type_Strength_Training:0,Exercise_Type_Yoga:0,
};

function predictSleep(f) {
  let s=0;
  if(f.Stress_Level<=3)s+=30;else if(f.Stress_Level<=6)s+=15;
  if(f.Screen_Time<=2)s+=20;else if(f.Screen_Time<=5)s+=10;
  if(f.Steps>=10000)s+=20;else if(f.Steps>=5000)s+=10;
  if(f.Water_Intake>=2.5)s+=15;else if(f.Water_Intake>=1.5)s+=8;
  if(f.Mood>=7)s+=10;else if(f.Mood>=4)s+=5;
  if(f.Exercise_Duration>=30)s+=5;
  const prediction=s>=65?"Good":s>=35?"Fair":"Poor";
  const good=Math.min(Math.round(s*0.9+5),95);
  const poor=Math.max(Math.round((100-s)*0.6),5);
  const fair=Math.max(100-good-poor,2);
  return{prediction,confidence:Math.min(Math.round(50+s*0.45),95),
    score:Math.min(s,100),probabilities:{Good:good,Fair:fair,Poor:poor}};
}

function generateInsights(f){
  const out=[];
  if(f.Stress_Level>=7)out.push({icon:"😓",title:"High stress detected",text:"Stress is your biggest sleep disruptor. Try 4-7-8 breathing before bed."});
  else if(f.Stress_Level<=3)out.push({icon:"😌",title:"Stress well managed",text:"Low stress is excellent. Your nervous system should be calm at bedtime."});
  if(f.Screen_Time>=6)out.push({icon:"📱",title:"Heavy screen use",text:"Blue light suppresses melatonin. Try a 30-min screen-free window before sleep."});
  else if(f.Screen_Time<=2)out.push({icon:"✅",title:"Low screen time",text:"Minimal screen time is a strong positive for your circadian rhythm."});
  if(f.Steps<4000)out.push({icon:"🚶",title:"Low activity today",text:"Limited movement may delay sleep onset. Even a short walk helps."});
  else if(f.Steps>=10000)out.push({icon:"💪",title:"Great activity level",text:"Excellent steps — physical movement is one of the best sleep aids."});
  if(f.Water_Intake<1.5)out.push({icon:"💧",title:"Low hydration",text:"Dehydration causes nighttime restlessness. Drink water before bed."});
  if(f.Exercise_Duration>=30)out.push({icon:"🏃",title:"Exercise completed",text:"Exercise promotes deeper sleep stages and faster sleep onset."});
  return out.slice(0,4);
}

const scoreColor=s=>s>=65?"#22c55e":s>=35?"#f59e0b":"#ef4444";
const clr={
  Good:{bg:"#dcfce7",text:"#166534",border:"#bbf7d0",solid:"#22c55e"},
  Fair:{bg:"#fef9c3",text:"#854d0e",border:"#fde68a",solid:"#f59e0b"},
  Poor:{bg:"#fee2e2",text:"#991b1b",border:"#fecaca",solid:"#ef4444"},
};

const inpStyle={width:"100%",padding:"9px 12px",borderRadius:8,fontSize:14,fontWeight:500,
  border:"1.5px solid #e5e7eb",background:"#fff",color:"#374151",outline:"none",transition:"border-color .15s"};
const focusBorder=e=>e.target.style.borderColor="#6366f1";
const blurBorder=e=>e.target.style.borderColor="#e5e7eb";

/* ─────────────────── SHARED UI ─────────────────── */
function Card({children,style={}}){
  return<div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid #e5e7eb",
    boxShadow:"0 1px 4px rgba(0,0,0,0.05)",...style}}>{children}</div>;
}
function SectionHeader({icon,bg,title,sub}){
  return<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
    <div style={{width:32,height:32,borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{icon}</div>
    <div><div style={{fontSize:15,fontWeight:600,color:"#111827"}}>{title}</div><div style={{fontSize:12,color:"#9ca3af"}}>{sub}</div></div>
  </div>;
}
function ProfileField({label,children}){
  return<div><label style={{display:"block",fontSize:12,fontWeight:500,color:"#6b7280",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>{children}</div>;
}
function UnitToggle({value,options,onChange}){
  return<div style={{display:"flex",background:"#f3f4f6",borderRadius:6,padding:2,gap:1,flexShrink:0}}>
    {options.map(o=><button key={o} onClick={()=>onChange(o)}
      style={{padding:"6px 10px",borderRadius:5,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",
        background:value===o?"#fff":"transparent",color:value===o?"#4f46e5":"#6b7280",
        boxShadow:value===o?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all .15s"}}>{o}</button>)}
  </div>;
}
function Select({value,onChange,options}){
  return<select value={value} onChange={e=>onChange(e.target.value)}
    style={{...inpStyle,appearance:"none",cursor:"pointer",
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
      backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:32}}>
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>;
}
function Badge({prediction}){
  const c=clr[prediction]||clr.Fair;
  return<span style={{padding:"4px 12px",borderRadius:20,fontSize:13,fontWeight:600,background:c.bg,color:c.text,border:`1px solid ${c.border}`}}>{prediction} Sleep</span>;
}
function Slider({value,min,max,step=1,onChange,inverse=false}){
  const pct=((value-min)/(max-min))*100;
  const id=useRef("sl"+Math.random().toString(36).slice(2)).current;
  const col=inverse?(pct>66?"#ef4444":pct>33?"#f59e0b":"#22c55e"):(pct>66?"#22c55e":pct>33?"#6366f1":"#ef4444");
  return<div style={{position:"relative",height:22,display:"flex",alignItems:"center"}}>
    <style>{`#${id}{-webkit-appearance:none;width:100%;height:5px;background:transparent;outline:none;cursor:pointer;position:absolute;z-index:2;margin:0;padding:0;}#${id}::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2.5px solid ${col};box-shadow:0 1px 4px rgba(0,0,0,0.15),0 0 0 3px ${col}20;cursor:pointer;transition:transform .1s;}#${id}::-webkit-slider-thumb:hover{transform:scale(1.2);}#${id}::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:2.5px solid ${col};cursor:pointer;}`}</style>
    <div style={{position:"absolute",inset:0,height:5,top:"50%",transform:"translateY(-50%)",borderRadius:3,background:"#e5e7eb"}}>
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:col,borderRadius:3,transition:"width .05s"}}/>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(parseFloat(e.target.value))}
      style={{position:"absolute",inset:0,width:"100%",background:"transparent",height:"100%"}}/>
  </div>;
}
function InputRow({label,value,min,max,step=1,unit,icon,onChange,inverse=false}){
  const pct=((value-min)/(max-min))*100;
  const col=inverse?(pct>66?"#ef4444":pct>33?"#f59e0b":"#22c55e"):(pct>66?"#22c55e":pct>33?"#6366f1":"#ef4444");
  return<div style={{paddingBottom:16,marginBottom:16,borderBottom:"1px solid #f3f4f6"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:14,fontWeight:500,color:"#374151"}}>{label}</span>
      </div>
      <div><span style={{fontSize:18,fontWeight:700,color:col}}>{value}</span>
        <span style={{fontSize:12,color:"#9ca3af",marginLeft:2}}>{unit}</span></div>
    </div>
    <Slider value={value} min={min} max={max} step={step} onChange={onChange} inverse={inverse}/>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
      <span style={{fontSize:11,color:"#d1d5db"}}>{min}{unit}</span>
      <span style={{fontSize:11,color:"#d1d5db"}}>{max}{unit}</span>
    </div>
  </div>;
}
function StatCard({label,value,unit,icon,color="#6366f1",trend}){
  return<div style={{background:"#fff",borderRadius:12,padding:"18px 20px",border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:500,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
      <span style={{fontSize:20}}>{icon}</span>
    </div>
    <div style={{fontSize:28,fontWeight:700,color,letterSpacing:"-0.03em",lineHeight:1}}>
      {value}<span style={{fontSize:14,fontWeight:400,color:"#9ca3af",marginLeft:3}}>{unit}</span>
    </div>
    {trend&&<div style={{fontSize:12,color:"#9ca3af",marginTop:6}}>{trend}</div>}
  </div>;
}

/* ─── DASH CARD ─── */
function DashIcon({type,color}){
  const m={
    activity:<path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>,
    heart:<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={color} strokeWidth="2" fill="none"/>,
    stress:<><path d="M12 2a10 10 0 1 0 10 10" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/><path d="M12 8v4l3 3" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/></>,
    water:<path d="M12 2C6 10 4 14 4 17a8 8 0 0 0 16 0c0-3-2-7-8-15z" stroke={color} strokeWidth="2" fill="none"/>,
    moon:<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} strokeWidth="2" fill="none"/>,
    zap:<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    laptop:<><rect x="2" y="4" width="20" height="13" rx="2" stroke={color} strokeWidth="2" fill="none"/><path d="M0 21h24" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
  };
  return<svg width="22" height="22" viewBox="0 0 24 24">{m[type]}</svg>;
}
function DashCard({label,value,unit,target,progress,progressColor,iconBg,iconColor,iconSvg}){
  return<div style={{background:"#fff",borderRadius:16,padding:"22px 22px 18px",border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",display:"flex",flexDirection:"column"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div style={{fontSize:15,fontWeight:500,color:"#374151"}}>{label}</div>
      <div style={{width:44,height:44,borderRadius:"50%",background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <DashIcon type={iconSvg} color={iconColor}/>
      </div>
    </div>
    <div style={{marginBottom:4}}>
      <span style={{fontSize:32,fontWeight:800,color:"#111827",letterSpacing:"-0.04em",lineHeight:1}}>{value}</span>
      <span style={{fontSize:14,fontWeight:500,color:"#6b7280",marginLeft:4}}>{unit}</span>
    </div>
    <div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>{target}</div>
    <div>
      <div style={{height:6,background:"#f3f4f6",borderRadius:4,marginBottom:8}}>
        <div style={{height:"100%",width:`${progress}%`,background:progressColor,borderRadius:4,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:13,color:"#9ca3af",fontWeight:500}}>Progress</span>
        <span style={{fontSize:13,fontWeight:700,color:progressColor}}>{progress}%</span>
      </div>
    </div>
  </div>;
}

/* ══════════════════════════════════════════════
   PASSWORD INPUT — show/hide + strength
══════════════════════════════════════════════ */
function PasswordInput({value,onChange,placeholder,onKeyDown,showStrength=false,label="Password"}){
  const [show,setShow]=useState(false);
  const strength=value.length===0?0:value.length<6?1:value.length<10?2:3;
  const sColors=["#e5e7eb","#ef4444","#f59e0b","#22c55e"];
  const sLabels=["","Weak — too short","Fair — could be stronger","Strong ✓"];
  return<div>
    <label style={{display:"block",fontSize:13,fontWeight:500,color:"#374151",marginBottom:6}}>{label}</label>
    <div style={{position:"relative"}}>
      <input type={show?"text":"password"} value={value} onChange={onChange}
        placeholder={placeholder} onKeyDown={onKeyDown}
        style={{...inpStyle,fontSize:15,paddingRight:44}}
        onFocus={focusBorder} onBlur={blurBorder}/>
      <button onClick={()=>setShow(s=>!s)} type="button"
        style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
          background:"none",border:"none",cursor:"pointer",fontSize:18,lineHeight:1,
          color:"#9ca3af",padding:2,display:"flex",alignItems:"center"}}>
        {show?"🙈":"👁️"}
      </button>
    </div>
    {showStrength&&value.length>0&&(
      <div style={{marginTop:7}}>
        <div style={{display:"flex",gap:3,marginBottom:4}}>
          {[1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,
            background:strength>=i?sColors[strength]:"#e5e7eb",transition:"background .25s"}}/>)}
        </div>
        <div style={{fontSize:11,fontWeight:600,color:sColors[strength]}}>{sLabels[strength]}</div>
      </div>
    )}
  </div>;
}

/* ══════════════════════════════════════════════
   AUTH SCREEN
══════════════════════════════════════════════ */
function AuthScreen({onAuth}){
  const [tab,setTab]=useState("login"); // login | register
  const [form,setForm]=useState({username:"",password:"",confirm:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [guestLoading,setGuestLoading]=useState(false);

  const f=(k,v)=>setForm(x=>({...x,[k]:v}));

  const passwordsMatch=form.password===form.confirm&&form.confirm.length>0;
  const canRegister=form.username.length>=3&&form.password.length>=6&&passwordsMatch;
  const canLogin=form.username.length>0&&form.password.length>0;

  const submit=async()=>{
    if(tab==="register"&&!passwordsMatch){setError("Passwords do not match");return;}
    setLoading(true);setError("");
    try{
      const url=tab==="login"?`${API}/login`:`${API}/register`;
      const res=await axios.post(url,{username:form.username.trim(),password:form.password});
      localStorage.setItem("sleepiq_token",res.data.token);
      localStorage.setItem("sleepiq_user",res.data.username);
      localStorage.setItem("sleepiq_role",res.data.role||"user");
      onAuth(res.data.username,res.data.token,res.data.role||"user");
    }catch(e){setError(e.response?.data?.detail||"Something went wrong");}
    finally{setLoading(false);}
  };

  const continueAsGuest=()=>{
    setGuestLoading(true);
    // Generate a random guest ID stored in localStorage for this session
    let guestId=localStorage.getItem("sleepiq_guest_id");
    if(!guestId){
      guestId="guest_"+Math.random().toString(36).slice(2,10);
      localStorage.setItem("sleepiq_guest_id",guestId);
    }
    localStorage.setItem("sleepiq_user","Guest");
    localStorage.setItem("sleepiq_role","guest");
    setTimeout(()=>{
      onAuth("Guest","",  "guest");
      setGuestLoading(false);
    },400);
  };

  return<div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f8faff 0%,#eef2ff 50%,#e8f4ff 100%)",
    fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}button,input,select{font-family:inherit;}button:focus,input:focus{outline:none;}`}</style>
    <div style={{width:"100%",maxWidth:440,animation:"fadeUp .4s ease"}}>
      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#4f46e5,#3b82f6)",
          display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:30,marginBottom:14,
          boxShadow:"0 8px 24px rgba(79,70,229,0.3)"}}>🌙</div>
        <div style={{fontSize:28,fontWeight:700,color:"#111827",letterSpacing:"-0.03em"}}>SleepIQ</div>
        <div style={{fontSize:14,color:"#6b7280",marginTop:5}}>Your personal sleep intelligence platform</div>
      </div>

      {/* Card */}
      <div style={{background:"#fff",borderRadius:20,padding:32,border:"1px solid #e5e7eb",boxShadow:"0 8px 32px rgba(0,0,0,0.08)"}}>
        {/* Tabs */}
        <div style={{display:"flex",background:"#f3f4f6",borderRadius:10,padding:4,gap:3,marginBottom:24}}>
          {["login","register"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setError("");setForm({username:"",password:"",confirm:""});}}
              style={{flex:1,padding:"9px",borderRadius:7,fontSize:14,fontWeight:600,border:"none",cursor:"pointer",
                transition:"all .18s",background:tab===t?"#fff":"transparent",
                color:tab===t?"#4f46e5":"#6b7280",
                boxShadow:tab===t?"0 1px 3px rgba(0,0,0,0.1)":"none",textTransform:"capitalize"}}>{t==="login"?"Sign In":"Register"}</button>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Username */}
          <div>
            <label style={{display:"block",fontSize:13,fontWeight:500,color:"#374151",marginBottom:6}}>Username</label>
            <input value={form.username} onChange={e=>f("username",e.target.value)}
              placeholder={tab==="login"?"Enter your username":"Choose a username (min. 3 chars)"}
              style={{...inpStyle,fontSize:15}} onFocus={focusBorder} onBlur={blurBorder}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>

          {/* Password */}
          <PasswordInput value={form.password} onChange={e=>f("password",e.target.value)}
            placeholder={tab==="login"?"Enter your password":"Min. 6 characters"}
            showStrength={tab==="register"}
            onKeyDown={e=>tab==="login"&&e.key==="Enter"&&submit()}/>

          {/* Confirm password — register only */}
          {tab==="register"&&(
            <div>
              <PasswordInput value={form.confirm} onChange={e=>f("confirm",e.target.value)}
                label="Confirm Password" placeholder="Re-enter your password"
                onKeyDown={e=>e.key==="Enter"&&submit()}/>
              {form.confirm.length>0&&(
                <div style={{marginTop:6,fontSize:12,fontWeight:600,
                  color:passwordsMatch?"#22c55e":"#ef4444"}}>
                  {passwordsMatch?"✓ Passwords match":"✗ Passwords do not match"}
                </div>
              )}
            </div>
          )}

          {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",
            border:"1px solid #fecaca",fontSize:13,color:"#dc2626"}}>{error}</div>}

          {/* Submit */}
          <button onClick={submit} disabled={loading||(tab==="register"?!canRegister:!canLogin)}
            style={{padding:"13px",borderRadius:10,fontSize:15,fontWeight:600,border:"none",
              cursor:(loading||(tab==="register"?!canRegister:!canLogin))?"not-allowed":"pointer",
              background:(tab==="register"?!canRegister:!canLogin)?"#e5e7eb":"linear-gradient(135deg,#4f46e5,#3b82f6)",
              color:(tab==="register"?!canRegister:!canLogin)?"#9ca3af":"#fff",
              transition:"all .2s",marginTop:4,
              boxShadow:(tab==="register"?!canRegister:!canLogin)?"none":"0 4px 14px rgba(79,70,229,0.3)",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading?(<><span style={{width:15,height:15,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",
              borderTopColor:"#fff",animation:"spin .7s linear infinite",display:"inline-block"}}/>Processing...</>)
              :(tab==="login"?"Sign In →":"Create Account →")}
          </button>
        </div>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0"}}>
          <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
          <span style={{fontSize:13,color:"#9ca3af",fontWeight:500}}>or</span>
          <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
        </div>

        {/* Guest login */}
        <button onClick={continueAsGuest} disabled={guestLoading}
          style={{width:"100%",padding:"12px",borderRadius:10,fontSize:14,fontWeight:600,
            border:"1.5px solid #e5e7eb",background:"#f9fafb",color:"#374151",
            cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {guestLoading?(<><span style={{width:13,height:13,borderRadius:"50%",border:"2px solid #d1d5db",
            borderTopColor:"#6b7280",animation:"spin .7s linear infinite",display:"inline-block"}}/>Loading...</>)
            :<><span style={{fontSize:16}}>👤</span>Continue as Guest</>}
        </button>
        <div style={{textAlign:"center",marginTop:10,fontSize:12,color:"#9ca3af"}}>
          No account needed — predictions won't be saved to your profile
        </div>

        {/* Switch tab */}
        <div style={{textAlign:"center",marginTop:20,fontSize:13,color:"#9ca3af"}}>
          {tab==="login"?"Don't have an account? ":"Already have an account? "}
          <button onClick={()=>{setTab(tab==="login"?"register":"login");setError("");setForm({username:"",password:"",confirm:""});}}
            style={{color:"#4f46e5",fontWeight:600,background:"none",border:"none",cursor:"pointer",fontSize:13}}>
            {tab==="login"?"Register":"Sign in"}
          </button>
        </div>
      </div>
    </div>
  </div>;
}

/* ══════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════ */
function AdminPanel({token,onClose}){
  const [view,setView]=useState("users"); // users | guests
  const [users,setUsers]=useState([]);
  const [guests,setGuests]=useState(null);
  const [loading,setLoading]=useState(false);
  const [resetModal,setResetModal]=useState(null); // {id, username}
  const [newPw,setNewPw]=useState("");
  const [showNewPw,setShowNewPw]=useState(false);
  const [msg,setMsg]=useState("");

  const hdrs={headers:{Authorization:`Bearer ${token}`}};

  const fetchUsers=async()=>{
    setLoading(true);
    try{const r=await axios.get(`${API}/admin/users`,hdrs);setUsers(r.data);}
    catch{}finally{setLoading(false);}
  };
  const fetchGuests=async()=>{
    setLoading(true);
    try{const r=await axios.get(`${API}/admin/guests`,hdrs);setGuests(r.data);}
    catch{}finally{setLoading(false);}
  };

  useEffect(()=>{if(view==="users")fetchUsers();else fetchGuests();},[view]);

  const deleteUser=async(id,uname)=>{
    if(!window.confirm(`Delete user "${uname}"? This cannot be undone.`))return;
    await axios.delete(`${API}/admin/users/${id}`,hdrs);
    setMsg(`User "${uname}" deleted`);fetchUsers();
  };
  const resetPassword=async()=>{
    if(newPw.length<6){setMsg("Password too short");return;}
    await axios.put(`${API}/admin/users/${resetModal.id}/reset-password`,{new_password:newPw},hdrs);
    setMsg(`Password reset for "${resetModal.username}"`);setResetModal(null);setNewPw("");
  };
  const clearGuests=async()=>{
    if(!window.confirm("Clear ALL guest logs? This cannot be undone."))return;
    const r=await axios.delete(`${API}/admin/guests`,hdrs);
    setMsg(`Cleared ${r.data.deleted} guest sessions`);fetchGuests();
  };
  const deleteGuest=async(gid)=>{
    await axios.delete(`${API}/admin/guests/${gid}`,hdrs);
    setMsg(`Guest ${gid} removed`);fetchGuests();
  };

  return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,
    display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:900,maxHeight:"88vh",
      display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>

      {/* Header */}
      <div style={{padding:"20px 28px",borderBottom:"1px solid #e5e7eb",display:"flex",
        alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🛡️</span>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"#111827"}}>Admin Panel</div>
            <div style={{fontSize:12,color:"#9ca3af"}}>Manage users and guest logs</div>
          </div>
        </div>
        <button onClick={onClose} style={{fontSize:20,background:"none",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:1}}>✕</button>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:3,padding:"12px 28px",borderBottom:"1px solid #f3f4f6",flexShrink:0}}>
        {[{id:"users",label:"👥 Users"},{id:"guests",label:"👤 Guest Logs"}].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)}
            style={{padding:"8px 18px",borderRadius:8,fontSize:13,fontWeight:600,border:"none",cursor:"pointer",
              background:view===t.id?"#eef2ff":"transparent",color:view===t.id?"#4f46e5":"#6b7280",
              transition:"all .15s"}}>{t.label}</button>
        ))}
      </div>

      {/* Message */}
      {msg&&<div style={{margin:"12px 28px 0",padding:"10px 14px",borderRadius:8,
        background:"#f0fdf4",border:"1px solid #bbf7d0",fontSize:13,color:"#166534",display:"flex",
        justifyContent:"space-between",alignItems:"center"}}>
        {msg}<button onClick={()=>setMsg("")} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af"}}>✕</button>
      </div>}

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Loading...</div>}

        {/* USERS */}
        {view==="users"&&!loading&&(
          <div>
            <div style={{fontSize:13,color:"#9ca3af",marginBottom:16}}>{users.length} registered users</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"2px solid #f3f4f6"}}>
                  {["Username","Role","Registered","Predictions","Last Active","Actions"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:12,fontWeight:600,
                      color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#fafafa"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"12px",fontSize:14,fontWeight:600,color:"#111827"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:28,height:28,borderRadius:"50%",
                          background:u.role==="admin"?"linear-gradient(135deg,#f59e0b,#ef4444)":"linear-gradient(135deg,#4f46e5,#3b82f6)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:12,color:"#fff",fontWeight:700,flexShrink:0}}>
                          {u.username[0].toUpperCase()}
                        </div>
                        {u.username}
                      </div>
                    </td>
                    <td style={{padding:"12px"}}>
                      <span style={{padding:"3px 8px",borderRadius:10,fontSize:11,fontWeight:700,
                        background:u.role==="admin"?"#fef9c3":"#eef2ff",
                        color:u.role==="admin"?"#854d0e":"#4f46e5"}}>{u.role}</span>
                    </td>
                    <td style={{padding:"12px",fontSize:13,color:"#6b7280"}}>{u.created_at?.slice(0,10)||"—"}</td>
                    <td style={{padding:"12px",fontSize:13,color:"#374151",fontWeight:600}}>{u.prediction_count||0}</td>
                    <td style={{padding:"12px",fontSize:13,color:"#6b7280"}}>{u.last_prediction?.slice(0,10)||"Never"}</td>
                    <td style={{padding:"12px"}}>
                      {u.role!=="admin"&&(
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setResetModal({id:u.id,username:u.username});setNewPw("");}}
                            style={{padding:"5px 10px",borderRadius:6,fontSize:12,fontWeight:500,border:"1px solid #e5e7eb",
                              background:"#fff",color:"#374151",cursor:"pointer"}}>Reset PW</button>
                          <button onClick={()=>deleteUser(u.id,u.username)}
                            style={{padding:"5px 10px",borderRadius:6,fontSize:12,fontWeight:500,border:"1px solid #fecaca",
                              background:"#fef2f2",color:"#dc2626",cursor:"pointer"}}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* GUESTS */}
        {view==="guests"&&!loading&&guests&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:13,color:"#9ca3af"}}>{guests.total_sessions} total guest sessions · {guests.guests.length} unique devices</div>
              <button onClick={clearGuests}
                style={{padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:600,
                  border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",cursor:"pointer"}}>
                Clear All Guest Logs
              </button>
            </div>
            {guests.guests.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af"}}>
                <div style={{fontSize:36,marginBottom:12}}>👤</div>
                <div>No guest sessions recorded yet</div>
              </div>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"2px solid #f3f4f6"}}>
                    {["Guest ID","Sessions","Avg Score","Good/Fair/Poor","First Seen","Last Seen","Actions"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:12,fontWeight:600,
                        color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guests.guests.map(g=>(
                    <tr key={g.guest_id} style={{borderBottom:"1px solid #f9fafb"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#fafafa"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"12px",fontSize:13,fontWeight:600,color:"#374151",fontFamily:"monospace"}}>{g.guest_id}</td>
                      <td style={{padding:"12px",fontSize:13,color:"#374151",fontWeight:600}}>{g.sessions}</td>
                      <td style={{padding:"12px"}}>
                        <span style={{fontSize:14,fontWeight:700,color:scoreColor(g.avg_score)}}>{g.avg_score}</span>
                      </td>
                      <td style={{padding:"12px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <span style={{fontSize:11,padding:"2px 7px",borderRadius:8,background:"#dcfce7",color:"#166534",fontWeight:600}}>{g.good_count}G</span>
                          <span style={{fontSize:11,padding:"2px 7px",borderRadius:8,background:"#fef9c3",color:"#854d0e",fontWeight:600}}>{g.fair_count}F</span>
                          <span style={{fontSize:11,padding:"2px 7px",borderRadius:8,background:"#fee2e2",color:"#991b1b",fontWeight:600}}>{g.poor_count}P</span>
                        </div>
                      </td>
                      <td style={{padding:"12px",fontSize:12,color:"#9ca3af"}}>{g.first_seen?.slice(0,10)}</td>
                      <td style={{padding:"12px",fontSize:12,color:"#9ca3af"}}>{g.last_seen?.slice(0,10)}</td>
                      <td style={{padding:"12px"}}>
                        <button onClick={()=>deleteGuest(g.guest_id)}
                          style={{padding:"5px 10px",borderRadius:6,fontSize:12,fontWeight:500,
                            border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",cursor:"pointer"}}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Reset Password Modal */}
    {resetModal&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#fff",borderRadius:16,padding:28,width:380,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:6}}>Reset Password</div>
          <div style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Set a new password for <strong>{resetModal.username}</strong>. They will be logged out.</div>
          <div style={{position:"relative",marginBottom:16}}>
            <input type={showNewPw?"text":"password"} value={newPw} onChange={e=>setNewPw(e.target.value)}
              placeholder="New password (min. 6 chars)"
              style={{...inpStyle,paddingRight:44}} onFocus={focusBorder} onBlur={blurBorder}/>
            <button onClick={()=>setShowNewPw(s=>!s)} type="button"
              style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>
              {showNewPw?"🙈":"👁️"}
            </button>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setResetModal(null);setNewPw("");}}
              style={{flex:1,padding:"10px",borderRadius:8,fontSize:14,fontWeight:500,
                border:"1px solid #e5e7eb",background:"#f9fafb",color:"#374151",cursor:"pointer"}}>Cancel</button>
            <button onClick={resetPassword} disabled={newPw.length<6}
              style={{flex:1,padding:"10px",borderRadius:8,fontSize:14,fontWeight:600,border:"none",
                background:newPw.length<6?"#e5e7eb":"linear-gradient(135deg,#4f46e5,#3b82f6)",
                color:newPw.length<6?"#9ca3af":"#fff",cursor:newPw.length<6?"not-allowed":"pointer"}}>
              Reset Password
            </button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

/* ══════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════ */
export default function App(){
  const [token,setToken]=useState(()=>localStorage.getItem("sleepiq_token")||"");
  const [username,setUsername]=useState(()=>localStorage.getItem("sleepiq_user")||"");
  const [role,setRole]=useState(()=>localStorage.getItem("sleepiq_role")||"guest");
  const [form,setForm]=useState(INIT);
  const [mode,setMode]=useState("basic");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("input");
  const [ready,setReady]=useState(false);
  const [stats,setStats]=useState(null);
  const [showAdmin,setShowAdmin]=useState(false);
  const [heightUnit,setHeightUnit]=useState("cm");
  const [weightUnit,setWeightUnit]=useState("kg");
  const [heightDisplay,setHeightDisplay]=useState({cm:170,ft:5,inch:7});
  const [weightDisplay,setWeightDisplay]=useState(70);

  const isGuest=role==="guest";
  const isAdmin=role==="admin";

  useEffect(()=>{setTimeout(()=>setReady(true),60);},[]);
  useEffect(()=>{
    if((tab==="dashboard"||tab==="analytics")&&token&&!stats&&!isGuest){
      fetchStats();
    }
  },[tab,token]);

  const fetchStats=async()=>{
    try{
      const r=await axios.get(`${API}/predictions/stats`,{headers:{Authorization:`Bearer ${token}`}});
      setStats(r.data);
    }catch{}
  };

  const onAuth=(u,t,r)=>{
    setUsername(u);setToken(t);setRole(r||"guest");
  };

  const logout=()=>{
    if(token)axios.post(`${API}/logout`,{},{headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
    ["sleepiq_token","sleepiq_user","sleepiq_role"].forEach(k=>localStorage.removeItem(k));
    setToken("");setUsername("");setRole("guest");setResult(null);setStats(null);setTab("input");
  };

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handleGender=v=>setForm(f=>({...f,Gender_Male:v==="Male"?1:0,Gender_Other:v==="Other"?1:0}));
  const handleEx=v=>{
    const r={Exercise_Type_Running:0,Exercise_Type_Strength_Training:0,Exercise_Type_Yoga:0};
    if(v==="Running")r.Exercise_Type_Running=1;
    if(v==="Strength Training")r.Exercise_Type_Strength_Training=1;
    if(v==="Yoga")r.Exercise_Type_Yoga=1;
    setForm(f=>({...f,...r}));
  };
  const handleWeightChange=(val,unit)=>{
    const raw=parseFloat(val)||0;setWeightDisplay(raw);
    set("Weight",unit==="lb"?parseFloat((raw*0.453592).toFixed(1)):raw);
  };
  const handleHeightCm=(val)=>{
    const cm=parseFloat(val)||0;
    const ti=cm/2.54;
    setHeightDisplay({cm,ft:Math.floor(ti/12),inch:Math.round(ti%12)});set("Height",cm);
  };
  const handleHeightFt=(ft,inch)=>{
    const cm=parseFloat(((parseInt(ft)||0)*12+(parseInt(inch)||0))*2.54).toFixed(1);
    setHeightDisplay({cm:parseFloat(cm),ft:parseInt(ft)||0,inch:parseInt(inch)||0});set("Height",parseFloat(cm));
  };

  const gender=form.Gender_Male?"Male":form.Gender_Other?"Other":"Female";
  const activeEx=form.Exercise_Type_Running?"Running":form.Exercise_Type_Strength_Training?"Strength Training":form.Exercise_Type_Yoga?"Yoga":"None";
  const medical=form.Medical_Conditions_Hypertension?"Hypertension":"None";
  const liveResult=predictSleep(form);
  const liveScore=liveResult.score;
  const liveColor=scoreColor(liveScore);

  const predict=async()=>{
    setLoading(true);
    try{
      if(isGuest){
        // Guest: call /guest/predict, save to backend anonymously
        await new Promise(r=>setTimeout(r,700));
        const guestId=localStorage.getItem("sleepiq_guest_id")||"guest_unknown";
        try{await axios.post(`${API}/guest/predict`,{guest_id:guestId,form});}catch{}
        setResult(predictSleep(form));
      }else if(mode==="advanced"&&token){
        const r=await axios.post(`${API}/predict`,form,{headers:{Authorization:`Bearer ${token}`}});
        const ruleResult=predictSleep(form);
        // Use rule-based score + prediction for display consistency with analytics
        // Use ML model probabilities for the technical forecast bars
        setResult({
          prediction: r.data.prediction,
          confidence: r.data.confidence,
          score: ruleResult.score,
          probabilities: r.data.probabilities,
        });
        setStats(null);
      }else{
        await new Promise(r=>setTimeout(r,700));
        if(token){
          axios.post(`${API}/predict`,form,{headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
          setStats(null);
        }
        setResult(predictSleep(form));
      }
      setTab("result");
    }catch{
      await new Promise(r=>setTimeout(r,400));
      setResult(predictSleep(form));setTab("result");
    }finally{setLoading(false);}
  };

  const reset=()=>{setResult(null);setTab("input");};

  if(!username) return<AuthScreen onAuth={onAuth}/>;

  const TABS=[
    {id:"input",label:"Input",icon:"⚙️"},
    {id:"dashboard",label:"Dashboard",icon:"📊"},
    {id:"analytics",label:"Analytics",icon:"📈"},
    {id:"result",label:"Result",icon:"✨",disabled:!result},
  ];

  return<div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f8faff 0%,#eef2ff 50%,#e8f4ff 100%)",
    fontFamily:"'Inter',sans-serif",color:"#111827",opacity:ready?1:0,transition:"opacity .3s"}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}button,select,input{font-family:inherit;}button:focus,select:focus,input:focus{outline:none;}select option{background:#fff;color:#374151;}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}input[type=number]{-moz-appearance:textfield;}`}</style>

    {showAdmin&&<AdminPanel token={token} onClose={()=>setShowAdmin(false)}/>}

    {/* HEADER */}
    <header style={{background:"#fff",borderBottom:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:50}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:68}}>
        <div onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
          <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#4f46e5,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌙</div>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:"#111827",letterSpacing:"-0.02em"}}>SleepIQ</div>
            <div style={{fontSize:12,color:"#6b7280"}}>Sleep Quality Prediction</div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Mode toggle — hidden for guests */}
          {!isGuest&&(
            <div style={{display:"flex",background:"#f3f4f6",borderRadius:8,padding:3,gap:2}}>
              {["basic","advanced"].map(m=>(
                <button key={m} onClick={()=>setMode(m)}
                  style={{padding:"7px 18px",borderRadius:7,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",
                    transition:"all .18s",background:mode===m?"#fff":"transparent",color:mode===m?"#111827":"#6b7280",
                    boxShadow:mode===m?"0 1px 3px rgba(0,0,0,0.1)":"none",textTransform:"capitalize"}}>{m}</button>
              ))}
            </div>
          )}
          {result&&<Badge prediction={result.prediction}/>}

          {/* Guest banner */}
          {isGuest&&(
            <div style={{padding:"5px 12px",borderRadius:8,background:"#fef9c3",border:"1px solid #fde68a",
              fontSize:12,fontWeight:600,color:"#854d0e"}}>
              👤 Guest — predictions not saved to profile
            </div>
          )}

          {/* User area */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",
              background:isAdmin?"linear-gradient(135deg,#f59e0b,#ef4444)":isGuest?"#e5e7eb":"linear-gradient(135deg,#4f46e5,#3b82f6)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:isGuest?16:14,color:isGuest?"#9ca3af":"#fff",fontWeight:700}}>
              {isGuest?"👤":username[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>{username}</div>
              <div style={{fontSize:11,color:"#9ca3af",textTransform:"capitalize"}}>{role}</div>
            </div>
            {isAdmin&&(
              <button onClick={()=>setShowAdmin(true)}
                style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:700,
                  border:"1px solid #fde68a",background:"#fef9c3",color:"#854d0e",cursor:"pointer",marginLeft:4}}>
                🛡️ Admin
              </button>
            )}
            <button onClick={logout}
              style={{padding:"6px 12px",borderRadius:7,fontSize:13,fontWeight:500,border:"1px solid #e5e7eb",
                background:"#fff",color:"#6b7280",cursor:"pointer"}}>
              {isGuest?"Exit":"Sign out"}
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* MAIN CONTENT */}
    <div style={{maxWidth:1280,margin:"0 auto",padding:"32px 24px"}}>
      {/* Tabs */}
      <div style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:14,padding:5,
        maxWidth:580,margin:"0 auto 36px",border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{if(!t.disabled)setTab(t.id);}} disabled={t.disabled}
            style={{flex:1,padding:"12px 16px",borderRadius:10,fontSize:15,fontWeight:600,border:"none",
              cursor:t.disabled?"not-allowed":"pointer",transition:"all .18s",
              display:"flex",alignItems:"center",justifyContent:"center",gap:7,
              background:tab===t.id?"#fff":"transparent",
              color:tab===t.id?"#4f46e5":t.disabled?"#d1d5db":"#6b7280",
              boxShadow:tab===t.id?"0 2px 6px rgba(79,70,229,0.15)":"none",opacity:t.disabled?0.45:1}}>
            <span style={{fontSize:16}}>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* INPUT TAB */}
      {tab==="input"&&(
        <div style={{animation:"fadeUp .3s ease",position:"relative"}}>
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:24,fontWeight:700,color:"#111827",letterSpacing:"-0.02em",marginBottom:4}}>
              {isGuest?"Daily Check-in (Guest)":mode==="basic"?"Daily Check-in":"Advanced Metrics"}
            </h2>
            <p style={{fontSize:14,color:"#6b7280"}}>
              {isGuest?"Enter your metrics to get a prediction — results won't be saved to a profile"
                :mode==="basic"?"Enter your daily habits to predict tonight's sleep quality"
                :"Configure detailed health parameters for a full ML prediction"}
            </p>
          </div>

          {/* Profile */}
          <Card style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
              <div style={{width:32,height:32,borderRadius:8,background:"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>👤</div>
              <div><div style={{fontSize:15,fontWeight:600,color:"#111827"}}>Your Profile</div>
                <div style={{fontSize:12,color:"#9ca3af"}}>Personal information used for prediction</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:16}}>
              <ProfileField label="Age">
                <input type="text" inputMode="numeric" pattern="[0-9]*"
                  value={form.Age}
                  onChange={e=>{const v=e.target.value.replace(/\D/g,"");set("Age",v===''?'':v);}}
                  onBlur={e=>{const n=parseInt(e.target.value)||28;set("Age",Math.min(90,Math.max(1,n)));e.target.style.borderColor="#e5e7eb";}}
                  style={inpStyle} onFocus={focusBorder} placeholder="e.g. 28"/>
              </ProfileField>
              <ProfileField label="Gender">
                <Select value={gender} onChange={handleGender} options={["Male","Female","Other"]}/>
              </ProfileField>
              <ProfileField label="Height">
                {heightUnit==="cm"?(
                  <div style={{display:"flex",gap:6}}>
                    <input type="text" inputMode="decimal" pattern="[0-9.]*" value={heightDisplay.cm}
                      onChange={e=>{const v=e.target.value.replace(/[^0-9.]/g,"");if(v&&!isNaN(v))handleHeightCm(v);}}
                      style={{...inpStyle,flex:1}} onFocus={focusBorder} onBlur={blurBorder} placeholder="e.g. 170"/>
                    <UnitToggle value={heightUnit} options={["cm","ft"]} onChange={u=>{
                      setHeightUnit(u);const ti=heightDisplay.cm/2.54;
                      setHeightDisplay(h=>({...h,ft:Math.floor(ti/12),inch:Math.round(ti%12)}));}}/>
                  </div>
                ):(
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={heightDisplay.ft}
                      onChange={e=>{const v=e.target.value.replace(/\D/g,"");handleHeightFt(v||0,heightDisplay.inch);}}
                      style={{...inpStyle,width:54}} onFocus={focusBorder} onBlur={blurBorder} placeholder="ft"/>
                    <span style={{fontSize:12,color:"#9ca3af",flexShrink:0}}>ft</span>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={heightDisplay.inch}
                      onChange={e=>{const v=e.target.value.replace(/\D/g,"");handleHeightFt(heightDisplay.ft,v||0);}}
                      style={{...inpStyle,width:54}} onFocus={focusBorder} onBlur={blurBorder} placeholder="in"/>
                    <span style={{fontSize:12,color:"#9ca3af",flexShrink:0}}>in</span>
                    <UnitToggle value={heightUnit} options={["cm","ft"]} onChange={u=>setHeightUnit(u)}/>
                  </div>
                )}
              </ProfileField>
              <ProfileField label="Weight">
                <div style={{display:"flex",gap:6}}>
                  <input type="text" inputMode="decimal" pattern="[0-9.]*" value={weightDisplay}
                    onChange={e=>{const v=e.target.value.replace(/[^0-9.]/g,"");setWeightDisplay(v);if(v&&!isNaN(v))handleWeightChange(v,weightUnit);}}
                    style={{...inpStyle,flex:1}} onFocus={focusBorder} onBlur={blurBorder} placeholder="e.g. 70"/>
                  <UnitToggle value={weightUnit} options={["kg","lb"]} onChange={u=>{
                    const nv=u==="lb"?parseFloat((form.Weight*2.20462).toFixed(1)):form.Weight;
                    setWeightUnit(u);setWeightDisplay(nv);}}/>
                </div>
              </ProfileField>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              <ProfileField label="Medical Condition">
                <Select value={medical} onChange={v=>setForm(f=>({...f,
                  Medical_Conditions_Hypertension:v==="Hypertension"?1:0,
                  Medical_Conditions_None:v==="None"?1:0}))} options={["None","Hypertension"]}/>
              </ProfileField>
              <ProfileField label="On Medication">
                <Select value={form.Medication?"Yes":"No"} onChange={v=>set("Medication",v==="Yes"?1:0)} options={["No","Yes"]}/>
              </ProfileField>
              <ProfileField label="Smoker">
                <Select value={form.Smoker?"Yes":"No"} onChange={v=>set("Smoker",v==="Yes"?1:0)} options={["No","Yes"]}/>
              </ProfileField>
            </div>
          </Card>

          {/* Basic inputs */}
          {(isGuest||mode==="basic")&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Card>
                <SectionHeader icon="🏃" bg="#eff6ff" title="Activity" sub="Physical movement today"/>
                <div style={{marginTop:16}}>
                  <InputRow label="Steps Taken" value={form.Steps} min={0} max={20000} step={500} unit="" icon="👟" onChange={v=>set("Steps",v)}/>
                  <div style={{paddingBottom:14,marginBottom:14,borderBottom:"1px solid #f3f4f6"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:15}}>🏋️</span>
                      <span style={{fontSize:14,fontWeight:500,color:"#374151"}}>Exercise Type</span>
                    </div>
                    <Select value={activeEx} onChange={handleEx} options={EXERCISES_LIST}/>
                  </div>
                  <InputRow label="Calories Burned" value={form.Calories_Burned} min={0} max={2000} step={10} unit="kcal" icon="🔥" onChange={v=>set("Calories_Burned",v)}/>
                  <InputRow label="Exercise Duration" value={form.Exercise_Duration} min={0} max={180} step={5} unit="min" icon="⏱️" onChange={v=>set("Exercise_Duration",v)}/>
                  <InputRow label="Exercise Intensity" value={form.Exercise_Intensity} min={1} max={10} step={1} unit="/10" icon="⚡" onChange={v=>set("Exercise_Intensity",v)}/>
                </div>
              </Card>
              <Card>
                <SectionHeader icon="🌙" bg="#f0fdf4" title="Lifestyle" sub="Daily habits & wellbeing"/>
                <div style={{marginTop:16}}>
                  <InputRow label="Stress Level" value={form.Stress_Level} min={1} max={10} step={1} unit="/10" icon="🧠" onChange={v=>set("Stress_Level",v)} inverse/>
                  <InputRow label="Screen Time" value={form.Screen_Time} min={0} max={16} step={0.5} unit="hrs" icon="📱" onChange={v=>set("Screen_Time",v)} inverse/>
                  <InputRow label="Mood Rating" value={form.Mood} min={1} max={10} step={1} unit="/10" icon="😊" onChange={v=>set("Mood",v)}/>
                  <InputRow label="Water Intake" value={form.Water_Intake} min={0} max={6} step={0.5} unit="L" icon="💧" onChange={v=>set("Water_Intake",v)}/>
                </div>
              </Card>
            </div>
          )}

          {/* Advanced inputs — 4 columns */}
          {!isGuest&&mode==="advanced"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14}}>
              <Card>
                <SectionHeader icon="⌚" bg="#f0f9ff" title="Body Metrics" sub="Physical"/>
                <InputRow label="Body Fat" value={form.Body_Fat_Percentage} min={5} max={50} step={0.5} unit="%" icon="🔥" onChange={v=>set("Body_Fat_Percentage",v)}/>
                <InputRow label="Muscle Mass" value={form.Muscle_Mass} min={10} max={80} step={0.5} unit="kg" icon="💪" onChange={v=>set("Muscle_Mass",v)}/>
              </Card>
              <Card>
                <SectionHeader icon="❤️" bg="#fff1f2" title="Vitals" sub="Health readings"/>
                <InputRow label="Heart Rate" value={form.Heart_Rate} min={40} max={180} step={1} unit="bpm" icon="💓" onChange={v=>set("Heart_Rate",v)}/>
                <InputRow label="Blood Oxygen" value={form.Blood_Oxygen_Level} min={85} max={100} step={0.1} unit="%" icon="🫁" onChange={v=>set("Blood_Oxygen_Level",v)}/>
              </Card>
              <Card>
                <SectionHeader icon="🏃" bg="#eff6ff" title="Activity" sub="Movement today"/>
                <InputRow label="Steps" value={form.Steps} min={0} max={20000} step={500} unit="" icon="👟" onChange={v=>set("Steps",v)}/>
                <InputRow label="Cal Burned" value={form.Calories_Burned} min={0} max={2000} step={10} unit="kcal" icon="🔥" onChange={v=>set("Calories_Burned",v)}/>
                <InputRow label="Duration" value={form.Exercise_Duration} min={0} max={180} step={5} unit="min" icon="⏱️" onChange={v=>set("Exercise_Duration",v)}/>
                <InputRow label="Intensity" value={form.Exercise_Intensity} min={1} max={10} step={1} unit="/10" icon="⚡" onChange={v=>set("Exercise_Intensity",v)}/>
                <div style={{paddingBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                    <span style={{fontSize:14}}>🏋️</span>
                    <span style={{fontSize:13,fontWeight:500,color:"#374151"}}>Exercise Type</span>
                  </div>
                  <Select value={activeEx} onChange={handleEx} options={EXERCISES_LIST}/>
                </div>
              </Card>
              <Card>
                <SectionHeader icon="🌙" bg="#f0fdf4" title="Lifestyle" sub="Daily habits"/>
                <InputRow label="Stress" value={form.Stress_Level} min={1} max={10} step={1} unit="/10" icon="🧠" onChange={v=>set("Stress_Level",v)} inverse/>
                <InputRow label="Mood" value={form.Mood} min={1} max={10} step={1} unit="/10" icon="😊" onChange={v=>set("Mood",v)}/>
                <InputRow label="Screen Time" value={form.Screen_Time} min={0} max={16} step={0.5} unit="hrs" icon="📱" onChange={v=>set("Screen_Time",v)} inverse/>
                <InputRow label="Water" value={form.Water_Intake} min={0} max={6} step={0.5} unit="L" icon="💧" onChange={v=>set("Water_Intake",v)}/>
                <InputRow label="Cal Intake" value={form.Calories_Intake} min={500} max={5000} step={50} unit="kcal" icon="🥗" onChange={v=>set("Calories_Intake",v)}/>
              </Card>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"center",marginTop:32}}>
            <button onClick={predict} disabled={loading}
              style={{padding:"13px 36px",borderRadius:12,fontSize:16,fontWeight:600,border:"none",
                cursor:loading?"not-allowed":"pointer",
                background:loading?"#e5e7eb":"linear-gradient(135deg,#4f46e5,#3b82f6)",
                color:loading?"#9ca3af":"#fff",
                boxShadow:loading?"none":"0 4px 14px rgba(79,70,229,0.35)",
                transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
              {loading?(<><span style={{width:16,height:16,borderRadius:"50%",border:"2px solid rgba(0,0,0,0.1)",borderTopColor:"#6b7280",animation:"spin .7s linear infinite",display:"inline-block"}}/>Analyzing...</>):(<><span>✨</span>Predict My Sleep</>)}
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {tab==="dashboard"&&(
        <div style={{animation:"fadeUp .3s ease"}}>
          <div style={{marginBottom:14}}>
            <h2 style={{fontSize:20,fontWeight:700,color:"#111827",letterSpacing:"-0.02em",marginBottom:3}}>
              {mode==="basic"||isGuest?"Today's Health Overview":"Advanced Dashboard"}
            </h2>
            <p style={{fontSize:13,color:"#6b7280"}}>
              {isGuest?"Guest view — sign up to track your history":"Your key daily metrics at a glance"}
            </p>
          </div>

          {/* Guest notice */}
          {isGuest&&(
            <div style={{borderRadius:12,padding:"14px 18px",background:"#fef9c3",border:"1px solid #fde68a",
              marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>💡</span>
              <div style={{fontSize:13,color:"#854d0e"}}>
                <strong>You're using SleepIQ as a guest.</strong> History charts and trend analysis require an account.{" "}
                <button onClick={()=>{logout();}} style={{color:"#4f46e5",fontWeight:600,background:"none",border:"none",cursor:"pointer",fontSize:13}}>Sign up free →</button>
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
            <DashCard label="Steps" value={form.Steps.toLocaleString()} unit="" target="Target: 10,000"
              progress={Math.min(Math.round((form.Steps/10000)*100),100)}
              progressColor={form.Steps>=10000?"#22c55e":form.Steps>=7000?"#f59e0b":"#ef4444"}
              iconBg="#dbeafe" iconColor="#3b82f6" iconSvg="activity"/>
            <DashCard label="Stress Level" value={form.Stress_Level} unit="/10" target="Target: Low (≤3)"
              progress={Math.round((form.Stress_Level/10)*100)}
              progressColor={form.Stress_Level<=3?"#22c55e":form.Stress_Level<=6?"#f59e0b":"#ef4444"}
              iconBg="#fce7f3" iconColor="#db2777" iconSvg="zap"/>
            <DashCard label="Heart Rate" value={form.Heart_Rate} unit="bpm" target="Target: 60–100"
              progress={Math.min(Math.round(((form.Heart_Rate-40)/140)*100),100)}
              progressColor={form.Heart_Rate>=60&&form.Heart_Rate<=100?"#22c55e":"#ef4444"}
              iconBg="#fee2e2" iconColor="#ef4444" iconSvg="heart"/>
            <DashCard label="Screen Time" value={form.Screen_Time} unit="hrs" target="Target: <2 hrs"
              progress={Math.min(Math.round((form.Screen_Time/8)*100),100)}
              progressColor={form.Screen_Time<=2?"#22c55e":form.Screen_Time<=5?"#f59e0b":"#ef4444"}
              iconBg="#e0e7ff" iconColor="#6366f1" iconSvg="laptop"/>
            <DashCard label="Water Intake" value={form.Water_Intake} unit="L" target="Target: 4 L"
              progress={Math.min(Math.round((form.Water_Intake/4)*100),100)}
              progressColor={form.Water_Intake>=4?"#22c55e":form.Water_Intake>=2?"#f59e0b":"#ef4444"}
              iconBg="#cffafe" iconColor="#06b6d4" iconSvg="water"/>
            <DashCard label="Mood" value={form.Mood} unit="/10" target="Target: Good (≥7)"
              progress={Math.round((form.Mood/10)*100)}
              progressColor={form.Mood>=7?"#22c55e":form.Mood>=5?"#f59e0b":"#ef4444"}
              iconBg="#ede9fe" iconColor="#7c3aed" iconSvg="moon"/>
          </div>

          {/* Basic dashboard bottom row */}
          {(isGuest||mode==="basic")&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {/* Sleep Health Score big number */}
              {(()=>{
                const sc=scoreColor(liveScore);
                const emoji=liveScore>=65?"😴":liveScore>=35?"😐":"😟";
                const msg=liveScore>=65?"Your habits today are setting you up for great rest":liveScore>=35?"A few adjustments could improve tonight's sleep":"Several factors are working against restful sleep tonight";
                return<Card style={{gridColumn:"span 1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px",textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:6}}>{emoji}</div>
                  <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4,fontWeight:500}}>Sleep Readiness</div>
                  <div style={{fontSize:52,fontWeight:800,color:sc,lineHeight:1,letterSpacing:"-0.04em"}}>{liveScore}</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>/100</div>
                  <div style={{fontSize:12,color:"#6b7280",lineHeight:1.5,maxWidth:160}}>{msg}</div>
                </Card>;
              })()}
              {/* Top factors */}
              <Card style={{padding:"18px 20px"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:14}}>✅ Working for you</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {cond:form.Stress_Level<=4,label:"Low stress today",icon:"😌"},
                    {cond:form.Screen_Time<=3,label:"Limited screen time",icon:"✅"},
                    {cond:form.Steps>=8000,label:"Active day",icon:"💪"},
                    {cond:form.Water_Intake>=2.5,label:"Well hydrated",icon:"💧"},
                    {cond:form.Exercise_Duration>=30,label:"Exercised today",icon:"🏃"},
                    {cond:form.Mood>=7,label:"Good mood",icon:"😊"},
                  ].filter(x=>x.cond).slice(0,3).map((x,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
                      <span style={{fontSize:16}}>{x.icon}</span>
                      <span style={{fontSize:13,color:"#166534",fontWeight:500}}>{x.label}</span>
                    </div>
                  ))}
                  {[form.Stress_Level<=4,form.Screen_Time<=3,form.Steps>=8000,form.Water_Intake>=2.5,form.Exercise_Duration>=30,form.Mood>=7].filter(Boolean).length===0&&(
                    <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:"16px 0"}}>No strong positives yet today</div>
                  )}
                </div>
              </Card>
              <Card style={{padding:"18px 20px"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:14}}>⚠️ Watch out for</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {cond:form.Stress_Level>=7,label:"High stress today",icon:"😓"},
                    {cond:form.Screen_Time>=6,label:"Too much screen time",icon:"📱"},
                    {cond:form.Steps<4000,label:"Low activity",icon:"🚶"},
                    {cond:form.Water_Intake<1.5,label:"Low hydration",icon:"💧"},
                    {cond:form.Mood<=3,label:"Low mood today",icon:"😔"},
                  ].filter(x=>x.cond).slice(0,3).map((x,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca"}}>
                      <span style={{fontSize:16}}>{x.icon}</span>
                      <span style={{fontSize:13,color:"#991b1b",fontWeight:500}}>{x.label}</span>
                    </div>
                  ))}
                  {[form.Stress_Level>=7,form.Screen_Time>=6,form.Steps<4000,form.Water_Intake<1.5,form.Mood<=3].filter(Boolean).length===0&&(
                    <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:"16px 0"}}>Nothing to worry about today! 🎉</div>
                  )}
                </div>
              </Card>
            </div>
          )}
          {/* Advanced dashboard history */}
          {!isGuest&&mode==="advanced"&&(
            <Card style={{padding:"16px 20px"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#111827",marginBottom:3}}>Sleep Score History</div>
              <div style={{fontSize:12,color:"#9ca3af",marginBottom:12}}>Your last {stats?.weekly?.length||0} predictions</div>
              {stats&&stats.total>0?(
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={stats.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                    <XAxis dataKey="day" tick={{fontSize:12,fill:"#6b7280"}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{fontSize:12,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}} formatter={v=>[`${v}/100`,"Sleep Score"]}/>
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3}
                      dot={p=><circle cx={p.cx} cy={p.cy} r={5} fill={scoreColor(p.value)} stroke="#fff" strokeWidth={2}/>}/>
                  </LineChart>
                </ResponsiveContainer>
              ):(
                <div style={{textAlign:"center",padding:"24px 0",color:"#9ca3af"}}>
                  <div style={{fontSize:30,marginBottom:8}}>📊</div>
                  <div style={{fontSize:13,fontWeight:500,color:"#374151",marginBottom:4}}>No history yet</div>
                  <div style={{fontSize:12}}>Make your first prediction to see your sleep trend</div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab==="analytics"&&(
        <div style={{animation:"fadeUp .3s ease"}}>
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:24,fontWeight:700,color:"#111827",letterSpacing:"-0.02em",marginBottom:4}}>
              {isGuest||mode==="basic"?"Sleep Insights":"Advanced Analytics"}
            </h2>
            <p style={{fontSize:14,color:"#6b7280"}}>
              {isGuest?"A snapshot of what's affecting your sleep tonight":"Detailed analysis of your sleep patterns"}
            </p>
          </div>

          {/* Basic / Guest analytics — friendly, no jargon */}
          {(isGuest||mode==="basic")&&(
            <div>
              {/* Big sleep outlook */}
              {(()=>{
                const pred=liveResult.prediction;
                const sc=scoreColor(liveScore);
                const bigEmoji=pred==="Good"?"😴":pred==="Fair"?"😐":"😟";
                const headline=pred==="Good"?"You should sleep great tonight! 🌟":pred==="Fair"?"Your sleep might be okay tonight 🌤️":"You may struggle to sleep tonight 😔";
                const subline=pred==="Good"?"Your daily habits are well-balanced. Keep this up!":pred==="Fair"?"A couple of small adjustments could really help tonight.":"Several things today are making it harder to wind down.";
                const tip=pred==="Good"?"Stick to your usual bedtime — consistency is key.":pred==="Fair"?"Try putting screens away 30 minutes before bed.":"Do 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s × 4 times.";
                return<div style={{borderRadius:16,padding:"28px 32px",marginBottom:16,
                  background:pred==="Good"?"linear-gradient(135deg,#f0fdf4,#dcfce7)":pred==="Fair"?"linear-gradient(135deg,#fefce8,#fef9c3)":"linear-gradient(135deg,#fef2f2,#fee2e2)",
                  border:`1px solid ${pred==="Good"?"#bbf7d0":pred==="Fair"?"#fde68a":"#fecaca"}`,
                  display:"flex",alignItems:"center",gap:28}}>
                  <div style={{fontSize:64,flexShrink:0}}>{bigEmoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:22,fontWeight:700,color:sc,marginBottom:6,letterSpacing:"-0.02em"}}>{headline}</div>
                    <div style={{fontSize:14,color:"#374151",marginBottom:12,lineHeight:1.6}}>{subline}</div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:20,
                      background:"rgba(255,255,255,0.7)",border:"1px solid rgba(0,0,0,0.06)"}}>
                      <span style={{fontSize:14}}>💡</span>
                      <span style={{fontSize:13,fontWeight:500,color:"#374151"}}>{tip}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:48,fontWeight:800,color:sc,lineHeight:1,letterSpacing:"-0.04em"}}>{liveScore}</div>
                    <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>sleep score</div>
                  </div>
                </div>;
              })()}

              {/* 3 factor cards with plain English */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
                {[
                  {label:"Stress level",val:form.Stress_Level,display:`${form.Stress_Level}/10`,icon:"🧠",
                    good:"Great! Low stress today means your nervous system can relax at bedtime.",
                    mid:"Moderate stress. Try a short walk or breathing exercise this evening.",
                    bad:"High stress detected. This is the biggest thing working against your sleep tonight.",
                    isGood:form.Stress_Level<=4,isBad:form.Stress_Level>=7},
                  {label:"Screen time",val:form.Screen_Time,display:`${form.Screen_Time} hrs`,icon:"💻",
                    good:"Excellent! Low screen time means your melatonin levels are on track.",
                    mid:"Moderate screen use. Try to avoid screens for the last hour before bed.",
                    bad:"Heavy screen use suppresses melatonin — your brain thinks it's still daytime.",
                    isGood:form.Screen_Time<=2,isBad:form.Screen_Time>=6},
                  {label:"Activity today",val:form.Steps,display:form.Steps.toLocaleString()+" steps",icon:"👟",
                    good:"Active day! Physical movement is one of the most effective natural sleep aids.",
                    mid:"Moderate activity. Even a short walk this evening can help you wind down.",
                    bad:"Low activity today may make it harder to feel tired at bedtime.",
                    isGood:form.Steps>=8000,isBad:form.Steps<3000},
                ].map(({label,display,icon,good,mid,bad,isGood,isBad})=>{
                  const c=isGood?"#22c55e":isBad?"#ef4444":"#f59e0b";
                  const bg=isGood?"#f0fdf4":isBad?"#fef2f2":"#fefce8";
                  const bc=isGood?"#bbf7d0":isBad?"#fecaca":"#fde68a";
                  const msg=isGood?good:isBad?bad:mid;
                  const status=isGood?"Good":isBad?"Needs attention":"Okay";
                  return<div key={label} style={{borderRadius:12,padding:"18px 18px",background:bg,border:`1px solid ${bc}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>{icon} {label}</div>
                      <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,
                        background:c+"25",color:c}}>{status}</span>
                    </div>
                    <div style={{fontSize:22,fontWeight:800,color:c,marginBottom:10,letterSpacing:"-0.02em"}}>{display}</div>
                    <div style={{fontSize:13,color:"#374151",lineHeight:1.55}}>{msg}</div>
                  </div>;
                })}
              </div>

              {/* Simple tonight's outlook */}
              <Card style={{padding:"20px 24px"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#374151",marginBottom:16}}>🌙 Tonight's Sleep Outlook</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {[{k:"Good",label:"Good night",icon:"😴",c:"#22c55e",desc:"Deep, restful sleep"},
                    {k:"Fair",label:"Fair night",icon:"😐",c:"#f59e0b",desc:"Light or disrupted sleep"},
                    {k:"Poor",label:"Poor night",icon:"😟",c:"#ef4444",desc:"Difficult sleep"}].map(({k,label,icon,c,desc})=>(
                    <div key={k} style={{borderRadius:10,padding:"14px 16px",background:"#f9fafb",border:"1px solid #f3f4f6",textAlign:"center"}}>
                      <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
                      <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:2}}>{label}</div>
                      <div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>{desc}</div>
                      <div style={{fontSize:26,fontWeight:800,color:c}}>{liveResult.probabilities[k]}%</div>
                      <div style={{height:5,background:"#e5e7eb",borderRadius:3,marginTop:8}}>
                        <div style={{height:"100%",width:`${liveResult.probabilities[k]}%`,background:c,borderRadius:3,transition:"width .8s"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Advanced analytics */}
          {!isGuest&&mode==="advanced"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:"#111827",marginBottom:4}}>Sleep Quality Probability</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>Based on current metrics</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={[
                        {name:"Good Sleep",value:liveResult.probabilities.Good},
                        {name:"Fair Sleep",value:liveResult.probabilities.Fair},
                        {name:"Poor Sleep",value:liveResult.probabilities.Poor},
                      ]} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={3} dataKey="value">
                        {["#22c55e","#f59e0b","#ef4444"].map((c,i)=><Cell key={i} fill={c}/>)}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}} formatter={v=>`${v}%`}/>
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{fontSize:13}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:"#111827",marginBottom:4}}>Factor Impact</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>Max contribution to sleep score (pts)</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart layout="vertical" barSize={14} data={[
                      {factor:"Low Stress",impact:30},{factor:"Low Screens",impact:20},
                      {factor:"High Steps",impact:20},{factor:"Hydration",impact:15},
                      {factor:"Good Mood",impact:10},{factor:"Exercise",impact:5},
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                      <XAxis type="number" domain={[0,35]} tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                      <YAxis dataKey="factor" type="category" tick={{fontSize:12,fill:"#6b7280"}} width={110} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}} formatter={v=>[`${v} pts`,"Impact"]}/>
                      <Bar dataKey="impact" radius={[0,6,6,0]}>
                        {["#22c55e","#3b82f6","#3b82f6","#06b6d4","#f59e0b","#a855f7"].map((c,i)=><Cell key={i} fill={c}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:"#111827",marginBottom:4}}>Simulated Weekly Score</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>Based on current metrics with natural variation</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart barSize={36} data={DAYS.map((d,i)=>{
                      const v=[0,-8,5,-3,10,-5,8][i]||0;
                      return{day:d.slice(0,3),score:Math.min(100,Math.max(5,liveScore+v))};
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                      <XAxis dataKey="day" tick={{fontSize:12,fill:"#6b7280"}} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0,100]} tick={{fontSize:12,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{borderRadius:10,border:"1px solid #e5e7eb",fontSize:13}} formatter={v=>[`${v}/100`,"Score"]}/>
                      <Bar dataKey="score" radius={[6,6,0,0]}>
                        {DAYS.map((_,i)=>{const v=[0,-8,5,-3,10,-5,8][i]||0;const s=Math.min(100,Math.max(5,liveScore+v));return<Cell key={i} fill={scoreColor(s)}/>;})}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <div style={{fontSize:15,fontWeight:600,color:"#111827",marginBottom:4}}>Health Radar</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>6 dimensions</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={[
                      {metric:"Activity",value:Math.min(Math.round((form.Steps/20000)*10),10)},
                      {metric:"Hydration",value:Math.min(Math.round((form.Water_Intake/6)*10),10)},
                      {metric:"Calm",value:Math.round(((10-form.Stress_Level)/9)*10)},
                      {metric:"Mood",value:form.Mood},
                      {metric:"Vitals",value:Math.round(((form.Blood_Oxygen_Level-85)/15)*10)},
                      {metric:"Exercise",value:Math.min(Math.round((form.Exercise_Duration/180)*10),10)},
                    ]}>
                      <PolarGrid stroke="#e5e7eb"/>
                      <PolarAngleAxis dataKey="metric" tick={{fontSize:11,fill:"#6b7280"}}/>
                      <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULT TAB */}
      {tab==="result"&&!result&&(
        <div style={{textAlign:"center",padding:"80px 0",animation:"fadeUp .3s ease"}}>
          <div style={{fontSize:72,marginBottom:16}}>🌙</div>
          <h3 style={{fontSize:20,fontWeight:600,color:"#111827",marginBottom:8}}>No prediction yet</h3>
          <p style={{color:"#9ca3af",marginBottom:24}}>Enter your metrics and run a prediction to see results</p>
          <button onClick={()=>setTab("input")}
            style={{padding:"11px 28px",borderRadius:10,fontSize:14,fontWeight:600,
              background:"linear-gradient(135deg,#4f46e5,#3b82f6)",color:"#fff",
              border:"none",cursor:"pointer",boxShadow:"0 4px 12px rgba(79,70,229,0.3)"}}>Go to Input</button>
        </div>
      )}

      {tab==="result"&&result&&(()=>{
        const c=clr[result.prediction]||clr.Fair;
        const score=result.score??50;
        const r2=76,sw=10,circ=2*Math.PI*r2,dash=(score/100)*circ;
        const insights=generateInsights(form);
        const sc=scoreColor(score);

        /* ── BASIC RESULT ── friendly, emoji-driven, no ML jargon */
        if(isGuest||mode==="basic") return<div style={{animation:"fadeUp .3s ease"}}>
          <div style={{marginBottom:16}}>
            <h2 style={{fontSize:20,fontWeight:700,color:"#111827",letterSpacing:"-0.02em",marginBottom:3}}>Your Sleep Prediction</h2>
            <p style={{fontSize:13,color:"#6b7280"}}>
              {isGuest&&<span style={{color:"#854d0e",fontWeight:500}}>Guest session — </span>}
              {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            </p>
          </div>

          {/* Hero card */}
          <div style={{borderRadius:16,padding:"32px 36px",marginBottom:14,display:"flex",alignItems:"center",gap:28,
            background:c.bg,border:`1px solid ${c.border}`}}>
            <div style={{fontSize:80,flexShrink:0,lineHeight:1}}>
              {result.prediction==="Good"?"😴":result.prediction==="Fair"?"😐":"😟"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:24,fontWeight:700,color:c.text,marginBottom:8,letterSpacing:"-0.02em"}}>
                {result.prediction==="Good"?"You should sleep great tonight! 🌟":result.prediction==="Fair"?"Your sleep might be okay tonight 🌤️":"You may struggle to sleep tonight 😔"}
              </div>
              <div style={{fontSize:14,color:"#374151",lineHeight:1.65,maxWidth:480}}>
                {result.prediction==="Good"?"Your daily habits are well-balanced. Keep this routine for consistent, restful nights.":result.prediction==="Fair"?"A couple of things could be affecting your rest. Small adjustments can make a big difference.":"Several factors today are working against quality sleep. Even one small change helps."}
              </div>
            </div>
            <div style={{textAlign:"center",flexShrink:0,padding:"16px 20px",borderRadius:12,
              background:"rgba(255,255,255,0.6)",border:`1px solid ${c.border}`}}>
              <div style={{fontSize:44,fontWeight:800,color:c.text,lineHeight:1,letterSpacing:"-0.04em"}}>{score}</div>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>sleep score</div>
            </div>
          </div>

          {/* What's helping + hurting side by side */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <Card style={{padding:"18px 20px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#166534",marginBottom:14}}>✅ What's helping tonight</div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {[
                  {cond:form.Stress_Level<=4,text:"Low stress — your nervous system is calm",icon:"😌"},
                  {cond:form.Screen_Time<=3,text:"Low screen time — melatonin on track",icon:"📵"},
                  {cond:form.Steps>=7000,text:"Active day — physical fatigue aids sleep",icon:"💪"},
                  {cond:form.Water_Intake>=2.5,text:"Well hydrated — less nighttime restlessness",icon:"💧"},
                  {cond:form.Exercise_Duration>=30,text:"You exercised — deeper sleep stages ahead",icon:"🏃"},
                  {cond:form.Mood>=7,text:"Good mood — positive emotional state",icon:"😊"},
                ].filter(x=>x.cond).slice(0,3).map((x,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"9px 12px",borderRadius:8,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
                    <span style={{fontSize:15}}>{x.icon}</span>
                    <span style={{fontSize:13,color:"#166534",fontWeight:500}}>{x.text}</span>
                  </div>
                ))}
                {[form.Stress_Level<=4,form.Screen_Time<=3,form.Steps>=7000,form.Water_Intake>=2.5,form.Exercise_Duration>=30,form.Mood>=7].filter(Boolean).length===0&&(
                  <div style={{fontSize:13,color:"#9ca3af",padding:"12px 0",textAlign:"center"}}>No strong positives today</div>
                )}
              </div>
            </Card>
            <Card style={{padding:"18px 20px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#991b1b",marginBottom:14}}>⚠️ What might affect sleep</div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {insights.map((ins,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"9px 12px",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca"}}>
                    <span style={{fontSize:15}}>{ins.icon}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#991b1b",marginBottom:1}}>{ins.title}</div>
                      <div style={{fontSize:12,color:"#374151",lineHeight:1.4}}>{ins.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Tonight's tip */}
          <div style={{borderRadius:10,padding:"14px 18px",marginBottom:12,
            background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",border:"1px solid #c7d2fe",display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:18}}>💡</span>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#4f46e5",marginBottom:3}}>Tonight's tip</div>
              <div style={{fontSize:13,color:"#4338ca",lineHeight:1.55}}>
                {result.prediction==="Good"&&"Stick to your usual bedtime. Consistency reinforces your circadian rhythm and makes every night better."}
                {result.prediction==="Fair"&&"Put screens away 30 minutes before bed. Blue light delays melatonin production and keeps your brain alert."}
                {result.prediction==="Poor"&&"Try the 4-7-8 technique: inhale 4 seconds, hold 7 seconds, exhale 8 seconds. Repeat 4 times to calm your nervous system."}
              </div>
            </div>
          </div>

          {isGuest&&<div style={{borderRadius:10,padding:"12px 16px",marginBottom:12,background:"#fef9c3",border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:14}}>⭐</span>
            <div style={{fontSize:13,color:"#854d0e"}}>
              <strong>Want to track your sleep over time?</strong>{" "}
              <button onClick={logout} style={{color:"#4f46e5",fontWeight:700,background:"none",border:"none",cursor:"pointer",fontSize:13}}>Create a free account →</button>
            </div>
          </div>}

          <div style={{display:"flex",gap:12}}>
            <button onClick={reset} style={{padding:"10px 22px",borderRadius:9,fontSize:13,fontWeight:500,background:"#f3f4f6",border:"1px solid #e5e7eb",color:"#374151",cursor:"pointer"}}>↺ Check again</button>
            <button onClick={()=>setTab("analytics")} style={{padding:"10px 22px",borderRadius:9,fontSize:13,fontWeight:500,background:"#eef2ff",border:"1px solid #c7d2fe",color:"#4f46e5",cursor:"pointer"}}>📈 View Insights</button>
          </div>
        </div>;

        /* ── ADVANCED RESULT ── technical, full ML detail */
        return<div style={{animation:"fadeUp .3s ease"}}>
          <div style={{marginBottom:14}}>
            <h2 style={{fontSize:20,fontWeight:700,color:"#111827",letterSpacing:"-0.02em",marginBottom:3}}>Your Sleep Prediction</h2>
            <p style={{fontSize:13,color:"#6b7280"}}>
              {isGuest&&<span style={{color:"#854d0e",fontWeight:500}}>Guest session — </span>}
              Based on your metrics for {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            </p>
          </div>
          {/* Top row: ring + probability side by side + insights side by side */}
          <div style={{display:"grid",gridTemplateColumns:"200px 1fr 1fr",gap:14,marginBottom:14}}>
            {/* Ring */}
            <div style={{background:`linear-gradient(135deg,${c.bg},${c.bg}cc)`,border:`1px solid ${c.border}`,
              borderRadius:14,padding:"20px 16px",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center"}}>
              <div style={{position:"relative",marginBottom:10}}>
                <svg width={140} height={140} style={{transform:"rotate(-90deg)"}}>
                  <circle cx={70} cy={70} r={58} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={9}/>
                  <circle cx={70} cy={70} r={58} fill="none" stroke={c.solid} strokeWidth={9}
                    strokeDasharray={`${(score/100)*2*Math.PI*58} ${2*Math.PI*58}`} strokeLinecap="round"
                    style={{filter:`drop-shadow(0 0 5px ${c.solid}55)`,transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:24,fontWeight:800,color:c.text,lineHeight:1,letterSpacing:"-0.02em"}}>{result.prediction}</div>
                  <div style={{fontSize:10,color:"#9ca3af",marginTop:4,fontWeight:500,letterSpacing:"0.05em"}}>SLEEP QUALITY</div>
                </div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:c.text,textAlign:"center",marginBottom:4}}>
                {result.prediction==="Good"?"Great ahead":result.prediction==="Fair"?"May vary":"Disrupted risk"}
              </div>
              <div style={{fontSize:11,color:"#6b7280"}}>Confidence: <strong style={{color:"#374151"}}>{result.confidence}%</strong></div>
            </div>

            {/* Probability forecast */}
            <Card style={{padding:"16px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>💤 Sleep Probability Forecast</div>
              {[{label:"Good sleep",key:"Good",color:"#22c55e",emoji:"😴",desc:"Deep, restorative sleep"},
                {label:"Fair sleep",key:"Fair",color:"#f59e0b",emoji:"😐",desc:"Light or disrupted sleep"},
                {label:"Poor sleep",key:"Poor",color:"#ef4444",emoji:"😟",desc:"Poor quality sleep"}].map(({label,key,color,emoji,desc})=>(
                <div key={key} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#374151",display:"flex",alignItems:"center",gap:6}}>{emoji} {label}</div>
                    <span style={{fontSize:18,fontWeight:700,color,minWidth:42,textAlign:"right"}}>{result.probabilities?.[key]??0}%</span>
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,marginLeft:20}}>{desc}</div>
                  <div style={{height:7,background:"#f3f4f6",borderRadius:4}}>
                    <div style={{height:"100%",width:`${result.probabilities?.[key]??0}%`,background:color,borderRadius:4,
                      transition:"width 1.1s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 5px ${color}50`}}/>
                  </div>
                </div>
              ))}
            </Card>

            {/* Insights side by side */}
            <Card style={{padding:"16px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>🌙 What's affecting your sleep</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {insights.map((ins,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:8,background:"#f9fafb",border:"1px solid #f3f4f6"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{ins.icon}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:2}}>{ins.title}</div>
                      <div style={{fontSize:12,color:"#6b7280",lineHeight:1.5}}>{ins.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div style={{borderRadius:10,padding:"13px 18px",marginBottom:14,
            background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",border:"1px solid #c7d2fe",display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:18,flexShrink:0}}>💡</span>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#4f46e5",marginBottom:3}}>Tonight's recommendation</div>
              <div style={{fontSize:13,color:"#4338ca",lineHeight:1.5}}>
                {result.prediction==="Good"&&"Your routine is working well. Maintain your current sleep schedule for consistent, restorative rest."}
                {result.prediction==="Fair"&&"Put screens away 30 minutes before bed. Blue light suppresses melatonin and delays sleep onset."}
                {result.prediction==="Poor"&&"Try the 4-7-8 technique: inhale 4s, hold 7s, exhale 8s. Repeat 4 times to activate your parasympathetic nervous system."}
              </div>
            </div>
          </div>
          {isGuest&&(
            <div style={{borderRadius:12,padding:"14px 18px",marginBottom:16,
              background:"#fef9c3",border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:16}}>⭐</span>
              <div style={{fontSize:13,color:"#854d0e"}}>
                <strong>Want to track your sleep over time?</strong> Create a free account to save predictions and view weekly trends.{" "}
                <button onClick={logout} style={{color:"#4f46e5",fontWeight:700,background:"none",border:"none",cursor:"pointer",fontSize:13}}>Sign up →</button>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:12}}>
            <button onClick={reset}
              style={{padding:"11px 24px",borderRadius:10,fontSize:14,fontWeight:500,background:"#f3f4f6",
                border:"1px solid #e5e7eb",color:"#374151",cursor:"pointer"}}
              onMouseEnter={e=>e.target.style.background="#e5e7eb"}
              onMouseLeave={e=>e.target.style.background="#f3f4f6"}>↺ Check again</button>
            <button onClick={()=>setTab("analytics")}
              style={{padding:"11px 24px",borderRadius:10,fontSize:14,fontWeight:500,background:"#eef2ff",
                border:"1px solid #c7d2fe",color:"#4f46e5",cursor:"pointer"}}
              onMouseEnter={e=>e.target.style.background="#e0e7ff"}
              onMouseLeave={e=>e.target.style.background="#eef2ff"}>📈 View Analytics</button>
          </div>
        </div>;
      })()}
    </div>
  </div>;
}
