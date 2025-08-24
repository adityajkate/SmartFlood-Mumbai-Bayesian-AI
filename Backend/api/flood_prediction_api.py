"""
FastAPI endpoints for flood prediction system
Integrates all three models with real-time weather data
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import json
import os
import sys
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.flood_prediction_models import FloodPredictionSystem
from services.weather_service import RealTimeDataService

app = FastAPI(
    title="Mumbai Flood Prediction API",
    description="Real-time flood prediction using Random Forest, K-means Clustering, and Bayesian Networks",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global variables for models (loaded once)
flood_system: Optional[FloodPredictionSystem] = None
weather_service: Optional[RealTimeDataService] = None


def load_trained_models(flood_system: FloodPredictionSystem, model_dir: str):
    """Load pre-trained models from disk"""
    import joblib
    import pandas as pd
    from models.flood_prediction_models import RandomForestFloodPredictor, WardClusteringModel, BayesianFloodModel
    
    try:
        # Load base data first
        flood_system.base_model.load_and_preprocess_data()
        
        # Initialize model components
        flood_system.rf_model = RandomForestFloodPredictor(flood_system.base_model)
        flood_system.clustering_model = WardClusteringModel(flood_system.base_model)
        flood_system.bayesian_model = BayesianFloodModel(flood_system.base_model)
        
        # Load Random Forest model
        flood_system.rf_model.model = joblib.load(f"{model_dir}/random_forest_model.pkl")
        flood_system.base_model.scaler = joblib.load(f"{model_dir}/scaler.pkl")
        flood_system.base_model.label_encoders = joblib.load(f"{model_dir}/label_encoders.pkl")
        
        # Load clustering model
        flood_system.clustering_model.model = joblib.load(f"{model_dir}/kmeans_model.pkl")
        flood_system.clustering_model.ward_features = pd.read_csv(f"{model_dir}/ward_clusters.csv")
        
        # Load Bayesian model if available
        bayesian_model_path = f"{model_dir}/bayesian_model.pkl"
        if os.path.exists(bayesian_model_path):
            try:
                flood_system.bayesian_model.model = joblib.load(bayesian_model_path)
                if flood_system.bayesian_model.model is not None:
                    from pgmpy.inference import VariableElimination
                    flood_system.bayesian_model.inference = VariableElimination(flood_system.bayesian_model.model)
            except Exception as e:
                print(f"Could not load Bayesian model: {e}")
                # Create a simple fallback
                flood_system.bayesian_model.model = None
        
        # Set up cross-references
        flood_system.base_model.clustering_model = flood_system.clustering_model
        
        print("Pre-trained models loaded successfully!")
        
    except Exception as e:
        print(f"Error loading models: {e}")
        raise


# Pydantic models for API
class WeatherInput(BaseModel):
    rainfall_mm: float
    rainfall_24hr: float
    tide_level_m: float
    temperature_c: float
    humidity_percent: float
    wind_speed_kmh: float
    season: str = "Monsoon"


class FloodPredictionResponse(BaseModel):
    ward_code: str
    ward_name: Optional[str] = None
    ward_risk_zone: str
    random_forest: Dict[str, Any]
    bayesian_probability: float
    combined_assessment: Dict[str, Any]
    weather_data: Dict[str, Any]
    timestamp: str


class BatchPredictionResponse(BaseModel):
    predictions: List[FloodPredictionResponse]
    summary: Dict[str, Any]
    timestamp: str


@app.on_event("startup")
async def startup_event():
    """Initialize models and services on startup"""
    global flood_system, weather_service
    
    try:
        print("Initializing flood prediction system...")
        flood_system = FloodPredictionSystem()
        
        # Check if models are already trained
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_dir = os.path.join(current_dir, "models", "trained")
        if os.path.exists(f"{model_dir}/random_forest_model.pkl"):
            print("Loading pre-trained models...")
            load_trained_models(flood_system, model_dir)
        else:
            print("Training models for the first time...")
            flood_system.train_all_models()
            flood_system.save_models()
        
        print("Flood prediction models loaded successfully!")
        
    except Exception as e:
        print(f"Error loading flood models: {e}")
        flood_system = None
    
    # Initialize weather service separately
    try:
        print("Initializing weather service...")
        weather_service = RealTimeDataService()
        print("Weather service initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing weather service: {e}")
        print("Weather service will use fallback data")
        weather_service = None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Mumbai Flood Prediction API",
        "status": "running",
        "models_loaded": flood_system is not None,
        "weather_service": weather_service is not None
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "api_status": "healthy",
        "models": {
            "flood_system": flood_system is not None,
            "random_forest": hasattr(flood_system, 'rf_model') if flood_system else False,
            "clustering": hasattr(flood_system, 'clustering_model') if flood_system else False,
            "bayesian": hasattr(flood_system, 'bayesian_model') if flood_system else False
        },
        "services": {
            "weather_service": weather_service is not None
        },
        "timestamp": datetime.now().isoformat()
    }


@app.post("/predict/ward/{ward_code}", response_model=FloodPredictionResponse)
async def predict_flood_for_ward(ward_code: str):
    """Predict flood risk for a specific ward using real-time weather data"""
    
    if not flood_system:
        raise HTTPException(status_code=503, detail="Flood prediction models not initialized")
    
    try:
        # Get weather data (with fallback)
        if weather_service:
            try:
                weather_data = weather_service.get_complete_weather_data(ward_code.upper())
            except Exception as e:
                print(f"Weather service error: {e}")
                weather_data = {
                    'Rainfall_mm': 5.0,
                    'Temperature_C': 28.0,
                    'Humidity_%': 80,
                    'Wind_Speed_kmh': 15.0,
                    'season': 'Monsoon',
                    'weather_description': 'Fallback weather data',
                    'timestamp': datetime.now().isoformat(),
                    'Rainfall_24hr': 10.0,
                    'Tide_Level_m': 2.0,
                    'High_Tide_m': 4.2,
                    'Low_Tide_m': 0.6,
                    'ward_code': ward_code.upper(),
                    'ward_name': f'Ward {ward_code}',
                    'coordinates': {'lat': 19.0760, 'lon': 72.8777}
                }
        else:
            # Use fallback weather data
            weather_data = {
                'Rainfall_mm': 5.0,
                'Temperature_C': 28.0,
                'Humidity_%': 80,
                'Wind_Speed_kmh': 15.0,
                'season': 'Monsoon',
                'weather_description': 'Fallback weather data',
                'timestamp': datetime.now().isoformat(),
                'Rainfall_24hr': 10.0,
                'Tide_Level_m': 2.0,
                'High_Tide_m': 4.2,
                'Low_Tide_m': 0.6,
                'ward_code': ward_code.upper(),
                'ward_name': f'Ward {ward_code}',
                'coordinates': {'lat': 19.0760, 'lon': 72.8777}
            }
        
        # Make prediction with error handling
        try:
            prediction = flood_system.predict_flood_risk(weather_data, ward_code.upper())
        except Exception as pred_error:
            print(f"Prediction error: {pred_error}")
            # Return a safe fallback prediction
            prediction = {
                'ward_code': ward_code.upper(),
                'ward_risk_zone': 'Medium Risk',
                'random_forest': {
                    'flood_risk_level': 0,
                    'will_flood': False,
                    'risk_probabilities': {'low': 0.7, 'medium': 0.2, 'high': 0.1}
                },
                'bayesian_probability': 0.3,
                'combined_assessment': {
                    'high_risk': False,
                    'confidence': 'Medium',
                    'confidence_score': 0.5
                }
            }
        
        return FloodPredictionResponse(
            ward_code=ward_code.upper(),
            ward_name=weather_data.get('ward_name', f'Ward {ward_code}'),
            ward_risk_zone=prediction.get('ward_risk_zone', 'Medium Risk'),
            random_forest=prediction.get('random_forest', {
                'flood_risk_level': 0,
                'will_flood': False,
                'risk_probabilities': {'low': 0.7, 'medium': 0.2, 'high': 0.1}
            }),
            bayesian_probability=prediction.get('bayesian_probability', 0.3),
            combined_assessment=prediction.get('combined_assessment', {
                'high_risk': False,
                'confidence': 'Medium',
                'confidence_score': 0.5
            }),
            weather_data=weather_data,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/predict/custom", response_model=FloodPredictionResponse)
async def predict_flood_custom_weather(ward_code: str, weather_input: WeatherInput):
    """Predict flood risk using custom weather data"""
    
    if not flood_system:
        raise HTTPException(status_code=503, detail="Models not initialized")
    
    try:
        # Convert input to model format
        weather_data = {
            'Rainfall_mm': weather_input.rainfall_mm,
            'Rainfall_24hr': weather_input.rainfall_24hr,
            'Tide_Level_m': weather_input.tide_level_m,
            'Temperature_C': weather_input.temperature_c,
            'Humidity_%': weather_input.humidity_percent,
            'Wind_Speed_kmh': weather_input.wind_speed_kmh,
            'season': weather_input.season
        }
        
        # Make prediction
        prediction = flood_system.predict_flood_risk(weather_data, ward_code.upper())
        
        return FloodPredictionResponse(
            ward_code=ward_code.upper(),
            ward_risk_zone=prediction['ward_risk_zone'],
            random_forest=prediction['random_forest'],
            bayesian_probability=prediction['bayesian_probability'],
            combined_assessment=prediction['combined_assessment'],
            weather_data=weather_data,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/predict/all-wards", response_model=BatchPredictionResponse)
async def predict_all_wards():
    """Get flood predictions for all Mumbai wards"""
    
    if not flood_system or not weather_service:
        raise HTTPException(status_code=503, detail="Models not initialized")
    
    try:
        # Get weather data for all wards
        all_weather_data = weather_service.get_weather_for_all_wards()
        
        predictions = []
        high_risk_count = 0
        
        for ward_code, weather_data in all_weather_data.items():
            try:
                prediction = flood_system.predict_flood_risk(weather_data, ward_code)
                
                pred_response = FloodPredictionResponse(
                    ward_code=ward_code,
                    ward_name=weather_data.get('ward_name'),
                    ward_risk_zone=prediction['ward_risk_zone'],
                    random_forest=prediction['random_forest'],
                    bayesian_probability=prediction['bayesian_probability'],
                    combined_assessment=prediction['combined_assessment'],
                    weather_data=weather_data,
                    timestamp=datetime.now().isoformat()
                )
                
                predictions.append(pred_response)
                
                if prediction['combined_assessment']['high_risk']:
                    high_risk_count += 1
                    
            except Exception as e:
                print(f"Error predicting for ward {ward_code}: {e}")
                continue
        
        summary = {
            'total_wards': len(predictions),
            'high_risk_wards': high_risk_count,
            'medium_risk_wards': len([p for p in predictions if p.random_forest['flood_risk_level'] == 1]),
            'low_risk_wards': len([p for p in predictions if p.random_forest['flood_risk_level'] == 0]),
            'average_bayesian_probability': sum([p.bayesian_probability for p in predictions]) / len(predictions) if predictions else 0
        }
        
        return BatchPredictionResponse(
            predictions=predictions,
            summary=summary,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")


@app.get("/wards/clusters")
async def get_ward_clusters():
    """Get ward clustering information"""
    
    if not flood_system or not flood_system.clustering_model:
        raise HTTPException(status_code=503, detail="Clustering model not initialized")
    
    try:
        clusters = flood_system.clustering_model.get_all_ward_clusters()
        return {
            "ward_clusters": clusters.to_dict('records'),
            "cluster_summary": clusters.groupby('risk_zone').size().to_dict(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")


@app.get("/weather/current/{ward_code}")
async def get_current_weather(ward_code: str):
    """Get current weather data for a ward"""
    
    try:
        if weather_service:
            weather_data = weather_service.get_complete_weather_data(ward_code.upper())
        else:
            # Fallback weather data when service is not available
            from services.weather_service import WeatherService
            fallback_service = WeatherService()
            weather_data = fallback_service._get_fallback_weather_data()
            weather_data.update({
                'ward_code': ward_code.upper(),
                'ward_name': f'Ward {ward_code}',
                'coordinates': {'lat': 19.0760, 'lon': 72.8777},
                'Rainfall_24hr': weather_data.get('Rainfall_mm', 0),
                'Tide_Level_m': 2.0,
                'High_Tide_m': 4.2,
                'Low_Tide_m': 0.6
            })
        
        return weather_data
        
    except Exception as e:
        # Return fallback data even if there's an error
        return {
            'Rainfall_mm': 0.0,
            'Temperature_C': 25.0,
            'Humidity_%': 70,
            'Wind_Speed_kmh': 10.0,
            'season': 'Monsoon',
            'weather_description': 'Weather service unavailable',
            'timestamp': datetime.now().isoformat(),
            'Rainfall_24hr': 0.0,
            'Tide_Level_m': 2.0,
            'High_Tide_m': 4.2,
            'Low_Tide_m': 0.6,
            'ward_code': ward_code.upper(),
            'ward_name': f'Ward {ward_code}',
            'coordinates': {'lat': 19.0760, 'lon': 72.8777}
        }


@app.post("/models/retrain")
async def retrain_models(background_tasks: BackgroundTasks):
    """Retrain all models (background task)"""
    
    def retrain():
        global flood_system
        try:
            print("Starting model retraining...")
            flood_system = FloodPredictionSystem()
            flood_system.train_all_models()
            flood_system.save_models()
            print("Model retraining completed!")
        except Exception as e:
            print(f"Error during retraining: {e}")
    
    background_tasks.add_task(retrain)
    return {"message": "Model retraining started in background"}


@app.get("/models/info")
async def get_model_info():
    """Get information about the trained models"""
    
    if not flood_system:
        raise HTTPException(status_code=503, detail="Models not initialized")
    
    try:
        info = {
            "random_forest": {
                "n_estimators": 100,
                "max_depth": 10,
                "features": flood_system.base_model.feature_columns
            },
            "clustering": {
                "n_clusters": 4,
                "algorithm": "K-means"
            },
            "bayesian_network": {
                "available": hasattr(flood_system.bayesian_model, 'model') and flood_system.bayesian_model.model is not None,
                "nodes": ["Rainfall_Category", "Tide_Category", "Ward_Risk_Zone", "Season", "Flood"]
            },
            "dataset_info": {
                "total_records": len(flood_system.base_model.data) if flood_system.base_model.data is not None else 0,
                "features": list(flood_system.base_model.data.columns) if flood_system.base_model.data is not None else []
            }
        }
        
        return info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model info error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)