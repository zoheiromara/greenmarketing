import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from supabase import create_client

load_dotenv()

STUDY_CODE = "cntpp_green_marketing_2026"
QUESTIONNAIRE_TYPE = "cntpp_questionnaire"

APP_ROOT = Path(__file__).resolve().parent
DATA_ROOT = APP_ROOT / "data"
QUESTIONNAIRE_DIR = DATA_ROOT / "questionnaire"
INTERVIEW_DIR = DATA_ROOT / "interviews"

for directory in (QUESTIONNAIRE_DIR, INTERVIEW_DIR):
    directory.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_url_path="", static_folder=str(APP_ROOT))

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ppnumoljvvpwtjmsbbuc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_5Lr6I1qsN0B5hMqBM6cHWQ_bcf8oE1g")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as exc:
        print(f"Supabase initialization failed: {exc}")


def _write_local_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_local_collection(directory: Path) -> list[dict]:
    records = []
    for file_path in sorted(directory.glob("*.json")):
        try:
            records.append(json.loads(file_path.read_text(encoding="utf-8")))
        except Exception as exc:
            print(f"Failed to read {file_path}: {exc}")
    return records


def _merge_records(*collections: list[dict]) -> list[dict]:
    merged = {}
    for collection in collections:
        for record in collection:
            record_id = record.get("id")
            if record_id:
                merged[record_id] = record
    return list(merged.values())


def _save_questionnaire_local(payload: dict) -> None:
    _write_local_json(QUESTIONNAIRE_DIR / f"{payload['id']}.json", payload)


def _save_interview_local(payload: dict) -> None:
    _write_local_json(INTERVIEW_DIR / f"{payload['id']}.json", payload)


def _save_questionnaire_remote(payload: dict) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not available")

    supabase.table("surveys").upsert({
        "id": payload["id"],
        "type": QUESTIONNAIRE_TYPE,
        "payload": payload
    }).execute()


def _save_interview_remote(payload: dict) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not available")

    supabase.table("interviews").upsert({
        "id": payload["id"],
        "payload": payload
    }).execute()


def _load_questionnaires() -> list[dict]:
    local_records = _read_local_collection(QUESTIONNAIRE_DIR)
    remote_records = []

    if supabase is not None:
        try:
            response = supabase.table("surveys").select("*").eq("type", QUESTIONNAIRE_TYPE).execute()
            remote_records = [
                row["payload"] for row in (response.data or [])
                if isinstance(row.get("payload"), dict) and row["payload"].get("study") == STUDY_CODE
            ]
        except Exception as exc:
            print(f"Supabase questionnaire fetch failed: {exc}")

    return _merge_records(local_records, remote_records)


def _load_interviews() -> list[dict]:
    local_records = _read_local_collection(INTERVIEW_DIR)
    remote_records = []

    if supabase is not None:
        try:
            response = supabase.table("interviews").select("*").execute()
            remote_records = [
                row["payload"] for row in (response.data or [])
                if isinstance(row.get("payload"), dict) and row["payload"].get("study") == STUDY_CODE
            ]
        except Exception as exc:
            print(f"Supabase interview fetch failed: {exc}")

    return _merge_records(local_records, remote_records)


@app.route("/")
def serve_index():
    return send_from_directory(str(APP_ROOT), "index.html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "study": STUDY_CODE,
        "supabase_enabled": supabase is not None
    }), 200


@app.route("/api/save_survey", methods=["POST"])
def save_survey():
    try:
        data = request.get_json(silent=True) or {}
        payload = data.get("payload")
        survey_type = data.get("type")

        if survey_type != QUESTIONNAIRE_TYPE or not isinstance(payload, dict):
            return jsonify({"error": "Invalid survey payload"}), 400

        payload.setdefault("id", str(uuid.uuid4()))
        payload["study"] = STUDY_CODE

        remote_saved = False
        try:
            _save_questionnaire_remote(payload)
            remote_saved = True
        except Exception as exc:
            print(f"Remote questionnaire save failed: {exc}")

        _save_questionnaire_local(payload)

        return jsonify({
            "success": True,
            "message": "Questionnaire saved successfully",
            "storage": "supabase+local" if remote_saved else "local"
        }), 200
    except Exception as exc:
        print(f"Questionnaire save error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/save_interview", methods=["POST"])
def save_interview():
    try:
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            return jsonify({"error": "Invalid interview payload"}), 400

        payload.setdefault("id", str(uuid.uuid4()))
        payload["study"] = STUDY_CODE

        remote_saved = False
        try:
            _save_interview_remote(payload)
            remote_saved = True
        except Exception as exc:
            print(f"Remote interview save failed: {exc}")

        _save_interview_local(payload)

        return jsonify({
            "success": True,
            "message": "Interview saved successfully",
            "storage": "supabase+local" if remote_saved else "local"
        }), 200
    except Exception as exc:
        print(f"Interview save error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/get_surveys", methods=["GET"])
def get_surveys():
    try:
        return jsonify({
            "success": True,
            "questionnaire": _load_questionnaires(),
            "interviews": _load_interviews()
        }), 200
    except Exception as exc:
        print(f"Fetch error: {exc}")
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    print("Starting CNTPP survey server on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
