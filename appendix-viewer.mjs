import { STANDARDS } from "./data/standards-data.mjs";
import { SCHOOL_AGE_STANDARDS } from "./data/standards-school-age.mjs";
import { PERCENTILE_STANDARDS } from "./data/standards-percentile.mjs";

const titleEl = document.querySelector("#viewer-title");
const headCopyEl = document.querySelector("#viewer-head-copy");
const metaEl = document.querySelector("#viewer-meta");
const tagsEl = document.querySelector("#viewer-tags");
const contentEl = document.querySelector("#viewer-content");
const homeLinkEl = document.querySelector("#viewer-home-link");
const viewerShellEl = document.querySelector("#viewer-shell");

const searchParams = new URLSearchParams(window.location.search);
const metricKey = searchParams.get("metric");
const file = searchParams.get("file");
const homeFile = searchParams.get("home");
const homeLabel = searchParams.get("homeLabel");

const SD_COLUMNS = [
  { key: "-3", label: "-3SD" },
  { key: "-2", label: "-2SD" },
  { key: "-1", label: "-1SD" },
  { key: "0", label: "中位数" },
  { key: "1", label: "+1SD" },
  { key: "2", label: "+2SD" },
  { key: "3", label: "+3SD" },
];

const PERCENTILE_COLUMNS = [
  { key: "p3", label: "P3" },
  { key: "p10", label: "P10" },
  { key: "p25", label: "P25" },
  { key: "p50", label: "P50" },
  { key: "p75", label: "P75" },
  { key: "p90", label: "P90" },
  { key: "p97", label: "P97" },
];

const UNDER7_SEX_TITLES = {
  male: "男童 7岁以下",
  female: "女童 7岁以下",
};

const SCHOOL_SEX_TITLES = {
  male: "男童 7岁及以上",
  female: "女童 7岁及以上",
};

const VARIANT_LABELS = {
  "2a": "卧位身长",
  "2b": "立位身高",
};

const METRIC_CONFIG = {
  ageWeight: {
    title: "年龄别体重",
    description: "用于 7 岁以下低体重、重度低体重的判断。",
    summaryNote: "本页已将 7 岁以下数据按男童、女童分别汇总成两张总表。",
    tags: ["7岁以下", "年龄别体重", "男女总表"],
    renderType: "under7-age",
  },
  ageHeight: {
    title: "年龄别身长/身高",
    description: "用于 7 岁以下生长迟缓、重度生长迟缓的判断。",
    summaryNote: "24 月龄特殊点会在年龄栏中标注卧位身长或立位身高，便于核对。",
    tags: ["7岁以下", "年龄别身长/身高", "男女总表"],
    renderType: "under7-age",
  },
  ageWeightPercentile: {
    title: "年龄别体重百分位",
    description: "用于查看 7 岁以下男童、女童年龄别体重的百分位数值。",
    summaryNote: "本页对应附录 A.1 与 A.2，已按同一指标合并展示男童和女童。",
    tags: ["7岁以下", "年龄别体重", "百分位表", "男童女童同页"],
    renderType: "under7-percentile",
  },
  ageHeightPercentile: {
    title: "年龄别身长/身高百分位",
    description: "用于查看 7 岁以下男童、女童年龄别身长/身高的百分位数值。",
    summaryNote: "本页对应附录 A.3 与 A.4，2 岁以下适用于身长，2~7 岁以下适用于身高。",
    tags: ["7岁以下", "年龄别身长/身高", "百分位表", "男童女童同页"],
    renderType: "under7-percentile",
  },
  weightForLengthHeight: {
    title: "身长/身高别体重",
    description: "用于 7 岁以下消瘦、超重、肥胖、重度肥胖的判断。",
    summaryNote: "每张表都已将 3 岁以下与 3 岁以上数据合并，并在首列标明适用年龄段。",
    tags: ["7岁以下", "身长/身高别体重", "男女总表"],
    renderType: "under7-measure",
  },
  ageBmi: {
    title: "年龄别BMI",
    description: "用于 7 岁以下 BMI 相关的消瘦、超重、肥胖判断。",
    summaryNote: "24 月龄特殊点会在年龄栏中标注卧位身长或立位身高，便于直接核对。",
    tags: ["7岁以下", "年龄别BMI", "男女总表"],
    renderType: "under7-age",
  },
  schoolAgeHeightScreening: {
    title: "年龄身高筛查",
    description: "用于 7 岁及以上儿童青少年生长迟缓筛查界值查看。",
    summaryNote: "达到或低于对应年龄段界值时，可判定为生长迟缓。",
    tags: ["7岁及以上", "年龄身高筛查", "界值表"],
    renderType: "school-age-height",
  },
  schoolAgeBmiScreening: {
    title: "年龄BMI筛查",
    description: "用于 7 岁及以上 BMI 的中重度消瘦、轻度消瘦、超重、肥胖界值查看。",
    summaryNote: "低于或高于对应年龄段界值后，可直接判定为对应营养状态；介于轻度消瘦上限与超重下限之间时为正常。",
    tags: ["7岁及以上", "年龄BMI筛查", "界值表"],
    renderType: "school-age-bmi",
  },
  schoolAgeHeightDevelopmentSd: {
    title: "身高发育等级（标准差法）",
    description: "用于 7 岁至 18 岁儿童青少年身高发育等级的标准差法判定值查看。",
    summaryNote: "依据 7 岁至 18 岁儿童青少年身高发育等级评价标准，按男童、女童分别查看对应年龄的 -2SD、-1SD、中位数、+1SD、+2SD 数值。",
    tags: ["7岁及以上", "身高发育等级", "标准差法"],
    renderType: "school-age-height-development",
  },
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function replaceChar(char) {
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

function normalizeDisplayText(text) {
  return String(text)
    .replace(/\$\s*/g, "")
    .replace(/\s*\$/g, "")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/_\{([^}]+)\}/g, "_$1")
    .replace(/\\sim/g, "~")
    .replace(/[{}]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderInline(text) {
  return escapeHtml(normalizeDisplayText(text)).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderRawHtml(raw) {
  const normalizedRaw = normalizeDisplayText(raw);
  if (/^\s*<table[\s>]/i.test(raw)) {
    return '<div class="table-wrap">' + normalizedRaw + "</div>";
  }
  return normalizedRaw;
}

function buildTag(label) {
  return '<span class="viewer-tag">' + escapeHtml(label) + "</span>";
}

function setTags(labels) {
  const safeLabels = labels.filter(Boolean);
  let html = "";
  for (let index = 0; index < safeLabels.length; index += 1) {
    html += buildTag(safeLabels[index]);
  }
  tagsEl.innerHTML = html;
  tagsEl.classList.toggle("hidden", safeLabels.length === 0);
}

function setContentHtml(html) {
  contentEl.innerHTML = html;
}

function isDietaryReferenceFile(fileName) {
  return /(^|\b)(appendix-3-|3-\d+\.md$)/iu.test(fileName);
}

function setViewerHomeLink() {
  const targetHome = homeFile || "appendix-index.html";
  const targetLabel = homeLabel || "返回儿童营养评估附录";

  homeLinkEl.href = "./" + targetHome;
  homeLinkEl.textContent = targetLabel;
}

function updateViewerMode(fileName) {
  viewerShellEl.classList.toggle("is-dietary-appendix", isDietaryReferenceFile(fileName));
}

function formatAgeLabel(row) {
  let label = row.ageLabel;
  if (row.variant && VARIANT_LABELS[row.variant]) {
    label = label.replace(/\((2a|2b)\)/giu, "");
    label = label + "（" + VARIANT_LABELS[row.variant] + "）";
  }
  return label;
}

function formatMeasureLabel(value) {
  return String(value).replace(/cm$/iu, "");
}

function renderSdCells(sd) {
  let html = "";
  for (let index = 0; index < SD_COLUMNS.length; index += 1) {
    const column = SD_COLUMNS[index];
    html += "<td>" + escapeHtml(sd[column.key]) + "</td>";
  }
  return html;
}

function renderPercentileCells(percentile) {
  let html = "";
  for (let index = 0; index < PERCENTILE_COLUMNS.length; index += 1) {
    const column = PERCENTILE_COLUMNS[index];
    html += "<td>" + escapeHtml(percentile[column.key]) + "</td>";
  }
  return html;
}

function renderUnder7AgeMetricTable(metricName, sex) {
  const rows = STANDARDS.metrics[metricName][sex];
  let bodyHtml = "";

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    bodyHtml +=
      "<tr>" +
        "<td>" + escapeHtml(formatAgeLabel(row)) + "</td>" +
        renderSdCells(row.sd) +
      "</tr>";
  }

  return (
    '<section class="summary-section">' +
      "<h2>" + UNDER7_SEX_TITLES[sex] + "</h2>" +
      '<div class="table-wrap">' +
        "<table>" +
          "<thead>" +
            "<tr>" +
              "<th>年龄</th>" +
              SD_COLUMNS.map(function mapColumn(column) {
                return "<th>" + column.label + "</th>";
              }).join("") +
            "</tr>" +
          "</thead>" +
          "<tbody>" + bodyHtml + "</tbody>" +
        "</table>" +
      "</div>" +
    "</section>"
  );
}

function renderUnder7PercentileTable(metricName, sex) {
  const rows = PERCENTILE_STANDARDS.metrics[metricName][sex];
  let bodyHtml = "";

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    bodyHtml +=
      "<tr>" +
        "<td>" + escapeHtml(row.ageLabel) + "</td>" +
        renderPercentileCells(row.percentile) +
      "</tr>";
  }

  return (
    '<section class="summary-section">' +
      "<h2>" + UNDER7_SEX_TITLES[sex] + "</h2>" +
      '<div class="table-wrap">' +
        "<table>" +
          "<thead>" +
            "<tr>" +
              "<th>年龄</th>" +
              PERCENTILE_COLUMNS.map(function mapColumn(column) {
                return "<th>" + column.label + "</th>";
              }).join("") +
            "</tr>" +
          "</thead>" +
          "<tbody>" + bodyHtml + "</tbody>" +
        "</table>" +
      "</div>" +
    "</section>"
  );
}

function renderGroupedSizeWeightRows(groupLabel, rows) {
  let html = "";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    html += "<tr>";
    if (index === 0) {
      html += '<th class="row-group" rowspan="' + rows.length + '">' + groupLabel + "</th>";
    }
    html += "<td>" + escapeHtml(formatMeasureLabel(row.measureLabel)) + "</td>";
    html += renderSdCells(row.sd);
    html += "</tr>";
  }
  return html;
}

function renderUnder7SizeWeightTable(sex) {
  const groups = STANDARDS.metrics.weightForLengthHeight[sex];
  return (
    '<section class="summary-section">' +
      "<h2>" + UNDER7_SEX_TITLES[sex] + "</h2>" +
      '<div class="table-wrap">' +
        "<table>" +
          "<thead>" +
            "<tr>" +
              "<th>适用年龄</th>" +
              "<th>身长/身高（cm）</th>" +
              SD_COLUMNS.map(function mapColumn(column) {
                return "<th>" + column.label + "</th>";
              }).join("") +
            "</tr>" +
          "</thead>" +
          "<tbody>" +
            renderGroupedSizeWeightRows("3岁以下", groups.under3) +
            renderGroupedSizeWeightRows("3岁以上", groups.over3) +
          "</tbody>" +
        "</table>" +
      "</div>" +
    "</section>"
  );
}

function renderSchoolAgeHeightTable() {
  const maleRows = SCHOOL_AGE_STANDARDS.heightScreening.male;
  const femaleRows = SCHOOL_AGE_STANDARDS.heightScreening.female;
  let bodyHtml = "";

  for (let index = 0; index < maleRows.length; index += 1) {
    bodyHtml +=
      "<tr>" +
        "<td>" + escapeHtml(maleRows[index].ageLabel) + "</td>" +
        "<td>" + escapeHtml(maleRows[index].cutoffCm) + "</td>" +
        "<td>" + escapeHtml(femaleRows[index].cutoffCm) + "</td>" +
      "</tr>";
  }

  return (
    '<section class="summary-section">' +
      "<h2>7岁及以上生长迟缓筛查界值</h2>" +
      '<div class="table-wrap">' +
        "<table>" +
          "<thead>" +
            "<tr>" +
              "<th>年龄段</th>" +
              "<th>男童身高界值（cm）</th>" +
              "<th>女童身高界值（cm）</th>" +
            "</tr>" +
          "</thead>" +
          "<tbody>" + bodyHtml + "</tbody>" +
        "</table>" +
      "</div>" +
    "</section>"
  );
}

function renderSchoolAgeBmiTable() {
  const maleRows = SCHOOL_AGE_STANDARDS.bmiScreening.male;
  const femaleRows = SCHOOL_AGE_STANDARDS.bmiScreening.female;
  function renderSingleSexTable(title, rows) {
    let bodyHtml = "";

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      bodyHtml +=
        "<tr>" +
          "<td>" + escapeHtml(row.ageLabel) + "</td>" +
          "<td>≤ " + escapeHtml(row.severeMax) + "</td>" +
          "<td>≤ " + escapeHtml(row.mildMax) + "</td>" +
          "<td>≥ " + escapeHtml(row.overweightMin) + "</td>" +
          "<td>≥ " + escapeHtml(row.obesityMin) + "</td>" +
        "</tr>";
    }

    return (
      '<section class="summary-section">' +
        "<h2>" + title + "</h2>" +
        '<div class="table-wrap">' +
          "<table>" +
            "<thead>" +
              "<tr>" +
                "<th>年龄段</th>" +
                "<th>中重度消瘦</th>" +
                "<th>轻度消瘦</th>" +
                "<th>超重</th>" +
                "<th>肥胖</th>" +
              "</tr>" +
            "</thead>" +
            "<tbody>" + bodyHtml + "</tbody>" +
          "</table>" +
        "</div>" +
      "</section>"
    );
  }

  return (
    renderSingleSexTable("男童 7岁及以上 BMI 筛查界值", maleRows) +
    renderSingleSexTable("女童 7岁及以上 BMI 筛查界值", femaleRows)
  );
}

function renderSchoolAgeHeightDevelopmentTable() {
  const maleRows = SCHOOL_AGE_STANDARDS.heightDevelopmentSd.male;
  const femaleRows = SCHOOL_AGE_STANDARDS.heightDevelopmentSd.female;

  function renderSingleSexTable(title, rows) {
    let bodyHtml = "";

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      bodyHtml +=
        "<tr>" +
          "<td>" + escapeHtml(row.ageLabel) + "</td>" +
          "<td>" + escapeHtml(row.sd["-2"]) + "</td>" +
          "<td>" + escapeHtml(row.sd["-1"]) + "</td>" +
          "<td>" + escapeHtml(row.sd["0"]) + "</td>" +
          "<td>" + escapeHtml(row.sd["1"]) + "</td>" +
          "<td>" + escapeHtml(row.sd["2"]) + "</td>" +
        "</tr>";
    }

    return (
      '<section class="summary-section">' +
        "<h2>" + title + "</h2>" +
        '<div class="table-wrap">' +
          "<table>" +
            "<thead>" +
              "<tr>" +
                "<th>年龄</th>" +
                "<th>-2SD</th>" +
                "<th>-1SD</th>" +
                "<th>中位数</th>" +
                "<th>+1SD</th>" +
                "<th>+2SD</th>" +
              "</tr>" +
            "</thead>" +
            "<tbody>" + bodyHtml + "</tbody>" +
          "</table>" +
        "</div>" +
      "</section>"
    );
  }

  return (
    '<p class="sub-note">判定规则：≥ +2SD 为上等，+1SD≤x&lt;+2SD 为中上等，-1SD≤x&lt;+1SD 为中等，-2SD≤x&lt;-1SD 为中下等，&lt; -2SD 为下等。</p>' +
    renderSingleSexTable("男童 7岁至18岁 身高发育等级标准差表", maleRows) +
    renderSingleSexTable("女童 7岁至18岁 身高发育等级标准差表", femaleRows)
  );
}

function renderMetricSummary(metricName) {
  const config = METRIC_CONFIG[metricName];
  if (!config) {
    titleEl.textContent = "附录查看";
    headCopyEl.textContent = "未识别到对应的附录分类。";
    metaEl.textContent = "当前分类不存在。";
    setTags([]);
    setContentHtml('<p class="viewer-error">未找到对应的附录分类，请返回附录页面重新选择。</p>');
    return;
  }

  titleEl.textContent = "附录：" + config.title;
  headCopyEl.textContent = config.description;
  metaEl.textContent = "当前分类：" + config.title;
  setTags(config.tags);

  let tableHtml = "";
  if (config.renderType === "under7-measure") {
    tableHtml = renderUnder7SizeWeightTable("male") + renderUnder7SizeWeightTable("female");
  } else if (config.renderType === "under7-age") {
    tableHtml = renderUnder7AgeMetricTable(metricName, "male") + renderUnder7AgeMetricTable(metricName, "female");
  } else if (config.renderType === "under7-percentile") {
    tableHtml = renderUnder7PercentileTable(metricName, "male") + renderUnder7PercentileTable(metricName, "female");
  } else if (config.renderType === "school-age-height") {
    tableHtml = renderSchoolAgeHeightTable();
  } else if (config.renderType === "school-age-bmi") {
    tableHtml = renderSchoolAgeBmiTable();
  } else if (config.renderType === "school-age-height-development") {
    tableHtml = renderSchoolAgeHeightDevelopmentTable();
  }

  setContentHtml('<p class="sub-note">' + escapeHtml(config.summaryNote) + "</p>" + tableHtml);
}

function resolveFileTags(fileName) {
  const tags = [];

  if (fileName.includes("指标汇总")) {
    tags.push("文件类型：指标汇总");
  } else {
    tags.push("文件类型：原始整理文件");
  }

  if (fileName.includes("年龄别体重")) {
    tags.push("指标分类：年龄别体重");
  } else if (fileName.includes("年龄别身长") || fileName.includes("年龄别身高")) {
    tags.push("指标分类：年龄别身长/身高");
  } else if (fileName.includes("BMI")) {
    tags.push("指标分类：年龄别BMI");
  }

  return tags;
}

function renderSpecialLine(trimmed) {
  if (/^附件\s*\d+/u.test(trimmed)) {
    return "<h2>" + renderInline(trimmed) + "</h2>";
  }
  if (/^表\s*[A-Za-z0-9.\u4e00-\u9fa5]+/u.test(trimmed)) {
    return '<h3 class="block-title">' + renderInline(trimmed) + "</h3>";
  }
  if (/^说明[:：]/u.test(trimmed) || /^注[:：]/u.test(trimmed)) {
    return '<p class="sub-note">' + renderInline(trimmed) + "</p>";
  }
  if (/^单位/u.test(trimmed)) {
    return '<p class="unit-line">' + renderInline(trimmed) + "</p>";
  }
  return null;
}

function isMarkdownTableSeparator(line) {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/u.test(line.trim());
}

function isMarkdownTableLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

function parseMarkdownTableRow(line) {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map(function mapCell(cell) {
      return cell.trim();
    });
}

function buildMarkdownTableHtml(tableLines) {
  if (tableLines.length < 2) {
    return null;
  }

  const headerCells = parseMarkdownTableRow(tableLines[0]);
  const bodyLines = tableLines.slice(2);
  let html = '<div class="table-wrap"><table><thead><tr>';

  for (let index = 0; index < headerCells.length; index += 1) {
    html += "<th>" + renderInline(headerCells[index]) + "</th>";
  }

  html += "</tr></thead><tbody>";

  for (let rowIndex = 0; rowIndex < bodyLines.length; rowIndex += 1) {
    const cells = parseMarkdownTableRow(bodyLines[rowIndex]);
    html += "<tr>";
    for (let cellIndex = 0; cellIndex < headerCells.length; cellIndex += 1) {
      const value = cells[cellIndex] || "";
      html += "<td>" + renderInline(value) + "</td>";
    }
    html += "</tr>";
  }

  html += "</tbody></table></div>";
  return html;
}

function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraphBuffer = [];
  let listType = null;

  function flushParagraph() {
    if (paragraphBuffer.length === 0) {
      return;
    }
    html.push("<p>" + paragraphBuffer.map(function mapParagraph(item) {
      return renderInline(item);
    }).join("<br />") + "</p>");
    paragraphBuffer = [];
  }

  function closeList() {
    if (!listType) {
      return;
    }
    html.push(listType === "ol" ? "</ol>" : "</ul>");
    listType = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push("<h" + level + ">" + renderInline(headingMatch[2]) + "</h" + level + ">");
      continue;
    }

    const specialLineHtml = renderSpecialLine(trimmed);
    if (specialLineHtml) {
      flushParagraph();
      closeList();
      html.push(specialLineHtml);
      continue;
    }

    if (
      isMarkdownTableLine(trimmed) &&
      index + 1 < lines.length &&
      isMarkdownTableSeparator(lines[index + 1])
    ) {
      flushParagraph();
      closeList();

      const tableLines = [trimmed, lines[index + 1].trim()];
      index += 2;

      while (index < lines.length && isMarkdownTableLine(lines[index])) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      index -= 1;
      html.push(buildMarkdownTableHtml(tableLines));
      continue;
    }

    if (/^\s*<[^>]+>/.test(trimmed)) {
      flushParagraph();
      closeList();

      if (/^\s*<table[\s>]/i.test(trimmed)) {
        const htmlLines = [lines[index]];
        index += 1;

        while (index < lines.length) {
          htmlLines.push(lines[index]);
          if (/<\/table>\s*$/i.test(lines[index].trim())) {
            break;
          }
          index += 1;
        }

        html.push(renderRawHtml(htmlLines.join("\n")));
        continue;
      }

      html.push(renderRawHtml(trimmed));
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push("<li>" + renderInline(unorderedMatch[1]) + "</li>");
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push("<li>" + renderInline(orderedMatch[1]) + "</li>");
      continue;
    }

    if (listType) {
      closeList();
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  closeList();

  return html.join("");
}

function normalizeMarkdownTitle(rawTitle) {
  return rawTitle
    .replace(/^#{1,6}\s*/u, "")
    .replace(/^\s*[-*]\s*/u, "")
    .trim();
}

function extractMarkdownTitle(source, fallbackTitle) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }

    const title = normalizeMarkdownTitle(trimmed);
    if (title) {
      return title;
    }
  }

  return fallbackTitle;
}

function renderFileViewer(fileName) {
  const decodedFile = decodeURIComponent(fileName);
  const fallbackTitle = decodedFile.replace(/\.md$/iu, "");

  titleEl.textContent = fallbackTitle;
  headCopyEl.textContent = "当前页面用于查看本地整理文档，并自动渲染其中的表格。";
  metaEl.textContent = "当前文件：" + fallbackTitle;
  setTags(resolveFileTags(decodedFile));
  updateViewerMode(decodedFile);

  fetch("./appendix/" + fileName)
    .then(function checkResponse(response) {
      if (!response.ok) {
        throw new Error("加载失败：" + response.status);
      }
      return response.text();
    })
    .then(function setText(text) {
      const displayTitle = extractMarkdownTitle(text, fallbackTitle);
      titleEl.textContent = displayTitle;
      metaEl.textContent = "当前文件：" + displayTitle;
      setContentHtml(renderMarkdown(text));
    })
    .catch(function handleError(error) {
      setContentHtml('<p class="viewer-error">文件加载失败：' + escapeHtml(error.message) + "</p>");
    });
}

setViewerHomeLink();

if (metricKey) {
  renderMetricSummary(metricKey);
} else if (file) {
  renderFileViewer(file);
} else {
  titleEl.textContent = "附录查看";
  headCopyEl.textContent = "请从附录页面进入对应分类。";
  metaEl.textContent = "未指定附录分类。";
  setTags([]);
  setContentHtml('<p class="viewer-empty">请先返回附录页面，再选择需要查看的指标分类。</p>');
}
