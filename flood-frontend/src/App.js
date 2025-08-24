import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import { 
  checkFloodApiHealth, 
  getAllWardsFloodPrediction, 
  formatFloodPrediction 
} from "./api";
import "./App.css";

function App() {
  const [predictions, setPredictions] = useState({});
  const [selectedWard, setSelectedWard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [apiStatus, setApiStatus] = useState('checking');
  const [error, setError] = useState(null);

  // Check API health on startup
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      setApiStatus('checking');
      const health = await checkFloodApiHealth();
      setApiStatus('connected');
      console.log('Flood Prediction API connected:', health);
      
      // Load initial predictions if API is healthy
      if (health.models_loaded) {
        loadAllPredictions();
      }
    } catch (error) {
      setApiStatus('error');
      setError(error.message);
      console.error('API health check failed:', error);
    }
  };

  const loadAllPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllWardsFloodPrediction();
      
      // Format predictions for the UI
      const formattedPredictions = {};
      response.predictions.forEach(prediction => {
        const formatted = formatFloodPrediction(prediction);
        formattedPredictions[formatted.wardCode] = formatted;
      });
      
      setPredictions(formattedPredictions);
      setLastUpdated(new Date());
      
      console.log('Loaded predictions for', Object.keys(formattedPredictions).length, 'wards');
      
    } catch (error) {
      setError(error.message);
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (apiStatus === 'connected') {
      loadAllPredictions();
    } else {
      checkApiHealth();
    }
  };

  const handleWardSelect = (wardCode) => {
    setSelectedWard(wardCode);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Mumbai Flood Prediction System</h1>
        <div className="api-status">
          <span className={`status-indicator ${apiStatus}`}>
            {apiStatus === 'checking' && '🔄 Connecting...'}
            {apiStatus === 'connected' && '✅ Connected'}
            {apiStatus === 'error' && '❌ Disconnected'}
          </span>
          {apiStatus === 'connected' && (
            <span className="model-info">
              AI Models: Random Forest + K-means + Bayesian Network
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={checkApiHealth} className="retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      <Dashboard
        predictions={predictions}
        setPredictions={setPredictions}
        selectedWard={selectedWard}
        setSelectedWard={handleWardSelect}
        loading={loading}
        setLoading={setLoading}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        apiStatus={apiStatus}
      />
    </div>
  );
}

export default App;
