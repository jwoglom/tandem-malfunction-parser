(function () {
  "use strict";

  const P = window.MalfunctionParser;
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const mode = document.getElementById("mode");
  const result = document.getElementById("result");

  document.getElementById("source").textContent = P.source;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
  }

  function sub(html) {
    return '<span class="sub">' + html + "</span>";
  }

  function nameCell(e, gloss) {
    let html = "<code>" + esc(e.name) + "</code>";
    if (gloss) html += sub(esc(gloss));
    if (e.desc) html += sub(esc(e.desc));
    if (e.firmware) html += sub("Tandem name: <code>" + esc(e.firmware) + "</code>");
    return html;
  }

  function row(th, td) {
    return "<tr><th>" + th + "</th><td>" + td + "</td></tr>";
  }

  function renderCode(r) {
    let html = "<h2><code>" + esc(r.code) + "</code></h2>";

    if (r.empty) {
      html += '<p class="note">0-0x0 means no malfunction.</p>';
    } else if (r.ignorable) {
      html +=
        '<p class="note">pumpX2 and TandemKit don\'t report this code as a malfunction.' +
        (r.note ? " " + esc(r.note) : "") +
        "</p>";
    } else if (r.note) {
      html += "<p>" + esc(r.note) + "</p>";
    }

    html += "<table>";
    html += row(
      "Malfunction " + r.aamId,
      r.malfunction
        ? nameCell(r.malfunction, r.gloss)
        : '<span class="muted">Not in pumpX2\'s malfunction table.</span>'
    );
    html += row(
      "Fault ID",
      r.faultId === null
        ? '<span class="muted">Not given.</span>'
        : "<code>0x" +
            r.faultId.toString(16) +
            "</code> (" +
            r.faultId +
            ")" +
            sub("Where the pump detected the fault. Tandem doesn't publish what the values mean.")
    );
    html += "</table>";

    if (r.sameId.length) {
      html += "<h3>Other notifications numbered " + r.aamId + "</h3>";
      html +=
        "<p>Alarms, alerts, CGM alerts and reminders are numbered from 0 too. " +
        "pumpX2 and TandemKit don't treat this code as a malfunction while one of these is active:</p>";
      html += "<table>";
      html += r.sameId.map((s) => row(esc(s.category), nameCell(s.entry))).join("");
      html += "</table>";
    }
    return html;
  }

  function renderBitmask(r) {
    let html = "<h2><code>" + esc(r.hex) + "</code></h2>";
    html +=
      '<p class="muted">' +
      esc(r.dec) +
      ", read as " +
      esc(r.label.toLowerCase()) +
      " bitmask</p>";
    if (!r.bits.length) return html + "<p>No bits set.</p>";

    html += "<table><tr><th>Bit</th><th>Name</th></tr>";
    html += r.bits
      .map((b) =>
        row(
          String(b.bit),
          b.entry ? nameCell(b.entry, b.gloss) : '<span class="muted">Not defined in pumpX2.</span>'
        )
      )
      .join("");
    return html + "</table>";
  }

  function show(r) {
    if (r.error) result.innerHTML = '<p class="error">' + esc(r.error) + "</p>";
    else result.innerHTML = r.kind === "code" ? renderCode(r) : renderBitmask(r);
  }

  function run() {
    const r = P.decode(input.value, mode.value);
    if (r.kind === "code") mode.value = "CODE";

    const value = input.value.trim();
    const hash = !value ? "" : "#" + (mode.value === "CODE" ? "" : mode.value + ":") + encodeURIComponent(value);
    if (hash !== location.hash) history.replaceState(null, "", location.pathname + hash);

    show(r);
  }

  // #12-0x2071, #ALARM:0x1000, and the older ?code=&cat= links.
  function loadFromUrl() {
    const params = new URLSearchParams(location.search);
    let value = params.get("code");
    let m = (params.get("cat") || "").toUpperCase();
    if (value === null) {
      let hash = "";
      try {
        hash = decodeURIComponent(location.hash.slice(1));
      } catch (e) {
        return;
      }
      const split = hash.match(/^([A-Z_]+):(.*)$/);
      value = split ? split[2] : hash;
      m = split ? split[1] : "CODE";
    }
    if (!value) return;
    mode.value = [...mode.options].some((o) => o.value === m) ? m : "MALFUNCTION";
    input.value = value;
    run();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  mode.addEventListener("change", () => {
    if (input.value.trim()) run();
  });
  window.addEventListener("hashchange", loadFromUrl);

  loadFromUrl();
})();
