"""
Index PDF catalogs: extract codes and page titles, populate catalog_index (e.g. Supabase).
Title extraction focuses on the top 20% of each page and filters header noise.
"""
import re
import os
import sys

try:
    import pdfplumber
except ImportError:
    pdfplumber = None


def extract_clean_title(page):
    """
    Extract a clean content title from the top 20% of the page.
    Skips header noise (AluK, copyright, dates, URLs) and prioritizes
    uppercase technical titles (e.g. "SINOTTICO", "NODI TIPICI").
    """
    if not page or (getattr(page, "width", None) or 0) <= 0 or (getattr(page, "height", None) or 0) <= 0:
        return ""

    width = page.width
    height = page.height
    top_20_height = height * 0.2

    # Crop top 20% of the page
    try:
        cropped = page.crop((0, 0, width, top_20_height))
    except Exception:
        return ""

    # Extract text with x_tolerance to keep words together
    try:
        text = cropped.extract_text(x_tolerance=3)
    except TypeError:
        text = cropped.extract_text()
    if not text:
        return ""

    lines = [ln.strip() for ln in text.splitlines() if ln]

    # Date-like patterns (e.g. 31.10.2024, 8.20)
    date_re = re.compile(r"^\d{1,2}\.\d{1,2}(\.\d{2,4})?$|^\d{1,4}\.\d{1,2}\.\d{1,4}$")

    def is_noise(line):
        if not line or len(line) < 3:
            return True
        lower = line.lower()
        if "aluk" in lower:
            return True
        if "rights reserved" in lower or "copyright" in lower:
            return True
        if "www." in lower or ".com" in lower:
            return True
        if date_re.match(line.strip()):
            return True
        if line.strip().replace(".", "").replace(",", "").isdigit():
            return True
        return False

    def is_mostly_uppercase(s):
        letters = [c for c in s if c.isalpha()]
        if len(letters) < 5:
            return False
        upper = sum(1 for c in letters if c.isupper())
        return upper / len(letters) >= 0.7

    fallback = None
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if is_noise(line):
            continue
        if is_mostly_uppercase(line):
            return line
        if fallback is None:
            fallback = line

    return fallback if fallback is not None else ""


def index_pdf_catalog(pdf_path, pdf_filename, code_extract_callback=None):
    """
    Open a PDF and yield (page_number, page_title, codes...) for each page.
    code_extract_callback(page) can return a list of codes found on the page.
    """
    if not pdfplumber:
        raise RuntimeError("pdfplumber is required. Install with: pip install pdfplumber")

    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(pdf_path)

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            page_title = extract_clean_title(page)
            codes = []
            if code_extract_callback:
                try:
                    codes = code_extract_callback(page) or []
                except Exception:
                    pass
            yield (i, page_title, codes)


def main():
    """Example: run on a single PDF and print extracted titles."""
    if not pdfplumber:
        print("Install pdfplumber: pip install pdfplumber")
        sys.exit(1)

    pdf_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not pdf_path or not os.path.isfile(pdf_path):
        print("Usage: python index_catalog.py <path/to/catalog.pdf>")
        print("  Or set PDF path in script and run without args.")
        sys.exit(1)

    pdf_name = os.path.basename(pdf_path)
    print(f"Indexing: {pdf_name}\n")

    count = 0
    examples_shown = 0
    max_examples = 8
    for page_num, page_title, codes in index_pdf_catalog(pdf_path, pdf_name):
        count += 1
        title_display = f"[{page_title}]" if page_title else "(no title)"
        if page_title and examples_shown < max_examples:
            print(f"Found title: {title_display}")
            examples_shown += 1
        if count <= 20:
            print(f"  Page {page_num}: {title_display}")

    print(f"\nDone. Processed {count} pages.")


if __name__ == "__main__":
    main()
