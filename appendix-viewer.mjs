import { STANDARDS } from "./data/standards-data.mjs";

const titleEl = document.querySelector("#viewer-title");
const headCopyEl = document.querySelector("#viewer-head-copy");
const metaEl = document.querySelector("#viewer-meta");
const tagsEl = document.querySelector("#viewer-tags");
const contentEl = document.querySelector("#viewer-content");

const searchParams = new URLSearchParams(window.location.search);
const metricKey = searchParams.get("metric");
const file = searchParams.get("file");

const SD_COLUMNS = [
  { key: "-3", label: "-3SD" },
  { key: "-2", label: "-2SD" },
  { key: "-1", label: "-1SD" },
  { key: "0", label: "中位数" },
  { key: "1", label: "+1SD" },
  { key: "2", label: "+2SD" },
  { key: "3", label: "+3SD" },
];

const SEX_TITLES = {
  male: "男童 7岁以下",
  female: "女童 7岁以下",
};

const VARIANT_LABELS = {
  "2a": "卧位身长",
  "2b": "立位身高",
};

const METRIC_CONFIG = {
  ageWeight: {
    title: "年龄别体重",
    description: "用于低体重、重度低体重的判断。",
    summaryNote: "本页已将 7 岁以下数据按男童、女童分别汇总成两张总表。",
  },
  ageHeight: {
    title: "年龄别身长/身高",
    description: "用于生长迟缓、重度生长迟缓的判断。",
    summaryNote: "24 月龄特殊点会在年龄栏中标注卧位身长或立位身高，便于对照查看。",
  },
  weightForLengthHeight: {
    title: "身长/身高别体重",
    description: "用于消瘦、超重、肥胖、重度肥胖的判断。",
    summaryNote: "每张表都已将 3 岁以下与 3 岁以上数据合并，并在首列标明适用年龄段。",
  },
  ageBmi: {
    title: "年龄别BMI",
    description: "用于 BMI 相关的消瘦、超重、肥胖判断。",
    summaryNote: "24 月龄特殊点会在年龄栏中标注卧位身长或立位身高，便于直接核对。",
  },
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
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

function renderInline(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderRawHtml(raw) {
  if (/^\s*<table[\s>]/i.test(raw)) {
    return `<div class="table-wrap">${raw}</div>`;
  }
  return raw;
}

function buildTag(label) {
  return `<span class="viewer-tag">${escapeHtml(label)}</span>`;
}

function setTags(labels) {
  const safeLabels = labels.filter(Boolean);
  tagsEl.innerHTML = safeLabels.map((label) => buildTag(label)).join("");
  tagsEl.classList.toggle("hidden", safeLabels.length === 0);
}

function setContentHtml(html) {
  contentEl.innerHTML = html;
}

function formatAgeLabel(row) {
  let label = row.ageLabel;
  if (row.variant && VARIANT_LABELS[row.variant]) {
    label = label.replace(/\((2a|2b)\)/giu, "");
    label = `${label}（${VARIANT_LABELS[row.variant]}）`;
  }
  return label;
}

function formatMeasureLabel(value) {
  return String(value).replace(/cm$/iu, "");
}

function renderSdCells(sd) {
  return SD_COLUMNS.map((column) => `<td>${escapeHtml(sd[column.key])}</td>`).join("");
}

function renderAgeMetricTable(metricName, sex) {
  const rows = STANDARDS.metrics[metricName][sex];

  return `
    <section class="summary-section">
      <h2>${SEX_TITLES[sex]}</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>年龄</th>
              ${SD_COLUMNS.map((column) => `<th>${column.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(formatAgeLabel(row))}</td>
                    ${renderSdCells(row.sd)}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGroupedSizeWeightRows(groupLabel, rows) {
  return rows
    .map(
      (row, index) => `
        <tr>
          ${index === 0 ? `<th class="row-group" rowspan="${rows.length}">${groupLabel}</th>` : ""}
          <td>${escapeHtml(formatMeasureLabel(row.measureLabel))}</td>
          ${renderSdCells(row.sd)}
        </tr>
      `,
    )
    .join("");
}

function renderSizeWeightTable(sex) {
  const groups = STANDARDS.metrics.weightForLengthHeight[sex];

  return `
    <section class="summary-section">
      <h2>${SEX_TITLES[sex]}</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>适用年龄</th>
              <th>身长/身高（cm）</th>
              ${SD_COLUMNS.map((column) => `<th>${column.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${renderGroupedSizeWeightRows("3岁以下", groups.under3)}
            ${renderGroupedSizeWeightRows("3岁以上", groups.over3)}
          </tbody>
        </table>
      </div>
    </section>
  `;
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

  titleEl.textContent = `附录：${config.title}`;
  headCopyEl.textContent = config.description;
  metaEl.textContent = `当前分类：${config.title}`;
  setTags([config.title, "7岁以下", "男女总表"]);

  const tableHtml =
    metricName === "weightForLengthHeight"
      ? `${renderSizeWeightTable("male")}${renderSizeWeightTable("female")}`
      : `${renderAgeMetricTable(metricName, "male")}${renderAgeMetricTable(metricName, "female")}`;

  setContentHtml(`
    <p class="sub-note">${escapeHtml(config.summaryNote)}</p>
    ${tableHtml}
  `);
}

function resolveFileTags(fileName) {
  const tags = [];

  if (fileName.includes("附录B")) {
    tags.push("文件类型：附录标准表");
  } else if (fileName.includes("指标汇总")) {
    tags.push("文件类型：指标汇总");
  }

  if (fileName.includes("年龄别体重")) {
    tags.push("指标分类：年龄别体重");
  } else if (fileName.includes("年龄别身长") || fileName.includes("年龄别身高")) {
    tags.push("指标分类：年龄别身长/身高");
  } else if (fileName.includes("身长身高别体重") || fileName.includes("身长/身高别体重")) {
    tags.push("指标分类：身长/身高别体重");
  } else if (fileName.toUpperCase().includes("BMI")) {
    tags.push("指标分类：年龄别BMI");
  }

  return tags;
}

function renderSpecialLine(trimmed) {
  if (/^附件\s*\d+/u.test(trimmed)) {
    return `<h2>${renderInline(trimmed)}</h2>`;
  }
  if (/^表\s*[A-Za-z0-9.\u4e00-\u9fa5]+/u.test(trimmed)) {
    return `<h3 class="block-title">${renderInline(trimmed)}</h3>`;
  }
  if (/^说明[:：]/u.test(trimmed) || /^注[:：]/u.test(trimmed)) {
    return `<p class="sub-note">${renderInline(trimmed)}</p>`;
  }
  if (/^单位/u.test(trimmed)) {
    return `<p class="unit-line">${renderInline(trimmed)}</p>`;
  }
  return null;
}

function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraphBuffer = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }
    html.push(`<p>${paragraphBuffer.map((item) => renderInline(item)).join("<br />")}</p>`);
    paragraphBuffer = [];
  };

  const closeList = () => {
    if (!listType) {
      return;
    }
    html.push(listType === "ol" ? "</ol>" : "</ul>");
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

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
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const specialLineHtml = renderSpecialLine(trimmed);
    if (specialLineHtml) {
      flushParagraph();
      closeList();
      html.push(specialLineHtml);
      continue;
    }

    if (/^\s*<[^>]+>/.test(trimmed)) {
      flushParagraph();
      closeList();
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
      html.push(`<li>${renderInline(unorderedMatch[1])}</li>`);
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
      html.push(`<li>${renderInline(orderedMatch[1])}</li>`);
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

function renderFileViewer(fileName) {
  const decodedFile = decodeURIComponent(fileName);
  const displayTitle = decodedFile.replace(/\.md$/iu, "").replace(/^附录B/iu, "附录");

  titleEl.textContent = displayTitle;
  headCopyEl.textContent = "当前页面用于查看附录整理文件，并自动渲染其中的表格。";
  metaEl.textContent = `当前文件：${displayTitle}`;
  setTags(resolveFileTags(decodedFile));

  fetch(`./appendix/${fileName}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`加载失败：${response.status}`);
      }
      return response.text();
    })
    .then((text) => {
      setContentHtml(renderMarkdown(text));
    })
    .catch((error) => {
      setContentHtml(`<p class="viewer-error">文件加载失败：${escapeHtml(error.message)}</p>`);
    });
}

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
