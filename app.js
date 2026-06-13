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

  function row(label, value) {
    return (
      '<div class="detail-row"><span class="detail-label">' +
      esc(label) +
      '</span><span class="detail-value">' +
      value +
      "</span></div>"
    );
  }

  function render(parsed) {
    result.hidden = false;

    if (!parsed.ok) {
      result.classList.add("is-error");
      result.classList.remove("is-ok");
      result.innerHTML =
        '<p class="error-msg">' + esc(parsed.error) + "</p>";
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

    const subsystem = parsed.subsystemName
      ? esc(parsed.subsystemLabel) +
        ' <span class="mono">(' +
        esc(parsed.subsystemName) +
        ", bit " +
        parsed.subsystemIndex +
        ")</span>"
      : '<span class="unknown">Unknown subsystem (aamId ' +
        parsed.aamId +
        " is outside the known range 0–25)</span>";

    let html = "";
    html += '<h2 class="result-code mono">' + esc(parsed.canonical) + "</h2>";
    html += banners.join("");
    html += '<div class="details">';
    html += row("Subsystem", subsystem);
    html += row("aamId (subsystem index)", '<span class="mono">' + parsed.aamId + "</span>");
    html +=
      row(
        "faultId",
        '<span class="mono">' +
          esc(parsed.faultHex) +
          "</span> <span class=\"muted\">(" +
          parsed.faultDecimal +
          " decimal)</span>"
      );
    html += "</div>";

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
  const initial = params.get("code") || decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (initial) {
    input.value = initial;
    run();
  }
})();
