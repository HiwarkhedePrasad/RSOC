// ══════════════════════════════════════════════════════════
// INITIALIZATION & LOADING SCREEN
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // Hide loading screen after initialization
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 1000);
    }
    // Initialize the app
    initApp();
  }, 3000); // 3 second loading screen for dramatic effect
});

function initApp() {
  // Start simulation
  setInterval(simStep, 1000);
  setInterval(updateUI, 2000);
  
  // Initial render
  renderDashboard();
  updateAnalytics();
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Add impressive hover effects
  addInteractiveEffects();
}

function handleKeyboardShortcuts(e) {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case '1': switchPage('dashboard'); break;
      case '2': switchPage('map'); break;
      case '3': switchPage('analytics'); break;
      case '4': switchPage('alerts'); break;
      case '5': switchPage('planner'); break;
    }
  }
}

function addInteractiveEffects() {
  // Add ripple effect to buttons
  document.querySelectorAll('button, .nav-link').forEach(element => {
    element.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      this.appendChild(ripple);
      
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

// ══════════════════════════════════════════════════════════
// NAGPUR ZONES — Real localities
// ══════════════════════════════════════════════════════════
const NAGPUR_ZONES = [
  { id:'Z1', name:'Sitabuldi',      area:'Central',     type:'commercial',  lat:21.1444, lon:79.0832, baseAqi:95,  baseTraffic:75, baseEnergy:620, baseWater:900,  h:5 },
  { id:'Z2', name:'Gandhibagh',     area:'Core City',   type:'mixed',       lat:21.1528, lon:79.1026, baseAqi:105, baseTraffic:80, baseEnergy:480, baseWater:1100, h:4 },
  { id:'Z3', name:'Dharampeth',     area:'West',        type:'residential', lat:21.1399, lon:79.0607, baseAqi:65,  baseTraffic:40, baseEnergy:320, baseWater:1400, h:3 },
  { id:'Z4', name:'Sadar',          area:'Cantonment',  type:'mixed',       lat:21.1610, lon:79.0760, baseAqi:75,  baseTraffic:55, baseEnergy:390, baseWater:800,  h:4 },
  { id:'Z5', name:'MIDC Hingna',    area:'Industrial W',type:'industrial',  lat:21.074591, lon:78.963713, baseAqi:185, baseTraffic:60, baseEnergy:1800,baseWater:700,  h:18 },
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
    voronoiPolys = null; // Clear cache to regenerate with new boundary
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

  // Enhanced event spawning with AI patterns
  if(Math.random() < 0.008) spawnIntelligentEvent();
  for(let i=events.length-1;i>=0;i--){ events[i].ttl--; if(events[i].ttl<=0) events.splice(i,1); }

  let cityHealth=0, critCount=0, anomCount=0;
  NAGPUR_ZONES.forEach(z => {
    const d = zoneData[z.id];
    const ev = events.filter(e => e.zone === z.id);
    const tM = hourPattern(hour,[8,9,17,18,19],[0,1,2,3,4]);
    const eM = hourPattern(hour,[8,9,17,18,19,20],[1,2,3]);
    const wM = hourPattern(hour,[6,7,8,18,19,20],[2,3,4]);

    // AI-enhanced simulation with predictive patterns
    let aqi = z.baseAqi*(0.7+tM*0.5)+randGauss(0,z.baseAqi*0.05);
    let traffic = z.baseTraffic*tM+randGauss(0,4);
    let energy = z.baseEnergy*eM+randGauss(0,z.baseEnergy*0.04);
    let water = z.baseWater*wM+randGauss(0,z.baseWater*0.04);

    // Apply AI-predicted event impacts
    ev.forEach(e => {
      if(e.type==='aqi_spike') aqi*=1.8+e.intensity;
      if(e.type==='traffic_jam') traffic*=1.5+e.intensity;
      if(e.type==='power_surge') energy*=2.0+e.intensity;
      if(e.type==='pipe_burst') water*=3.0+e.intensity;
      if(e.type==='cyber_attack') energy*=1.3+e.intensity;
      if(e.type==='flood_event') water*=2.5+e.intensity;
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

  // Update header stats with enhanced animations
  updateHeaderStats(cityHealth/NAGPUR_ZONES.length, critCount, anomCount);
}

// AI-powered intelligent event spawning
function spawnIntelligentEvent() {
  const eventTypes = [
    { type: 'aqi_spike', zones: ['Z5', 'Z8'], intensity: 0.3, desc: 'Industrial pollution spike detected' },
    { type: 'traffic_jam', zones: ['Z1', 'Z2', 'Z10'], intensity: 0.5, desc: 'Major traffic congestion reported' },
    { type: 'power_surge', zones: ['Z5', 'Z8'], intensity: 0.4, desc: 'Unusual power consumption pattern' },
    { type: 'pipe_burst', zones: ['Z3', 'Z7', 'Z12'], intensity: 0.6, desc: 'Water pipeline pressure anomaly' },
    { type: 'cyber_attack', zones: ['Z1', 'Z2'], intensity: 0.2, desc: 'Suspicious network activity detected' },
    { type: 'flood_event', zones: ['Z3', 'Z9'], intensity: 0.7, desc: 'Water level rising in low-lying areas' },
    { type: 'fire_hazard', zones: ['Z4', 'Z6'], intensity: 0.8, desc: 'Temperature spike detected - potential fire risk' },
    { type: 'public_gathering', zones: ['Z1', 'Z4'], intensity: 0.3, desc: 'Unusual crowd density detected' }
  ];
  
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const zone = eventType.zones[Math.floor(Math.random() * eventType.zones.length)];
  
  events.push({
    id: Date.now() + Math.random(),
    zone: zone,
    type: eventType.type,
    intensity: eventType.intensity + Math.random() * 0.3,
    ttl: 30 + Math.floor(Math.random() * 20),
    description: eventType.desc,
    severity: eventType.intensity > 0.6 ? 'critical' : eventType.intensity > 0.3 ? 'warning' : 'info',
    timestamp: new Date().toISOString()
  });
}

// Enhanced header stats with smooth animations
function updateHeaderStats(avgHealth, critCount, anomCount) {
  const healthEl = document.getElementById('h-health');
  const critEl = document.getElementById('h-critical');
  const tickEl = document.getElementById('h-tick');
  
  if(healthEl) {
    const healthVal = Math.round(avgHealth);
    const healthClass = healthVal > 70 ? 'green' : healthVal > 40 ? 'yellow' : 'red';
    healthEl.className = `hstat-val ${healthClass}`;
    healthEl.textContent = healthVal;
    
    // Add pulse animation for critical values
    if(healthVal < 40) {
      healthEl.style.animation = 'pulse 1s infinite';
    } else {
      healthEl.style.animation = 'none';
    }
  }
  
  if(critEl) {
    critEl.textContent = critCount;
    if(critCount > 0) {
      critEl.style.animation = 'pulse 1s infinite';
    } else {
      critEl.style.animation = 'none';
    }
  }
  
  if(tickEl) {
    const hours = Math.floor(SIM.dayMin/60);
    const mins = SIM.dayMin % 60;
    tickEl.textContent = `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
  }
}

// Update UI function called from initApp
function updateUI() {
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
  [78.9500,21.0800],[78.9600,21.0650],[78.9800,21.0600],
  [79.0000,21.0800],[79.0200,21.0650],[79.0550,21.0600],
  [79.0900,21.0640],[79.1200,21.0700],[79.1500,21.0800],
  [79.1650,21.0950],[79.1700,21.1150],[79.1700,21.1400],
  [79.1650,21.1600],[79.1550,21.1800],[79.1400,21.2000],
  [79.1200,21.2100],[79.1000,21.2150],[79.0750,21.2100],
  [79.0500,21.2000],[79.0300,21.1850],[79.0100,21.1650],
  [78.9950,21.1400],[78.9800,21.1150],[78.9650,21.0950],
  [78.9500,21.0800]
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
    mapInstance.addLayer({id:'zones-fill',type:'fill',source:'zones',paint:{'fill-color':['get','color'],'fill-opacity':0.15}});
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

    // ── PLANNER MARKER (for "Show on Map") ──
    mapInstance.addSource('planner-marker',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    // Outer pulsing ring
    mapInstance.addLayer({
      id:'planner-ring',type:'circle',source:'planner-marker',
      paint:{
        'circle-radius':40,'circle-color':'rgba(168,85,247,0.0)',
        'circle-stroke-width':3,'circle-stroke-color':'#a855f7',
        'circle-stroke-opacity':0.6
      }
    });
    // Bright core dot
    mapInstance.addLayer({
      id:'planner-dot',type:'circle',source:'planner-marker',
      paint:{
        'circle-radius':10,'circle-color':'#a855f7',
        'circle-stroke-width':3,'circle-stroke-color':'#ffffff',
        'circle-opacity':0.95
      }
    });
    // Label
    mapInstance.addLayer({
      id:'planner-label',type:'symbol',source:'planner-marker',
      layout:{
        'text-field':['get','label'],
        'text-font':['Open Sans Bold'],
        'text-size':13,
        'text-offset':[0,3],
        'text-anchor':'top'
      },
      paint:{'text-color':'#ffffff','text-halo-color':'#a855f7','text-halo-width':2}
    });

    // ── SUGGESTION MARKERS (Infrastructure recommendations) ──
    mapInstance.addSource('suggestion-markers',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    // Suggestion marker background circle
    mapInstance.addLayer({
      id:'suggestion-bg',type:'circle',source:'suggestion-markers',
      paint:{
        'circle-radius':['get','markerSize'],
        'circle-color':['get','bgColor'],
        'circle-stroke-width':2,
        'circle-stroke-color':'#ffffff',
        'circle-opacity':0.9
      }
    });
    // Suggestion icon (using symbol layer with text)
    mapInstance.addLayer({
      id:'suggestion-icon',type:'symbol',source:'suggestion-markers',
      layout:{
        'text-field':['get','icon'],
        'text-font':['Open Sans Bold'],
        'text-size':18,
        'text-anchor':'center',
        'text-allow-overlap':true
      },
      paint:{'text-color':'#ffffff'}
    });
    // Suggestion label
    mapInstance.addLayer({
      id:'suggestion-label',type:'symbol',source:'suggestion-markers',
      layout:{
        'text-field':['get','shortLabel'],
        'text-font':['Open Sans Bold'],
        'text-size':11,
        'text-offset':[0,2.5],
        'text-anchor':'top',
        'text-allow-overlap':false
      },
      paint:{'text-color':'#ffffff','text-halo-color':['get','bgColor'],'text-halo-width':2}
    });

    // 3D Buildings (from vector tiles)
    if(cartoSrc){
      mapInstance.addLayer({
        id:'3d-buildings',source:cartoSrc,'source-layer':'building',type:'fill-extrusion',minzoom:12,
        paint:{
          'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],10],0,'#1e2d40',15,'#2a4060',30,'#365080',60,'#4a6090'],
          'fill-extrusion-height':['*',['coalesce',['get','render_height'],10], 1.5],
          'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
          'fill-extrusion-opacity':0.88
        }
      });

    // Real OSM buildings from Nagpur (fallback to synthetic if file missing)
    mapInstance.addSource('osm-buildings',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    mapInstance.addLayer({
      id:'osm-3d',type:'fill-extrusion',source:'osm-buildings',minzoom:12,
      paint:{
        'fill-extrusion-color':['interpolate',['linear'],['get','h'],5,'#1a2538',12,'#223450',20,'#2c4568',35,'#365080',50,'#4a6090'],
        'fill-extrusion-height':['*',['get','h'],1.3],
        'fill-extrusion-base':0,
        'fill-extrusion-opacity':0.85
      }
    });
    // Load real data
    fetch('nagpur_buildings.geojson')
      .then(r => r.json())
      .then(data => {
        console.log('Loaded ' + data.features.length + ' real OSM buildings');
        mapInstance.getSource('osm-buildings').setData(data);
      })
      .catch(() => {
        console.log('OSM file not found, using synthetic buildings');
        mapInstance.getSource('osm-buildings').setData(generateSyntheticBuildings());
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
        // Close suggestion popup when clicking elsewhere on map
        hideSuggestionPopup();
      });

      // Suggestion marker click handler
      mapInstance.on('click','suggestion-bg',(e)=>{
        if(!e.features.length) return;
        const feature = e.features[0];
        showSuggestionPopup(feature.properties, e.point);
      });
      mapInstance.on('click','suggestion-icon',(e)=>{
        if(!e.features.length) return;
        const feature = e.features[0];
        showSuggestionPopup(feature.properties, e.point);
      });
      mapInstance.on('mouseenter','suggestion-bg',()=>{
        mapInstance.getCanvas().style.cursor='pointer';
      });
      mapInstance.on('mouseleave','suggestion-bg',()=>{
        mapInstance.getCanvas().style.cursor='';
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
        <div class="tt-row"><span class="tt-key">AQI</span><span class="tt-val" style="color:${d.aqi.at(-1)>150?'var(--color-status-critical)':'var(--color-status-success)'}">${d.aqi.at(-1)}</span></div>
        <div class="tt-row"><span class="tt-key">Traffic</span><span class="tt-val">${d.traffic.at(-1)}/100</span></div>
        <div class="tt-row"><span class="tt-key">Health</span><span class="tt-val" style="color:${d.health.at(-1)<40?'var(--color-status-critical)':'var(--color-status-success)'}">${d.health.at(-1)}/100</span></div>`;
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
  // Global palette strictly aligned to root CSS variables for 3d map blocks
  // mapLibre doesn't support var(), so raw hex are used to match the color scales
  if(metric==='health'){if(val>65)return{top:'#00ff88'};if(val>40)return{top:'#ffd60a'};return{top:'#ff3b3b'};}
  const ranges={aqi:[40,300],traffic:[0,100],energy:[50,3000],water:[50,4000]};
  const[lo,hi]=ranges[metric]||[0,100];const t=Math.max(0,Math.min(1,(val-lo)/(hi-lo)));
  if(t<0.33)return{top:'#00ff88'};   // Green success
  if(t<0.55)return{top:'#ffd60a'};   // Yellow warning
  if(t<0.75)return{top:'#ff8800'};   // Orange severity
  return{top:'#ff3b3b'};           // Red critical
}
function lerpColor(c1,c2,t){
  const h=s=>parseInt(s,16);
  const r1=h(c1.slice(1,3)),g1=h(c1.slice(3,5)),b1=h(c1.slice(5,7));
  const r2=h(c2.slice(1,3)),g2=h(c2.slice(3,5)),b2=h(c2.slice(5,7));
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

// Generate synthetic building footprints to fill coverage gaps
function generateSyntheticBuildings(){
  const features = [];
  // Seeded random for consistency
  let seed = 42;
  function srand(){ seed=(seed*16807+0)%2147483647; return(seed-1)/2147483646; }

  NAGPUR_ZONES.forEach(z => {
    // Config by zone type
    const cfg = {
      industrial:  {count:120, spread:0.012, minW:0.00025, maxW:0.0006, minH:10, maxH:30},
      commercial:  {count:100, spread:0.008, minW:0.00015, maxW:0.0004, minH:12, maxH:45},
      mixed:       {count:100, spread:0.009, minW:0.00012, maxW:0.00035,minH:8,  maxH:35},
      residential: {count:110, spread:0.010, minW:0.00008, maxW:0.00022,minH:6,  maxH:20},
      educational: {count:80,  spread:0.008, minW:0.00015, maxW:0.0004, minH:8,  maxH:25},
    }[z.type] || {count:80, spread:0.008, minW:0.0001, maxW:0.0003, minH:8, maxH:25};

    for(let i = 0; i < cfg.count; i++){
      // Place in a grid-ish pattern with jitter
      const angle = srand() * Math.PI * 2;
      const dist = (0.15 + srand() * 0.85) * cfg.spread;
      const cx = z.lon + Math.cos(angle) * dist;
      const cy = z.lat + Math.sin(angle) * dist;

      // Random building dimensions
      const w = cfg.minW + srand() * (cfg.maxW - cfg.minW);
      const h = cfg.minH + srand() * (cfg.maxH - cfg.minH);
      // Aspect ratio variety
      const aspect = 0.4 + srand() * 1.2;
      const hw = w * aspect;

      // Random rotation
      const rot = srand() * 0.3;

      // Build rectangular polygon (4 corners)
      const corners = [
        [-w/2, -hw/2], [w/2, -hw/2], [w/2, hw/2], [-w/2, hw/2]
      ].map(([dx,dy]) => {
        const rx = dx * Math.cos(rot) - dy * Math.sin(rot);
        const ry = dx * Math.sin(rot) + dy * Math.cos(rot);
        return [cx + rx, cy + ry];
      });
      corners.push(corners[0]); // close ring

      features.push({
        type:'Feature',
        geometry:{type:'Polygon', coordinates:[corners]},
        properties:{h: Math.round(h), zone:z.id}
      });
    }
  });
  return {type:'FeatureCollection', features};
}

function getZonesGeoJSON(){
  const coll=getVoronoiZones();
  const features=JSON.parse(JSON.stringify(coll.features));
  features.forEach(f=>{
    const z=NAGPUR_ZONES.find(zone=>zone.id===f.id);if(!z)return;
    const val=getMetricVal(z.id);const colors=metricToColor(val,activeMetric);
    const hasAlert=events.some(e=>e.zone===z.id);
    let color=colors.top;
    if(hasAlert&&Math.sin(SIM.tick*0.4)>0) color='#ff3b3b'; // Needs hard hex for maplibre 
    else if(z.id===selectedZone) color=lerpColor(colors.top,'#00e5ff',0.4);
    f.properties.color=color;
  });
  return{type:'FeatureCollection',features};
}

function updateMapLibreData(){
  if(!mapInstance) return;
  if(mapInstance.getSource('zones')) mapInstance.getSource('zones').setData(getZonesGeoJSON());
  if(mapInstance.getSource('pollution-heat')) mapInstance.getSource('pollution-heat').setData(getPollutionGeoJSON());
  // Query actual road features from vector tiles and color them by nearest zone's traffic
  if(mapInstance.getSource('traffic-roads') && SIM.tick % 3 === 0) updateTrafficRoads();
  if(mapInstance.getSource('suggestion-markers') && suggestionsVisible) generateAndShowSuggestions();
}

// Query actual road features from vector tiles and color them by nearest zone's traffic
function updateTrafficRoads(){
  if(!mapInstance || !mapReady) return;
  const style = mapInstance.getStyle();
  const cartoSrc = Object.keys(style.sources).find(s => s !== 'zones' && s !== 'pollution-heat' && s !== 'traffic-roads' && s !== 'road-highlight' && s !== 'planner-marker' && s !== 'suggestion-markers');
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

    // Color: green → yellow → orange → red (Using Token Hex equivalents)
    let color;
    if(congestion < 40) color = '#00ff88';
    else if(congestion < 60) color = '#ffd60a';
    else if(congestion < 80) color = '#ff8800';
    else color = '#ff3b3b';

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
// Enhanced AI-powered NLP Query System
async function nlpQuery(question) {
  const resultEl = document.getElementById('nlp-result');
  const inputEl = document.getElementById('nlp-input');
  
  if (!question || question.trim() === '') return;
  
  // Show loading state
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="padding: 15px; text-align: center;">
      <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid var(--color-action-primary); border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div style="margin-top: 10px; color: var(--color-text-muted);">AI analyzing city data...</div>
    </div>
  `;
  
  // Simulate AI processing with impressive results
  setTimeout(() => {
    const response = generateAIResponse(question);
    resultEl.innerHTML = response;
    
    // Add animation to result
    resultEl.style.animation = 'slideInUp 0.5s ease-out';
    
    // Clear input
    if (inputEl) inputEl.value = '';
  }, 1500 + Math.random() * 1000);
}

function generateAIResponse(question) {
  const lowerQ = question.toLowerCase();
  
  // AI responses based on current simulation data
  const responses = {
    'worst aqi zone': () => {
      const worstZone = NAGPUR_ZONES.reduce((worst, zone) => {
        const currentAqi = zoneData[zone.id].aqi[zoneData[zone.id].aqi.length - 1];
        const worstAqi = zoneData[worst.id].aqi[zoneData[worst.id].aqi.length - 1];
        return currentAqi > worstAqi ? zone : worst;
      });
      const currentAqi = zoneData[worstZone.id].aqi[zoneData[worstZone.id].aqi.length - 1];
      return `
        <div style="padding: 20px; background: linear-gradient(135deg, rgba(255,59,59,0.1), rgba(255,59,59,0.05)); border-radius: 12px; border: 1px solid var(--color-status-critical);">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: var(--color-status-critical); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="font-size: 20px;">🚨</span>
            </div>
            <div>
              <div style="font-weight: 600; color: var(--color-text-primary);">Critical Air Quality Alert</div>
              <div style="font-size: 12px; color: var(--color-text-muted);">${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          <div style="margin-bottom: 8px;"><strong>${worstZone.name}</strong> has worst air quality with AQI <strong style="color: var(--color-status-critical);">${currentAqi}</strong></div>
          <div style="font-size: 14px; color: var(--color-text-secondary);">Recommendation: Immediate industrial emission controls required. Health advisory issued for sensitive groups.</div>
        </div>
      `;
    },
    'critical zones': () => {
      const criticalZones = NAGPUR_ZONES.filter(zone => {
        const health = zoneData[zone.id].health[zoneData[zone.id].health.length - 1];
        return health < 40;
      });
      return `
        <div style="padding: 20px; background: linear-gradient(135deg, rgba(255,214,10,0.1), rgba(255,214,10,0.05)); border-radius: 12px; border: 1px solid var(--color-status-warning);">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: var(--color-status-warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="font-size: 20px;">⚠️</span>
            </div>
            <div>
              <div style="font-weight: 600; color: var(--color-text-primary);">${criticalZones.length} Critical Zones Detected</div>
              <div style="font-size: 12px; color: var(--color-text-muted);">Real-time analysis</div>
            </div>
          </div>
          <div style="margin-bottom: 8px;">Critical zones: <strong>${criticalZones.map(z => z.name).join(', ')}</strong></div>
          <div style="font-size: 14px; color: var(--color-text-secondary);">AI recommends immediate resource allocation and emergency response protocols.</div>
        </div>
      `;
    },
    'energy overload': () => {
      const overloadZones = NAGPUR_ZONES.filter(zone => {
        const energy = zoneData[zone.id].energy[zoneData[zone.id].energy.length - 1];
        return energy > zone.baseEnergy * 1.5;
      });
      return `
        <div style="padding: 20px; background: linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.05)); border-radius: 12px; border: 1px solid var(--color-action-primary);">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: var(--color-action-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="font-size: 20px;">⚡</span>
            </div>
            <div>
              <div style="font-weight: 600; color: var(--color-text-primary);">Energy Grid Analysis</div>
              <div style="font-size: 12px; color: var(--color-text-muted);">Predictive load balancing</div>
            </div>
          </div>
          <div style="margin-bottom: 8px;"><strong>${overloadZones.length}</strong> zones experiencing energy overload</div>
          <div style="font-size: 14px; color: var(--color-text-secondary);">AI suggests redistributing load from ${overloadZones.map(z => z.name).slice(0, 2).join(' and ')} to stabilize grid.</div>
        </div>
      `;
    },
    'city health': () => {
      const avgHealth = NAGPUR_ZONES.reduce((sum, zone) => {
        return sum + zoneData[zone.id].health[zoneData[zone.id].health.length - 1];
      }, 0) / NAGPUR_ZONES.length;
      const healthStatus = avgHealth > 70 ? 'Excellent' : avgHealth > 50 ? 'Good' : avgHealth > 30 ? 'Fair' : 'Critical';
      const healthColor = avgHealth > 70 ? 'var(--color-status-success)' : avgHealth > 50 ? 'var(--color-status-warning)' : 'var(--color-status-critical)';
      return `
        <div style="padding: 20px; background: linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,255,136,0.05)); border-radius: 12px; border: 1px solid ${healthColor};">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: ${healthColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="font-size: 20px;">�</span>
            </div>
            <div>
              <div style="font-weight: 600; color: var(--color-text-primary);">Overall City Health: ${healthStatus}</div>
              <div style="font-size: 12px; color: var(--color-text-muted);">Health Score: ${avgHealth.toFixed(1)}/100</div>
            </div>
          </div>
          <div style="margin-bottom: 8px;">AI analysis shows ${avgHealth > 50 ? 'stable' : 'concerning'} urban conditions</div>
          <div style="font-size: 14px; color: var(--color-text-secondary);">${avgHealth > 70 ? 'All systems operating within optimal parameters.' : avgHealth > 50 ? 'Minor issues detected, routine monitoring recommended.' : 'Immediate attention required in multiple sectors.'}</div>
        </div>
      `;
    }
  };
  
  // Check for known queries
  for (const [key, response] of Object.entries(responses)) {
    if (lowerQ.includes(key)) {
      return response();
    }
  }
  
  // Default AI response
  return `
    <div style="padding: 20px; background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.05)); border-radius: 12px; border: 1px solid var(--color-action-secondary);">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; background: var(--color-action-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
          <span style="font-size: 20px;">🤖</span>
        </div>
        <div>
          <div style="font-weight: 600; color: var(--color-text-primary);">AI Analysis Complete</div>
          <div style="font-size: 12px; color: var(--color-text-muted);">Natural Language Processing</div>
        </div>
      </div>
      <div style="margin-bottom: 8px;">Query: "${question}"</div>
      <div style="font-size: 14px; color: var(--color-text-secondary);">AI is analyzing patterns across ${NAGPUR_ZONES.length} zones. Try asking about specific metrics like "worst AQI zone", "critical zones", "energy overload", or "city health".</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// AI URBAN PLANNER
// ══════════════════════════════════════════════════════════
let selectedInfra = 'park';
let plannerResults = [];

const INFRA_CONFIG = {
  park: {
    icon:'🌳', label:'Green Park',
    scoreZone: (z,d) => {
      const aqiWeight = Math.min(1, d.aqi.at(-1) / 200);  // high AQI = needs park more
      const nearResidential = (z.type==='residential'||z.type==='educational') ? 1 : z.type==='mixed'?0.6:0.2;
      const healthNeed = Math.max(0, (80 - d.health.at(-1)) / 80);
      return (aqiWeight * 0.45 + nearResidential * 0.35 + healthNeed * 0.2) * 100;
    },
    reasons: (z,d) => [
      {icon:'🌫️', text:`AQI is ${d.aqi.at(-1)} — a park with ${Math.round(800+Math.random()*400)} trees could reduce this by ~${Math.round(15+Math.random()*20)}% within 500m radius`},
      {icon:'🏠', text:`${z.area} is a ${z.type} zone — ${z.type==='residential'?'families need accessible green spaces for daily recreation':'workers and students benefit from nearby green zones for mental health'}`},
      {icon:'🌡️', text:`Urban Heat Island effect: parks reduce ambient temperature by 2-4°C, critical for Nagpur's 45°C+ summers`},
      {icon:'💚', text:`Zone health score is ${d.health.at(-1)}/100 — green infrastructure directly improves community well-being`},
    ],
    impacts: (z,d) => ({
      aqi: {before:d.aqi.at(-1), after:Math.round(d.aqi.at(-1)*0.78), unit:'', label:'AQI'},
      health: {before:d.health.at(-1), after:Math.min(100,Math.round(d.health.at(-1)*1.18)), unit:'/100', label:'Health Score'},
      temperature: {before:'44°C', after:`${44-Math.round(2+Math.random()*2)}°C`, unit:'', label:'Peak Temperature', isCustom:true},
      property: {before:'₹3200', after:`₹${3200+Math.round(400+Math.random()*300)}`, unit:'/sqft', label:'Property Value', isCustom:true},
    })
  },
  hospital: {
    icon:'🏥', label:'Hospital',
    scoreZone: (z,d) => {
      const healthNeed = Math.max(0, (70 - d.health.at(-1)) / 70);
      const population = (z.type==='residential'||z.type==='mixed') ? 1 : 0.4;
      const aqiRisk = Math.min(1, d.aqi.at(-1) / 250);
      return (healthNeed * 0.4 + population * 0.35 + aqiRisk * 0.25) * 100;
    },
    reasons: (z,d) => [
      {icon:'🚑', text:`Health score is ${d.health.at(-1)}/100 — this zone has ${d.health.at(-1)<50?'critical':'significant'} healthcare access gaps`},
      {icon:'👥', text:`${z.area} is a ${z.type} zone with estimated ${Math.round(15000+Math.random()*25000)} residents needing nearby medical facilities`},
      {icon:'🌫️', text:`AQI of ${d.aqi.at(-1)} means higher respiratory illness rates — proximity to treatment is essential`},
      {icon:'⏱️', text:`Nearest hospital is ${Math.round(3+Math.random()*5)}km away — a new facility cuts emergency response time by ~${Math.round(40+Math.random()*20)}%`},
    ],
    impacts: (z,d) => ({
      health: {before:d.health.at(-1), after:Math.min(100,Math.round(d.health.at(-1)*1.25)), unit:'/100', label:'Health Score'},
      response: {before:'18min', after:`${Math.round(6+Math.random()*4)}min`, unit:'', label:'Emergency Response', isCustom:true},
      coverage: {before:'62%', after:`${Math.round(85+Math.random()*10)}%`, unit:'', label:'Healthcare Coverage', isCustom:true},
      mortality: {before:'2.4%', after:`${(1.2+Math.random()*0.4).toFixed(1)}%`, unit:'', label:'Preventable Mortality', isCustom:true},
    })
  },
  school: {
    icon:'🎓', label:'School',
    scoreZone: (z,d) => {
      const residential = z.type==='residential'?1:z.type==='mixed'?0.7:0.2;
      const lowInfra = z.type==='industrial'?0.1:0.6;
      const trafficSafety = Math.max(0, (100 - d.traffic.at(-1))/100);
      return (residential * 0.45 + lowInfra * 0.25 + trafficSafety * 0.3) * 100;
    },
    reasons: (z,d) => [
      {icon:'👨‍👩‍👧‍👦', text:`${z.area} is a ${z.type} area — ${z.type==='residential'?'high density of families with school-age children':'growing residential needs require educational infrastructure'}`},
      {icon:'🚸', text:`Traffic index is ${d.traffic.at(-1)}/100 — ${d.traffic.at(-1)<50?'safe walking routes for children':'dedicated school zones would reduce pedestrian risk'}`},
      {icon:'📚', text:`nearest school is ${(2+Math.random()*4).toFixed(1)}km away — children currently commute ${Math.round(25+Math.random()*20)} min each way`},
      {icon:'🌱', text:`AQI is ${d.aqi.at(-1)} — ${d.aqi.at(-1)<80?'clean air ideal for outdoor activities':'indoor air filtration systems recommended'}`},
    ],
    impacts: (z,d) => ({
      literacy: {before:'78%', after:`${Math.round(88+Math.random()*7)}%`, unit:'', label:'Literacy Rate', isCustom:true},
      commute: {before:'35min', after:`${Math.round(8+Math.random()*7)}min`, unit:'', label:'Avg Student Commute', isCustom:true},
      health: {before:d.health.at(-1), after:Math.min(100,Math.round(d.health.at(-1)*1.08)), unit:'/100', label:'Zone Health'},
      property: {before:'₹3200', after:`₹${3200+Math.round(200+Math.random()*300)}`, unit:'/sqft', label:'Property Value', isCustom:true},
    })
  },
  ev_station: {
    icon:'⚡', label:'EV Charging Station',
    scoreZone: (z,d) => {
      const trafficWeight = d.traffic.at(-1)/100;
      const commercial = z.type==='commercial'?1:z.type==='mixed'?0.7:0.3;
      const aqiBenefit = Math.min(1, d.aqi.at(-1)/200);
      return (trafficWeight * 0.4 + commercial * 0.3 + aqiBenefit * 0.3) * 100;
    },
    reasons: (z,d) => [
      {icon:'🚗', text:`Traffic congestion is ${d.traffic.at(-1)}/100 — high vehicle density means maximum EV charging utilization`},
      {icon:'🏪', text:`${z.type==='commercial'?'Commercial hub':'Mixed-use area'} — commuters and shoppers need convenient charging while parked`},
      {icon:'🌫️', text:`AQI of ${d.aqi.at(-1)} — EV adoption in this zone could reduce vehicular emissions by ~${Math.round(25+Math.random()*15)}%`},
      {icon:'⚡', text:`Current energy load is ${d.energy.at(-1)}kWh — grid can support ${d.energy.at(-1)<800?'immediate':'phased'} EV infrastructure deployment`},
    ],
    impacts: (z,d) => ({
      aqi: {before:d.aqi.at(-1), after:Math.round(d.aqi.at(-1)*0.85), unit:'', label:'AQI (5-year)'},
      traffic: {before:d.traffic.at(-1), after:Math.max(10,Math.round(d.traffic.at(-1)*0.9)), unit:'/100', label:'Traffic Load'},
      energy: {before:d.energy.at(-1), after:Math.round(d.energy.at(-1)*1.12), unit:'kWh', label:'Energy Demand'},
      ev_adoption: {before:'8%', after:`${Math.round(22+Math.random()*10)}%`, unit:'', label:'EV Adoption Rate', isCustom:true},
    })
  },
  water_plant: {
    icon:'💧', label:'Water Treatment Plant',
    scoreZone: (z,d) => {
      const waterUsage = Math.min(1, d.water.at(-1)/3000);
      const industrial = z.type==='industrial'?1:0.3;
      const burstRisk = events.filter(e=>e.zone===z.id && e.type==='pipe_burst').length > 0 ? 1 : 0.3;
      return (waterUsage * 0.4 + industrial * 0.3 + burstRisk * 0.3) * 100;
    },
    reasons: (z,d) => [
      {icon:'💧', text:`Water usage is ${d.water.at(-1)} L/hr — ${d.water.at(-1)>1500?'dangerously high consumption needs local treatment':'moderate usage benefits from nearby purification'}`},
      {icon:'🏭', text:`${z.type==='industrial'?'Industrial runoff requires water treatment':'Area needs clean water supply'} — reduces pipeline distance by ${Math.round(3+Math.random()*4)}km`},
      {icon:'🔧', text:`${events.filter(e=>e.zone===z.id).length} active incidents — a local plant provides redundancy against main supply failures`},
      {icon:'♻️', text:`Recycled water from treatment can be used for parks and industry, saving ${Math.round(20+Math.random()*15)}% of freshwater demand`},
    ],
    impacts: (z,d) => ({
      water: {before:d.water.at(-1), after:Math.round(d.water.at(-1)*0.7), unit:' L/hr', label:'Water Demand'},
      health: {before:d.health.at(-1), after:Math.min(100,Math.round(d.health.at(-1)*1.12)), unit:'/100', label:'Health Score'},
      leakage: {before:'35%', after:`${Math.round(8+Math.random()*7)}%`, unit:'', label:'Water Loss Rate', isCustom:true},
      cost: {before:'₹12/KL', after:`₹${Math.round(6+Math.random()*3)}/KL`, unit:'', label:'Treatment Cost', isCustom:true},
    })
  },
  solar_farm: {
    icon:'☀️', label:'Solar Farm',
    scoreZone: (z,d) => {
      const energyLoad = Math.min(1, d.energy.at(-1)/2000);
      const industrial = z.type==='industrial'?1:z.type==='commercial'?0.6:0.3;
      const aqiBenefit = Math.min(1, d.aqi.at(-1)/200);
      return (energyLoad * 0.45 + industrial * 0.3 + aqiBenefit * 0.25) * 100;
    },
    reasons: (z,d) => [
      {icon:'⚡', text:`Energy consumption is ${d.energy.at(-1)} kWh — a solar farm could offset ${Math.round(30+Math.random()*25)}% of this zone's demand`},
      {icon:'🏭', text:`${z.type==='industrial'?'Heavy industrial load makes solar ROI highest here':'Commercial/residential area benefits from distributed solar'}`},
      {icon:'🌡️', text:`Nagpur receives ~5.5 kWh/m²/day of solar irradiance — among the highest in India, ideal for solar deployment`},
      {icon:'🌫️', text:`Replacing ${Math.round(15+Math.random()*20)}% of grid power with solar reduces emissions equivalent to ${Math.round(200+Math.random()*300)} tons CO₂/year`},
    ],
    impacts: (z,d) => ({
      energy: {before:d.energy.at(-1), after:Math.round(d.energy.at(-1)*0.68), unit:' kWh', label:'Grid Dependency'},
      aqi: {before:d.aqi.at(-1), after:Math.round(d.aqi.at(-1)*0.9), unit:'', label:'AQI Impact'},
      cost: {before:'₹8.5/kWh', after:`₹${(4+Math.random()*2).toFixed(1)}/kWh`, unit:'', label:'Energy Cost', isCustom:true},
      carbon: {before:'1200t', after:`${Math.round(600+Math.random()*200)}t`, unit:'/yr', label:'CO₂ Emissions', isCustom:true},
    })
  }
};

function selectInfra(type) {
  selectedInfra = type;
  document.querySelectorAll('.infra-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

function runPlanner() {
  const config = INFRA_CONFIG[selectedInfra];
  if(!config) return;

  const zoneSel = document.getElementById('planner-zone-sel').value;

  if(zoneSel === 'all') {
    // City-wide: score all zones
    const scored = NAGPUR_ZONES.map(z => {
      const d = zoneData[z.id];
      const score = Math.round(config.scoreZone(z, d));
      return { zone: z, score: Math.min(100, Math.max(0, score)) };
    });
    scored.sort((a, b) => b.score - a.score);
    plannerResults = scored.slice(0, 3);
  } else {
    // Zone-specific: find best spots WITHIN the selected zone
    const z = NAGPUR_ZONES.find(zn => zn.id === zoneSel);
    if(!z) return;
    const d = zoneData[z.id];
    const baseScore = Math.round(config.scoreZone(z, d));

    // Generate 3 candidate sub-spots in different directions within the zone
    const spots = [
      {label:'North-West Quadrant', dlat: 0.003, dlon:-0.003, bonus: 5},
      {label:'North-East Quadrant', dlat: 0.003, dlon: 0.003, bonus: 2},
      {label:'South Quadrant',      dlat:-0.003, dlon: 0.001, bonus: 0},
    ];
    plannerResults = spots.map((sp, i) => ({
      zone: {
        ...z,
        name: z.name + ' — ' + sp.label,
        lat: z.lat + sp.dlat + (Math.random()-0.5)*0.001,
        lon: z.lon + sp.dlon + (Math.random()-0.5)*0.001,
        _parentZone: z  // keep reference to original zone for data
      },
      score: Math.min(100, Math.max(0, baseScore + sp.bonus - i * 4 + Math.round(Math.random()*6 - 3)))
    }));
    plannerResults.sort((a,b) => b.score - a.score);
  }

  // Render recommendation cards
  const results = document.getElementById('planner-results');
  const titleText = zoneSel === 'all' ? 'TOP RECOMMENDATIONS' : 'BEST SPOTS IN ' + plannerResults[0].zone._parentZone?.name.toUpperCase() || '';
  results.innerHTML = '<div class="why-title" style="margin-bottom:12px">' + (zoneSel === 'all' ? 'TOP RECOMMENDATIONS' : titleText) + '</div>' +
    plannerResults.map((r, i) => `
      <div class="rec-card rank-${i+1} ${i===0?'selected':''}" onclick="showRecommendation(${i})">
        <div class="rec-rank r${i+1}">#${i+1}</div>
        <div class="rec-zone">${config.icon} ${r.zone.name}</div>
        <div class="rec-area">${r.zone.area} · ${r.zone.type}</div>
        <div class="rec-score">
          <div class="rec-score-bar"><div class="rec-score-fill" style="width:${r.score}%"></div></div>
          <div class="rec-score-val">${r.score}%</div>
        </div>
      </div>
    `).join('');

  // Show #1 recommendation impact
  showRecommendation(0);
}

function showRecommendation(index) {
  const config = INFRA_CONFIG[selectedInfra];
  const rec = plannerResults[index];
  if(!rec || !config) return;

  const z = rec.zone;
  const dataZone = z._parentZone || z;  // use parent zone's data for sub-spots
  const d = zoneData[dataZone.id];

  // Highlight selected card
  document.querySelectorAll('.rec-card').forEach((c,i) => c.classList.toggle('selected', i===index));

  const reasons = config.reasons(z, d);
  const impacts = config.impacts(z, d);

  const impactPanel = document.getElementById('planner-impact');
  impactPanel.innerHTML = `
    <div class="impact-header">${config.icon} ${config.label} — RECOMMENDATION</div>
    <div class="impact-zone-name">${z.name}</div>
    <div class="impact-zone-area">${z.area} · ${z.type} zone · Suitability: ${rec.score}%</div>

    <div style="display:flex;align-items:center;gap:10px;margin:12px 0 16px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:14px">📍</span>
      <span style="font-family:var(--mono);font-size:13px;color:var(--cyan)">${z.lat.toFixed(4)}, ${z.lon.toFixed(4)}</span>
      <button onclick="navigator.clipboard.writeText('${z.lat.toFixed(6)}, ${z.lon.toFixed(6)}');this.textContent='✅ Copied!';setTimeout(()=>this.textContent='📋 Copy',1500)" style="margin-left:auto;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--text);font-family:var(--font);font-size:11px;cursor:pointer">📋 Copy</button>
    </div>

    <div class="why-section">
      <div class="why-title">🔍 WHY THIS LOCATION?</div>
      <ul class="why-list">
        ${reasons.map(r => `<li class="why-item"><span class="why-icon">${r.icon}</span><span>${r.text}</span></li>`).join('')}
      </ul>
    </div>

    <div class="why-title">📊 PROJECTED CITY IMPACT</div>
    <div class="impact-grid">
      ${Object.values(impacts).map(imp => {
        const before = imp.isCustom ? imp.before : imp.before;
        const after = imp.isCustom ? imp.after : imp.after;
        // Determine if positive
        let isPositive = true;
        if(!imp.isCustom) {
          isPositive = (imp.label.includes('Health') || imp.label.includes('Coverage')) ? after > before : after < before;
        }
        return `<div class="impact-card ${isPositive?'positive':'negative'}">
          <div class="impact-metric">${imp.label}</div>
          <div class="impact-before">${before}${imp.isCustom?'':imp.unit}</div>
          <div class="impact-arrow">${isPositive?'⬇️ ':'⬆️ '}</div>
          <div class="impact-after" style="color:${isPositive?'var(--green)':'var(--orange)'}">${after}${imp.isCustom?'':imp.unit}</div>
        </div>`;
      }).join('')}
    </div>

    <button class="map-link-btn" onclick="showOnMap('${z.id}')">🗺️ Show on 3D Map</button>
  `;
}

function showOnMap(zoneId) {
  selectedZone = zoneId;
  const config = INFRA_CONFIG[selectedInfra];
  const z = NAGPUR_ZONES.find(zn => zn.id === zoneId);
  switchPage('map');

  if(mapInstance && z) {
    // First fly to the zone so tiles load
    mapInstance.flyTo({center:[z.lon, z.lat], zoom:16, pitch:60, duration:2000});

    // After fly completes and tiles load, find open space
    setTimeout(() => {
      const openSpot = findOpenSpace(z.lon, z.lat);
      const spotLon = openSpot[0], spotLat = openSpot[1];
      window._plannerSpot = {lat: spotLat, lon: spotLon};

      const markerData = {
        type:'FeatureCollection',
        features:[{
          type:'Feature',
          geometry:{type:'Point',coordinates:[spotLon, spotLat]},
          properties:{
            label: (config ? config.icon + ' ' + config.label : 'Recommendation') + '\n' + z.name + ' \u2014 Open Space\n' + spotLat.toFixed(4) + ', ' + spotLon.toFixed(4)
          }
        }]
      };
      if(mapInstance.getSource('planner-marker')) {
        mapInstance.getSource('planner-marker').setData(markerData);
      }

      // Pan to the open spot
      mapInstance.panTo([spotLon, spotLat], {duration:800});

      // Animate pulsing ring
      let pulseSize = 20, growing = true;
      if(window._plannerPulse) clearInterval(window._plannerPulse);
      window._plannerPulse = setInterval(() => {
        if(!mapInstance) { clearInterval(window._plannerPulse); return; }
        pulseSize += growing ? 1.5 : -1.5;
        if(pulseSize >= 50) growing = false;
        if(pulseSize <= 20) growing = true;
        mapInstance.setPaintProperty('planner-ring','circle-radius', pulseSize);
        mapInstance.setPaintProperty('planner-ring','circle-stroke-opacity', 0.3 + (50 - pulseSize)/50 * 0.5);
      }, 40);
    }, 2500);
  }
}

// Scan points around center and find one with no buildings or roads
function findOpenSpace(centerLon, centerLat) {
  if(!mapInstance) return [centerLon, centerLat];
  const style = mapInstance.getStyle();
  const cartoSrc = Object.keys(style.sources).find(s =>
    s !== 'zones' && s !== 'pollution-heat' && s !== 'traffic-roads' &&
    s !== 'road-highlight' && s !== 'planner-marker'
  );
  const blockerLayers = style.layers
    .filter(l => l.source === cartoSrc && (l['source-layer'] === 'building' || l['source-layer'] === 'transportation'))
    .map(l => l.id);
  if(!blockerLayers.length) return [centerLon, centerLat];

  // Spiral grid of candidate points (~100m steps)
  const step = 0.001;
  const candidates = [];
  for(let r = 1; r <= 3; r++) {
    for(let angle = 0; angle < 360; angle += (r === 1 ? 45 : r === 2 ? 30 : 60)) {
      const rad = angle * Math.PI / 180;
      candidates.push([centerLon + Math.cos(rad)*step*r, centerLat + Math.sin(rad)*step*r]);
    }
  }

  let bestPoint = [centerLon, centerLat];
  let minBlockers = Infinity;
  candidates.forEach(([lon, lat]) => {
    try {
      const px = mapInstance.project([lon, lat]);
      const bbox = [[px.x - 15, px.y - 15], [px.x + 15, px.y + 15]];
      const features = mapInstance.queryRenderedFeatures(bbox, {layers: blockerLayers});
      if(features.length < minBlockers) {
        minBlockers = features.length;
        bestPoint = [lon, lat];
      }
    } catch(e) { /* off screen */ }
  });
  return bestPoint;
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
// INFRASTRUCTURE SUGGESTIONS OVERLAY SYSTEM
// ══════════════════════════════════════════════════════════
let suggestionsVisible = false;
let currentSuggestions = [];

const INFRA_TYPES = ['park', 'hospital', 'school', 'ev_station', 'water_plant', 'solar_farm'];

const INFRA_COLORS = {
  park: '#22c55e',
  hospital: '#ef4444',
  school: '#3b82f6',
  ev_station: '#f59e0b',
  water_plant: '#06b6d4',
  solar_farm: '#eab308'
};

function toggleSuggestions() {
  suggestionsVisible = !suggestionsVisible;
  const btn = document.getElementById('suggestions-toggle-btn');
  if(btn) {
    btn.textContent = suggestionsVisible ? '🔽 Hide Suggestions' : '🔼 Show Suggestions';
    btn.classList.toggle('active', suggestionsVisible);
  }
  if(suggestionsVisible) {
    generateAndShowSuggestions();
  } else {
    hideSuggestions();
  }
}

function generateAndShowSuggestions() {
  if(!mapInstance) return;
  const features = [];
  
  // Generate top 2 suggestions for each infrastructure type across all zones
  INFRA_TYPES.forEach(type => {
    const config = INFRA_CONFIG[type];
    if(!config) return;
    
    // Score all zones for this infrastructure type
    const scored = NAGPUR_ZONES.map(z => {
      const d = zoneData[z.id];
      const score = Math.round(config.scoreZone(z, d));
      return { zone: z, score: Math.min(100, Math.max(0, score)), data: d };
    });
    scored.sort((a, b) => b.score - a.score);
    
    // Take top 2 zones for this type
    const topZones = scored.slice(0, 2);
    topZones.forEach((item, idx) => {
      const z = item.zone;
      const d = item.data;
      const reasons = config.reasons(z, d);
      const impacts = config.impacts(z, d);
      
      // Offset positions slightly for visual separation
      const offsetLat = (Math.random() - 0.5) * 0.008;
      const offsetLon = (idx === 0 ? -0.006 : 0.006) + (Math.random() - 0.5) * 0.003;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [z.lon + offsetLon, z.lat + offsetLat] },
        properties: {
          icon: config.icon,
          label: config.label,
          shortLabel: config.label.split(' ')[0],
          type: type,
          zoneId: z.id,
          zoneName: z.name,
          area: z.area,
          zoneType: z.type,
          score: item.score,
          bgColor: INFRA_COLORS[type],
          markerSize: 22,
          reasons: JSON.stringify(reasons),
          impacts: JSON.stringify(impacts),
          aqi: d.aqi.at(-1),
          traffic: d.traffic.at(-1),
          health: d.health.at(-1),
          energy: d.energy.at(-1),
          water: d.water.at(-1)
        }
      });
    });
  });
  
  currentSuggestions = features;
  if(mapInstance.getSource('suggestion-markers')) {
    mapInstance.getSource('suggestion-markers').setData({ type: 'FeatureCollection', features });
  }
}

function hideSuggestions() {
  if(mapInstance && mapInstance.getSource('suggestion-markers')) {
    mapInstance.getSource('suggestion-markers').setData({ type: 'FeatureCollection', features: [] });
  }
}

function hideSuggestionPopup() {
  const popup = document.getElementById('suggestion-popup');
  if(popup) popup.style.display = 'none';
}

function showSuggestionPopup(props, point) {
  let popup = document.getElementById('suggestion-popup');
  if(!popup) {
    popup = document.createElement('div');
    popup.id = 'suggestion-popup';
    popup.className = 'suggestion-popup';
    document.querySelector('.map-wrap').appendChild(popup);
  }
  
  let reasons = [], impacts = {};
  try {
    reasons = JSON.parse(props.reasons || '[]');
    impacts = JSON.parse(props.impacts || '{}');
  } catch(e) {}
  
  const config = INFRA_CONFIG[props.type] || { label: props.label, icon: props.icon };
  
  popup.innerHTML = `
    <div class="suggestion-popup-header">
      <span class="suggestion-popup-icon">${props.icon}</span>
      <div class="suggestion-popup-title">
        <div class="suggestion-popup-label">${config.label}</div>
        <div class="suggestion-popup-zone">${props.zoneName} · ${props.area}</div>
      </div>
      <button class="suggestion-popup-close" onclick="hideSuggestionPopup()">×</button>
    </div>
    <div class="suggestion-popup-score">
      <div class="suggestion-score-bar">
        <div class="suggestion-score-fill" style="width:${props.score}%;background:${props.bgColor}"></div>
      </div>
      <span class="suggestion-score-val">${props.score}% Match</span>
    </div>
    <div class="suggestion-popup-section">
      <div class="suggestion-section-title">🔍 Why this location?</div>
      <ul class="suggestion-reasons">
        ${reasons.map(r => `<li><span class="suggestion-reason-icon">${r.icon}</span>${r.text}</li>`).join('')}
      </ul>
    </div>
    <div class="suggestion-popup-section">
      <div class="suggestion-section-title">📊 Projected Impact</div>
      <div class="suggestion-impacts">
        ${Object.values(impacts).map(imp => {
          const isPositive = imp.label.includes('Health') || imp.label.includes('Coverage') || imp.label.includes('Literacy') || imp.label.includes('Adoption') || imp.label.includes('Value')
            ? imp.after > imp.before 
            : imp.after < imp.before;
          return `<div class="suggestion-impact ${isPositive ? 'positive' : 'negative'}">
            <span class="impact-label">${imp.label}</span>
            <span class="impact-values">${imp.before}${imp.unit || ''} → <b>${imp.after}${imp.unit || ''}</b></span>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="suggestion-popup-section">
      <div class="suggestion-section-title">📍 Zone Metrics</div>
      <div class="suggestion-metrics">
        <div class="suggestion-metric"><span>AQI</span><span style="color:${props.aqi > 150 ? '#ff3b3b' : props.aqi > 80 ? '#ffd60a' : '#00ff88'}">${props.aqi}</span></div>
        <div class="suggestion-metric"><span>Traffic</span><span>${props.traffic}/100</span></div>
        <div class="suggestion-metric"><span>Health</span><span style="color:${props.health < 40 ? '#ff3b3b' : props.health < 65 ? '#ffd60a' : '#00ff88'}">${props.health}</span></div>
        <div class="suggestion-metric"><span>Energy</span><span>${props.energy}kWh</span></div>
        <div class="suggestion-metric"><span>Water</span><span>${props.water}L</span></div>
      </div>
    </div>
  `;
  
  // Position popup
  const mapWrap = document.querySelector('.map-wrap');
  const rect = mapWrap.getBoundingClientRect();
  let left = point.x + 20;
  let top = point.y - 50;
  
  // Keep within bounds
  if(left + 350 > rect.width) left = point.x - 370;
  if(top + 400 > rect.height) top = rect.height - 420;
  if(top < 10) top = 10;
  
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.display = 'block';
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

// ══════════════════════════════════════════════════════════
// DATA UPLOAD & PROCESSING
// ══════════════════════════════════════════════════════════

let uploadedDatasets = [];
let processedData = {
  traffic: [],
  pollution: [],
  transportation: [],
  population: []
};

// Initialize upload functionality
function initUploadPage() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  
  if (!uploadZone || !fileInput) return;
  
  // Drag and drop events
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
}

function handleFiles(files) {
  const validFiles = Array.from(files).filter(file => {
    const isValidType = file.name.match(/\.(csv|xlsx|xls)$/i);
    const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
    return isValidType && isValidSize;
  });
  
  if (validFiles.length === 0) {
    alert('Please upload valid CSV or Excel files under 50MB');
    return;
  }
  
  processFiles(validFiles);
}

async function processFiles(files) {
  showProcessingStatus();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await processFile(file, i, files.length);
  }
  
  hideProcessingStatus();
  updateFilesList();
  generateDataQualityReport();
  updateAnalyticsWithNewData();
}

async function processFile(file, index, total) {
  updateProgress((index / total) * 25, 'Uploading files...');
  await simulateDelay(500);
  
  updateProgress(((index + 1) / total) * 25 + 25, 'Cleaning data...');
  await simulateDelay(800);
  
  updateProgress(((index + 1) / total) * 25 + 50, 'Normalizing data...');
  await simulateDelay(600);
  
  updateProgress(((index + 1) / total) * 25 + 75, 'Analyzing patterns...');
  await simulateDelay(400);
  
  // Store file info
  uploadedDatasets.push({
    name: file.name,
    size: file.size,
    type: getFileType(file.name),
    uploadTime: new Date(),
    records: Math.floor(Math.random() * 50000) + 10000,
    processed: true
  });
}

function getFileType(filename) {
  if (filename.toLowerCase().includes('traffic')) return 'Traffic Data';
  if (filename.toLowerCase().includes('pollution') || filename.toLowerCase().includes('aqi')) return 'Pollution Data';
  if (filename.toLowerCase().includes('transport')) return 'Transportation Data';
  if (filename.toLowerCase().includes('population')) return 'Population Data';
  return 'General Data';
}

function showProcessingStatus() {
  const status = document.getElementById('processingStatus');
  if (status) {
    status.style.display = 'block';
    updateProgress(0, 'Starting...');
    updateStepStatus(1, 'active');
  }
}

function hideProcessingStatus() {
  const status = document.getElementById('processingStatus');
  if (status) {
    setTimeout(() => {
      status.style.display = 'none';
      updateStepStatus(4, 'completed');
    }, 1000);
  }
}

function updateProgress(percent, text) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) progressFill.style.width = percent + '%';
  if (progressText) progressText.textContent = Math.round(percent) + '%';
  
  // Update step indicators
  if (percent > 0) updateStepStatus(1, 'completed');
  if (percent > 25) updateStepStatus(2, 'active');
  if (percent > 50) updateStepStatus(2, 'completed');
  if (percent > 75) updateStepStatus(3, 'active');
  if (percent > 90) updateStepStatus(3, 'completed');
  if (percent > 95) updateStepStatus(4, 'active');
}

function updateStepStatus(step, status) {
  const stepElement = document.getElementById(`step${step}`);
  if (stepElement) {
    stepElement.className = 'step-item ' + status;
  }
}

function updateFilesList() {
  const filesList = document.getElementById('filesList');
  if (!filesList) return;
  
  filesList.innerHTML = uploadedDatasets.map((file, index) => `
    <div class="file-item">
      <div class="file-info">
        <div class="file-icon">📊</div>
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">${file.type} • ${formatFileSize(file.size)} • ${file.records.toLocaleString()} records</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="file-action-btn" onclick="viewDataset(${index})">View</button>
        <button class="file-action-btn" onclick="removeDataset(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

function generateDataQualityReport() {
  const report = document.getElementById('qualityReport');
  if (!report || uploadedDatasets.length === 0) return;
  
  const totalRecords = uploadedDatasets.reduce((sum, file) => sum + file.records, 0);
  const validRecords = Math.floor(totalRecords * 0.92);
  const missingValues = Math.floor(totalRecords * 0.05);
  const outliers = Math.floor(totalRecords * 0.03);
  const completeness = Math.round((validRecords / totalRecords) * 100);
  
  document.getElementById('validRecords').textContent = validRecords.toLocaleString();
  document.getElementById('missingValues').textContent = missingValues.toLocaleString();
  document.getElementById('outliers').textContent = outliers.toLocaleString();
  document.getElementById('completeness').textContent = completeness + '%';
  
  report.style.display = 'block';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function viewDataset(index) {
  const file = uploadedDatasets[index];
  alert(`Viewing dataset: ${file.name}\nType: ${file.type}\nRecords: ${file.records.toLocaleString()}\nUpload Time: ${file.uploadTime.toLocaleString()}`);
}

function removeDataset(index) {
  uploadedDatasets.splice(index, 1);
  updateFilesList();
  if (uploadedDatasets.length === 0) {
    document.getElementById('qualityReport').style.display = 'none';
  }
}

function clearAllFiles() {
  if (confirm('Are you sure you want to remove all uploaded datasets?')) {
    uploadedDatasets = [];
    updateFilesList();
    document.getElementById('qualityReport').style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════
// ENHANCED ANALYTICS FUNCTIONALITY
// ══════════════════════════════════════════════════════════

function initEnhancedAnalytics() {
  initCorrelationCharts();
  initPeakAnalysisCharts();
  updatePredictiveAnalysis();
  updateStatisticalAnalysis();
}

function initCorrelationCharts() {
  // Traffic-Pollution Correlation
  const trafficPollutionCtx = document.getElementById('trafficPollutionChart');
  if (trafficPollutionCtx) {
    new Chart(trafficPollutionCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Traffic vs Pollution',
          data: generateCorrelationData(0.87),
          backgroundColor: 'rgba(255, 59, 59, 0.6)',
          borderColor: 'rgba(255, 59, 59, 1)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
  
  // Population-Transport Correlation
  const populationTransportCtx = document.getElementById('populationTransportChart');
  if (populationTransportCtx) {
    new Chart(populationTransportCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Population vs Transport',
          data: generateCorrelationData(0.65),
          backgroundColor: 'rgba(255, 214, 10, 0.6)',
          borderColor: 'rgba(255, 214, 10, 1)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
  
  // Energy-Industry Correlation
  const energyIndustryCtx = document.getElementById('energyIndustryChart');
  if (energyIndustryCtx) {
    new Chart(energyIndustryCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Energy vs Industry',
          data: generateCorrelationData(0.92),
          backgroundColor: 'rgba(168, 85, 247, 0.6)',
          borderColor: 'rgba(168, 85, 247, 1)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
  
  // Time-Activity Correlation
  const timeActivityCtx = document.getElementById('timeActivityChart');
  if (timeActivityCtx) {
    new Chart(timeActivityCtx, {
      type: 'line',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        datasets: [{
          label: 'Activity Pattern',
          data: [20, 15, 85, 70, 90, 60, 25],
          borderColor: 'rgba(0, 255, 136, 1)',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
}

function generateCorrelationData(correlation) {
  const data = [];
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 100;
    const y = x * correlation + (Math.random() - 0.5) * 20;
    data.push({ x, y });
  }
  return data;
}

function initPeakAnalysisCharts() {
  // Traffic Peak Chart
  const trafficPeakCtx = document.getElementById('trafficPeakChart');
  if (trafficPeakCtx) {
    new Chart(trafficPeakCtx, {
      type: 'line',
      data: {
        labels: ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM'],
        datasets: [{
          label: 'Traffic Flow',
          data: [45, 72, 95, 88, 65, 52],
          borderColor: 'rgba(0, 229, 255, 1)',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
  
  // Transport Peak Chart
  const transportPeakCtx = document.getElementById('transportPeakChart');
  if (transportPeakCtx) {
    new Chart(transportPeakCtx, {
      type: 'line',
      data: {
        labels: ['4PM', '5PM', '6PM', '7PM', '8PM', '9PM'],
        datasets: [{
          label: 'Transport Usage',
          data: [68, 85, 92, 78, 62, 45],
          borderColor: 'rgba(255, 214, 10, 1)',
          backgroundColor: 'rgba(255, 214, 10, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
}

function updatePredictiveAnalysis() {
  // Update predictions based on current data
  const zones = ['Sitabuldi', 'Gandhibagh', 'Itwari', 'MIDC Hingna', 'Wathoda', 'Kamptee Road'];
  
  // Simulate prediction updates
  setInterval(() => {
    // Shuffle predictions occasionally
    if (Math.random() < 0.1) {
      // Update congestion predictions
      const congestionItems = document.querySelectorAll('.prediction-card:first-child .prediction-item');
      congestionItems.forEach(item => {
        const riskElement = item.querySelector('.prediction-risk');
        const currentRisk = riskElement.textContent;
        const risks = ['High Risk', 'Medium Risk', 'Low Risk'];
        const newRisk = risks[Math.floor(Math.random() * risks.length)];
        if (currentRisk !== newRisk) {
          riskElement.textContent = newRisk;
          riskElement.className = 'prediction-risk ' + newRisk.toLowerCase().replace(' ', '');
        }
      });
    }
  }, 10000);
}

function updateStatisticalAnalysis() {
  // Update statistical metrics periodically
  setInterval(() => {
    // Simulate real-time updates
    const metricValues = document.querySelectorAll('.metric-value');
    metricValues.forEach(element => {
      if (Math.random() < 0.2) {
        const currentValue = element.textContent;
        if (currentValue.includes('±')) {
          // Standard deviation - small changes
          const baseValue = parseFloat(currentValue.replace(/[^\d.]/g, ''));
          const newValue = (baseValue + (Math.random() - 0.5) * 10).toFixed(0);
          element.textContent = '±' + newValue;
        } else if (currentValue.includes('vehicles/hr')) {
          // Traffic flow - moderate changes
          const baseValue = parseFloat(currentValue.replace(/[^\d,]/g, ''));
          const newValue = Math.round(baseValue + (Math.random() - 0.5) * 100);
          element.textContent = newValue.toLocaleString() + ' vehicles/hr';
        } else if (currentValue.includes('AQI')) {
          // AQI - small changes
          const baseValue = parseFloat(currentValue.replace(/[^\d.]/g, ''));
          const newValue = Math.round(baseValue + (Math.random() - 0.5) * 5);
          element.textContent = newValue;
        }
      }
    });
  }, 15000);
}

function updateAnalyticsWithNewData() {
  // Update analytics when new data is uploaded
  if (uploadedDatasets.length > 0) {
    // Add new data points to existing charts
    updateSparklinesWithData();
    
    // Show notification
    showNotification('📊 Data Processed', `${uploadedDatasets.length} datasets successfully analyzed`);
  }
}

function updateSparklinesWithData() {
  // Add simulated data points based on uploaded datasets
  const dataMultiplier = 1 + (uploadedDatasets.length * 0.1);
  
  Object.keys(zoneData).forEach(zoneId => {
    ['aqi', 'traffic', 'energy', 'water'].forEach(metric => {
      const currentValue = zoneData[zoneId][metric][zoneData[zoneId][metric].length - 1];
      const newValue = Math.round(currentValue * dataMultiplier);
      pushBuf(zoneData[zoneId][metric], newValue);
    });
  });
  
  // Update charts if on analytics page
  if (currentPage === 'analytics') {
    updateAnalytics();
  }
}

function showNotification(title, message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 80px; right: 20px; z-index: 2000;
    background: linear-gradient(135deg, rgba(0,229,255,0.95), rgba(168,85,247,0.95));
    padding: 20px; border-radius: 12px; color: white;
    font-family: var(--font-sans); max-width: 300px;
    backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
    animation: slideInRight 0.5s ease-out;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">${title}</div>
    <div style="font-size: 14px; opacity: 0.9;">${message}</div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.5s ease-out';
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

// Initialize upload page when switching to it
const originalSwitchPage = switchPage;
switchPage = function(page) {
  originalSwitchPage(page);
  if (page === 'upload') {
    setTimeout(initUploadPage, 100);
  } else if (page === 'analytics') {
    setTimeout(initEnhancedAnalytics, 100);
  }
};
