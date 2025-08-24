import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ loading }) => {
  if (!loading) return null;

  return (
    <div className="map-loading-overlay">
      <div className="map-loading-spinner"></div>
    </div>
  );
};

export default LoadingOverlay;
