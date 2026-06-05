#!/usr/bin/env python3
"""Google Docs helper — create, read, and get info on documents.

Usage:
    python gdocs_helper.py create <title>
    python gdocs_helper.py read <id_or_url>
    python gdocs_helper.py info <id_or_url>
"""
import json
import os
import re
import sys


SCOPES = [
    "https://www.googleapis.com/auth/documents",
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


def create_document(title: str) -> None:
    docs = _get_service("docs", "v1", SCOPES)
    drive = _get_service("drive", "v3", SCOPES)

    doc = docs.documents().create(body={"title": title}).execute()
    did = doc["documentId"]

    # Make accessible via link
    drive.permissions().create(
        fileId=did,
        body={"type": "anyone", "role": "writer"},
    ).execute()

    url = f"https://docs.google.com/document/d/{did}/edit"
    print(json.dumps({"documentId": did, "url": url, "title": title}))


def read_document(id_or_url: str) -> None:
    docs = _get_service("docs", "v1", SCOPES)
    did = _extract_id(id_or_url)

    doc = docs.documents().get(documentId=did).execute()
    body = doc.get("body", {})

    for element in body.get("content", []):
        if "paragraph" in element:
            para = element["paragraph"]
            style_type = para.get("paragraphStyle", {}).get("namedStyleType", "")
            texts = []
            for el in para.get("elements", []):
                text_run = el.get("textRun")
                if text_run:
                    texts.append(text_run["content"])
            text = "".join(texts).rstrip("\n")
            if text:
                if style_type and style_type.startswith("HEADING"):
                    level = style_type.replace("HEADING_", "")
                    print(f"[Heading {level}] {text}")
                else:
                    print(text)
        elif "table" in element:
            table = element["table"]
            for row_idx, row in enumerate(table.get("tableRows", [])):
                cells = []
                for cell in row.get("tableCells", []):
                    cell_text = ""
                    for content in cell.get("content", []):
                        if "paragraph" in content:
                            for el in content["paragraph"]["elements"]:
                                tr = el.get("textRun")
                                if tr:
                                    cell_text += tr["content"]
                    cells.append(cell_text.strip())
                print(" | ".join(cells))


def get_info(id_or_url: str) -> None:
    docs = _get_service("docs", "v1", SCOPES)
    did = _extract_id(id_or_url)

    doc = docs.documents().get(documentId=did).execute()
    body_content = doc.get("body", {}).get("content", [])
    paragraph_count = sum(1 for el in body_content if "paragraph" in el)
    table_count = sum(1 for el in body_content if "table" in el)
    info = {
        "documentId": did,
        "title": doc.get("title", ""),
        "paragraph_count": paragraph_count,
        "table_count": table_count,
        "url": f"https://docs.google.com/document/d/{did}/edit",
    }
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "create":
        create_document(sys.argv[2] if len(sys.argv) > 2 else "Untitled")
    elif cmd == "read":
        if len(sys.argv) < 3:
            print("Usage: python gdocs_helper.py read <id_or_url>")
            sys.exit(1)
        read_document(sys.argv[2])
    elif cmd == "info":
        if len(sys.argv) < 3:
            print("Usage: python gdocs_helper.py info <id_or_url>")
            sys.exit(1)
        get_info(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
