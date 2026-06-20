"""
ml_engine/dataset_loader.py — HUST Bearing Dataset Loader
Reads raw .mat vibration data, extracts features, and returns X (features) and y (labels).
"""

import os
import glob
import numpy as np
import scipy.io as sio
import logging
from scipy.stats import skew, kurtosis

logger = logging.getLogger("forge.ml.dataset")

DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "HUST_bearing")

def get_hust_normal_rms_mean(mat_files):
    """Computes a quick, robust mean RMS across normal files to calibrate scaling."""
    normal_files = [f for f in mat_files if os.path.basename(f).lower().startswith('n')]
    if not normal_files:
        return 0.21
    rms_list = []
    for f in normal_files[:2]:
        try:
            mat_data = sio.loadmat(f)
            signal_key = next(key for key in mat_data.keys() if not key.startswith('__'))
            signal = mat_data[signal_key]
            if len(signal.shape) > 1:
                signal = signal[:, 0]
            # Fast RMS on a subset of samples
            rms_list.append(np.sqrt(np.mean(signal[:100000]**2)))
        except Exception:
            pass
    return np.mean(rms_list) if rms_list else 0.21

def extract_features(signal, window_size=5120, profile=None, raw_vib_mean=0.21):
    """
    Extracts time-domain features from a raw vibration signal.
    HUST bearing dataset has a sample rate of 51,200 Hz.
    We'll split the signal into chunks of `window_size` and extract features.
    """
    features = []
    # If signal is 2D, take the first column (assuming single axis vibration)
    if len(signal.shape) > 1:
        signal = signal[:, 0]
        
    num_windows = len(signal) // window_size
    for i in range(num_windows):
        window = signal[i*window_size : (i+1)*window_size]
        
        # Calculate only what is actually used (RMS)
        rms = np.sqrt(np.mean(window**2))
        
        if profile:
            # Calculate time t for this window (10Hz simulated interval)
            t = i * 0.1
            from simulator.physics_math import synthesize_sensor, harmonic_oscillation
            
            # Synthesize RPM, Temperature, and Current using the exact physics core
            rpm_scaled = synthesize_sensor(t, profile, "rpm", phase_offset=0.0)
            temp_scaled = synthesize_sensor(t, profile, "temperature", phase_offset=1.1)
            curr_scaled = synthesize_sensor(t, profile, "current", phase_offset=0.7)
            
            # Combine real HUST vibration dynamics with machine oscillation and simulator noise
            vib_cfg = profile["vibration"]
            vib_base = vib_cfg["baseline"]
            hust_ratio = rms / raw_vib_mean if raw_vib_mean > 0 else 1.0
            
            # Oscillation component around 0
            osc = harmonic_oscillation(t, 0.0, vib_cfg["oscillation_amplitude"], vib_cfg["oscillation_frequency"], phase_offset=2.3)
            # Combine baseline + oscillation + HUST fluctuations + profile noise
            noise = np.random.normal(0, vib_cfg["noise_std"])
            rms_scaled = (vib_base + osc) * hust_ratio + noise
            rms_scaled = np.clip(rms_scaled, vib_cfg["min"], vib_cfg["max"] * 1.5)
        else:
            # Fallback legacy default simulation logic
            rms_scaled = rms
            temp_scaled = 40.0 + rms * 10.0 + np.random.normal(0, 1.0)
            rpm_scaled = 3000.0 + np.random.normal(0, 50.0)
            curr_scaled = 5.0 + rms * 2.0 + np.random.normal(0, 0.5)
        
        features.append([
            rpm_scaled, 
            temp_scaled, 
            rms_scaled, 
            curr_scaled
        ])
        
    return np.array(features)

def load_hust_data(is_anomaly_detection=True, profile=None, limit_files=5):
    """
    Loads the HUST bearing dataset.
    For Anomaly Detection (Isolation Forest), we only need the Normal bearing data for training.
    Normal files in bearing datasets usually have 'Normal' or 'N' in the filename.
    """
    if not os.path.exists(DATASET_DIR) or not os.listdir(DATASET_DIR):
        logger.warning(f"HUST Bearing dataset not found at {DATASET_DIR}.")
        logger.warning("Please download the dataset from https://data.mendeley.com/datasets/cbv7jyx4p9/3")
        logger.warning("and extract the .mat files into the backend/data/HUST_bearing/ folder.")
        logger.warning("Using fallback simulated normal data for training...")
        return _generate_fallback_data(profile)

    all_features = []
    
    # Read all .mat files in the directory
    mat_files = glob.glob(os.path.join(DATASET_DIR, "*.mat"))
    if not mat_files:
        logger.warning("No .mat files found in the dataset directory. Using fallback data...")
        return _generate_fallback_data(profile)
        
    logger.info(f"Found {len(mat_files)} .mat files. Calibrating vibration baseline...")
    raw_vib_mean = get_hust_normal_rms_mean(mat_files)
    logger.info(f"Calibrated HUST normal vibration RMS mean: {raw_vib_mean:.4f}")
    
    # Process files
    processed_count = 0
    for file_path in mat_files:
        filename = os.path.basename(file_path).lower()
        
        # If we are doing anomaly detection, we only train on Normal data.
        if is_anomaly_detection and not (filename.startswith('n') or 'normal' in filename or 'baseline' in filename):
            continue
            
        try:
            mat_data = sio.loadmat(file_path)
            signal_key = next(key for key in mat_data.keys() if not key.startswith('__'))
            signal = mat_data[signal_key]
            
            file_features = extract_features(signal, profile=profile, raw_vib_mean=raw_vib_mean)
            all_features.append(file_features)
            processed_count += 1
            if limit_files and processed_count >= limit_files:
                logger.info(f"Reached file processing limit ({limit_files}). Halting loader for speed.")
                break
        except Exception as e:
            logger.error(f"Error processing {filename}: {e}")
            
    if not all_features:
        logger.warning("Could not extract any normal data from the dataset. Using fallback...")
        return _generate_fallback_data(profile)
        
    X = np.vstack(all_features)
    logger.info(f"Dataset loaded successfully. Extracted {X.shape[0]} normal samples scaled to profile.")
    return X

def _generate_fallback_data(profile=None):
    """Generates synthetic normal telemetry if the real dataset is missing, scaled to profile."""
    features = []
    
    rpm_base = profile["rpm"]["baseline"] if profile else 3000
    rpm_noise = profile["rpm"]["noise_std"] if profile else 50
    
    temp_base = profile["temperature"]["baseline"] if profile else 45
    temp_noise = profile["temperature"]["noise_std"] if profile else 2
    
    vib_base = profile["vibration"]["baseline"] if profile else 1.2
    vib_noise = profile["vibration"]["noise_std"] if profile else 0.2
    
    curr_base = profile["current"]["baseline"] if profile else 6.5
    curr_noise = profile["current"]["noise_std"] if profile else 0.4
    
    for _ in range(1000):
        rpm = np.random.normal(rpm_base, rpm_noise)
        temp = np.random.normal(temp_base, temp_noise)
        vib = np.random.normal(vib_base, vib_noise)
        curr = np.random.normal(curr_base, curr_noise)
        features.append([rpm, temp, vib, curr])
    return np.array(features)
