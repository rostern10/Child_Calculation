import assert from "node:assert/strict";
import { evaluateChild } from "../lib/evaluator.mjs";

const cases = [
  {
    name: "24月龄男童立位身高命中2b特殊行且整体正常",
    input: {
      sex: "male",
      birthDate: "2024-06-12",
      evaluationDate: "2026-06-12",
      weightKg: 12.2,
      measureCm: 87.1,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "under7");
      assert.equal(result.derived.monthAge, 24);
      assert.equal(result.table3.ageWeight, "正常");
      assert.equal(result.table3.ageHeight, "正常");
      assert.equal(result.table3.weightForLengthHeight, "正常");
      assert.equal(result.table3.ageBmi, "正常");
      assert.ok(result.notes.includes("24 月龄立位身高的 BMI 采用 2b 标准行进行判定。"));
    },
  },
  {
    name: "36月龄女童年龄别身高落入生长迟缓区间",
    input: {
      sex: "female",
      birthDate: "2023-06-12",
      evaluationDate: "2026-06-12",
      weightKg: 13.5,
      measureCm: 86.0,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "under7");
      assert.equal(result.table3.ageHeight, "生长迟缓");
      assert.equal(result.table2.ageHeight, "下");
    },
  },
  {
    name: "7岁男童自动切换到学龄筛查且BMI正常",
    input: {
      sex: "male",
      birthDate: "2021-06-15",
      evaluationDate: "2028-06-15",
      weightKg: 18,
      measureCm: 110,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "schoolAge");
      assert.equal(result.derived.monthAge, 84);
      assert.equal(result.schoolAgeTable[0].value, "生长迟缓");
      assert.equal(result.schoolAgeTable[1].value, "正常");
      assert.equal(result.schoolAgeTable[2].value, "下等");
    },
  },
  {
    name: "7岁男童BMI可判定为轻度消瘦",
    input: {
      sex: "male",
      birthDate: "2021-06-15",
      evaluationDate: "2028-06-15",
      weightKg: 21.4,
      measureCm: 125,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "schoolAge");
      assert.equal(result.schoolAgeTable[1].value, "轻度消瘦");
    },
  },
  {
    name: "8岁女童BMI可判定为肥胖",
    input: {
      sex: "female",
      birthDate: "2020-06-15",
      evaluationDate: "2028-06-15",
      weightKg: 33,
      measureCm: 130,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "schoolAge");
      assert.equal(result.schoolAgeTable[1].value, "肥胖");
    },
  },
  {
    name: "7岁男童身高达到+2SD以上可判定为上等",
    input: {
      sex: "male",
      birthDate: "2021-06-15",
      evaluationDate: "2028-06-15",
      weightKg: 28,
      measureCm: 138,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "schoolAge");
      assert.equal(result.schoolAgeTable[2].value, "上等");
      assert.equal(result.metrics.schoolAgeHeightDevelopmentSd.result, "上等");
    },
  },
  {
    name: "6岁10月仍按7岁以下最后一档参与年龄别指标评估",
    input: {
      sex: "male",
      birthDate: "2019-08-15",
      evaluationDate: "2026-06-15",
      weightKg: 18.3,
      measureCm: 116,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.ageGroup, "under7");
      assert.equal(result.derived.monthAge, 82);
      assert.equal(result.derived.maxSupportedMonths, 83);
      assert.equal(result.metrics.ageWeight.referenceMode, "carried-forward");
      assert.equal(result.metrics.ageHeight.referenceMode, "carried-forward");
      assert.equal(result.metrics.ageBmi.referenceMode, "carried-forward");
      assert.equal(result.metrics.weightForLengthHeight.referenceMode, "exact");
    },
  },
];

let passed = 0;

for (let index = 0; index < cases.length; index += 1) {
  const testCase = cases[index];
  const result = evaluateChild(testCase.input);
  testCase.assert(result);
  passed += 1;
  console.log("PASS - " + testCase.name);
}

console.log("\n共 " + passed + " 组样例通过。");
