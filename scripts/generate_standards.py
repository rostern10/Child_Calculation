from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT.parent / "儿童营养评估上系统表格内容"
OUTPUT_FILE = ROOT / "data" / "standards-data.mjs"


CELL_RE = re.compile(r"<t[dh]([^>]*)>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)
ROW_RE = re.compile(r"<tr>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r'(\w+)="([^"]+)"')
TABLE_RE = re.compile(r"<table>.*?</table>", re.IGNORECASE | re.DOTALL)


def normalize_cell(value: str) -> str:
    value = value.replace("$2^a$", "2a").replace("$2^b$", "2b")
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = value.replace("\xa0", " ").replace("　", " ").replace("\u200b", "")
    value = value.strip()
    value = re.sub(r"\s+", "", value)
    return value


def parse_table(table_html: str) -> list[list[str]]:
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
            text = normalize_cell(cell_html)

            for offset in range(colspan):
                row.append(text)
                if rowspan > 1:
                    pending[col_index + offset] = [text, rowspan - 1]

            col_index += colspan

        col_index = fill_pending(row, col_index)
        rows.append(row)

    return rows


def sd_map(values: list[str]) -> dict[str, float]:
    return {
        "-3": float(values[0]),
        "-2": float(values[1]),
        "-1": float(values[2]),
        "0": float(values[3]),
        "1": float(values[4]),
        "2": float(values[5]),
        "3": float(values[6]),
    }


def age_key(months: int, variant: str | None = None) -> str:
    return f"{months}{variant}" if variant else str(months)


def age_label(months: int, variant: str | None = None) -> str:
    years = months // 12
    remain_months = months % 12
    if remain_months == 0:
        base = f"{years}岁" if years else "0月"
    elif years == 0:
        base = f"{months}月"
    else:
        base = f"{years}岁{remain_months}月"
    if variant:
        return f"{base}({variant})"
    return base


def parse_age_text(text: str) -> int | None:
    year_month_match = re.fullmatch(r"(\d+)岁(\d+)月", text)
    if year_month_match:
        years = int(year_month_match.group(1))
        months = int(year_month_match.group(2))
        return years * 12 + months

    year_match = re.fullmatch(r"(\d+)岁", text)
    if year_match:
        return int(year_match.group(1)) * 12

    return None


def extract_under3_age_rows(rows: list[list[str]]) -> dict[str, list[dict[str, object]]]:
    result = {"male": [], "female": []}
    current_sex: str | None = None

    for raw_row in rows:
        row = [normalize_cell(cell) for cell in raw_row]
        if len(row) < 9:
            continue

        if len(row) >= 3 and row[2].startswith("男童"):
            current_sex = "male"
            continue
        if len(row) >= 3 and row[2].startswith("女童"):
            current_sex = "female"
            continue

        if row[0] in {"年龄", "岁"} or row[1] in {"年龄", "月"}:
            continue

        if current_sex is None or not row[1].isdigit():
            continue

        months = int(row[1])
        variant = row[0] if row[0] in {"2a", "2b"} else None
        result[current_sex].append(
            {
                "key": age_key(months, variant),
                "months": months,
                "variant": variant,
                "ageLabel": age_label(months, variant),
                "sd": sd_map(row[2:9]),
            }
        )

    return result


def extract_over3_age_rows(rows: list[list[str]]) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for raw_row in rows:
        row = [normalize_cell(cell) for cell in raw_row]
        if len(row) < 8:
            continue
        if row[0] == "年龄" or row[0].startswith("注"):
            continue

        months = parse_age_text(row[0])
        if months is None:
            continue

        result.append(
            {
                "key": age_key(months),
                "months": months,
                "variant": None,
                "ageLabel": row[0],
                "sd": sd_map(row[1:8]),
            }
        )

    return result


def extract_under3_size_weight_rows(rows: list[list[str]]) -> dict[str, list[dict[str, object]]]:
    result = {"male": [], "female": []}
    current_sex: str | None = None

    for raw_row in rows:
        row = [normalize_cell(cell) for cell in raw_row]
        if not row:
            continue

        if row[0] == "身长cm" and any("男童" in cell for cell in row):
            current_sex = "male"
            continue
        if row[0] == "身长cm" and any("女童" in cell for cell in row):
            current_sex = "female"
            continue
        if row[0] in {"身长cm", "-3SD"} or row[0].startswith("注"):
            continue
        if current_sex is None:
            continue

        try:
            measure_cm = float(row[0])
        except ValueError:
            continue

        result[current_sex].append(
            {
                "measureCm": measure_cm,
                "measureLabel": f"{measure_cm:.1f}cm",
                "sd": sd_map(row[1:8]),
            }
        )

    return result


def extract_over3_size_weight_rows(rows: list[list[str]]) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for raw_row in rows:
        row = [normalize_cell(cell) for cell in raw_row]
        if len(row) < 8:
            continue
        if row[0] == "身高cm" or row[0].startswith("注"):
            continue
        try:
            measure_cm = float(row[0])
        except ValueError:
            continue

        result.append(
            {
                "measureCm": measure_cm,
                "measureLabel": f"{measure_cm:.1f}cm" if measure_cm % 1 else f"{int(measure_cm)}cm",
                "sd": sd_map(row[1:8]),
            }
        )

    return result


def read_tables(filename: str) -> list[list[list[str]]]:
    text = (SOURCE_DIR / filename).read_text(encoding="utf-8")
    return [parse_table(table_html) for table_html in TABLE_RE.findall(text)]


def build_age_metric(filename: str) -> dict[str, list[dict[str, object]]]:
    tables = read_tables(filename)
    if len(tables) < 3:
        raise ValueError(f"{filename} 中未找到完整的 3 张表。")

    under3 = extract_under3_age_rows(tables[0])
    male_over3 = extract_over3_age_rows(tables[1])
    female_over3 = extract_over3_age_rows(tables[2])

    return {
        "male": under3["male"] + male_over3,
        "female": under3["female"] + female_over3,
    }


def build_size_weight_metric(filename: str) -> dict[str, dict[str, list[dict[str, object]]]]:
    tables = read_tables(filename)
    if len(tables) < 3:
        raise ValueError(f"{filename} 中未找到完整的 3 张表。")

    under3 = extract_under3_size_weight_rows(tables[0])
    male_over3 = extract_over3_size_weight_rows(tables[1])
    female_over3 = extract_over3_size_weight_rows(tables[2])

    return {
        "male": {"under3": under3["male"], "over3": male_over3},
        "female": {"under3": under3["female"], "over3": female_over3},
    }


def build_payload() -> dict[str, object]:
    data = {
        "meta": {
            "source": "WS/T 423-2022 衍生整理数据",
            "notes": [
                "0-3 岁数据来自 4 份独立标准差表。",
                "3 岁以上数据来自附录 B 对应表。",
                "当前前端版本用于静态单页查表和结果演示。",
            ],
        },
        "metrics": {
            "ageWeight": build_age_metric("附录B-7岁以下年龄别体重标准差数值表.md"),
            "ageHeight": build_age_metric("附录B-7岁以下年龄别身长身高标准差数值表.md"),
            "weightForLengthHeight": build_size_weight_metric("附录B-7岁以下身长身高别体重标准差数值表.md"),
            "ageBmi": build_age_metric("附录B-7岁以下年龄别BMI标准差数值表.md"),
        },
    }

    max_months = max(
        record["months"]
        for metric_name in ("ageWeight", "ageHeight", "ageBmi")
        for sex in ("male", "female")
        for record in data["metrics"][metric_name][sex]
    )
    data["meta"]["maxSupportedMonths"] = max_months
    return data


def main() -> None:
    payload = build_payload()
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    module_text = f"export const STANDARDS = {json_text};\n\nexport default STANDARDS;\n"
    OUTPUT_FILE.write_text(module_text, encoding="utf-8")
    print(f"Generated {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
