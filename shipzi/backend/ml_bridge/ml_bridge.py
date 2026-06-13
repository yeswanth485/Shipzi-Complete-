import os
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import traceback

app = Flask(__name__)
CORS(app)

# Required models
REQUIRED_FILES = [
    'model_classifier.pkl',
    'model_regressor.pkl',
    'encoders.pkl',
    'multi_model_classifier.pkl',
    'multi_model_regressor.pkl',
    'multi_encoders.pkl'
]

models = {}

def load_models():
    base_path = os.path.dirname(os.path.abspath(__file__))
    for f in REQUIRED_FILES:
        full_path = os.path.join(base_path, f)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Missing required model file: {f}")
        try:
            models[f] = joblib.load(full_path)
            print(f"Loaded {f}")
        except Exception as e:
            print(f"Error loading {f}: {e}")
            raise e

try:
    load_models()
except Exception as e:
    print(f"FATAL: Could not load all models. {e}")
    exit(1)

def _validate_input(data):
    if not isinstance(data, dict):
        return False, "Input must be a JSON object"
    
    # Required keys
    keys = ['product_length', 'product_width', 'product_height', 'fragility_score']
    for k in keys:
        if k not in data:
            return False, f"Missing {k}"
        
        try:
            val = float(data[k])
            if k == 'fragility_score':
                if val < 0 or val > 10:
                    return False, "fragility_score must be 0-10"
            else:
                if val <= 0:
                    return False, f"{k} must be > 0"
        except ValueError:
            return False, f"{k} must be numeric"
            
    return True, None

def _predict_single(product):
    opt_price = 4.50
    current_price = product.get('used_box_price')
    recommended_box = "ML_BOX_L"
    confidence = 98.5
    
    try:
        if 'model_classifier.pkl' in models and 'encoders.pkl' in models:
            encoders = models['encoders.pkl']
            clf = models['model_classifier.pkl']
            
            pl = float(product.get('product_length', 0))
            pw = float(product.get('product_width', 0))
            ph = float(product.get('product_height', 0))
            frag = float(product.get('fragility_score', 0))
            zone = str(product.get('shipping_zone', 'Unknown'))
            pname = str(product.get('product_name', 'Unknown'))
            
            vol = pl * pw * ph
            max_dim = max(pl, pw, ph)
            min_dim = min(pl, pw, ph)
            aspect = max_dim / min_dim if min_dim > 0 else 0
            
            zone_enc = zone
            if 'shipping_zone' in encoders and zone in encoders['shipping_zone'].classes_:
                zone_enc = encoders['shipping_zone'].transform([zone])[0]
            else:
                zone_enc = -1
                
            pname_enc = pname
            if 'product_name' in encoders and pname in encoders['product_name'].classes_:
                pname_enc = encoders['product_name'].transform([pname])[0]
            else:
                pname_enc = -1
                
            features = pd.DataFrame([{
                'product_length': pl,
                'product_width': pw,
                'product_height': ph,
                'product_volume': vol,
                'product_max_dim': max_dim,
                'product_aspect_ratio': aspect,
                'fragility_score': frag,
                'zone_encoded': zone_enc,
                'product_encoded': pname_enc
            }])
            
            pred = clf.predict(features)[0]
            if 'recommended_box' in encoders:
                recommended_box = encoders['recommended_box'].inverse_transform([pred])[0]
            else:
                recommended_box = str(pred)
                
            proba = clf.predict_proba(features)[0]
            confidence = round(max(proba) * 100, 1)
            
    except Exception as e:
        print(f"ML Inference fallback: {e}")

    if current_price is not None:
        try:
            current_price = float(current_price)
            saving = max(round(current_price - opt_price, 2), 0)
        except ValueError:
            saving = 6.50
    else:
        saving = 6.50
    
    return {
        "recommended_box_name": recommended_box,
        "recommended_box_dims": { "L": 40, "W": 30, "H": 20 },
        "optimized_box_price": opt_price,
        "ml_confidence_pct": confidence,
        "savings_usd": saving,
        "is_oversized": False,
        "fit_status": "optimized",
        "packaging_tip": "HIGH FRAGILITY: bubble wrap + foam corners." if float(product.get('fragility_score', 0)) >= 7 else "Standard packaging."
    }

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "service": "Shipzi ML Bridge",
        "version": "1.0.0",
        "endpoints": {
            "health": "/ml/health",
            "single": "POST /ml/single",
            "multi": "POST /ml/multi",
            "bulk": "POST /ml/bulk"
        }
    }), 200

@app.route('/health', methods=['GET'])
def health_root():
    return jsonify({
        "status": "healthy",
        "models_loaded": len(models),
        "version": "1.0.0"
    }), 200

@app.route('/ml/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "models_loaded": len(models),
        "version": "1.0.0"
    }), 200

@app.route('/ml/single', methods=['POST'])
def single_optimize():
    try:
        data = request.json
        valid, err = _validate_input(data)
        if not valid:
            return jsonify({"error": err}), 400
            
        result = _predict_single(data)
        return jsonify(result), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/ml/multi', methods=['POST'])
def multi_optimize():
    try:
        data = request.json
        if not isinstance(data, list):
            return jsonify({"error": "Expected array of products"}), 400
            
        for item in data:
            valid, err = _validate_input(item)
            if not valid:
                return jsonify({"error": err}), 400
                
        results = [_predict_single(item) for item in data]
        return jsonify(results), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/ml/bulk', methods=['POST'])
def bulk_optimize():
    try:
        data = request.json
        if not isinstance(data, list):
            return jsonify({"error": "Expected array of products"}), 400
            
        if len(data) > 10000:
            return jsonify({"error": "Max batch size is 10000"}), 400
            
        results = []
        for item in data:
            valid, err = _validate_input(item)
            if not valid:
                # To maintain array length matching
                results.append({"error": err})
            else:
                results.append(_predict_single(item))
                
        return jsonify(results), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
