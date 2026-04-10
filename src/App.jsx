import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const DEFAULT_PRODUCTOS = [
  "Cobija estándar","Cobija especial","Cobija premium","Tela polar","Tela fleece",
  "Tela sherpa","Manta infantil","Manta doble","Cobertor","Tela por metro"
];
const DEFAULT_CLIENTES = [
  "Distribuidora Andina","Textiles del Sur","Almacén Central","Comercial Quito","Ferrería Central"
];
const DEFAULT_TIPOS_PERC = ["Cobija estándar","Cobija especial","Tela"];

const ESTADOS_PROD = ["Tejeduría","Perchado","Confección","Terminado","Facturado"];
const ESTADOS_DESP = ["Pendiente","Parcial","Entregado"];
const ESTADOS_FACT = ["❌ No facturado","🟡 Por facturar","✅ Facturado"];
const ESTADOS_PERC = ["En proceso","Terminado","Entregado","Facturado","Pagado"];

const C_PROD = { Tejeduría:"#60a5fa",Perchado:"#a78bfa",Confección:"#f472b6",Terminado:"#34d399",Facturado:"#10b981" };
const C_DESP = { Pendiente:"#fbbf24",Parcial:"#60a5fa",Entregado:"#34d399" };
const C_FACT = { "❌ No facturado":"#f87171","🟡 Por facturar":"#fbbf24","✅ Facturado":"#34d399" };
const C_PERC = { "En proceso":"#60a5fa",Terminado:"#a78bfa",Entregado:"#34d399",Facturado:"#10b981",Pagado:"#6ee7b7" };

const INIT_DATA = {
  ops: [
    { id:"OP-001", fecha:"2026-01-10", cliente:"Distribuidora Andina", obs:"", fechaEntrega:"2026-01-25", items:[
      { pid:1, producto:"Cobija estándar", cantPlan:500, cantProd:500, estado:"Facturado" },
      { pid:2, producto:"Tela polar",      cantPlan:200, cantProd:200, estado:"Facturado" },
    ]},
    { id:"OP-002", fecha:"2026-02-03", cliente:"Textiles del Sur", obs:"Entrega parcial", fechaEntrega:"2026-02-20", items:[
      { pid:1, producto:"Tela polar", cantPlan:800, cantProd:600, estado:"Terminado" },
    ]},
    { id:"OP-003", fecha:"2026-02-18", cliente:"Almacén Central", obs:"", fechaEntrega:"2026-03-10", items:[
      { pid:1, producto:"Cobija especial", cantPlan:300, cantProd:0, estado:"Tejeduría" },
      { pid:2, producto:"Manta infantil",  cantPlan:100, cantProd:0, estado:"Tejeduría" },
    ]},
  ],
  despachos: [
    { id:"D-001", fecha:"2026-01-26", op:"OP-001", cliente:"Distribuidora Andina", obs:"", items:[
      { pid:1, producto:"Cobija estándar", cant:500, entregadoA:"Bodega Norte", estadoDesp:"Entregado", estadoFact:"✅ Facturado", numFact:"F-0042" },
    ]},
    { id:"D-002", fecha:"2026-02-21", op:"Sin OP", cliente:"Textiles del Sur", obs:"Venta directa sin orden", items:[
      { pid:1, producto:"Tela polar", cant:100, entregadoA:"Almacén Sur", estadoDesp:"Entregado", estadoFact:"✅ Facturado", numFact:"F-0043" },
    ]},
  ],
  perchados: [
    { id:"PC-001", fechaIng:"2026-01-15", fechaEnt:"2026-01-22", cliente:"Distribuidora Andina", op:"OP-001", obs:"", items:[
      { pid:1, tipo:"Cobija estándar", kg:250, precio:3.5, estado:"Pagado" },
      { pid:2, tipo:"Tela",            kg:80,  precio:2.8, estado:"Pagado" },
    ]},
    { id:"PC-002", fechaIng:"2026-03-06", fechaEnt:"2026-03-15", cliente:"Almacén Central", op:"Sin OP", obs:"Servicio externo", items:[
      { pid:1, tipo:"Cobija especial", kg:180, precio:4.0, estado:"En proceso" },
    ]},
  ],
};

let _uid = 300;
const uid = () => ++_uid;
const nextId = (prefix, arr) => `${prefix}-${String(arr.length + 1).padStart(3,"0")}`;

// ── UI ATOMS ────────────────────────────────────────────────────────────────
function Badge({ label, colorMap }) {
  const c = colorMap?.[label] || "#94a3b8";
  return <span style={{ background:c+"22", color:c, border:`1px solid ${c}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{label}</span>;
}
function Th({ children, style={} }) {
  return <th style={{ padding:"10px 12px", textAlign:"left", color:"#475569", fontSize:11, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", whiteSpace:"nowrap", background:"#080f1e", borderBottom:"1px solid #1e293b", ...style }}>{children}</th>;
}
function Td({ children, accent, bold, style={} }) {
  return <td style={{ padding:"9px 12px", fontSize:13, color:accent||"#cbd5e1", fontWeight:bold?700:400, verticalAlign:"middle", ...style }}>{children}</td>;
}
function KPI({ label, value, sub, color, icon }) {
  return (
    <div style={{ background:"#0f172a", border:`1px solid ${color}33`, borderRadius:13, padding:"18px 20px", flex:1, minWidth:130 }}>
      <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
      <div style={{ color:"#475569", fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{label}</div>
      <div style={{ color, fontSize:26, fontWeight:900, lineHeight:1.1, marginTop:3 }}>{value}</div>
      {sub && <div style={{ color:"#475569", fontSize:11, marginTop:3 }}>{sub}</div>}
    </div>
  );
}
function Sel({ value, onChange, options, style={} }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155", borderRadius:7, padding:"5px 8px", fontSize:12, ...style }}>
      {options.map(o=><option key={o}>{o}</option>)}
    </select>
  );
}
function Inp({ value, onChange, type="text", placeholder="", style={} }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
      style={{ background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155", borderRadius:7, padding:"5px 8px", fontSize:12, boxSizing:"border-box", ...style }} />
  );
}
function IconBtn({ onClick, title, color="#64748b", children }) {
  return <button onClick={onClick} title={title} style={{ background:"transparent", border:"none", cursor:"pointer", color, fontSize:14, padding:"2px 5px", borderRadius:5, lineHeight:1 }}>{children}</button>;
}
function LabelField({ label, children }) {
  return (
    <div>
      <label style={{ color:"#475569", fontSize:10, fontWeight:700, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:.8 }}>{label}</label>
      {children}
    </div>
  );
}
function EstadoStep({ estado }) {
  const idx = ESTADOS_PROD.indexOf(estado);
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {ESTADOS_PROD.map((e,i) => {
        const active = i===idx, done = i<idx;
        const c = C_PROD[e];
        return (
          <div key={e} style={{ display:"flex", alignItems:"center" }}>
            <div title={e} style={{ width:9, height:9, borderRadius:"50%", background:active?c:done?"#334155":"#1e293b", border:`2px solid ${active?c:done?"#475569":"#1e293b"}`, boxShadow:active?`0 0 5px ${c}`:"none" }} />
            {i<ESTADOS_PROD.length-1 && <div style={{ width:12, height:2, background:done?"#334155":"#1e293b" }} />}
          </div>
        );
      })}
      <span style={{ marginLeft:6, fontSize:11, fontWeight:700, color:C_PROD[estado]||"#64748b" }}>{estado}</span>
    </div>
  );
}

// ── CONFIRM DELETE ───────────────────────────────────────────────────────────
function ConfirmDel({ label, onConfirm, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#0f172a", border:"1px solid #7f1d1d", borderRadius:16, padding:"32px 36px", width:360, textAlign:"center" }}>
        <div style={{ fontSize:34, marginBottom:10 }}>🗑️</div>
        <div style={{ fontWeight:800, fontSize:16, color:"#f1f5f9", marginBottom:8 }}>¿Eliminar registro?</div>
        <div style={{ color:"#64748b", fontSize:13, marginBottom:22 }}>{label}<br/>Esta acción no se puede deshacer.</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#94a3b8", border:"none", borderRadius:9, padding:"9px 22px", cursor:"pointer", fontWeight:700 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ background:"#dc2626", color:"#fff", border:"none", borderRadius:9, padding:"9px 22px", cursor:"pointer", fontWeight:800 }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL OP ─────────────────────────────────────────────────────────────────
function ModalOP({ initial, productos, clientes, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
  ...JSON.parse(JSON.stringify(initial)),
  numero: initial?.id ? initial.id.replace("OP-", "") : ""
} : {
  fecha:"",
  cliente:clientes[0]||"",
  obs:"",
  fechaEntrega:"",
  numero:"",
  items:[{ pid:uid(), producto:productos[0]||"", cantPlan:"", cantProd:"", estado:"Tejeduría" }]
});
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const si = (pid,k,v) => setForm(f=>({...f, items:f.items.map(it=>it.pid===pid?{...it,[k]:v}:it)}));
  const addItem = () => setForm(f=>({...f, items:[...f.items,{ pid:uid(), producto:productos[0]||"", cantPlan:"", cantProd:"0", estado:"Tejeduría" }]}));
  const rmItem  = pid => setForm(f=>({...f, items:f.items.filter(it=>it.pid!==pid)}));

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:20, padding:"28px 32px", width:680, maxWidth:"97vw", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 80px #0009" }}>
        <div style={{ fontWeight:900, fontSize:17, color:"#f1f5f9", marginBottom:20 }}>{initial?.id?"✏️ Editar OP":"➕ Nueva Orden de Producción"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <LabelField label="Fecha"><Inp type="date" value={form.fecha} onChange={v=>sf("fecha",v)} style={{ width:"100%" }} /></LabelField>
          <LabelField label="Número OP">
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <span style={{ color:"#94a3b8", fontWeight:700 }}>OP-</span>
    <Inp
      value={form.numero}
      onChange={v=>sf("numero", v.replace(/\D/g, ""))}
      placeholder="001"
      style={{ width:"100%" }}
    />
  </div>
</LabelField>
          <LabelField label="Fecha Estimada Entrega"><Inp type="date" value={form.fechaEntrega} onChange={v=>sf("fechaEntrega",v)} style={{ width:"100%" }} /></LabelField>
          <div style={{ gridColumn:"1/3" }}>
            <LabelField label="Cliente">
              <div style={{ display:"flex", gap:8 }}>
                <Sel value={form.cliente} onChange={v=>sf("cliente",v)} options={clientes} style={{ flex:1 }} />
                <Inp value={form.cliente} onChange={v=>sf("cliente",v)} placeholder="O escribe uno nuevo..." style={{ flex:1 }} />
              </div>
            </LabelField>
          </div>
          <div style={{ gridColumn:"1/3" }}>
            <LabelField label="Observaciones">
              <textarea value={form.obs} onChange={e=>sf("obs",e.target.value)} rows={2}
                style={{ width:"100%", background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155", borderRadius:7, padding:"7px 10px", fontSize:12, resize:"vertical", boxSizing:"border-box" }} />
            </LabelField>
          </div>
        </div>
        <div style={{ color:"#475569", fontSize:10, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>Productos</div>
        <div style={{ background:"#080f1e", borderRadius:10, overflow:"auto", border:"1px solid #1e293b", marginBottom:10 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
            <thead><tr><Th>Producto</Th><Th>Cant. Plan.</Th><Th>Cant. Prod.</Th><Th>Estado Producción</Th><Th></Th></tr></thead>
            <tbody>
              {form.items.map((it,i)=>(
                <tr key={it.pid} style={{ borderTop:i>0?"1px solid #1e293b":"none" }}>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.producto} onChange={v=>si(it.pid,"producto",v)} options={productos} style={{ width:168 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp type="number" value={it.cantPlan} onChange={v=>si(it.pid,"cantPlan",v)} style={{ width:80 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp type="number" value={it.cantProd} onChange={v=>si(it.pid,"cantProd",v)} style={{ width:80 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.estado} onChange={v=>si(it.pid,"estado",v)} options={ESTADOS_PROD} style={{ color:C_PROD[it.estado], fontWeight:700, width:140 }} /></td>
                  <td style={{ padding:"7px 9px" }}>{form.items.length>1 && <IconBtn onClick={()=>rmItem(it.pid)} color="#f87171">✕</IconBtn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} style={{ background:"#1e293b", color:"#60a5fa", border:"1px dashed #334155", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:12, fontWeight:700, marginBottom:22 }}>+ Agregar producto</button>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#64748b", border:"none", borderRadius:9, padding:"9px 20px", cursor:"pointer", fontWeight:700 }}>Cancelar</button>
          <button onClick={()=>onSave(form)} style={{ background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", border:"none", borderRadius:9, padding:"9px 24px", cursor:"pointer", fontWeight:800 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL DESPACHO ───────────────────────────────────────────────────────────
function ModalDesp({ initial, opIds, productos, clientes, onSave, onClose }) {
  const opOpts = ["Sin OP", ...opIds];
  const [form, setForm] = useState(initial ? {
  ...JSON.parse(JSON.stringify(initial)),
  numero: initial?.id ? initial.id.replace("D-", "") : ""
} : {
  fecha:"",
  op:"Sin OP",
  cliente:clientes[0]||"",
  obs:"",
  numero:"",
  items:[{ pid:uid(), producto:productos[0]||"", cant:"", entregadoA:"", estadoDesp:"Pendiente", estadoFact:"❌ No facturado", numFact:"" }]
});
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const si = (pid,k,v) => setForm(f=>({...f, items:f.items.map(it=>it.pid===pid?{...it,[k]:v}:it)}));
  const addItem = () => setForm(f=>({...f, items:[...f.items,{ pid:uid(), producto:productos[0]||"", cant:"", entregadoA:"", estadoDesp:"Pendiente", estadoFact:"❌ No facturado", numFact:"" }]}));
  const rmItem  = pid => setForm(f=>({...f, items:f.items.filter(it=>it.pid!==pid)}));

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:20, padding:"28px 32px", width:820, maxWidth:"97vw", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 80px #0009" }}>
        <div style={{ fontWeight:900, fontSize:17, color:"#f1f5f9", marginBottom:20 }}>{initial?.id?"✏️ Editar Despacho":"➕ Nuevo Despacho"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
          <LabelField label="Fecha"><Inp type="date" value={form.fecha} onChange={v=>sf("fecha",v)} style={{ width:"100%" }} /></LabelField>

          <LabelField label="Número Despacho">
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <span style={{ color:"#94a3b8", fontWeight:700 }}>D-</span>
    <Inp
      value={form.numero}
      onChange={v=>sf("numero", v.replace(/\D/g, ""))}
      placeholder="001"
      style={{ width:"100%" }}
    />
  </div>
</LabelField>
          <LabelField label="OP # (opcional)">
            <Sel value={form.op} onChange={v=>sf("op",v)} options={opOpts} style={{ width:"100%", color: form.op==="Sin OP"?"#94a3b8":"#e2e8f0", fontStyle: form.op==="Sin OP"?"italic":"normal" }} />
          </LabelField>
          <LabelField label="Cliente">
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <Sel value={form.cliente} onChange={v=>sf("cliente",v)} options={clientes} style={{ width:"100%" }} />
              <Inp value={form.cliente} onChange={v=>sf("cliente",v)} placeholder="O escribe uno nuevo..." style={{ width:"100%" }} />
            </div>
          </LabelField>
          <div style={{ gridColumn:"1/4" }}>
            <LabelField label="Observaciones">
              <textarea value={form.obs} onChange={e=>sf("obs",e.target.value)} rows={2}
                style={{ width:"100%", background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155", borderRadius:7, padding:"7px 10px", fontSize:12, resize:"vertical", boxSizing:"border-box" }} />
            </LabelField>
          </div>
        </div>
        <div style={{ color:"#475569", fontSize:10, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>Productos despachados</div>
        <div style={{ background:"#080f1e", borderRadius:10, overflow:"auto", border:"1px solid #1e293b", marginBottom:10 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead><tr><Th>Producto</Th><Th>Cantidad</Th><Th>Entregado A</Th><Th>Estado Desp.</Th><Th>Estado Fact.</Th><Th>N° Factura</Th><Th></Th></tr></thead>
            <tbody>
              {form.items.map((it,i)=>(
                <tr key={it.pid} style={{ borderTop:i>0?"1px solid #1e293b":"none" }}>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.producto} onChange={v=>si(it.pid,"producto",v)} options={productos} style={{ width:155 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp type="number" value={it.cant} onChange={v=>si(it.pid,"cant",v)} style={{ width:72 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp value={it.entregadoA} onChange={v=>si(it.pid,"entregadoA",v)} style={{ width:120 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.estadoDesp} onChange={v=>si(it.pid,"estadoDesp",v)} options={ESTADOS_DESP} style={{ color:C_DESP[it.estadoDesp], fontWeight:700 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.estadoFact} onChange={v=>si(it.pid,"estadoFact",v)} options={ESTADOS_FACT} style={{ fontSize:11, width:140 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp value={it.numFact} onChange={v=>si(it.pid,"numFact",v)} placeholder="F-XXXX" style={{ width:90 }} /></td>
                  <td style={{ padding:"7px 9px" }}>{form.items.length>1 && <IconBtn onClick={()=>rmItem(it.pid)} color="#f87171">✕</IconBtn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} style={{ background:"#1e293b", color:"#f59e0b", border:"1px dashed #334155", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:12, fontWeight:700, marginBottom:22 }}>+ Agregar producto</button>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#64748b", border:"none", borderRadius:9, padding:"9px 20px", cursor:"pointer", fontWeight:700 }}>Cancelar</button>
          <button onClick={()=>onSave(form)} style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"#fff", border:"none", borderRadius:9, padding:"9px 24px", cursor:"pointer", fontWeight:800 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL PERCHADO ───────────────────────────────────────────────────────────
function ModalPerc({ initial, opIds, clientes, tiposPerc, onSave, onClose }) {
  const opOpts = ["Sin OP", ...opIds];
  const [form, setForm] = useState(
  initial
    ? {
        ...JSON.parse(JSON.stringify(initial)),
        numero: initial?.id ? initial.id.replace("PC-", "") : "",
      }
    : {
        fechaIng: "",
        fechaEnt: "",
        cliente: clientes[0] || "",
        op: "Sin OP",
        obs: "",
        numero: "",
        items: [
          {
            pid: uid(),
            tipo: tiposPerc[0] || "",
            kg: "",
            precio: "",
            estado: "En proceso",
          },
        ],
      }
);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const si = (pid,k,v) => setForm(f=>({...f, items:f.items.map(it=>it.pid===pid?{...it,[k]:v}:it)}));
  const addItem = () => setForm(f=>({...f, items:[...f.items,{ pid:uid(), tipo:tiposPerc[0]||"", kg:"", precio:"", estado:"En proceso" }]}));
  const rmItem  = pid => setForm(f=>({...f, items:f.items.filter(it=>it.pid!==pid)}));
  const totalOP = form.items.reduce((s,it)=>s+((+it.kg||0)*(+it.precio||0)),0);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:20, padding:"28px 32px", width:660, maxWidth:"97vw", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 80px #0009" }}>
        <div style={{ fontWeight:900, fontSize:17, color:"#f1f5f9", marginBottom:20 }}>{initial?.id?"✏️ Editar Orden de Perchado":"➕ Nueva Orden de Perchado"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
          <LabelField label="Fecha Ingreso"><Inp type="date" value={form.fechaIng} onChange={v=>sf("fechaIng",v)} style={{ width:"100%" }} /></LabelField>
          <LabelField label="Fecha Entrega"><Inp type="date" value={form.fechaEnt} onChange={v=>sf("fechaEnt",v)} style={{ width:"100%" }} /></LabelField>
          <LabelField label="Número Perchado">
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <span style={{ color:"#94a3b8", fontWeight:700 }}>PC-</span>
    <Inp
      value={form.numero}
      onChange={v=>sf("numero", v.replace(/\D/g, ""))}
      placeholder="001"
      style={{ width:"100%" }}
    />
  </div>
</LabelField>
          <LabelField label="OP # (opcional)">
            <Sel value={form.op} onChange={v=>sf("op",v)} options={opOpts} style={{ width:"100%", color:form.op==="Sin OP"?"#94a3b8":"#e2e8f0", fontStyle:form.op==="Sin OP"?"italic":"normal" }} />
          </LabelField>
          <div style={{ gridColumn:"1/3" }}>
            <LabelField label="Cliente">
              <div style={{ display:"flex", gap:6 }}>
                <Sel value={form.cliente} onChange={v=>sf("cliente",v)} options={clientes} style={{ flex:1 }} />
                <Inp value={form.cliente} onChange={v=>sf("cliente",v)} placeholder="O escribe uno nuevo..." style={{ flex:1 }} />
              </div>
            </LabelField>
          </div>
          <LabelField label="Observaciones"><Inp value={form.obs} onChange={v=>sf("obs",v)} style={{ width:"100%" }} /></LabelField>
        </div>
        <div style={{ color:"#475569", fontSize:10, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>Productos</div>
        <div style={{ background:"#080f1e", borderRadius:10, overflow:"hidden", border:"1px solid #1e293b", marginBottom:8 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><Th>Tipo</Th><Th>kg</Th><Th>$/kg</Th><Th>Total</Th><Th>Estado</Th><Th></Th></tr></thead>
            <tbody>
              {form.items.map((it,i)=>(
                <tr key={it.pid} style={{ borderTop:i>0?"1px solid #1e293b":"none" }}>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.tipo} onChange={v=>si(it.pid,"tipo",v)} options={tiposPerc} style={{ width:155 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp type="number" value={it.kg} onChange={v=>si(it.pid,"kg",v)} style={{ width:72 }} /></td>
                  <td style={{ padding:"7px 9px" }}><Inp type="number" value={it.precio} onChange={v=>si(it.pid,"precio",v)} style={{ width:72 }} /></td>
                  <td style={{ padding:"7px 9px", fontWeight:700, color:"#34d399", fontSize:13 }}>${((+it.kg||0)*(+it.precio||0)).toFixed(2)}</td>
                  <td style={{ padding:"7px 9px" }}><Sel value={it.estado} onChange={v=>si(it.pid,"estado",v)} options={ESTADOS_PERC} style={{ color:C_PERC[it.estado], fontWeight:700 }} /></td>
                  <td style={{ padding:"7px 9px" }}>{form.items.length>1 && <IconBtn onClick={()=>rmItem(it.pid)} color="#f87171">✕</IconBtn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button onClick={addItem} style={{ background:"#1e293b", color:"#a78bfa", border:"1px dashed #334155", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:12, fontWeight:700 }}>+ Agregar producto</button>
          <div style={{ fontWeight:900, fontSize:16, color:"#34d399" }}>Total OP: ${totalOP.toFixed(2)}</div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#64748b", border:"none", borderRadius:9, padding:"9px 20px", cursor:"pointer", fontWeight:700 }}>Cancelar</button>
          <button onClick={()=>onSave(form)} style={{ background:"linear-gradient(135deg,#8b5cf6,#a855f7)", color:"#fff", border:"none", borderRadius:9, padding:"9px 24px", cursor:"pointer", fontWeight:800 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsSection({
  title,
  color,
  items,
  inputVal,
  setInputVal,
  onAdd,
  onDelete,
  onEdit,
  icon
}) {
  return (
    <div style={{ background:"#0f172a", border:`1px solid ${color}33`, borderRadius:14, padding:"22px 24px" }}>
      <div style={{ fontWeight:800, fontSize:14, color, marginBottom:16 }}>{icon} {title}</div>

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <Inp
          value={inputVal}
          onChange={setInputVal}
          placeholder={`Nuevo ${title.toLowerCase()}...`}
          style={{ flex:1 }}
          onKeyDown={async (e)=>{
            if(e.key==="Enter"){
              await onAdd(inputVal);
              setInputVal("");
            }
          }}
        />
        <button
          onClick={async ()=>{
            await onAdd(inputVal);
            setInputVal("");
          }}
          style={{ background:color, color:"#fff", border:"none", borderRadius:8, padding:"6px 16px", cursor:"pointer", fontWeight:700, fontSize:13 }}
        >
          Agregar
        </button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:300, overflowY:"auto" }}>
        {items.map((item) => (
          <div key={item} style={{ display:"flex", alignItems:"center", gap:8, background:"#1e293b", borderRadius:8, padding:"8px 12px" }}>
            <span style={{ flex:1, fontSize:13, color:"#e2e8f0" }}>{item}</span>

            <button
              onClick={async () => {
                const nuevo = prompt(`Editar ${title.toLowerCase()}:`, item);
                if (nuevo && nuevo.trim() && nuevo !== item) {
                  await onEdit(item, nuevo);
                }
              }}
              style={{ background:"transparent", border:"none", cursor:"pointer", color:"#60a5fa", fontSize:14 }}
              title="Editar"
            >
              ✏️
            </button>

            <button
              onClick={async () => {
                const ok = confirm(`¿Eliminar "${item}"?`);
                if (ok) {
                  await onDelete(item);
                }
              }}
              style={{ background:"transparent", border:"none", cursor:"pointer", color:"#f87171", fontSize:14 }}
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        ))}

        {items.length===0 && <div style={{ color:"#475569", fontSize:12, textAlign:"center", padding:12 }}>Sin elementos</div>}
      </div>
    </div>
  );
}
function SettingsTab({
  config,
  onAddProducto,
  onDeleteProducto,
  onEditProducto,
  onAddCliente,
  onDeleteCliente,
  onEditCliente,
  onAddTipoPerc,
  onDeleteTipoPerc,
  onEditTipoPerc,
}) {
  const [newProducto, setNewProducto] = useState("");
  const [newCliente, setNewCliente] = useState("");
  const [newTipo, setNewTipo] = useState("");

 
  return (
    <div style={{ padding:"24px 28px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ fontWeight:900, fontSize:19, color:"#f1f5f9", marginBottom:6, letterSpacing:-.3 }}>⚙️ Configuración</div>
      <div style={{ color:"#475569", fontSize:13, marginBottom:24 }}>Administra los catálogos que se usan en todos los módulos.</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
        <SettingsSection
          title="Productos"
          color="#3b82f6"
          icon="📦"
          items={config.productos}
          inputVal={newProducto}
          setInputVal={setNewProducto}
          onAdd={onAddProducto}
          onDelete={onDeleteProducto}
          onEdit={onEditProducto}
        />

        <SettingsSection
          title="Clientes"
          color="#f59e0b"
          icon="🏢"
          items={config.clientes}
          inputVal={newCliente}
          setInputVal={setNewCliente}
          onAdd={onAddCliente}
          onDelete={onDeleteCliente}
          onEdit={onEditCliente}
        />

        <SettingsSection
          title="Tipos de Perchado"
          color="#a78bfa"
          icon="🔵"
          items={config.tiposPerc}
          inputVal={newTipo}
          setInputVal={setNewTipo}
          onAdd={onAddTipoPerc}
          onDelete={onDeleteTipoPerc}
          onEdit={onEditTipoPerc}
        />
      </div>

      <div style={{ marginTop:24, background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"20px 24px" }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#94a3b8", marginBottom:14 }}>🎨 Estados del sistema</div>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
          <div>
            <div style={{ color:"#475569", fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>Producción</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ESTADOS_PROD.map(e=><span key={e} style={{ background:C_PROD[e]+"22", color:C_PROD[e], border:`1px solid ${C_PROD[e]}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{e}</span>)}
            </div>
          </div>

          <div>
            <div style={{ color:"#475569", fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>Despacho</div>
            <div style={{ display:"flex", gap:6 }}>
              {ESTADOS_DESP.map(e=><span key={e} style={{ background:C_DESP[e]+"22", color:C_DESP[e], border:`1px solid ${C_DESP[e]}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{e}</span>)}
            </div>
          </div>

          <div>
            <div style={{ color:"#475569", fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>Perchado</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ESTADOS_PERC.map(e=><span key={e} style={{ background:C_PERC[e]+"22", color:C_PERC[e], border:`1px solid ${C_PERC[e]}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{e}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop:20, background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"20px 24px" }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#94a3b8", marginBottom:10 }}>ℹ️ Acerca de itelq-ops</div>
        <div style={{ color:"#475569", fontSize:13, lineHeight:1.8 }}>
          Sistema de gestión de producción, despachos y perchado.<br/>
          Los cambios en catálogos se aplican inmediatamente en todos los módulos.<br/>
          <span style={{ color:"#334155", fontSize:11 }}>v1.0 · itelq-ops © 2026</span>
        </div>
      </div>
    </div>
  );


  return (
    <div style={{ padding:"24px 28px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ fontWeight:900, fontSize:19, color:"#f1f5f9", marginBottom:6, letterSpacing:-.3 }}>⚙️ Configuración</div>
      <div style={{ color:"#475569", fontSize:13, marginBottom:24 }}>Administra los catálogos que se usan en todos los módulos.</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
        <Section
          title="Productos" color="#3b82f6" icon="📦"
          items={config.productos} addKey="productos"
          inputVal={newProducto} setInputVal={setNewProducto} />
        <Section
          title="Clientes" color="#f59e0b" icon="🏢"
          items={config.clientes} addKey="clientes"
          inputVal={newCliente} setInputVal={setNewCliente} />
        <Section
          title="Tipos de Perchado" color="#a78bfa" icon="🔵"
          items={config.tiposPerc} addKey="tiposPerc"
          inputVal={newTipo} setInputVal={setNewTipo} />
      </div>

      {/* Estados info */}
      <div style={{ marginTop:24, background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"20px 24px" }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#94a3b8", marginBottom:14 }}>🎨 Estados del sistema</div>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
          <div>
            <div style={{ color:"#475569", fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>Producción</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ESTADOS_PROD.map(e=><span key={e} style={{ background:C_PROD[e]+"22", color:C_PROD[e], border:`1px solid ${C_PROD[e]}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{e}</span>)}
            </div>
          </div>
          <div>
            <div style={{ color:"#475569", fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>Despacho</div>
            <div style={{ display:"flex", gap:6 }}>
              {ESTADOS_DESP.map(e=><span key={e} style={{ background:C_DESP[e]+"22", color:C_DESP[e], border:`1px solid ${C_DESP[e]}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{e}</span>)}
            </div>
          </div>
          <div>
            <div style={{ color:"#475569", fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>Perchado</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ESTADOS_PERC.map(e=><span key={e} style={{ background:C_PERC[e]+"22", color:C_PERC[e], border:`1px solid ${C_PERC[e]}55`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{e}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ marginTop:20, background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"20px 24px" }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#94a3b8", marginBottom:10 }}>ℹ️ Acerca de itelq-ops</div>
        <div style={{ color:"#475569", fontSize:13, lineHeight:1.8 }}>
          Sistema de gestión de producción, despachos y perchado.<br/>
          Los cambios en catálogos se aplican inmediatamente en todos los módulos.<br/>
          <span style={{ color:"#334155", fontSize:11 }}>v1.0 · itelq-ops © 2026</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════════════════════
const TABS = ["📋 Dashboard","🏭 Órdenes de Producción","🚚 Despachos","🔵 Órdenes de Perchado","⚙️ Configuración"];

export default function App() {
 useEffect(() => {
  probarConexion();
  cargarCatalogos();
  cargarDespachos();
  cargarOps();
  cargarPerchados();
}, []);

  async function probarConexion() {
    const { data, error } = await supabase.from("clientes").select("*");

    if (error) {
      console.error("Error Supabase:", error);
    } else {
      console.log("Clientes desde Supabase:", data);
    }
  }
  async function cargarCatalogos() {
  const [
    { data: clientesData, error: clientesError },
    { data: productosData, error: productosError },
    { data: tiposPercData, error: tiposPercError },
  ] = await Promise.all([
    supabase.from("clientes").select("nombre").order("nombre"),
    supabase.from("productos").select("nombre").order("nombre"),
    supabase.from("tipos_perchado").select("nombre").order("nombre"),
  ]);

  if (clientesError) console.error("Error clientes:", clientesError);
  if (productosError) console.error("Error productos:", productosError);
  if (tiposPercError) console.error("Error tipos perchado:", tiposPercError);

  setConfig({
    clientes: clientesData ? clientesData.map(x => x.nombre) : [],
    productos: productosData ? productosData.map(x => x.nombre) : [],
    tiposPerc: tiposPercData ? tiposPercData.map(x => x.nombre) : [],
  });
}async function cargarDespachos() {
  const { data: despachosData, error } = await supabase
    .from("despachos")
    .select(`
      id,
      codigo,
      fecha,
      op_codigo,
      observaciones,
      clientes(nombre),
      despacho_items(
        id,
        cantidad,
        entregado_a,
        estado_despacho,
        estado_facturacion,
        numero_factura,
        productos(nombre)
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando despachos:", error);
    return;
  }

  const despachosTransformados = (despachosData || []).map((d) => ({
    id: d.codigo,
    fecha: d.fecha || "",
    op: d.op_codigo || "Sin OP",
    cliente: d.clientes?.nombre || "",
    obs: d.observaciones || "",
    items: (d.despacho_items || []).map((it, index) => ({
      pid: it.id || index + 1,
      producto: it.productos?.nombre || "",
      cant: +it.cantidad || 0,
      entregadoA: it.entregado_a || "",
      estadoDesp: it.estado_despacho || "Pendiente",
      estadoFact: it.estado_facturacion || "❌ No facturado",
      numFact: it.numero_factura || "",
    })),
  }));

  setData((prev) => ({
    ...prev,
    despachos: despachosTransformados,
  }));
}
async function cargarOps() {
  const { data: opsData, error } = await supabase
    .from("ordenes_produccion")
    .select(`
      id,
      codigo,
      fecha,
      fecha_entrega,
      observaciones,
      clientes(nombre),
      op_items(
        id,
        cantidad_planificada,
        cantidad_producida,
        estado,
        productos(nombre)
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando OPs:", error);
    return;
  }

  const opsTransformadas = (opsData || []).map((op) => ({
    id: op.codigo,
    fecha: op.fecha || "",
    cliente: op.clientes?.nombre || "",
    obs: op.observaciones || "",
    fechaEntrega: op.fecha_entrega || "",
    items: (op.op_items || []).map((it, index) => ({
      pid: it.id || index + 1,
      producto: it.productos?.nombre || "",
      cantPlan: +it.cantidad_planificada || 0,
      cantProd: +it.cantidad_producida || 0,
      estado: it.estado || "Tejeduría",
    })),
  }));

  setData((prev) => ({
    ...prev,
    ops: opsTransformadas,
  }));
}
  const [tab, setTab]   = useState(0);
  const [data, setData] = useState({
  ops: [],
  despachos: [],
  perchados: [],
});
  const [config, setConfig] = useState({
  productos: [],
  clientes: [],
  tiposPerc: [],
});
  const [modal, setModal] = useState(null);
  const [del,   setDel]   = useState(null);

  const opIds = data.ops.map(o=>o.id);
  const agregarProducto = async (nombre) => {
  try {
    const valor = nombre.trim();
    if (!valor) return;

    const { error } = await supabase
      .from("productos")
      .insert({ nombre: valor });

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error agregando producto:", error);
    alert("No se pudo agregar el producto.");
  }
};

const eliminarProducto = async (nombre) => {
  try {
    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("nombre", nombre);

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error eliminando producto:", error);
    alert("No se pudo eliminar el producto.");
  }
};

const editarProducto = async (anterior, nuevo) => {
  try {
    const valor = nuevo.trim();
    if (!valor) return;

    const { error } = await supabase
      .from("productos")
      .update({ nombre: valor })
      .eq("nombre", anterior);

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error editando producto:", error);
    alert("No se pudo editar el producto.");
  }
};

const agregarCliente = async (nombre) => {
  try {
    const valor = nombre.trim();
    if (!valor) return;

    const { error } = await supabase
      .from("clientes")
      .insert({ nombre: valor });

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error agregando cliente:", error);
    alert("No se pudo agregar el cliente.");
  }
};

const eliminarCliente = async (nombre) => {
  try {
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("nombre", nombre);

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error eliminando cliente:", error);
    alert("No se pudo eliminar el cliente.");
  }
};

const editarCliente = async (anterior, nuevo) => {
  try {
    const valor = nuevo.trim();
    if (!valor) return;

    const { error } = await supabase
      .from("clientes")
      .update({ nombre: valor })
      .eq("nombre", anterior);

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error editando cliente:", error);
    alert("No se pudo editar el cliente.");
  }
};

const agregarTipoPerc = async (nombre) => {
  try {
    const valor = nombre.trim();
    if (!valor) return;

    const { error } = await supabase
      .from("tipos_perchado")
      .insert({ nombre: valor });

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error agregando tipo de perchado:", error);
    alert("No se pudo agregar el tipo de perchado.");
  }
};

const eliminarTipoPerc = async (nombre) => {
  try {
    const { error } = await supabase
      .from("tipos_perchado")
      .delete()
      .eq("nombre", nombre);

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error eliminando tipo de perchado:", error);
    alert("No se pudo eliminar el tipo de perchado.");
  }
};

const editarTipoPerc = async (anterior, nuevo) => {
  try {
    const valor = nuevo.trim();
    if (!valor) return;

    const { error } = await supabase
      .from("tipos_perchado")
      .update({ nombre: valor })
      .eq("nombre", anterior);

    if (error) throw error;

    await cargarCatalogos();
  } catch (error) {
    console.error("Error editando tipo de perchado:", error);
    alert("No se pudo editar el tipo de perchado.");
  }
};
const [busquedaDesp, setBusquedaDesp] = useState("");
const [filtroEstadoDesp, setFiltroEstadoDesp] = useState("Todos");const despachosFiltrados = [...data.despachos]

  .filter((d) => {
    const texto = busquedaDesp.toLowerCase();

    const coincideBusqueda =
      d.id?.toLowerCase().includes(texto) ||
      d.cliente?.toLowerCase().includes(texto) ||
      d.op?.toLowerCase().includes(texto) ||
      d.obs?.toLowerCase().includes(texto) ||
      d.items?.some((it) =>
        it.producto?.toLowerCase().includes(texto)
      );

    const coincideEstado =
      filtroEstadoDesp === "Todos" ||
      d.items?.some((it) => it.estadoDesp === filtroEstadoDesp);

    return coincideBusqueda && coincideEstado;
  })
  
  .sort((a, b) => {
    const prioridad = {
      Pendiente: 1,
      Parcial: 2,
      Entregado: 3,
    };

    const estadoA = a.items?.[0]?.estadoDesp || "Pendiente";
    const estadoB = b.items?.[0]?.estadoDesp || "Pendiente";

    return (prioridad[estadoA] || 99) - (prioridad[estadoB] || 99);
  });
  const [busquedaOp, setBusquedaOp] = useState("");
  const [busquedaPerc, setBusquedaPerc] = useState("");
const [filtroEstadoPerc, setFiltroEstadoPerc] = useState("Todos");
const perchadosFiltrados = [...data.perchados]
  .filter((p) => {
    const texto = busquedaPerc.toLowerCase();

    const coincideBusqueda =
      p.id?.toLowerCase().includes(texto) ||
      p.cliente?.toLowerCase().includes(texto) ||
      p.op?.toLowerCase().includes(texto) ||
      p.obs?.toLowerCase().includes(texto) ||
      p.items?.some((it) => it.tipo?.toLowerCase().includes(texto));

    const coincideEstado =
      filtroEstadoPerc === "Todos" ||
      p.items?.some((it) => it.estado === filtroEstadoPerc);

    return coincideBusqueda && coincideEstado;
  })
  .sort((a, b) => {
    const prioridad = {
      "En proceso": 1,
      Terminado: 2,
      Entregado: 3,
      Facturado: 4,
      Pagado: 5,
    };

    const estadoA = a.items?.[0]?.estado || "En proceso";
    const estadoB = b.items?.[0]?.estado || "En proceso";

    return (prioridad[estadoA] || 99) - (prioridad[estadoB] || 99);
  });
const [filtroEstadoOp, setFiltroEstadoOp] = useState("Todas");
const opsFiltradas = [...data.ops]
  .filter((o) => {
    const texto = busquedaOp.toLowerCase();

    const coincideBusqueda =
      o.id?.toLowerCase().includes(texto) ||
      o.cliente?.toLowerCase().includes(texto) ||
      o.obs?.toLowerCase().includes(texto) ||
      o.items?.some((it) => it.producto?.toLowerCase().includes(texto));

    const estados = o.items?.map((it) => it.estado) || [];

    const coincideEstado =
      filtroEstadoOp === "Todas" ||
      estados.includes(filtroEstadoOp);

    return coincideBusqueda && coincideEstado;
  })
  .sort((a, b) => {
    const prioridad = {
      Tejeduría: 1,
      Perchado: 2,
      Confección: 3,
      Terminado: 4,
      Facturado: 5,
    };

    const estadoA = a.items?.[0]?.estado || "Tejeduría";
    const estadoB = b.items?.[0]?.estado || "Tejeduría";

    return (prioridad[estadoA] || 99) - (prioridad[estadoB] || 99);
  });
  async function cargarPerchados() {
  const { data: perchadosData, error } = await supabase
    .from("ordenes_perchado")
    .select(`
      id,
      codigo,
      fecha_ingreso,
      fecha_entrega,
      op_codigo,
      observaciones,
      clientes(nombre),
      perchado_items(
        id,
        kg,
        precio,
        estado,
        tipos_perchado(nombre)
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando perchados:", error);
    return;
  }

  const perchadosTransformados = (perchadosData || []).map((p) => ({
    id: p.codigo,
    fechaIng: p.fecha_ingreso || "",
    fechaEnt: p.fecha_entrega || "",
    cliente: p.clientes?.nombre || "",
    op: p.op_codigo || "Sin OP",
    obs: p.observaciones || "",
    items: (p.perchado_items || []).map((it, index) => ({
      pid: it.id || index + 1,
      tipo: it.tipos_perchado?.nombre || "",
      kg: +it.kg || 0,
      precio: +it.precio || 0,
      estado: it.estado || "En proceso",
    })),
  }));

  setData((prev) => ({
    ...prev,
    perchados: perchadosTransformados,
  }));
}
const saveOP = async (form) => {
  try {
    const clienteNombre = form.cliente?.trim();

    if (!clienteNombre) {
      alert("Debes seleccionar o escribir un cliente");
      return;
    }

    let clienteId = null;

    const { data: clienteExistente, error: clienteBuscarError } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("nombre", clienteNombre)
      .maybeSingle();

    if (clienteBuscarError) throw clienteBuscarError;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente, error: clienteCrearError } = await supabase
        .from("clientes")
        .insert({ nombre: clienteNombre })
        .select("id, nombre")
        .single();

      if (clienteCrearError) throw clienteCrearError;
      clienteId = nuevoCliente.id;
    }

    let codigo = form.id;
    let opId = null;
    let numeroManual = String(form.numero || "").trim();

    if (numeroManual) {
      codigo = `OP-${numeroManual.padStart(3, "0")}`;
    } else if (!codigo) {
      codigo = await obtenerSiguienteCodigo("ordenes_produccion", "OP");
    }

    const { data: codigosRepetidos, error: codigoExisteError } = await supabase
      .from("ordenes_produccion")
      .select("id, codigo")
      .eq("codigo", codigo);

    if (codigoExisteError) throw codigoExisteError;

    if (!form.id && codigosRepetidos?.length > 0) {
      alert("Ese número de orden ya existe.");
      return;
    }

    if (!form.id) {
      const { data: opCreada, error: opError } = await supabase
        .from("ordenes_produccion")
        .insert({
          codigo,
          fecha: form.fecha || null,
          cliente_id: clienteId,
          observaciones: form.obs || "",
          fecha_entrega: form.fechaEntrega || null,
        })
        .select("id, codigo")
        .single();

      if (opError) throw opError;

      opId = opCreada.id;
    } else {
      const { data: opOriginal, error: buscarOpError } = await supabase
        .from("ordenes_produccion")
        .select("id, codigo")
        .eq("codigo", form.id)
        .maybeSingle();

      if (buscarOpError) throw buscarOpError;
      if (!opOriginal) throw new Error("No se encontró la OP a editar");

      opId = opOriginal.id;

      if (codigo !== form.id) {
        const { data: codigoDuplicado, error: codigoDuplicadoError } = await supabase
          .from("ordenes_produccion")
          .select("id, codigo")
          .eq("codigo", codigo)
          .maybeSingle();

        if (codigoDuplicadoError) throw codigoDuplicadoError;

        if (codigoDuplicado) {
          alert("Ese número de orden ya existe.");
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("ordenes_produccion")
        .update({
          codigo,
          fecha: form.fecha || null,
          cliente_id: clienteId,
          observaciones: form.obs || "",
          fecha_entrega: form.fechaEntrega || null,
        })
        .eq("id", opId);

      if (updateError) throw updateError;

      const { error: deleteItemsError } = await supabase
        .from("op_items")
        .delete()
        .eq("op_id", opId);

      if (deleteItemsError) throw deleteItemsError;
    }

    for (const item of form.items) {
      let productoId = null;
      const productoNombre = item.producto?.trim();

      if (productoNombre) {
        const { data: productoExistente, error: productoBuscarError } = await supabase
          .from("productos")
          .select("id, nombre")
          .eq("nombre", productoNombre)
          .maybeSingle();

        if (productoBuscarError) throw productoBuscarError;

        if (productoExistente) {
          productoId = productoExistente.id;
        } else {
          const { data: nuevoProducto, error: productoCrearError } = await supabase
            .from("productos")
            .insert({ nombre: productoNombre })
            .select("id, nombre")
            .single();

          if (productoCrearError) throw productoCrearError;
          productoId = nuevoProducto.id;
        }
      }

      const { error: itemError } = await supabase
        .from("op_items")
        .insert({
          op_id: opId,
          producto_id: productoId,
          cantidad_planificada: +item.cantPlan || 0,
          cantidad_producida: +item.cantProd || 0,
          estado: item.estado || "Tejeduría",
        });

      if (itemError) throw itemError;
    }

    await cargarCatalogos();
    await cargarOps();

    setModal(null);
    alert(codigo === form.id ? "Orden de producción actualizada" : "Orden de producción guardada en Supabase");
  } catch (error) {
    console.error("Error guardando OP:", error);
    alert("Hubo un error al guardar la OP. Revisa la consola.");
  }
};
  async function obtenerSiguienteCodigo(tabla, prefijo) {
  const { data, error } = await supabase
    .from(tabla)
    .select("codigo");

  if (error) throw error;

  let maxNumero = 0;

  (data || []).forEach((row) => {
    const match = row.codigo?.match(new RegExp(`^${prefijo}-(\\d+)$`));
    if (match) {
      const numero = parseInt(match[1], 10);
      if (numero > maxNumero) maxNumero = numero;
    }
  });

  return `${prefijo}-${String(maxNumero + 1).padStart(3, "0")}`;
}
const saveDesp = async (form) => {
  try {
    const clienteNombre = form.cliente?.trim();

    if (!clienteNombre) {
      alert("Debes seleccionar o escribir un cliente");
      return;
    }

    let clienteId = null;

    const { data: clienteExistente, error: clienteBuscarError } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("nombre", clienteNombre)
      .maybeSingle();

    if (clienteBuscarError) throw clienteBuscarError;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente, error: clienteCrearError } = await supabase
        .from("clientes")
        .insert({ nombre: clienteNombre })
        .select("id, nombre")
        .single();

      if (clienteCrearError) throw clienteCrearError;
      clienteId = nuevoCliente.id;
    }

    let codigo = form.id;
    let despachoId = null;
    let numeroManual = String(form.numero || "").trim();

    if (numeroManual) {
      codigo = `D-${numeroManual.padStart(3, "0")}`;
    } else if (!codigo) {
      codigo = await obtenerSiguienteCodigo("despachos", "D");
    }

    const { data: codigosRepetidos, error: codigoExisteError } = await supabase
      .from("despachos")
      .select("id, codigo")
      .eq("codigo", codigo);

    if (codigoExisteError) throw codigoExisteError;

    if (!form.id && codigosRepetidos?.length > 0) {
      alert("Ese número de despacho ya existe.");
      return;
    }

    if (!form.id) {
      const { data: despachoCreado, error: despachoError } = await supabase
        .from("despachos")
        .insert({
          codigo,
          fecha: form.fecha || null,
          op_codigo: form.op || "Sin OP",
          cliente_id: clienteId,
          observaciones: form.obs || "",
        })
        .select("id, codigo")
        .single();

      if (despachoError) throw despachoError;

      despachoId = despachoCreado.id;
    } else {
      const { data: despachoOriginal, error: buscarDespachoError } = await supabase
        .from("despachos")
        .select("id, codigo")
        .eq("codigo", form.id)
        .maybeSingle();

      if (buscarDespachoError) throw buscarDespachoError;
      if (!despachoOriginal) throw new Error("No se encontró el despacho a editar");

      despachoId = despachoOriginal.id;

      if (codigo !== form.id) {
        const { data: codigoDuplicado, error: codigoDuplicadoError } = await supabase
          .from("despachos")
          .select("id, codigo")
          .eq("codigo", codigo)
          .maybeSingle();

        if (codigoDuplicadoError) throw codigoDuplicadoError;

        if (codigoDuplicado) {
          alert("Ese número de despacho ya existe.");
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("despachos")
        .update({
          codigo,
          fecha: form.fecha || null,
          op_codigo: form.op || "Sin OP",
          cliente_id: clienteId,
          observaciones: form.obs || "",
        })
        .eq("id", despachoId);

      if (updateError) throw updateError;

      const { error: deleteItemsError } = await supabase
        .from("despacho_items")
        .delete()
        .eq("despacho_id", despachoId);

      if (deleteItemsError) throw deleteItemsError;
    }

    for (const item of form.items) {
      let productoId = null;
      const productoNombre = item.producto?.trim();

      if (productoNombre) {
        const { data: productoExistente, error: productoBuscarError } = await supabase
          .from("productos")
          .select("id, nombre")
          .eq("nombre", productoNombre)
          .maybeSingle();

        if (productoBuscarError) throw productoBuscarError;

        if (productoExistente) {
          productoId = productoExistente.id;
        } else {
          const { data: nuevoProducto, error: productoCrearError } = await supabase
            .from("productos")
            .insert({ nombre: productoNombre })
            .select("id, nombre")
            .single();

          if (productoCrearError) throw productoCrearError;
          productoId = nuevoProducto.id;
        }
      }

      const { error: itemError } = await supabase
        .from("despacho_items")
        .insert({
          despacho_id: despachoId,
          producto_id: productoId,
          cantidad: +item.cant || 0,
          entregado_a: item.entregadoA || "",
          estado_despacho: item.estadoDesp || "Pendiente",
          estado_facturacion: item.estadoFact || "❌ No facturado",
          numero_factura: item.numFact || "",
        });

      if (itemError) throw itemError;
    }

    await cargarCatalogos();
    await cargarDespachos();

    setModal(null);
    alert(codigo === form.id ? "Despacho actualizado" : "Despacho guardado en Supabase");
  } catch (error) {
    console.error("Error guardando despacho COMPLETO:", error);
    alert("Hubo un error al guardar el despacho. Revisa la consola.");
  }
};
const savePerc = async (form) => {
  try {
    const clienteNombre = form.cliente?.trim();

    if (!clienteNombre) {
      alert("Debes seleccionar un cliente");
      return;
    }

    let clienteId = null;

    const { data: clienteExistente, error: clienteBuscarError } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("nombre", clienteNombre)
      .maybeSingle();

    if (clienteBuscarError) throw clienteBuscarError;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente, error: clienteCrearError } = await supabase
        .from("clientes")
        .insert({ nombre: clienteNombre })
        .select("id, nombre")
        .single();

      if (clienteCrearError) throw clienteCrearError;
      clienteId = nuevoCliente.id;
    }

    let codigo = form.id;
    let perchadoId = null;
    let numeroManual = String(form.numero || "").trim();

    if (numeroManual) {
      codigo = `PC-${numeroManual.padStart(3, "0")}`;
    } else if (!codigo) {
      codigo = await obtenerSiguienteCodigo("ordenes_perchado", "PC");
    }

    const { data: codigosRepetidos, error: codigoExisteError } = await supabase
      .from("ordenes_perchado")
      .select("id, codigo")
      .eq("codigo", codigo);

    if (codigoExisteError) throw codigoExisteError;

    if (!form.id && codigosRepetidos?.length > 0) {
      alert("Ese número de perchado ya existe.");
      return;
    }

    if (!form.id) {
      const { data: perchadoCreado, error: perchadoError } = await supabase
        .from("ordenes_perchado")
        .insert({
          codigo,
          fecha_ingreso: form.fechaIng || null,
          fecha_entrega: form.fechaEnt || null,
          cliente_id: clienteId,
          op_codigo: form.op || "Sin OP",
          observaciones: form.obs || "",
        })
        .select("id, codigo")
        .single();

      if (perchadoError) throw perchadoError;

      perchadoId = perchadoCreado.id;
    } else {
      const { data: perchadoOriginal, error: buscarPerchadoError } = await supabase
        .from("ordenes_perchado")
        .select("id, codigo")
        .eq("codigo", form.id)
        .maybeSingle();

      if (buscarPerchadoError) throw buscarPerchadoError;
      if (!perchadoOriginal) throw new Error("No se encontró el perchado a editar");

      perchadoId = perchadoOriginal.id;

      if (codigo !== form.id) {
        const { data: codigoDuplicado, error: codigoDuplicadoError } = await supabase
          .from("ordenes_perchado")
          .select("id, codigo")
          .eq("codigo", codigo)
          .maybeSingle();

        if (codigoDuplicadoError) throw codigoDuplicadoError;

        if (codigoDuplicado) {
          alert("Ese número de perchado ya existe.");
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("ordenes_perchado")
        .update({
          codigo,
          fecha_ingreso: form.fechaIng || null,
          fecha_entrega: form.fechaEnt || null,
          cliente_id: clienteId,
          op_codigo: form.op || "Sin OP",
          observaciones: form.obs || "",
        })
        .eq("id", perchadoId);

      if (updateError) throw updateError;

      const { error: deleteItemsError } = await supabase
        .from("perchado_items")
        .delete()
        .eq("perchado_id", perchadoId);

      if (deleteItemsError) throw deleteItemsError;
    }

    for (const item of form.items) {
      let tipoPerchadoId = null;
      const tipoNombre = item.tipo?.trim();

      if (tipoNombre) {
        const { data: tipoExistente, error: tipoBuscarError } = await supabase
          .from("tipos_perchado")
          .select("id, nombre")
          .eq("nombre", tipoNombre)
          .maybeSingle();

        if (tipoBuscarError) throw tipoBuscarError;

        if (tipoExistente) {
          tipoPerchadoId = tipoExistente.id;
        } else {
          const { data: nuevoTipo, error: tipoCrearError } = await supabase
            .from("tipos_perchado")
            .insert({ nombre: tipoNombre })
            .select("id, nombre")
            .single();

          if (tipoCrearError) throw tipoCrearError;
          tipoPerchadoId = nuevoTipo.id;
        }
      }

      const { error: itemError } = await supabase
        .from("perchado_items")
        .insert({
          perchado_id: perchadoId,
          tipo_perchado_id: tipoPerchadoId,
          kg: +item.kg || 0,
          precio: +item.precio || 0,
          estado: item.estado || "En proceso",
        });

      if (itemError) throw itemError;
    }

    await cargarCatalogos();
    await cargarPerchados();

    setModal(null);
    alert(codigo === form.id ? "Perchado actualizado" : "Perchado guardado");
  } catch (error) {
    console.error("Error guardando perchado COMPLETO:", error);
    alert("Error guardando perchado. Revisa la consola.");
  }
};
  const confirmDel = async () => {
  try {
    const { type, id } = del;

    if (type === "desp") {
      const { error } = await supabase
        .from("despachos")
        .delete()
        .eq("codigo", id);

      if (error) throw error;

      await cargarDespachos();
    }

    if (type === "op") {
  const { error } = await supabase
    .from("ordenes_produccion")
    .delete()
    .eq("codigo", id);

  if (error) throw error;

  await cargarOps();
}

    if (type === "perc") {
  const { error } = await supabase
    .from("ordenes_perchado")
    .delete()
    .eq("codigo", id);

  if (error) throw error;

  await cargarPerchados();
}

    setDel(null);
  } catch (error) {
    console.error("Error eliminando:", error);
    alert("Hubo un error al eliminar. Revisa la consola.");
  }

    if (type==="perc") setData(d=>({...d, perchados:d.perchados.filter(x=>x.id!==id)}));
    setDel(null);
  };

  const kpis = useMemo(()=>({
    opActivas:   data.ops.filter(o=>o.items.some(it=>it.estado!=="Facturado")).length,
    despPend:    data.despachos.filter(d=>d.items.some(it=>it.estadoDesp!=="Entregado")).length,
    sinFact:     data.despachos.reduce((s,d)=>s+d.items.filter(it=>it.estadoFact==="❌ No facturado").length,0),
    percActivos: data.perchados.filter(p=>p.items.some(it=>it.estado!=="Pagado")).length,
    totalPerc:   data.perchados.reduce((s,p)=>s+p.items.reduce((ss,it)=>ss+(it.kg*it.precio),0),0),
  }),[data]);

  const card   = { background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, overflow:"auto" };
  const page   = { padding:"24px 28px", maxWidth:1500, margin:"0 auto" };
  const hdr    = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 };
  const pgT    = { fontWeight:900, fontSize:19, color:"#f1f5f9", letterSpacing:-.3 };
  const addBtn = (g) => ({ border:"none", borderRadius:10, padding:"8px 20px", cursor:"pointer", fontWeight:800, fontSize:13, color:"#fff", background:g });

  return (
    <div style={{ background:"#020c1b", minHeight:"100vh", fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", color:"#e2e8f0" }}>

      {/* NAV */}
      <div style={{ background:"#080f1e", borderBottom:"1px solid #1e293b", padding:"0 22px", display:"flex", alignItems:"center", gap:4, height:54, overflowX:"auto" }}>
        <div style={{ fontWeight:900, fontSize:15, marginRight:16, whiteSpace:"nowrap", letterSpacing:-.5 }}>
          <span style={{ color:"#3b82f6" }}>itelq</span>
          <span style={{ color:"#475569" }}>-</span>
          <span style={{ color:"#e2e8f0" }}>ops</span>
        </div>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{
            background:tab===i?"#1e3a5f":"transparent", color:tab===i?"#60a5fa":"#64748b",
            border:tab===i?"1px solid #1e40af55":"1px solid transparent",
            borderRadius:8, padding:"5px 14px", cursor:"pointer", fontWeight:700, fontSize:12, whiteSpace:"nowrap"
          }}>{t}</button>
        ))}
      </div>

      {/* ─── DASHBOARD ─── */}
      {tab===0 && (
        <div style={page}>
          <div style={{ ...hdr, marginBottom:24 }}><div style={pgT}>Panel de Control</div></div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:26 }}>
            <KPI label="OPs Activas"       value={kpis.opActivas}   sub="Con items pendientes" color="#60a5fa" icon="🏭" />
            <KPI label="Despachos Pend."   value={kpis.despPend}    sub="Sin entregar"         color="#fbbf24" icon="🚚" />
            <KPI label="Sin Facturar"      value={kpis.sinFact}     sub="Items en despachos"   color="#f87171" icon="❌" />
            <KPI label="Perchados Activos" value={kpis.percActivos} sub="En proceso"            color="#a78bfa" icon="🔵" />
            <KPI label="Total Perchado $"  value={`$${kpis.totalPerc.toLocaleString("es",{minimumFractionDigits:2})}`} sub="Acumulado" color="#34d399" icon="💵" />
          </div>
          <div style={{ ...card, marginBottom:20 }}>
            <div style={{ padding:"13px 16px", borderBottom:"1px solid #1e293b", fontWeight:800, fontSize:11, color:"#475569", letterSpacing:.8 }}>ÓRDENES DE PRODUCCIÓN</div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><Th>OP #</Th><Th>Cliente</Th><Th>F. Entrega</Th><Th>Estado por producto</Th></tr></thead>
              <tbody>
                {data.ops.map((o,i)=>(
                  <tr key={o.id} style={{ borderTop:i>0?"1px solid #1e293b":"none" }}>
                    <Td bold accent="#60a5fa">{o.id}</Td><Td>{o.cliente}</Td><Td accent="#475569">{o.fechaEntrega}</Td>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {o.items.map(it=>(
                          <span key={it.pid} title={`${it.producto}: ${it.cantProd}/${it.cantPlan}`}
                            style={{ background:C_PROD[it.estado]+"22", color:C_PROD[it.estado], border:`1px solid ${C_PROD[it.estado]}55`, padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700 }}>
                            {it.producto.split(" ")[0]} · {it.estado}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <div style={{ ...card, flex:1, minWidth:300 }}>
              <div style={{ padding:"13px 16px", borderBottom:"1px solid #1e293b", fontWeight:800, fontSize:11, color:"#475569", letterSpacing:.8 }}>ÚLTIMOS DESPACHOS</div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr><Th>D #</Th><Th>Cliente</Th><Th>OP</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  {data.despachos.slice(-4).reverse().map((d,i)=>(
                    <tr key={d.id} style={{ borderTop:i>0?"1px solid #1e293b":"none" }}>
                      <Td bold accent="#34d399">{d.id}</Td><Td>{d.cliente}</Td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:12, color: d.op==="Sin OP"?"#64748b":"#60a5fa", fontStyle:d.op==="Sin OP"?"italic":"normal" }}>{d.op}</span>
                      </td>
                      <td style={{ padding:"9px 12px" }}><Badge label={d.items[0]?.estadoDesp} colorMap={C_DESP} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ ...card, flex:1, minWidth:280 }}>
              <div style={{ padding:"13px 16px", borderBottom:"1px solid #1e293b", fontWeight:800, fontSize:11, color:"#475569", letterSpacing:.8 }}>PERCHADOS ACTIVOS</div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr><Th>PC #</Th><Th>Cliente</Th><Th>OP</Th><Th>Total</Th></tr></thead>
                <tbody>
                  {data.perchados.filter(p=>p.items.some(it=>it.estado!=="Pagado")).map((p,i)=>{
                    const tot = p.items.reduce((s,it)=>s+(it.kg*it.precio),0);
                    return (
                      <tr key={p.id} style={{ borderTop:i>0?"1px solid #1e293b":"none" }}>
                        <Td bold accent="#a78bfa">{p.id}</Td><Td>{p.cliente}</Td>
                        <td style={{ padding:"9px 12px" }}>
                          <span style={{ fontSize:12, color:p.op==="Sin OP"?"#64748b":"#60a5fa", fontStyle:p.op==="Sin OP"?"italic":"normal" }}>{p.op}</span>
                        </td>
                        <Td bold accent="#34d399">${tot.toFixed(2)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ÓRDENES DE PRODUCCIÓN ─── */}
      {tab===1 && (
        <div style={page}>
          <div style={hdr}>
            <div style={pgT}>🏭 Órdenes de Producción</div>
            <button style={addBtn("linear-gradient(135deg,#3b82f6,#6366f1)")} onClick={()=>setModal({type:"op"})}>+ Nueva OP</button>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
  <input
    type="text"
    placeholder="Buscar OP, cliente o producto..."
    value={busquedaOp}
    onChange={(e) => setBusquedaOp(e.target.value)}
    style={{
      background:"#0f172a",
      color:"#e2e8f0",
      border:"1px solid #334155",
      borderRadius:10,
      padding:"10px 12px",
      minWidth:280,
      fontSize:13
    }}
  />

  <select
    value={filtroEstadoOp}
    onChange={(e) => setFiltroEstadoOp(e.target.value)}
    style={{
      background:"#0f172a",
      color:"#e2e8f0",
      border:"1px solid #334155",
      borderRadius:10,
      padding:"10px 12px",
      fontSize:13
    }}
  >
    <option value="Todas">Todas</option>
    <option value="Tejeduría">Tejeduría</option>
    <option value="Perchado">Perchado</option>
    <option value="Confección">Confección</option>
    <option value="Terminado">Terminado</option>
    <option value="Facturado">Facturado</option>
  </select>
</div>
          <div style={card}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                <Th>OP #</Th><Th>Fecha</Th><Th>Cliente</Th><Th>F. Entrega</Th>
                <Th>Productos & Estado de Producción</Th>
                <Th>Obs.</Th><Th style={{ width:72 }}>Acciones</Th>
              </tr></thead>
              <tbody>
                {opsFiltradas.map((o,i)=>(
                  <tr key={o.id} style={{ borderTop:i>0?"1px solid #1e293b":"none", verticalAlign:"top" }}>
                    <Td bold accent="#60a5fa">{o.id}</Td>
                    <Td accent="#475569">{o.fecha}</Td>
                    <Td>{o.cliente}</Td>
                    <Td accent="#475569">{o.fechaEntrega}</Td>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                        {o.items.map(it=>(
                          <div key={it.pid} style={{ background:"#080f1e", borderRadius:8, padding:"7px 11px", border:`1px solid ${C_PROD[it.estado]}33`, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                            <span style={{ fontSize:12, color:"#e2e8f0", minWidth:140, fontWeight:600 }}>{it.producto}</span>
                            <span style={{ fontSize:11, color:"#475569" }}>
                              <span style={{ color:it.cantProd>=it.cantPlan?"#34d399":it.cantProd>0?"#fbbf24":"#f87171", fontWeight:700 }}>{it.cantProd}</span>
                              <span style={{ color:"#334155" }}> / </span>{it.cantPlan}
                            </span>
                            <EstadoStep estado={it.estado} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <Td accent="#475569" style={{ maxWidth:110, wordBreak:"break-word" }}>{o.obs||"—"}</Td>
                    <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>
                      <IconBtn onClick={()=>setModal({type:"op",data:o})} color="#60a5fa" title="Editar">✏️</IconBtn>
                      <IconBtn onClick={()=>setDel({type:"op",id:o.id,label:`${o.id} — ${o.cliente}`})} color="#f87171" title="Eliminar">🗑️</IconBtn>
                    </td>
                  </tr>
                ))}
                {!data.ops.length && <tr><td colSpan={7} style={{ padding:32, textAlign:"center", color:"#475569" }}>Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── DESPACHOS ─── */}
      {tab===2 && (
        <div style={page}>
          <div style={hdr}>
            <div style={pgT}>🚚 Despachos</div>
            <button style={addBtn("linear-gradient(135deg,#f59e0b,#ef4444)")} onClick={()=>setModal({type:"desp"})}>+ Nuevo Despacho</button>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
  <input
    type="text"
    placeholder="Buscar despacho, cliente, OP o producto..."
    value={busquedaDesp}
    onChange={(e) => setBusquedaDesp(e.target.value)}
    style={{
      background:"#0f172a",
      color:"#e2e8f0",
      border:"1px solid #334155",
      borderRadius:10,
      padding:"10px 12px",
      minWidth:280,
      fontSize:13
    }}
  />

  <select
    value={filtroEstadoDesp}
    onChange={(e) => setFiltroEstadoDesp(e.target.value)}
    style={{
      background:"#0f172a",
      color:"#e2e8f0",
      border:"1px solid #334155",
      borderRadius:10,
      padding:"10px 12px",
      fontSize:13
    }}
  >
    <option value="Todos">Todos los estados</option>
    <option value="Pendiente">Pendiente</option>
    <option value="Parcial">Parcial</option>
    <option value="Entregado">Entregado</option>
  </select>
</div>
          <div style={card}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                <Th>D #</Th><Th>Fecha</Th><Th>OP #</Th><Th>Cliente</Th>
                <Th>Productos despachados</Th>
                <Th>Obs.</Th><Th style={{ width:72 }}>Acciones</Th>
              </tr></thead>
              <tbody>
                {despachosFiltrados.map((d,i)=>(
                  <tr key={d.id} style={{ borderTop:i>0?"1px solid #1e293b":"none", verticalAlign:"top" }}>
                    <Td bold accent="#34d399">{d.id}</Td>
                    <Td accent="#475569">{d.fecha}</Td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ fontSize:13, color:d.op==="Sin OP"?"#64748b":"#60a5fa", fontStyle:d.op==="Sin OP"?"italic":"normal", fontWeight:d.op==="Sin OP"?400:700 }}>
                        {d.op}
                      </span>
                    </td>
                    <Td>{d.cliente}</Td>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                        {d.items.map(it=>(
                          <div key={it.pid} style={{ background:"#080f1e", borderRadius:8, padding:"6px 11px", border:`1px solid ${C_DESP[it.estadoDesp]}33`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            <span style={{ fontSize:12, color:"#e2e8f0", minWidth:130, fontWeight:600 }}>{it.producto}</span>
                            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:700 }}>×{it.cant}</span>
                            <span style={{ fontSize:11, color:"#475569" }}>→ {it.entregadoA}</span>
                            <Badge label={it.estadoDesp} colorMap={C_DESP} />
                            <Badge label={it.estadoFact} colorMap={C_FACT} />
                            {it.numFact && <span style={{ fontSize:11, color:"#a78bfa", fontWeight:700 }}>{it.numFact}</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <Td accent="#475569" style={{ maxWidth:110, wordBreak:"break-word" }}>{d.obs||"—"}</Td>
                    <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>
                      <IconBtn onClick={()=>setModal({type:"desp",data:d})} color="#f59e0b" title="Editar">✏️</IconBtn>
                      <IconBtn onClick={()=>setDel({type:"desp",id:d.id,label:`${d.id} — ${d.cliente}`})} color="#f87171" title="Eliminar">🗑️</IconBtn>
                    </td>
                  </tr>
                ))}
                {!data.despachos.length && <tr><td colSpan={7} style={{ padding:32, textAlign:"center", color:"#475569" }}>Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PERCHADO ─── */}
      {tab===3 && (
        <div style={page}>
          <div style={hdr}>
            <div style={pgT}>🔵 Órdenes de Perchado</div>
            <button style={addBtn("linear-gradient(135deg,#8b5cf6,#a855f7)")} onClick={()=>setModal({type:"perc"})}>+ Nueva Orden</button>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
  <input
    type="text"
    placeholder="Buscar perchado, cliente, OP o tipo..."
    value={busquedaPerc}
    onChange={(e) => setBusquedaPerc(e.target.value)}
    style={{
      background:"#0f172a",
      color:"#e2e8f0",
      border:"1px solid #334155",
      borderRadius:10,
      padding:"10px 12px",
      minWidth:280,
      fontSize:13
    }}
  />

  <select
    value={filtroEstadoPerc}
    onChange={(e) => setFiltroEstadoPerc(e.target.value)}
    style={{
      background:"#0f172a",
      color:"#e2e8f0",
      border:"1px solid #334155",
      borderRadius:10,
      padding:"10px 12px",
      fontSize:13
    }}
  >
    <option value="Todos">Todos los estados</option>
    <option value="En proceso">En proceso</option>
    <option value="Terminado">Terminado</option>
    <option value="Entregado">Entregado</option>
    <option value="Facturado">Facturado</option>
    <option value="Pagado">Pagado</option>
  </select>
</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
            {ESTADOS_PERC.map(e=>{
              const items = data.perchados.flatMap(p=>p.items).filter(it=>it.estado===e);
              const tot = items.reduce((s,it)=>s+(it.kg*it.precio),0);
              return (
                <div key={e} style={{ background:"#0f172a", border:`1px solid ${C_PERC[e]}33`, borderRadius:11, padding:"12px 16px", flex:1, minWidth:110 }}>
                  <Badge label={e} colorMap={C_PERC} />
                  <div style={{ fontWeight:900, fontSize:20, color:C_PERC[e], margin:"4px 0 2px" }}>{items.length}</div>
                  <div style={{ color:"#475569", fontSize:11 }}>${tot.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
          <div style={card}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                <Th>PC #</Th><Th>F. Ingreso</Th><Th>F. Entrega</Th>
                <Th>Cliente</Th><Th>OP #</Th>
                <Th>Productos (tipo · kg · $/kg · subtotal · estado)</Th>
                <Th>Total OP</Th><Th style={{ width:72 }}>Acciones</Th>
              </tr></thead>
              <tbody>
                {perchadosFiltrados.map((p,i)=>{
                  const totalOP = p.items.reduce((s,it)=>s+(it.kg*it.precio),0);
                  return (
                    <tr key={p.id} style={{ borderTop:i>0?"1px solid #1e293b":"none", verticalAlign:"top" }}>
                      <Td bold accent="#a78bfa">{p.id}</Td>
                      <Td accent="#475569">{p.fechaIng}</Td>
                      <Td accent="#475569">{p.fechaEnt}</Td>
                      <Td>{p.cliente}</Td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:13, color:p.op==="Sin OP"?"#64748b":"#60a5fa", fontStyle:p.op==="Sin OP"?"italic":"normal", fontWeight:p.op==="Sin OP"?400:700 }}>
                          {p.op}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          {p.items.map(it=>(
                            <div key={it.pid} style={{ background:"#080f1e", borderRadius:8, padding:"6px 11px", border:`1px solid ${C_PERC[it.estado]}33`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                              <span style={{ fontSize:12, color:"#e2e8f0", minWidth:130, fontWeight:600 }}>{it.tipo}</span>
                              <span style={{ fontSize:11, color:"#94a3b8" }}>{it.kg} kg</span>
                              <span style={{ fontSize:11, color:"#64748b" }}>× ${it.precio.toFixed(2)}</span>
                              <span style={{ fontSize:12, fontWeight:700, color:"#34d399" }}>${(it.kg*it.precio).toFixed(2)}</span>
                              <Badge label={it.estado} colorMap={C_PERC} />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:900, fontSize:15, color:"#34d399", whiteSpace:"nowrap" }}>${totalOP.toFixed(2)}</td>
                      <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>
                        <IconBtn onClick={()=>setModal({type:"perc",data:p})} color="#a78bfa" title="Editar">✏️</IconBtn>
                        <IconBtn onClick={()=>setDel({type:"perc",id:p.id,label:`${p.id} — ${p.cliente}`})} color="#f87171" title="Eliminar">🗑️</IconBtn>
                      </td>
                    </tr>
                  );
                })}
                {!perchadosFiltrados.length && <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:"#475569" }}>Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:12, textAlign:"right", color:"#475569", fontSize:13 }}>
            Total general:{" "}
            <span style={{ fontWeight:900, fontSize:17, color:"#34d399" }}>
              ${data.perchados.reduce((s,p)=>s+p.items.reduce((ss,it)=>ss+(it.kg*it.precio),0),0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ─── CONFIGURACIÓN ─── */}
      {tab===4 && (
  <SettingsTab
    config={config}
    onAddProducto={agregarProducto}
    onDeleteProducto={eliminarProducto}
    onEditProducto={editarProducto}
    onAddCliente={agregarCliente}
    onDeleteCliente={eliminarCliente}
    onEditCliente={editarCliente}
    onAddTipoPerc={agregarTipoPerc}
    onDeleteTipoPerc={eliminarTipoPerc}
    onEditTipoPerc={editarTipoPerc}
  />
)}

      {/* MODALES */}
      {modal?.type==="op"   && <ModalOP   initial={modal.data} productos={config.productos} clientes={config.clientes} onSave={saveOP}   onClose={()=>setModal(null)} />}
      {modal?.type==="desp" && <ModalDesp initial={modal.data} opIds={opIds} productos={config.productos} clientes={config.clientes} onSave={saveDesp} onClose={()=>setModal(null)} />}
      {modal?.type==="perc" && <ModalPerc initial={modal.data} opIds={opIds} clientes={config.clientes} tiposPerc={config.tiposPerc} onSave={savePerc} onClose={()=>setModal(null)} />}
      {del && <ConfirmDel label={del.label} onConfirm={confirmDel} onClose={()=>setDel(null)} />}
    </div>
  );
}