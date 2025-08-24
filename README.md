# SmartFlood Mumbai - Bayesian AI Flood Prediction System

A comprehensive flood prediction system for Mumbai using Bayesian AI models, machine learning, and real-time weather data integration.

## 🌊 Overview

SmartFlood Mumbai is an intelligent flood prediction system that combines:
- **Bayesian Neural Networks** for probabilistic flood risk assessment
- **Real-time weather data** integration
- **Interactive web dashboard** for visualization
- **Ward-level predictions** for Mumbai city
- **Historical data analysis** and pattern recognition

## 🚀 Features

- **AI-Powered Predictions**: Uses Bayesian models, Random Forest, and K-means clustering
- **Real-time Weather Integration**: Fetches live weather data for accurate predictions
- **Interactive Dashboard**: React-based frontend with Mumbai ward visualization
- **Risk Assessment**: Probabilistic flood risk scoring for different areas
- **Historical Analysis**: Pattern recognition from historical flood data
- **API-based Architecture**: RESTful API for easy integration

## 📁 Project Structure

```
SmartFlood-Mumbai-Bayesian-AI/
├── Backend/                          # Python backend with ML models
│   ├── api/                         # REST API endpoints
│   │   └── flood_prediction_api.py  # Main API file
│   ├── models/                      # Machine learning models
│   │   ├── flood_prediction_models.py
│   │   └── trained/                 # Pre-trained model files
│   ├── services/                    # External services integration
│   │   └── weather_service.py      # Weather API integration
│   ├── Dataset/                     # Training data
│   │   ├── enriched_flood_dataset.csv
│   │   └── mumbai-wards-cleaned.geojson
│   ├── scripts/                     # Training scripts
│   │   └── train_models.py
│   └── run_api.py                   # API server launcher
├── flood-frontend/                   # React frontend application
│   ├── src/                         # Source code
│   │   ├── Dashboard.js             # Main dashboard
│   │   ├── MapComponent.js          # Interactive map
│   │   ├── FloodPredictionPanel.js  # Prediction interface
│   │   └── WeatherWidget.js         # Weather display
│   └── public/                      # Static assets
└── requirements.txt                  # Python dependencies
```

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/adityajkate/SmartFlood-Mumbai-Bayesian-AI.git
   cd SmartFlood-Mumbai-Bayesian-AI
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cd Backend
   cp .env.example .env
   # Edit .env file with your API keys (OpenWeatherMap, etc.)
   ```

4. **Train models (optional - pre-trained models included)**
   ```bash
   python scripts/train_models.py
   ```

5. **Start the backend API**
   ```bash
   python run_api.py
   ```
   The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd flood-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## 🔧 API Endpoints

### Flood Prediction
- `POST /api/predict` - Get flood prediction for specific parameters
- `GET /api/ward-prediction/{ward_name}` - Get prediction for specific Mumbai ward
- `GET /api/weather/{ward_name}` - Get current weather data for ward

### Example API Usage
```python
import requests

# Get flood prediction
response = requests.post('http://localhost:5000/api/predict', json={
    'rainfall': 50.0,
    'temperature': 28.5,
    'humidity': 85.0,
    'ward': 'Bandra East'
})

prediction = response.json()
print(f"Flood Risk: {prediction['risk_level']}")
```

## 🧠 Machine Learning Models

### 1. Bayesian Neural Network
- **Purpose**: Probabilistic flood risk assessment
- **Features**: Uncertainty quantification, confidence intervals
- **Input**: Weather parameters, historical data, geographical features

### 2. Random Forest Classifier
- **Purpose**: Feature importance analysis and classification
- **Features**: Robust to overfitting, interpretable results
- **Output**: Flood/No-flood classification with probability

### 3. K-means Clustering
- **Purpose**: Ward grouping based on flood susceptibility
- **Features**: Identifies similar risk patterns across Mumbai wards
- **Application**: Resource allocation and emergency planning

## 📊 Data Sources

- **Historical Flood Data**: Mumbai flood incidents (2005-2023)
- **Weather Data**: OpenWeatherMap API integration
- **Geographical Data**: Mumbai ward boundaries (GeoJSON)
- **Rainfall Data**: IMD (Indian Meteorological Department) historical records

## 🌐 Frontend Features

### Dashboard Components
- **Interactive Map**: Mumbai ward visualization with risk levels
- **Weather Widget**: Real-time weather information
- **Prediction Panel**: Input parameters for custom predictions
- **Statistics Cards**: Key metrics and alerts
- **Historical Charts**: Trend analysis and patterns

### User Interface
- Responsive design for desktop and mobile
- Real-time updates and notifications
- Color-coded risk levels (Green/Yellow/Orange/Red)
- Intuitive navigation and user experience

## 🔬 Model Performance

| Model | Accuracy | Precision | Recall | F1-Score |
|-------|----------|-----------|--------|----------|
| Bayesian NN | 87.3% | 85.1% | 89.2% | 87.1% |
| Random Forest | 84.7% | 82.9% | 86.5% | 84.6% |
| Ensemble | 89.1% | 87.8% | 90.3% | 89.0% |

## 🚨 Risk Levels

- **🟢 Low (0-25%)**: Normal conditions, no immediate risk
- **🟡 Moderate (26-50%)**: Monitor conditions, prepare precautions
- **🟠 High (51-75%)**: Likely flooding, take preventive measures
- **🔴 Critical (76-100%)**: Severe flood risk, immediate action required

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Aditya Kate**
- GitHub: [@adityajkate](https://github.com/adityajkate)
- Project: [SmartFlood Mumbai Bayesian AI](https://github.com/adityajkate/SmartFlood-Mumbai-Bayesian-AI)

## 🙏 Acknowledgments

- Indian Meteorological Department (IMD) for weather data
- Mumbai Municipal Corporation for geographical data
- OpenWeatherMap API for real-time weather integration
- Scientific community for Bayesian machine learning research

## 📞 Support

For support, email adityajkate@example.com or create an issue in the GitHub repository.

---

**⚡ Quick Start**: Run `pip install -r requirements.txt && python Backend/run_api.py` for backend, then `cd flood-frontend && npm install && npm start` for frontend.