// ══════════════════════════════════════════════════════════
// NAGPUR ZONES — Real localities
// ══════════════════════════════════════════════════════════
const NAGPUR_ZONES = [
  { id:'Z1', name:'Sitabuldi',      area:'Central',     type:'commercial',  lat:21.1444, lon:79.0832, baseAqi:95,  baseTraffic:75, baseEnergy:620, baseWater:900,  h:5 },
  { id:'Z2', name:'Gandhibagh',     area:'Core City',   type:'mixed',       lat:21.1528, lon:79.1026, baseAqi:105, baseTraffic:80, baseEnergy:480, baseWater:1100, h:4 },
  { id:'Z3', name:'Dharampeth',     area:'West',        type:'residential', lat:21.1399, lon:79.0607, baseAqi:65,  baseTraffic:40, baseEnergy:320, baseWater:1400, h:3 },
  { id:'Z4', name:'Sadar',          area:'Cantonment',  type:'mixed',       lat:21.1610, lon:79.0760, baseAqi:75,  baseTraffic:55, baseEnergy:390, baseWater:800,  h:4 },
  { id:'Z5', name:'MIDC Hingna',    area:'Industrial W',type:'industrial',  lat:21.0963, lon:78.9839, baseAqi:185, baseTraffic:60, baseEnergy:1800,baseWater:700,  h:6 },
  { id:'Z6', name:'Kamptee Road',   area:'North',       type:'commercial',  lat:21.2000, lon:79.1200, baseAqi:120, baseTraffic:70, baseEnergy:510, baseWater:950,  h:3 },
  { id:'Z7', name:'Manish Nagar',   area:'South-West',  type:'residential', lat:21.0931, lon:79.0617, baseAqi:58,  baseTraffic:30, baseEnergy:280, baseWater:1200, h:2 },
  { id:'Z8', name:'Wathoda',        area:'East Indl',   type:'industrial',  lat:21.1458, lon:79.1350, baseAqi:175, baseTraffic:55, baseEnergy:1600,baseWater:600,  h:5 },
  { id:'Z9', name:'Seminary Hills', area:'North-West',  type:'educational', lat:21.1691, lon:79.0494, baseAqi:48,  baseTraffic:25, baseEnergy:260, baseWater:1050, h:3 },
  { id:'Z10',name:'Itwari',         area:'East',        type:'commercial',  lat:21.1517, lon:79.1132, baseAqi:110, baseTraffic:85, baseEnergy:540, baseWater:880,  h:4 },
  { id:'Z11',name:'Lakadganj',      area:'Central-E',   type:'mixed',       lat:21.1500, lon:79.1200, baseAqi:90,  baseTraffic:65, baseEnergy:410, baseWater:1050, h:3 },
  { id:'Z12',name:'Pardi',          area:'North-East',  type:'residential', lat:21.1561, lon:79.1417, baseAqi:70,  baseTraffic:35, baseEnergy:300, baseWater:1150, h:2 },
];

// ══════════════════════════════════════════════════════════
// SIMULATION STATE
// ══════════════════════════════════════════════════════════
const SIM = { tick:0, speed:2, paused:false, hour:8, dayMin:0 };
const BUF_SIZE = 60;
const zoneData = {};
NAGPUR_ZONES.forEach(z => {
  zoneData[z.id] = {
    aqi: Array(BUF_SIZE).fill(z.baseAqi),
    traffic: Array(BUF_SIZE).fill(z.baseTraffic),
    energy: Array(BUF_SIZE).fill(z.baseEnergy),
    water: Array(BUF_SIZE).fill(z.baseWater),
    health: Array(BUF_SIZE).fill(80),
  };
});

const events = [];
let selectedZone = 'Z2';
let activeMetric = 'aqi';
let alertFeed = [];
let sparkCharts = {};
let currentPage = 'dashboard';
let mapInstance = null;
let mapReady = false;

// ══════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ══════════════════════════════════════════════════════════
function switchPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  // Lazy-init map on first visit
  if (page === 'map' && !mapInstance) {
    setTimeout(initMap, 100);
  }
  if (page === 'map' && mapInstance) {
    setTimeout(() => mapInstance.resize(), 50);
  }
  if (page === 'analytics') {
    setTimeout(updateAnalytics, 50);
  }
  if (page === 'alerts') {
    renderAlertsPage();
  }
  if (page === 'dashboard') {
    renderDashboard();
  }
}

// ══════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ══════════════════════════════════════════════════════════
function pushBuf(arr, val) { arr.push(val); if(arr.length > BUF_SIZE) arr.shift(); }
function randGauss(mean, std) {
  let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random();
  return mean + std * Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
}
function hourPattern(hour, peakH, nightH) {
  if(nightH.includes(hour)) return 0.15;
  if(peakH.includes(hour)) return 1.0;
  return 0.5 + 0.35 * Math.sin((hour-6)/18*Math.PI);
}

function simStep() {
  if(SIM.paused) return;
  SIM.tick++;
  SIM.dayMin += SIM.speed;
  if(SIM.dayMin >= 1440) SIM.dayMin = 0;
  SIM.hour = Math.floor(SIM.dayMin/60);
  const hour = SIM.hour;

  if(Math.random() < 0.003) spawnEvent();
  for(let i=events.length-1;i>=0;i--){ events[i].ttl--; if(events[i].ttl<=0) events.splice(i,1); }

  let cityHealth=0, critCount=0, anomCount=0;
  NAGPUR_ZONES.forEach(z => {
    const d = zoneData[z.id];
    const ev = events.filter(e => e.zone === z.id);
    const tM = hourPattern(hour,[8,9,17,18,19],[0,1,2,3,4]);
    const eM = hourPattern(hour,[8,9,17,18,19,20],[1,2,3]);
    const wM = hourPattern(hour,[6,7,8,18,19,20],[2,3,4]);

    let aqi = z.baseAqi*(0.7+tM*0.5)+randGauss(0,z.baseAqi*0.05);
    let traffic = z.baseTraffic*tM+randGauss(0,4);
    let energy = z.baseEnergy*eM+randGauss(0,z.baseEnergy*0.04);
    let water = z.baseWater*wM+randGauss(0,z.baseWater*0.04);

    ev.forEach(e => {
      if(e.type==='aqi_spike') aqi*=1.8+e.intensity;
      if(e.type==='traffic_jam') traffic*=1.5+e.intensity;
      if(e.type==='power_surge') energy*=2.0+e.intensity;
      if(e.type==='pipe_burst') water*=3.0+e.intensity;
    });

    aqi=Math.max(30,Math.min(350,aqi)); traffic=Math.max(0,Math.min(100,traffic));
    energy=Math.max(50,Math.min(3000,energy)); water=Math.max(50,Math.min(4000,water));
    const h=Math.max(0,Math.min(100,(100-traffic)*0.3+Math.max(0,100-(aqi-40)/3.1)*0.35+Math.max(0,100-energy/30)*0.2+Math.min(100,water/40)*0.15));

    pushBuf(d.aqi,Math.round(aqi)); pushBuf(d.traffic,Math.round(traffic));
    pushBuf(d.energy,Math.round(energy)); pushBuf(d.water,Math.round(water)); pushBuf(d.health,Math.round(h));

    cityHealth += h;
    if(h < 35) critCount++;
    const aqiMean = d.aqi.slice(-20).reduce((a,b)=>a+b)/20;
    if(aqi > aqiMean*1.5 && aqi > 180){ anomCount++; maybeAlert(z,'aqi',aqi,'critical'); }
    if(energy > z.baseEnergy*1.8){ anomCount++; maybeAlert(z,'energy',energy,'warning'); }
  });

  // Update header stats
  const hEl = document.getElementById('h-health');
  const avg = Math.round(cityHealth/NAGPUR_ZONES.length);
  hEl.textContent = avg;
  hEl.className = 'hstat-val ' + (avg > 65 ? 'green' : avg > 40 ? 'yellow' : 'red');
  document.getElementById('h-critical').textContent = critCount;
  const hh = String(SIM.hour).padStart(2,'0');
  const mm = String(Math.floor(SIM.dayMin%60)).padStart(2,'0');
  document.getElementById('h-tick').textContent = `${hh}:${mm}`;
  document.getElementById('nav-alert-count').textContent = alertFeed.length ? `(${alertFeed.length})` : '';

  // Update active page
  if(currentPage === 'dashboard') renderDashboard();
  if(currentPage === 'map' && mapReady) updateMapLibreData();
  if(currentPage === 'analytics') updateAnalytics();
  if(currentPage === 'alerts') renderAlertsPage();
}

// ══════════════════════════════════════════════════════════
// EVENT SYSTEM
// ══════════════════════════════════════════════════════════
const EVENT_TYPES = ['aqi_spike','traffic_jam','power_surge','pipe_burst'];
const EVENT_NAMES = {
  aqi_spike:'🌫️ Industrial Pollution Spike', traffic_jam:'🚗 Severe Traffic Jam',
  power_surge:'⚡ Power Grid Surge', pipe_burst:'💧 Water Main Burst',
};

function spawnEvent() {
  const zone = NAGPUR_ZONES[Math.floor(Math.random()*NAGPUR_ZONES.length)];
  const type = EVENT_TYPES[Math.floor(Math.random()*EVENT_TYPES.length)];
  events.push({zone:zone.id,type,intensity:0.3+Math.random()*0.7,ttl:30+Math.floor(Math.random()*60)});
  addAlert(zone, EVENT_NAMES[type], type.includes('aqi')||type.includes('power')?'critical':'warning');
}

let lastAlertZone = '';
function maybeAlert(zone,metric,val,sev){
  if(lastAlertZone===zone.id+metric) return;
  lastAlertZone = zone.id+metric;
  addAlert(zone,`${metric.toUpperCase()} anomaly: ${Math.round(val)}`,sev);
}

function addAlert(zone,msg,sev){
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  alertFeed.unshift({zone:zone.name,msg,sev,time:t});
  if(alertFeed.length>50) alertFeed.pop();
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════
function renderDashboard() {
  // Stats cards
  const avgHealth = Math.round(NAGPUR_ZONES.reduce((s,z) => s+zoneData[z.id].health.at(-1),0)/NAGPUR_ZONES.length);
  const avgAqi = Math.round(NAGPUR_ZONES.reduce((s,z) => s+zoneData[z.id].aqi.at(-1),0)/NAGPUR_ZONES.length);
  const critCount = NAGPUR_ZONES.filter(z => zoneData[z.id].health.at(-1)<35).length;
  const activeEvents = events.length;

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card g"><div class="sc-label">City Health Score</div><div class="sc-value" style="color:${avgHealth>65?'var(--green)':avgHealth>40?'var(--yellow)':'var(--red)'}">${avgHealth}</div><div class="sc-sub">out of 100</div></div>
    <div class="stat-card ${avgAqi>150?'r':avgAqi>80?'y':'g'}"><div class="sc-label">Average AQI</div><div class="sc-value">${avgAqi}</div><div class="sc-sub">${avgAqi>150?'Unhealthy':avgAqi>80?'Moderate':'Good'}</div></div>
    <div class="stat-card r"><div class="sc-label">Critical Zones</div><div class="sc-value" style="color:var(--red)">${critCount}</div><div class="sc-sub">of ${NAGPUR_ZONES.length} zones</div></div>
    <div class="stat-card c"><div class="sc-label">Active Incidents</div><div class="sc-value" style="color:var(--orange)">${activeEvents}</div><div class="sc-sub">${alertFeed.length} total alerts</div></div>
  `;

  // Zone cards
  document.getElementById('dash-zones').innerHTML = NAGPUR_ZONES.map(z => {
    const d = zoneData[z.id];
    const h = d.health.at(-1);
    const status = h<35?'critical':h<65?'warning':'good';
    return `<div class="zone-card ${status}" onclick="selectedZone='${z.id}';switchPage('analytics')">
      <div class="zc-head">
        <div><div class="zc-name">${z.name}</div><div class="zc-type">${z.area} · ${z.type}</div></div>
        <div class="health-ring ${status}">${h}</div>
      </div>
      <div class="zc-metrics">
        <div class="zm"><span class="zm-k">AQI</span><span class="zm-v" style="color:${d.aqi.at(-1)>150?'var(--red)':d.aqi.at(-1)>80?'var(--yellow)':'var(--green)'}">${d.aqi.at(-1)}</span></div>
        <div class="zm"><span class="zm-k">Traffic</span><span class="zm-v">${d.traffic.at(-1)}/100</span></div>
        <div class="zm"><span class="zm-k">Energy</span><span class="zm-v">${d.energy.at(-1)}kWh</span></div>
        <div class="zm"><span class="zm-k">Water</span><span class="zm-v">${d.water.at(-1)}L</span></div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// MAP PAGE
// ══════════════════════════════════════════════════════════
const NAGPUR_BOUNDARY = turf.polygon([[
  [79.0000,21.0800],[79.0200,21.0650],[79.0550,21.0600],
  [79.0900,21.0640],[79.1200,21.0700],[79.1500,21.0800],
  [79.1650,21.0950],[79.1700,21.1150],[79.1700,21.1400],
  [79.1650,21.1600],[79.1550,21.1800],[79.1400,21.2000],
  [79.1200,21.2100],[79.1000,21.2150],[79.0750,21.2100],
  [79.0500,21.2000],[79.0300,21.1850],[79.0100,21.1650],
  [78.9950,21.1400],[78.9900,21.1150],[78.9950,21.0950],
  [79.0000,21.0800]
]]);

function initMap() {
  mapInstance = new maplibregl.Map({
    container:'map',
    style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center:[79.0882,21.1458], zoom:12, pitch:55, bearing:-15, antialias:true
  });
  mapInstance.addControl(new maplibregl.NavigationControl(),'top-right');

  mapInstance.on('load', () => {
    const cartoSrc = Object.keys(mapInstance.getStyle().sources).find(s => s!=='zones');

    mapInstance.addSource('zones',{type:'geojson',data:getZonesGeoJSON(),promoteId:'id'});
    mapInstance.addLayer({id:'zones-fill',type:'fill',source:'zones',paint:{'fill-color':['get','color'],'fill-opacity':0.30}});
    mapInstance.addLayer({id:'zones-line',type:'line',source:'zones',paint:{'line-color':['get','color'],'line-width':2,'line-opacity':0.7}});
    mapInstance.addLayer({id:'zones-highlight',type:'line',source:'zones',paint:{'line-color':'#00e5ff','line-width':['case',['boolean',['feature-state','hover'],false],4,0]}});

    // ── POLLUTION HEATMAP ──
    mapInstance.addSource('pollution-heat',{type:'geojson',data:getPollutionGeoJSON()});
    mapInstance.addLayer({
      id:'pollution-heatmap',type:'heatmap',source:'pollution-heat',
      paint:{
        'heatmap-weight':['get','intensity'],
        'heatmap-intensity':['interpolate',['linear'],['zoom'],10,0.8,14,2.5],
        'heatmap-radius':['interpolate',['linear'],['zoom'],10,30,14,60],
        'heatmap-color':[
          'interpolate',['linear'],['heatmap-density'],
          0,'rgba(0,0,0,0)',
          0.15,'rgba(50,50,80,0.2)',
          0.3,'rgba(80,80,120,0.35)',
          0.5,'rgba(140,100,60,0.5)',
          0.7,'rgba(200,80,30,0.6)',
          0.9,'rgba(255,50,20,0.7)',
          1,'rgba(255,20,10,0.85)'
        ],
        'heatmap-opacity':['interpolate',['linear'],['zoom'],10,0.7,15,0.5]
      }
    });

    // ── TRAFFIC ROAD COLORING ──
    // GeoJSON source that will hold colored road segments
    mapInstance.addSource('traffic-roads',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    // Outer glow on roads
    mapInstance.addLayer({
      id:'traffic-road-glow',type:'line',source:'traffic-roads',
      paint:{
        'line-color':['get','color'],
        'line-width':['interpolate',['linear'],['get','congestion'],0,2,50,6,100,12],
        'line-blur':4,
        'line-opacity':0.4
      }
    });
    // Inner colored road line
    mapInstance.addLayer({
      id:'traffic-road-line',type:'line',source:'traffic-roads',
      paint:{
        'line-color':['get','color'],
        'line-width':['interpolate',['linear'],['get','congestion'],0,1,50,3,100,6],
        'line-opacity':['interpolate',['linear'],['get','congestion'],0,0.2,30,0.5,60,0.7,100,0.9]
      }
    });

    // 3D Buildings
    if(cartoSrc){
      mapInstance.addLayer({
        id:'3d-buildings',source:cartoSrc,'source-layer':'building',type:'fill-extrusion',minzoom:13,
        paint:{
          'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],10],0,'#1a2332',20,'#243650',50,'#2a4060'],
          'fill-extrusion-height':['coalesce',['get','render_height'],10],
          'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
          'fill-extrusion-opacity':0.75
        }
      });

      // Road highlight
      mapInstance.addSource('road-highlight',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      mapInstance.addLayer({id:'road-hl-glow',type:'line',source:'road-highlight',paint:{'line-color':'#00e5ff','line-width':14,'line-opacity':0.2}});
      mapInstance.addLayer({id:'road-hl-line',type:'line',source:'road-highlight',paint:{'line-color':'#00e5ff','line-width':5,'line-opacity':0.9}});

      mapInstance.on('click',(e)=>{
        const rls = mapInstance.getStyle().layers.filter(l=>l['source-layer']==='transportation'&&l.source===cartoSrc).map(l=>l.id);
        const rf = mapInstance.queryRenderedFeatures(e.point,{layers:rls});
        if(rf.length>0){
          const r=rf[0],p=r.properties||{};
          let inZone='Unknown';let minD=Infinity;
          NAGPUR_ZONES.forEach(z=>{const d=Math.hypot(e.lngLat.lng-z.lon,e.lngLat.lat-z.lat);if(d<minD){minD=d;inZone=z.name;}});
          if(r.geometry) mapInstance.getSource('road-highlight').setData({type:'FeatureCollection',features:[r]});
          const tt=document.getElementById('map-tooltip');
          document.getElementById('tt-name').textContent='🛣️ '+(p.name||'Unnamed Road');
          document.getElementById('tt-body').innerHTML=`
            <div class="tt-row"><span class="tt-key">Class</span><span class="tt-val" style="text-transform:capitalize">${p.class||'road'}</span></div>
            <div class="tt-row"><span class="tt-key">Zone</span><span class="tt-val">${inZone}</span></div>
            <div class="tt-row"><span class="tt-key">Coords</span><span class="tt-val">${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}</span></div>`;
          tt.style.display='block';tt.style.left=Math.min(e.point.x+16,window.innerWidth-260)+'px';tt.style.top=Math.min(e.point.y-40,window.innerHeight-200)+'px';
        } else {
          mapInstance.getSource('road-highlight').setData({type:'FeatureCollection',features:[]});
        }
      });
    }
    mapReady = true;
  });

  // Zone hover
  let mapHoveredId = null;
  mapInstance.on('mousemove','zones-fill',(e)=>{
    if(!e.features.length) return;
    const fid=e.features[0].properties.id||e.features[0].id;
    if(mapHoveredId!==null&&mapHoveredId!==fid) mapInstance.setFeatureState({source:'zones',id:mapHoveredId},{hover:false});
    mapHoveredId=fid; mapInstance.setFeatureState({source:'zones',id:mapHoveredId},{hover:true});
    mapInstance.getCanvas().style.cursor='pointer';
    const zone=NAGPUR_ZONES.find(z=>z.id===mapHoveredId);
    if(zone){
      const d=zoneData[zone.id];const tt=document.getElementById('map-tooltip');
      document.getElementById('tt-name').textContent=zone.name.toUpperCase();
      document.getElementById('tt-body').innerHTML=`
        <div class="tt-row"><span class="tt-key">Area</span><span class="tt-val">${zone.area}</span></div>
        <div class="tt-row"><span class="tt-key">AQI</span><span class="tt-val" style="color:${d.aqi.at(-1)>150?'var(--red)':'var(--green)'}">${d.aqi.at(-1)}</span></div>
        <div class="tt-row"><span class="tt-key">Traffic</span><span class="tt-val">${d.traffic.at(-1)}/100</span></div>
        <div class="tt-row"><span class="tt-key">Health</span><span class="tt-val" style="color:${d.health.at(-1)<40?'var(--red)':'var(--green)'}">${d.health.at(-1)}/100</span></div>`;
      tt.style.display='block';tt.style.left=Math.min(e.point.x+16,window.innerWidth-220)+'px';tt.style.top=Math.min(e.point.y-40,window.innerHeight-200)+'px';
    }
  });
  mapInstance.on('mouseleave','zones-fill',()=>{
    if(mapHoveredId!==null) mapInstance.setFeatureState({source:'zones',id:mapHoveredId},{hover:false});
    mapInstance.getCanvas().style.cursor='';mapHoveredId=null;
    document.getElementById('map-tooltip').style.display='none';
  });
  mapInstance.on('click','zones-fill',(e)=>{
    if(!e.features.length) return;
    selectedZone=e.features[0].properties.id||e.features[0].id;
  });
}

// Voronoi zones clipped to Nagpur boundary
let voronoiPolys = null;
function getVoronoiZones(){
  if(voronoiPolys) return voronoiPolys;
  const pts=turf.featureCollection(NAGPUR_ZONES.map(z=>turf.point([z.lon,z.lat],{id:z.id})));
  const bc=NAGPUR_BOUNDARY.geometry.coordinates[0];
  const bbox=[Math.min(...bc.map(c=>c[0])),Math.min(...bc.map(c=>c[1])),Math.max(...bc.map(c=>c[0])),Math.max(...bc.map(c=>c[1]))];
  const v=turf.voronoi(pts,{bbox}); const cl=[];
  v.features.forEach((f,i)=>{
    if(!f||!f.geometry) return;
    try{
      const c=turf.intersect(turf.featureCollection([f,NAGPUR_BOUNDARY]));
      if(c){c.id=NAGPUR_ZONES[i].id;c.properties={id:NAGPUR_ZONES[i].id};cl.push(c);}
    }catch(e){f.id=NAGPUR_ZONES[i].id;f.properties={id:NAGPUR_ZONES[i].id};cl.push(f);}
  });
  voronoiPolys={type:'FeatureCollection',features:cl};
  return voronoiPolys;
}

function getMetricVal(zid){
  const d=zoneData[zid];if(!d)return 0;const l=a=>a[a.length-1]||0;
  switch(activeMetric){case'aqi':return l(d.aqi);case'traffic':return l(d.traffic);case'energy':return l(d.energy);case'water':return l(d.water);case'health':return l(d.health);default:return 0;}
}
function metricToColor(val,metric){
  if(metric==='health'){if(val>65)return{top:'#00ff88'};if(val>40)return{top:'#ffd60a'};return{top:'#ff3b3b'};}
  const ranges={aqi:[40,300],traffic:[0,100],energy:[50,3000],water:[50,4000]};
  const[lo,hi]=ranges[metric]||[0,100];const t=Math.max(0,Math.min(1,(val-lo)/(hi-lo)));
  if(t<0.33)return{top:'#00ff88'};if(t<0.55)return{top:'#ffd60a'};if(t<0.75)return{top:'#ff8800'};return{top:'#ff3b3b'};
}
function lerpColor(c1,c2,t){
  const h=s=>parseInt(s,16);
  const r1=h(c1.slice(1,3)),g1=h(c1.slice(3,5)),b1=h(c1.slice(5,7));
  const r2=h(c2.slice(1,3)),g2=h(c2.slice(3,5)),b2=h(c2.slice(5,7));
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function getZonesGeoJSON(){
  const coll=getVoronoiZones();
  const features=JSON.parse(JSON.stringify(coll.features));
  features.forEach(f=>{
    const z=NAGPUR_ZONES.find(zone=>zone.id===f.id);if(!z)return;
    const val=getMetricVal(z.id);const colors=metricToColor(val,activeMetric);
    const hasAlert=events.some(e=>e.zone===z.id);
    let color=colors.top;
    if(hasAlert&&Math.sin(SIM.tick*0.4)>0) color='#ff3b3b';
    else if(z.id===selectedZone) color=lerpColor(colors.top,'#00e5ff',0.4);
    f.properties.color=color;
  });
  return{type:'FeatureCollection',features};
}

function updateMapLibreData(){
  if(!mapInstance) return;
  if(mapInstance.getSource('zones')) mapInstance.getSource('zones').setData(getZonesGeoJSON());
  if(mapInstance.getSource('pollution-heat')) mapInstance.getSource('pollution-heat').setData(getPollutionGeoJSON());
  // Update traffic road coloring every 3 ticks (to avoid performance issues)
  if(mapInstance.getSource('traffic-roads') && SIM.tick % 3 === 0) updateTrafficRoads();
}

// Query actual road features from vector tiles and color them by nearest zone's traffic
function updateTrafficRoads(){
  if(!mapInstance || !mapReady) return;
  const style = mapInstance.getStyle();
  const cartoSrc = Object.keys(style.sources).find(s => s !== 'zones' && s !== 'pollution-heat' && s !== 'traffic-roads' && s !== 'road-highlight');
  if(!cartoSrc) return;

  // Find all transportation layers from the vector tiles
  const roadLayerIds = style.layers
    .filter(l => l['source-layer'] === 'transportation' && l.source === cartoSrc)
    .map(l => l.id);
  if(!roadLayerIds.length) return;

  // Query all currently visible road features
  const roadFeatures = mapInstance.queryRenderedFeatures({layers: roadLayerIds});
  if(!roadFeatures.length) return;

  // Color each road based on the nearest zone's traffic
  const coloredFeatures = [];
  const seen = new Set();
  roadFeatures.forEach(rf => {
    // Deduplicate by feature id
    const fKey = (rf.id || '') + '_' + (rf.properties.name || '') + '_' + (rf.geometry.type);
    if(seen.has(fKey)) return;
    seen.add(fKey);

    // Find nearest zone to this road's centroid
    let cx, cy;
    if(rf.geometry.type === 'LineString'){
      const mid = Math.floor(rf.geometry.coordinates.length / 2);
      [cx, cy] = rf.geometry.coordinates[mid];
    } else if(rf.geometry.type === 'MultiLineString'){
      const line = rf.geometry.coordinates[0];
      const mid = Math.floor(line.length / 2);
      [cx, cy] = line[mid];
    } else if(rf.geometry.type === 'Point'){
      [cx, cy] = rf.geometry.coordinates;
    } else { return; }

    let nearestZone = NAGPUR_ZONES[0], minDist = Infinity;
    NAGPUR_ZONES.forEach(z => {
      const d = Math.hypot(cx - z.lon, cy - z.lat);
      if(d < minDist){ minDist = d; nearestZone = z; }
    });

    const congestion = zoneData[nearestZone.id].traffic.at(-1);
    // Skip low-traffic roads
    if(congestion < 20) return;

    // Color: green → yellow → orange → red
    let color;
    if(congestion < 40) color = '#22c55e';
    else if(congestion < 60) color = '#eab308';
    else if(congestion < 80) color = '#f97316';
    else color = '#ef4444';

    coloredFeatures.push({
      type: 'Feature',
      geometry: rf.geometry,
      properties: { congestion, color, zone: nearestZone.name }
    });
  });

  mapInstance.getSource('traffic-roads').setData({type:'FeatureCollection', features: coloredFeatures});
}

// Generate scattered pollution points around each zone
function getPollutionGeoJSON(){
  const features = [];
  NAGPUR_ZONES.forEach(z => {
    const d = zoneData[z.id];
    const aqi = d.aqi.at(-1);
    const intensity = Math.min(1, Math.max(0, (aqi - 30) / 300));
    const numPoints = Math.floor(3 + intensity * 25);
    for(let i = 0; i < numPoints; i++){
      const spread = z.type === 'industrial' ? 0.015 : 0.008;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      const drift = Math.sin(SIM.tick * 0.1 + i) * 0.002;
      features.push({
        type:'Feature',
        geometry:{type:'Point',coordinates:[
          z.lon + Math.cos(angle) * dist + drift,
          z.lat + Math.sin(angle) * dist + drift * 0.5
        ]},
        properties:{intensity: intensity * (0.5 + Math.random() * 0.5), aqi}
      });
    }
  });
  return {type:'FeatureCollection', features};
}

// ══════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ══════════════════════════════════════════════════════════
const SPARK_COLORS = {aqi:'#00e5ff',traffic:'#ff3b3b',energy:'#ffd60a',water:'#3b82f6'};

function initSparklines(){
  const sel=document.getElementById('analytics-zone-select');
  sel.innerHTML=NAGPUR_ZONES.map(z=>`<option value="${z.id}" ${z.id===selectedZone?'selected':''}>${z.name} (${z.area})</option>`).join('');

  ['aqi','traffic','energy','water'].forEach(m=>{
    const canvas=document.getElementById('sp-'+m); if(!canvas) return;
    const ctx=canvas.getContext('2d');const color=SPARK_COLORS[m];
    const grad=ctx.createLinearGradient(0,0,0,120);grad.addColorStop(0,color+'44');grad.addColorStop(1,color+'00');
    sparkCharts[m]=new Chart(ctx,{
      type:'line',data:{labels:Array(BUF_SIZE).fill(''),datasets:[{data:zoneData[selectedZone][m],borderColor:color,backgroundColor:grad,borderWidth:1.5,fill:true,tension:0.4,pointRadius:0}]},
      options:{responsive:false,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:true,grid:{color:'rgba(28,45,66,0.5)'},ticks:{color:'#4a6480',font:{size:9},maxTicksLimit:4}}}}
    });
  });
}

function updateAnalytics(){
  const d=zoneData[selectedZone];
  ['aqi','traffic','energy','water'].forEach(m=>{
    if(!sparkCharts[m])return;
    sparkCharts[m].data.datasets[0].data=[...d[m]];sparkCharts[m].update('none');
  });

  // Correlation grid
  const z=NAGPUR_ZONES.find(z=>z.id===selectedZone);
  if(z){
    document.getElementById('corr-grid').innerHTML=`
      <div class="corr-card"><div class="corr-val" style="color:${d.aqi.at(-1)>150?'var(--red)':'var(--green)'}">${d.aqi.at(-1)}</div><div class="corr-lbl">Current AQI</div></div>
      <div class="corr-card"><div class="corr-val" style="color:${d.traffic.at(-1)>60?'var(--yellow)':'var(--cyan)'}">${d.traffic.at(-1)}</div><div class="corr-lbl">Traffic Index</div></div>
      <div class="corr-card"><div class="corr-val">${d.energy.at(-1)}</div><div class="corr-lbl">Energy kWh</div></div>
      <div class="corr-card"><div class="corr-val">${d.water.at(-1)}</div><div class="corr-lbl">Water L/hr</div></div>
      <div class="corr-card"><div class="corr-val" style="color:${d.health.at(-1)<40?'var(--red)':d.health.at(-1)<65?'var(--yellow)':'var(--green)'}">${d.health.at(-1)}</div><div class="corr-lbl">Health Score</div></div>
      <div class="corr-card"><div class="corr-val" style="color:var(--orange)">${events.filter(e=>e.zone===selectedZone).length}</div><div class="corr-lbl">Active Events</div></div>`;
  }
}

// ══════════════════════════════════════════════════════════
// ALERTS PAGE
// ══════════════════════════════════════════════════════════
function renderAlertsPage(){
  document.getElementById('alert-total').textContent=alertFeed.length;
  document.getElementById('alert-crit-count').textContent=alertFeed.filter(a=>a.sev==='critical').length;
  document.getElementById('alert-warn-count').textContent=alertFeed.filter(a=>a.sev==='warning').length;

  const list=document.getElementById('alert-list');
  if(!alertFeed.length){list.innerHTML='<div style="color:var(--muted);text-align:center;padding:40px;font-size:14px">No alerts yet. Simulation is running...</div>';return;}
  list.innerHTML=alertFeed.slice(0,40).map(a=>`
    <div class="alert-item ${a.sev}">
      <div class="alert-zone">${a.zone}</div>
      <div class="alert-msg">${a.msg}</div>
      <div class="alert-time">⏱ ${a.time}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// NLP QUERY
// ══════════════════════════════════════════════════════════
function nlpQuery(q){
  if(!q||!q.trim())return;
  document.getElementById('nlp-input').value='';
  const lower=q.toLowerCase();
  const latest=id=>zoneData[id];let answer='';
  if(lower.match(/aqi|air|pollution/)){
    const w=NAGPUR_ZONES.reduce((a,b)=>latest(a.id).aqi.at(-1)>latest(b.id).aqi.at(-1)?a:b);
    answer=`🌫️ ${w.name} has worst AQI: ${latest(w.id).aqi.at(-1)}.`;selectedZone=w.id;
  } else if(lower.match(/traffic|jam/)){
    const w=NAGPUR_ZONES.reduce((a,b)=>latest(a.id).traffic.at(-1)>latest(b.id).traffic.at(-1)?a:b);
    answer=`🚗 ${w.name}: Traffic ${latest(w.id).traffic.at(-1)}/100.`;selectedZone=w.id;
  } else if(lower.match(/energy|power/)){
    const w=NAGPUR_ZONES.reduce((a,b)=>latest(a.id).energy.at(-1)>latest(b.id).energy.at(-1)?a:b);
    answer=`⚡ ${w.name}: ${latest(w.id).energy.at(-1)} kWh.`;selectedZone=w.id;
  } else if(lower.match(/water|pipe/)){
    const w=NAGPUR_ZONES.reduce((a,b)=>latest(a.id).water.at(-1)>latest(b.id).water.at(-1)?a:b);
    answer=`💧 ${w.name}: ${latest(w.id).water.at(-1)} L/hr.`;selectedZone=w.id;
  } else if(lower.match(/critical|danger/)){
    const c=NAGPUR_ZONES.filter(z=>latest(z.id).health.at(-1)<35);
    answer=c.length?`⛔ Critical: ${c.map(z=>z.name).join(', ')}`:'✅ No critical zones.';
  } else if(lower.match(/health|city/)){
    const avg=Math.round(NAGPUR_ZONES.reduce((s,z)=>s+latest(z.id).health.at(-1),0)/NAGPUR_ZONES.length);
    answer=`🏙️ City health: ${avg}/100. ${events.length} active incidents.`;
  } else { answer='💡 Try: "worst AQI", "traffic jam", "energy overload", "city health"'; }
  const res=document.getElementById('nlp-result');res.style.display='block';res.textContent=answer;
}

// ══════════════════════════════════════════════════════════
// CONTROLS
// ══════════════════════════════════════════════════════════
function switchMetric(m){
  activeMetric=m;
  const LEGENDS={aqi:'Air Quality Index',traffic:'Traffic Congestion',energy:'Energy Load',water:'Water Usage',health:'Zone Health'};
  const el=document.getElementById('leg-title');if(el) el.textContent=LEGENDS[m]||m;
}
function setSpeed(s){
  SIM.speed=s;
  document.querySelectorAll('.map-toolbar .tool-btn').forEach(b=>{
    if(['1×','2×','5×'].some(x=>b.textContent.trim()===x)) b.classList.remove('active');
    if(b.textContent.trim()===s+'×') b.classList.add('active');
  });
}
function togglePause(){
  SIM.paused=!SIM.paused;
  const btn=document.getElementById('paused-btn');
  btn.textContent=SIM.paused?'▶ Resume':'⏸ Pause';
  btn.style.color=SIM.paused?'var(--green)':'var(--yellow)';
}

// ══════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════
window.addEventListener('load',()=>{
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{
    // Pre-warm simulation
    SIM.paused=true;
    for(let i=0;i<BUF_SIZE;i++){
      SIM.tick++;SIM.dayMin+=SIM.speed;if(SIM.dayMin>=1440)SIM.dayMin=0;SIM.hour=Math.floor(SIM.dayMin/60);
      NAGPUR_ZONES.forEach(z=>{
        const d=zoneData[z.id];const tM=0.5+0.35*Math.sin((SIM.hour-6)/18*Math.PI);
        let aqi=z.baseAqi*(0.7+tM*0.5)+randGauss(0,z.baseAqi*0.05);
        let traffic=z.baseTraffic*tM+randGauss(0,4);
        let energy=z.baseEnergy*tM+randGauss(0,z.baseEnergy*0.04);
        let water=z.baseWater*tM+randGauss(0,z.baseWater*0.04);
        aqi=Math.max(30,Math.min(350,aqi));traffic=Math.max(0,Math.min(100,traffic));
        energy=Math.max(50,Math.min(3000,energy));water=Math.max(50,Math.min(4000,water));
        const h=Math.max(0,Math.min(100,(100-traffic)*0.3+Math.max(0,100-(aqi-40)/3.1)*0.35+Math.max(0,100-energy/30)*0.2+Math.min(100,water/40)*0.15));
        pushBuf(d.aqi,Math.round(aqi));pushBuf(d.traffic,Math.round(traffic));
        pushBuf(d.energy,Math.round(energy));pushBuf(d.water,Math.round(water));pushBuf(d.health,Math.round(h));
      });
    }
    SIM.paused=false;
    renderDashboard();
    initSparklines();
    setInterval(simStep,500);
  });});
});
