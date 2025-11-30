#!/usr/bin/env python3
"""
Generate a sample HOD upload Excel file at `scripts/hod_sample.xlsx`.

Columns: name, usn, email, role, proctor name, proctor email

Usage:
  pip install openpyxl
  python3 scripts/generate_hod_sample.py
"""
from openpyxl import Workbook
from pathlib import Path

OUT = Path(__file__).resolve().parent / "hod_sample.xlsx"

wb = Workbook()
ws = wb.active
ws.title = "hod_upload"

# Headers as requested (added `semester`)
headers = ["name", "usn", "email", "role", "semester", "proctor name", "proctor email"]
ws.append(headers)

# Student row: all columns filled (semester included)
ws.append(["Alice Rao", "1BM20CS001", "alice.rao@college.edu", "student", 5, "Rajesh Sharma", "sharma@college.edu"])

# Proctor row: only name,email,role (semester left blank)
ws.append(["Rajesh Sharma", "", "sharma@college.edu", "proctor", "", "", "sharma@college.edu"])

wb.save(OUT)
print(f"Wrote sample Excel to: {OUT}")
