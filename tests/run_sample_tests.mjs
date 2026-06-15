import assert from "node:assert/strict";
import { evaluateChild } from "../lib/evaluator.mjs";

const cases = [
  {
    name: "24 月龄男童立位身高，命中 2b 特殊行且整体正常",
    input: {
      sex: "male",
      birthDate: "2024-06-12",
      evaluationDate: "2026-06-12",
      weightKg: 12.2,
      measureCm: 87.1,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.derived.monthAge, 24);
      assert.equal(result.table3.ageWeight, "正常");
      assert.equal(result.table3.ageHeight, "正常");
      assert.equal(result.table3.weightForLengthHeight, "正常");
      assert.equal(result.table3.ageBmi, "正常");
      assert.ok(result.notes.includes("24 月龄立位身高的 BMI 采用 2b 标准行进行判定。"));
    },
  },
  {
    name: "12 月龄男童，年龄别体重低于 -3SD",
    input: {
      sex: "male",
      birthDate: "2025-06-12",
      evaluationDate: "2026-06-12",
      weightKg: 6.8,
      measureCm: 75.7,
      measurementMethod: "lying",
    },
    assert(result) {
      assert.equal(result.derived.monthAge, 12);
      assert.equal(result.table3.ageWeight, "重度低体重");
      assert.equal(result.table2.ageWeight, "下");
    },
  },
  {
    name: "36 月龄女童，年龄别身高落在 -3SD 到 -2SD 之间",
    input: {
      sex: "female",
      birthDate: "2023-06-12",
      evaluationDate: "2026-06-12",
      weightKg: 13.5,
      measureCm: 86.0,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.derived.monthAge, 36);
      assert.equal(result.table3.ageHeight, "生长迟缓");
      assert.equal(result.table2.ageHeight, "下");
    },
  },
  {
    name: "60 月龄男童，身高别体重和年龄别 BMI 同时落入肥胖区间",
    input: {
      sex: "male",
      birthDate: "2021-06-12",
      evaluationDate: "2026-06-12",
      weightKg: 23.5,
      measureCm: 112,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.derived.monthAge, 60);
      assert.equal(result.table3.weightForLengthHeight, "肥胖");
      assert.equal(result.table3.ageBmi, "肥胖");
      assert.equal(result.table2.weightForLengthHeight, "上");
      assert.equal(result.table2.ageBmi, "上");
    },
  },
  {
    name: "30 月龄女童卧位身长，BMI 换算后进入超重",
    input: {
      sex: "female",
      birthDate: "2023-12-12",
      evaluationDate: "2026-06-12",
      weightKg: 13.7,
      measureCm: 90.6,
      measurementMethod: "lying",
    },
    assert(result) {
      assert.equal(result.derived.monthAge, 30);
      assert.equal(result.table3.ageBmi, "超重");
      assert.ok(result.notes.includes("24 月龄后录入的是卧位身长，系统按标准说明换算为身高后参与判定。"));
    },
  },
  {
    name: "37 月龄男童，年龄类指标启用季度插值",
    input: {
      sex: "male",
      birthDate: "2023-05-12",
      evaluationDate: "2026-06-12",
      weightKg: 14.5,
      measureCm: 97.0,
      measurementMethod: "standing",
    },
    assert(result) {
      assert.equal(result.derived.monthAge, 37);
      assert.equal(result.table3.ageWeight, "正常");
      assert.equal(result.table3.ageHeight, "正常");
      assert.equal(result.table3.ageBmi, "正常");
      assert.ok(result.notes.includes("年龄别体重使用了相邻标准点线性插值。"));
      assert.ok(result.notes.includes("年龄别身长/身高使用了相邻标准点线性插值。"));
      assert.ok(result.notes.includes("年龄别 BMI 使用了相邻标准点线性插值。"));
    },
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = evaluateChild(testCase.input);
  testCase.assert(result);
  passed += 1;
  console.log(`PASS - ${testCase.name}`);
}

console.log(`\n共 ${passed} 组样例通过。`);
