import{j as e,a as z,r as p,S as A,C as R,F as M,c as P,d as k,B as G,G as D}from"./react-vendor-PCoXmfjw.js";import{g as m}from"./motion-vendor-CB87Sc6I.js";import{c as H,u as O,F as W,T as L,S as V,G as F,H as K,V as Y,I as U,J as q,K as Z,L as J}from"./index-DBdRKCsN.js";import"./pixi-vendor-CqkleIqs.js";const x={loadingBackground:"linear-gradient(135deg, #0f172a 0%, #020617 100%)",loadingBorder:"1px solid rgba(168, 85, 247, 0.2)",loadingLabelColor:"#94a3b8",loadingSpinnerTrack:"rgba(168, 85, 247, 0.1)",loadingSpinnerHead:"#a855f7",cardBackground:"linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 1) 100%)",cardBorder:"rgba(255, 255, 255, 0.05)",cardShadow:"0 10px 30px rgba(0, 0, 0, 0.4)",labelColor:"#64748b",valueBaseColor:"#ffffff",online:{themeColor:"rgba(56, 189, 248, 0.5)",glowColor:"rgba(56, 189, 248, 0.3)",borderColor:"#0ea5e9",valueColor:"#38bdf8"},prediction:{themeColor:"rgba(16, 185, 129, 0.5)",glowColor:"rgba(16, 185, 129, 0.3)",borderColor:"#10b981",valueColor:"#34d399"},today:{themeColor:"rgba(245, 158, 11, 0.5)",glowColor:"rgba(245, 158, 11, 0.3)",borderColor:"#f59e0b",valueColor:"#fbbf24"},total:{themeColor:"rgba(236, 72, 153, 0.5)",glowColor:"rgba(236, 72, 153, 0.3)",borderColor:"#ec4899",valueColor:"#f472b6"}},C={modern:{online:"👥",prediction:"🎯",today:"📊",total:"🎲"},arctic:{online:"❄️",prediction:"🧭",today:"📈",total:"🧊"},astral:{online:"🚂",prediction:"✦",today:"🌠",total:"🪙"},crimson:{online:"🩸",prediction:"⛧",today:"🗡️",total:"☠️"},neon:{online:"⌘",prediction:"◎",today:"▦",total:"◈"}};function Q({theme:o=x,themeKey:u="modern"}){const{stats:l}=H(),h=u==="winter"?"arctic":u==="void"?"crimson":u,c=h==="neon",i=C[h]||C.modern,t={...x,...o,online:{...x.online,...(o==null?void 0:o.online)||{}},prediction:{...x.prediction,...(o==null?void 0:o.prediction)||{}},today:{...x.today,...(o==null?void 0:o.today)||{}},total:{...x.total,...(o==null?void 0:o.total)||{}}},d=s=>s==null?"0":typeof s!="number"?String(s):s===0?"0":s>=1e6?`${(s/1e6).toFixed(1)}M`:s>=1e3?`${(s/1e3).toFixed(1)}K`:s.toLocaleString("en-US");return l.loading&&l.total===0?e.jsxs("div",{className:"home-stats-widget-loading",style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem",width:"100%",maxWidth:"1100px",margin:"0 auto",background:t.loadingBackground,borderRadius:"32px",border:t.loadingBorder,boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.5)"},children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{style:{color:t.loadingLabelColor,fontSize:"11px",fontWeight:"900",letterSpacing:"4px",textTransform:"uppercase",marginTop:"1.5rem",fontFamily:"var(--theme-font-mono, monospace)"},children:"SYNCING SVAROG NETWORK..."}),e.jsx("style",{children:`
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid ${t.loadingSpinnerTrack};
            border-top: 3px solid ${t.loadingSpinnerHead};
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `})]}):l.error&&l.total===0?null:e.jsxs("div",{className:"home-stats-widget",style:{display:"flex",flexDirection:"column",gap:"0.95rem",padding:"1.25rem 0",maxWidth:"1000px",margin:"0 auto",width:"100%",position:"relative",zIndex:100,isolation:"isolate"},children:[e.jsxs("h2",{className:"home-stats-title text-3xl font-black tracking-tight flex items-center gap-3",children:["HSR OVERVIEW",c?e.jsx("span",{className:"theme-badge-lv999"}):null]}),e.jsxs("div",{className:"home-stats-grid",children:[e.jsxs("div",{className:"stat-card stat-online",children:[e.jsx("div",{className:"stat-card-glow"}),e.jsx("div",{className:"stat-icon",children:i.online}),e.jsx("div",{className:"stat-value",children:d(l.online)}),e.jsx("div",{className:"stat-label",children:"Online Status"})]}),e.jsxs("div",{className:"stat-card stat-prediction",children:[e.jsx("div",{className:"stat-card-glow"}),e.jsx("div",{className:"stat-icon",children:i.prediction}),e.jsx("div",{className:"stat-value",children:d(l.active)}),e.jsx("div",{className:"stat-label",children:"Prediction Now"})]}),e.jsxs("div",{className:"stat-card stat-today",children:[e.jsx("div",{className:"stat-card-glow"}),e.jsx("div",{className:"stat-icon",children:i.today}),e.jsx("div",{className:"stat-value",children:d(l.today)}),e.jsx("div",{className:"stat-label",children:"Today Predictions"})]}),e.jsxs("div",{className:"stat-card stat-total",children:[e.jsx("div",{className:"stat-card-glow"}),e.jsx("div",{className:"stat-icon",children:i.total}),e.jsx("div",{className:"stat-value",children:d(l.total)}),e.jsx("div",{className:"stat-label",children:"Total Predictions"})]})]}),e.jsx("style",{children:`
        .home-stats-widget {
          opacity: 1 !important;
          visibility: visible !important;
          margin-top: 0.5rem;
        }

        .home-stats-title {
          width: 100%;
          margin: 0 0 0.15rem;
          justify-content: flex-start;
        }

        .home-stats-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          align-items: stretch;
        }

        .stat-card {
          background: ${t.cardBackground} !important;
          border-radius: 20px;
          padding: 1.5rem 1rem;
          text-align: center;
          position: relative;
          border: 1px solid ${t.cardBorder};
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          box-shadow: ${t.cardShadow};
        }

        .stat-card-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, var(--glow-color) 0%, transparent 70%);
          opacity: 0.03;
          pointer-events: none;
        }

        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: var(--theme-color);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 15px var(--glow-color);
        }

        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.1));
        }

        .stat-value {
          font-size: 2.2rem;
          font-weight: 950;
          font-family: var(--theme-font-mono, monospace);
          margin-bottom: 0.25rem;
          letter-spacing: -1.5px;
          line-height: 1;
          color: ${t.valueBaseColor};
          text-shadow: 0 0 20px var(--glow-color);
        }

        .stat-label {
          font-size: 0.6rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: ${t.labelColor};
          white-space: nowrap;
        }

        .stat-online {
          --theme-color: ${t.online.themeColor};
          --glow-color: ${t.online.glowColor};
          border-left: 2px solid ${t.online.borderColor};
        }
        .stat-online .stat-value { color: ${t.online.valueColor}; }

        .stat-prediction {
          --theme-color: ${t.prediction.themeColor};
          --glow-color: ${t.prediction.glowColor};
          border-left: 2px solid ${t.prediction.borderColor};
        }
        .stat-prediction .stat-value { color: ${t.prediction.valueColor}; }

        .stat-today {
          --theme-color: ${t.today.themeColor};
          --glow-color: ${t.today.glowColor};
          border-left: 2px solid ${t.today.borderColor};
        }
        .stat-today .stat-value { color: ${t.today.valueColor}; }

        .stat-total {
          --theme-color: ${t.total.themeColor};
          --glow-color: ${t.total.glowColor};
          border-left: 2px solid ${t.total.borderColor};
        }
        .stat-total .stat-value { color: ${t.total.valueColor}; }

        @media (max-width: 1024px) {
          .home-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .home-stats-title {
            justify-content: center;
          }
          .home-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `})]})}const X={modern:k,arctic:P,crimson:M,neon:R,astral:A},S="svarog_tutorial_banner_dismissed_v1";function oe({sessionTheme:o="modern",onThemeChange:u=()=>{}}){const{isAuthenticated:l}=O(),h=z(),c=o==="winter"?"arctic":o==="void"?"crimson":o,[i,t]=p.useState(!1),[d,s]=p.useState(""),[$,T]=p.useState(()=>{try{return localStorage.getItem(S)!=="1"}catch{return!0}}),y="/Svarog-Tracer/",b=W(o),a=b.home||{},_=a.disableBackdropImage!==!0,g="Decrypt the hidden rhythms of the gacha. A sophisticated observation suite built to visualize RNG patterns and historical probability peaks.",f=p.useRef(null),w=[{title:"Scanner",label:"Live Predictor",desc:"Track in-game sessions with real-time pattern detection.",path:"/live",icon:"💠"},{title:"Waveform",label:"Kiyo Mode",desc:"Advanced 3nd digit forecasting with wave analysis.",path:"/kiyo",icon:"🌊"},{title:"Chronicles",label:"Caverns",desc:"Community drop records and technical execution archives.",path:"/caverns",icon:"🏛️"},{title:"Database",label:"Warp Analyzer",desc:"Global pull data processing for HSR, Genshin, and WuWa.",path:"/warp-analyzer",icon:"📊"},{title:"Sandbox",label:"The Lab",desc:"Experimental sandboxing for long roll strings.",path:"/long-string",icon:"🧪"},{title:"Manual",label:"Guides",desc:"Detailed documentation and technical guides for RNG analysis.",path:"/guides",icon:"📘"},{title:"Tracker",label:"Banner Rerun",desc:"Timeline of character banners and drought counters.",path:"/banner-tracker",icon:"🗓️"}],j=[{title:"Onboarding",label:"Tutorial",desc:"Scripted Svarog manip training for Live Mode, Caesar Shift, and force-line setups.",path:"/tutorial",icon:G},{title:"Practice",label:"Playground",desc:"Practice custom and random relic scenarios without risking a real session.",path:"/playground",icon:D}],B=l?[...w,...j,{title:"Nexus",label:"Zone Tracker",desc:"Collaborative drop mapping and team efficiency analysis.",path:"/zone-tracker",icon:"🌀"}]:[...w,...j];p.useEffect(()=>{m.set(".hero-content > *, .mode-card",{y:30,opacity:0}),m.set(".splash-matte",{scale:0,opacity:0});const r=m.timeline({onComplete:()=>{t(!0),m.to(".hero-content > *, .mode-card",{opacity:1,y:0,duration:.1})}});f.current=r,r.to(".splash-matte",{opacity:1,scale:1,duration:.15,ease:"power2.out"}).to(".splash-matte",{scale:80,duration:.55,ease:"expo.in"}).to(".hero-content > *",{opacity:1,y:0,duration:.6,stagger:.08,ease:"power3.out"},"-=0.3").to(".mode-card",{opacity:1,y:0,duration:.5,stagger:.05,ease:"power2.out"},"-=0.4"),m.to(".hero-title",{y:8,duration:3,repeat:-1,yoyo:!0,ease:"sine.inOut"});const n=setTimeout(()=>{t(!0),m.to(".hero-content > *, .mode-card",{opacity:1,y:0,duration:.1})},1500);return()=>{clearTimeout(n),f.current&&f.current.kill()}},[]),p.useEffect(()=>{if(!i)return;let r=0;const n=setInterval(()=>{s(g.slice(0,r)),r+=1,r>g.length&&clearInterval(n)},12);return()=>clearInterval(n)},[i,g]);const E=()=>{T(!1);try{localStorage.setItem(S,"1")}catch{}},I=()=>c==="arctic"?e.jsx("div",{className:"absolute inset-0 z-[1] overflow-hidden pointer-events-none opacity-95",children:e.jsx(F,{particleCount:36,speedScale:.7})}):c==="crimson"?e.jsxs("div",{className:"absolute inset-0 z-[1] overflow-hidden pointer-events-none",children:[e.jsx("div",{className:"opacity-95",children:e.jsx(K,{})}),e.jsx("div",{className:"opacity-85",children:e.jsx(Y,{})})]}):c==="neon"?e.jsxs("div",{className:"absolute inset-0 z-[1] overflow-hidden pointer-events-none",children:[e.jsx("div",{className:"opacity-90",children:e.jsx(U,{image:"999SW.png"})}),e.jsx("div",{className:"opacity-85",children:e.jsx(q,{})})]}):c==="astral"?e.jsxs("div",{className:"absolute inset-0 z-[1] overflow-hidden pointer-events-none",children:[e.jsx("div",{className:"opacity-100",children:e.jsx(Z,{})}),e.jsx("div",{className:"opacity-90",children:e.jsx(J,{})}),e.jsx("div",{className:"absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(227,192,114,0.12),transparent_34%)]"})]}):null;return e.jsxs("div",{className:`relative min-h-screen overflow-x-hidden font-sans ${a.backgroundClass||"bg-[#020617] text-slate-100 selection:bg-cyan-500/50 selection:text-white"}`,children:[e.jsx("div",{className:"fixed right-4 top-4 z-[95] sm:right-6 sm:top-6",children:e.jsx("div",{className:"flex items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl shadow-2xl",style:b.layout.themeMenuStyle,children:L.map(r=>{var N;const n=X[r.id]||k,v=c===r.id;return e.jsxs("button",{type:"button",onClick:()=>u(r.id),className:`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${v?"text-white shadow-lg":"border-slate-700/60 bg-slate-800/55 text-slate-300 hover:border-slate-500/70 hover:text-white"}`,style:v?(N=b.layout.themeOptionActiveStyles)==null?void 0:N[r.id]:void 0,"aria-label":`Switch to ${r.label} theme`,title:r.label,children:[e.jsx(n,{className:`h-4 w-4 transition-transform duration-300 ${v?"animate-pulse":"group-hover:scale-110 group-hover:rotate-6"}`}),e.jsx("span",{className:"pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100",children:r.label})]},r.id)})})}),!i&&e.jsx("div",{className:"fixed inset-0 z-[100] bg-black pointer-events-none",style:{mixBlendMode:"multiply"},children:e.jsx("div",{className:"flex items-center justify-center w-full h-full",children:e.jsx("img",{src:`${y}mask.webp`,alt:"Shutter",className:"splash-matte w-full h-full object-cover invert brightness-[15]",style:{mixBlendMode:"screen"}})})}),e.jsxs("div",{className:"fixed inset-0 z-0 overflow-hidden pointer-events-none",children:[_&&e.jsx("img",{src:`${y}${a.backdropImage||"clara-2.png"}`,alt:"Backdrop",className:`w-full h-full object-cover ${a.backdropImageClass||"opacity-[0.25] saturate-50 blur-[2px] transform scale-105"}`}),I(),e.jsx("div",{className:`absolute inset-0 ${a.overlayClass||"bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]"}`}),e.jsx("div",{className:`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-screen ${a.orbPrimaryClass||"bg-cyan-500/10"}`}),e.jsx("div",{className:`absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] mix-blend-screen ${a.orbSecondaryClass||"bg-blue-600/10"}`})]}),e.jsxs("div",{className:"relative z-[60] flex flex-col items-center justify-center min-h-screen pt-32 pb-12 px-4 max-w-7xl mx-auto",children:[e.jsxs("div",{className:"hero-content text-center mb-20 w-full",children:[e.jsxs("div",{className:`inline-flex items-center gap-2 px-6 py-2 rounded-full backdrop-blur-md border text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] mb-12 ${a.statusBadgeClass||"bg-slate-900/40 border-white/10 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]"}`,children:[e.jsx("span",{className:`w-2 h-2 rounded-full animate-pulse ${a.statusDotClass||"bg-cyan-400 shadow-[0_0_10px_#22d3ee]"}`}),"Svarog Neural Network Active"]}),e.jsx("h1",{className:`hero-title text-6xl md:text-[8rem] font-black tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b drop-shadow-[0_4px_24px_rgba(255,255,255,0.1)] leading-none select-none ${a.heroTitleGradientClass||"from-white via-slate-100 to-slate-400"}`,children:"SVAROG TRACER"}),e.jsxs("div",{className:"max-w-2xl mx-auto mb-16 min-h-[4.5em] px-4",children:[e.jsxs("p",{className:`text-sm md:text-lg leading-relaxed font-light tracking-wide ${a.typeTextClass||"text-slate-300"}`,children:[d,(!i||d.length<g.length)&&e.jsx("span",{className:`inline-block w-2.5 h-6 ml-1.5 animate-pulse align-middle rounded-sm ${a.typeCursorClass||"bg-cyan-400/80"}`})]}),e.jsx("span",{className:`block mt-6 text-[11px] font-bold uppercase tracking-[0.3em] drop-shadow-sm ${a.sublineClass||"text-cyan-300/80"}`,children:"Prediction Deck • Strategic Observation"})]}),e.jsxs("div",{className:"flex flex-wrap justify-center gap-4",children:[e.jsxs("div",{className:`px-6 py-2 border rounded-full text-[10px] uppercase tracking-widest font-medium backdrop-blur-sm ${a.chipPrimaryClass||"bg-slate-900/30 border-white/5 text-slate-400"}`,children:["Ver.",V," FCS"]}),e.jsx("div",{className:`px-6 py-2 border rounded-full text-[10px] uppercase tracking-widest font-medium backdrop-blur-sm ${a.chipSecondaryClass||"bg-cyan-900/20 border-cyan-500/20 text-cyan-200"}`,children:"SYS-Status: Validated"})]}),$&&e.jsxs("div",{className:"mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 rounded-[1.75rem] border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-center backdrop-blur-sm sm:flex-row sm:justify-between sm:text-left",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300",children:"New Player Path"}),e.jsx("p",{className:"mt-1 text-sm text-slate-200",children:"New to Svarog? Start with the Tutorial to learn Live Mode, Caesar Shift, and line forcing before you jump into real manip."})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{type:"button",onClick:()=>h("/tutorial"),className:"rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200 transition-all hover:bg-cyan-500/25",children:"Open Tutorial"}),e.jsx("button",{type:"button",onClick:E,className:"rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:bg-white/5",children:"Dismiss"})]})]}),e.jsx("div",{className:"mt-20 flex justify-center w-full",children:e.jsx("div",{className:"w-full max-w-4xl",children:e.jsx(Q,{theme:a.statsTheme,themeKey:c})})})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-32 px-4 text-left",children:B.map(r=>{const n=typeof r.icon=="string"?null:r.icon;return e.jsxs("div",{onClick:()=>h(r.path),className:`mode-card theme-glass-card group cursor-pointer relative overflow-hidden rounded-[1.5rem] border p-10 transition-all duration-300 ${a.modeCardClass||"hover:border-white/20"}`,children:[e.jsx("div",{className:"absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"}),e.jsxs("div",{className:"relative z-10 flex flex-col h-full",children:[e.jsxs("div",{className:"mb-8 flex items-center justify-between",children:[e.jsx("div",{className:`text-[10px] font-bold uppercase tracking-[0.2em] ${a.modeTitleClass||"text-cyan-400"}`,children:r.title}),e.jsx("div",{className:"text-3xl transition-transform duration-300 ease-out group-hover:scale-105",children:n?e.jsx(n,{className:"h-8 w-8"}):r.icon})]}),e.jsx("h3",{className:`text-xl font-bold mb-3 tracking-tight transition-colors ${a.modeLabelClass||"text-white group-hover:text-cyan-100"}`,children:r.label}),e.jsx("p",{className:`text-sm leading-relaxed transition-colors mt-auto ${a.modeDescClass||"text-slate-400 group-hover:text-slate-300"}`,children:r.desc})]}),e.jsx("div",{className:`pointer-events-none absolute -bottom-12 -right-12 h-28 w-28 rounded-full blur-[40px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${a.modeGlowClass||"bg-cyan-600/16"}`})]},r.path)})}),e.jsxs("footer",{className:`w-full pt-16 pb-12 text-center mt-auto border-t relative z-10 ${a.footerBorderClass||"border-white/5"}`,children:[e.jsx("p",{className:`text-[10px] uppercase tracking-widest mb-10 font-medium ${a.footerTextClass||"text-slate-500/80"}`,children:"Svarog Tracer Observation Engine"}),e.jsx("div",{className:`flex justify-center gap-12 ${a.footerMetaClass||"text-slate-400/70"}`,children:["Mainframe Doc","Server Heartbeat","Data Integrity: 100%"].map(r=>e.jsx("span",{className:`text-[10px] uppercase font-semibold transition-all cursor-pointer tracking-wider ${a.footerMetaHoverClass||"hover:text-cyan-400"}`,children:r},r))}),e.jsxs("div",{className:"flex justify-center gap-6 mt-10",children:[e.jsx("a",{href:"https://discord.gg/AtGzKP7qnZ",target:"_blank",rel:"noopener noreferrer",className:`px-5 py-2 border rounded-full text-[10px] uppercase font-semibold tracking-widest transition-all cursor-pointer ${a.footerDiscordClass||"bg-slate-900/30 border-white/5 hover:border-cyan-500/30 hover:bg-slate-800/50 text-slate-300"}`,children:"Discord"}),e.jsx("a",{href:"https://discord.gg/YqAeBjpbE4",target:"_blank",rel:"noopener noreferrer",className:`px-5 py-2 border rounded-full text-[10px] uppercase font-semibold tracking-widest transition-all cursor-pointer ${a.footerSocietyClass||"bg-blue-900/20 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-900/40 text-blue-200"}`,children:"The Genius Society"})]})]})]})]})}export{oe as default};
