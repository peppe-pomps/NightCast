const skyModal = document.getElementById('sky-modal');

document.getElementById('button-map').addEventListener('click', () => {
    skyModal.classList.add('open');
    drawSkyMap();
});

document.getElementById('close-modal').addEventListener('click', () => {
    skyModal.classList.remove('open');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') skyModal.classList.remove('open');
});

const SKY_STARS = [
    {name: 'Sirio', ra: 6.752, dec: -16.716, mag: -1.46},
    {name: 'Canopo', ra: 6.399, dec: -52.695, mag: -0.74},
    {name: 'Arturo', ra: 14.261, dec: 19.182, mag: -0.05},
    {name: 'Vega', ra: 18.615, dec: 38.783, mag: 0.03},
    {name: 'Capella', ra: 5.278, dec: 45.998, mag: 0.08},
    {name: 'Rigel', ra: 5.242, dec: -8.201, mag: 0.13},
    {name: 'Procione', ra: 7.655, dec: 5.225, mag: 0.34},
    {name: 'Betelgeuse', ra: 5.919, dec: 7.407, mag: 0.42},
    {name: 'Altair', ra: 19.846, dec: 8.868, mag: 0.77},
    {name: 'Aldebaran', ra: 4.599, dec: 16.509, mag: 0.86},
    {name: 'Antares', ra: 16.490, dec: -26.432, mag: 0.96},
    {name: 'Spica', ra: 13.420, dec: -11.161, mag: 0.98},
    {name: 'Polluce', ra: 7.755, dec: 28.026, mag: 1.14},
    {name: 'Fomalhaut', ra: 22.961, dec: -29.622, mag: 1.16},
    {name: 'Deneb', ra: 20.690, dec: 45.280, mag: 1.25},
    {name: 'Regolo', ra: 10.139, dec: 11.967, mag: 1.36},
    {name: 'Castore', ra: 7.577, dec: 31.888, mag: 1.58},
    {name: 'Bellatrix', ra: 5.419, dec: 6.350, mag: 1.64},
    {name: 'Alnath', ra: 5.438, dec: 28.608, mag: 1.65},
    {name: 'Mirfak', ra: 3.405, dec: 49.861, mag: 1.79},
    {name: 'Adhara', ra: 6.977, dec: -28.972, mag: 1.50},
    {name: 'Shaula', ra: 17.560, dec: -37.103, mag: 1.62},
    {name: 'Gacrux', ra: 12.519, dec: -57.113, mag: 1.63},
    {name: 'Mimosa', ra: 12.795, dec: -59.689, mag: 1.25},
    {name: 'Acrux', ra: 12.443, dec: -63.099, mag: 0.77},
    {name: 'Hadar', ra: 14.064, dec: -60.373, mag: 0.61},
    {name: 'Rigil Kent', ra: 14.660, dec: -60.835, mag: -0.27},
    {name: 'Achernar', ra: 1.628, dec: -57.237, mag: 0.46},
    {name: 'Alnilam', ra: 5.603, dec: -1.202, mag: 1.69},
    {name: 'Alnitak', ra: 5.679, dec: -1.943, mag: 1.77},
    {name: 'Mintaka', ra: 5.534, dec: -0.299, mag: 2.23},
    //re:zero
];

const SKY_PLANETS = [
    {body: 'Mercury', name: 'Mercurio', color: '#aaaaaa', size: 4},
    {body: 'Venus', name: 'Venere', color: '#fffde0', size: 6},
    {body: 'Mars', name: 'Marte', color: '#ff6644', size: 5},
    {body: 'Jupiter', name: 'Giove', color: '#f0d080', size: 8},
    {body: 'Saturn', name: 'Saturno', color: '#e8c870', size: 7},
    {body: 'Uranus', name: 'Urano (Visibile con telescopio)', color: '#88ccff', size: 4},
    {body: 'Neptune', name: 'Nettuno (Visibile con telescopio)', color: '#4466ff', size: 4},
];

let skyContext = null;
let skyWidth = 0;
let skyHeight = 0;
let skyCanvas = null;

let viewAzimuth = 180;
let isDragging = false;
let dragStartX = 0;
let dragStartAzimuth = 0;

function azimuthAltitudeToXY(azimuth, altitude){
    const totalWidth = skyWidth;

    let deltaAzimuth = azimuth - viewAzimuth;
    while(deltaAzimuth > 180) deltaAzimuth -= 360;
    while(deltaAzimuth < -180) deltaAzimuth += 360;

    const FOV = 120;
    const x = totalWidth / 2 + (deltaAzimuth / FOV) * totalWidth;
    const y = skyHeight - (altitude / 90) * skyHeight * 0.85 - skyHeight * 0.05;

    return {x, y};
}

function getVisibleStars(date, observer){
    const visibleStars = [];

    for(const star of SKY_STARS){
        try{
            const horizon = Astronomy.Horizon(date, observer, star.ra, star.dec, 'normal');
           
            if(horizon.altitude > -5){
                visibleStars.push({ ...star, altitude: horizon.altitude, azimuth: horizon.azimuth });
            }
        }catch{
            continue;
        }
    }
    return visibleStars;
}

function getVisiblePlanets(date, observer){
    const visiblePlanets = [];

    for(const planet of SKY_PLANETS){
        try{
            const equator = Astronomy.Equator(planet.body, date, observer, true, true);
            const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
            
            if(horizon.altitude > -5){
                visiblePlanets.push({ ...planet, altitude: horizon.altitude, azimuth: horizon.azimuth, belowHorizon: horizon.altitude <= 10});
            }
        }catch{
            continue;
        }
    }
    return visiblePlanets;
}

function drawSkyMap(){
    skyCanvas = document.getElementById('sky-canvas');
    skyContext = skyCanvas.getContext('2d');
    skyCanvas.width = skyCanvas.offsetWidth;
    skyCanvas.height = skyCanvas.offsetHeight;
    skyWidth = skyCanvas.width;
    skyHeight = skyCanvas.height;

    if(!state.lat || !state.lon){
        skyContext.fillStyle = '#ffffff';
        skyContext.font = '20px Exo 2';
        skyContext.textAlign = 'center';
        skyContext.fillText('Seleziona una posizione', skyWidth / 2, skyHeight / 2);
        return;
    }

    const date = getSelectedDay();
    const observer = getObserver();
    const stars = getVisibleStars(date, observer);
    const planets = getVisiblePlanets(date, observer);
    renderSkyCanvas(stars, planets);
    setupDragInteraction();
    setupResizeHandler();
}

function renderSkyCanvas(stars, planets){
    const gradient = skyContext.createLinearGradient(0, 0, 0, skyHeight);
    gradient.addColorStop(0, '#000005');
    gradient.addColorStop(0.7, '#030510');
    gradient.addColorStop(1, '#0a0520');
    skyContext.fillStyle = gradient;
    skyContext.fillRect(0, 0, skyWidth, skyHeight);

    const horizonY = skyHeight - skyHeight * 0.05;
    skyContext.beginPath();
    skyContext.moveTo(0, horizonY);
    skyContext.lineTo(skyWidth, horizonY);
    skyContext.strokeStyle = 'rgba(255,255,255,0.15)';
    skyContext.lineWidth = 1;
    skyContext.stroke();

    drawCardinalDirections();

    for(const star of stars){
        const position = azimuthAltitudeToXY(star.azimuth, star.altitude);

        if(position.x < -50 || position.x > skyWidth + 50) continue;

        const brightness = Math.max(0.1, Math.min(1, (3 - star.mag) / 4));
        const radius = Math.max(0.8, (3 - star.mag) * 0.8);
        skyContext.beginPath();
        skyContext.arc(position.x, position.y, radius, 0, Math.PI * 2);
        skyContext.fillStyle = `rgba(200, 220, 255, ${brightness})`;
        skyContext.fill();

        if(star.mag < 1.0 && star.altitude > 10){
            skyContext.fillStyle = 'rgba(200,220,255,0.6)';
            skyContext.font = '11px Exo 2';
            skyContext.textAlign = 'left';
            skyContext.fillText(star.name, position.x + 5, position.y - 4);
        }
    }

    for(const planet of planets){
        const position = azimuthAltitudeToXY(planet.azimuth, planet.altitude);

        if(position.x < -50 || position.x > skyWidth + 50) continue;

        skyContext.globalAlpha = planet.belowHorizon ? 0.3 : 1;

        const glowGradient = skyContext.createRadialGradient(position.x, position.y, 0, position.x, position.y, planet.size * 3);
        glowGradient.addColorStop(0, planet.color);
        glowGradient.addColorStop(1, 'transparent');
        skyContext.beginPath();
        skyContext.arc(position.x, position.y, planet.size * 3, 0, Math.PI * 2);
        skyContext.fillStyle = glowGradient;
        skyContext.fill();
        skyContext.beginPath();
        skyContext.arc(position.x, position.y, planet.size, 0, Math.PI * 2);
        skyContext.fillStyle = planet.color;
        skyContext.fill();
        skyContext.fillStyle = 'rgba(255,255,255,0.8)';
        skyContext.font = 'bold 12px Exo 2';
        skyContext.textAlign = 'left';
        skyContext.fillText(planet.name, position.x + planet.size + 4, position.y - 4);

        skyContext.globalAlpha = 1;
    }
    
    skyContext.fillStyle = 'rgba(255,255,255,0.3)';
    skyContext.font = '12px Exo 2';
    skyContext.textAlign = 'center';
    skyContext.fillText(`${Math.round(viewAzimuth)}° · ${degreesToCardinal(viewAzimuth)}`, skyWidth / 2, skyHeight - 10);
}

function drawCardinalDirections(){
    const cardinals = [
        { label: 'N', azimuth: 0 },
        { label: 'NE', azimuth: 45 },
        { label: 'E', azimuth: 90 },
        { label: 'SE', azimuth: 135 },
        { label: 'S', azimuth: 180 },
        { label: 'SO', azimuth: 225 },
        { label: 'O', azimuth: 270 },
        { label: 'NO', azimuth: 315 },
    ];

    const horizonY = skyHeight - skyHeight * 0.05;

    for(const cardinal of cardinals){
        const position = azimuthAltitudeToXY(cardinal.azimuth, 0);

        if(position.x < 0 || position.x > skyWidth) continue;

        skyContext.fillStyle = 'rgba(255,255,255,0.4)';
        skyContext.font = 'bold 13px Exo 2';
        skyContext.textAlign = 'center';
        skyContext.fillText(cardinal.label, position.x, horizonY + 18);
        skyContext.beginPath();
        skyContext.moveTo(position.x, horizonY);
        skyContext.lineTo(position.x, horizonY + 6);
        skyContext.strokeStyle = 'rgba(255,255,255,0.2)';
        skyContext.lineWidth = 1;
        skyContext.stroke();
    }
}

function setupDragInteraction(){
    skyCanvas.onmousedown = (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartAzimuth = viewAzimuth;
    };

    window.onmousemove = (e) => {
        if(!isDragging) return;
        const deltaX = e.clientX - dragStartX;
        const deltaAzimuth = (deltaX / skyWidth) * -120;
        viewAzimuth = (dragStartAzimuth + deltaAzimuth + 360) % 360;
        const date = getSelectedDay();
        const observer = getObserver();
        renderSkyCanvas(getVisibleStars(date, observer), getVisiblePlanets(date, observer));
    };

    window.onmouseup = () => { isDragging = false; };
    skyCanvas.ontouchstart = (e) => {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartAzimuth = viewAzimuth;
    };

    skyCanvas.ontouchmove = (e) => {
        if(!isDragging) return;
        const deltaX = e.touches[0].clientX - dragStartX;
        const deltaAzimuth = (deltaX / skyWidth) * -120;
        viewAzimuth = (dragStartAzimuth + deltaAzimuth + 360) % 360;
        const date = getSelectedDay();
        const observer = getObserver();
        renderSkyCanvas(getVisibleStars(date, observer), getVisiblePlanets(date, observer));
    };

    skyCanvas.ontouchend = () => {isDragging = false;};
}

function setupResizeHandler(){
    window.addEventListener('resize', () =>{
        if(!document.getElementById('sky-modal').classList.contains('open')) return;

        skyCanvas.width = skyCanvas.offsetWidth;
        skyCanvas.height = skyCanvas.offsetHeight;
        skyWidth = skyCanvas.width;
        skyHeight = skyCanvas.height;

        const date = getSelectedDay();
        const observer = getObserver();
        renderSkyCanvas(getVisibleStars(date, observer), getVisiblePlanets(date, observer));
    });
}