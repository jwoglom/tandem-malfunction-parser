/* UI glue for the Tandem malfunction code parser. */
(function () {
  "use strict";

  const form = document.getElementById("parse-form");
  const input = document.getElementById("code-input");
  const result = document.getElementById("result");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  // CARTRIDGE_ALARM2 -> "Cartridge Alarm 2"
  function humanize(name) {
    return String(name)
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b([a-z])/g, function (_, c) {
        return c.toUpperCase();
      })
      .replace(/\b(Cgm|Iq|Usb|Bg|Rtc|Msp|Arm|Ble|Btle|Ap|P2|Lipo|Nvm)\b/gi, function (w) {
        return w.toUpperCase();
      });
  }

  function row(label, value) {
    return (
      '<div class="detail-row"><span class="detail-label">' +
      esc(label) +
      '</span><span class="detail-value">' +
      value +
      "</span></div>"
    );
  }

  function interpRow(i) {
    const desc = i.description
      ? '<div class="interp-desc">' + esc(i.description) + "</div>"
      : '<div class="interp-desc muted">(no description in pumpx2)</div>';
    return (
      '<div class="interp">' +
      '<div class="interp-head">' +
      '<span class="tag tag-' +
      i.category.toLowerCase() +
      '">' +
      esc(i.categoryLabel) +
      "</span>" +
      '<span class="mono interp-name">' +
      esc(humanize(i.name)) +
      "</span>" +
      "</div>" +
      desc +
      "</div>"
    );
  }

  function render(parsed) {
    result.hidden = false;

    if (!parsed.ok) {
      result.classList.add("is-error");
      result.classList.remove("is-ok");
      result.innerHTML = '<p class="error-msg">' + esc(parsed.error) + "</p>";
      return;
    }

    result.classList.add("is-ok");
    result.classList.remove("is-error");

    const banners = [];
    if (parsed.ignorable) {
      banners.push(
        '<div class="banner banner-warn"><strong>Likely not a real malfunction.</strong> ' +
          esc(parsed.ignorable) +
          "</div>"
      );
    }
    if (parsed.known) {
      banners.push(
        '<div class="banner banner-info"><strong>Known code:</strong> ' +
          esc(parsed.known) +
          "</div>"
      );
    }
    if (!parsed.ignorable && parsed.concurrent.length) {
      const names = parsed.concurrent
        .map(function (c) {
          return c.categoryLabel + " “" + humanize(c.name) + "”";
        })
        .join(", ");
      banners.push(
        '<div class="banner banner-info">This id (' +
          parsed.aamId +
          ") is also used by: " +
          esc(names) +
          ". If one of those was active at the same time, this code may be a side effect of it rather than a true malfunction."
      );
    }

    const malf = parsed.malfunction;
    const subsystem = malf
      ? esc(malf.description) +
        ' <span class="mono">(' +
        esc(malf.name) +
        ", bit " +
        parsed.aamId +
        ")</span>"
      : '<span class="unknown">Not a known malfunction subsystem (aamId ' +
        parsed.aamId +
        " is outside the malfunction range 0–25)</span>";

    let html = "";
    html += '<h2 class="result-code mono">' + esc(parsed.canonical) + "</h2>";
    html += banners.join("");

    html += '<div class="details">';
    html += row("Malfunction subsystem", subsystem);
    html += row("aamId", '<span class="mono">' + parsed.aamId + "</span>");
    html +=
      row(
        "faultId",
        '<span class="mono">' +
          esc(parsed.faultHex) +
          '</span> <span class="muted">(' +
          parsed.faultDecimal +
          " decimal)</span>"
      );
    html += "</div>";

    // Cross-category interpretations of the shared aamId.
    if (parsed.interpretations.length) {
      html +=
        '<h3 class="section-title">aamId ' +
        parsed.aamId +
        " across all notification categories</h3>";
      html +=
        '<p class="section-note">The aamId is a shared bit index; the same number ' +
        "means different things depending on the notification category.</p>";
      html += '<div class="interps">';
      html += parsed.interpretations.map(interpRow).join("");
      html += "</div>";
    }

    result.innerHTML = html;
  }

  function run() {
    render(parseMalfunctionCode(input.value));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run();
  });

  document.querySelectorAll(".example").forEach(function (btn) {
    btn.addEventListener("click", function () {
      input.value = btn.getAttribute("data-code");
      run();
      input.focus();
    });
  });

  // Support deep-linking via ?code= or #code
  const params = new URLSearchParams(window.location.search);
  const initial =
    params.get("code") ||
    decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (initial) {
    input.value = initial;
    run();
  }
})();
