// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Topbar    from '../components/Topbar';
import ItemModal from '../components/ItemModal';
import ScanModal from '../components/ScanModal';
import { inr, qtyClass, stockStatus } from '../utils/helpers';
import api from '../utils/apiClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, Legend,
} from 'recharts';
import './Dashboard.css';

const C = {
  green:  '#00e5a0', blue:   '#6c8fff', orange: '#ff6b4a',
  yellow: '#ffc542', purple: '#b06eff', teal:   '#00d4d4', pink: '#ff6b9d',
};
const PIE_COLORS = [C.green, C.blue, C.orange, C.yellow, C.purple, C.teal, C.pink];

const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><p className="tooltip-label">{label}</p><p style={{color:C.green}}>₹{Number(payload[0]?.value).toLocaleString('en-IN')}</p></div>;
};
const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return <div className="chart-tooltip"><p className="tooltip-label">{d.name}</p><p style={{color:d.payload.fill}}>₹{Number(d.value).toLocaleString('en-IN')}</p><p style={{color:'var(--muted)',fontSize:12}}>Items: {d.payload.item_count}</p></div>;
};
const LineTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><p className="tooltip-label">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {p.value}</p>)}</div>;
};
const AreaTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><p className="tooltip-label">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: ₹{Number(p.value).toLocaleString('en-IN')}</p>)}</div>;
};
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>;
};

function ItemRow({ item, onEdit, onDelete, onRestock }) {
  const { label, dot } = stockStatus(item.qty, item.threshold);
  return (
    <tr>
      <td><div className="item-name">{item.name}</div><div className="item-barcode">{item.barcode||'—'}</div></td>
      <td><span className="mono" style={{fontSize:'.72rem',color:'var(--muted)'}}>{item.barcode||'—'}</span></td>
      <td><span className="category-tag">{item.category}</span></td>
      <td><span className={qtyClass(item.qty,item.threshold)}>{item.qty}</span></td>
      <td className="price-cell">{inr(item.price)}</td>
      <td><span className="status-dot"><span className={`dot ${dot}`}/>{label}</span></td>
      <td>
        <div className="actions">
          {onEdit   && <button className="btn btn-warn   btn-sm" onClick={()=>onEdit(item.id)}>Edit</button>}
          {onDelete && <button className="btn btn-danger btn-sm" onClick={()=>onDelete(item.id)}>Del</button>}
          {onRestock && <button className="btn btn-warn  btn-sm" onClick={()=>onEdit(item.id)}>Restock</button>}
          {!onEdit && !onDelete && !onRestock && <span style={{fontSize:'.7rem',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>View only</span>}
        </div>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { items, loading, error, addItem, updateItem, deleteItem,
          lowStockItems, outOfStock, totalValue, categories } = useInventory();
  const { can, user } = useAuth();

  const [addOpen,   setAddOpen]   = useState(false);
  const [scanOpen,  setScanOpen]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [prefillBC, setPrefillBC] = useState('');
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [anaLoading,setAnaLoading]= useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then(r => setAnalytics(r.data.data))
      .catch(()=>{})
      .finally(()=>setAnaLoading(false));
  }, []);

  const openEdit = (id) => setEditItem(items.find(i=>i.id===id));
  const openAddWithBarcode = (bc) => { setPrefillBC(bc); setAddOpen(true); };
  const handleSave = (data) => editItem ? updateItem(editItem.id, data) : addItem({...data, barcode: prefillBC||data.barcode});
  const handleDelete = (id) => { if (window.confirm(`Delete "${items.find(i=>i.id===id)?.name}"?`)) deleteItem(id); };

  const filtered = items.filter(i =>
    (!search    || i.name.toLowerCase().includes(search.toLowerCase()) || (i.barcode||'').includes(search)) &&
    (!catFilter || i.category===catFilter)
  );
  const editFn   = can('edit_item')   ? openEdit    : null;
  const deleteFn = can('delete_item') ? handleDelete : null;
  const restockFn= !can('edit_item') && can('restock_item') ? true : null;

  const summary  = analytics?.summary  || {};
  const catBreak = analytics?.cat_breakdown || [];
  const barData  = (analytics?.top_items||[]).map(i=>({ name: i.name.length>16?i.name.slice(0,14)+'…':i.name, value: i.total_value }));
  const pieData  = (analytics?.by_category||[]).map((c,i)=>({ name:c.category, value:c.total_value, item_count:c.item_count, fill:PIE_COLORS[i%PIE_COLORS.length] }));
  const lineData = (analytics?.stock_levels||[]).map(i=>({ name: i.name.length>10?i.name.slice(0,9)+'…':i.name, qty:i.qty, threshold:i.threshold }));
  const areaData = analytics?.monthly_trend||[];

  const kpis = [
    { label:'Total Inventory Value', value:`₹${Number(summary.inventory_value||0).toLocaleString('en-IN')}`, icon:'💰', cls:'green',  sub:`${summary.total_items||0} products` },
    { label:'Total Units in Stock',  value:Number(summary.total_units||0).toLocaleString('en-IN'),            icon:'📦', cls:'blue',   sub:`Avg ₹${summary.avg_price||0} per item` },
    { label:'Reorder Cost Est.',     value:`₹${Number(summary.reorder_cost||0).toLocaleString('en-IN')}`,    icon:'🔄', cls:'orange', sub:`${summary.low_stock||0} low + ${summary.out_of_stock||0} out` },
    { label:'Healthy Stock Items',   value:summary.in_stock||0,                                               icon:'✅', cls:'yellow', sub:`Out of ${summary.total_items||0} total` },
  ];

  return (
    <>
      {/* No scan/add buttons on dashboard */}
      <Topbar title="Dashboard" />

      <div className="content-wrap">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* ── Analytics header — matches image 2 exactly ── */}
        <div className="ana-header">
          <div>
            <h2 className="ana-title">Inventory Analytics</h2>
            <p className="ana-sub">Real-time insights of the inventory performance</p>
          </div>
          <div className="ana-meta">
            <span className="live-badge-full">● Live Data</span>
            <span className="ana-updated">Updated just now</span>
          </div>
        </div>

        {anaLoading ? (
          <div className="spinner-wrap"><div className="spinner"/></div>
        ) : analytics && <>

          {/* KPI cards — matches image 2 */}
          <div className="kpi-grid">
            {kpis.map((k,i) => (
              <div key={i} className={`kpi-card ${k.cls}`}>
                <div className="kpi-top">
                  <span className="kpi-icon">{k.icon}</span>
                  <span className="kpi-label">{k.label}</span>
                </div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Row 1: Bar + Pie */}
          <div className="charts-row">
            <div className="chart-card wide">
              <div className="chart-header">
                <h3 className="chart-title">📊 Top 10 Items by Stock Value</h3>
                <p className="chart-sub">Ranked by quantity × unit price</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{top:8,right:16,left:8,bottom:56}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                  <XAxis dataKey="name" tick={{fill:'#6b7290',fontSize:10}} angle={-35} textAnchor="end" interval={0}/>
                  <YAxis tick={{fill:'#6b7290',fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<BarTip/>} cursor={{fill:'rgba(255,255,255,.04)'}}/>
                  <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={36}>
                    {barData.map((_,i)=><Cell key={i} fill={i===0?C.green:i<3?C.blue:C.purple}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">🥧 Stock by Category</h3>
                <p className="chart-sub">Distribution of inventory value</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" labelLine={false} label={renderPieLabel}>
                    {pieData.map((e,i)=><Cell key={i} fill={e.fill} stroke="transparent"/>)}
                  </Pie>
                  <Tooltip content={<PieTip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((d,i)=>(
                  <div key={i} className="pie-legend-item">
                    <span className="pie-dot" style={{background:d.fill}}/>
                    <span className="pie-cat">{d.name}</span>
                    <span className="pie-val">₹{Number(d.value).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Line + Area */}
          <div className="charts-row">
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">📈 Stock Levels Overview</h3>
                <p className="chart-sub">Current qty vs reorder threshold</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={lineData} margin={{top:8,right:16,left:0,bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                  <XAxis dataKey="name" tick={{fill:'#6b7290',fontSize:10}} angle={-20} textAnchor="end" interval={0}/>
                  <YAxis tick={{fill:'#6b7290',fontSize:10}}/>
                  <Tooltip content={<LineTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:'#6b7290',paddingTop:1}}/>
                  <Line type="monotone" dataKey="qty" name="Current Qty" stroke={C.green} strokeWidth={2.5} dot={{fill:C.green,r:5}}/>
                  <Line type="monotone" dataKey="threshold" name="Threshold" stroke={C.yellow} strokeWidth={2} strokeDasharray="5 5" dot={{fill:C.yellow,r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card wide">
              <div className="chart-header">
                <h3 className="chart-title">💹 Revenue vs Expense Trend</h3>
                <p className="chart-sub">6-month inventory value performance</p>
                <div className="chart-badges">
                  <span className="chart-badge revenue">● Revenue</span>
                  <span className="chart-badge expense">● Expense</span>
                  <span className="chart-badge profit">● Profit</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={areaData} margin={{top:8,right:16,left:8,bottom:0}}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.orange} stopOpacity={0.25}/><stop offset="95%" stopColor={C.orange} stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.25}/><stop offset="95%" stopColor={C.blue} stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                  <XAxis dataKey="month" tick={{fill:'#6b7290',fontSize:10}}/>
                  <YAxis tick={{fill:'#6b7290',fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<AreaTip/>}/>
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={C.green}  strokeWidth={2.5} fill="url(#gRev)"/>
                  <Area type="monotone" dataKey="expense" name="Expense" stroke={C.orange} strokeWidth={2.5} fill="url(#gExp)"/>
                  <Area type="monotone" dataKey="profit"  name="Profit"  stroke={C.blue}   strokeWidth={2}   fill="url(#gPro)" strokeDasharray="4 4"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="chart-card full" style={{marginBottom:28}}>
            <div className="chart-header">
              <h3 className="chart-title">📋 Category Breakdown</h3>
              <p className="chart-sub">Stock health per category</p>
            </div>
            <div className="breakdown-grid">
              {catBreak.map((c,i)=>{
                const total=c.total||1;
                const inPct=Math.round((c.in_stock/total)*100);
                const lowPct=Math.round((c.low_stock/total)*100);
                const outPct=Math.round((c.out_of_stock/total)*100);
                return (
                  <div key={i} className="breakdown-card">
                    <div className="bd-top"><span className="bd-cat">{c.category}</span><span className="bd-val">₹{Number(c.value).toLocaleString('en-IN')}</span></div>
                    <div className="bd-bar-wrap"><div className="bd-bar"><div className="bd-seg in" style={{width:`${inPct}%`}}/><div className="bd-seg low" style={{width:`${lowPct}%`}}/><div className="bd-seg out" style={{width:`${outPct}%`}}/></div></div>
                    <div className="bd-stats"><span className="bd-stat in-stat">✅ {c.in_stock} In Stock</span><span className="bd-stat low-stat">⚠️ {c.low_stock} Low</span><span className="bd-stat out-stat">❌ {c.out_of_stock} Out</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </>}

       
      </div>

      
    </>
  );
}
