---
name: google-workspace
description: Create, read, and edit Google Slides, Docs, and Sheets via Google Workspace APIs.
---

# Google Workspace

Create, read, and edit Google Slides, Docs, and Sheets via Google Workspace APIs.

## When to Use

Activate this skill when the user:
- Asks to **create** a Google Slides presentation, Google Doc, or Google Sheet
- **Pastes a URL** to a Google Slides/Docs/Sheets file and wants it read or modified
- Asks to **edit** an existing Google Workspace file (change text, add slides/pages/sheets)
- Wants to **share** a Google Workspace file with specific people

## Prerequisites

This skill requires **GCP credentials** configured for the Space:
1. A GCP service account with **Google Workspace APIs enabled**:
   - Google Slides API
   - Google Docs API
   - Google Sheets API
   - Google Drive API
2. The `GOOGLE_APPLICATION_CREDENTIALS` env var must be set (automatic when GCP creds configured)

If GCP credentials are NOT available, tell the user:
> "To use Google Workspace features, please configure GCP credentials for this Space
> with a service account that has Google Slides, Docs, Sheets, and Drive APIs enabled."

## Authentication

All helper scripts use `GOOGLE_APPLICATION_CREDENTIALS` automatically:

```python
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
]

credentials = service_account.Credentials.from_service_account_file(
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'],
    scopes=SCOPES,
)

slides_service = build('slides', 'v1', credentials=credentials)
docs_service = build('docs', 'v1', credentials=credentials)
sheets_service = build('sheets', 'v4', credentials=credentials)
drive_service = build('drive', 'v3', credentials=credentials)
```

## URL Parsing

Extract document IDs from Google URLs:

```python
import re

def extract_doc_id(url_or_id):
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', url_or_id)
    return match.group(1) if match else url_or_id
```

| Service | URL Pattern |
|---------|-------------|
| Google Docs | `https://docs.google.com/document/d/{ID}/edit` |
| Google Sheets | `https://docs.google.com/spreadsheets/d/{ID}/edit` |
| Google Slides | `https://docs.google.com/presentation/d/{ID}/edit` |

## Important: Sharing Created Files

Files created by the service account are **owned by the service account**.
To let users access them, ALWAYS share after creation:

```python
def share_file(drive_service, file_id, email, role='writer'):
    drive_service.permissions().create(
        fileId=file_id,
        body={'type': 'user', 'role': role, 'emailAddress': email},
        sendNotificationEmail=True,
    ).execute()
```

If the user's email is unknown, make the file accessible via link:

```python
drive_service.permissions().create(
    fileId=file_id,
    body={'type': 'anyone', 'role': 'writer'},
).execute()
```

Always return the file URL to the user after creation.

## Important: Accessing User Files

When a user pastes a Google URL, the file must be shared with the
service account's `client_email` for the API to access it.

If you get a **403 Forbidden** error, tell the user:
> "Please share this file with the service account email:
> `{client_email}` (with Editor access) so I can read/edit it."

You can find the client_email from the service account JSON:
```python
import json, os
sa = json.load(open(os.environ['GOOGLE_APPLICATION_CREDENTIALS']))
print(sa['client_email'])
```

---

## Google Slides — Slides API v1

### Creating a Presentation

```python
from googleapiclient.discovery import build

# Create blank presentation
body = {'title': 'My Presentation'}
presentation = slides_service.presentations().create(body=body).execute()
presentation_id = presentation['presentationId']
url = f"https://docs.google.com/presentation/d/{presentation_id}/edit"

# Add a slide with Title+Body layout
slides_service.presentations().batchUpdate(
    presentationId=presentation_id,
    body={'requests': [{
        'createSlide': {
            'insertionIndex': 1,
            'slideLayoutReference': {'predefinedLayout': 'TITLE_AND_BODY'},
        }
    }]}
).execute()
```

### Key Slides API Operations

- **Create slide**: `createSlide` with `predefinedLayout` (BLANK, TITLE, TITLE_AND_BODY, etc.)
- **Add text box**: `createShape` with shapeType `TEXT_BOX`, then `insertText`
- **Replace text**: `replaceAllText` with `containsText` and `replaceText`
- **Format text**: `updateTextStyle` with range, style (bold, fontSize, foregroundColor)
- **Add image**: `createImage` with `url` and `elementProperties`
- **Delete slide**: `deleteObject` with slide objectId
- **Add table**: `createTable` with rows/columns on a page

### Reading a Presentation

```python
presentation = slides_service.presentations().get(
    presentationId=presentation_id
).execute()

for i, slide in enumerate(presentation.get('slides', [])):
    print(f"--- Slide {i + 1} ---")
    for element in slide.get('pageElements', []):
        shape = element.get('shape')
        if shape and 'text' in shape:
            for text_el in shape['text'].get('textElements', []):
                text_run = text_el.get('textRun')
                if text_run:
                    print(text_run['content'], end='')
```

### Editing a Presentation

```python
# Replace all occurrences of placeholder text
slides_service.presentations().batchUpdate(
    presentationId=presentation_id,
    body={'requests': [{
        'replaceAllText': {
            'containsText': {'text': '{{TITLE}}', 'matchCase': True},
            'replaceText': 'Actual Title',
        }
    }]}
).execute()

# Insert text into a specific shape
slides_service.presentations().batchUpdate(
    presentationId=presentation_id,
    body={'requests': [{
        'insertText': {
            'objectId': shape_id,
            'insertionIndex': 0,
            'text': 'New text content',
        }
    }]}
).execute()
```

### Slides Limitations

- No animation or transition support
- Cannot directly import/export .pptx (use Drive API for conversion)
- Template layouts are fixed to predefined types
- Image insertion requires a publicly accessible URL

---

## Google Docs — Docs API v1

### Creating a Document

```python
body = {'title': 'My Document'}
doc = docs_service.documents().create(body=body).execute()
document_id = doc['documentId']
url = f"https://docs.google.com/document/d/{document_id}/edit"

# Insert text (index 1 = start of document body)
docs_service.documents().batchUpdate(
    documentId=document_id,
    body={'requests': [
        {
            'insertText': {
                'location': {'index': 1},
                'text': 'Introduction\nBody paragraph text.\n',
            }
        },
        {
            'updateParagraphStyle': {
                'range': {'startIndex': 1, 'endIndex': 13},
                'paragraphStyle': {'namedStyleType': 'HEADING_1'},
                'fields': 'namedStyleType',
            }
        },
    ]}
).execute()
```

### Key Docs API Operations

- **Insert text**: `insertText` at `location.index`
- **Delete text**: `deleteContentRange` with `startIndex`/`endIndex`
- **Format text**: `updateTextStyle` with bold, italic, fontSize, foregroundColor
- **Set heading**: `updateParagraphStyle` with `namedStyleType` (HEADING_1..HEADING_6)
- **Insert table**: `insertTable` with rows, columns, location
- **Add bullet list**: `createParagraphBullets` with range
- **Replace text**: Use `replaceAllText` for find-and-replace

### Reading a Document

```python
doc = docs_service.documents().get(documentId=document_id).execute()

# Extract plain text from body content
for element in doc.get('body', {}).get('content', []):
    if 'paragraph' in element:
        for para_el in element['paragraph'].get('elements', []):
            text_run = para_el.get('textRun')
            if text_run:
                print(text_run['content'], end='')
    elif 'table' in element:
        for row in element['table'].get('tableRows', []):
            cells = []
            for cell in row.get('tableCells', []):
                cell_text = ''
                for content in cell.get('content', []):
                    if 'paragraph' in content:
                        for el in content['paragraph']['elements']:
                            tr = el.get('textRun')
                            if tr:
                                cell_text += tr['content']
                cells.append(cell_text.strip())
            print(' | '.join(cells))
```

### Editing a Document

```python
# Replace all occurrences
docs_service.documents().batchUpdate(
    documentId=document_id,
    body={'requests': [{
        'replaceAllText': {
            'containsText': {'text': 'OLD_TEXT', 'matchCase': True},
            'replaceText': 'NEW_TEXT',
        }
    }]}
).execute()

# Insert text at end (get doc length first)
doc = docs_service.documents().get(documentId=document_id).execute()
end_index = doc['body']['content'][-1]['endIndex'] - 1
docs_service.documents().batchUpdate(
    documentId=document_id,
    body={'requests': [{
        'insertText': {
            'location': {'index': end_index},
            'text': '\nNew section content.\n',
        }
    }]}
).execute()
```

### Docs Index Rules

- Index 1 = beginning of body (index 0 is reserved)
- When batching multiple inserts, process from END to START to avoid index shifts
- Or use `replaceAllText` for safe find-and-replace without index management

### Docs Limitations

- Index-based editing requires careful position tracking
- No direct .docx import/export (use Drive API for conversion)
- Headers/footers are in separate document sections
- Cannot modify comments programmatically via Docs API

---

## Google Sheets — Sheets API v4

### Creating a Spreadsheet

```python
body = {
    'properties': {'title': 'My Spreadsheet'},
    'sheets': [{'properties': {'title': 'Data'}}],
}
spreadsheet = sheets_service.spreadsheets().create(
    body=body, fields='spreadsheetId'
).execute()
spreadsheet_id = spreadsheet['spreadsheetId']
url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"

# Write data
sheets_service.spreadsheets().values().update(
    spreadsheetId=spreadsheet_id,
    range='Data!A1',
    valueInputOption='USER_ENTERED',
    body={'values': [
        ['Name', 'Q1', 'Q2', 'Total'],
        ['Product A', 1500, 2300, '=B2+C2'],
        ['Product B', 3200, 2800, '=B3+C3'],
    ]},
).execute()
```

### Key Sheets API Operations

- **Read values**: `values().get(spreadsheetId, range)` — A1 notation
- **Write values**: `values().update(spreadsheetId, range, body)` — `USER_ENTERED` or `RAW`
- **Append rows**: `values().append(spreadsheetId, range, body)`
- **Batch read**: `values().batchGet(spreadsheetId, ranges=[...])`
- **Batch write**: `values().batchUpdate(spreadsheetId, body)`
- **Add sheet**: `spreadsheets().batchUpdate` with `addSheet` request
- **Format cells**: `spreadsheets().batchUpdate` with `repeatCell`, `updateBorders`
- **Auto-resize**: `autoResizeDimensions` request

### Reading a Spreadsheet

```python
# Read a range
result = sheets_service.spreadsheets().values().get(
    spreadsheetId=spreadsheet_id,
    range='Sheet1!A1:Z1000',
).execute()
rows = result.get('values', [])
for row in rows:
    print(' | '.join(str(v) for v in row))

# Get spreadsheet metadata (sheet names, properties)
meta = sheets_service.spreadsheets().get(
    spreadsheetId=spreadsheet_id,
    fields='sheets.properties',
).execute()
for sheet in meta.get('sheets', []):
    props = sheet['properties']
    print(f"Sheet: {props['title']} (id={props['sheetId']})")
```

### Editing a Spreadsheet

```python
# Update specific cells
sheets_service.spreadsheets().values().update(
    spreadsheetId=spreadsheet_id,
    range='Sheet1!A1:B2',
    valueInputOption='USER_ENTERED',
    body={'values': [['Updated', 'Values'], ['Row 2', 'Data']]},
).execute()

# Add a new sheet tab
sheets_service.spreadsheets().batchUpdate(
    spreadsheetId=spreadsheet_id,
    body={'requests': [{'addSheet': {'properties': {'title': 'Summary'}}}]},
).execute()

# Format header row (bold, background color)
sheets_service.spreadsheets().batchUpdate(
    spreadsheetId=spreadsheet_id,
    body={'requests': [{
        'repeatCell': {
            'range': {'sheetId': 0, 'startRowIndex': 0, 'endRowIndex': 1},
            'cell': {'userEnteredFormat': {
                'textFormat': {'bold': True, 'fontSize': 12},
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
            }},
            'fields': 'userEnteredFormat(textFormat,backgroundColor)',
        }
    }]},
).execute()
```

### Sheets Best Practices

1. Use `USER_ENTERED` for valueInputOption (parses formulas and dates)
2. Use A1 notation for ranges: `Sheet1!A1:C10`, `Sheet1!A:C`, `Sheet1`
3. Use formulas (`=SUM(B2:B10)`) instead of computing values in Python
4. Batch operations when possible to reduce API calls

### Sheets Limitations

- Read returns cached formula results (not live-computed)
- No pivot table creation via API
- Charts require `addChart` batchUpdate request (complex)
- Cell formatting requires sheet ID (numeric), not sheet name

---

## Error Handling

```python
from googleapiclient.errors import HttpError

try:
    result = service.documents().get(documentId=doc_id).execute()
except HttpError as error:
    if error.resp.status == 403:
        print("Permission denied. Share the file with the service account.")
    elif error.resp.status == 404:
        print("File not found. Check the document ID or URL.")
    elif error.resp.status == 429:
        print("Rate limit exceeded. Wait and retry.")
    else:
        raise
```

## Quality Checklist

Before delivering any Google Workspace result, verify:

- [ ] GCP credentials are available (`GOOGLE_APPLICATION_CREDENTIALS` is set)
- [ ] File was created successfully (valid document ID returned)
- [ ] Created files are shared (via link or email) so user can access
- [ ] File URL is provided to the user
- [ ] Read operations return meaningful content
- [ ] Edit operations are confirmed by re-reading the document
