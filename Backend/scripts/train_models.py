"""
Training script for flood prediction models
Run this script to train all three models and save them
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.flood_prediction_models import FloodPredictionSystem
import pandas as pd


def main():
    """Main training function"""
    print("=== MUMBAI FLOOD PREDICTION MODEL TRAINING ===")
    
    # Check if dataset exists
    dataset_path = "Backend/Dataset/enriched_flood_dataset.csv"
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        print("Please ensure the dataset is available before training.")
        return
    
    try:
        # Initialize the flood prediction system
        print("Initializing flood prediction system...")
        system = FloodPredictionSystem(dataset_path)
        
        # Train all models
        print("Starting training process...")
        system.train_all_models()
        
        # Save trained models
        print("Saving trained models...")
        system.save_models()
        
        print("\n=== TRAINING COMPLETED SUCCESSFULLY ===")
        
        # Test with sample prediction
        print("\n=== TESTING WITH SAMPLE PREDICTION ===")
        sample_weather = {
            'Rainfall_mm': 25.5,
            'Rainfall_24hr': 45.2,
            'Tide_Level_m': 3.2,
            'Temperature_C': 28.5,
            'Humidity_%': 85.0,
            'Wind_Speed_kmh': 15.3,
            'season': 'Monsoon'
        }
        
        prediction = system.predict_flood_risk(sample_weather, 'A')
        print("Sample prediction for Ward A:")
        print(f"- Ward Risk Zone: {prediction['ward_risk_zone']}")
        print(f"- Random Forest Risk Level: {prediction['random_forest']['flood_risk_level']}")
        print(f"- Will Flood: {prediction['random_forest']['will_flood']}")
        print(f"- Bayesian Probability: {prediction['bayesian_probability']:.3f}")
        print(f"- High Risk Assessment: {prediction['combined_assessment']['high_risk']}")
        
        # Display ward clusters
        print("\n=== WARD CLUSTERING RESULTS ===")
        ward_clusters = system.clustering_model.get_all_ward_clusters()
        cluster_summary = ward_clusters.groupby('risk_zone').size()
        print("Ward distribution by risk zone:")
        for risk_zone, count in cluster_summary.items():
            print(f"- {risk_zone}: {count} wards")
        
        print("\nSample wards by cluster:")
        for risk_zone in cluster_summary.index:
            sample_wards = ward_clusters[ward_clusters['risk_zone'] == risk_zone].head(3)
            ward_names = ", ".join([f"{row['Ward']} ({row['Ward_Name']})" for _, row in sample_wards.iterrows()])
            print(f"- {risk_zone}: {ward_names}")
        
        print("\n=== ALL MODELS READY FOR PRODUCTION ===")
        
    except Exception as e:
        print(f"Error during training: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()