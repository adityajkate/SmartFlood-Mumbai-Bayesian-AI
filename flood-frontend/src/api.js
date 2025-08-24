import axios from "axios";

const API_BASE_URL = process.env.NODE_ENV === 'development' ? "" : "http://127.0.0.1:8000";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Check if the API server is running
export const checkServerHealth = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    console.error("Server health check failed:", error);
    throw new Error(
      "Backend server is not responding. Make sure your FastAPI server is running on http://127.0.0.1:8000"
    );
  }
};

// Get API and model information
export const getApiInfo = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    console.error("Error getting API info:", error);
    throw error;
  }
};

// Get model information
export const getModelInfo = async () => {
  try {
    const response = await api.get("/models/info");
    return response.data;
  } catch (error) {
    console.error("Error getting model info:", error);
    throw error;
  }
};

// Predict flood risk
export const predictFloodRisk = async (rainfallData) => {
  try {
    // Validate input data
    if (!Array.isArray(rainfallData) || rainfallData.length !== 15) {
      throw new Error("Rainfall data must be an array of exactly 15 values");
    }

    const response = await api.post("/predict", {
      rainfall_values: rainfallData,
    });
    return response.data;
  } catch (error) {
    console.error("Error predicting flood risk:", error);

    // Provide more specific error messages
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        "Unknown server error";

      if (status === 503) {
        throw new Error(
          "Model not loaded on server. Please check server logs."
        );
      } else if (status === 400) {
        throw new Error(`Invalid request: ${message}`);
      } else {
        throw new Error(`Server error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(
        "Cannot connect to backend server. Make sure your FastAPI server is running on http://127.0.0.1:8000"
      );
    } else {
      // Something else happened
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

// Simplified prediction endpoint (alternative)
export const predictFloodRiskSimple = async (rainfallData) => {
  try {
    if (!Array.isArray(rainfallData) || rainfallData.length !== 15) {
      throw new Error("Rainfall data must be an array of exactly 15 values");
    }

    const response = await api.post("/predict-simple", rainfallData);
    return response.data;
  } catch (error) {
    console.error("Error with simple prediction:", error);
    throw error;
  }
};

// Get real rainfall data from weather API or user input
export const getRealRainfallData = async (lat = 19.076, lon = 72.8777) => {
  try {
    // Try to get real weather data first
    const forecast = await getWeatherForecast(lat, lon, 5);
    
    if (forecast && forecast.list) {
      // Extract rainfall from forecast (last 15 periods)
      const rainfallData = forecast.list.slice(0, 15).map(item => {
        return item.rain ? (item.rain['3h'] || item.rain['1h'] || 0) : 0;
      });
      
      // Pad with zeros if we don't have enough data
      while (rainfallData.length < 15) {
        rainfallData.push(0);
      }
      
      return rainfallData.slice(0, 15);
    }
  } catch (error) {
    console.warn('Could not fetch real weather data:', error);
  }
  
  // Fallback: Return array of zeros (no rain scenario)
  // This is better than random data as it represents a real scenario
  return Array(15).fill(0);
};

// Get current season based on date (for Mumbai)
export const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (month >= 6 && month <= 9) {
    return 'monsoon'; // June to September
  } else if (month >= 10 && month <= 11) {
    return 'post-monsoon'; // October to November
  } else if (month >= 12 || month <= 2) {
    return 'winter'; // December to February
  } else {
    return 'summer'; // March to May
  }
};

// Weather API functions
export const getCurrentWeather = async (lat = null, lon = null) => {
  try {
    // Use the ward-specific endpoint instead
    const response = await api.get(`/weather/current/A`); // Default to ward A
    return response.data;
  } catch (error) {
    console.error("Error fetching current weather:", error);
    // Return fallback weather data instead of throwing
    return {
      temperature: 28,
      humidity: 80,
      description: "Overcast clouds",
      current: {
        rainfall: {
          last_1h: 0
        }
      }
    };
  }
};

export const getWeatherForecast = async (lat = null, lon = null, days = 5) => {
  try {
    const params = new URLSearchParams();
    if (lat !== null) params.append("lat", lat);
    if (lon !== null) params.append("lon", lon);
    params.append("days", days);

    const response = await api.get(`/weather/forecast?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching weather forecast:", error);
    throw error;
  }
};

export const getWeatherAlerts = async (lat = null, lon = null) => {
  try {
    const params = new URLSearchParams();
    if (lat !== null) params.append("lat", lat);
    if (lon !== null) params.append("lon", lon);

    const response = await api.get(`/weather/alerts?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching weather alerts:", error);
    throw error;
  }
};

// Enhanced prediction with weather data
export const predictFloodRiskWithWeather = async (
  rainfallData = null,
  lat = null,
  lon = null,
  useForecast = true
) => {
  try {
    const requestBody = {};

    if (rainfallData) {
      if (!Array.isArray(rainfallData) || rainfallData.length !== 15) {
        throw new Error("Rainfall data must be an array of exactly 15 values");
      }
      requestBody.rainfall_data = { rainfall_values: rainfallData };
    }

    if (lat !== null) requestBody.lat = lat;
    if (lon !== null) requestBody.lon = lon;
    requestBody.use_forecast = useForecast;

    const response = await api.post("/predict-with-weather", requestBody);
    return response.data;
  } catch (error) {
    console.error("Error predicting flood risk with weather:", error);

    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        "Unknown server error";

      if (status === 503) {
        throw new Error(
          "Weather service not available. Please check API configuration."
        );
      } else if (status === 400) {
        throw new Error(`Invalid request: ${message}`);
      } else {
        throw new Error(`Server error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error(
        "Cannot connect to backend server. Make sure your FastAPI server is running."
      );
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

// Live weather-based ward prediction
export const getWardLiveWeatherPrediction = async (wardId, lat = null, lon = null) => {
  try {
    const params = new URLSearchParams();
    if (lat !== null) params.append("lat", lat);
    if (lon !== null) params.append("lon", lon);

    const response = await api.get(`/wards/${wardId}/live-weather-prediction?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching live weather prediction:", error);

    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        "Unknown server error";

      if (status === 503) {
        throw new Error(
          "Weather service not available. Please check OpenWeatherMap API configuration."
        );
      } else if (status === 400) {
        throw new Error(`Invalid request: ${message}`);
      } else {
        throw new Error(`Server error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error(
        "Cannot connect to backend server. Make sure your FastAPI server is running."
      );
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

// ===== NEW WARD-SPECIFIC ENDPOINTS =====

// Get all available wards for dropdown/selection
export const getAvailableWards = async () => {
  try {
    // Since we don't have a specific endpoint, return the predefined ward list
    const wards = MUMBAI_WARD_CODES.map(code => ({
      ward_id: code,
      ward_name: WARD_NAMES[code] || code,
      zone: 'Mumbai'
    }));
    
    return { wards };
  } catch (error) {
    console.error("Error fetching available wards:", error);
    throw error;
  }
};

// Single ward prediction (comprehensive model with all ML algorithms)
export const predictSingleWard = async (wardId, rainfallMm, tideHeightM = null, season = null) => {
  try {
    // Use the correct endpoint format: /predict/ward/{ward_code}
    const response = await api.post(`/predict/ward/${wardId}`);
    const data = response.data;
    
    console.log("Raw API response:", data);
    
    // Return the raw data - let MapComponent handle transformation
    return data;
  } catch (error) {
    console.error('Error predicting single ward:', error);
    throw error;
  }
};

// Bulk ward predictions (efficient for multiple wards)
export const predictMultipleWards = async (wardsData) => {
  try {
    // Since bulk endpoint doesn't exist, use the all-wards endpoint
    const response = await getAllWardsFloodPrediction();
    
    // Transform to expected format
    const ward_predictions = {};
    response.predictions.forEach(prediction => {
      const wardId = prediction.ward_code;
      ward_predictions[wardId] = {
        risk_level: prediction.combined_assessment.high_risk ? 'High' : 'Low',
        flood_probability: prediction.bayesian_probability,
        ward_id: wardId,
        ward_name: prediction.ward_name
      };
    });
    
    return {
      ward_predictions,
      summary: response.summary,
      timestamp: response.timestamp
    };
  } catch (error) {
    console.error("Error predicting multiple wards:", error);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.detail || "Unknown server error";
      
      if (status === 503) {
        throw new Error("Models not trained. Please run training first.");
      } else if (status === 400) {
        throw new Error(`Invalid request: ${message}`);
      } else {
        throw new Error(`Server error (${status}): ${message}`);
      }
    }
    throw error;
  }
};

// Get current status of a ward (cached results)
export const getWardCurrentStatus = async (wardId) => {
  try {
    // Since this endpoint doesn't exist, use the ward prediction endpoint
    const prediction = await getWardFloodPrediction(wardId);
    
    // Transform to expected format
    return {
      status: 'current',
      risk_level: prediction.combined_assessment.high_risk ? 'High' : 'Low',
      current_flood_probability: prediction.bayesian_probability,
      last_updated: prediction.timestamp,
      data_freshness: 'current',
      recommendation: prediction.combined_assessment.high_risk 
        ? 'High flood risk detected. Monitor conditions closely.'
        : 'Low flood risk. Normal conditions expected.'
    };
  } catch (error) {
    console.error("Error fetching ward current status:", error);
    return {
      status: 'no_recent_data',
      risk_level: 'Unknown',
      current_flood_probability: 0,
      last_updated: new Date().toISOString(),
      data_freshness: 'stale',
      recommendation: 'Unable to fetch current status.'
    };
  }
};

// Get clustering analysis for all wards
export const getWardClustering = async () => {
  try {
    const response = await api.get("/wards/clusters");
    return response.data;
  } catch (error) {
    console.error("Error fetching ward clustering:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Clustering models not trained. Please run training first.");
    }
    throw error;
  }
};

// Bayesian network prediction
export const getBayesianPrediction = async (rainfallMm, tideHeightM = null, season = null) => {
  try {
    const requestBody = { rainfall_mm: rainfallMm };
    
    if (tideHeightM !== null) requestBody.tide_height_m = tideHeightM;
    if (season !== null) requestBody.season = season;
    
    const response = await api.post("/bayesian/predict", requestBody);
    return response.data;
  } catch (error) {
    console.error("Error with Bayesian prediction:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Bayesian Network not trained. Please run training first.");
    }
    throw error;
  }
};

// Get safe route between two points
export const getSafeRoute = async (startLat, startLon, endLat, endLon) => {
  try {
    const requestBody = {
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon
    };
    
    const response = await api.post("/routing/safe-route", requestBody);
    return response.data;
  } catch (error) {
    console.error("Error getting safe route:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Route optimizer not initialized. Please run training first.");
    }
    throw error;
  }
};

// Find nearest safe zone from current location
export const getNearestSafeZone = async (currentLat, currentLon) => {
  try {
    const response = await api.post("/routing/nearest-safe-zone", {
      lat: currentLat,
      lon: currentLon
    });
    return response.data;
  } catch (error) {
    console.error("Error finding nearest safe zone:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Route optimizer not initialized. Please run training first.");
    }
    throw error;
  }
};

// Comprehensive prediction for multiple wards (legacy endpoint)
export const getComprehensivePrediction = async (wardData, tideHeightM = null, season = null) => {
  try {
    const requestBody = { ward_data: wardData };
    
    if (tideHeightM !== null) requestBody.tide_height_m = tideHeightM;
    if (season !== null) requestBody.season = season;
    
    const response = await api.post("/predict-comprehensive", requestBody);
    return response.data;
  } catch (error) {
    console.error("Error with comprehensive prediction:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Models not trained. Please run training first.");
    }
    throw error;
  }
};

// ===== UTILITY FUNCTIONS FOR FRONTEND =====

// Helper function to determine risk color for map visualization
export const getRiskColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'critical': return '#FF0000'; // Red
    case 'high': return '#FF6600';     // Orange  
    case 'medium': return '#FFFF00';   // Yellow
    case 'low': return '#00FF00';      // Green
    default: return '#CCCCCC';         // Gray
  }
};

// Helper function to get risk level from probability
export const getRiskLevel = (probability) => {
  if (probability >= 0.7) return 'Critical';
  if (probability >= 0.3) return 'High';
  if (probability >= 0.1) return 'Medium';
  return 'Low';
};

// Create ward data with real inputs
export const createWardData = (wardIds, rainfallMm, tideHeightM = null, season = null) => {
  const currentSeason = season || getCurrentSeason();
  const defaultTide = tideHeightM || 2.0; // Mumbai average tide height
  
  return wardIds.map(wardId => ({
    ward_id: wardId,
    rainfall_mm: rainfallMm, // Use real rainfall input
    tide_height_m: defaultTide, // Use real or default tide height
    season: currentSeason // Use actual current season
  }));
};

// Mumbai ward coordinates (approximate centroids)
export const MUMBAI_WARD_COORDINATES = {
  'A': { latitude: 18.9067, longitude: 72.8147, name: 'Colaba' },
  'B': { latitude: 18.9322, longitude: 72.8264, name: 'Fort' },
  'C': { latitude: 18.9480, longitude: 72.8258, name: 'Marine Lines' },
  'D': { latitude: 18.9696, longitude: 72.8448, name: 'Mazgaon' },
  'E': { latitude: 18.9750, longitude: 72.8342, name: 'Byculla' },
  'F/N': { latitude: 19.0138, longitude: 72.8452, name: 'Parel' },
  'F/S': { latitude: 19.0008, longitude: 72.8300, name: 'Lower Parel' },
  'G/N': { latitude: 19.0176, longitude: 72.8562, name: 'Dadar' },
  'G/S': { latitude: 19.0330, longitude: 72.8570, name: 'Mahim' },
  'H/E': { latitude: 19.0596, longitude: 72.8656, name: 'Bandra East' },
  'H/W': { latitude: 19.0596, longitude: 72.8295, name: 'Bandra West' },
  'K/E': { latitude: 19.1136, longitude: 72.8697, name: 'Andheri East' },
  'K/W': { latitude: 19.1197, longitude: 72.8464, name: 'Andheri West' },
  'L': { latitude: 19.0728, longitude: 72.8826, name: 'Kurla' },
  'M/E': { latitude: 19.0330, longitude: 72.8990, name: 'Chembur' },
  'M/W': { latitude: 19.0270, longitude: 72.9500, name: 'Trombay' },
  'N': { latitude: 19.0896, longitude: 72.9081, name: 'Ghatkopar' },
  'P/N': { latitude: 19.1872, longitude: 72.8495, name: 'Malad' },
  'P/S': { latitude: 19.2094, longitude: 72.8526, name: 'Kandivali' },
  'R/C': { latitude: 19.2307, longitude: 72.8567, name: 'Borivali' },
  'R/N': { latitude: 19.2544, longitude: 72.8656, name: 'Dahisar' },
  'R/S': { latitude: 19.2094, longitude: 72.8700, name: 'Kandivali East' },
  'S': { latitude: 19.1450, longitude: 72.9342, name: 'Bhandup' },
  'T': { latitude: 19.1728, longitude: 72.9342, name: 'Mulund' }
};

// Get ward coordinates
export const getWardCoordinates = (wardId) => {
  return MUMBAI_WARD_COORDINATES[wardId] || { 
    latitude: 19.0760, 
    longitude: 72.8777, 
    name: 'Mumbai Center' 
  };
};

// ===== NEW FLOOD PREDICTION API FUNCTIONS =====

// Get real-time flood prediction for a specific ward
export const getWardFloodPrediction = async (wardCode) => {
  try {
    const encodedWardCode = encodeURIComponent(wardCode);
    const response = await api.post(`/predict/ward/${encodedWardCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting flood prediction for ward ${wardCode}:`, error);
    
    if (error.response?.status === 503) {
      throw new Error("Flood prediction models not initialized. Please check server status.");
    } else if (error.response?.status === 404) {
      throw new Error(`Weather data not available for ward ${wardCode}`);
    } else if (error.response?.status === 500) {
      throw new Error(`Prediction error for ward ${wardCode}. Please try again.`);
    }
    throw error;
  }
};

// Get flood predictions for all Mumbai wards
export const getAllWardsFloodPrediction = async () => {
  try {
    const response = await api.get("/predict/all-wards");
    return response.data;
  } catch (error) {
    console.error("Error getting all wards flood prediction:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Flood prediction models not initialized. Please check server status.");
    }
    throw error;
  }
};

// Custom weather flood prediction
export const predictFloodWithCustomWeather = async (wardCode, weatherData) => {
  try {
    const response = await api.post(`/predict/custom?ward_code=${wardCode}`, weatherData);
    return response.data;
  } catch (error) {
    console.error("Error with custom weather prediction:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Flood prediction models not initialized.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid weather data provided.");
    }
    throw error;
  }
};

// Get ward clustering information
export const getWardClusters = async () => {
  try {
    const response = await api.get("/wards/clusters");
    return response.data;
  } catch (error) {
    console.error("Error getting ward clusters:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Clustering model not initialized.");
    }
    throw error;
  }
};

// Get current weather for a ward
export const getWardCurrentWeather = async (wardCode) => {
  try {
    const response = await api.get(`/weather/current/${wardCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting current weather for ward ${wardCode}:`, error);
    
    if (error.response?.status === 503) {
      throw new Error("Weather service not initialized.");
    }
    throw error;
  }
};

// Get model information and status
export const getFloodModelInfo = async () => {
  try {
    const response = await api.get("/models/info");
    return response.data;
  } catch (error) {
    console.error("Error getting model info:", error);
    
    if (error.response?.status === 503) {
      throw new Error("Models not initialized.");
    }
    throw error;
  }
};

// Retrain models (admin function)
export const retrainModels = async () => {
  try {
    const response = await api.post("/models/retrain");
    return response.data;
  } catch (error) {
    console.error("Error retraining models:", error);
    throw error;
  }
};

// Health check for flood prediction API
export const checkFloodApiHealth = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    console.error("Flood API health check failed:", error);
    throw new Error("Flood prediction API is not responding. Make sure the server is running on http://127.0.0.1:8000");
  }
};

// Helper function to format flood prediction response for UI
export const formatFloodPrediction = (prediction) => {
  if (!prediction) return null;
  
  // Safe property access with fallbacks
  const randomForest = prediction.random_forest || {};
  const combinedAssessment = prediction.combined_assessment || {};
  const bayesianProbability = prediction.bayesian_probability || 0;
  const wardRiskZone = prediction.ward_risk_zone || 'Unknown';
  
  return {
    wardCode: prediction.ward_code,
    wardName: prediction.ward_name,
    riskZone: wardRiskZone,
    riskLevel: randomForest.flood_risk_level || 0,
    willFlood: randomForest.will_flood || false,
    riskProbabilities: randomForest.risk_probabilities || {},
    bayesianProbability: bayesianProbability,
    highRisk: combinedAssessment.high_risk || false,
    confidence: combinedAssessment?.confidence || 'Medium',
    timestamp: prediction.timestamp || new Date().toISOString(),
    weatherData: prediction.weather_data || {}
  };
};

// Helper function to get risk color based on flood prediction
export const getFloodRiskColor = (riskLevel) => {
  switch (riskLevel) {
    case 2: return '#FF0000'; // High - Red
    case 1: return '#FF6600'; // Medium - Orange
    case 0: return '#00FF00'; // Low - Green
    default: return '#CCCCCC'; // Unknown - Gray
  }
};

// Helper function to get risk zone color
export const getRiskZoneColor = (riskZone) => {
  switch (riskZone) {
    case 'Very High Risk': return '#8B0000'; // Dark Red
    case 'High Risk': return '#FF4500';      // Orange Red
    case 'Medium Risk': return '#FFD700';    // Gold
    case 'Low Risk': return '#32CD32';       // Lime Green
    default: return '#CCCCCC';               // Gray
  }
};

// Mumbai ward codes for dropdown
export const MUMBAI_WARD_CODES = [
  'A', 'B', 'C', 'D', 'E', 'F/N', 'F/S', 'G/N', 'G/S', 'H/E', 'H/W', 
  'K/E', 'K/W', 'L', 'M/E', 'M/W', 'N', 'P/N', 'P/S', 'R/C', 'R/N', 'R/S', 'S', 'T'
];

// Ward names mapping
export const WARD_NAMES = {
  'A': 'Colaba, Churchgate',
  'B': 'Masjid Bunder',
  'C': 'Marine Lines',
  'D': 'Grant Road',
  'E': 'Byculla, Mazgaon',
  'F/N': 'Matunga',
  'F/S': 'Parel',
  'G/N': 'Dadar',
  'G/S': 'Worli',
  'H/E': 'Santacruz East',
  'H/W': 'Bandra West',
  'K/E': 'Vile Parle East',
  'K/W': 'Andheri West',
  'L': 'Kurla',
  'M/E': 'Mankhurd',
  'M/W': 'Chembur',
  'N': 'Ghatkopar',
  'P/N': 'Malad',
  'P/S': 'Goregaon',
  'R/C': 'Borivali',
  'R/N': 'Dahisar',
  'R/S': 'Kandivali',
  'S': 'Powai',
  'T': 'Mulund'
};
