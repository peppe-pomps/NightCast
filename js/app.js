particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 160,
      "density": {
        "enable": true,
        "value_area": 800
      }
    },
    "color": {
      "value": "#e1f0ff"
    },
    "shape": {
      "type": "polygon",
      "stroke": {
        "width": 0,
        "color": "#000000"
      },
      "polygon": {
        "nb_sides": 5
      },
      "image": {
        "src": "img/github.svg",
        "width": 100,
        "height": 100
      }
    },
    "opacity": {
      "value": 1,
      "random": true,
      "anim": {
        "enable": true,
        "speed": 1,
        "opacity_min": 0,
        "sync": false
      }
    },
    "size": {
      "value": 3,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 4,
        "size_min": 0.3,
        "sync": false
      }
    },
    "line_linked": {
      "enable": false,
      "distance": 150,
      "color": "#cfe7ff",
      "opacity": 0.4,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 1,
      "direction": "none",
      "random": true,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 600
      }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "grab"
      },
      "onclick": {
        "enable": false,
        "mode": "repulse"
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 203.7962037962038,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 119.88011988011988,
        "size": 0,
        "duration": 2,
        "opacity": 0,
        "speed": 3
      },
      "repulse": {
        "distance": 400,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": false
});

const pageWrapper = document.getElementById("page-wrapper");

document.querySelector(".main-button").addEventListener("click", (e) => {
  e.preventDefault();
  pageWrapper.style.transition = "transform 0.9s cubic-bezier(0.76, 0, 0.24, 1)";
  pageWrapper.style.transform = "translateY(0)";
});

document.getElementById("back-button").addEventListener("click", () => {
  pageWrapper.style.transform = "translateY(-100vh)";
});

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
  return address.city || address.town || address.village || address.county || 'Unknown position';
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

// UPDATE DASHBOARD
function updateDashboard(){
  return;
}