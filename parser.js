/*
 * Decodes the malfunction code a Tandem pump shows the way pumpX2 and
 * TandemKit do. The tables are in data.js, generated from pumpX2 by
 * scripts/sync_pumpx2.py.
 *
 * The code is HighestAamResponse.getErrorString(): "<aamId>-0x<faultId hex>".
 * Tandem's own app formats it the same way. aamId is the bit index of the
 * malfunction in MalfunctionBitmaskStatusResponse; faultId is a fault-locator
 * value whose meanings are not public.
 */
(function (root) {
  "use strict";

  const PUMPX2 = typeof module !== "undefined" ? require("./data.js") : root.PUMPX2;

  const OTHER_CATEGORIES = [
    { key: "ALARM", label: "Alarm" },
    { key: "ALERT", label: "Alert" },
    { key: "CGM_ALERT", label: "CGM alert" },
    { key: "REMINDER", label: "Reminder" },
  ];

  // pumpX2 has no descriptions for these. Tandem's app names bit 20 "basalIq".
  const MALFUNCTION_GLOSS = {
    1: "Processor core",
    2: "Link between the main (ARM) and MSP processors",
    4: "Rechargeable battery",
    6: "Non-volatile memory",
    8: "MSP processor",
    11: "Software start-up",
    12: "Vibration motor",
    13: "Peripheral power",
    17: "MSP processor power supply",
    18: "Calibration data",
    19: "Bluetooth",
    20: "Basal-IQ / automation",
    21: "Real-time clock",
    22: "Link between the main (ARM) processor and Bluetooth",
    23: "Motor stall: overtravel",
    24: "Motor stall: undertravel",
    25: "Motor stall: push-off",
    26: "Hardware encryption failure",
  };

  // From pumpX2's HighestAamResponse tests.
  const CODE_NOTES = {
    "12-0x2071": "Stuck vibration motor.",
    "3-0x2026": "Seen alongside the pump reset alarm (alarm 3).",
    "18-0x2077": "Seen on a new pump, likely alongside the resume pump alarm (alarm 18).",
  };

  const CODE_PATTERN = /(\d+)\s*[-–—,]\s*(?:0x)?([0-9a-f]+)\b/i;
  const UINT32_MAX = 0xffffffff;

  function entry(category, id) {
    return PUMPX2[category].find((e) => e.id === id) || null;
  }

  /** Reads the code as the pump shows it, such as 12-0x2071, out of whatever was pasted. */
  function decode(input) {
    const m = String(input || "").match(CODE_PATTERN);
    if (!m) return { error: "Enter the code as the pump shows it, such as 12-0x2071." };

    const aamId = Number(m[1]);
    const faultId = parseInt(m[2], 16);
    if (aamId > UINT32_MAX || faultId > UINT32_MAX) {
      return { error: "Both parts of a malfunction code fit in 32 bits." };
    }
    const code = aamId + "-0x" + faultId.toString(16);

    // HighestAamResponse.matchesKnownIds: a known notification with the same
    // id that is active at the same time means the code is not a malfunction.
    const sameId = [];
    for (const cat of OTHER_CATEGORIES) {
      const e = entry(cat.key, aamId);
      if (e && e.known) sameId.push({ category: cat.label, entry: e });
    }

    return {
      code,
      aamId,
      faultId,
      malfunction: entry("MALFUNCTION", aamId),
      gloss: MALFUNCTION_GLOSS[aamId] || null,
      ignorable: PUMPX2.ignorableCodes.some(([a, f]) => a === aamId && f === faultId),
      empty: aamId === 0 && faultId === 0,
      note: CODE_NOTES[code] || null,
      sameId,
    };
  }

  const api = { decode, versions: { pumpx2: PUMPX2.pumpx2, tandemkit: PUMPX2.tandemkit } };
  if (typeof module !== "undefined") module.exports = api;
  else root.MalfunctionParser = api;
})(this);
