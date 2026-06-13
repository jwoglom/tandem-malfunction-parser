/*
 * Tandem t:slim X2 / Mobi malfunction code parser.
 *
 * Logic ported from pumpx2:
 *   - HighestAamResponse.java  (the displayed "aamId-0xfaultId" code)
 *   - MalfunctionBitmaskStatusResponse.java  (the 26 subsystem bits)
 *
 * The displayed malfunction code is built by pumpx2 as:
 *     String.format("%d-0x%s", aamId, Long.toString(faultId, 16))
 * e.g. "12-0x2071".
 *   - aamId    indexes into the 26-entry subsystem table below.
 *   - faultId  is a more specific fault-locator value (shown in hex on the pump).
 */

// MalfunctionBitmaskStatusResponse.MalfunctionType, in bit order (0..25).
// The aamId of a displayed code is the same index.
const MALFUNCTION_TYPES = [
  "SOFTWARE",
  "CPU_CORE",
  "ARM_MSP_COM",
  "SENSOR",
  "LIPO",
  "TOUCHSCREEN",
  "NVM",
  "DISPLAY",
  "MSP",
  "MOTOR",
  "EXTERNAL_BINS",
  "SW_INIT",
  "VIBE",
  "PERIPH_POWER",
  "P2",
  "DATALOG",
  "SPEAKER",
  "MSP_SUPPLY",
  "CAL_DATA",
  "BTLE",
  "AP",
  "RTC",
  "ARM_BLE_COM",
  "OVERTRAVEL_STALL",
  "UNDERTRAVEL_STALL",
  "PUSHOFF_STALL",
];

// Human-friendly labels for the subsystem each aamId maps to. These describe the
// subsystem, not the specific fault — derived from the pumpx2 enum names.
const SUBSYSTEM_LABELS = {
  SOFTWARE: "Software",
  CPU_CORE: "CPU core",
  ARM_MSP_COM: "ARM ↔ MSP communication",
  SENSOR: "Sensor",
  LIPO: "LiPo battery",
  TOUCHSCREEN: "Touchscreen",
  NVM: "Non-volatile memory",
  DISPLAY: "Display",
  MSP: "MSP processor",
  MOTOR: "Drive motor",
  EXTERNAL_BINS: "External bins",
  SW_INIT: "Software initialization",
  VIBE: "Vibrator motor",
  PERIPH_POWER: "Peripheral power",
  P2: "P2",
  DATALOG: "Data log",
  SPEAKER: "Speaker",
  MSP_SUPPLY: "MSP power supply",
  CAL_DATA: "Calibration data",
  BTLE: "Bluetooth LE",
  AP: "Application processor",
  RTC: "Real-time clock",
  ARM_BLE_COM: "ARM ↔ BLE communication",
  OVERTRAVEL_STALL: "Overtravel stall",
  UNDERTRAVEL_STALL: "Undertravel stall",
  PUSHOFF_STALL: "Push-off stall",
};

// Codes pumpx2 treats as NOT a real malfunction (concurrent with normal alarms).
// Keyed by "aamId-faultId" with the faultId in decimal. See IGNORABLE_CODES in
// HighestAamResponse.java.
const IGNORABLE_CODES = {
  "0-0": "Empty / no malfunction reported.",
  "3-8230": "Typically concurrent with the Pump Reset Alarm; usually ignorable.",
  "18-8311": "Appears on a new pump; likely the Resume Pump Alarm. Usually ignorable.",
  "26-8322": "Known ignorable code.",
};

// Specific codes with a documented meaning (community / pumpx2 test annotations).
// Keyed by "aamId-0xHEXFAULT" (the canonical displayed form).
const KNOWN_CODES = {
  "12-0x2071": "Stuck vibrator motor.",
};

function readableSubsystem(name) {
  return SUBSYSTEM_LABELS[name] || name;
}

/**
 * Parse a displayed malfunction code into structured data.
 * Accepts forgiving forms:
 *   "12-0x2071", "12 0x2071", "12-2071" (faultId hex assumed),
 *   "12/0x2071", and surrounding whitespace.
 *
 * @param {string} input
 * @returns {{ok: boolean, error?: string, ...}}
 */
function parseMalfunctionCode(input) {
  if (input == null) {
    return { ok: false, error: "No code provided." };
  }
  const raw = String(input).trim();
  if (!raw) {
    return { ok: false, error: "No code provided." };
  }

  // aamId is decimal; faultId is hex (optionally prefixed with 0x).
  // Separator may be '-', whitespace, '/' or ':'.
  const m = raw.match(/^(\d+)\s*[-/:\s]\s*(?:0x)?([0-9a-fA-F]+)$/);
  if (!m) {
    return {
      ok: false,
      error:
        'Could not parse. Expected a code like "12-0x2071" (aamId-0xfaultId).',
    };
  }

  const aamId = parseInt(m[1], 10);
  const faultId = parseInt(m[2], 16);

  if (!Number.isFinite(aamId) || !Number.isFinite(faultId)) {
    return { ok: false, error: "Could not parse the numeric parts of the code." };
  }

  const faultHex = faultId.toString(16);
  const canonical = `${aamId}-0x${faultHex}`;

  const subsystemName =
    aamId >= 0 && aamId < MALFUNCTION_TYPES.length
      ? MALFUNCTION_TYPES[aamId]
      : null;

  const ignorableKey = `${aamId}-${faultId}`;
  const ignorable = Object.prototype.hasOwnProperty.call(
    IGNORABLE_CODES,
    ignorableKey
  )
    ? IGNORABLE_CODES[ignorableKey]
    : null;

  const known = Object.prototype.hasOwnProperty.call(KNOWN_CODES, canonical)
    ? KNOWN_CODES[canonical]
    : null;

  return {
    ok: true,
    canonical,
    aamId,
    faultId,
    faultHex: `0x${faultHex}`,
    faultDecimal: faultId,
    subsystemName,
    subsystemIndex: subsystemName ? aamId : null,
    subsystemLabel: subsystemName ? readableSubsystem(subsystemName) : null,
    ignorable,
    known,
  };
}

// Expose for the browser and for any test harness.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseMalfunctionCode,
    MALFUNCTION_TYPES,
    SUBSYSTEM_LABELS,
    IGNORABLE_CODES,
    KNOWN_CODES,
  };
}
