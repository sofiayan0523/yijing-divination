---
name: ms-office-suite
description: Create, read, and edit Microsoft Office files (PowerPoint, Word, Excel) using Python.
---

# MS Office Suite

Create, read, and edit Microsoft Office files (.pptx, .docx, .xlsx) using Python.

## When to Use

Activate this skill when the user:
- Asks to **create** a PowerPoint presentation, Word document, or Excel spreadsheet
- **Uploads** a .pptx, .docx, or .xlsx file and wants it read or modified
- Asks to **edit** an existing Office file (change text, add slides/pages/sheets, etc.)
- Wants to **convert** content (e.g., markdown to .docx, data to .xlsx)

## CRITICAL: Binary File Handling

**NEVER** use the Write tool or Edit tool to create or modify Office files.
These tools handle text only and WILL corrupt binary .pptx/.docx/.xlsx files
(replacing bytes with U+FFFD, making the file unopenable).

**ALWAYS** write a complete Python script and run it via the Bash tool.
The script must save the file using the library's own save method:
- PowerPoint: `prs.save("output.pptx")`
- Word: `doc.save("output.docx")`
- Excel: `wb.save("output.xlsx")`

## Important: Always Save to Workspace

All generated Office files MUST be saved inside the current workspace directory
so the user can see them in the Files panel and download them. Use relative paths
from the workspace root (e.g., `output/report.docx`).

## Available Libraries

All three libraries are pre-installed. Use them via `python` in Bash:

| Library | Format | Import |
|---------|--------|--------|
| python-pptx | .pptx | `from pptx import Presentation` |
| python-docx | .docx | `from docx import Document` |
| openpyxl | .xlsx | `from openpyxl import Workbook` or `from openpyxl import load_workbook` |

## PowerPoint (.pptx) — python-pptx

### Creating a Presentation

```python
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.chart import XL_CHART_TYPE

prs = Presentation()
prs.slide_width = Inches(13.333)   # 16:9 widescreen
prs.slide_height = Inches(7.5)

# --- Title Slide ---
slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
# Add title text box
txBox = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(11), Inches(2))
tf = txBox.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "Presentation Title"
p.alignment = PP_ALIGN.CENTER
run = p.runs[0]
run.font.size = Pt(40)
run.font.bold = True
run.font.color.rgb = RGBColor(0x1A, 0x1A, 0x2E)

# --- Content Slide ---
slide2 = prs.slides.add_slide(prs.slide_layouts[6])
# Title
title_box = slide2.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.5), Inches(1))
title_box.text_frame.paragraphs[0].text = "Key Points"
title_box.text_frame.paragraphs[0].runs[0].font.size = Pt(28)
title_box.text_frame.paragraphs[0].runs[0].font.bold = True

# Bullet points
body_box = slide2.shapes.add_textbox(Inches(1), Inches(1.8), Inches(11), Inches(4.5))
tf = body_box.text_frame
tf.word_wrap = True
for i, point in enumerate(["First point", "Second point", "Third point"]):
    p = tf.add_paragraph() if i > 0 else tf.paragraphs[0]
    p.text = point
    p.level = 0
    p.space_after = Pt(12)
    run = p.runs[0]
    run.font.size = Pt(18)

prs.save("presentation.pptx")
```

### Key python-pptx Features

- **Slide layouts**: `[0]` Title, `[1]` Title+Content, `[5]` Title Only, `[6]` Blank
- **Shapes**: `add_textbox()`, `add_picture()`, `add_shape()`, `add_table()`, `add_chart()`
- **Images**: `slide.shapes.add_picture('image.png', Inches(1), Inches(2), height=Inches(3))`
- **Tables**: `slide.shapes.add_table(rows, cols, left, top, width, height)`
- **Charts**: `slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data)`
- **Background**: Access via `slide.background.fill` for solid fills
- **Speaker notes**: `slide.notes_slide.notes_text_frame.text = "Notes here"`
- **Units**: Always use `Inches()`, `Pt()`, or `Emu()` — never raw numbers

### Reading a Presentation

```python
from pptx import Presentation
import io

prs = Presentation("input.pptx")
for slide_num, slide in enumerate(prs.slides, 1):
    print(f"--- Slide {slide_num} ---")
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                if para.text.strip():
                    print(para.text)
        if shape.has_table:
            table = shape.table
            for row in table.rows:
                print(" | ".join(cell.text for cell in row.cells))
    if slide.has_notes_slide:
        notes = slide.notes_slide.notes_text_frame.text.strip()
        if notes:
            print(f"[Notes]: {notes}")
```

### Editing a Presentation

```python
from pptx import Presentation

prs = Presentation("existing.pptx")
# Modify text in first slide
slide = prs.slides[0]
for shape in slide.shapes:
    if shape.has_text_frame:
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                if "OLD_TEXT" in run.text:
                    run.text = run.text.replace("OLD_TEXT", "NEW_TEXT")
prs.save("modified.pptx")
```

### PPTX Limitations

- No animations or slide transitions
- No SmartArt creation
- No video/audio embedding
- Cannot delete slides via official API (workaround: rebuild without unwanted slides)
- Only .pptx format (not legacy .ppt)

---

## Word (.docx) — python-docx

### Creating a Document

```python
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT

doc = Document()

# Page setup
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.left_margin = Inches(1)
section.right_margin = Inches(1)

# Title
doc.add_heading("Document Title", level=0)

# Paragraphs with formatting
doc.add_heading("Section 1", level=1)
p = doc.add_paragraph()
run = p.add_run("This is bold text. ")
run.bold = True
run = p.add_run("This is normal text.")
run.font.name = "Arial"
run.font.size = Pt(11)

# Lists
doc.add_paragraph("First item", style="List Bullet")
doc.add_paragraph("Second item", style="List Bullet")
doc.add_paragraph("Step one", style="List Number")
doc.add_paragraph("Step two", style="List Number")

# Table
table = doc.add_table(rows=3, cols=3, style="Table Grid")
table.cell(0, 0).text = "Header 1"
table.cell(0, 1).text = "Header 2"
table.cell(0, 2).text = "Header 3"
for i in range(1, 3):
    for j in range(3):
        table.cell(i, j).text = f"Row {i}, Col {j+1}"

# Image
# doc.add_picture("image.png", width=Inches(4))

# Page break
doc.add_page_break()
doc.add_heading("Section 2", level=1)
doc.add_paragraph("Content on the second page.")

# Headers and footers
header = section.header
header.paragraphs[0].text = "Document Header"
footer = section.footer
footer.paragraphs[0].text = "Page Footer"

doc.save("document.docx")
```

### Key python-docx Features

- **Headings**: `doc.add_heading("Title", level=0)` (0=Title, 1-4=Heading levels)
- **Paragraphs**: `doc.add_paragraph("text", style="List Bullet")`
- **Runs**: `p.add_run("text")` with `.bold`, `.italic`, `.font.size`, `.font.color.rgb`
- **Tables**: `doc.add_table(rows, cols, style="Table Grid")` with `.cell(r, c).text`
- **Images**: `doc.add_picture("file.png", width=Inches(4))`
- **Sections**: Page size, margins, orientation, headers, footers
- **Styles**: "Normal", "Heading 1"-"Heading 4", "List Bullet", "List Number", "Table Grid"
- **Alignment**: `WD_ALIGN_PARAGRAPH.CENTER`, `.LEFT`, `.RIGHT`, `.JUSTIFY`

### Reading a Document

```python
from docx import Document

doc = Document("input.docx")

# Read paragraphs
for para in doc.paragraphs:
    print(f"[{para.style.name}] {para.text}")

# Read tables
for table in doc.tables:
    for row in table.rows:
        print(" | ".join(cell.text for cell in row.cells))

# Read headers/footers
for section in doc.sections:
    if section.header:
        print(f"Header: {section.header.paragraphs[0].text}")
    if section.footer:
        print(f"Footer: {section.footer.paragraphs[0].text}")
```

### Editing a Document

```python
from docx import Document

doc = Document("existing.docx")

# Replace text in paragraphs (preserve formatting by modifying runs)
for para in doc.paragraphs:
    for run in para.runs:
        if "PLACEHOLDER" in run.text:
            run.text = run.text.replace("PLACEHOLDER", "Actual Value")

# Add new content at the end
doc.add_heading("New Section", level=1)
doc.add_paragraph("Additional content.")

doc.save("modified.docx")
```

### DOCX Limitations

- Content appended to end only (no insert at arbitrary position)
- No track changes support
- No footnotes/endnotes creation
- No field codes (page numbers, TOC)
- Only .docx format (not legacy .doc)

---

## Excel (.xlsx) — openpyxl

### Creating a Spreadsheet

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment, NamedStyle
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "Data"

# Headers with formatting
headers = ["Name", "Q1", "Q2", "Q3", "Q4", "Total"]
header_font = Font(bold=True, size=12, color="FFFFFF")
header_fill = PatternFill("solid", fgColor="2F5496")
header_align = Alignment(horizontal="center")

for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_align

# Data rows
data = [
    ["Product A", 1500, 2300, 1800, 2100],
    ["Product B", 3200, 2800, 3500, 3100],
    ["Product C", 800, 1200, 950, 1400],
]
for row_idx, row_data in enumerate(data, 2):
    for col_idx, value in enumerate(row_data, 1):
        ws.cell(row=row_idx, column=col_idx, value=value)
    # Total formula
    ws.cell(row=row_idx, column=6, value=f"=SUM(B{row_idx}:E{row_idx})")

# Column widths
ws.column_dimensions["A"].width = 15
for col in range(2, 7):
    ws.column_dimensions[get_column_letter(col)].width = 12

# Number formatting
for row in range(2, len(data) + 2):
    for col in range(2, 7):
        ws.cell(row=row, column=col).number_format = "#,##0"

# Freeze header row
ws.freeze_panes = "A2"

# Auto-filter
ws.auto_filter.ref = f"A1:F{len(data) + 1}"

# --- Chart ---
chart = BarChart()
chart.type = "col"
chart.title = "Quarterly Sales"
chart.y_axis.title = "Revenue"
chart_data = Reference(ws, min_col=2, max_col=5, min_row=1, max_row=len(data) + 1)
cats = Reference(ws, min_col=1, min_row=2, max_row=len(data) + 1)
chart.add_data(chart_data, titles_from_data=True)
chart.set_categories(cats)
ws.add_chart(chart, "A8")

wb.save("spreadsheet.xlsx")
```

### Key openpyxl Features

- **Cells**: `ws["A1"] = value` or `ws.cell(row, col, value)`
- **Formulas**: `ws["A1"] = "=SUM(B2:B10)"` — written as strings, not evaluated
- **Formatting**: `Font`, `PatternFill`, `Border`, `Alignment`, `NamedStyle`
- **Number formats**: `cell.number_format = "#,##0.00"`, `"0.0%"`, `"yyyy-mm-dd"`
- **Charts**: `BarChart`, `LineChart`, `PieChart`, `ScatterChart` + `Reference` ranges
- **Merge**: `ws.merge_cells("A1:D1")`
- **Freeze**: `ws.freeze_panes = "B2"`
- **Filter**: `ws.auto_filter.ref = "A1:F100"`
- **Validation**: `DataValidation(type="list", formula1='"Yes,No"')`
- **Conditional formatting**: `CellIsRule`, `ColorScaleRule`, `DataBarRule`
- **Sheets**: `wb.create_sheet("Name")`, `del wb["Sheet"]`

### Critical: Use Excel Formulas, Not Hardcoded Values

ALWAYS use Excel formulas instead of computing values in Python:

```python
# WRONG — hardcoded value, won't update if source data changes
ws["D2"] = 150 + 200  # Bad!

# CORRECT — Excel formula, dynamic
ws["D2"] = "=B2+C2"   # Good!
```

### Reading a Spreadsheet

```python
from openpyxl import load_workbook

wb = load_workbook("input.xlsx", data_only=True)  # data_only=True reads cached values
ws = wb.active

# Read all data
for row in ws.iter_rows(min_row=1, values_only=True):
    print(row)

# Read specific cell
val = ws["A1"].value

# Read with headers
headers = [cell.value for cell in ws[1]]
for row in ws.iter_rows(min_row=2, values_only=True):
    record = dict(zip(headers, row))
    print(record)
```

### Editing a Spreadsheet

```python
from openpyxl import load_workbook

wb = load_workbook("existing.xlsx")
ws = wb.active

# Modify cells
ws["A1"] = "Updated Value"

# Insert rows/columns
ws.insert_rows(2)       # Insert before row 2
ws.insert_cols(3, 2)    # Insert 2 cols before column C

# Delete rows/columns
ws.delete_rows(5, 3)    # Delete 3 rows starting at row 5

# Add new sheet
ws2 = wb.create_sheet("Summary")
ws2["A1"] = "Summary Data"

wb.save("modified.xlsx")
```

### XLSX Limitations

- Formulas written but NOT evaluated (openpyxl does not calculate)
- No VBA/macro creation (can preserve with `keep_vba=True`)
- No pivot tables
- Shapes may be lost on re-save
- Only .xlsx/.xlsm format (not legacy .xls)

---

## Design Guidelines

### Professional Defaults

- **Fonts**: Use Arial, Calibri, or system defaults — never decorative fonts
- **Colors**: Restrained palette. Dark (#1A1A2E/#2F5496), accent (#4472C4), bg (#F5F5F5)
- **Spacing**: Consistent margins and padding throughout
- **Alignment**: Left-align body text, center headers/titles

### PowerPoint Best Practices

1. Use 16:9 widescreen (13.333" x 7.5")
2. Max 6-8 bullet points per slide
3. Title font 28-40pt, body font 16-20pt
4. Include slide numbers on content slides
5. Use blank layout (index 6) for maximum flexibility

### Word Best Practices

1. Use heading hierarchy (Heading 1-4) for document structure
2. Set proper page margins (1" all sides by default)
3. Use Table Grid style for tables
4. Add page breaks between major sections

### Excel Best Practices

1. Bold header row with distinct background color
2. Freeze the header row (`ws.freeze_panes = "A2"`)
3. Use Excel formulas for all calculations (never hardcode)
4. Format numbers appropriately (#,##0 for integers, #,##0.00 for currency)
5. Set reasonable column widths

## Quality Checklist

Before delivering any Office file, verify:

- [ ] File opens without errors
- [ ] Text is readable (appropriate font sizes and colors)
- [ ] Layout is consistent across all slides/pages/sheets
- [ ] All formulas reference correct cells (Excel)
- [ ] Images are properly sized and positioned (if any)
- [ ] File is saved in the workspace directory
- [ ] File was saved via Python's save method in Bash (NOT via Write/Edit tool)
