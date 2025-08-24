import React, { useState, useEffect } from "react";
import { getWardCurrentWeather } from "./api";
import "./WeatherWidget.css";

const WeatherWidget = ({ lat, lon, onWeatherUpdate }) => {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use a default ward (A - Colaba) for general Mumbai weather
      const weatherData = await getWardCurrentWeather('A');
      
      // Transform the data to match the expected format with safe property access
      const transformedWeather = {
        location: {
          name: weatherData?.ward_name || 'Mumbai',
          country: 'India'
        },
        current: {
          temperature: weatherData?.Temperature_C || 25,
          feels_like: weatherData?.Temperature_C || 25,
          humidity: weatherData?.['Humidity_%'] || 70,
          pressure: 1013, // Default pressure
          wind_speed: weatherData?.Wind_Speed_kmh ? weatherData.Wind_Speed_kmh / 3.6 : 5, // Convert to m/s
          visibility: 10, // Default visibility
          weather: {
            description: weatherData?.weather_description || 'Clear sky',
            icon: '01d' // Default icon
          },
          rainfall: {
            last_1h: weatherData?.Rainfall_mm || 0,
            last_3h: weatherData?.Rainfall_24hr || 0
          }
        }
      };

      setWeather(transformedWeather);
      setAlerts([]); // No alerts for now
      setLastUpdated(new Date());

      // Notify parent component of weather update
      if (onWeatherUpdate) {
        onWeatherUpdate(transformedWeather, []);
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();

    // Auto-refresh every 10 minutes
    const interval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lon]);

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getRainfallStatus = (rainfall) => {
    if (rainfall > 20) return { level: "extreme", text: "Extreme" };
    if (rainfall > 10) return { level: "heavy", text: "Heavy" };
    if (rainfall > 2) return { level: "moderate", text: "Moderate" };
    if (rainfall > 0) return { level: "light", text: "Light" };
    return { level: "none", text: "No Rain" };
  };

  const getAlertSeverityClass = (severity) => {
    switch (severity) {
      case "high":
        return "alert-high";
      case "medium":
        return "alert-medium";
      case "low":
        return "alert-low";
      default:
        return "alert-info";
    }
  };

  if (loading && !weather) {
    return (
      <div className="weather-widget loading">
        <div className="weather-header">
          <h3>Current Weather</h3>
        </div>
        <div className="loading-spinner">Loading weather data...</div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="weather-widget error">
        <div className="weather-header">
          <h3>Current Weather</h3>
        </div>
        <div className="error-message">
          <p>Weather service unavailable</p>
          <button onClick={fetchWeatherData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const current = weather.current;
  const rainfallStatus = getRainfallStatus(current.rainfall.last_1h);

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3>Current Weather</h3>
        <div className="weather-location">
          {weather.location.name}, {weather.location.country}
        </div>
        {lastUpdated && (
          <div className="last-updated">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="weather-main">
        <div className="weather-primary">
          <div className="weather-icon">
            <img
              src={getWeatherIcon(current.weather.icon)}
              alt={current.weather.description}
            />
          </div>
          <div className="weather-temp">
            <span className="temp-value">
              {Math.round(current.temperature)}°C
            </span>
            <span className="temp-feels">
              Feels like {Math.round(current.feels_like)}°C
            </span>
          </div>
        </div>

        <div className="weather-description">
          {current.weather.description.charAt(0).toUpperCase() +
            current.weather.description.slice(1)}
        </div>
      </div>

      <div className="weather-details">
        <div className="weather-detail-row">
          <div className="weather-detail">
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{current.humidity}%</span>
          </div>
          <div className="weather-detail">
            <span className="detail-label">Wind</span>
            <span className="detail-value">{current.wind_speed} m/s</span>
          </div>
        </div>

        <div className="weather-detail-row">
          <div className="weather-detail">
            <span className="detail-label">Pressure</span>
            <span className="detail-value">{current.pressure} hPa</span>
          </div>
          <div className="weather-detail">
            <span className="detail-label">Visibility</span>
            <span className="detail-value">{current.visibility} km</span>
          </div>
        </div>

        <div className="rainfall-section">
          <div className="rainfall-header">
            <span className="detail-label">Rainfall</span>
            <span className={`rainfall-status ${rainfallStatus.level}`}>
              {rainfallStatus.text}
            </span>
          </div>
          <div className="rainfall-details">
            <div className="rainfall-item">
              <span>Last hour:</span>
              <span>{current.rainfall.last_1h.toFixed(1)} mm</span>
            </div>
            <div className="rainfall-item">
              <span>Last 3 hours:</span>
              <span>{current.rainfall.last_3h.toFixed(1)} mm</span>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="weather-alerts">
          <div className="alerts-header">
            <span className="alert-icon">⚠️</span>
            Weather Alerts ({alerts.length})
          </div>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`alert-item ${getAlertSeverityClass(
                  alert.severity
                )}`}
              >
                <div className="alert-title">{alert.title}</div>
                <div className="alert-description">{alert.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-actions">
        <button
          onClick={fetchWeatherData}
          disabled={loading}
          className="refresh-weather-btn"
        >
          {loading ? "Updating..." : "Refresh"}
        </button>
      </div>
    </div>
  );
};

export default WeatherWidget;
