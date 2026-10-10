(function () {
  "use strict";

  const P = window.MalfunctionParser;
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const result = document.getElementById("result");

  document.getElementById("pumpx2-version").textContent = P.versions.pumpx2;
  document.getElementById("tandemkit-version").textContent = P.versions.tandemkit;

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

  function render(r) {
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
      "<code>0x" +
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

  function run() {
    const value = input.value.trim();
    const r = P.decode(value);
    const hash = r.code ? "#" + r.code : value ? "#" + encodeURIComponent(value) : "";
    if (hash !== location.hash) history.replaceState(null, "", location.pathname + hash);

    result.innerHTML = r.error ? '<p class="error">' + esc(r.error) + "</p>" : render(r);
  }

  // #12-0x2071, or the older ?code= links.
  function loadFromUrl() {
    let value = new URLSearchParams(location.search).get("code");
    if (value === null) {
      try {
        value = decodeURIComponent(location.hash.slice(1));
      } catch (e) {
        return;
      }
    }
    if (!value) return;
    input.value = value;
    run();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  window.addEventListener("hashchange", loadFromUrl);

  loadFromUrl();
})();
