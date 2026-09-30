#!/usr/bin/env python3
"""
sonar_report.py
สร้างรายงาน PDF สรุปผลการสแกนจาก SonarQube (Community Edition)
โดยดึงข้อมูลผ่าน Web API ของ SonarQube แล้วนำมาจัดรูปแบบเป็นไฟล์ PDF

การใช้งาน:
    python3 sonar_report.py --host http://localhost:9000 --project juice-shop-demo --token <YOUR_TOKEN>

ต้องติดตั้งไลบรารีก่อน:
    pip install requests reportlab
"""

import argparse
import sys
from datetime import datetime

import requests
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)

# ---------------------------------------------------------------------------
# ค่าคงที่ / mapping สำหรับแสดงผล
# ---------------------------------------------------------------------------

METRIC_KEYS = [
    "bugs",
    "vulnerabilities",
    "security_hotspots",
    "code_smells",
    "coverage",
    "duplicated_lines_density",
    "ncloc",
    "reliability_rating",
    "security_rating",
    "sqale_rating",
    "alert_status",
]

RATING_LABEL = {"1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E"}

METRIC_TH_LABEL = {
    "bugs": "Bugs",
    "vulnerabilities": "Vulnerabilities",
    "security_hotspots": "Security Hotspots",
    "code_smells": "Code Smells",
    "coverage": "Test Coverage (%)",
    "duplicated_lines_density": "Duplicated Lines (%)",
    "ncloc": "Lines of Code",
    "reliability_rating": "Reliability Rating",
    "security_rating": "Security Rating",
    "sqale_rating": "Maintainability Rating",
}

SEVERITY_ORDER = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]


# ---------------------------------------------------------------------------
# ฟังก์ชันเรียก SonarQube API
# ---------------------------------------------------------------------------

def fetch_measures(host, token, project_key):
    """ดึงค่าตัวชี้วัดสรุป (measures) ของโปรเจกต์"""
    url = f"{host}/api/measures/component"
    params = {
        "component": project_key,
        "metricKeys": ",".join(METRIC_KEYS),
    }
    resp = requests.get(url, params=params, auth=(token, ""))
    resp.raise_for_status()
    data = resp.json()
    measures = {m["metric"]: m.get("value", "-") for m in data["component"]["measures"]}
    return measures, data["component"].get("name", project_key)


def fetch_issues_by_severity(host, token, project_key):
    """ดึงจำนวน issues แยกตาม severity"""
    counts = {}
    for sev in SEVERITY_ORDER:
        url = f"{host}/api/issues/search"
        params = {
            "componentKeys": project_key,
            "severities": sev,
            "ps": 1,  # ไม่ต้องดึงรายละเอียดทั้งหมด เอาแค่ total
        }
        resp = requests.get(url, params=params, auth=(token, ""))
        resp.raise_for_status()
        counts[sev] = resp.json().get("total", 0)
    return counts


def fetch_top_issues(host, token, project_key, limit=15):
    """ดึงรายการ issues ที่ severity สูงสุดมาแสดงเป็นตัวอย่าง"""
    url = f"{host}/api/issues/search"
    params = {
        "componentKeys": project_key,
        "ps": limit,
        "s": "SEVERITY",
        "asc": "false",
    }
    resp = requests.get(url, params=params, auth=(token, ""))
    resp.raise_for_status()
    return resp.json().get("issues", [])


# ---------------------------------------------------------------------------
# ฟังก์ชันสร้าง PDF
# ---------------------------------------------------------------------------

def rating_text(value):
    return RATING_LABEL.get(str(value), str(value))


def build_pdf(output_path, project_name, project_key, host, measures, sev_counts, top_issues):
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleTH", parent=styles["Title"], fontSize=20)
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"], spaceBefore=14, spaceAfter=6)
    normal = styles["Normal"]

    elements = []

    # --- หน้าปก / หัวรายงาน ---
    elements.append(Paragraph("SonarQube Analysis Report", title_style))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(f"Project: {project_name} ({project_key})", styles["Heading3"]))
    elements.append(Paragraph(f"Server: {host}", normal))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal))
    elements.append(Spacer(1, 0.5 * cm))

    # --- Quality Gate ---
    gate_status = measures.get("alert_status", "N/A")
    gate_color = colors.HexColor("#2e7d32") if gate_status == "OK" else colors.HexColor("#c62828")
    gate_label = "PASSED" if gate_status == "OK" else "FAILED" if gate_status == "ERROR" else gate_status
    gate_table = Table([[f"Quality Gate: {gate_label}"]], colWidths=[17 * cm])
    gate_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), gate_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(gate_table)
    elements.append(Spacer(1, 0.6 * cm))

    # --- ตารางตัวชี้วัดหลัก ---
    elements.append(Paragraph("สรุปตัวชี้วัดหลัก (Key Metrics)", h2_style))
    metric_rows = [["ตัวชี้วัด", "ค่า"]]
    for key in ["bugs", "vulnerabilities", "security_hotspots", "code_smells",
                "coverage", "duplicated_lines_density", "ncloc"]:
        label = METRIC_TH_LABEL.get(key, key)
        value = measures.get(key, "-")
        metric_rows.append([label, str(value)])
    for key in ["reliability_rating", "security_rating", "sqale_rating"]:
        label = METRIC_TH_LABEL.get(key, key)
        value = rating_text(measures.get(key, "-"))
        metric_rows.append([label, value])

    metric_table = Table(metric_rows, colWidths=[10 * cm, 7 * cm])
    metric_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b3e99")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(metric_table)
    elements.append(Spacer(1, 0.6 * cm))

    # --- ตาราง Issues แยกตาม Severity ---
    elements.append(Paragraph("จำนวน Issues แยกตาม Severity", h2_style))
    sev_rows = [["Severity", "จำนวน"]]
    for sev in SEVERITY_ORDER:
        sev_rows.append([sev, str(sev_counts.get(sev, 0))])
    sev_table = Table(sev_rows, colWidths=[10 * cm, 7 * cm])
    sev_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b3e99")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(sev_table)
    elements.append(Spacer(1, 0.6 * cm))

    # --- ตัวอย่าง Issues ---
    elements.append(PageBreak())
    elements.append(Paragraph(f"ตัวอย่าง Issues (Top {len(top_issues)} เรียงตาม Severity)", h2_style))
    issue_rows = [["Severity", "Type", "File", "Message"]]
    for issue in top_issues:
        component = issue.get("component", "").split(":")[-1]
        message = issue.get("message", "")
        if len(message) > 80:
            message = message[:77] + "..."
        issue_rows.append([
            issue.get("severity", "-"),
            issue.get("type", "-"),
            component,
            message,
        ])
    issue_table = Table(issue_rows, colWidths=[2.2 * cm, 2.5 * cm, 5 * cm, 7.3 * cm])
    issue_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b3e99")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(issue_table)
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(
        "หมายเหตุ: รายงานนี้สร้างจาก SonarQube Web API เพื่อวัตถุประสงค์ทางการศึกษา "
        "ดูรายละเอียดฉบับสมบูรณ์และคำแนะนำการแก้ไขได้ที่หน้า Dashboard บนเว็บ SonarQube",
        ParagraphStyle("note", parent=normal, fontSize=8, textColor=colors.grey),
    ))

    doc.build(elements)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="สร้างรายงาน PDF จากผลสแกน SonarQube")
    parser.add_argument("--host", required=True, help="URL ของ SonarQube เช่น http://localhost:9000")
    parser.add_argument("--project", required=True, help="Project Key เช่น juice-shop-demo")
    parser.add_argument("--token", required=True, help="SonarQube Analysis/User Token")
    parser.add_argument("--output", default=None, help="ชื่อไฟล์ PDF ผลลัพธ์ (default: <project>_report.pdf)")
    parser.add_argument("--top", type=int, default=15, help="จำนวนตัวอย่าง issues ที่จะแสดง (default 15)")
    args = parser.parse_args()

    host = args.host.rstrip("/")
    output = args.output or f"{args.project}_report.pdf"

    try:
        print("กำลังดึงข้อมูล measures ...")
        measures, project_name = fetch_measures(host, args.token, args.project)

        print("กำลังดึงข้อมูล issues แยกตาม severity ...")
        sev_counts = fetch_issues_by_severity(host, args.token, args.project)

        print(f"กำลังดึงตัวอย่าง issues (top {args.top}) ...")
        top_issues = fetch_top_issues(host, args.token, args.project, args.top)

        print(f"กำลังสร้างไฟล์ PDF: {output}")
        build_pdf(output, project_name, args.project, host, measures, sev_counts, top_issues)

        print(f"เสร็จสิ้น! สร้างรายงานที่ {output}")

    except requests.exceptions.HTTPError as e:
        print(f"เกิดข้อผิดพลาดในการเรียก API: {e}", file=sys.stderr)
        print("ตรวจสอบว่า Token ถูกต้อง และ Project Key มีอยู่จริง", file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"ไม่สามารถเชื่อมต่อไปยัง {host} ได้ ตรวจสอบว่า SonarQube กำลังรันอยู่", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
