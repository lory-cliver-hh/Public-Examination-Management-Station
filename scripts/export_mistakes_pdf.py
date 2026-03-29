import json
import os
import sys
from collections import Counter
from html import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_RIGHT_MARGIN = 18 * mm
TOP_MARGIN = 18 * mm
BOTTOM_MARGIN = 16 * mm
MAX_IMAGE_HEIGHT = 160 * mm


def register_fonts():
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))


def build_styles():
    base_styles = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "TitleCN",
            parent=base_styles["Title"],
            fontName="STSong-Light",
            fontSize=23,
            leading=30,
            textColor=colors.HexColor("#203449"),
            spaceAfter=9 * mm,
        ),
        "heading": ParagraphStyle(
            "HeadingCN",
            parent=base_styles["Heading2"],
            fontName="STSong-Light",
            fontSize=15,
            leading=21,
            textColor=colors.HexColor("#203449"),
            spaceAfter=4 * mm,
        ),
        "body": ParagraphStyle(
            "BodyCN",
            parent=base_styles["BodyText"],
            fontName="STSong-Light",
            fontSize=10.5,
            leading=17,
            textColor=colors.HexColor("#1F2C25"),
            spaceAfter=2.5 * mm,
        ),
        "meta": ParagraphStyle(
            "MetaCN",
            parent=base_styles["BodyText"],
            fontName="STSong-Light",
            fontSize=9.2,
            leading=14,
            textColor=colors.HexColor("#677064"),
            spaceAfter=1.8 * mm,
        ),
    }


def format_export_time(value):
    normalized = value.replace("Z", "+00:00")
    try:
        from datetime import datetime

        dt = datetime.fromisoformat(normalized)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return value


def to_paragraph_text(value):
    return escape(value).replace("\n", "<br/>")


def create_image_flowable(image_path, max_width, max_height):
    image_reader = ImageReader(image_path)
    image_width, image_height = image_reader.getSize()

    scale = min(max_width / image_width, max_height / image_height, 1)
    target_width = image_width * scale
    target_height = image_height * scale

    return Image(image_path, width=target_width, height=target_height)


def render_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D8CCB4"))
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_RIGHT_MARGIN, BOTTOM_MARGIN - 4 * mm, PAGE_WIDTH - LEFT_RIGHT_MARGIN, BOTTOM_MARGIN - 4 * mm)
    canvas.setFont("STSong-Light", 9)
    canvas.setFillColor(colors.HexColor("#677064"))
    canvas.drawString(LEFT_RIGHT_MARGIN, BOTTOM_MARGIN - 9 * mm, "公考错题本导出")
    canvas.drawRightString(PAGE_WIDTH - LEFT_RIGHT_MARGIN, BOTTOM_MARGIN - 9 * mm, f"第 {canvas.getPageNumber()} 页")
    canvas.restoreState()


def build_cover_table(records):
    subject_counter = Counter(record["subject"] for record in records)
    rows = [["分类", "数量"]]
    rows.extend([[subject, str(count)] for subject, count in sorted(subject_counter.items(), key=lambda item: item[0])])

    table = Table(rows, colWidths=[112 * mm, 24 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("LEADING", (0, 0), (-1, -1), 14),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFE5D4")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#203449")),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#1F2C25")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8CCB4")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF5EC")]),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def build_story(manifest):
    styles = build_styles()
    story = []
    records = manifest["records"]
    export_time_label = format_export_time(manifest["exportedAt"])

    story.append(Paragraph(to_paragraph_text(manifest["title"]), styles["title"]))
    story.append(Paragraph(f"导出范围：{to_paragraph_text(manifest['scopeLabel'])}", styles["body"]))
    story.append(Paragraph(f"导出时间：{to_paragraph_text(export_time_label)}", styles["body"]))
    story.append(Paragraph(f"截图数量：{len(records)} 张", styles["body"]))
    story.append(Paragraph("默认导出目录：output/pdf/mistake-notebooks", styles["meta"]))
    story.append(Spacer(1, 4 * mm))
    story.append(build_cover_table(records))

    for index, record in enumerate(records, start=1):
        story.append(PageBreak())
        story.append(
            Paragraph(
                f"{index}. {to_paragraph_text(record['subject'])} / {to_paragraph_text(record['moduleName'])}",
                styles["heading"],
            )
        )
        story.append(Paragraph(f"刷题日期：{to_paragraph_text(record['date'])}", styles["meta"]))
        story.append(Paragraph(f"录入时间：{to_paragraph_text(format_export_time(record['createdAt']))}", styles["meta"]))
        story.append(Paragraph(f"原始文件：{to_paragraph_text(record['fileName'])}", styles["meta"]))
        story.append(Paragraph(f"备注：{to_paragraph_text(record['note'] or '未填写')}", styles["body"]))
        story.append(Spacer(1, 2 * mm))

        if os.path.exists(record["imagePath"]):
            story.append(
                create_image_flowable(
                    record["imagePath"],
                    PAGE_WIDTH - LEFT_RIGHT_MARGIN * 2,
                    MAX_IMAGE_HEIGHT,
                )
            )
        else:
            story.append(Paragraph("截图文件缺失，未能写入 PDF。", styles["body"]))

    return story


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: export_mistakes_pdf.py <manifest.json> <output.pdf>")

    manifest_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(manifest_path, "r", encoding="utf-8") as file:
        manifest = json.load(file)

    if not manifest.get("records"):
        raise SystemExit("No mistake records to export.")

    register_fonts()

    document = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_RIGHT_MARGIN,
        rightMargin=LEFT_RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=manifest["title"],
        author="公考管理系统",
    )
    story = build_story(manifest)
    document.build(story, onFirstPage=render_footer, onLaterPages=render_footer)


if __name__ == "__main__":
    main()
