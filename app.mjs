import { evaluateChild } from "./lib/evaluator.mjs?v=20260615-2";

const form = document.querySelector("#assessment-form");
const resultsPanel = document.querySelector("#results-section");
const errorBox = document.querySelector("#error-box");
const previewMonthAge = document.querySelector("#preview-month-age");
const previewActualAge = document.querySelector("#preview-actual-age");
const birthDateInput = document.querySelector("#birth-date");
const evaluationDateInput = document.querySelector("#evaluation-date");
const birthYearSelect = document.querySelector("#birth-year");
const birthMonthSelect = document.querySelector("#birth-month");
const birthDaySelect = document.querySelector("#birth-day");
const evaluationYearSelect = document.querySelector("#evaluation-year");
const evaluationMonthSelect = document.querySelector("#evaluation-month");
const evaluationDaySelect = document.querySelector("#evaluation-day");
const resetButton = document.querySelector("#reset-button");
const basicResult = document.querySelector("#basic-result");
const table2Body = document.querySelector("#table2-body");
const table3Body = document.querySelector("#table3-body");
const weightInput = document.querySelector("#weight-kg");
const measureInput = document.querySelector("#measure-cm");

function startsWithText(value, prefix) {
  return String(value).slice(0, prefix.length) === prefix;
}

function pad(value) {
  const text = String(value);
  return text.length >= 2 ? text : `0${text}`;
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

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) {
    return null;
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
    return null;
  }

  return date;
}

function formatSlashDate(date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function todayDate() {
  return new Date(2026, 5, 15);
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function buildRange(start, end) {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }
  return values;
}

function setSelectOptions(select, values, placeholder, suffix, selectedValue) {
  let options = "";

  if (placeholder) {
    options += `<option value="">${placeholder}</option>`;
  }

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const selected = String(value) === String(selectedValue) ? ' selected="selected"' : "";
    options += `<option value="${value}"${selected}>${value}${suffix}</option>`;
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
    computeAgePreview();
    return;
  }

  hiddenInput.value = `${yearSelect.value}/${pad(monthSelect.value)}/${pad(daySelect.value)}`;
  computeAgePreview();
}

function bindDateGroup(yearSelect, monthSelect, daySelect, hiddenInput) {
  function refresh() {
    syncDateValue(yearSelect, monthSelect, daySelect, hiddenInput);
  }

  yearSelect.addEventListener("change", refresh);
  monthSelect.addEventListener("change", refresh);
  daySelect.addEventListener("change", refresh);
}

function fillDateGroup(yearSelect, monthSelect, daySelect, hiddenInput, date, keepIncomplete) {
  setSelectOptions(yearSelect, buildRange(2000, 2030), "", "年", 2026);
  setSelectOptions(monthSelect, buildRange(1, 12), "月", "月", keepIncomplete ? "" : date.getMonth() + 1);
  setDayOptions(daySelect, yearSelect.value, monthSelect.value, keepIncomplete ? "" : date.getDate());

  if (keepIncomplete) {
    hiddenInput.value = "";
  } else {
    yearSelect.value = String(date.getFullYear());
    monthSelect.value = String(date.getMonth() + 1);
    setDayOptions(daySelect, yearSelect.value, monthSelect.value, date.getDate());
    daySelect.value = String(date.getDate());
    hiddenInput.value = formatSlashDate(date);
  }
}

function resultPillClass(value, tableName) {
  if (tableName === "table2") {
    if (value === "中") {
      return "pill-neutral";
    }
    if (value === "中上" || value === "中下") {
      return "pill-warn";
    }
    return "pill-strong";
  }

  if (value === "正常") {
    return "pill-normal";
  }
  if (startsWithText(value, "重度") || value === "肥胖") {
    return "pill-danger";
  }
  return "pill-warn";
}

function getCheckedSex() {
  const checked = document.querySelector('input[name="sex"]:checked');
  return checked ? checked.value : "";
}

function computeAgePreview() {
  const birthDate = parseDateValue(birthDateInput.value);
  const evaluationDate = parseDateValue(evaluationDateInput.value);

  if (!birthDate || !evaluationDate) {
    previewMonthAge.textContent = "-";
    previewActualAge.textContent = "-";
    return;
  }

  let months =
    (evaluationDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (evaluationDate.getMonth() - birthDate.getMonth());

  if (evaluationDate.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    previewMonthAge.textContent = "-";
    previewActualAge.textContent = "测量日期早于出生日期";
    return;
  }

  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  previewMonthAge.textContent = `${months} 月`;
  previewActualAge.textContent = years > 0 ? `${years} 岁 ${remainMonths} 月` : `${remainMonths} 月`;
}

function renderBasicResult(result) {
  const evaluationDate = parseDateValue(result.input.evaluationDate);

  basicResult.innerHTML = `
    <div class="basic-result-item">
      <span>性别</span>
      <strong>${escapeHtml(result.input.sexLabel)}</strong>
    </div>
    <div class="basic-result-item">
      <span>实际年龄</span>
      <strong>${escapeHtml(result.derived.actualAge)}</strong>
    </div>
    <div class="basic-result-item">
      <span>体重</span>
      <strong>${result.input.weightKg.toFixed(2)} kg</strong>
    </div>
    <div class="basic-result-item">
      <span>身长 / 身高</span>
      <strong>${result.input.measureCm.toFixed(2)} cm</strong>
    </div>
    <div class="basic-result-item">
      <span>BMI</span>
      <strong>${result.derived.bmi.toFixed(2)}</strong>
    </div>
    <div class="basic-result-item">
      <span>评估日期</span>
      <strong>${evaluationDate ? escapeHtml(formatSlashDate(evaluationDate)) : escapeHtml(result.input.evaluationDate)}</strong>
    </div>
  `;
}

function renderTables(result) {
  table2Body.innerHTML = `
    <tr>
      <th>结果</th>
      <td><span class="result-pill ${resultPillClass(result.table2.ageWeight, "table2")}">${escapeHtml(result.table2.ageWeight)}</span></td>
      <td><span class="result-pill ${resultPillClass(result.table2.ageHeight, "table2")}">${escapeHtml(result.table2.ageHeight)}</span></td>
      <td><span class="result-pill ${resultPillClass(result.table2.weightForLengthHeight, "table2")}">${escapeHtml(result.table2.weightForLengthHeight)}</span></td>
      <td><span class="result-pill ${resultPillClass(result.table2.ageBmi, "table2")}">${escapeHtml(result.table2.ageBmi)}</span></td>
    </tr>
  `;

  table3Body.innerHTML = `
    <tr>
      <th>结果</th>
      <td><span class="result-pill ${resultPillClass(result.table3.ageWeight, "table3")}">${escapeHtml(result.table3.ageWeight)}</span></td>
      <td><span class="result-pill ${resultPillClass(result.table3.ageHeight, "table3")}">${escapeHtml(result.table3.ageHeight)}</span></td>
      <td><span class="result-pill ${resultPillClass(result.table3.weightForLengthHeight, "table3")}">${escapeHtml(result.table3.weightForLengthHeight)}</span></td>
      <td><span class="result-pill ${resultPillClass(result.table3.ageBmi, "table3")}">${escapeHtml(result.table3.ageBmi)}</span></td>
    </tr>
  `;
}

function renderResult(result) {
  renderBasicResult(result);
  renderTables(result);
  resultsPanel.classList.remove("hidden");
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function gatherInput() {
  return {
    sex: getCheckedSex(),
    birthDate: birthDateInput.value,
    evaluationDate: evaluationDateInput.value,
    weightKg: weightInput.value,
    measureCm: measureInput.value,
    measurementMethod: "standing",
  };
}

function resetFormState() {
  const today = todayDate();

  form.reset();
  fillDateGroup(
    birthYearSelect,
    birthMonthSelect,
    birthDaySelect,
    birthDateInput,
    new Date(2026, 0, 1),
    true,
  );
  fillDateGroup(
    evaluationYearSelect,
    evaluationMonthSelect,
    evaluationDaySelect,
    evaluationDateInput,
    today,
    false,
  );
  clearError();
  resultsPanel.classList.add("hidden");
  basicResult.innerHTML = "";
  table2Body.innerHTML = "";
  table3Body.innerHTML = "";
  previewMonthAge.textContent = "-";
  previewActualAge.textContent = "-";
  computeAgePreview();
}

bindDateGroup(birthYearSelect, birthMonthSelect, birthDaySelect, birthDateInput);
bindDateGroup(
  evaluationYearSelect,
  evaluationMonthSelect,
  evaluationDaySelect,
  evaluationDateInput,
);

form.addEventListener("submit", function handleSubmit(event) {
  event.preventDefault();
  clearError();

  try {
    const result = evaluateChild(gatherInput());
    renderResult(result);
  } catch (error) {
    showError(error instanceof Error ? error.message : "评估失败，请检查输入。");
  }
});

resetButton.addEventListener("click", function handleReset() {
  resetFormState();
});

resetFormState();
