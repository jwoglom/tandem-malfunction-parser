# tandem-malfunction-parser

Looks up the malfunction code a Tandem t:slim X2 or Mobi pump shows, such as
`12-0x2071`. Served at https://jwoglom.github.io/tandem-malfunction-parser/.

Not affiliated with Tandem Diabetes Care, and not medical advice. A pump
malfunction stops insulin delivery: contact Tandem Technical Support.

## How a code is read

The code is pumpX2's `HighestAamResponse.getErrorString()`, which formats it
the same way Tandem's app does: `<aamId>-0x<faultId in hex>`.

- `aamId` is the malfunction's bit in `MalfunctionBitmaskStatusResponse`, so
  `12` is `VIBE`.
- `faultId` is a fault-locator value. Tandem doesn't publish what the values
  mean; the page notes the few pumpX2's tests identify.

Alarms, alerts, CGM alerts and reminders number their bits from 0 as well.
pumpX2 and TandemKit don't report a code as a malfunction when it is one of
`HighestAamResponse.IGNORABLE_CODES`, or when a known notification with the same
number is active (`matchesKnownIds`), so the page lists those too.

Choosing a bitmask type instead reads a single number as the raw uint64 of
that status response (`MalfunctionBitmaskStatusResponse`, `AlarmStatusResponse`,
`AlertStatusResponse`, `CGMAlertStatusResponse`, `ReminderStatusResponse`) and
lists the set bits.

Links: `#12-0x2071` for a code, `#ALARM:0x22` for a bitmask.

## Updating the tables

`data.js` is generated from pumpX2's enums, which TandemKit mirrors:

```
scripts/sync_pumpx2.py ../pumpX2 --ref origin/dev
node --test
```

The plain-language glosses for malfunction bits and the notes on specific codes
are kept by hand in `parser.js`.
