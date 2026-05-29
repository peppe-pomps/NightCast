// Location
const state = {
    lat: null,
    lon: null,
    locationName: 'No position',
    selectedDay: 0,
}
  
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
  
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
      maxZoom: 20,
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
  
    const coordinates = [lat, lon]
  
    if(reverseGeocode){
      const name = await reverseGeocodeCoords(lat, lon);
      state.locationName = name;
    }
  
    document.getElementById('location-name').textContent = state.locationName;
  
    if(map){
      map.setView(coordinates, 10);
      marker.setLatLng(coordinates);
    }else{
      initMap(lat, lon);
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
  
  // UPDATE DASHBOARD
function updateDashboard(){
    return;
}