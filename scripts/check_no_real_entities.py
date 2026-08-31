#!/usr/bin/env python3
"""Extract text from every deal-packet file and flag real-world company names.

xlsx/docx/pptx are zip containers and pdf is compressed, so a plain ripgrep over
the packets silently misses most of their content. This walks every file with a
format-aware reader first, then greps the extracted text.
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEALS = os.path.join(ROOT, "test_sets", "deals")

REAL = [
    # defense / aerospace primes and their divisions
    "lockheed", "martin marietta", "raytheon", "rtx", "northrop", "grumman",
    "boeing", "general dynamics", "bae systems", "l3harris", "leidos",
    "huntington ingalls", "textron", "sikorsky", "pratt & whitney",
    "rolls-royce", "honeywell", "collins aerospace", "spirit aerosystems",
    "kratos", "aerojet", "moog inc", "parker hannifin", "safran", "thales",
    "airbus", "embraer", "bombardier", "gulfstream",
    # real programs / platforms
    "f-35", "f-22", "f-18", "f/a-18", "black hawk", "blackhawk", "apache",
    "chinook", "osprey", "v-22", "patriot missile", "javelin", "himars",
    "abrams", "bradley fighting", "joint strike fighter",
    # accounting / banking / consulting names that show up in fake CIMs
    "deloitte", "pwc", "pricewaterhouse", "ernst & young", "kpmg", "grant thornton",
    "bdo usa", "rsm us", "mckinsey", "bain & company", "boston consulting",
    "goldman sachs", "morgan stanley", "jpmorgan", "jp morgan", "wells fargo",
    "bank of america", "citibank", "pnc bank", "us bancorp", "truist",
    # other commonly leaked real brands
    "walmart", "costco", "kroger", "target corporation", "amazon", "pepsico",
    "coca-cola", "coca cola", "nestle", "nestlé", "keurig", "dr pepper",
    "anheuser-busch", "molson coors", "constellation brands", "clean harbors",
    "waste management", "republic services", "veolia", "stericycle",
    "us ecology", "chemours", "dupont", "3m company", "monsanto",
]

PAT = re.compile("|".join(re.escape(t) for t in REAL), re.IGNORECASE)


def read_zip_xml(path):
    """xlsx / docx / pptx: concatenate the text of every XML part."""
    out = []
    try:
        with zipfile.ZipFile(path) as z:
            for n in z.namelist():
                if n.endswith(".xml") or n.endswith(".rels"):
                    try:
                        out.append(z.read(n).decode("utf-8", "ignore"))
                    except Exception:
                        pass
    except Exception as e:
        return f"<<unreadable: {e}>>"
    return "\n".join(out)


def read_pdf(path):
    try:
        from pypdf import PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            return "<<no pdf reader>>"
    try:
        return "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)
    except Exception as e:
        return f"<<unreadable: {e}>>"


def read_any(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".docx", ".pptx"):
        return read_zip_xml(path)
    if ext == ".pdf":
        return read_pdf(path)
    if ext in (".mp3", ".mp4", ".png", ".jpg", ".jpeg"):
        return ""  # binary media, checked separately via transcripts
    try:
        return open(path, encoding="utf-8", errors="ignore").read()
    except Exception as e:
        return f"<<unreadable: {e}>>"


def strip_tags(t):
    return re.sub(r"<[^>]+>", " ", t)


def main():
    hits = {}
    for root, _, files in os.walk(DEALS):
        for f in sorted(files):
            path = os.path.join(root, f)
            text = strip_tags(read_any(path))
            found = sorted({m.group(0).lower() for m in PAT.finditer(text)})
            if found:
                rel = os.path.relpath(path, DEALS)
                hits[rel] = found
    if not hits:
        print("CLEAN: no real-world company references found.")
        return 0
    for rel, found in hits.items():
        print(f"{rel}\n    {', '.join(found)}")
    print(f"\n{len(hits)} file(s) with real-entity references.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
