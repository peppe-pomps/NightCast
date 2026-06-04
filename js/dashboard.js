// Location
const state = {
    lat: null,
    lon: null,
    locationName: 'No position',
    selectedDay: 0,
}
 
let weatherCache = null;
let map = null;
let marker = null;
  
  // INIT MAP
function initMap(lat, lon){
    const coordinates = [lat, lon]
  
    if(map){
      map.setView(coordinates, 10);
      marker.setLatLng(coordinates);
      return;
    }
  
    map = L.map('mini-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView(coordinates, 10);
  
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
  
    marker = L.marker(coordinates, {draggable: true}).addTo(map);
  
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      await setPosition(pos.lat, pos.lng, true);
    });
  
    map.on('click', async (e) => {
      await setPosition(e.latlng.lat, e.latlng.lng, true);
    });
}
  
  //SAVE STATE
function saveState(){
    localStorage.setItem('nightcast_state', JSON.stringify({
      lat: state.lat,
      lon: state.lon,
      locationName: state.locationName,
    }));
}
  
  //LOAD STATE
function loadState(){
    const saved = localStorage.getItem('nightcast_state');
    if(!saved) return false;
  
    const data = JSON.parse(saved);
    state.lat = data.lat;
    state.lon = data.lon;
    state.locationName = data.locationName;
  
    return true;
}
  
  //SET POSITION
async function setPosition(lat, lon, reverseGeocode = false){
    state.lat = lat;
    state.lon = lon;
    weatherCache = null;
    const coordinates = [lat, lon]
  
    if(reverseGeocode){
      const name = await reverseGeocodeCoords(lat, lon);
      state.locationName = name;
    }
  
    document.getElementById('location-name').textContent = state.locationName;
  
    if(map){
      map.setView(coordinates, 10);
      marker.setLatLng(coordinates);
      map.invalidateSize();
    }else{
      initMap(lat, lon);
      setTimeout(() => map.invalidateSize(), 300);
    }
  
    saveState();
    updateDashboard();
}
  
  // GPS
document.getElementById('button-gps').addEventListener('click', () => {
    if(!navigator.geolocation){
      alert('Geolocalization not supported by the browser.');
      return;
    }
  
    document.getElementById('location-name').textContent = 'Rilevamento...';
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const {latitude, longitude} = pos.coords;
        const name = await reverseGeocodeCoords(latitude, longitude);
        
        state.locationName = name;
  
        await setPosition(latitude, longitude, false);
      },
      () => {
        document.getElementById('location-name').textContent = 'Posizione non disponibile';
      }
    );
});
  
async function searchCity(query){
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {headers: {'Accept-language': 'it'}});
    const data = await res.json();
  
    if(!data.length) return null;
  
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      name: data[0].display_name.split(',').slice(0, 2).join(',')
    }
}
  
async function reverseGeocodeCoords(lat, lon){
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, {headers: {'Accept-Language': 'it'}});
    const data = await res.json();
    const address = data.address;
    return address.city || address.town || address.village || address.county || 'Posizione sconosciuta';
}
  
document.getElementById('button-search').addEventListener('click', async () => {
    const query = document.getElementById('location-input').value.trim();
  
    if(!query) return;
  
    document.getElementById('location-name').textContent = 'Ricerca...';
    
    const result = await searchCity(query);
  
    if(!result){
      document.getElementById('location-name').textContent = 'Città non trovata';
      return;
    }
  
    state.locationName = result.name;
  
    await setPosition(result.lat, result.lon, false);
    
    document.getElementById('location-input').value = '';
  });
  
  document.getElementById('location-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('button-search').click()
});
  
  //INIT POSITION
if(loadState() && state.lat && state.lon){
    (async () => {
      document.getElementById('location-name').textContent = state.locationName;
      await setPosition(state.lat, state.lon, false);
      await updateDashboard();
    })();
}else{
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
          const { latitude, longitude } = pos.coords;
          const name = await reverseGeocodeCoords(latitude, longitude);
          state.locationName = name;
          await setPosition(latitude, longitude, false);
          saveState();
      }, () => {
          initMap(41.9028, 12.4964); //ROMA
          document.getElementById('location-name').textContent = 'Posizione non disponibile';
      });  
}
  
// DAY SELECTOR
const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  
function buildDaySelector(){
    const day_selector = document.getElementById('day-selector');
    day_selector.innerHTML = '';
  
    for(let i = 0; i < 7; i++){
      const date = new Date();
      date.setDate(date.getDate() + i);
  
      const button = document.createElement('button');
      button.className = 'day-button' + (i === state.selectedDay ? ' active' : '');
      button.innerHTML = `
        <span class="day-name">${i === 0 ? 'Oggi' : DAYS[date.getDay()]}</span>
        <span class="day-num">${date.getDate()} ${MONTHS[date.getMonth()]}</span>
      `;
      button.addEventListener('click', () => {
        state.selectedDay = i;
        document.querySelectorAll('.day-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        updateDashboard();
      })
  
      day_selector.appendChild(button);
    }
}
  
buildDaySelector()

function getSelectedDay(){
  const date = new Date();
  date.setDate(date.getDate() + state.selectedDay);
  date.setHours(22, 0, 0, 0);
  return date;
}

// ASTRONOMY ENGINE
function getObserver(){
  return new Astronomy.Observer(state.lat, state.lon, 0);
}

function degreesToCardinal(deg){
  const dirs = ['N','NE','E','SE','S','SO','O','NO'];
  return dirs[Math.round(deg / 45) % 8];
}

function isVisible(body, date, observer){
  try{
    const equator = Astronomy.Equator(body, date, observer, true, true);
    const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
    return horizon.altitude > 10;
  }catch{
    return false;
  }
}

function getAltitudeAzimut(body, date, observer){
  try{
    const equator = Astronomy.Equator(body, date, observer, true, true);
    const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
    return {altitude: horizon.altitude, azimuth: horizon.azimuth};
  }catch{
    return null;
  }
}

// OPEN METEO
async function fetchWeather(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&daily=cloud_cover_mean,precipitation_probability_mean,windspeed_10m_max,temperature_2m_max,temperature_2m_min`
    + `&hourly=cloud_cover,precipitation_probability,windspeed_10m,temperature_2m`
    + `&timezone=auto&forecast_days=7`;
  const result = await fetch(url);
  const data = await result.json();
  
  return data;
}

function getWeatherForDay(weatherData, dayIndex){
  if(!weatherData) return null;

  const baseHour = dayIndex * 24;
  const nightHours = [baseHour + 22, baseHour + 23, baseHour + 24, baseHour + 25, baseHour + 26];
  const validHours = nightHours.filter(h => h < weatherData.hourly.cloud_cover.length);

  const avg = (arr, indexes) => indexes.reduce((s, i) => s + (arr[i] || 0), 0) / indexes.length;

  const cloudCover = avg(weatherData.hourly.cloud_cover, validHours);
  const precipitation = avg(weatherData.hourly.precipitation_probability, validHours);
  const windspeed = avg(weatherData.hourly.windspeed_10m, validHours);
  const temperature = avg(weatherData.hourly.temperature_2m, validHours);

  return {
    cloudCover: Math.round(cloudCover),
    precipitation: Math.round(precipitation),
    windspeed: Math.round(windspeed),
    temperature: Math.round(temperature),
    seeing: estimateSeeing(cloudCover, windspeed),
  };
}

function estimateSeeing(cloudCover, windspeed){
  let score = 5;
  if(cloudCover > 20) score--;
  if(cloudCover > 50) score--;
  if(cloudCover > 80) score--;
  if(windspeed > 20) score--;
  if(windspeed > 40) score--;

  return Math.max(1, score);
}

// MOON
function getMoonPhaseName(angle){
  if(angle < 22.5) return 'Luna Nuova';
  if(angle < 67.5) return 'Crescente';
  if(angle < 112.5) return 'Primo Quarto';
  if(angle < 157.5) return 'Gibbosa Crescente';
  if(angle < 202.5) return 'Luna Piena';
  if(angle < 247.5) return 'Gibbosa Calante';
  if(angle < 292.5) return 'Ultimo Quarto';
  if(angle < 337.5) return 'Calante';

  return 'Luna Nuova';
}

function getMoonEmoji(angle){
  if (angle < 22.5) return '🌑';
  if (angle < 67.5) return '🌒';
  if (angle < 112.5) return '🌓';
  if (angle < 157.5) return '🌔';
  if (angle < 202.5) return '🌕';
  if (angle < 247.5) return '🌖';
  if (angle < 292.5) return '🌗';
  if (angle < 337.5) return '🌘';
  
  return '🌑';
}

function updateMoon(date, observer){
  const phaseAngle = Astronomy.MoonPhase(date);
  const illum      = Astronomy.Illumination('Moon', date);
  const moonPct    = Math.round(illum.phase_fraction * 100);
  const phaseName  = getMoonPhaseName(phaseAngle);
  const moonEmoji  = getMoonEmoji(phaseAngle);

  let timesHTML = '';
  try{
    const rise = Astronomy.SearchRiseSet('Moon', observer, +1, date, 1);
    const set  = Astronomy.SearchRiseSet('Moon', observer, -1, date, 1);
    const fmt  = d => d ? new Date(d.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—';
    timesHTML  = `🌅 Alba: ${fmt(rise)}<br>🌇 Tramonto: ${fmt(set)}`;
  }catch{
    timesHTML = '';
  }

  document.getElementById('moon-emoji').textContent = moonEmoji;
  document.getElementById('moon-phase-name').textContent = phaseName;
  document.getElementById('moon-illumination').textContent = `${moonPct}% illuminata`;
  document.getElementById('moon-times').innerHTML = timesHTML;

  return moonPct;
}

// METEO
function getWeatherIcon(cloudCover, precipitation){
  if(precipitation > 50) return '🌧️';
  if(precipitation > 20) return '🌦️';
  if(cloudCover > 80) return '☁️';
  if(cloudCover > 50) return '⛅';
  if(cloudCover > 20) return '🌤️';
  return '✨';
}

function updateWeather(weatherData){
  const container = document.getElementById('weather-days');
  container.innerHTML = '';
  
  for (let i = 0; i < 7; i++) {
    const day = getWeatherForDay(weatherData, i);
    const date = new Date();
    date.setDate(date.getDate() + i);

    const icon     = getWeatherIcon(day.cloudCover, day.precipitation);
    const dayName  = i === 0 ? 'Oggi' : DAYS[date.getDay()];
    const isActive = i === state.selectedDay;

    // stelle seeing
    let seeingStars = '';
    for (let s = 1; s <= 5; s++) {
        seeingStars += `<span class="seeing-star ${s <= day.seeing ? 'active' : ''}">★</span>`;
    }

    const element = document.createElement('div');
    element.className = `weather-day ${isActive ? 'active' : ''}`;
    element.innerHTML = `
        <span class="weather-day-name">${dayName}</span>
        <span class="weather-day-icon">${icon}</span>
        <span class="weather-day-temp">${Math.round(day.temperature)}°</span>
        <span class="weather-day-cloud">☁️ ${Math.round(day.cloudCover)}%</span>
        <div class="weather-seeing">${seeingStars}</div>
    `;

    element.addEventListener('click', () => {
        state.selectedDay = i;
        document.querySelectorAll('.day-button').forEach((b, idx) => {
            b.classList.toggle('active', idx === i);
        });
        updateDashboard();
    });

    container.appendChild(element);
  }
}

// VISIBLES
const PLANETS = [
  { body: 'Mercury', name: 'Mercurio', icon: '☿️' },
  { body: 'Venus', name: 'Venere', icon: '♀️' },
  { body: 'Mars', name: 'Marte', icon: '♂️' },
  { body: 'Jupiter', name: 'Giove', icon: '♃'  },
  { body: 'Saturn', name: 'Saturno', icon: '♄'  },
  { body: 'Uranus', name: 'Urano', icon: '♅'  },
  { body: 'Neptune', name: 'Nettuno', icon: '♆'  },
];

function updateVisibles(date, observer){
  const container = document.getElementById('visibles-list');
  container.innerHTML = '';

  const visible = [];

  for(const planet of PLANETS){
      try{
          const equator = Astronomy.Equator(planet.body, date, observer, true, true);
          const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

          if(horizon.altitude > 10){
              visible.push({
                  ...planet,
                  altitude: Math.round(horizon.altitude),
                  azimuth: Math.round(horizon.azimuth),
                  cardinal: degreesToCardinal(horizon.azimuth),
              });
          }
      }catch{
        continue;
      }
  }

  if(visible.length === 0){
      container.innerHTML = `<div class="visibles-empty">🌑 Nessun pianeta visibile<br>in questo momento</div>`;
      return;
  }

  visible.sort((a, b) => b.altitude - a.altitude);

  for(const planet of visible){
      const element = document.createElement('div');
      element.className = 'visible-item';
      element.innerHTML = `
          <span class="visible-icon">${planet.icon}</span>
          <div class="visible-info">
              <span class="visible-name">${planet.name}</span>
              <span class="visible-details">${planet.altitude}° di altezza</span>
          </div>
          <span class="visible-direction">Direzione: ${planet.cardinal}</span>
      `;
      container.appendChild(element);
  }
}

//EVENTS
const METEOR_SHOWERS = [
  {name: 'Perseidi', icon: '☄️', month: 7, day: 12},
  {name: 'Leonidi', icon: '☄️', month: 10, day: 17},
  {name: 'Geminidi', icon: '☄️', month: 11, day: 13},
  {name: 'Quadrantidi', icon: '☄️', month: 0, day: 3},
  {name: 'Eta Aquaridi', icon: '☄️', month: 4, day: 6},
  {name: 'Orionidi', icon: '☄️', month: 9, day: 21},
];

function getNextMeteorShowers(fromDate){
  const events = [];
  const year = fromDate.getFullYear();

  for(const shower of METEOR_SHOWERS){
    for(const y of [year, year + 1]){
      const date = new Date(y, shower.month, shower.day);
      if(date >= fromDate){
        const daysLeft = Math.round((date- fromDate) / 86400000);
        events.push({
          name: shower.name,
          icon: shower.icon,
          date: date,
          daysLeft,
        });
        break;
      }
    }
  }
  return events;
}

function updateEvents(){
  const container = document.getElementById('events-list');
  container.innerHTML = '';

  const now = new Date();
  const events = [];

  try{
    const nextNew = Astronomy.SearchMoonPhase(0, now, 40);
    const nextFull = Astronomy.SearchMoonPhase(180, now, 40);

    if(nextNew){
      const date = new Date(nextNew.date);
      events.push({
        icon: '🌑',
        name: 'Luna Nuova',
        date: date,
        daysLeft: Math.round((date - now) / 86400000),
      });
    }
    if(nextFull){
      const date = new Date(nextFull.date);
      events.push({
        icon: '🌕',
        name: 'Luna Piena',
        date: date,
        daysLeft: Math.round((date - now) / 86400000),
      });
    }
  }catch{}

  const OUTER_PLANETS = [
    {body: 'Mars', name: 'Opposizione Marte', icon: '♂️'},
    {body: 'Jupiter', name: 'Opposizione Giove', icon: '♃'},
    {body: 'Saturn', name: 'Opposizione Saturno', icon: '♄'},
  ];

  for(const planet of OUTER_PLANETS){
    try{
      const opposition = Astronomy.SearchRelativeLongitude(planet.body, 180, now);
      if(opposition){
        const date = new Date(opposition.date);
        const daysLeft = Math.round((date - now) / 86400000);
        if(daysLeft >= 0 && daysLeft < 365){
          events.push({icon: planet.icon, name: planet.name, date: date, daysLeft});
        }
      }
    }catch{}
  }

  events.push(...getNextMeteorShowers(now));
  events.sort((a,b) => a.daysLeft - b.daysLeft);

  for(const event of events.slice(0,5)){
    const dateStr = event.date.toLocaleDateString('it-IT', {
      day: 'numeric', month: 'short'
    });

    const daysStr = event.daysLeft === 0 ? 'oggi' : event.daysLeft === 1 ? 'domani' : `tra ${event.daysLeft}gg`;

    const element = document.createElement('div');
    element.className = 'event-item';
    element.innerHTML = `
      <span class="event-icon">${event.icon}</span>
      <div class="event-info">
        <span class="event-name">${event.name}</span>
        <span class="event-date">${dateStr}</span>
      </div>
      <span class="event-days-left">${daysStr}</span>
    `;
    container.appendChild(element);
  }
}
  
// UPDATE DASHBOARD
async function updateVerdict(cloudCover, moonIllumination){
  const emoji = document.getElementById('verdict-emoji');
  const score = document.getElementById('verdict-score');
  const text = document.getElementById('verdict-text');
  const details = document.getElementById('verdict-details');
  
  let points = 100;
  points -= cloudCover * 0.7;
  points -= moonIllumination * 0.3;
  points = Math.max(0, Math.round(points));

  let cssClass, icon, label;

  if(points >= 70){
    cssClass = 'verdict-green';
    icon = '🌟';
    label = 'Notte eccellente';
  }else if(points >= 40){
    cssClass = 'verdict-yellow';
    icon = '🌤️';
    label = 'Notte discreta';
  }else{
    cssClass = 'verdict-red';
    icon = '☁️';
    label = 'Notte sfavorevole';
  }

  emoji.textContent = icon;
  score.textContent = `${points}/100`;
  score.className = `verdict-score ${cssClass}`;
  text.textContent = label;
  details.innerHTML = `
    ☁️ Nuvolosità: ${cloudCover}%<br>
    🌙 Luna: ${Math.round(moonIllumination)}% illuminata
  `
}

async function updateDashboard(){
  if(!state.lat || !state.lon) return;

  if(!weatherCache){
    weatherCache = await fetchWeather(state.lat, state.lon);
  }

  const weather = getWeatherForDay(weatherCache, state.selectedDay);
  const date = getSelectedDay();
  const observer = getObserver();

  const moonPhase = Astronomy.MoonPhase(date);
  const moonIllumination = Astronomy.Illumination('Moon', date);
  
  const moonPct = updateMoon(date, observer);
  updateWeather(weatherCache);
  updateVisibles(date, observer);
  updateEvents();
  await updateVerdict(weather.cloudCover, moonPct);
}

window.invalidateMap = () => {
  if (map) map.invalidateSize();
};