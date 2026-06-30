from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "appendix"
OUTPUT_FILE = ROOT / "data" / "dietary-intake-data.mjs"

CELL_RE = re.compile(r"<t[dh]([^>]*)>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)
ROW_RE = re.compile(r"<tr>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r'(\w+)="([^"]+)"')
TABLE_RE = re.compile(r"<table>.*?</table>", re.IGNORECASE | re.DOTALL)

PREGNANCY_STAGE_MAP = {
    "孕早期": "pregEarly",
    "孕中期": "pregMid",
    "孕晚期": "pregLate",
    "乳母": "lactating",
}

AGE_BRACKETS = [
    ("0", "0岁~", 0.0),
    ("0.5", "0.5岁~", 0.5),
    ("1", "1岁~", 1.0),
    ("2", "2岁~", 2.0),
    ("3", "3岁~", 3.0),
    ("4", "4岁~", 4.0),
    ("5", "5岁~", 5.0),
    ("6", "6岁~", 6.0),
    ("7", "7岁~", 7.0),
    ("8", "8岁~", 8.0),
    ("9", "9岁~", 9.0),
    ("10", "10岁~", 10.0),
    ("11", "11岁~", 11.0),
    ("12", "12岁~", 12.0),
    ("15", "15岁~", 15.0),
    ("18", "18岁~", 18.0),
    ("30", "30岁~", 30.0),
    ("50", "50岁~", 50.0),
    ("65", "65岁~", 65.0),
    ("75", "75岁~", 75.0),
]


def normalize_html_cell(value: str) -> str:
    value = value.replace("<br/>", "\n").replace("<br />", "\n").replace("<br>", "\n")
    value = re.sub(r"<sup>(.*?)</sup>", r"^\1", value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = value.replace("\xa0", " ").replace("　", " ").replace("\u200b", "")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_text(value: str) -> str:
    value = html.unescape(value)
    value = value.replace("\xa0", " ").replace("　", " ").replace("\u200b", "")
    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    return value


def clean_display_value(value: str) -> str:
    text = normalize_text(value)
    text = text.replace("（", "(").replace("）", ")")
    text = text.replace("～", "~").replace("—", "—")
    text = text.replace("；", " / ")
    text = re.sub(r"\s*\^\s*([abcd])", r"^\1", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_html_table(table_html: str) -> list[list[str]]:
    rows: list[list[str]] = []
    pending: dict[int, list[object]] = {}

    def fill_pending(row: list[str], col_index: int) -> int:
        while col_index in pending:
            text, remaining = pending[col_index]
            row.append(text)  # type: ignore[arg-type]
            if remaining == 1:
                del pending[col_index]
            else:
                pending[col_index][1] = remaining - 1
            col_index += 1
        return col_index

    for row_html in ROW_RE.findall(table_html):
        row: list[str] = []
        col_index = 0
        col_index = fill_pending(row, col_index)

        for attrs_text, cell_html in CELL_RE.findall(row_html):
            col_index = fill_pending(row, col_index)
            attrs = {key.lower(): value for key, value in ATTR_RE.findall(attrs_text)}
            colspan = int(attrs.get("colspan", "1"))
            rowspan = int(attrs.get("rowspan", "1"))
            text = normalize_html_cell(cell_html)

            for offset in range(colspan):
                row.append(text)
                if rowspan > 1:
                    pending[col_index + offset] = [text, rowspan - 1]

            col_index += colspan

        col_index = fill_pending(row, col_index)
        rows.append(row)

    return rows


def parse_markdown_tables(text: str) -> list[list[list[str]]]:
    tables: list[list[list[str]]] = []
    block: list[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            block.append(stripped)
            continue

        if block:
            tables.append(parse_markdown_block(block))
            block = []

    if block:
        tables.append(parse_markdown_block(block))

    return tables


def parse_markdown_block(lines: list[str]) -> list[list[str]]:
    rows: list[list[str]] = []
    for index, line in enumerate(lines):
        parts = [normalize_text(part) for part in line.strip("|").split("|")]
        if index == 1 and all(re.fullmatch(r":?-{3,}:?", part.replace(" ", "")) for part in parts):
            continue
        rows.append(parts)
    return rows


def read_markdown_tables(filename: str) -> list[list[list[str]]]:
    text = (SOURCE_DIR / filename).read_text(encoding="utf-8")
    return parse_markdown_tables(text)


def read_html_tables(filename: str) -> list[list[list[str]]]:
    text = (SOURCE_DIR / filename).read_text(encoding="utf-8")
    return [parse_html_table(table_html) for table_html in TABLE_RE.findall(text)]


def stage_key(label: str) -> str:
    text = normalize_text(label).replace(" ", "")
    if text in PREGNANCY_STAGE_MAP:
        return PREGNANCY_STAGE_MAP[text]

    match = re.match(r"(\d+(?:\.\d+)?)岁", text)
    if match:
        return match.group(1)

    raise ValueError(f"无法识别年龄/阶段：{label}")


def stage_label_from_key(key: str) -> str:
    for bracket_key, label, _ in AGE_BRACKETS:
        if bracket_key == key:
            return label
    reverse_map = {value: name for name, value in PREGNANCY_STAGE_MAP.items()}
    return reverse_map[key]


def build_energy() -> dict[str, dict[str, dict[str, str]]]:
    tables = read_markdown_tables("appendix-3-1-eer.md")
    result: dict[str, dict[str, dict[str, str]]] = {"male": {}, "female": {}}
    for sex, table in zip(("male", "female"), tables):
        for row in table[1:]:
            key = stage_key(row[0])
            result[sex][key] = {
                "label": stage_label_from_key(key),
                "pal1": clean_display_value(row[1]),
                "pal2": clean_display_value(row[2]),
                "pal3": clean_display_value(row[3]),
            }
    return result


def build_protein() -> dict[str, dict[str, object]]:
    table = read_markdown_tables("appendix-3-2-protein.md")[0]
    result: dict[str, dict[str, object]] = {}
    for row in table[1:]:
        key = stage_key(row[0])
        result[key] = {
            "label": stage_label_from_key(key),
            "ear": {"male": clean_display_value(row[1]), "female": clean_display_value(row[2])},
            "rni": {"male": clean_display_value(row[3]), "female": clean_display_value(row[4])},
            "amdr": clean_display_value(row[5]),
        }
    return result


def build_fat() -> dict[str, dict[str, str]]:
    rows = read_html_tables("3-3.md")[0]
    result: dict[str, dict[str, str]] = {}
    for row in rows[2:]:
        key = stage_key(row[0])
        result[key] = {
            "label": stage_label_from_key(key),
            "totalFat": clean_display_value(row[1]),
            "saturatedFat": clean_display_value(row[2]),
            "n6Polyunsaturated": clean_display_value(row[3]),
            "n3Polyunsaturated": clean_display_value(row[4]),
            "linoleicAcid": clean_display_value(row[5]),
            "alphaLinolenicAcid": clean_display_value(row[6]),
            "epaDha": clean_display_value(row[7]),
        }
    return result


def build_carbs() -> dict[str, dict[str, str]]:
    table = read_markdown_tables("appendix-3-4-carbohydrates.md")[0]
    result: dict[str, dict[str, str]] = {}
    for row in table[1:]:
        key = stage_key(row[0])
        result[key] = {
            "label": stage_label_from_key(key),
            "ear": clean_display_value(row[1]),
            "amdr": clean_display_value(row[2]),
            "fiber": clean_display_value(row[3]),
            "addedSugar": clean_display_value(row[4]),
        }
    return result


def build_amdr() -> dict[str, dict[str, str]]:
    table = read_markdown_tables("appendix-3-5-amdr.md")[0]
    result: dict[str, dict[str, str]] = {}
    for row in table[1:]:
        key = stage_key(row[0])
        result[key] = {
            "label": stage_label_from_key(key),
            "carbohydrate": clean_display_value(row[1]),
            "fat": clean_display_value(row[2]),
            "protein": clean_display_value(row[3]),
        }
    return result


def build_minerals() -> dict[str, dict[str, object]]:
    rows = read_html_tables("3-7.md")[0]
    result: dict[str, dict[str, object]] = {}
    for row in rows[3:]:
        key = stage_key(row[0])
        female_iron = clean_display_value(row[8])
        if key == "50":
            female_iron = "10（无月经） / 18（有月经）"

        result[key] = {
            "label": stage_label_from_key(key),
            "calcium": clean_display_value(row[1]),
            "phosphorus": clean_display_value(row[2]),
            "potassium": clean_display_value(row[3]),
            "sodium": clean_display_value(row[4]),
            "magnesium": clean_display_value(row[5]),
            "chloride": clean_display_value(row[6]),
            "iron": {"male": clean_display_value(row[7]), "female": female_iron},
            "iodine": clean_display_value(row[9]),
            "zinc": {"male": clean_display_value(row[10]), "female": clean_display_value(row[11])},
            "selenium": clean_display_value(row[12]),
            "copper": clean_display_value(row[13]),
            "fluoride": clean_display_value(row[14]),
            "chromium": {"male": clean_display_value(row[15]), "female": clean_display_value(row[16])},
            "manganese": {"male": clean_display_value(row[17]), "female": clean_display_value(row[18])},
            "molybdenum": clean_display_value(row[19]),
        }
    return result


def build_vitamins() -> dict[str, dict[str, object]]:
    table = read_markdown_tables("3-8.md")[0]
    result: dict[str, dict[str, object]] = {}
    for row in table[1:]:
        key = stage_key(row[0])
        result[key] = {
            "label": stage_label_from_key(key),
            "vitaminA": {"male": clean_display_value(row[1]), "female": clean_display_value(row[2])},
            "vitaminD": clean_display_value(row[3]),
            "vitaminE": clean_display_value(row[4]),
            "vitaminK": clean_display_value(row[5]),
            "vitaminB1": {"male": clean_display_value(row[6]), "female": clean_display_value(row[7])},
            "vitaminB2": {"male": clean_display_value(row[8]), "female": clean_display_value(row[9])},
            "niacin": {"male": clean_display_value(row[10]), "female": clean_display_value(row[11])},
            "vitaminB6": clean_display_value(row[12]),
            "folate": clean_display_value(row[13]),
            "vitaminB12": clean_display_value(row[14]),
            "pantothenicAcid": clean_display_value(row[15]),
            "biotin": clean_display_value(row[16]),
            "choline": {"male": clean_display_value(row[17]), "female": clean_display_value(row[18])},
            "vitaminC": clean_display_value(row[19]),
        }
    return result


def build_ul() -> dict[str, dict[str, str]]:
    rows = read_html_tables("3-10.md")[0]
    result: dict[str, dict[str, str]] = {}
    for row in rows[1:]:
        key = stage_key(row[0])
        result[key] = {
            "label": stage_label_from_key(key),
            "calcium": clean_display_value(row[1]),
            "phosphorus": clean_display_value(row[2]),
            "iron": clean_display_value(row[3]),
            "iodine": clean_display_value(row[4]),
            "zinc": clean_display_value(row[5]),
            "selenium": clean_display_value(row[6]),
            "copper": clean_display_value(row[7]),
            "fluoride": clean_display_value(row[8]),
            "manganese": clean_display_value(row[9]),
            "molybdenum": clean_display_value(row[10]),
            "vitaminA": clean_display_value(row[11]),
            "vitaminD": clean_display_value(row[12]),
            "vitaminE": clean_display_value(row[13]),
            "niacin": clean_display_value(row[14]),
            "nicotinamide": clean_display_value(row[15]),
            "vitaminB6": clean_display_value(row[16]),
            "folate": clean_display_value(row[17]),
            "choline": clean_display_value(row[18]),
            "vitaminC": clean_display_value(row[19]),
        }
    return result


def build_water() -> dict[str, dict[str, object]]:
    tables = read_markdown_tables("appendix-3-11-3-12-water-spl-ul.md")
    child_table = tables[0]
    adult_table = tables[1]
    adjustment_table = tables[2]

    common: dict[str, dict[str, str]] = {}
    for row in child_table[1:]:
        key = stage_key(row[0])
        common[key] = {
            "label": stage_label_from_key(key),
            "drinking": clean_display_value(row[1]),
            "total": clean_display_value(row[2]),
        }

    sex_specific: dict[str, dict[str, object]] = {}
    for row in adult_table[1:]:
        key = stage_key(row[0])
        sex_specific[key] = {
            "label": stage_label_from_key(key),
            "drinking": {"male": clean_display_value(row[1]), "female": clean_display_value(row[2])},
            "total": {"male": clean_display_value(row[3]), "female": clean_display_value(row[4])},
        }

    adjustment: dict[str, dict[str, str]] = {}
    for row in adjustment_table[1:]:
        key = stage_key(row[0])
        adjustment[key] = {
            "label": stage_label_from_key(key),
            "drinking": clean_display_value(row[1]),
            "total": clean_display_value(row[2]),
        }

    return {"common": common, "sexSpecific": sex_specific, "adjustment": adjustment}


def build_data() -> dict[str, object]:
    return {
        "meta": {
            "ageBrackets": [
                {"key": key, "label": label, "years": years}
                for key, label, years in AGE_BRACKETS
            ],
            "physiologicalStatus": [
                {"key": "ordinary", "label": "普通"},
                {"key": "pregEarly", "label": "孕早期"},
                {"key": "pregMid", "label": "孕中期"},
                {"key": "pregLate", "label": "孕晚期"},
                {"key": "lactating", "label": "乳母"},
            ],
            "palLevels": [
                {"key": "pal1", "label": "PAL I 低强度"},
                {"key": "pal2", "label": "PAL II 中等强度"},
                {"key": "pal3", "label": "PAL III 高强度"},
            ],
        },
        "energy": build_energy(),
        "protein": build_protein(),
        "fat": build_fat(),
        "carbs": build_carbs(),
        "amdr": build_amdr(),
        "minerals": build_minerals(),
        "vitamins": build_vitamins(),
        "ul": build_ul(),
        "water": build_water(),
    }


def main() -> None:
    data = build_data()
    OUTPUT_FILE.write_text(
        "const DIETARY_INTAKE_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2)
        + ";\n\nexport default DIETARY_INTAKE_DATA;\n",
        encoding="utf-8",
    )
    print(f"已生成 {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
