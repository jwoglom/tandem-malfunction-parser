/*
 * Tandem t:slim X2 / Mobi malfunction code parser.
 *
 * Logic and data ported from pumpx2 (dev branch):
 *   - HighestAamResponse.java            (the displayed "aamId-0xfaultId" code)
 *   - MalfunctionBitmaskStatusResponse.java  (26 malfunction subsystem bits)
 *   - AlarmStatusResponse.java           (AlarmResponseType + descriptions)
 *   - AlertStatusResponse.java           (AlertResponseType + descriptions)
 *   - CGMAlertStatusResponse.java        (CGMAlert names)
 *   - ReminderStatusResponse.java        (ReminderType names)
 *   - ActiveAamBitsResponse.java         (AamType: reminder/alert/alarm/cgm/malfunction)
 *
 * The displayed malfunction code is built by pumpx2 as:
 *     String.format("%d-0x%s", aamId, Long.toString(faultId, 16))   // e.g. "12-0x2071"
 *
 *   - aamId   is a BIT INDEX. Crucially, the five notification categories
 *             (reminder/alert/alarm/CGM-alert/malfunction) all share the same
 *             0-63 bit space, so the same aamId means different things in each
 *             category. pumpx2 uses this to decide whether a reported
 *             "malfunction" is really a concurrent alarm/alert (see
 *             HighestAamResponse.matchesKnownIds + IGNORABLE_CODES).
 *   - faultId is a more specific fault-locator value, shown in hex on the pump.
 */

// ActiveAamBitsResponse.AamType
const AAM_TYPES = {
  "-1": "UNKNOWN",
  0: "REMINDER",
  1: "ALERT",
  2: "ALARM",
  3: "CGM_ALERT",
  4: "MALFUNCTION",
  5: "NONE",
};

// MalfunctionBitmaskStatusResponse.MalfunctionType (bits 0..25).
// The aamId of a displayed malfunction code is this same index.
const MALFUNCTION_TYPES = {
  0: { name: "SOFTWARE", desc: "Software" },
  1: { name: "CPU_CORE", desc: "CPU core" },
  2: { name: "ARM_MSP_COM", desc: "ARM ↔ MSP communication" },
  3: { name: "SENSOR", desc: "Sensor" },
  4: { name: "LIPO", desc: "LiPo battery" },
  5: { name: "TOUCHSCREEN", desc: "Touchscreen" },
  6: { name: "NVM", desc: "Non-volatile memory" },
  7: { name: "DISPLAY", desc: "Display" },
  8: { name: "MSP", desc: "MSP processor" },
  9: { name: "MOTOR", desc: "Drive motor" },
  10: { name: "EXTERNAL_BINS", desc: "External bins" },
  11: { name: "SW_INIT", desc: "Software initialization" },
  12: { name: "VIBE", desc: "Vibrator motor" },
  13: { name: "PERIPH_POWER", desc: "Peripheral power" },
  14: { name: "P2", desc: "P2" },
  15: { name: "DATALOG", desc: "Data log" },
  16: { name: "SPEAKER", desc: "Speaker" },
  17: { name: "MSP_SUPPLY", desc: "MSP power supply" },
  18: { name: "CAL_DATA", desc: "Calibration data" },
  19: { name: "BTLE", desc: "Bluetooth LE" },
  20: { name: "AP", desc: "Application processor" },
  21: { name: "RTC", desc: "Real-time clock" },
  22: { name: "ARM_BLE_COM", desc: "ARM ↔ BLE communication" },
  23: { name: "OVERTRAVEL_STALL", desc: "Overtravel stall" },
  24: { name: "UNDERTRAVEL_STALL", desc: "Undertravel stall" },
  25: { name: "PUSHOFF_STALL", desc: "Push-off stall" },
};

// AlarmStatusResponse.AlarmResponseType (named entries only; DEFAULT_* omitted).
const ALARM_TYPES = {
  0: { name: "CARTRIDGE_ALARM", desc: "There is an issue with the cartridge and it needs to be replaced." },
  1: { name: "CARTRIDGE_ALARM2", desc: "There is an issue with the cartridge and it needs to be replaced." },
  2: { name: "OCCLUSION_ALARM", desc: "An occlusion has occurred. Please check your pump site and tubing and restart insulin delivery." },
  3: { name: "PUMP_RESET_ALARM", desc: "The pump was reset. IOB has been reset to 0 and CGM may need to be re-activated." },
  5: { name: "CARTRIDGE_ALARM3", desc: "There is an issue with the cartridge and it needs to be replaced." },
  6: { name: "CARTRIDGE_ALARM4", desc: "There is an issue with the cartridge and it needs to be replaced." },
  7: { name: "AUTO_OFF_ALARM", desc: "Pump will stop delivering insulin automatically soon because no user activity has occurred and the auto-off setting is enabled." },
  8: { name: "EMPTY_CARTRIDGE_ALARM", desc: "Cartridge is out of insulin and insulin delivery cannot occur. Please fill a new cartridge." },
  9: { name: "CARTRIDGE_ALARM5", desc: "There is an issue with the cartridge and it needs to be replaced." },
  10: { name: "TEMPERATURE_ALARM", desc: "Pump temperature is out of range and insulin cannot be safely delivered." },
  11: { name: "TEMPERATURE_ALARM2", desc: "Pump temperature is out of range and insulin cannot be safely delivered." },
  12: { name: "BATTERY_SHUTDOWN_ALARM", desc: "Pump battery level is critically low and the device will shut down. Please charge pump immediately." },
  14: { name: "INVALID_DATE_ALARM", desc: "The pump's configured date is invalid." },
  15: { name: "TEMPERATURE_ALARM3", desc: "Pump temperature is out of range and insulin cannot be safely delivered." },
  16: { name: "CARTRIDGE_ALARM6", desc: "There is an issue with the cartridge and it needs to be replaced." },
  18: { name: "RESUME_PUMP_ALARM", desc: "Insulin delivery is currently off. Please restart insulin delivery soon." },
  20: { name: "CARTRIDGE_ALARM7", desc: "There is an issue with the cartridge and it needs to be replaced." },
  21: { name: "ALTITUDE_ALARM", desc: "Pump altitude is out of range and insulin cannot be safely delivered." },
  22: { name: "STUCK_BUTTON_ALARM", desc: "The pump button may be stuck or has been pressed for too long a period of time." },
  23: { name: "RESUME_PUMP_ALARM2", desc: "Insulin delivery is currently off. Please restart insulin delivery soon." },
  24: { name: "ATMOSPHERIC_PRESSURE_OUT_OF_RANGE_ALARM", desc: "Pump atmospheric pressure is out of range and insulin cannot be safely delivered." },
  25: { name: "CARTRIDGE_REMOVED_ALARM", desc: "The cartridge was removed from the pump. Please fill a new cartridge." },
  26: { name: "OCCLUSION_ALARM2", desc: "An occlusion has occurred. Please check your pump site and tubing and restart insulin delivery." },
  29: { name: "CARTRIDGE_ALARM10", desc: "There is an issue with the cartridge and it needs to be replaced." },
  30: { name: "CARTRIDGE_ALARM11", desc: "There is an issue with the cartridge and it needs to be replaced." },
  31: { name: "CARTRIDGE_ALARM12", desc: "There is an issue with the cartridge and it needs to be replaced." },
  34: { name: "CARTRIDGE_ALARM_34", desc: "There is an issue with the cartridge and it needs to be replaced." },
};

// AlertStatusResponse.AlertResponseType (named entries only; DEFAULT_* omitted).
const ALERT_TYPES = {
  0: { name: "LOW_INSULIN_ALERT", desc: "Low amount of insulin remaining in the cartridge." },
  1: { name: "USB_CONNECTION_ALERT", desc: "Pump is not charging over USB." },
  2: { name: "LOW_POWER_ALERT", desc: "Power level is low and the pump needs to be charged." },
  3: { name: "LOW_POWER_ALERT2", desc: "Power level is low and the pump needs to be charged." },
  4: { name: "DATA_ERROR_ALERT", desc: null },
  5: { name: "AUTO_OFF_ALERT", desc: "The pump is about to turn off due to the configured auto-off interval." },
  6: { name: "MAX_BASAL_RATE_ALERT", desc: "The pump is delivering at the maximum allowed basal rate." },
  7: { name: "POWER_SOURCE_ALERT", desc: "The power source provided is not able to charge the pump." },
  8: { name: "MIN_BASAL_ALERT", desc: "The pump is delivering at the minimum allowed basal rate." },
  9: { name: "CONNECTION_ERROR_ALERT", desc: null },
  10: { name: "CONNECTION_ERROR_ALERT2", desc: null },
  11: { name: "INCOMPLETE_BOLUS_ALERT", desc: "The bolus window was opened but a bolus was not started." },
  12: { name: "INCOMPLETE_TEMP_RATE_ALERT", desc: "The temp rate window was opened but the temp rate was not started." },
  13: { name: "INCOMPLETE_CARTRIDGE_CHANGE_ALERT", desc: "The cartridge change was started but not completed." },
  14: { name: "INCOMPLETE_FILL_TUBING_ALERT", desc: "Fill tubing was started but not completed." },
  15: { name: "INCOMPLETE_FILL_CANNULA_ALERT", desc: "Fill cannula was started but not completed." },
  16: { name: "INCOMPLETE_SETTING_ALERT", desc: null },
  17: { name: "LOW_INSULIN_ALERT2", desc: "Low amount of insulin remaining in the cartridge." },
  18: { name: "MAX_BASAL_ALERT", desc: "The maxmium basal was reached." },
  19: { name: "LOW_TRANSMITTER_ALERT", desc: "The CGM transmitter battery is low." },
  20: { name: "TRANSMITTER_ALERT", desc: "There is an alert from the CGM transmitter." },
  22: { name: "SENSOR_EXPIRING_ALERT", desc: "The CGM sensor is expiring soon." },
  23: { name: "PUMP_REBOOTING_ALERT", desc: "The pump is rebooting." },
  24: { name: "DEVICE_CONNECTION_ERROR", desc: null },
  25: { name: "CGM_GRAPH_REMOVED", desc: "It has been 24 hours since your last sensor session ended, so your current glucose reading now displays the last glucose value entered in the bolus calculator." },
  26: { name: "MIN_BASAL_ALERT2", desc: "The pump is delivering at the minimum allowed basal rate." },
  27: { name: "INCOMPLETE_CALIBRATION", desc: "The CGM calibration was incomplete." },
  28: { name: "CALIBRATION_TIMEOUT", desc: "The timeout was reached for CGM calibration." },
  29: { name: "INVALID_TRANSMITTER_ID", desc: "The Dexcom G6 or G7 transmitter ID is invalid." },
  33: { name: "BUTTON_ALERT", desc: "The pump button was held down for too long and is temporarily disabled to avoid accidental delivery of insulin." },
  34: { name: "QUICK_BOLUS_ALERT", desc: "Quick bolus mode was entered but no bolus was started." },
  35: { name: "BASAL_IQ_ALERT", desc: "BasalIQ has reduced basal insulin to avoid a low." },
  39: { name: "TRANSMITTER_END_OF_LIFE", desc: "The CGM transmitter is reaching its end of life and cannot be used." },
  40: { name: "CGM_ERROR", desc: "CGM error reported" },
  41: { name: "CGM_ERROR2", desc: "CGM error reported" },
  42: { name: "CGM_ERROR3", desc: "CGM error reported" },
  44: { name: "TRANSMITTER_EXPIRING_ALERT", desc: "The CGM transmitter is expiring soon." },
  45: { name: "TRANSMITTER_EXPIRING_ALERT2", desc: "The CGM transmitter is expiring soon." },
  46: { name: "TRANSMITTER_EXPIRING_ALERT3", desc: "The CGM transmitter is expiring soon." },
  48: { name: "CGM_UNAVAILABLE", desc: "The CGM is unavailable due to a problem with the sensor." },
  49: { name: "FILL_TUBING_STILL_IN_PROGRESS", desc: "The fill tubing process is still in progress and was not completed." },
  54: { name: "DEVICE_PAIRED", desc: "The pump was paired successfully to a Bluetooth device." },
};

// CGMAlertStatusResponse.CGMAlert (named entries only; DEFAULT_* omitted; no descriptions in pumpx2).
const CGM_ALERTS = {
  1: { name: "FIXED_LOW_CGM_ALERT", desc: null },
  2: { name: "HIGH_CGM_ALERT", desc: null },
  3: { name: "LOW_CGM_ALERT", desc: null },
  4: { name: "CALIBRATION_REQUEST_CGM_ALERT", desc: null },
  5: { name: "RISE_CGM_ALERT", desc: null },
  6: { name: "RAPID_RISE_CGM_ALERT", desc: null },
  7: { name: "FALL_CGM_ALERT", desc: null },
  8: { name: "RAPID_FALL_CGM_ALERT", desc: null },
  9: { name: "LOW_CALIBRATION_ERROR_CGM_ALERT", desc: null },
  10: { name: "HIGH_CALIBRATION_ERROR_CGM_ALERT", desc: null },
  11: { name: "SENSOR_FAILED_CGM_ALERT", desc: null },
  12: { name: "SENSOR_EXPIRING_CGM_ALERT", desc: null },
  13: { name: "SENSOR_EXPIRED_CGM_ALERT", desc: null },
  14: { name: "OUT_OF_RANGE_CGM_ALERT", desc: null },
  16: { name: "FIRST_START_CALIBRATION_CGM_ALERT", desc: null },
  17: { name: "SECOND_START_CALIBRATION_CGM_ALERT", desc: null },
  18: { name: "CALIBRATION_REQUIRED_CGM_ALERT", desc: null },
  19: { name: "LOW_TRANSMITTER_CGM_ALERT", desc: null },
  20: { name: "TRANSMITTER_CGM_ALERT", desc: null },
  22: { name: "SENSOR_EXPIRING_CGM_ALERT2", desc: null },
  25: { name: "SENSOR_REUSE", desc: null },
  26: { name: "TEMPERATURE_CGM_ALERT", desc: null },
  27: { name: "FAILED_CONNECTION_CGM_ALERT", desc: null },
  39: { name: "TRANSMITTER_EXPIRED_CGM_ALERT", desc: null },
  40: { name: "PUMP_BLUETOOTH_ERROR_CGM_ALERT", desc: null },
};

// ReminderStatusResponse.ReminderType (named entries only; DEFAULT_* omitted; no descriptions in pumpx2).
const REMINDER_TYPES = {
  0: { name: "LOW_BG_REMINDER", desc: null },
  1: { name: "HIGH_BG_REMINDER", desc: null },
  2: { name: "SITE_CHANGE_REMINDER", desc: null },
  3: { name: "MISSED_MEAL_REMINDER", desc: null },
  4: { name: "MISSED_MEAL_REMINDER1", desc: null },
  5: { name: "MISSED_MEAL_REMINDER2", desc: null },
  6: { name: "MISSED_MEAL_REMINDER3", desc: null },
  7: { name: "AFTER_BOLUS_BG_REMINDER", desc: null },
  8: { name: "ADDITIONAL_BOLUS_REMINDER", desc: null },
};

// Categories that share the 0-63 bit/index space, in pumpx2 AamType order.
const CATEGORIES = [
  { key: "MALFUNCTION", label: "Malfunction", table: MALFUNCTION_TYPES, aamType: 4 },
  { key: "ALARM", label: "Alarm", table: ALARM_TYPES, aamType: 2 },
  { key: "ALERT", label: "Alert", table: ALERT_TYPES, aamType: 1 },
  { key: "CGM_ALERT", label: "CGM Alert", table: CGM_ALERTS, aamType: 3 },
  { key: "REMINDER", label: "Reminder", table: REMINDER_TYPES, aamType: 0 },
];

// Codes pumpx2 treats as NOT a real malfunction (concurrent with normal alarms).
// Keyed by "aamId-faultId" with the faultId in decimal (HighestAamResponse.IGNORABLE_CODES).
const IGNORABLE_CODES = {
  "0-0": "Empty / no malfunction reported.",
  "3-8230": "Typically concurrent with the Pump Reset Alarm (alarm bit 3); usually ignorable.",
  "18-8311": "Appears on a new pump; likely the Resume Pump Alarm (alarm bit 18). Usually ignorable.",
  "26-8322": "Known ignorable code.",
};

// Specific codes with a documented meaning (community / pumpx2 test annotations).
// Keyed by the canonical displayed form "aamId-0xHEXFAULT".
const KNOWN_CODES = {
  "12-0x2071": "Stuck vibrator motor.",
};

function lookup(table, index) {
  return Object.prototype.hasOwnProperty.call(table, index) ? table[index] : null;
}

/**
 * Turn a user-entered value into a 64-bit BigInt.
 * Accepts:
 *   - hex with prefix:        0x1000
 *   - hex without prefix:     1000a (any token containing a-f)
 *   - decimal:                4096
 *   - codeA / codeB pair:     "2-0x20b0", "2, 0x20b0", "2 0x20b0"
 *                             -> codeA | (codeB << 32)
 *                             (matches MalfunctionBitmaskStatusResponse(codeA, codeB),
 *                              which stores them little-endian as one uint64.
 *                              This is the displayed "codeA-0xcodeB" form.)
 * @returns {BigInt|null}
 */
function toBitmaskValue(input) {
  let s = String(input).trim().toLowerCase();
  if (!s) return null;

  // codeA / codeB pair (two 32-bit halves combined little-endian).
  // Separators: dash (the displayed form), comma, semicolon, or whitespace.
  const pair = s.split(/\s*[,;-]\s*|\s+/).filter(Boolean);
  if (pair.length === 2) {
    const a = parseSingle(pair[0]);
    const b = parseSingle(pair[1]);
    if (a === null || b === null) return null;
    return (a & 0xffffffffn) | ((b & 0xffffffffn) << 32n);
  }

  return parseSingle(s);
}

function parseSingle(token) {
  const s = token.trim().toLowerCase();
  if (/^0x[0-9a-f]+$/.test(s)) return BigInt(s);
  if (/^[0-9]+$/.test(s)) return BigInt(s); // decimal
  if (/^[0-9a-f]+$/.test(s)) return BigInt("0x" + s); // hex without prefix
  return null;
}

/**
 * Decode a malfunction/AAM bitmask into the set bits, mapped against every
 * category. This mirrors MalfunctionBitmaskStatusResponse.parse +
 * MalfunctionType.fromBitmask (and the equivalent for alerts/alarms/etc):
 * read the value as a uint64 and test each bit.
 *
 * @param {string} input
 * @returns {{ok: boolean, error?: string, ...}}
 */
function decodeBitmask(input) {
  if (input == null || String(input).trim() === "") {
    return { ok: false, error: "Enter a bitmask value, e.g. 4096 or 0x1000." };
  }

  const value = toBitmaskValue(input);
  if (value === null) {
    return {
      ok: false,
      error: 'Could not parse. Enter a number like 4096, 0x1000, or "codeA, codeB".',
    };
  }
  if (value < 0n) {
    return { ok: false, error: "Value must be non-negative." };
  }

  const bits = [];
  for (let i = 0; i < 64; i++) {
    if ((value >> BigInt(i)) & 1n) bits.push(i);
  }

  const categories = CATEGORIES.map((cat) => {
    const entries = [];
    const undefinedBits = [];
    for (const b of bits) {
      const e = lookup(cat.table, b);
      if (e) {
        entries.push({ bit: b, name: e.name, description: e.desc });
      } else {
        undefinedBits.push(b);
      }
    }
    return {
      key: cat.key,
      label: cat.label,
      aamType: cat.aamType,
      entries,
      undefinedBits,
    };
  });

  return {
    ok: true,
    valueHex: "0x" + value.toString(16),
    valueDec: value.toString(10),
    bits,
    categories,
  };
}

const PARSER_DATA = {
  AAM_TYPES,
  MALFUNCTION_TYPES,
  ALARM_TYPES,
  ALERT_TYPES,
  CGM_ALERTS,
  REMINDER_TYPES,
  CATEGORIES,
  IGNORABLE_CODES,
  KNOWN_CODES,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Object.assign(
    { decodeBitmask, toBitmaskValue },
    PARSER_DATA
  );
}
