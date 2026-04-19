from __future__ import annotations

import json
import mimetypes
import secrets
from datetime import UTC, datetime
from pathlib import Path
from wsgiref.simple_server import make_server

from form_content import CONTENT, REQUIRED_GENERAL_FIELDS, REQUIRED_LIKERT_CODES


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data" / "questionnaire"
STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/style.css": "style.css",
    "/app.js": "app.js",
}
DOWNLOAD_FILES = {
    "/downloads/survey/docx": "survey_cntpp_latest.docx",
    "/downloads/survey/md": "survey_cntpp_latest.md",
    "/downloads/interview/docx": "interview_guide_cntpp_reworked_aligned_scope.docx",
    "/downloads/interview/md": "interview_guide_cntpp_reworked_aligned_scope.md",
}


def json_response(start_response, payload: dict, status: str = "200 OK") -> list[bytes]:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
    ]
    start_response(status, headers)
    return [body]


def file_response(start_response, path: Path) -> list[bytes]:
    if not path.exists():
      return not_found(start_response)
    body = path.read_bytes()
    mime_type, _ = mimetypes.guess_type(path.name)
    headers = [
        ("Content-Type", mime_type or "application/octet-stream"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store"),
    ]
    start_response("200 OK", headers)
    return [body]


def not_found(start_response) -> list[bytes]:
    return json_response(start_response, {"error": "Not found"}, "404 Not Found")


def bad_request(start_response, message: str) -> list[bytes]:
    return json_response(start_response, {"error": message}, "400 Bad Request")


def read_json_body(environ) -> dict:
    try:
        content_length = int(environ.get("CONTENT_LENGTH") or "0")
    except ValueError:
        content_length = 0
    raw = environ["wsgi.input"].read(content_length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def load_saved_questionnaires() -> list[dict]:
    if not DATA_DIR.exists():
        return []
    records = []
    for file_path in sorted(DATA_DIR.glob("resp_*.json")):
        try:
            records.append(json.loads(file_path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return records


def validate_submission(payload: dict) -> str:
    general = payload.get("general")
    answers = payload.get("answers")
    if not isinstance(general, dict) or not isinstance(answers, dict):
        return "صيغة البيانات المرسلة غير صحيحة."

    for field_code in REQUIRED_GENERAL_FIELDS:
        value = general.get(field_code)
        if field_code == "stakeholder_categories":
            if not isinstance(value, list) or not value:
                return "يرجى استكمال البيانات العامة المطلوبة."
            continue
        if not value:
            return "يرجى استكمال البيانات العامة المطلوبة."

    for question_code in REQUIRED_LIKERT_CODES:
        if not answers.get(question_code):
            return "يرجى الإجابة عن جميع بنود ليكرت."

    return ""


def save_submission(payload: dict) -> str:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    token = secrets.token_hex(4)
    submission_id = f"resp_{stamp}_{token}"
    record = {
        "submission_id": submission_id,
        "saved_at_utc": datetime.now(UTC).isoformat(),
        **payload,
    }
    (DATA_DIR / f"{submission_id}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return submission_id


def application(environ, start_response):
    path = environ.get("PATH_INFO", "/")
    method = environ.get("REQUEST_METHOD", "GET").upper()

    if method == "GET" and path in STATIC_FILES:
        return file_response(start_response, ROOT / STATIC_FILES[path])

    if method == "GET" and path in DOWNLOAD_FILES:
        return file_response(start_response, ROOT / DOWNLOAD_FILES[path])

    if method == "GET" and path == "/api/content":
        return json_response(start_response, CONTENT)

    if method == "GET" and path == "/healthz":
        payload = {
            "status": "ok",
            "survey_version": CONTENT["survey"]["version"],
            "interview_version": CONTENT["interview"]["version"],
        }
        return json_response(start_response, payload)

    if method == "GET" and path == "/api/health":
        payload = {
            "success": True,
            "study": CONTENT["meta"]["study_label"],
            "survey_version": CONTENT["survey"]["version"],
            "interview_version": CONTENT["interview"]["version"],
        }
        return json_response(start_response, payload)

    if method == "GET" and path == "/api/get_surveys":
        payload = {
            "success": True,
            "questionnaire": load_saved_questionnaires(),
            "interviews": [],
        }
        return json_response(start_response, payload)

    if method == "POST" and path == "/api/submit-survey":
        try:
            payload = read_json_body(environ)
        except json.JSONDecodeError:
            return bad_request(start_response, "تعذر قراءة البيانات المرسلة.")

        error = validate_submission(payload)
        if error:
            return bad_request(start_response, error)

        submission_id = save_submission(payload)
        return json_response(
            start_response,
            {"ok": True, "submission_id": submission_id},
            "201 Created",
        )

    if method == "POST" and path == "/api/save_survey":
        try:
            wrapped = read_json_body(environ)
        except json.JSONDecodeError:
            return bad_request(start_response, "تعذر قراءة البيانات المرسلة.")

        payload = wrapped.get("payload") if isinstance(wrapped, dict) else None
        if not isinstance(payload, dict):
            return bad_request(start_response, "صيغة البيانات المرسلة غير صحيحة.")

        payload.setdefault("study", CONTENT["meta"]["study_label"])
        payload.setdefault("survey_version", CONTENT["survey"]["version"])
        payload.setdefault("interview_version", CONTENT["interview"]["version"])
        payload.setdefault("submitted_from", "legacy-client")

        if "general" not in payload or "answers" not in payload:
            general = {}
            answers = {}
            open_response = payload.get("open_feedback", "")
            for field_code in REQUIRED_GENERAL_FIELDS:
                general[field_code] = payload.get(field_code, [])
            for question_code in REQUIRED_LIKERT_CODES:
                answers[question_code] = payload.get(question_code, "")
            payload = {
                **payload,
                "general": general,
                "answers": answers,
                "open_response": open_response,
            }

        error = validate_submission(payload)
        if error:
            return bad_request(start_response, error)

        submission_id = save_submission(payload)
        return json_response(
            start_response,
            {
                "success": True,
                "message": "Survey saved successfully",
                "submission_id": submission_id,
                "storage": "local",
            },
        )

    return not_found(start_response)


app = application


if __name__ == "__main__":
    port = 8000
    print(f"Serving on http://127.0.0.1:{port}")
    with make_server("127.0.0.1", port, application) as server:
        server.serve_forever()
