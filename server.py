import os
import json
import uuid
from flask import Flask, request, jsonify, send_from_directory
from supabase import create_client, Client

app = Flask(__name__, static_url_path='', static_folder='.')

# Supabase Credentials
SUPABASE_URL = "https://ppnumoljvvpwtjmsbbuc.supabase.co"
SUPABASE_KEY = "sb_publishable_5Lr6I1qsN0B5hMqBM6cHWQ_bcf8oE1g" # NOTE: Using Service Role Key is recommended for server-side
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

        # Save to Supabase
        response = supabase.table('interviews').upsert({
            'id': interview_id,
            'payload': data
        }).execute()

        return jsonify({'success': True, 'message': 'Interview saved to Supabase'}), 200

    except Exception as e:
        print(f"Supabase error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_survey', methods=['POST'])
def save_survey():
    try:
        data = request.json
        if not data or 'type' not in data or 'payload' not in data:
            return jsonify({'error': 'Invalid data format'}), 400
            
        survey_type = data['type'] 
        payload = data['payload']
        
        if 'id' not in payload:
            payload['id'] = str(uuid.uuid4())
            
        # Save to Supabase (Unified surveys table)
        response = supabase.table('surveys').upsert({
            'id': payload['id'],
            'type': survey_type,
            'payload': payload
        }).execute()
            
        return jsonify({'success': True, 'message': f'Survey ({survey_type}) saved to Supabase'}), 200
        
    except Exception as e:
        print(f"Supabase error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_surveys', methods=['GET'])
def get_surveys():
    try:
        # Fetch all surveys
        surveys_resp = supabase.table('surveys').select('*').execute()
        interviews_resp = supabase.table('interviews').select('*').execute()

        all_surveys = surveys_resp.data
        all_interviews = interviews_resp.data

        # Separate by type for the frontend
        citizens = [s['payload'] for s in all_surveys if s['type'] == 'customer']
        employees = [s['payload'] for s in all_surveys if s['type'] == 'employee']
        
        # Merge interviews into employee data if needed, or keep separate
        # The frontend expects 'employee' to contains interview-like data too? 
        # Actually, interviews are a separate kind of entity.
        
        return jsonify({
            'success': True,
            'customer': citizens,
            'employee': employees,
            'interviews': [i['payload'] for i in all_interviews]
        }), 200

    except Exception as e:
        print(f"Supabase error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Virgin Earth Supabase-Backed Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
