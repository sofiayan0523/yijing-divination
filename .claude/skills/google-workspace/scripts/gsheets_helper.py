#!/usr/bin/env python3
"""Google Sheets helper — create, read, and get info on spreadsheets.

Usage:
    python gsheets_helper.py create <title>
    python gsheets_helper.py read <id_or_url> [range]
    python gsheets_helper.py info <id_or_url>
"""
import json
import os
import re
import sys


SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def _get_service(api, version, scopes):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print("Error: GOOGLE_APPLICATION_CREDENTIALS not set.", file=sys.stderr)
        print("Configure GCP credentials for this Space.", file=sys.stderr)
        sys.exit(1)
    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=scopes,
    )
    return build(api, version, credentials=credentials)


def _extract_id(url_or_id: str) -> str:
    match = re.search(r"/d/([a-zA-Z0-9_-]+)", url_or_id)
    return match.group(1) if match else url_or_id


def create_spreadsheet(title: str) -> None:
    sheets = _get_service("sheets", "v4", SCOPES)
    drive = _get_service("drive", "v3", SCOPES)

    body = {"properties": {"title": title}}
    spreadsheet = sheets.spreadsheets().create(
        body=body, fields="spreadsheetId"
    ).execute()
    sid = spreadsheet["spreadsheetId"]

    # Make accessible via link
    drive.permissions().create(
        fileId=sid,
        body={"type": "anyone", "role": "writer"},
    ).execute()

    url = f"https://docs.google.com/spreadsheets/d/{sid}/edit"
    print(json.dumps({"spreadsheetId": sid, "url": url, "title": title}))


def read_spreadsheet(id_or_url: str, range_name: str | None = None) -> None:
    sheets = _get_service("sheets", "v4", SCOPES)
    sid = _extract_id(id_or_url)

    if range_name:
        result = sheets.spreadsheets().values().get(
            spreadsheetId=sid, range=range_name,
        ).execute()
        rows = result.get("values", [])
        for row in rows:
            print(" | ".join(str(v) for v in row))
    else:
        # Read all sheets
        meta = sheets.spreadsheets().get(
            spreadsheetId=sid, fields="sheets.properties",
        ).execute()
        for sheet in meta.get("sheets", []):
            name = sheet["properties"]["title"]
            print(f"\n=== {name} ===")
            try:
                result = sheets.spreadsheets().values().get(
                    spreadsheetId=sid, range=f"{name}!A1:Z1000",
                ).execute()
                rows = result.get("values", [])
                for row in rows:
                    print(" | ".join(str(v) for v in row))
                if not rows:
                    print("(empty)")
            except Exception as e:
                print(f"Error reading sheet: {e}")


def get_info(id_or_url: str) -> None:
    sheets = _get_service("sheets", "v4", SCOPES)
    sid = _extract_id(id_or_url)

    meta = sheets.spreadsheets().get(
        spreadsheetId=sid,
        fields="properties.title,sheets.properties",
    ).execute()
    info = {
        "spreadsheetId": sid,
        "title": meta.get("properties", {}).get("title", ""),
        "sheet_count": len(meta.get("sheets", [])),
        "sheets": [],
        "url": f"https://docs.google.com/spreadsheets/d/{sid}/edit",
    }
    for sheet in meta.get("sheets", []):
        props = sheet["properties"]
        info["sheets"].append({
            "title": props.get("title", ""),
            "sheetId": props.get("sheetId"),
            "rowCount": props.get("gridProperties", {}).get("rowCount"),
            "columnCount": props.get("gridProperties", {}).get("columnCount"),
        })
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "create":
        create_spreadsheet(sys.argv[2] if len(sys.argv) > 2 else "Untitled")
    elif cmd == "read":
        if len(sys.argv) < 3:
            print("Usage: python gsheets_helper.py read <id_or_url> [range]")
            sys.exit(1)
        read_spreadsheet(
            sys.argv[2],
            sys.argv[3] if len(sys.argv) > 3 else None,
        )
    elif cmd == "info":
        if len(sys.argv) < 3:
            print("Usage: python gsheets_helper.py info <id_or_url>")
            sys.exit(1)
        get_info(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
