import React, { useState, useEffect } from 'react';
import { 
  getAvailableWards, 
  predictMultipleWards, 
  getRiskColor,
  createWardData,
  getCurrentSeason
 
} from './api';
import WardPredictionPanel from './WardPredictionPanel';
import './WardMapDemo.css';

const WardMapDemo = () => {
  const [availableWards, setAvailableWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardPredictions, setWardPredictions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available wards on component mount
  useEffect(() => {
    const loadWards = async () => {
      try {
        const wardsData = await getAvailableWards();
        setAvailableWards(wardsData.wards || []);
      } catch (error) {
        console.error('Failed to load wards:', error);
        setError('Failed to load ward data');
      }
    };
    loadWards();
  }, []);

  const handleWardClick = (wardId) => {
    setSelectedWard(wardId);
  };

  const handleBulkPrediction = async () => {
    if (availableWards.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Use real data - in production this should come from weather API
      const selectedWards = availableWards.slice(0, 10); // First 10 wards
      const currentRainfall = 25.0; // TODO: Get from weather API or user input
      const wardData = createWardData(
        selectedWards.map(w => w.ward_id),
        currentRainfall,
        2.0, // Current tide height - should come from tide API
        getCurrentSeason()
      );
      
      const results = await predictMultipleWards(wardData);
      
      // Convert results to a more usable format
      const predictions = {};
      Object.entries(results.ward_predictions).forEach(([wardId, prediction]) => {
        predictions[wardId] = {
          ...prediction,
          color: getRiskColor(prediction.risk_level)
        };
      });
      
      setWardPredictions(predictions);
    } catch (error) {
      console.error('Bulk prediction failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getWardStyle = (wardId) => {
    const prediction = wardPredictions[wardId];
    if (!prediction) {
      return {
        backgroundColor: '#e0e0e0',
        color: '#666'
      };
    }

    return {
      backgroundColor: prediction.color,
      color: prediction.risk_level === 'Low' ? '#333' : 'white',
      fontWeight: 'bold'
    };
  };

  const getWardDisplayInfo = (wardId) => {
    const ward = availableWards.find(w => w.ward_id === wardId);
    const prediction = wardPredictions[wardId];
    
    return {
      name: ward?.ward_name || wardId,
      zone: ward?.zone || 'Unknown',
      riskLevel: prediction?.risk_level || 'Unknown',
      probability: prediction?.flood_probability || 0
    };
  };

  return (
    <div className="ward-map-demo">
      <div className="demo-header">
        <h2>🗺️ Mumbai Ward Flood Risk Map</h2>
        <p>Interactive demonstration of ward-based flood predictions</p>
        
        <div className="demo-controls">
          <button 
            onClick={handleBulkPrediction}
            disabled={loading || availableWards.length === 0}
            className="bulk-predict-btn"
          >
            {loading ? '🔄 Analyzing...' : '🎯 Analyze All Wards'}
          </button>
          
          {Object.keys(wardPredictions).length > 0 && (
            <button 
              onClick={() => setWardPredictions({})}
              className="clear-btn"
            >
              🗑️ Clear Results
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <span>{error}</span>
        </div>
      )}

      <div className="demo-content">
        {/* Simulated Map Grid */}
        <div className="map-section">
          <h3>Ward Map (Click on any ward)</h3>
          
          {/* Legend */}
          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#FF0000'}}></div>
              <span>Critical Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#FF6600'}}></div>
              <span>High Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#FFFF00'}}></div>
              <span>Medium Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#00FF00'}}></div>
              <span>Low Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#e0e0e0'}}></div>
              <span>No Data</span>
            </div>
          </div>

          {/* Ward Grid */}
          <div className="ward-grid">
            {availableWards.map(ward => {
              const info = getWardDisplayInfo(ward.ward_id);
              const isSelected = selectedWard === ward.ward_id;
              
              return (
                <div
                  key={ward.ward_id}
                  className={`ward-tile ${isSelected ? 'selected' : ''}`}
                  style={getWardStyle(ward.ward_id)}
                  onClick={() => handleWardClick(ward.ward_id)}
                  title={`${info.name} (${ward.ward_id}) - ${info.zone}\nRisk: ${info.riskLevel}\nProbability: ${(info.probability * 100).toFixed(1)}%`}
                >
                  <div className="ward-id">{ward.ward_id}</div>
                  <div className="ward-name">{info.name}</div>
                  {wardPredictions[ward.ward_id] && (
                    <div className="ward-risk">
                      {(info.probability * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Statistics */}
          {Object.keys(wardPredictions).length > 0 && (
            <div className="summary-stats">
              <h4>📊 Risk Summary</h4>
              <div className="stats-grid">
                <div className="stat-item critical">
                  <span className="stat-number">
                    {Object.values(wardPredictions).filter(p => p.risk_level === 'Critical').length}
                  </span>
                  <span className="stat-label">Critical</span>
                </div>
                <div className="stat-item high">
                  <span className="stat-number">
                    {Object.values(wardPredictions).filter(p => p.risk_level === 'High').length}
                  </span>
                  <span className="stat-label">High</span>
                </div>
                <div className="stat-item medium">
                  <span className="stat-number">
                    {Object.values(wardPredictions).filter(p => p.risk_level === 'Medium').length}
                  </span>
                  <span className="stat-label">Medium</span>
                </div>
                <div className="stat-item low">
                  <span className="stat-number">
                    {Object.values(wardPredictions).filter(p => p.risk_level === 'Low').length}
                  </span>
                  <span className="stat-label">Low</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ward Details Panel */}
        <div className="details-section">
          <WardPredictionPanel 
            selectedWard={selectedWard}
            onWardSelect={setSelectedWard}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h4>🎯 How to Use:</h4>
        <ol>
          <li><strong>Analyze All Wards:</strong> Click "Analyze All Wards" to run bulk predictions</li>
          <li><strong>Select Ward:</strong> Click on any ward tile or use the dropdown in the details panel</li>
          <li><strong>View Details:</strong> See detailed predictions with multiple ML models</li>
          <li><strong>Adjust Parameters:</strong> Change rainfall, tide height, and season for custom predictions</li>
          <li><strong>Color Coding:</strong> Ward colors indicate flood risk levels (Red = Critical, Green = Low)</li>
        </ol>
      </div>
    </div>
  );
};

export default WardMapDemo;