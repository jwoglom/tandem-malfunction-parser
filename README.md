# tandem-malfunction-parser

Tandem t:slim X2 / Mobi malfunction code parser — a single-page web app that
decodes a malfunction code into the subsystem it relates to and its fault
details.

**Live site:** enable GitHub Pages for this repo (Settings → Pages → Source:
*GitHub Actions*). The app is then served at
`https://jwoglom.github.io/tandem-malfunction-parser/`.

## What it does

Enter a malfunction code in the form shown on the pump screen:

```
aamId-0xfaultId        e.g.  12-0x2071
```

The app reports:

- **Subsystem** — which pump subsystem the code relates to (e.g. `12` → Vibrator
  motor).
- **aamId** — the subsystem index (0–25).
- **faultId** — the specific fault-locator value, in hex and decimal.
- **Warnings** — whether the code is one pumpx2 considers *ignorable* (i.e. it
  usually appears concurrently with a normal alarm and isn't a real
  malfunction), and any documented meaning for the specific code.

Codes can also be deep-linked with `?code=12-0x2071`.

## How the code is structured

This logic is ported from [pumpx2](https://github.com/jwoglom/pumpx2). The
displayed malfunction code comes from `HighestAamResponse`, which pumpx2 formats
as:

```java
String.format("%d-0x%s", aamId, Long.toString(faultId, 16));  // -> "12-0x2071"
```

- `aamId` is an index into a 26-entry subsystem table
  (`MalfunctionBitmaskStatusResponse.MalfunctionType`, bits 0–25).
- `faultId` is a more specific fault-locator value, displayed in hex.

pumpx2 also maintains a small list of *ignorable* codes (`IGNORABLE_CODES`) that
look like malfunctions but occur alongside ordinary alarms (e.g. `3-0x2026` with
the Pump Reset Alarm).

## Accuracy / disclaimer

This tool reliably decodes the **structure** of a code (subsystem + faultId).
The specific human meaning of a given `faultId` is largely community-sourced and
unofficial — only a handful of codes have documented descriptions. Subsystem
labels are derived from the pumpx2 enum names.

Not affiliated with Tandem Diabetes Care. For any actual pump malfunction,
contact Tandem support.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `parser.js` | Parsing logic + data tables (subsystems, ignorable/known codes) |
| `app.js` | UI glue (form handling, rendering, deep-linking) |
| `styles.css` | Styling |
| `.github/workflows/pages.yml` | Deploys the static site to GitHub Pages |

No build step or dependencies — it's plain static HTML/CSS/JS.

## Extending the data

To add a documented code or subsystem label, edit the tables at the top of
`parser.js`: `KNOWN_CODES`, `IGNORABLE_CODES`, `SUBSYSTEM_LABELS`, and
`MALFUNCTION_TYPES`.
