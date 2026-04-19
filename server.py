from __future__ import annotations

import json
import mimetypes
import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import unquote
from wsgiref.simple_server import make_server

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args, **_kwargs):
        return False

try:
    from supabase import create_client
except ImportError:
    create_client = None

from form_content import CONTENT, REQUIRED_GENERAL_FIELDS, REQUIRED_LIKERT_CODES

load_dotenv()

STUDY_CODE = CONTENT["meta"]["study_label"]
QUESTIONNAIRE_TYPE = "cntpp_questionnaire"
APP_ROOT = Path(__file__).resolve().parent
DOWNLOADS = {
    ("survey", "docx"): "survey_cntpp_latest.docx",
    ("survey", "md"): "survey_cntpp_latest.md",
    ("interview", "docx"): "interview_guide_cntpp_reworked_aligned_scope.docx",
    ("interview", "md"): "interview_guide_cntpp_reworked_aligned_scope.md",
}
STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/style.css": "style.css",
    "/app.js": "app.js",
    "/background.js": "background.js",
    "/recorder.js": "recorder.js",
}
INTERVIEW_METADATA_FIELDS = [
    "interviewee_code",
    "job_title",
    "department",
    "years_experience",
    "responsibility_scope",
    "interview_location",
]


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
    candidates: List[Tuple[Path, str]] = []

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

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = None
if create_client is None:
    print("Supabase package is not installed; remote storage disabled.")
elif SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as exc:
        print(f"Supabase initialization failed: {exc}")
else:
    print("Supabase credentials are not configured; remote storage disabled.")


def json_response(start_response, payload: Dict, status: str = "200 OK") -> List[bytes]:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"),
        ("Pragma", "no-cache"),
        ("Expires", "0"),
    ]
    start_response(status, headers)
    return [body]


def file_response(start_response, path: Path, download: bool = False) -> List[bytes]:
    if not path.exists() or not path.is_file():
        return json_response(start_response, {"error": "Not found"}, "404 Not Found")

    body = path.read_bytes()
    mime_type, _ = mimetypes.guess_type(path.name)
    headers = [
        ("Content-Type", mime_type or "application/octet-stream"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"),
    ]
    if download:
        headers.append(("Content-Disposition", f'attachment; filename="{path.name}"'))
    start_response("200 OK", headers)
    return [body]


def read_json_body(environ) -> Dict:
    try:
        content_length = int(environ.get("CONTENT_LENGTH") or "0")
    except ValueError:
        content_length = 0

    raw = environ["wsgi.input"].read(content_length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def _write_local_json(path: Path, payload: Dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_local_collection(directory: Path) -> List[Dict]:
    records: List[Dict] = []
    if not directory.exists():
        return records

    for file_path in sorted(directory.glob("*.json")):
        try:
            records.append(json.loads(file_path.read_text(encoding="utf-8")))
        except Exception as exc:
            print(f"Failed to read {file_path}: {exc}")
    return records


def _merge_records(*collections: List[Dict]) -> List[Dict]:
    merged: Dict[str, Dict] = {}
    for collection in collections:
        for record in collection:
            record_id = record.get("id") or record.get("submission_id")
            if record_id:
                merged[str(record_id)] = record
    return list(merged.values())


def _storage_status() -> Dict:
    return {
        "data_root": str(DATA_ROOT),
        "data_root_source": DATA_ROOT_SOURCE,
        "questionnaire_dir": str(QUESTIONNAIRE_DIR),
        "interview_dir": str(INTERVIEW_DIR),
        "data_root_writable": _can_write_to_directory(DATA_ROOT),
        "legacy_data_root": str(LEGACY_DATA_ROOT),
        "legacy_data_root_loaded": LEGACY_DATA_ROOT != DATA_ROOT and LEGACY_DATA_ROOT.exists(),
        "supabase_enabled": supabase is not None,
    }


def _normalize_required_scalar(value) -> str:
    if isinstance(value, list):
        return value[0] if value else ""
    if value is None:
        return ""
    return str(value).strip()


def _normalize_required_list(value) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    text = str(value).strip()
    return [text] if text else []


def _extract_general_and_answers(payload: Dict) -> Tuple[Dict, Dict]:
    general_source = payload.get("general") if isinstance(payload.get("general"), dict) else payload
    answers_source = payload.get("answers") if isinstance(payload.get("answers"), dict) else payload

    general: Dict = {}
    for field_code in REQUIRED_GENERAL_FIELDS:
        if field_code == "stakeholder_categories":
            general[field_code] = _normalize_required_list(general_source.get(field_code))
        else:
            general[field_code] = _normalize_required_scalar(general_source.get(field_code))

    answers: Dict = {}
    for question_code in REQUIRED_LIKERT_CODES:
        answers[question_code] = _normalize_required_scalar(answers_source.get(question_code))

    return general, answers


def _validate_questionnaire(general: Dict, answers: Dict) -> Optional[str]:
    for field_code in REQUIRED_GENERAL_FIELDS:
        value = general.get(field_code)
        if field_code == "stakeholder_categories":
            if not isinstance(value, list) or not value:
                return "يرجى استكمال البيانات العامة المطلوبة."
            continue
        if not value:
            return "يرجى استكمال البيانات العامة المطلوبة."

    for question_code in REQUIRED_LIKERT_CODES:
        value = answers.get(question_code)
        if value not in {"1", "2", "3", "4", "5"}:
            return "يرجى الإجابة عن جميع بنود ليكرت."

    return None


def _normalize_questionnaire_payload(payload: Dict) -> Dict:
    general, answers = _extract_general_and_answers(payload)
    validation_error = _validate_questionnaire(general, answers)
    if validation_error:
        raise ValueError(validation_error)

    open_code = CONTENT["survey"]["open_question"]["code"]
    open_feedback = (
        payload.get(open_code)
        or payload.get("open_feedback")
        or payload.get("open_response")
        or ""
    )

    normalized = {
        "id": str(payload.get("id") or uuid.uuid4()),
        "timestamp": payload.get("timestamp") or payload.get("saved_at_utc") or payload.get("submitted_at") or "",
        "study": payload.get("study") or STUDY_CODE,
        "survey_version": payload.get("survey_version") or CONTENT["survey"]["version"],
        "interview_version": payload.get("interview_version") or CONTENT["interview"]["version"],
        "submitted_from": payload.get("submitted_from") or "web-client",
        "general": general,
        "answers": answers,
        open_code: str(open_feedback).strip(),
        "open_feedback": str(open_feedback).strip(),
    }

    for field_code, value in general.items():
        normalized[field_code] = value
    for question_code, value in answers.items():
        normalized[question_code] = value

    return normalized


def _normalize_interview_payload(payload: Dict) -> Dict:
    metadata_source = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else payload
    metadata = {
        field: str(metadata_source.get(field) or "").strip()
        for field in INTERVIEW_METADATA_FIELDS
    }

    questions = []
    for index, item in enumerate(payload.get("questions") or []):
        if not isinstance(item, dict):
            continue
        questions.append({
            "id": str(item.get("id") or f"Q{index + 1:02d}"),
            "text": str(item.get("text") or "").strip(),
            "transcript": str(item.get("transcript") or "").strip(),
            "duration": str(item.get("duration") or "00:00").strip(),
        })

    return {
        "id": str(payload.get("id") or uuid.uuid4()),
        "timestamp": payload.get("timestamp") or "",
        "study": payload.get("study") or STUDY_CODE,
        "survey_version": payload.get("survey_version") or CONTENT["survey"]["version"],
        "interview_version": payload.get("interview_version") or CONTENT["interview"]["version"],
        "metadata": metadata,
        "questions": questions,
    }


def _save_questionnaire_local(payload: Dict) -> None:
    _write_local_json(QUESTIONNAIRE_DIR / f"{payload['id']}.json", payload)


def _save_interview_local(payload: Dict) -> None:
    _write_local_json(INTERVIEW_DIR / f"{payload['id']}.json", payload)


def _save_questionnaire_remote(payload: Dict) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not available")

    supabase.table("surveys").upsert({
        "id": payload["id"],
        "type": QUESTIONNAIRE_TYPE,
        "payload": payload,
    }).execute()


def _save_interview_remote(payload: Dict) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not available")

    supabase.table("interviews").upsert({
        "id": payload["id"],
        "payload": payload,
    }).execute()


def _load_local_records(primary_directory: Path, legacy_directory: Path) -> List[Dict]:
    collections = [_read_local_collection(primary_directory)]
    if legacy_directory != primary_directory:
        collections.append(_read_local_collection(legacy_directory))
    return _merge_records(*collections)


def _load_questionnaires() -> List[Dict]:
    local_records = _load_local_records(QUESTIONNAIRE_DIR, LEGACY_QUESTIONNAIRE_DIR)
    remote_records: List[Dict] = []

    if supabase is not None:
        try:
            response = supabase.table("surveys").select("*").eq("type", QUESTIONNAIRE_TYPE).execute()
            remote_records = [
                _normalize_questionnaire_payload(row["payload"])
                for row in (response.data or [])
                if isinstance(row.get("payload"), dict)
            ]
        except Exception as exc:
            print(f"Supabase questionnaire fetch failed: {exc}")

    return _merge_records(local_records, remote_records)


def _load_interviews() -> List[Dict]:
    local_records = _load_local_records(INTERVIEW_DIR, LEGACY_INTERVIEW_DIR)
    remote_records: List[Dict] = []

    if supabase is not None:
        try:
            response = supabase.table("interviews").select("*").execute()
            remote_records = [
                _normalize_interview_payload(row["payload"])
                for row in (response.data or [])
                if isinstance(row.get("payload"), dict)
            ]
        except Exception as exc:
            print(f"Supabase interview fetch failed: {exc}")

    return _merge_records(local_records, remote_records)


def _build_save_payload(kind: str, local_saved: bool, remote_saved: bool, local_error: Optional[str], remote_error: Optional[str]) -> Tuple[Dict, str]:
    if not local_saved and not remote_saved:
        return {
            "success": False,
            "error": f"Failed to save {kind}",
            "details": {
                "local_error": local_error,
                "remote_error": remote_error,
                "storage": _storage_status(),
            },
        }, "500 Internal Server Error"

    storage_targets: List[str] = []
    warnings: List[str] = []

    if remote_saved:
        storage_targets.append("supabase")
    elif remote_error:
        warnings.append(f"Remote save failed: {remote_error}")

    if local_saved:
        storage_targets.append("local")
    elif local_error:
        warnings.append(f"Local save failed: {local_error}")

    payload = {
        "success": True,
        "message": f"{kind.title()} saved successfully",
        "storage": "+".join(storage_targets),
        "storage_details": _storage_status(),
    }
    if warnings:
        payload["warnings"] = warnings
    return payload, "200 OK"


def _handle_save_questionnaire(payload: Dict) -> Tuple[Dict, str]:
    try:
        normalized = _normalize_questionnaire_payload(payload)
    except ValueError as exc:
        return {"error": str(exc)}, "400 Bad Request"

    remote_saved = False
    remote_error = None
    try:
        _save_questionnaire_remote(normalized)
        remote_saved = True
    except Exception as exc:
        remote_error = str(exc)
        print(f"Remote questionnaire save failed: {exc}")

    local_saved = False
    local_error = None
    try:
        _save_questionnaire_local(normalized)
        local_saved = True
    except Exception as exc:
        local_error = str(exc)
        print(f"Local questionnaire save failed: {exc}")

    return _build_save_payload("questionnaire", local_saved, remote_saved, local_error, remote_error)


def _handle_save_interview(payload: Dict) -> Tuple[Dict, str]:
    normalized = _normalize_interview_payload(payload)

    remote_saved = False
    remote_error = None
    try:
        _save_interview_remote(normalized)
        remote_saved = True
    except Exception as exc:
        remote_error = str(exc)
        print(f"Remote interview save failed: {exc}")

    local_saved = False
    local_error = None
    try:
        _save_interview_local(normalized)
        local_saved = True
    except Exception as exc:
        local_error = str(exc)
        print(f"Local interview save failed: {exc}")

    return _build_save_payload("interview", local_saved, remote_saved, local_error, remote_error)


def _resolve_static_path(request_path: str) -> Optional[Path]:
    decoded_path = unquote(request_path)
    if decoded_path in STATIC_FILES:
        candidate = APP_ROOT / STATIC_FILES[decoded_path]
        return candidate if candidate.is_file() else None

    stripped = decoded_path.lstrip("/")
    if not stripped:
        return None

    candidate = (APP_ROOT / stripped).resolve()
    try:
        candidate.relative_to(APP_ROOT)
    except ValueError:
        return None

    if candidate.is_file():
        return candidate
    return None


def application(environ, start_response):
    path = environ.get("PATH_INFO", "/")
    method = environ.get("REQUEST_METHOD", "GET").upper()

    if method == "GET" and path == "/api/content":
        return json_response(start_response, CONTENT)

    if method == "GET" and path == "/api/health":
        return json_response(start_response, {
            "success": True,
            "study": STUDY_CODE,
            "survey_version": CONTENT["survey"]["version"],
            "interview_version": CONTENT["interview"]["version"],
            "storage": _storage_status(),
        })

    if method == "GET" and path == "/healthz":
        return json_response(start_response, {
            "status": "ok",
            "survey_version": CONTENT["survey"]["version"],
            "interview_version": CONTENT["interview"]["version"],
        })

    if method == "GET" and path == "/api/get_surveys":
        return json_response(start_response, {
            "success": True,
            "questionnaire": _load_questionnaires(),
            "interviews": _load_interviews(),
        })

    if method == "POST" and path == "/api/save_survey":
        try:
            wrapped = read_json_body(environ)
        except json.JSONDecodeError:
            return json_response(start_response, {"error": "تعذر قراءة البيانات المرسلة."}, "400 Bad Request")

        payload = wrapped.get("payload") if isinstance(wrapped, dict) else None
        survey_type = wrapped.get("type") if isinstance(wrapped, dict) else None
        if survey_type != QUESTIONNAIRE_TYPE or not isinstance(payload, dict):
            return json_response(start_response, {"error": "Invalid survey payload"}, "400 Bad Request")

        response_payload, status = _handle_save_questionnaire(payload)
        return json_response(start_response, response_payload, status)

    if method == "POST" and path == "/api/submit-survey":
        try:
            payload = read_json_body(environ)
        except json.JSONDecodeError:
            return json_response(start_response, {"error": "تعذر قراءة البيانات المرسلة."}, "400 Bad Request")

        if not isinstance(payload, dict):
            return json_response(start_response, {"error": "Invalid survey payload"}, "400 Bad Request")

        response_payload, status = _handle_save_questionnaire(payload)
        return json_response(start_response, response_payload, status)

    if method == "POST" and path == "/api/save_interview":
        try:
            payload = read_json_body(environ)
        except json.JSONDecodeError:
            return json_response(start_response, {"error": "تعذر قراءة البيانات المرسلة."}, "400 Bad Request")

        if not isinstance(payload, dict):
            return json_response(start_response, {"error": "Invalid interview payload"}, "400 Bad Request")

        response_payload, status = _handle_save_interview(payload)
        return json_response(start_response, response_payload, status)

    if method == "GET" and path.startswith("/downloads/"):
        parts = path.strip("/").split("/")
        if len(parts) == 3:
            filename = DOWNLOADS.get((parts[1], parts[2]))
            if filename:
                return file_response(start_response, APP_ROOT / filename, download=True)
        return json_response(start_response, {"error": "Not found"}, "404 Not Found")

    if method == "GET":
        static_path = _resolve_static_path(path)
        if static_path:
            return file_response(start_response, static_path)

    return json_response(start_response, {"error": "Not found"}, "404 Not Found")


app = application


if __name__ == "__main__":
    port = 8000
    print(f"Serving on http://127.0.0.1:{port}")
    with make_server("127.0.0.1", port, application) as server:
        server.serve_forever()
