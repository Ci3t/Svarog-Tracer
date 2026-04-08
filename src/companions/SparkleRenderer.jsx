import React, { useEffect, useRef, useState, useCallback } from 'react';

const MODEL_PATH = '/companions/bailu/bailu.model3.json';

const W            = 280;
const H            = 700;
const SCALE_FILL   = 1.35;
const Y_OFFSET_FRAC = 0.02;

// ── Debug panel styles (all inline so no CSS dependency) ────────────
const S = {
  panel: {
    position: 'fixed',
    top: 80,
    left: 20,
    zIndex: 99999,
    background: 'rgba(10,8,20,0.96)',
    border: '1px solid rgba(167,139,250,0.3)',
    borderRadius: 12,
    padding: '12px 14px',
    width: 320,
    maxHeight: '70vh',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#c4b5fd',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
    userSelect: 'none',
  },
  toggle: {
    position: 'fixed',
    bottom: 20,
    left: 20,
    zIndex: 10000,
    background: 'rgba(167,139,250,0.15)',
    border: '1px solid rgba(167,139,250,0.4)',
    borderRadius: 8,
    padding: '5px 10px',
    color: '#c4b5fd',
    fontFamily: 'monospace',
    fontSize: 10,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
  section: { marginBottom: 10 },
  heading: { color: '#e9d5ff', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' },
  row: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  btn: {
    background: 'rgba(167,139,250,0.1)',
    border: '1px solid rgba(167,139,250,0.25)',
    borderRadius: 6,
    color: '#ddd6fe',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  btnActive: {
    background: 'rgba(167,139,250,0.35)',
    border: '1px solid #a78bfa',
    borderRadius: 6,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  status: { color: 'rgba(167,139,250,0.5)', fontSize: 10, marginBottom: 8 },
  divider: { borderTop: '1px solid rgba(167,139,250,0.12)', margin: '8px 0' },
  close: { float: 'right', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 },
};

function Live2DDebugPanel({ liveRef }) {
  const [open, setOpen]             = useState(false);
  const [motions, setMotions]       = useState({});     // { groupName: count }
  const [expressions, setExpressions] = useState([]);   // [{ name, index }]
  const [active, setActive]         = useState(null);   // 'motion:Group:0' | 'expr:0'

  // Extract motion/expression definitions from the loaded model
  const refresh = useCallback(() => {
    const model = liveRef.current?.model;
    if (!model) return;

    // ── Motions ──────────────────────────────────────────────────
    // pixi-live2d-display exposes definitions via internalModel.motionManager
    const mm = model.internalModel?.motionManager;
    const defs = mm?.definitions || {}; // { GroupName: [{File, FadeInTime,...}] }
    const motionMap = {};
    for (const [group, arr] of Object.entries(defs)) {
      motionMap[group] = Array.isArray(arr) ? arr.length : 0;
    }
    setMotions(motionMap);

    // ── Expressions ──────────────────────────────────────────────
    // pixi-live2d-display stores them as model.internalModel.motionManager.expressionManager
    const em = model.internalModel?.motionManager?.expressionManager;
    const exprDefs = em?.definitions || [];
    const exprList = exprDefs.map((d, i) => ({
      name:  d?.Name || d?.File || `expr_${i}`,
      index: i,
    }));
    setExpressions(exprList);
  }, [liveRef]);

  const playMotion = useCallback((group, idx) => {
    const model = liveRef.current?.model;
    if (!model) return;
    try {
      model.motion(group, idx);
      setActive(`motion:${group}:${idx}`);
    } catch (e) {
      console.warn('[Debug] motion failed', group, idx, e);
    }
  }, [liveRef]);

  const playExpr = useCallback((idx) => {
    const model = liveRef.current?.model;
    if (!model) return;
    try {
      model.expression(idx);
      setActive(`expr:${idx}`);
    } catch (e) {
      console.warn('[Debug] expression failed', idx, e);
    }
  }, [liveRef]);

  // Refresh whenever panel opens
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) {
    return (
      <button style={S.toggle} onClick={() => setOpen(true)}>
        🎭 L2D Debug
      </button>
    );
  }

  return (
    <div style={S.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: '#e9d5ff', fontWeight: 700, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Live2D Inspector
        </div>
        <button 
          style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: 4, color: '#ffb3b3', cursor: 'pointer', fontSize: 12, padding: '2px 8px', fontWeight: 'bold' }} 
          onClick={() => setOpen(false)}
        >
          ✕ Close
        </button>
      </div>

      {/* ── Motions ── */}
      <div style={S.section}>
        <div style={S.heading}>Motions</div>
        {Object.keys(motions).length === 0 && (
          <div style={S.status}>no motions found — model may not be loaded yet</div>
        )}
        {Object.entries(motions).map(([group, count]) => (
          <div key={group} style={{ marginBottom: 6 }}>
            <span style={{ color: 'rgba(167,139,250,0.6)', marginRight: 6 }}>{group}</span>
            <div style={S.row}>
              {Array.from({ length: count }, (_, i) => {
                const key = `motion:${group}:${i}`;
                return (
                  <button
                    key={i}
                    style={active === key ? S.btnActive : S.btn}
                    onClick={() => playMotion(group, i)}
                  >
                    [{i}]
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={S.divider} />

      {/* ── Expressions ── */}
      <div style={S.section}>
        <div style={S.heading}>Expressions</div>
        {expressions.length === 0 && (
          <div style={S.status}>no expressions found</div>
        )}
        <div style={S.row}>
          {expressions.map(({ name, index }) => {
            const key = `expr:${index}`;
            return (
              <button
                key={index}
                style={active === key ? S.btnActive : S.btn}
                onClick={() => playExpr(index)}
                title={`expression ${index}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={S.divider} />
      <div style={S.status}>
        Click any button above to play it on the model.<br />
        Note the name/index of the ones you want to use.
      </div>
      <button style={{ ...S.btn, marginTop: 4 }} onClick={refresh}>↺ Refresh</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

export default function SparkleRenderer({ isTalking, debug = false }) {
  const canvasRef = useRef(null);
  const liveRef   = useRef({ app: null, model: null, dead: false, motionTimer: null });
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const live = liveRef.current;
    live.dead = false;

    const timerId = setTimeout(async () => {
      if (live.dead || !canvasRef.current) return;

      let PIXIns, Application, Live2DModel;
      try {
        PIXIns      = await import('pixi.js');
        Application = PIXIns.Application ?? PIXIns.default?.Application;
        const cubism4 = await import('pixi-live2d-display/cubism4');
        Live2DModel = cubism4.Live2DModel;
      } catch (e) {
        console.error('[Sparkle] import failed', e);
        setStatus('error');
        return;
      }

      if (live.dead || !canvasRef.current) return;
      if (!Application) {
        console.error('[Sparkle] PIXI.Application is undefined');
        setStatus('error');
        return;
      }

      window.PIXI = { ...PIXIns };
      if (!window.PIXI.Application) window.PIXI.Application = Application;

      try {
        const app = new Application({
          view:            canvasRef.current,
          width:           W,
          height:          H,
          backgroundAlpha: 0,
          antialias:       true,
          resolution:      1,
        });
        live.app = app;

        // Shim legacy interaction plugin
        try {
          if (app.renderer?.events) {
            if (!app.renderer.plugins) app.renderer.plugins = {};
            if (!app.renderer.plugins.interaction)
              app.renderer.plugins.interaction = app.renderer.events;
          }
        } catch (_) {}

        app.stage.eventMode          = 'none';
        app.stage.interactiveChildren = false;

        const model = await Live2DModel.from(MODEL_PATH, {
          autoInteract: false,
          ticker:        app.ticker,
        });

        if (live.dead) { model.destroy(); return; }

        model.eventMode          = 'none';
        model.interactive        = false;
        model.interactiveChildren = false;

        live.model = model;
        app.stage.addChild(model);

        // ── Manual Lip Sync ───────────
        live.isTalking = false;
        app.ticker.add(() => {
          if (live.dead || !live.model) return;
          const coreModel = live.model.internalModel?.coreModel;
          if (!coreModel) return;
          
          if (live.isTalking) {
            // Randomly open/close mouth when talking to simulate speech
            const flap = (Math.sin(Date.now() / 60) * 0.5 + 0.5) * (0.5 + Math.random() * 0.5);
            coreModel.setParameterValueById('ParamMouthOpenY', flap);
          } else {
            // Ensure mouth is closed
            coreModel.setParameterValueById('ParamMouthOpenY', 0);
          }
        });

        // ── Scale & frame ──────────────────────────────────────
        const rawW = model.internalModel.originalWidth  || model.internalModel.width  || 1000;
        const rawH = model.internalModel.originalHeight || model.internalModel.height || 2000;
        const s    = (W * SCALE_FILL) / rawW;

        model.scale.set(s);
        model.x = (W - rawW * s) / 2;
        model.y = -(rawH * s * Y_OFFSET_FRAC);

        // ── Log available motions/expressions to console ───────
        const mm = model.internalModel?.motionManager;
        console.group('[Sparkle] Available motions');
        console.table(mm?.definitions || {});
        console.groupEnd();
        const em = mm?.expressionManager;
        console.group('[Sparkle] Available expressions');
        console.table(em?.definitions || []);
        console.groupEnd();

        // ── Motion scheduler ───────────────────────────────────
        function playIdle() {
          // We don't force 'Idle' anymore because the Idle group is empty.
          // Doing nothing leaves her in the neutral default pose.
        }

        function scheduleExtra() {
          if (live.dead) return;
          if (Math.random() < 0.25) {
            try { live.model?.motion('Extra'); } catch (_) {}
            live.motionTimer = setTimeout(() => {
              playIdle();
              live.motionTimer = setTimeout(scheduleExtra, 15000 + Math.random() * 15000);
            }, 6000 + Math.random() * 4000);
          } else {
            playIdle();
            live.motionTimer = setTimeout(scheduleExtra, 15000 + Math.random() * 15000);
          }
        }

        playIdle();
        live.motionTimer = setTimeout(scheduleExtra, 20000 + Math.random() * 10000);

        setStatus('ready');
        
        // Pick a random expression on load just for variety
        try {
           const em = model.internalModel?.motionManager?.expressionManager;
           if (em && em.definitions && em.definitions.length > 0) {
              const randExpr = Math.floor(Math.random() * em.definitions.length);
              model.expression(randExpr);
           }
        } catch(e) {}
      } catch (e) {
        console.error('[Sparkle] Live2D load failed', e);
        setStatus('error');
      }
    }, 150);

    return () => {
      live.dead = true;
      clearTimeout(timerId);
      clearTimeout(live.motionTimer);
      if (live.app) { live.app.destroy(false); live.app = null; }
      live.model = null;
    };
  }, []);

  const prevTalkingRef = useRef(false);
  useEffect(() => {
    const { model, dead } = liveRef.current;
    if (!model || dead) return;
    
    // Update the liveref talking state so the PIXI ticker animates the mouth
    liveRef.current.isTalking = isTalking;

    if (isTalking === prevTalkingRef.current) return;
    prevTalkingRef.current = isTalking;
    
    // We don't have a clean motion for talking without the hammer.
    // However, Live2D handles lip sync automatically via parameters if we feed it audio.
    // For now we just let her stand neutral. If there IS a good talk expression, 
    // we could set an expression here.
    // try { model.motion(isTalking ? 'Talk' : 'Idle'); } catch (_) {}
  }, [isTalking]);

  return (
    <>
      <div style={{ position: 'relative', width: W, height: H }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block' }} />
        {status === 'loading' && (
          <div style={{
            position: 'absolute', top: 12, left: 0, right: 0,
            textAlign: 'center', color: 'rgba(167,139,250,0.35)',
            fontSize: 9, fontFamily: 'monospace', pointerEvents: 'none',
          }}>INITIALIZING...</div>
        )}
        {status === 'error' && (
          <div style={{
            position: 'absolute', top: 12, left: 0, right: 0,
            textAlign: 'center', color: 'rgba(255,80,80,0.6)',
            fontSize: 9, fontFamily: 'monospace', pointerEvents: 'none',
          }}>MODEL ERROR</div>
        )}
      </div>

      {/* Debug inspector — rendered in a portal-like spot outside the canvas */}
      {debug && <Live2DDebugPanel liveRef={liveRef} />}
    </>
  );
}
