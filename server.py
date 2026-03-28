import json
import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from supabase import create_client

load_dotenv()

STUDY_CODE = "cntpp_green_marketing_2026"
QUESTIONNAIRE_TYPE = "cntpp_questionnaire"

APP_ROOT = Path(__file__).resolve().parent


def _can_write_to_directory(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        try:
            probe.unlink()
        except FileNotFoundError:
            pass
        return True
    except Exception:
        return False


def _resolve_data_root() -> Tuple[Path, str]:
    configured_root = os.getenv("APP_DATA_DIR") or os.getenv("FORM_DATA_DIR")
    candidates = []  # type: List[Tuple[Path, str]]

    if configured_root:
        candidates.append((Path(configured_root).expanduser(), "env"))

    candidates.append((APP_ROOT / "data", "app"))
    candidates.append((Path.home() / ".cntpp_green_marketing" / "data", "home"))

    for candidate, source in candidates:
        if _can_write_to_directory(candidate):
            return candidate, source

    attempted_paths = ", ".join(str(path) for path, _ in candidates)
    raise RuntimeError(f"No writable data directory found. Tried: {attempted_paths}")


DATA_ROOT, DATA_ROOT_SOURCE = _resolve_data_root()
QUESTIONNAIRE_DIR = DATA_ROOT / "questionnaire"
INTERVIEW_DIR = DATA_ROOT / "interviews"
LEGACY_DATA_ROOT = APP_ROOT / "data"
LEGACY_QUESTIONNAIRE_DIR = LEGACY_DATA_ROOT / "questionnaire"
LEGACY_INTERVIEW_DIR = LEGACY_DATA_ROOT / "interviews"

for directory in (QUESTIONNAIRE_DIR, INTERVIEW_DIR):
    directory.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_url_path="", static_folder=str(APP_ROOT))
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ppnumoljvvpwtjmsbbuc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_5Lr6I1qsN0B5hMqBM6cHWQ_bcf8oE1g")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as exc:
        print(f"Supabase initialization failed: {exc}")


def _write_local_json(path: Path, payload: Dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_local_collection(directory: Path) -> List[Dict]:
    records = []
    if not directory.exists():
        return records
    for file_path in sorted(directory.glob("*.json")):
        try:
            records.append(json.loads(file_path.read_text(encoding="utf-8")))
        except Exception as exc:
            print(f"Failed to read {file_path}: {exc}")
    return records


def _merge_records(*collections: List[Dict]) -> List[Dict]:
    merged = {}
    for collection in collections:
        for record in collection:
            record_id = record.get("id")
            if record_id:
                merged[record_id] = record
    return list(merged.values())


def _save_questionnaire_local(payload: Dict) -> None:
    _write_local_json(QUESTIONNAIRE_DIR / f"{payload['id']}.json", payload)


def _save_interview_local(payload: Dict) -> None:
    _write_local_json(INTERVIEW_DIR / f"{payload['id']}.json", payload)


def _storage_status() -> Dict:
    return {
        "data_root": str(DATA_ROOT),
        "data_root_source": DATA_ROOT_SOURCE,
        "questionnaire_dir": str(QUESTIONNAIRE_DIR),
        "interview_dir": str(INTERVIEW_DIR),
        "data_root_writable": _can_write_to_directory(DATA_ROOT),
        "legacy_data_root": str(LEGACY_DATA_ROOT),
        "legacy_data_root_loaded": LEGACY_DATA_ROOT != DATA_ROOT and LEGACY_DATA_ROOT.exists()
    }


def _build_save_response(
    *,
    kind: str,
    local_saved: bool,
    remote_saved: bool,
    local_error: Optional[str] = None,
    remote_error: Optional[str] = None,
):
    if not local_saved and not remote_saved:
        return jsonify({
            "success": False,
            "error": f"Failed to save {kind}",
            "details": {
                "local_error": local_error,
                "remote_error": remote_error,
                "storage": _storage_status()
            }
        }), 500

    storage_targets = []
    warnings = []

    if remote_saved:
        storage_targets.append("supabase")
    elif remote_error:
        warnings.append(f"Remote save failed: {remote_error}")

    if local_saved:
        storage_targets.append("local")
    elif local_error:
        warnings.append(f"Local save failed: {local_error}")

    response_payload = {
        "success": True,
        "message": f"{kind.title()} saved successfully",
        "storage": "+".join(storage_targets),
        "storage_details": _storage_status()
    }

    if warnings:
        response_payload["warnings"] = warnings

    return jsonify(response_payload), 200


def _save_questionnaire_remote(payload: Dict) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not available")

    supabase.table("surveys").upsert({
        "id": payload["id"],
        "type": QUESTIONNAIRE_TYPE,
        "payload": payload
    }).execute()


def _save_interview_remote(payload: Dict) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not available")

    supabase.table("interviews").upsert({
        "id": payload["id"],
        "payload": payload
    }).execute()


def _load_local_records(primary_directory: Path, legacy_directory: Path) -> List[Dict]:
    collections = [_read_local_collection(primary_directory)]
    if legacy_directory != primary_directory:
        collections.append(_read_local_collection(legacy_directory))
    return _merge_records(*collections)


def _load_questionnaires() -> List[Dict]:
    local_records = _load_local_records(QUESTIONNAIRE_DIR, LEGACY_QUESTIONNAIRE_DIR)
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


def _load_interviews() -> List[Dict]:
    local_records = _load_local_records(INTERVIEW_DIR, LEGACY_INTERVIEW_DIR)
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


@app.after_request
def add_cache_headers(response):
    cache_sensitive_suffixes = (".html", ".js", ".css")
    if request.path == "/" or request.path.endswith(cache_sensitive_suffixes):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "study": STUDY_CODE,
        "supabase_enabled": supabase is not None,
        "storage": _storage_status()
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
        remote_error = None
        try:
            _save_questionnaire_remote(payload)
            remote_saved = True
        except Exception as exc:
            remote_error = str(exc)
            print(f"Remote questionnaire save failed: {exc}")

        local_saved = False
        local_error = None
        try:
            _save_questionnaire_local(payload)
            local_saved = True
        except Exception as exc:
            local_error = str(exc)
            print(f"Local questionnaire save failed: {exc}")

        return _build_save_response(
            kind="questionnaire",
            local_saved=local_saved,
            remote_saved=remote_saved,
            local_error=local_error,
            remote_error=remote_error,
        )
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
        remote_error = None
        try:
            _save_interview_remote(payload)
            remote_saved = True
        except Exception as exc:
            remote_error = str(exc)
            print(f"Remote interview save failed: {exc}")

        local_saved = False
        local_error = None
        try:
            _save_interview_local(payload)
            local_saved = True
        except Exception as exc:
            local_error = str(exc)
            print(f"Local interview save failed: {exc}")

        return _build_save_response(
            kind="interview",
            local_saved=local_saved,
            remote_saved=remote_saved,
            local_error=local_error,
            remote_error=remote_error,
        )
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
