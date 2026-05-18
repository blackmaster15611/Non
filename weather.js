// Weather API Configuration
const API_KEY = 'b6fd43fb498e4cabd5d131255261503'; // Using WeatherAPI.com free tier
const API_BASE = 'https://api.weatherapi.com/v1';

// State management
let currentUnit = 'metric';
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let currentLocation = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderFavorites();
    // Try to get user's location on load
    getCurrentLocation();
});

// Set temperature unit
function setUnit(unit) {
    currentUnit = unit;
    document.getElementById('celsiusBtn').classList.toggle('active');
    document.getElementById('fahrenheitBtn').classList.toggle('active');
    
    // Refresh current weather if available
    if (currentLocation) {
        displayCurrentWeather(currentLocation);
    }
}

// Handle Enter key in search box
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        searchWeather();
    }
}

// Search weather by city name
function searchWeather() {
    const location = document.getElementById('locationInput').value.trim();
    
    if (!location) {
        showError('Please enter a city name');
        return;
    }
    
    fetchWeather(location);
}

// Get current location using geolocation API
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    showLoading(true);
    
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        error => {
            showLoading(false);
            showError('Unable to get your location: ' + error.message);
        }
    );
}

// Fetch weather by coordinates
function fetchWeatherByCoords(lat, lon) {
    fetchWeatherData(`${lat},${lon}`);
}

// Fetch weather data from API
function fetchWeather(location) {
    showLoading(true);
    fetchWeatherData(location);
}

function fetchWeatherData(query) {
    const units = currentUnit === 'metric' ? 'auto' : 'us';
    
    Promise.all([
        fetch(`${API_BASE}/current.json?key=${API_KEY}&q=${encodeURIComponent(query)}&aqi=yes`),
        fetch(`${API_BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=5&aqi=yes`)
    ])
    .then(async ([currentRes, forecastRes]) => {
        if (!currentRes.ok) throw new Error('Location not found');
        if (!forecastRes.ok) throw new Error('Forecast data not available');
        
        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        
        showLoading(false);
        currentLocation = currentData;
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        document.getElementById('locationInput').value = '';
        hideError();
    })
    .catch(error => {
        showLoading(false);
        showError('Error: ' + error.message);
    });
}

// Display current weather
function displayCurrentWeather(data) {
    const current = data.current;
    const location = data.location;
    
    const temp = currentUnit === 'metric' ? current.temp_c : current.temp_f;
    const feelsLike = currentUnit === 'metric' ? current.feelslike_c : current.feelslike_f;
    const windSpeed = currentUnit === 'metric' ? current.wind_kph : current.wind_mph;
    const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    
    // Map weather conditions to icons
    const iconMap = {
        'Sunny': 'fas fa-sun',
        'Clear': 'fas fa-moon',
        'Cloudy': 'fas fa-cloud',
        'Overcast': 'fas fa-cloud',
        'Mist': 'fas fa-smog',
        'Patchy rain': 'fas fa-cloud-rain',
        'Light rain': 'fas fa-cloud-rain',
        'Moderate rain': 'fas fa-cloud-rain',
        'Heavy rain': 'fas fa-cloud-rain',
        'Thundery': 'fas fa-bolt',
        'Snow': 'fas fa-snowflake',
        'Sleet': 'fas fa-cloud-snow-rain',
    };
    
    let icon = 'fas fa-cloud';
    for (const [key, value] of Object.entries(iconMap)) {
        if (current.condition.text.includes(key)) {
            icon = value;
            break;
        }
    }
    
    const weatherHTML = `
        <div class="weather-header">
            <div class="location-info">
                <h2>${location.name}, ${location.country}</h2>
                <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="temperature-section">
                <i class="weather-icon ${icon}"></i>
                <div class="temp-info">
                    <div class="current-temp">${Math.round(temp)}${tempUnit}</div>
                    <div class="weather-description">${current.condition.text}</div>
                    <small style="color: #999;">Feels like ${Math.round(feelsLike)}${tempUnit}</small>
                </div>
            </div>
        </div>
        
        <div class="weather-details">
            <div class="detail-card">
                <div class="detail-label"><i class="fas fa-tint"></i> Humidity</div>
                <div class="detail-value">${current.humidity}%</div>
            </div>
            
            <div class="detail-card">
                <div class="detail-label"><i class="fas fa-wind"></i> Wind Speed</div>
                <div class="detail-value">${Math.round(windSpeed)} ${windUnit}</div>
            </div>
            
            <div class="detail-card">
                <div class="detail-label"><i class="fas fa-compress"></i> Pressure</div>
                <div class="detail-value">${current.pressure_mb.toFixed(0)} mb</div>
            </div>
            
            <div class="detail-card">
                <div class="detail-label"><i class="fas fa-eye"></i> Visibility</div>
                <div class="detail-value">${(currentUnit === 'metric' ? current.vis_km : current.vis_miles).toFixed(1)} ${currentUnit === 'metric' ? 'km' : 'mi'}</div>
            </div>
            
            <div class="detail-card">
                <div class="detail-label"><i class="fas fa-gauge"></i> UV Index</div>
                <div class="detail-value">${current.uv}</div>
            </div>
            
            <div class="detail-card">
                <div class="detail-label"><i class="fas fa-cloud-rain"></i> Rain Chance</div>
                <div class="detail-value">${data.forecast.forecastday[0].day.daily_chance_of_rain}%</div>
            </div>
        </div>
    `;
    
    const weatherElement = document.getElementById('currentWeather');
    weatherElement.innerHTML = weatherHTML;
    weatherElement.classList.add('active');
    
    // Add to favorites button
    if (!favorites.some(f => f.name === location.name)) {
        const addFavBtn = document.createElement('button');
        addFavBtn.className = 'favorite-btn';
        addFavBtn.innerHTML = '<i class="fas fa-heart"></i> Add to Favorites';
        addFavBtn.onclick = () => addFavorite(location.name);
        weatherElement.appendChild(addFavBtn);
    }
}

// Display 5-day forecast
function displayForecast(data) {
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const forecastDays = data.forecast.forecastday;
    
    let forecastHTML = '<h3><i class="fas fa-calendar"></i> 5-Day Forecast</h3><div class="forecast-grid">';
    
    forecastDays.forEach((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = currentUnit === 'metric' ? day.day.maxtemp_c : day.day.maxtemp_f;
        const minTemp = currentUnit === 'metric' ? day.day.mintemp_c : day.day.mintemp_f;
        
        // Get appropriate icon
        let icon = 'fas fa-cloud';
        const condition = day.day.condition.text;
        if (condition.includes('Sunny') || condition.includes('Clear')) {
            icon = 'fas fa-sun';
        } else if (condition.includes('rain') || condition.includes('Rain')) {
            icon = 'fas fa-cloud-rain';
        } else if (condition.includes('Cloud')) {
            icon = 'fas fa-cloud';
        } else if (condition.includes('Snow')) {
            icon = 'fas fa-snowflake';
        } else if (condition.includes('Thunder')) {
            icon = 'fas fa-bolt';
        }
        
        forecastHTML += `
            <div class="forecast-item">
                <div class="forecast-day">${dayName}</div>
                <i class="forecast-icon ${icon}"></i>
                <div class="forecast-temp">${Math.round(maxTemp)}${tempUnit}</div>
                <small>${Math.round(minTemp)}${tempUnit}</small>
                <div class="forecast-desc">${day.day.condition.text}</div>
            </div>
        `;
    });
    
    forecastHTML += '</div>';
    
    const forecastElement = document.getElementById('forecast');
    forecastElement.innerHTML = forecastHTML;
    forecastElement.classList.add('active');
}

// Add favorite location
function addFavorite(location) {
    if (!favorites.some(f => f.name === location)) {
        favorites.push({ name: location });
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        renderFavorites();
        alert(`${location} added to favorites!`);
    }
}

// Remove favorite location
function removeFavorite(location) {
    favorites = favorites.filter(f => f.name !== location);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    renderFavorites();
}

// Render favorite buttons
function renderFavorites() {
    const favoritesElement = document.getElementById('favorites');
    
    if (favorites.length === 0) {
        favoritesElement.innerHTML = '';
        return;
    }
    
    let favHTML = '<strong style="color: white; width: 100%; text-align: center; display: block; margin-bottom: 10px;">⭐ Favorites</strong>';
    
    favorites.forEach(fav => {
        favHTML += `
            <button class="favorite-btn" onclick="searchFavorite('${fav.name}')">
                ${fav.name}
                <i class="fas fa-times" onclick="event.stopPropagation(); removeFavorite('${fav.name}');" style="margin-left: 8px; cursor: pointer;"></i>
            </button>
        `;
    });
    
    favoritesElement.innerHTML = favHTML;
}

// Search for favorite location
function searchFavorite(location) {
    document.getElementById('locationInput').value = location;
    searchWeather();
}

// Show loading indicator
function showLoading(show) {
    document.getElementById('loading').classList.toggle('active', show);
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('active');
    
    // Clear error after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    document.getElementById('errorMessage').classList.remove('active');
}
