const test = require("node:test");
const assert = require("node:assert");
const { decode } = require("./parser.js");

test("the displayed code is aamId-0xfaultId, not a bitmask", () => {
  const r = decode("2-0x20b0");
  assert.equal(r.aamId, 2);
  assert.equal(r.faultId, 0x20b0);
  assert.equal(r.malfunction.name, "ARM_MSP_COM");
});

test("12-0x2071 is the stuck vibration motor", () => {
  const r = decode("12-0x2071");
  assert.equal(r.malfunction.name, "VIBE");
  assert.equal(r.note, "Stuck vibration motor.");
  assert.equal(r.ignorable, false);
});

test("accepts the pasted message, an en dash and a missing 0x", () => {
  assert.equal(decode("Malfunction Code: 12–0x2071").code, "12-0x2071");
  assert.equal(decode("12-2071").code, "12-0x2071");
});

test("pumpX2's ignorable codes are flagged", () => {
  assert.equal(decode("3-0x2026").ignorable, true);
  assert.equal(decode("18-0x2077").ignorable, true);
  assert.equal(decode("26-0x2082").ignorable, true);
  assert.equal(decode("0-0x0").empty, true);
});

test("lists known notifications sharing the aamId, as matchesKnownIds does", () => {
  const same = decode("12-0x2071").sameId.map((s) => s.category + " " + s.entry.name);
  assert.deepEqual(same, [
    "Alarm BATTERY_SHUTDOWN_ALARM",
    "Alert INCOMPLETE_TEMP_RATE_ALERT",
    "CGM alert SENSOR_EXPIRING_CGM_ALERT",
  ]);
});

test("bit 26 is HW_CRYPTO_FAIL", () => {
  assert.equal(decode("26-0x1").malfunction.name, "HW_CRYPTO_FAIL");
});

test("an aamId past pumpX2's table has no malfunction entry", () => {
  assert.equal(decode("40-0x1").malfunction, null);
});

test("anything without both parts is not a code", () => {
  assert.ok(decode("12").error);
  assert.ok(decode("0x1000").error);
  assert.ok(decode("").error);
});

test("rejects parts wider than 32 bits", () => {
  assert.ok(decode("1-0x100000000").error);
});
