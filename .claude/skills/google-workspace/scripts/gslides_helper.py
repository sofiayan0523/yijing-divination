#!/usr/bin/env python3
"""Google Slides helper — create, read, and get info on presentations.

Usage:
    python gslides_helper.py create <title>
    python gslides_helper.py read <id_or_url>
    python gslides_helper.py info <id_or_url>
"""
import json
import os
import re
import sys


SCOPES = [
    "https://www.googleapis.com/auth/presentations",
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


def create_presentation(title: str) -> None:
    slides = _get_service("slides", "v1", SCOPES)
    drive = _get_service("drive", "v3", SCOPES)

    presentation = slides.presentations().create(body={"title": title}).execute()
    pid = presentation["presentationId"]

    # Make accessible via link
    drive.permissions().create(
        fileId=pid,
        body={"type": "anyone", "role": "writer"},
    ).execute()

    url = f"https://docs.google.com/presentation/d/{pid}/edit"
    print(json.dumps({"presentationId": pid, "url": url, "title": title}))


def read_presentation(id_or_url: str) -> None:
    slides = _get_service("slides", "v1", SCOPES)
    pid = _extract_id(id_or_url)

    presentation = slides.presentations().get(presentationId=pid).execute()
    for i, slide in enumerate(presentation.get("slides", [])):
        print(f"\n=== Slide {i + 1} ===")
        for element in slide.get("pageElements", []):
            shape = element.get("shape")
            if shape and "text" in shape:
                for text_el in shape["text"].get("textElements", []):
                    text_run = text_el.get("textRun")
                    if text_run:
                        content = text_run["content"].rstrip("\n")
                        if content:
                            print(content)
            table = element.get("table")
            if table:
                for row in table.get("tableRows", []):
                    cells = []
                    for cell in row.get("tableCells", []):
                        cell_text = ""
                        for tc in cell.get("text", {}).get("textElements", []):
                            tr = tc.get("textRun")
                            if tr:
                                cell_text += tr["content"]
                        cells.append(cell_text.strip())
                    print(" | ".join(cells))
        # Speaker notes are on the slide's notesPage
        notes_page = slide.get("slideProperties", {}).get("notesPage")
        if notes_page:
            for ne in notes_page.get("pageElements", []):
                ns = ne.get("shape")
                if ns and "text" in ns:
                    for te in ns["text"].get("textElements", []):
                        tr = te.get("textRun")
                        if tr:
                            nt = tr["content"].strip()
                            if nt:
                                print(f"[Notes]: {nt}")


def get_info(id_or_url: str) -> None:
    slides = _get_service("slides", "v1", SCOPES)
    pid = _extract_id(id_or_url)

    presentation = slides.presentations().get(presentationId=pid).execute()
    info = {
        "presentationId": pid,
        "title": presentation.get("title", ""),
        "slide_count": len(presentation.get("slides", [])),
        "locale": presentation.get("locale", ""),
        "page_size": presentation.get("pageSize", {}),
        "url": f"https://docs.google.com/presentation/d/{pid}/edit",
    }
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "create":
        create_presentation(sys.argv[2] if len(sys.argv) > 2 else "Untitled")
    elif cmd == "read":
        if len(sys.argv) < 3:
            print("Usage: python gslides_helper.py read <id_or_url>")
            sys.exit(1)
        read_presentation(sys.argv[2])
    elif cmd == "info":
        if len(sys.argv) < 3:
            print("Usage: python gslides_helper.py info <id_or_url>")
            sys.exit(1)
        get_info(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
