# tandem-malfunction-parser

Tandem t:slim X2 / Mobi malfunction bitmask parser — a single-page web app that
decodes a status bitmask into the subsystems / notifications it represents.

**Live site:** enable GitHub Pages for this repo (Settings → Pages → Source:
*GitHub Actions*). The app is then served at
`https://jwoglom.github.io/tandem-malfunction-parser/`.

## What it does

Enter a bitmask value (decimal, hex, or a `codeA, codeB` pair) and choose how to
interpret it. The app reads it as a 64-bit value and lists every set bit mapped
to its entry — exactly like pumpx2's `MalfunctionBitmaskStatusResponse` and the
alert/alarm/CGM/reminder status responses.

```
0x1000   -> bit 12 -> VIBE (Vibrator motor)
4097     -> bits 0, 12 -> SOFTWARE, VIBE
```

Categories:

- **Malfunction** (`MalfunctionBitmaskStatusResponse.MalfunctionType`, bits 0–25)
- **Alarm** (`AlarmStatusResponse.AlarmResponseType`, with descriptions)
- **Alert** (`AlertStatusResponse.AlertResponseType`, with descriptions)
- **CGM Alert** (`CGMAlertStatusResponse.CGMAlert`)
- **Reminder** (`ReminderStatusResponse.ReminderType`)

You can deep-link with `?code=0x1000&cat=MALFUNCTION`.

## How decoding works

This logic is ported from [pumpx2](https://github.com/jwoglom/pumpx2). Each
status response is a `uint64` bitmask; `fromBitmask` tests each bit and the bit
index maps to an enum entry. For example:

```java
// MalfunctionBitmaskStatusResponse
this.bitmask = Bytes.readUint64(raw, 0);
this.malfunctions = MalfunctionType.fromBitmask(bitmask);  // bit N -> subsystem N
```

The `codeA, codeB` input form mirrors the
`MalfunctionBitmaskStatusResponse(long codeA, long codeB)` constructor, which
stores the two 32-bit halves little-endian as one `uint64`
(`value = codeA | (codeB << 32)`).

## Accuracy / disclaimer

Bit → entry mappings, names, and descriptions are all derived from the pumpx2
enums. Bits with no defined mapping (e.g. `DEFAULT_*` placeholders, or
malfunction bits above 25) are listed as undefined.

Not affiliated with Tandem Diabetes Care. For any actual pump malfunction,
contact Tandem support.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `parser.js` | `decodeBitmask` + the full ID→name/description data tables |
| `app.js` | UI glue (form handling, rendering, deep-linking) |
| `styles.css` | Styling |
| `.github/workflows/pages.yml` | Deploys the static site to GitHub Pages |

No build step or dependencies — it's plain static HTML/CSS/JS.

## Extending the data

To add or correct an entry, edit the data tables at the top of `parser.js`:
`MALFUNCTION_TYPES`, `ALARM_TYPES`, `ALERT_TYPES`, `CGM_ALERTS`,
`REMINDER_TYPES`.
