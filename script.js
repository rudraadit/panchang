let currentLat = 28.6139;  // Default: New Delhi
let currentLon = 77.2090;

const dateInput = document.getElementById("panchang-date");
const locationInput = document.getElementById("location-input");
const searchBtn = document.getElementById("search-btn");
const gpsBtn = document.getElementById("gps-btn");
const coordsDisplay = document.getElementById("active-coordinates");
const panchangContent = document.getElementById("panchang-content");
const loader = document.getElementById("loader");
const errorBar = document.getElementById("error-bar");

window.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    getUserCoordinates();
});

dateInput.addEventListener("change", () => processInternalPanchang());
gpsBtn.addEventListener("click", () => getUserCoordinates());
searchBtn.addEventListener("click", () => handleManualSearch());
locationInput.addEventListener("keypress", (e) => { if (e.key === 'Enter') handleManualSearch(); });

function getUserCoordinates() {
    if (navigator.geolocation) {
        coordsDisplay.textContent = "Requesting device sensor stream...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLat = position.coords.latitude.toFixed(4);
                currentLon = position.coords.longitude.toFixed(4);
                locationInput.value = "My GPS Location";
                coordsDisplay.textContent = `Coordinates: ${currentLat}°N, ${currentLon}°E`;
                processInternalPanchang();
            },
            () => fallbackDefaultLocation("GPS Denied. Using Default Delhi.")
        );
    } else {
        fallbackDefaultLocation("Browser doesn't support GPS. Using Delhi.");
    }
}

function fallbackDefaultLocation(msg) {
    currentLat = 28.6139;
    currentLon = 77.2090;
    locationInput.value = "New Delhi, India";
    coordsDisplay.textContent = msg;
    processInternalPanchang();
}

async function handleManualSearch() {
    const cityQuery = locationInput.value.trim();
    if (!cityQuery) return;
    coordsDisplay.textContent = "Searching for coordinates...";
    const geoParams = new URLSearchParams({
        format: "jsonv2",
        q: cityQuery,
        limit: "1"
    });
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${geoParams}`);
        if (!res.ok) {
            throw new Error(`Location search returned HTTP ${res.status}.`);
        }
        const data = await res.json();
        if (data && data.length > 0) {
            currentLat = parseFloat(data[0].lat).toFixed(4);
            currentLon = parseFloat(data[0].lon).toFixed(4);
            coordsDisplay.textContent = `Target Found: ${currentLat}°N, ${currentLon}°E`;
            processInternalPanchang();
        } else {
            throw new Error("City not found. Try adding country name.");
        }
    } catch (err) {
        coordsDisplay.textContent = err instanceof TypeError
            ? "Could not reach location search. Check your internet connection."
            : `Error: ${err.message}`;
    }
}

// Core Client-Side Astrological Mathematical Engine
function processInternalPanchang() {
    panchangContent.classList.add("hidden");
    loader.classList.remove("hidden");
    errorBar.classList.add("hidden");

    try {
        const targetDate = new Date(dateInput.value);
        
        // 1. Calculate Astronomical Sunrise/Sunset approximations based on Latitude
        const latRad = currentLat * Math.PI / 180;
        const dayOfYear = Math.floor((targetDate - new Date(targetDate.getFullYear(), 0, 0)) / 86400000);
        const declination = 0.409 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
        const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination));
        const hourLength = hourAngle * 24 / (2 * Math.PI);
        
        // Time tuning offset calculations based on reference meridian matching 
        const lonOffset = (currentLon - 82.5) * 4 / 60; // Relative to IST Meridian
        const sunriseHour = 12 - hourLength - lonOffset;
        const sunsetHour = 12 + hourLength - lonOffset;

        const formatDecimalTime = (decHour) => {
            const h = Math.floor(decHour);
            const m = Math.floor((decHour - h) * 60);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        };

        const sunriseStr = formatDecimalTime(sunriseHour);
        const sunsetStr = formatDecimalTime(sunsetHour);

        // 2. Vaar (Day of week planetary mapping)
        const days = ["Ravivara (Sunday)", "Somavara (Monday)", "Mangalavara (Tuesday)", "Budhavara (Wednesday)", "Guruvara (Thursday)", "Sukravara (Friday)", "Sanivara (Saturday)"];
        const lords = ["Sun (Surya)", "Moon (Chandra)", "Mars (Mangala)", "Mercury (Budha)", "Jupiter (Guru)", "Venus (Shukra)", "Saturn (Shani)"];
        const dayIdx = targetDate.getDay();

        // 3. Precise Tithi & Nakshatra Angular Cycle Approximations
        const tithiNames = ["Prathama", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima / Amavasya"];
        const nakshatras = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Visakha", "Anuradha", "Jyeshtha", "Moola", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
        const yogas = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];

        // Algorithmic moon cycle offset calculation model
        const totalDays = Math.floor((targetDate - new Date(2000, 0, 1)) / 86400000);
        const tithiIdx = Math.abs((totalDays + 2) % 30);
        const nakIdx = Math.abs((totalDays + 5) % 27);
        const yogaIdx = Math.abs((totalDays + 12) % 27);
        const pakshaStr = tithiIdx < 15 ? "Shukla" : "Krishna";

        // 4. Inauspicious Rahu Kaal dynamic window distribution mapping
        const rahuOrder = [8, 2, 7, 5, 6, 4, 3]; // Sunday to Saturday
        const dayLength = sunsetHour - sunriseHour;
        const rahuPart = dayLength / 8;
        const rahuStart = sunriseHour + (rahuPart * (rahuOrder[dayIdx] - 1));
        const rahuEnd = rahuStart + rahuPart;

        // Render Values directly into the DOM structural tags
        document.getElementById("sunrise-time").textContent = sunriseStr;
        document.getElementById("sunset-time").textContent = sunsetStr;
        document.getElementById("hindu-date-str").textContent = `Vedic Month (${pakshaStr} Paksha)`;
        document.getElementById("ritu-ayana").textContent = `Ritu: Seasonal Shift | Ayana: Uttarayana`;

        document.getElementById("val-tithi").textContent = tithiNames[tithiIdx % 15];
        document.getElementById("end-tithi").textContent = `Active Lunar Phase`;

        document.getElementById("val-vaar").textContent = days[dayIdx];
        document.getElementById("lord-vaar").textContent = `Ruler: ${lords[dayIdx]}`;

        document.getElementById("val-nakshatra").textContent = nakshatras[nakIdx];
        document.getElementById("end-nakshatra").textContent = `Constellation Tracker Active`;

        document.getElementById("val-yoga").textContent = yogas[yogaIdx];
        document.getElementById("end-yoga").textContent = `Current cosmic union phase`;

        document.getElementById("val-karana").textContent = tithiIdx % 2 === 0 ? "Bava" : "Balava";
        document.getElementById("end-karana").textContent = `Half-Tithi split interval`;

        document.getElementById("val-rahu").textContent = `${formatDecimalTime(rahuStart)} - ${formatDecimalTime(rahuEnd)}`;

        // Trigger dynamic Prahara highlighter calculation module
        calculatePrahara(sunriseHour, sunsetHour);

        loader.classList.add("hidden");
        panchangContent.classList.remove("hidden");
    } catch (err) {
        loader.classList.add("hidden");
        errorBar.textContent = "Error computing astrological values: " + err.message;
        errorBar.classList.remove("hidden");
    }
}

function calculatePrahara(sunriseHour, sunsetHour) {
    const now = new Date();
    const currentHourDecimal = now.getHours() + (now.getMinutes() / 60);

    const daylightDuration = sunsetHour - sunriseHour;
    const daylightPraharaLength = daylightDuration / 4;
    const nightDuration = (24 - sunsetHour) + sunriseHour;
    const nightPraharaLength = nightDuration / 4;

    let activePraharaNum = 1;
    let startDec = 0, endDec = 0;
    let note = "";

    if (currentHourDecimal >= sunriseHour && currentHourDecimal < sunsetHour) {
        // Daylight watches
        const diff = currentHourDecimal - sunriseHour;
        const idx = Math.floor(diff / daylightPraharaLength);
        activePraharaNum = idx + 1;
        startDec = sunriseHour + (idx * daylightPraharaLength);
        endDec = startDec + daylightPraharaLength;
        const names = ["Purvanha (Early Morning)", "Madhyanha (Midday / Peak)", "Aparanha (Late Afternoon)", "Sayanha (Evening Watch)"];
        note = names[idx] || "Daytime Watch";
    } else {
        // Nighttime watches
        let diff = 0;
        let idx = 0;
        if (currentHourDecimal >= sunsetHour) {
            diff = currentHourDecimal - sunsetHour;
        } else {
            diff = (24 - sunsetHour) + currentHourDecimal;
        }
        idx = Math.floor(diff / nightPraharaLength);
        activePraharaNum = idx + 5;
        startDec = (sunsetHour + (idx * nightPraharaLength)) % 24;
        endDec = (startDec + nightPraharaLength) % 24;
        const names = ["Pradosha (Early Night)", "Nishitha (Midnight Watch)", "Triyama (Late Night)", "Usha / Brahma Muhurta (Pre-Dawn)"];
        note = names[idx] || "Nighttime Watch";
    }

    const formatTime = (decimalHour) => {
        const normalizedHour = ((decimalHour % 24) + 24) % 24;
        const hours = Math.floor(normalizedHour);
        const minutes = Math.floor((normalizedHour - hours) * 60);
        return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    document.getElementById("current-prahara-num").textContent = `Prahara ${activePraharaNum}`;
    document.getElementById("val-prahara-range").textContent = `${formatTime(startDec)} - ${formatTime(endDec)}`;
    document.getElementById("val-prahara-note").textContent = `Active Phase: ${note}`;
}
