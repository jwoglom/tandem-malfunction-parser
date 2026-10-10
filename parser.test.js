const test = require("node:test");
const assert = require("node:assert");
const { decode } = require("./parser.js");

test("the displayed code is aamId-0xfaultId, not a bitmask", () => {
  const r = decode("2-0x20b0", "CODE");
  assert.equal(r.kind, "code");
  assert.equal(r.aamId, 2);
  assert.equal(r.faultId, 0x20b0);
  assert.equal(r.malfunction.name, "ARM_MSP_COM");
});

test("12-0x2071 is the stuck vibration motor", () => {
  const r = decode("12-0x2071", "CODE");
  assert.equal(r.malfunction.name, "VIBE");
  assert.equal(r.note, "Stuck vibration motor.");
  assert.equal(r.ignorable, false);
});

test("a code is read as a code whatever bitmask type is selected", () => {
  assert.equal(decode("12-0x2071", "ALARM").kind, "code");
});

test("accepts the pasted message, an en dash and a missing 0x", () => {
  assert.equal(decode("Malfunction Code: 12–0x2071", "CODE").code, "12-0x2071");
  assert.equal(decode("12-2071", "CODE").code, "12-0x2071");
});

test("pumpX2's ignorable codes are flagged", () => {
  assert.equal(decode("3-0x2026", "CODE").ignorable, true);
  assert.equal(decode("18-0x2077", "CODE").ignorable, true);
  assert.equal(decode("26-0x2082", "CODE").ignorable, true);
  assert.equal(decode("0-0x0", "CODE").empty, true);
});

test("lists known notifications sharing the aamId, as matchesKnownIds does", () => {
  const same = decode("12-0x2071", "CODE").sameId.map((s) => s.category + " " + s.entry.name);
  assert.deepEqual(same, [
    "Alarm BATTERY_SHUTDOWN_ALARM",
    "Alert INCOMPLETE_TEMP_RATE_ALERT",
    "CGM alert SENSOR_EXPIRING_CGM_ALERT",
  ]);
});

test("bit 26 is HW_CRYPTO_FAIL", () => {
  assert.equal(decode("26-0x1", "CODE").malfunction.name, "HW_CRYPTO_FAIL");
});

test("a bare number in code mode is an aamId with no fault ID", () => {
  const r = decode("12", "CODE");
  assert.equal(r.malfunction.name, "VIBE");
  assert.equal(r.faultId, null);
});

test("a hex number in code mode asks for a bitmask type", () => {
  assert.ok(decode("0x1000", "CODE").error);
});

test("decodes a malfunction bitmask", () => {
  const r = decode("0x2000005", "MALFUNCTION");
  assert.deepEqual(r.bits.map((b) => b.entry.name), ["SOFTWARE", "ARM_MSP_COM", "PUSHOFF_STALL"]);
});

test("decodes an alarm bitmask with pumpX2's current names", () => {
  const r = decode(String(1 << 5), "ALARM");
  assert.equal(r.bits[0].entry.name, "CARTRIDGE_ALARM_P2");
  assert.equal(r.bits[0].entry.firmware, "Alarm_P2");
});

test("bits pumpX2 doesn't define have no entry", () => {
  assert.equal(decode("0x80000000", "ALERT").bits[0].entry, null);
});

test("rejects a bitmask wider than 64 bits", () => {
  assert.ok(decode("0x10000000000000000", "ALARM").error);
});
