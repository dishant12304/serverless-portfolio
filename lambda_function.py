"""
lambda_function.py

Handles POST requests from the portfolio's contact form (via API Gateway).
Validates the payload and writes it to a DynamoDB table.

Expected event body (JSON):
    {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "message": "Hi, I'd like to talk about..."
    }

Environment variables:
    TABLE_NAME   - DynamoDB table to write submissions to (default: "ContactMessages")
    ALLOW_ORIGIN - CORS origin to allow (default: "*", tighten to your domain in production)
"""

import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ.get("TABLE_NAME", "ContactMessages")
ALLOW_ORIGIN = os.environ.get("ALLOW_ORIGIN", "*")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
}


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def _validate(payload: dict) -> str | None:
    """Return an error message if the payload is invalid, else None."""
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip()
    message = payload.get("message", "").strip()

    if not name or len(name) > 100:
        return "Name is required and must be under 100 characters."
    if not email or not EMAIL_RE.match(email):
        return "A valid email address is required."
    if not message or len(message) > 2000:
        return "Message is required and must be under 2000 characters."
    return None


def lambda_handler(event, context):
    # API Gateway sends a preflight OPTIONS request before the real POST
    if event.get("httpMethod") == "OPTIONS":
        return _response(200, {"ok": True})

    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Request body must be valid JSON."})

    error = _validate(payload)
    if error:
        return _response(400, {"error": error})

    item = {
        "id": str(uuid.uuid4()),
        "name": payload["name"].strip(),
        "email": payload["email"].strip(),
        "message": payload["message"].strip(),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        table = dynamodb.Table(TABLE_NAME)
        table.put_item(Item=item)
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the client
        print(f"DynamoDB write failed: {exc}")
        return _response(500, {"error": "Could not store your message. Please try again."})

    return _response(200, {"ok": True, "id": item["id"]})
