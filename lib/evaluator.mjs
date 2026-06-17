import STANDARDS from "../data/standards-data.mjs";
import SCHOOL_AGE_STANDARDS from "../data/standards-school-age.mjs";

const UNDER7_METRIC_LABELS = {
  ageWeight: "年龄别体重",
  ageHeight: "年龄别身长/身高",
  weightForLengthHeight: "身长/身高别体重",
  ageBmi: "年龄别 BMI",
};

const SEX_LABELS = {
  male: "男",
  female: "女",
};

const METHOD_LABELS = {
  lying: "卧位身长",
  standing: "立位身高",
};

const SD_BUCKET_LABELS = {
  ltNeg3: "< -3SD",
  neg3ToNeg2: "-3SD <= x < -2SD",
  neg2ToNeg1: "-2SD <= x < -1SD",
  neg1ToPos1: "-1SD <= x < +1SD",
  pos1ToPos2: "+1SD <= x < +2SD",
  pos2ToPos3: "+2SD <= x < +3SD",
  gtePos3: ">= +3SD",
};

const GROWTH_LEVEL_MAP = {
  ltNeg3: "下",
  neg3ToNeg2: "下",
  neg2ToNeg1: "中下",
  neg1ToPos1: "中",
  pos1ToPos2: "中上",
  pos2ToPos3: "上",
  gtePos3: "上",
};

const NUTRITION_STATUS_MAP = {
  ageWeight: {
    ltNeg3: "重度低体重",
    neg3ToNeg2: "低体重",
    neg2ToNeg1: "正常",
    neg1ToPos1: "正常",
    pos1ToPos2: "正常",
    pos2ToPos3: "正常",
    gtePos3: "正常",
  },
  ageHeight: {
    ltNeg3: "重度生长迟缓",
    neg3ToNeg2: "生长迟缓",
    neg2ToNeg1: "正常",
    neg1ToPos1: "正常",
    pos1ToPos2: "正常",
    pos2ToPos3: "正常",
    gtePos3: "正常",
  },
  weightForLengthHeight: {
    ltNeg3: "重度消瘦",
    neg3ToNeg2: "消瘦",
    neg2ToNeg1: "正常",
    neg1ToPos1: "正常",
    pos1ToPos2: "超重",
    pos2ToPos3: "肥胖",
    gtePos3: "重度肥胖",
  },
  ageBmi: {
    ltNeg3: "重度消瘦",
    neg3ToNeg2: "消瘦",
    neg2ToNeg1: "正常",
    neg1ToPos1: "正常",
    pos1ToPos2: "超重",
    pos2ToPos3: "肥胖",
    gtePos3: "重度肥胖",
  },
};

const SCHOOL_AGE_SWITCH_MONTHS = SCHOOL_AGE_STANDARDS.meta.switchMonths;
const SCHOOL_AGE_MAX_SUPPORTED_MONTHS = SCHOOL_AGE_STANDARDS.meta.maxSupportedMonths;
const UNDER7_TABLE_MAX_SUPPORTED_MONTHS = STANDARDS.meta.maxSupportedMonths;
const UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS = SCHOOL_AGE_SWITCH_MONTHS - 1;
const ARRAY_PROTO = Array.prototype;

function isFiniteNumber(value) {
  return typeof value === "number" && isFinite(value);
}

function isNaNNumber(value) {
  return typeof value === "number" && isNaN(value);
}

function arrayIncludes(list, value) {
  return ARRAY_PROTO.indexOf.call(list, value) !== -1;
}

function reverseFind(records, predicate) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (predicate(records[index])) {
      return records[index];
    }
  }
  return null;
}

function uniqueTruthy(values) {
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value || arrayIncludes(result, value)) {
      continue;
    }
    result.push(value);
  }
  return result;
}

function round(value, digits) {
  const precision = typeof digits === "number" ? digits : 2;
  return Number(value.toFixed(precision));
}

function toNumber(value, fieldLabel) {
  const parsed = Number(value);
  if (!isFiniteNumber(parsed)) {
    throw new Error(fieldLabel + " 不是有效数字。");
  }
  return parsed;
}

function parseDateInput(value, fieldLabel) {
  if (!value) {
    throw new Error("未填写" + fieldLabel);
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) {
    throw new Error(fieldLabel + " 格式不正确。");
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
    throw new Error(fieldLabel + " 格式不正确。");
  }

  if (isNaNNumber(date.getTime())) {
    throw new Error(fieldLabel + " 格式不正确。");
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
  const ageText = years > 0 ? years + " 岁 " + remainMonths + " 月" : remainMonths + " 月";

  return {
    months,
    years,
    remainMonths,
    ageText,
    decimalYears: round(months / 12, 4),
  };
}

function sortByMonths(records) {
  return records
    .slice()
    .sort(function sortRecords(left, right) {
      return left.months - right.months || String(left.variant || "").localeCompare(String(right.variant || ""));
    });
}

function interpolateSd(lowerSd, upperSd, ratio) {
  const result = {};
  for (const key of Object.keys(lowerSd)) {
    result[key] = round(lowerSd[key] + (upperSd[key] - lowerSd[key]) * ratio, 4);
  }
  return result;
}

function classifySdBucket(value, sd) {
  if (value < sd["-3"]) {
    return "ltNeg3";
  }
  if (value < sd["-2"]) {
    return "neg3ToNeg2";
  }
  if (value < sd["-1"]) {
    return "neg2ToNeg1";
  }
  if (value < sd["1"]) {
    return "neg1ToPos1";
  }
  if (value < sd["2"]) {
    return "pos1ToPos2";
  }
  if (value < sd["3"]) {
    return "pos2ToPos3";
  }
  return "gtePos3";
}

function build24MonthVariantKey(measurementMethod) {
  return measurementMethod === "lying" ? "2a" : "2b";
}

function normalizeMeasureForMetric(rawMeasureCm, ageMonths, measurementMethod, metricKey) {
  let normalizedMeasureCm = rawMeasureCm;
  let note = null;

  if (measurementMethod === "standing" && ageMonths < 24 && metricKey !== "ageWeight") {
    normalizedMeasureCm = rawMeasureCm + 0.7;
    note = "24 月龄前录入的是立位身高，系统按标准说明换算为身长后参与判定。";
  } else if (measurementMethod === "lying" && ageMonths > 24 && ageMonths < 36 && metricKey !== "ageWeight") {
    normalizedMeasureCm = rawMeasureCm - 0.7;
    note = "24 月龄后录入的是卧位身长，系统按标准说明换算为身高后参与判定。";
  }

  return {
    normalizedMeasureCm: round(normalizedMeasureCm, 2),
    note,
  };
}

function lookupAgeReference(metricKey, sex, ageMonths, measurementMethod) {
  const allRecords = sortByMonths(STANDARDS.metrics[metricKey][sex]);

  if (ageMonths > UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS) {
    throw new Error(
      "当前标准数据仅支持至 " +
        Math.floor(UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS / 12) +
        " 岁" +
        (UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS % 12) +
        "月。"
    );
  }

  if ((metricKey === "ageHeight" || metricKey === "ageBmi") && ageMonths === 24) {
    const variant = build24MonthVariantKey(measurementMethod);
    const exact24 = allRecords.find(function findRecord(record) {
      return record.months === 24 && record.variant === variant;
    });
    if (!exact24) {
      throw new Error(UNDER7_METRIC_LABELS[metricKey] + " 未找到 24 月龄对应标准。");
    }
    return {
      mode: "exact",
      referenceLabel: exact24.ageLabel + " 精确匹配",
      sd: exact24.sd,
    };
  }

  const records = allRecords.filter(function filterSpecialRecord(record) {
    return !(record.months === 24 && record.variant === "2a");
  });
  const exact = records.find(function findExact(record) {
    return record.months === ageMonths;
  });
  if (exact) {
    return {
      mode: "exact",
      referenceLabel: exact.ageLabel + " 精确匹配",
      sd: exact.sd,
    };
  }

  if (ageMonths > UNDER7_TABLE_MAX_SUPPORTED_MONTHS) {
    const lastRecord = records[records.length - 1];
    return {
      mode: "carried-forward",
      referenceLabel: lastRecord.ageLabel + " 最后一档沿用",
      sd: lastRecord.sd,
    };
  }

  const lower = reverseFind(records, function findLower(record) {
    return record.months < ageMonths;
  });
  const upper = records.find(function findUpper(record) {
    return record.months > ageMonths;
  });

  if (!lower || !upper) {
    throw new Error(UNDER7_METRIC_LABELS[metricKey] + " 超出当前标准支持范围。");
  }

  const ratio = (ageMonths - lower.months) / (upper.months - lower.months);
  return {
    mode: "interpolated",
    referenceLabel: lower.ageLabel + " ~ " + upper.ageLabel + " 线性插值",
    sd: interpolateSd(lower.sd, upper.sd, ratio),
  };
}

function lookupMeasureReference(sex, ageMonths, measureCm) {
  const groups = STANDARDS.metrics.weightForLengthHeight[sex];
  const useUnder3 = ageMonths <= 36;
  const records = useUnder3 ? groups.under3.slice() : groups.over3.slice();
  const tableLabel = useUnder3 ? "3 岁及以下身长/身高别体重表" : "3 岁以上身高别体重表";

  const exact = records.find(function findExact(record) {
    return record.measureCm === measureCm;
  });
  if (exact) {
    return {
      mode: "exact",
      tableLabel,
      referenceLabel: exact.measureLabel + " 精确匹配",
      sd: exact.sd,
    };
  }

  const lower = reverseFind(records, function findLower(record) {
    return record.measureCm < measureCm;
  });
  const upper = records.find(function findUpper(record) {
    return record.measureCm > measureCm;
  });

  if (!lower || !upper) {
    const minMeasure = records[0].measureLabel;
    const maxMeasure = records[records.length - 1].measureLabel;
    throw new Error("身长/身高别体重的可支持范围为 " + minMeasure + " ~ " + maxMeasure + "。");
  }

  const ratio = (measureCm - lower.measureCm) / (upper.measureCm - lower.measureCm);
  return {
    mode: "interpolated",
    tableLabel,
    referenceLabel: lower.measureLabel + " ~ " + upper.measureLabel + " 线性插值",
    sd: interpolateSd(lower.sd, upper.sd, ratio),
  };
}

function evaluateUnder7Metric(metricKey, context) {
  const sex = context.sex;
  const ageMonths = context.ageMonths;
  const weightKg = context.weightKg;
  const rawMeasureCm = context.rawMeasureCm;
  const measurementMethod = context.measurementMethod;
  const measureInfo = normalizeMeasureForMetric(rawMeasureCm, ageMonths, measurementMethod, metricKey);

  let reference;
  let evaluationValue;
  let calculationNote = measureInfo.note;

  if (metricKey === "ageWeight") {
    reference = lookupAgeReference(metricKey, sex, ageMonths, measurementMethod);
    evaluationValue = weightKg;
  } else if (metricKey === "ageHeight") {
    reference = lookupAgeReference(metricKey, sex, ageMonths, measurementMethod);
    evaluationValue = measureInfo.normalizedMeasureCm;
  } else if (metricKey === "weightForLengthHeight") {
    reference = lookupMeasureReference(sex, ageMonths, measureInfo.normalizedMeasureCm);
    evaluationValue = weightKg;
  } else if (metricKey === "ageBmi") {
    reference = lookupAgeReference(metricKey, sex, ageMonths, measurementMethod);
    evaluationValue = weightKg / Math.pow(measureInfo.normalizedMeasureCm / 100, 2);
    evaluationValue = round(evaluationValue, 4);

    if (!calculationNote && measurementMethod === "standing" && ageMonths === 24) {
      calculationNote = "24 月龄立位身高的 BMI 采用 2b 标准行进行判定。";
    } else if (!calculationNote && measurementMethod === "lying" && ageMonths === 24) {
      calculationNote = "24 月龄卧位身长的 BMI 采用 2a 标准行进行判定。";
    }
  } else {
    throw new Error("未知指标：" + metricKey);
  }

  const bucketKey = classifySdBucket(evaluationValue, reference.sd);
  return {
    metricKey,
    metricLabel: UNDER7_METRIC_LABELS[metricKey],
    inputValue: metricKey === "ageWeight" || metricKey === "weightForLengthHeight" ? weightKg : rawMeasureCm,
    evaluationValue: round(evaluationValue, 2),
    normalizedMeasureCm:
      metricKey === "ageHeight" || metricKey === "weightForLengthHeight" || metricKey === "ageBmi"
        ? measureInfo.normalizedMeasureCm
        : null,
    sdBucketKey: bucketKey,
    sdBucketLabel: SD_BUCKET_LABELS[bucketKey],
    growthLevel: GROWTH_LEVEL_MAP[bucketKey],
    nutritionStatus: NUTRITION_STATUS_MAP[metricKey][bucketKey],
    referenceMode: reference.mode,
    referenceLabel: reference.referenceLabel,
    tableLabel: reference.tableLabel || null,
    referenceSd: {
      "-3": round(reference.sd["-3"], 2),
      "-2": round(reference.sd["-2"], 2),
      "-1": round(reference.sd["-1"], 2),
      "0": round(reference.sd["0"], 2),
      "1": round(reference.sd["1"], 2),
      "2": round(reference.sd["2"], 2),
      "3": round(reference.sd["3"], 2),
    },
    calculationNote,
  };
}

function validateInput(input) {
  if (!input.sex) {
    throw new Error("未选择性别。");
  }
  if (!arrayIncludes(["male", "female"], input.sex)) {
    throw new Error("性别只能为男或女。");
  }
  if (!input.measurementMethod) {
    throw new Error("未填写测量方式。");
  }
  if (!arrayIncludes(["lying", "standing"], input.measurementMethod)) {
    throw new Error("测量方式只能为卧位身长或立位身高。");
  }

  const weightKg = toNumber(input.weightKg, "体重");
  const measureCm = toNumber(input.measureCm, "身长/身高");
  if (weightKg <= 0 || weightKg > 150) {
    throw new Error("体重超出可支持范围。");
  }
  if (measureCm <= 30 || measureCm > 220) {
    throw new Error("身长/身高超出可支持范围。");
  }

  const birthDate = parseDateInput(input.birthDate, "出生日期");
  const evaluationDate = parseDateInput(input.evaluationDate, "评估日期");
  const ageInfo = calculateAgeInfo(birthDate, evaluationDate);

  if (ageInfo.months < SCHOOL_AGE_SWITCH_MONTHS && ageInfo.months > UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS) {
    throw new Error(
      "当前 7 岁以下标准数据仅支持至 " +
        Math.floor(UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS / 12) +
        " 岁 " +
        (UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS % 12) +
        " 月。"
    );
  }

  if (ageInfo.months >= SCHOOL_AGE_SWITCH_MONTHS && ageInfo.months > SCHOOL_AGE_MAX_SUPPORTED_MONTHS) {
    throw new Error("当前 7 岁及以上标准数据仅支持至 18 岁。");
  }

  return {
    sex: input.sex,
    sexLabel: SEX_LABELS[input.sex],
    measurementMethod: input.measurementMethod,
    measurementMethodLabel: METHOD_LABELS[input.measurementMethod],
    birthDate,
    evaluationDate,
    weightKg: round(weightKg, 2),
    rawMeasureCm: round(measureCm, 2),
    ageInfo,
  };
}

function lookupSchoolAgeBand(metricName, sex, ageMonths) {
  const records = SCHOOL_AGE_STANDARDS[metricName][sex];
  const exact = reverseFind(records, function findRecord(record) {
    return record.months <= ageMonths;
  });
  if (!exact) {
    throw new Error("未找到对应的 7 岁及以上标准数据。");
  }
  return exact;
}

function evaluateSchoolAgeHeight(validated) {
  const record = lookupSchoolAgeBand("heightScreening", validated.sex, validated.ageInfo.months);
  const result = validated.rawMeasureCm <= record.cutoffCm ? "生长迟缓" : "正常";
  return {
    metricKey: "schoolAgeHeightScreening",
    metricLabel: "年龄身高筛查生长迟缓等级结果",
    ageLabel: record.ageLabel,
    cutoffCm: record.cutoffCm,
    valueCm: validated.rawMeasureCm,
    result,
    referenceText: "对应年龄段身高界值为 ≤ " + record.cutoffCm + " cm",
  };
}

function evaluateSchoolAgeHeightDevelopment(validated) {
  const record = lookupSchoolAgeBand("heightDevelopmentSd", validated.sex, validated.ageInfo.months);
  const heightCm = validated.rawMeasureCm;
  let result = "中等";

  if (heightCm >= record.sd["2"]) {
    result = "上等";
  } else if (heightCm >= record.sd["1"]) {
    result = "中上等";
  } else if (heightCm < record.sd["-2"]) {
    result = "下等";
  } else if (heightCm < record.sd["-1"]) {
    result = "中下等";
  }

  return {
    metricKey: "schoolAgeHeightDevelopmentSd",
    metricLabel: "身高发育等级判定结果",
    ageLabel: record.ageLabel,
    valueCm: heightCm,
    thresholds: {
      neg2: record.sd["-2"],
      neg1: record.sd["-1"],
      median: record.sd["0"],
      pos1: record.sd["1"],
      pos2: record.sd["2"],
    },
    result,
    referenceText:
      "< -2SD 为下等，-2SD~<-1SD 为中下等，-1SD~<+1SD 为中等，+1SD~<+2SD 为中上等，≥ +2SD 为上等。",
  };
}

function evaluateSchoolAgeBmi(validated) {
  const bmi = round(validated.weightKg / Math.pow(validated.rawMeasureCm / 100, 2), 2);
  const record = lookupSchoolAgeBand("bmiScreening", validated.sex, validated.ageInfo.months);
  let result = "正常";

  if (bmi <= record.severeMax) {
    result = "中重度消瘦";
  } else if (bmi <= record.mildMax) {
    result = "轻度消瘦";
  } else if (bmi >= record.obesityMin) {
    result = "肥胖";
  } else if (bmi >= record.overweightMin) {
    result = "超重";
  }

  return {
    metricKey: "schoolAgeBmiScreening",
    metricLabel: "年龄BMI筛查营养状态结果",
    ageLabel: record.ageLabel,
    bmi,
    severeMax: record.severeMax,
    mildMax: record.mildMax,
    overweightMin: record.overweightMin,
    obesityMin: record.obesityMin,
    result,
    referenceText:
      "中重度消瘦 ≤ " +
      record.severeMax +
      "，轻度消瘦 ≤ " +
      record.mildMax +
      "，超重 ≥ " +
      record.overweightMin +
      "，肥胖 ≥ " +
      record.obesityMin,
  };
}

function buildCommonResultPayload(input, validated, bmiValue) {
  return {
    input: {
      sex: validated.sex,
      sexLabel: validated.sexLabel,
      measurementMethod: validated.measurementMethod,
      measurementMethodLabel: validated.measurementMethodLabel,
      birthDate: input.birthDate,
      evaluationDate: input.evaluationDate,
      weightKg: validated.weightKg,
      measureCm: validated.rawMeasureCm,
    },
    derived: {
      monthAge: validated.ageInfo.months,
      actualAge: validated.ageInfo.ageText,
      bmi: bmiValue,
      maxSupportedMonths:
        validated.ageInfo.months >= SCHOOL_AGE_SWITCH_MONTHS
          ? SCHOOL_AGE_MAX_SUPPORTED_MONTHS
          : UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS,
    },
  };
}

function evaluateUnder7(input, validated) {
  const context = {
    sex: validated.sex,
    ageMonths: validated.ageInfo.months,
    weightKg: validated.weightKg,
    rawMeasureCm: validated.rawMeasureCm,
    measurementMethod: validated.measurementMethod,
  };

  const ageWeight = evaluateUnder7Metric("ageWeight", context);
  const ageHeight = evaluateUnder7Metric("ageHeight", context);
  const weightForLengthHeight = evaluateUnder7Metric("weightForLengthHeight", context);
  const ageBmi = evaluateUnder7Metric("ageBmi", context);

  const notes = uniqueTruthy([
    ageHeight.calculationNote,
    weightForLengthHeight.calculationNote,
    ageBmi.calculationNote,
    ageWeight.referenceMode === "interpolated" ? "年龄别体重使用了相邻标准点线性插值。" : null,
    ageHeight.referenceMode === "interpolated" ? "年龄别身长/身高使用了相邻标准点线性插值。" : null,
    weightForLengthHeight.referenceMode === "interpolated" ? "身长/身高别体重使用了相邻标准点线性插值。" : null,
    ageBmi.referenceMode === "interpolated" ? "年龄别 BMI 使用了相邻标准点线性插值。" : null,
  ]);

  const result = buildCommonResultPayload(input, validated, ageBmi.evaluationValue);
  result.ageGroup = "under7";
  result.metrics = {
    ageWeight,
    ageHeight,
    weightForLengthHeight,
    ageBmi,
  };
  result.table2 = {
    ageWeight: ageWeight.growthLevel,
    ageHeight: ageHeight.growthLevel,
    weightForLengthHeight: weightForLengthHeight.growthLevel,
    ageBmi: ageBmi.growthLevel,
  };
  result.table3 = {
    ageWeight: ageWeight.nutritionStatus,
    ageHeight: ageHeight.nutritionStatus,
    weightForLengthHeight: weightForLengthHeight.nutritionStatus,
    ageBmi: ageBmi.nutritionStatus,
  };
  result.notes = notes;
  return result;
}

function evaluateSchoolAge(input, validated) {
  const heightMetric = evaluateSchoolAgeHeight(validated);
  const heightDevelopmentMetric = evaluateSchoolAgeHeightDevelopment(validated);
  const bmiMetric = evaluateSchoolAgeBmi(validated);

  const result = buildCommonResultPayload(input, validated, bmiMetric.bmi);
  result.ageGroup = "schoolAge";
  result.metrics = {
    schoolAgeHeightScreening: heightMetric,
    schoolAgeHeightDevelopmentSd: heightDevelopmentMetric,
    schoolAgeBmiScreening: bmiMetric,
  };
  result.schoolAgeTable = [
    {
      item: "年龄身高筛查生长迟缓等级结果",
      value: heightMetric.result,
    },
    {
      item: "年龄BMI筛查营养状态结果",
      value: bmiMetric.result,
    },
    {
      item: "身高发育等级判定结果",
      value: heightDevelopmentMetric.result,
    },
  ];
  result.notes = [
    "7 岁及以上自动切换为学龄儿童青少年筛查标准。",
    "7 岁及以上同时增加身高发育等级的标准差法判定。",
    "年龄按整月龄换算，并向下匹配到对应的半岁年龄段界值。",
  ];
  return result;
}

export function evaluateChild(input) {
  const validated = validateInput(input);
  if (validated.ageInfo.months >= SCHOOL_AGE_SWITCH_MONTHS) {
    return evaluateSchoolAge(input, validated);
  }
  return evaluateUnder7(input, validated);
}

export function getRecommendedMeasurementMethod(ageMonths) {
  return ageMonths < 24 ? "lying" : "standing";
}

export function getMaxSupportedMonths(ageMonths) {
  return ageMonths >= SCHOOL_AGE_SWITCH_MONTHS ? SCHOOL_AGE_MAX_SUPPORTED_MONTHS : UNDER7_EFFECTIVE_MAX_SUPPORTED_MONTHS;
}

export { UNDER7_METRIC_LABELS as METRIC_LABELS, METHOD_LABELS, SEX_LABELS };
