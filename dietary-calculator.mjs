import DIETARY_INTAKE_DATA from "./data/dietary-intake-data.mjs?v=20260625-01";

const SEX_LABELS = {
  male: "男",
  female: "女",
};

const STATUS_LABELS = {
  ordinary: "普通",
  pregEarly: "孕早期",
  pregMid: "孕中期",
  pregLate: "孕晚期",
  lactating: "乳母",
};

const PAL_LABELS = {
  pal1: "PAL I 低强度",
  pal2: "PAL II 中等强度",
  pal3: "PAL III 高强度",
};

const SPECIAL_STATUS_KEYS = ["pregEarly", "pregMid", "pregLate", "lactating"];
const AGE_BRACKETS = DIETARY_INTAKE_DATA.meta.ageBrackets.slice();
const AGE_BRACKET_MAP = AGE_BRACKETS.reduce(function buildMap(result, item) {
  result[item.key] = item;
  return result;
}, {});

const form = document.querySelector("#dietary-form");
const dateModeFields = document.querySelector("#date-mode-fields");
const bracketModeField = document.querySelector("#bracket-mode-field");
const birthDateInput = document.querySelector("#birth-date");
const evaluationDateInput = document.querySelector("#evaluation-date");
const birthYearSelect = document.querySelector("#birth-year");
const birthMonthSelect = document.querySelector("#birth-month");
const birthDaySelect = document.querySelector("#birth-day");
const evaluationYearSelect = document.querySelector("#evaluation-year");
const evaluationMonthSelect = document.querySelector("#evaluation-month");
const evaluationDaySelect = document.querySelector("#evaluation-day");
const ageBracketSelect = document.querySelector("#age-bracket");
const statusSelect = document.querySelector("#physiological-status");
const statusHelper = document.querySelector("#status-helper");
const palSelect = document.querySelector("#pal-level");
const weightInput = document.querySelector("#weight-kg");
const menstruationField = document.querySelector("#menstruation-field");
const menstruationSelect = document.querySelector("#menstruation-status");
const previewAge = document.querySelector("#preview-age");
const previewBracket = document.querySelector("#preview-bracket");
const errorBox = document.querySelector("#error-box");
const resultsSection = document.querySelector("#results-section");
const basicResult = document.querySelector("#basic-result");
const resultGroups = document.querySelector("#result-groups");
const resetButton = document.querySelector("#reset-button");

function pad(value) {
  const text = String(value);
  return text.length >= 2 ? text : "0" + text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function replaceChar(char) {
    if (char === "&") {
      return "&amp;";
    }
    if (char === "<") {
      return "&lt;";
    }
    if (char === ">") {
      return "&gt;";
    }
    if (char === '"') {
      return "&quot;";
    }
    return "&#39;";
  });
}

function todayDate() {
  return new Date(2026, 5, 15);
}

function formatSlashDate(date) {
  return date.getFullYear() + "/" + pad(date.getMonth() + 1) + "/" + pad(date.getDate());
}

function parseDateValue(value, fieldLabel) {
  if (!value) {
    throw new Error("未填写" + fieldLabel + "。");
  }

  const match = String(value).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) {
    throw new Error(fieldLabel + "格式不正确。");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(fieldLabel + "格式不正确。");
  }

  return date;
}

function calculateAgeInfo(birthDate, evaluationDate) {
  let months =
    (evaluationDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (evaluationDate.getMonth() - birthDate.getMonth());

  if (evaluationDate.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    throw new Error("评估日期不能早于出生日期。");
  }

  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  return {
    months,
    years,
    remainMonths,
    yearsFloat: months / 12,
    text: years > 0 ? years + " 岁 " + remainMonths + " 月" : remainMonths + " 月",
  };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function buildRange(start, end) {
  const result = [];
  for (let value = start; value <= end; value += 1) {
    result.push(value);
  }
  return result;
}

function setSelectOptions(select, values, placeholder, suffix, selectedValue) {
  let options = "";

  if (placeholder) {
    options += '<option value="">' + placeholder + "</option>";
  }

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const selected = String(value) === String(selectedValue) ? ' selected="selected"' : "";
    options += '<option value="' + value + '"' + selected + ">" + value + suffix + "</option>";
  }

  select.innerHTML = options;
}

function setDayOptions(select, yearValue, monthValue, selectedValue) {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const count = year && month ? daysInMonth(year, month) : 31;
  setSelectOptions(select, buildRange(1, count), "日", "日", selectedValue);
}

function syncDateValue(yearSelect, monthSelect, daySelect, hiddenInput) {
  const selectedDay = daySelect.value;
  setDayOptions(daySelect, yearSelect.value, monthSelect.value, selectedDay);

  if (!yearSelect.value || !monthSelect.value || !daySelect.value) {
    hiddenInput.value = "";
    updatePreview();
    return;
  }

  hiddenInput.value = yearSelect.value + "/" + pad(monthSelect.value) + "/" + pad(daySelect.value);
  updatePreview();
}

function bindDateGroup(yearSelect, monthSelect, daySelect, hiddenInput) {
  function refresh() {
    syncDateValue(yearSelect, monthSelect, daySelect, hiddenInput);
  }

  yearSelect.addEventListener("change", refresh);
  monthSelect.addEventListener("change", refresh);
  daySelect.addEventListener("change", refresh);
}

function fillDateGroup(yearSelect, monthSelect, daySelect, hiddenInput, date, keepBlank) {
  setSelectOptions(yearSelect, buildRange(1950, 2030), "", "年", keepBlank ? 2000 : date.getFullYear());
  setSelectOptions(monthSelect, buildRange(1, 12), "月", "月", keepBlank ? "" : date.getMonth() + 1);
  setDayOptions(daySelect, yearSelect.value, monthSelect.value, keepBlank ? "" : date.getDate());

  if (keepBlank) {
    hiddenInput.value = "";
    return;
  }

  yearSelect.value = String(date.getFullYear());
  monthSelect.value = String(date.getMonth() + 1);
  setDayOptions(daySelect, yearSelect.value, monthSelect.value, date.getDate());
  daySelect.value = String(date.getDate());
  hiddenInput.value = formatSlashDate(date);
}

function getInputMode() {
  const checked = document.querySelector('input[name="inputMode"]:checked');
  return checked ? checked.value : "date";
}

function getSex() {
  const checked = document.querySelector('input[name="sex"]:checked');
  return checked ? checked.value : "male";
}

function isSpecialStatus(status) {
  return SPECIAL_STATUS_KEYS.indexOf(status) !== -1;
}

function parseBracketNumber(key) {
  return Number(key);
}

function pickSummaryBracket(ageYears) {
  let matched = AGE_BRACKETS[0];
  for (let index = 0; index < AGE_BRACKETS.length; index += 1) {
    if (ageYears >= AGE_BRACKETS[index].years) {
      matched = AGE_BRACKETS[index];
    }
  }
  return matched;
}

function numericKeysFromTable(table) {
  return Object.keys(table)
    .filter(function filterKey(key) {
      return !isNaN(Number(key));
    })
    .sort(function sortKeys(left, right) {
      return Number(left) - Number(right);
    });
}

function pickAvailableRow(table, ageYears) {
  const keys = numericKeysFromTable(table);
  let matchedKey = keys[0];

  for (let index = 0; index < keys.length; index += 1) {
    if (ageYears >= Number(keys[index])) {
      matchedKey = keys[index];
    }
  }

  return {
    key: matchedKey,
    row: table[matchedKey],
  };
}

function decimalPlaces(text) {
  const match = String(text).match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

function trimNumber(value, precision) {
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function parseLeadingNumber(text) {
  const cleaned = String(text).replace(/\s+/g, "");
  const match = cleaned.match(/^[<>≤≥]?\+?(-?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseRange(text) {
  const cleaned = String(text).replace(/\s+/g, "");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)~(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  return {
    start: Number(match[1]),
    end: Number(match[2]),
    decimals: Math.max(decimalPlaces(match[1]), decimalPlaces(match[2])),
  };
}

function addEnergyValue(base, increment) {
  const baseMatch = String(base).match(/([0-9.]+)\s*MJ\/.*?([0-9.]+)\s*kcal\//i);
  const incrementMatch = String(increment).match(/([0-9.]+)\s*MJ\/.*?([0-9.]+)\s*kcal\//i);

  if (!baseMatch || !incrementMatch) {
    return base;
  }

  const mjPrecision = Math.max(decimalPlaces(baseMatch[1]), decimalPlaces(incrementMatch[1]));
  const kcalPrecision = Math.max(decimalPlaces(baseMatch[2]), decimalPlaces(incrementMatch[2]));
  const mj = Number(baseMatch[1]) + Number(incrementMatch[1]);
  const kcal = Number(baseMatch[2]) + Number(incrementMatch[2]);

  return (
    trimNumber(mj, mjPrecision) +
    " MJ/d，" +
    trimNumber(kcal, kcalPrecision) +
    " kcal/d"
  );
}

function addIncrement(base, incrementValue) {
  const baseText = String(base || "").trim();
  const incrementText = String(incrementValue || "").trim();

  if (!baseText || baseText === "—") {
    return incrementText ? "+" + incrementText : baseText;
  }

  if (baseText.indexOf("MJ/d") !== -1 && incrementText.indexOf("MJ/d") !== -1) {
    return addEnergyValue(baseText, incrementText);
  }

  const range = parseRange(baseText);
  const incrementNumber = parseLeadingNumber(incrementText);
  if (range && incrementNumber !== null) {
    return (
      trimNumber(range.start + incrementNumber, range.decimals) +
      "~" +
      trimNumber(range.end + incrementNumber, range.decimals)
    );
  }

  const baseNumber = parseLeadingNumber(baseText);
  if (baseNumber !== null && incrementNumber !== null) {
    const precision = Math.max(decimalPlaces(baseText), decimalPlaces(incrementText));
    return trimNumber(baseNumber + incrementNumber, precision);
  }

  return baseText + " + " + incrementText;
}

function mergeScalar(baseValue, specialValue) {
  if (specialValue === undefined || specialValue === null || specialValue === "") {
    return baseValue;
  }

  const specialText = String(specialValue).trim();
  if (!specialText || specialText === "—") {
    return baseValue;
  }

  if (specialText.charAt(0) === "+") {
    return addIncrement(baseValue, specialText.slice(1));
  }

  return specialText;
}

function mergeRow(baseRow, specialRow) {
  const result = {};
  const keys = Object.keys(baseRow);

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "label") {
      result[key] = baseRow[key];
      continue;
    }

    const baseValue = baseRow[key];
    const specialValue = specialRow ? specialRow[key] : undefined;

    if (
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      result[key] = {};
      const childKeys = Object.keys(baseValue);
      for (let childIndex = 0; childIndex < childKeys.length; childIndex += 1) {
        const childKey = childKeys[childIndex];
        result[key][childKey] = mergeScalar(
          baseValue[childKey],
          specialValue ? specialValue[childKey] : undefined
        );
      }
      continue;
    }

    result[key] = mergeScalar(baseValue, specialValue);
  }

  return result;
}

function resolveTableRow(table, ageYears, status) {
  const base = pickAvailableRow(table, ageYears);
  if (!isSpecialStatus(status) || !table[status]) {
    return {
      matchedKey: base.key,
      matchedLabel: base.row.label,
      row: base.row,
    };
  }

  return {
    matchedKey: base.key,
    matchedLabel: base.row.label,
    row: mergeRow(base.row, table[status]),
  };
}

function selectWaterValues(ageYears, sex, status) {
  const water = DIETARY_INTAKE_DATA.water;
  let baseRow;
  let matchedLabel = "";

  if (ageYears < 12) {
    const commonBase = pickAvailableRow(water.common, ageYears);
    baseRow = {
      drinking: commonBase.row.drinking,
      total: commonBase.row.total,
    };
    matchedLabel = commonBase.row.label;
  } else {
    const sexBase = pickAvailableRow(water.sexSpecific, ageYears);
    baseRow = {
      drinking: sexBase.row.drinking[sex],
      total: sexBase.row.total[sex],
    };
    matchedLabel = sexBase.row.label;
  }

  if (!isSpecialStatus(status) || !water.adjustment[status]) {
    return {
      matchedLabel,
      drinking: baseRow.drinking,
      total: baseRow.total,
    };
  }

  return {
    matchedLabel,
    drinking: mergeScalar(baseRow.drinking, water.adjustment[status].drinking),
    total: mergeScalar(baseRow.total, water.adjustment[status].total),
  };
}

function formatInfantEnergy(value, weightKg) {
  const match = String(value).match(/([0-9.]+)\s*MJ\/.*?([0-9.]+)\s*kcal\//i);
  if (!match) {
    return value;
  }

  const mjPerKg = Number(match[1]);
  const kcalPerKg = Number(match[2]);
  const mj = mjPerKg * weightKg;
  const kcal = kcalPerKg * weightKg;
  return trimNumber(mj, 2) + " MJ/d，" + trimNumber(kcal, 0) + " kcal/d";
}

function splitFemale50Iron(value, menstruationStatus) {
  const text = String(value);
  if (text.indexOf("无月经") === -1 || text.indexOf("有月经") === -1) {
    return text;
  }

  const withoutMatch = text.match(/([0-9.]+).*?无月经/);
  const withMatch = text.match(/([0-9.]+).*?有月经/);

  if (menstruationStatus === "without" && withoutMatch) {
    return withoutMatch[1];
  }
  if (menstruationStatus === "with" && withMatch) {
    return withMatch[1];
  }
  return text;
}

function buildSummary(input, computed) {
  const cards = [
    { label: "性别", value: SEX_LABELS[input.sex] },
    { label: "实际年龄", value: computed.ageText },
    { label: "命中年龄段", value: computed.summaryBracket.label },
    { label: "生理阶段", value: STATUS_LABELS[input.status] },
    { label: "活动水平", value: PAL_LABELS[computed.effectivePal] },
  ];

  if (typeof input.weightKg === "number" && isFinite(input.weightKg)) {
    cards.push({ label: "体重", value: input.weightKg.toFixed(1) + " kg" });
  }

  let html = "";
  for (let index = 0; index < cards.length; index += 1) {
    html +=
      '<div class="basic-result-item">' +
        "<span>" + escapeHtml(cards[index].label) + "</span>" +
        "<strong>" + escapeHtml(cards[index].value) + "</strong>" +
      "</div>";
  }
  basicResult.innerHTML = html;
}

function renderGroupCard(title, rows, note) {
  let tableRows = "";
  for (let index = 0; index < rows.length; index += 1) {
    tableRows +=
      "<tr>" +
        "<th>" + escapeHtml(rows[index].label) + "</th>" +
        "<td>" + escapeHtml(rows[index].value) + "</td>" +
      "</tr>";
  }

  return (
    '<div class="result-table-card dietary-table-card">' +
      "<h3>" + escapeHtml(title) + "</h3>" +
      '<table class="simple-result-table dietary-result-table">' +
        "<thead><tr><th>项目</th><th>结果</th></tr></thead>" +
        "<tbody>" + tableRows + "</tbody>" +
      "</table>" +
      (note ? '<p class="helper-text dietary-result-note">' + escapeHtml(note) + "</p>" : "") +
    "</div>"
  );
}

function gatherInput() {
  const mode = getInputMode();
  const sex = getSex();
  const status = sex === "male" ? "ordinary" : statusSelect.value;
  const weightValue = weightInput.value ? Number(weightInput.value) : null;

  let ageInfo;
  let summaryBracket;
  let evaluationDateText = "";

  if (mode === "date") {
    const birthDate = parseDateValue(birthDateInput.value, "出生日期");
    const evaluationDate = parseDateValue(evaluationDateInput.value, "评估日期");
    ageInfo = calculateAgeInfo(birthDate, evaluationDate);
    summaryBracket = pickSummaryBracket(ageInfo.yearsFloat);
    evaluationDateText = formatSlashDate(evaluationDate);
  } else {
    const bracket = AGE_BRACKET_MAP[ageBracketSelect.value];
    if (!bracket) {
      throw new Error("请选择年龄段。");
    }
    ageInfo = {
      months: Math.round(bracket.years * 12),
      years: Math.floor(bracket.years),
      remainMonths: bracket.years % 1 === 0.5 ? 6 : 0,
      yearsFloat: bracket.years,
      text: bracket.label,
    };
    summaryBracket = bracket;
    evaluationDateText = "直接年龄段模式";
  }

  if (summaryBracket.years < 1 && !(typeof weightValue === "number" && isFinite(weightValue) && weightValue > 0)) {
    throw new Error("0 岁~和 0.5 岁~的能量需要量需要填写体重。");
  }

  if (isSpecialStatus(status)) {
    if (sex !== "female") {
      throw new Error("孕期和乳母状态仅支持女性。");
    }
    if (summaryBracket.years < 18 || summaryBracket.years >= 50) {
      throw new Error("孕期和乳母状态当前仅支持 18 岁~至 49 岁女性。");
    }
  }

  return {
    mode,
    sex,
    status,
    weightKg: weightValue,
    ageInfo,
    summaryBracket,
    evaluationDateText,
    menstruationStatus: menstruationSelect.value,
    palLevel: palSelect.value,
  };
}

function calculateDietaryResult(input) {
  const ageYears = input.ageInfo.yearsFloat;
  const sex = input.sex;
  const status = input.status;
  const effectivePal = ageYears < 1 ? "pal2" : input.palLevel;

  const energyRow = resolveTableRow(DIETARY_INTAKE_DATA.energy[sex], ageYears, status);
  let energyValue = energyRow.row[effectivePal];
  let energyNote = "";
  if (ageYears < 1 && typeof input.weightKg === "number" && input.weightKg > 0) {
    energyValue = formatInfantEnergy(energyValue, input.weightKg);
    energyNote = "0 岁~和 0.5 岁~按体重与 PAL II 自动换算。";
  }

  const proteinRow = resolveTableRow(DIETARY_INTAKE_DATA.protein, ageYears, status).row;
  const fatRow = resolveTableRow(DIETARY_INTAKE_DATA.fat, ageYears, status).row;
  const carbsRow = resolveTableRow(DIETARY_INTAKE_DATA.carbs, ageYears, status).row;
  const amdrRow = resolveTableRow(DIETARY_INTAKE_DATA.amdr, ageYears, status).row;
  const mineralsRow = resolveTableRow(DIETARY_INTAKE_DATA.minerals, ageYears, status).row;
  const vitaminsRow = resolveTableRow(DIETARY_INTAKE_DATA.vitamins, ageYears, status).row;
  const ulRow = resolveTableRow(DIETARY_INTAKE_DATA.ul, ageYears, status).row;
  const waterRow = selectWaterValues(ageYears, sex, status);

  let femaleIronValue = mineralsRow.iron.female;
  if (sex === "female" && input.summaryBracket.key === "50") {
    femaleIronValue = splitFemale50Iron(femaleIronValue, input.menstruationStatus);
  }

  return {
    ageText: input.ageInfo.text,
    summaryBracket: input.summaryBracket,
    effectivePal,
    energy: {
      value: energyValue,
      note: energyNote,
    },
    macroRows: [
      { label: "蛋白质 EAR（g/d）", value: proteinRow.ear[sex] },
      { label: "蛋白质 RNI/AI（g/d）", value: proteinRow.rni[sex] },
      { label: "蛋白质 AMDR（%E）", value: proteinRow.amdr },
      { label: "总脂肪（%E）", value: fatRow.totalFat },
      { label: "饱和脂肪酸（%E）", value: fatRow.saturatedFat },
      { label: "n-6 多不饱和脂肪酸（%E）", value: fatRow.n6Polyunsaturated },
      { label: "n-3 多不饱和脂肪酸（%E）", value: fatRow.n3Polyunsaturated },
      { label: "亚油酸（%E）", value: fatRow.linoleicAcid },
      { label: "亚麻酸（%E）", value: fatRow.alphaLinolenicAcid },
      { label: "EPA+DHA（g/d）", value: fatRow.epaDha },
      { label: "总碳水化合物 EAR/AI（g/d）", value: carbsRow.ear },
      { label: "总碳水化合物 AMDR（%E）", value: carbsRow.amdr },
      { label: "膳食纤维 AI（g/d）", value: carbsRow.fiber },
      { label: "添加糖 AMDR（%E）", value: carbsRow.addedSugar },
      { label: "宏量营养素范围-碳水（%E）", value: amdrRow.carbohydrate },
      { label: "宏量营养素范围-脂肪（%E）", value: amdrRow.fat },
      { label: "宏量营养素范围-蛋白质（%E）", value: amdrRow.protein },
    ],
    mineralRows: [
      { label: "钙（mg/d）", value: mineralsRow.calcium },
      { label: "磷（mg/d）", value: mineralsRow.phosphorus },
      { label: "钾（mg/d）", value: mineralsRow.potassium },
      { label: "钠（mg/d）", value: mineralsRow.sodium },
      { label: "镁（mg/d）", value: mineralsRow.magnesium },
      { label: "氯（mg/d）", value: mineralsRow.chloride },
      { label: "铁（mg/d）", value: sex === "female" ? femaleIronValue : mineralsRow.iron.male },
      { label: "碘（μg/d）", value: mineralsRow.iodine },
      { label: "锌（mg/d）", value: mineralsRow.zinc[sex] },
      { label: "硒（μg/d）", value: mineralsRow.selenium },
      { label: "铜（mg/d）", value: mineralsRow.copper },
      { label: "氟（mg/d）", value: mineralsRow.fluoride },
      { label: "铬（μg/d）", value: mineralsRow.chromium[sex] },
      { label: "锰（mg/d）", value: mineralsRow.manganese[sex] },
      { label: "钼（μg/d）", value: mineralsRow.molybdenum },
    ],
    vitaminRows: [
      { label: "维生素 A（μg RAE/d）", value: vitaminsRow.vitaminA[sex] },
      { label: "维生素 D（μg/d）", value: vitaminsRow.vitaminD },
      { label: "维生素 E（mg α-TE/d）", value: vitaminsRow.vitaminE },
      { label: "维生素 K（μg/d）", value: vitaminsRow.vitaminK },
      { label: "维生素 B1（mg/d）", value: vitaminsRow.vitaminB1[sex] },
      { label: "维生素 B2（mg/d）", value: vitaminsRow.vitaminB2[sex] },
      { label: "烟酸（mg NE/d）", value: vitaminsRow.niacin[sex] },
      { label: "维生素 B6（mg/d）", value: vitaminsRow.vitaminB6 },
      { label: "叶酸（μg DFE/d）", value: vitaminsRow.folate },
      { label: "维生素 B12（μg/d）", value: vitaminsRow.vitaminB12 },
      { label: "泛酸（mg/d）", value: vitaminsRow.pantothenicAcid },
      { label: "生物素（μg/d）", value: vitaminsRow.biotin },
      { label: "胆碱（mg/d）", value: vitaminsRow.choline[sex] },
      { label: "维生素 C（mg/d）", value: vitaminsRow.vitaminC },
    ],
    ulRows: [
      { label: "钙 UL（mg/d）", value: ulRow.calcium },
      { label: "磷 UL（mg/d）", value: ulRow.phosphorus },
      { label: "铁 UL（mg/d）", value: ulRow.iron },
      { label: "碘 UL（μg/d）", value: ulRow.iodine },
      { label: "锌 UL（mg/d）", value: ulRow.zinc },
      { label: "硒 UL（μg/d）", value: ulRow.selenium },
      { label: "铜 UL（mg/d）", value: ulRow.copper },
      { label: "氟 UL（mg/d）", value: ulRow.fluoride },
      { label: "锰 UL（mg/d）", value: ulRow.manganese },
      { label: "钼 UL（μg/d）", value: ulRow.molybdenum },
      { label: "维生素 A UL（μg/d）", value: ulRow.vitaminA },
      { label: "维生素 D UL（μg/d）", value: ulRow.vitaminD },
      { label: "维生素 E UL（mg/d）", value: ulRow.vitaminE },
      { label: "烟酸 UL（mg NE/d）", value: ulRow.niacin },
      { label: "烟酰胺 UL（mg/d）", value: ulRow.nicotinamide },
      { label: "维生素 B6 UL（mg/d）", value: ulRow.vitaminB6 },
      { label: "叶酸 UL（μg/d）", value: ulRow.folate },
      { label: "胆碱 UL（mg/d）", value: ulRow.choline },
      { label: "维生素 C UL（mg/d）", value: ulRow.vitaminC },
    ],
    waterRows: [
      { label: "饮水量（mL/d）", value: waterRow.drinking },
      { label: "总摄入量（mL/d）", value: waterRow.total },
    ],
  };
}

function renderResult(input, result) {
  buildSummary(input, result);
  let html = "";

  html += renderGroupCard(
    "能量需要量",
    [
      { label: "活动水平", value: PAL_LABELS[result.effectivePal] },
      { label: "能量结果", value: result.energy.value },
    ],
    result.energy.note
  );
  html += renderGroupCard("宏量营养素参考摄入量", result.macroRows);
  html += renderGroupCard("矿物质推荐摄入量", result.mineralRows);
  html += renderGroupCard("维生素推荐摄入量", result.vitaminRows);
  html += renderGroupCard("微量营养素可耐受最高摄入量（UL）", result.ulRows);
  html += renderGroupCard("水的适宜摄入量", result.waterRows);

  resultGroups.innerHTML = html;
  resultsSection.classList.remove("hidden");
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function updateModeView() {
  const mode = getInputMode();
  if (mode === "date") {
    dateModeFields.classList.remove("hidden");
    bracketModeField.classList.add("hidden");
  } else {
    dateModeFields.classList.add("hidden");
    bracketModeField.classList.remove("hidden");
  }
  updatePreview();
}

function updateFemaleOnlyFields() {
  const sex = getSex();
  if (sex === "male") {
    statusSelect.value = "ordinary";
    statusSelect.setAttribute("disabled", "disabled");
    statusHelper.textContent = "男仅支持普通；切换为女后可选择孕期和乳母。";
  } else {
    statusSelect.removeAttribute("disabled");
    statusHelper.textContent = "女可选择普通、孕早期、孕中期、孕晚期或乳母。";
  }
  updatePreview();
}

function updateMenstruationVisibility() {
  const sex = getSex();
  let bracket = AGE_BRACKET_MAP[ageBracketSelect.value];

  if (getInputMode() === "date") {
    try {
      if (birthDateInput.value && evaluationDateInput.value) {
        const ageInfo = calculateAgeInfo(
          parseDateValue(birthDateInput.value, "出生日期"),
          parseDateValue(evaluationDateInput.value, "评估日期")
        );
        bracket = pickSummaryBracket(ageInfo.yearsFloat);
      }
    } catch (error) {
      bracket = null;
    }
  }

  if (sex === "female" && bracket && bracket.key === "50" && statusSelect.value === "ordinary") {
    menstruationField.classList.remove("hidden");
    return;
  }

  menstruationField.classList.add("hidden");
}

function updatePalState() {
  let bracket = AGE_BRACKET_MAP[ageBracketSelect.value];

  if (getInputMode() === "date") {
    try {
      if (birthDateInput.value && evaluationDateInput.value) {
        const ageInfo = calculateAgeInfo(
          parseDateValue(birthDateInput.value, "出生日期"),
          parseDateValue(evaluationDateInput.value, "评估日期")
        );
        bracket = pickSummaryBracket(ageInfo.yearsFloat);
      }
    } catch (error) {
      bracket = null;
    }
  }

  if (bracket && bracket.years < 1) {
    palSelect.value = "pal2";
    palSelect.setAttribute("disabled", "disabled");
    return;
  }

  palSelect.removeAttribute("disabled");
}

function updatePreview() {
  try {
    if (getInputMode() === "date") {
      if (!birthDateInput.value || !evaluationDateInput.value) {
        previewAge.textContent = "—";
        previewBracket.textContent = "—";
      } else {
        const ageInfo = calculateAgeInfo(
          parseDateValue(birthDateInput.value, "出生日期"),
          parseDateValue(evaluationDateInput.value, "评估日期")
        );
        const bracket = pickSummaryBracket(ageInfo.yearsFloat);
        previewAge.textContent = ageInfo.text;
        previewBracket.textContent = bracket.label;
      }
    } else {
      const bracket = AGE_BRACKET_MAP[ageBracketSelect.value];
      previewAge.textContent = bracket ? bracket.label : "—";
      previewBracket.textContent = bracket ? bracket.label : "—";
    }
  } catch (error) {
    previewAge.textContent = "—";
    previewBracket.textContent = "—";
  }

  updateMenstruationVisibility();
  updatePalState();
}

function fillAgeBracketOptions() {
  let options = "";
  for (let index = 0; index < AGE_BRACKETS.length; index += 1) {
    options +=
      '<option value="' +
      AGE_BRACKETS[index].key +
      '"' +
      (AGE_BRACKETS[index].key === "7" ? ' selected="selected"' : "") +
      ">" +
      AGE_BRACKETS[index].label +
      "</option>";
  }
  ageBracketSelect.innerHTML = options;
}

function resetForm() {
  document.querySelector('input[name="inputMode"][value="date"]').checked = true;
  document.querySelector('input[name="sex"][value="male"]').checked = true;

  fillDateGroup(birthYearSelect, birthMonthSelect, birthDaySelect, birthDateInput, todayDate(), true);
  fillDateGroup(evaluationYearSelect, evaluationMonthSelect, evaluationDaySelect, evaluationDateInput, todayDate(), false);
  fillAgeBracketOptions();
  statusSelect.value = "ordinary";
  palSelect.value = "pal2";
  weightInput.value = "";
  menstruationSelect.value = "without";
  basicResult.innerHTML = "";
  resultGroups.innerHTML = "";
  resultsSection.classList.add("hidden");
  clearError();
  updateFemaleOnlyFields();
  updateModeView();
}

function handleSubmit(event) {
  event.preventDefault();
  clearError();

  try {
    const input = gatherInput();
    const result = calculateDietaryResult(input);
    renderResult(input, result);
  } catch (error) {
    resultsSection.classList.add("hidden");
    showError(error instanceof Error ? error.message : "计算失败，请检查输入内容。");
  }
}

function initialize() {
  fillDateGroup(birthYearSelect, birthMonthSelect, birthDaySelect, birthDateInput, todayDate(), true);
  fillDateGroup(evaluationYearSelect, evaluationMonthSelect, evaluationDaySelect, evaluationDateInput, todayDate(), false);
  fillAgeBracketOptions();

  bindDateGroup(birthYearSelect, birthMonthSelect, birthDaySelect, birthDateInput);
  bindDateGroup(evaluationYearSelect, evaluationMonthSelect, evaluationDaySelect, evaluationDateInput);

  form.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", resetForm);
  ageBracketSelect.addEventListener("change", updatePreview);
  statusSelect.addEventListener("change", updatePreview);
  palSelect.addEventListener("change", updatePreview);
  weightInput.addEventListener("input", updatePreview);
  menstruationSelect.addEventListener("change", updatePreview);

  const modeInputs = document.querySelectorAll('input[name="inputMode"]');
  for (let index = 0; index < modeInputs.length; index += 1) {
    modeInputs[index].addEventListener("change", updateModeView);
  }

  const sexInputs = document.querySelectorAll('input[name="sex"]');
  for (let index = 0; index < sexInputs.length; index += 1) {
    sexInputs[index].addEventListener("change", updateFemaleOnlyFields);
  }

  updateFemaleOnlyFields();
  updateModeView();
}

initialize();
