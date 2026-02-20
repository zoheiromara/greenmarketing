import os
import json
import base64
import uuid
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_url_path='', static_folder='.')

# Ensure data directories exist
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
INTERVIEWS_DIR = os.path.join(DATA_DIR, 'interviews')
CITIZENS_DIR = os.path.join(DATA_DIR, 'citizens')
EMPLOYEES_DIR = os.path.join(DATA_DIR, 'employees')
AUDIO_DIR = os.path.join(DATA_DIR, 'audio')

os.makedirs(INTERVIEWS_DIR, exist_ok=True)
os.makedirs(CITIZENS_DIR, exist_ok=True)
os.makedirs(EMPLOYEES_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/save_interview', methods=['POST'])
def save_interview():
    try:
        data = request.json
        if not data or 'id' not in data:
            return jsonify({'error': 'Invalid data format'}), 400

        interview_id = data['id']

        json_path = os.path.join(INTERVIEWS_DIR, f"{interview_id}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True, 'message': 'Interview text saved successfully'}), 200

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_survey', methods=['POST'])
def save_survey():
    try:
        data = request.json
        if not data or 'type' not in data or 'payload' not in data:
            return jsonify({'error': 'Invalid data format'}), 400
            
        survey_type = data['type'] # 'customer' (citizen) or 'employee'
        payload = data['payload']
        
        # Ensure ID exists
        if 'id' not in payload:
            payload['id'] = str(uuid.uuid4())
            
        target_dir = CITIZENS_DIR if survey_type == 'customer' else EMPLOYEES_DIR
        
        json_path = os.path.join(target_dir, f"{payload['id']}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            
        return jsonify({'success': True, 'message': f'Survey ({survey_type}) saved successfully'}), 200
        
    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_surveys', methods=['GET'])
def get_surveys():
    try:
        def load_dir(directory):
            results = []
            if os.path.exists(directory):
                for filename in os.listdir(directory):
                    if filename.endswith(".json"):
                        with open(os.path.join(directory, filename), 'r', encoding='utf-8') as f:
                            results.append(json.load(f))
            return results

        citizens = load_dir(CITIZENS_DIR)
        employees = load_dir(EMPLOYEES_DIR)

        return jsonify({
            'success': True,
            'customer': citizens,
            'employee': employees
        }), 200

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Starting Virgin Earth Server on http://localhost:5000")
    print(f"Data will be saved to: {DATA_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=True)
