#!/usr/bin/env python3
"""
Dump Neon/Postgres with pg_dump, gzip, upload to OneDrive (Microsoft 365) via Graph API.

Requires an Azure AD app registration with application permission Microsoft Graph
Files.ReadWrite.All (admin consent). Uploads go to the target user's OneDrive.

Environment:
  DATABASE_URL          PostgreSQL connection string (e.g. Neon)
  AZURE_TENANT_ID       Directory (tenant) ID
  AZURE_CLIENT_ID       Application (client) ID
  AZURE_CLIENT_SECRET   Client secret value
  ONEDRIVE_USER_UPN     Target user principal name (e.g. backup@yourcompany.com)
Optional:
  ONEDRIVE_FOLDER       Folder path under drive root (default: NeonBackups/teamvoc-updates)
  PG_DUMP_BIN           Path to pg_dump if the default on PATH is too old (e.g. …/postgresql/17/bin/pg_dump)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

GRAPH = "https://graph.microsoft.com/v1.0"
TOKEN_URL_TEMPLATE = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
# Simple upload max size (Graph); larger files use upload session
SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024
CHUNK_SIZE = 5 * 1024 * 1024


def _require(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return v


def get_access_token(tenant: str, client_id: str, client_secret: str) -> str:
    url = TOKEN_URL_TEMPLATE.format(tenant=urllib.parse.quote(tenant))
    body = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }
    ).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"Token request failed: {e.code} {e.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        sys.exit(1)
    token = data.get("access_token")
    if not token:
        print(f"Token response missing access_token: {data}", file=sys.stderr)
        sys.exit(1)
    return token


def _graph_put(url: str, token: str, body: bytes, content_type: str) -> None:
    req = urllib.request.Request(url, data=body, method="PUT")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"PUT failed: {e.code} {err}", file=sys.stderr)
        sys.exit(1)


def _graph_post_json(url: str, token: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"POST failed: {e.code} {err}", file=sys.stderr)
        sys.exit(1)


def _graph_put_raw(url: str, body: bytes, headers: dict[str, str]) -> None:
    req = urllib.request.Request(url, data=body, method="PUT")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=300) as resp:
        resp.read()


def graph_path_url(user_upn: str, remote_path: str, suffix: str) -> str:
    """Build .../users/{upn}/drive/root:/encodedPath:/suffix"""
    user_enc = urllib.parse.quote(user_upn, safe="")
    path_enc = urllib.parse.quote(remote_path, safe="")
    return f"{GRAPH}/users/{user_enc}/drive/root:/{path_enc}:/{suffix}"


def upload_simple(token: str, user_upn: str, remote_path: str, file_path: str) -> None:
    with open(file_path, "rb") as f:
        body = f.read()
    url = graph_path_url(user_upn, remote_path, "content")
    _graph_put(url, token, body, "application/octet-stream")


def upload_session(token: str, user_upn: str, remote_path: str, file_path: str) -> None:
    url = graph_path_url(user_upn, remote_path, "createUploadSession")
    session = _graph_post_json(
        url,
        token,
        {"item": {"@microsoft.graph.conflictBehavior": "replace"}},
    )
    upload_url = session.get("uploadUrl")
    if not upload_url:
        print(f"createUploadSession missing uploadUrl: {session}", file=sys.stderr)
        sys.exit(1)

    size = os.path.getsize(file_path)
    sent = 0
    with open(file_path, "rb") as f:
        while sent < size:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            chunk_len = len(chunk)
            end = sent + chunk_len - 1
            headers = {
                "Content-Length": str(chunk_len),
                "Content-Range": f"bytes {sent}-{end}/{size}",
            }
            try:
                _graph_put_raw(upload_url, chunk, headers)
            except urllib.error.HTTPError as e:
                err = e.read().decode("utf-8", errors="replace")
                print(f"Chunk upload failed: {e.code} {err}", file=sys.stderr)
                sys.exit(1)
            sent += chunk_len


def run_pg_dump(db_url: str, out_path: str) -> None:
    # CI: set PG_DUMP_BIN=/usr/lib/postgresql/17/bin/pg_dump so we don’t pick /usr/bin/pg_dump (v16).
    pg_dump = os.environ.get("PG_DUMP_BIN", "pg_dump")
    pg = subprocess.Popen(
        [pg_dump, db_url, "--no-owner", "--no-acl", "--format", "plain"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    gz = subprocess.Popen(["gzip", "-c"], stdin=pg.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert pg.stdout is not None
    pg.stdout.close()
    stdout, stderr = gz.communicate()
    pg_err = pg.stderr.read().decode("utf-8", errors="replace") if pg.stderr else ""
    pg.wait()
    if pg.returncode != 0:
        print(f"pg_dump failed ({pg.returncode}): {pg_err}", file=sys.stderr)
        sys.exit(1)
    if gz.returncode != 0:
        gze = stderr.decode("utf-8", errors="replace") if stderr else ""
        print(f"gzip failed ({gz.returncode}): {gze}", file=sys.stderr)
        sys.exit(1)
    with open(out_path, "wb") as out:
        out.write(stdout or b"")


def main() -> None:
    db_url = _require("DATABASE_URL")
    tenant = _require("AZURE_TENANT_ID")
    client_id = _require("AZURE_CLIENT_ID")
    client_secret = _require("AZURE_CLIENT_SECRET")
    user_upn = _require("ONEDRIVE_USER_UPN")
    folder = (os.environ.get("ONEDRIVE_FOLDER") or "NeonBackups/teamvoc-updates").strip().strip("/")

    from datetime import datetime, timezone

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    filename = f"teamvoc-updates-{ts}.sql.gz"
    remote_path = f"{folder}/{filename}"

    with tempfile.TemporaryDirectory() as tmp:
        dump_path = os.path.join(tmp, filename)
        print("Running pg_dump | gzip …", flush=True)
        run_pg_dump(db_url, dump_path)
        size = os.path.getsize(dump_path)
        print(f"Backup size: {size} bytes", flush=True)

        print("Getting Microsoft Graph token …", flush=True)
        token = get_access_token(tenant, client_id, client_secret)

        print(f"Uploading to OneDrive: /{remote_path} …", flush=True)
        if size <= SIMPLE_UPLOAD_MAX:
            upload_simple(token, user_upn, remote_path, dump_path)
        else:
            upload_session(token, user_upn, remote_path, dump_path)

    print("Done.", flush=True)


if __name__ == "__main__":
    main()
