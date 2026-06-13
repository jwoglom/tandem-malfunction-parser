/* UI glue for the Tandem malfunction bitmask parser. */
(function () {
  "use strict";

  const form = document.getElementById("parse-form");
  const input = document.getElementById("code-input");
  const categorySelect = document.getElementById("category-select");
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
      .replace(
        /\b(Cgm|Iq|Usb|Bg|Rtc|Msp|Arm|Ble|Btle|Ap|P2|Lipo|Nvm)\b/gi,
        function (w) {
          return w.toUpperCase();
        }
      );
  }

  function entryRow(e) {
    const desc = e.description
      ? '<div class="interp-desc">' + esc(e.description) + "</div>"
      : '<div class="interp-desc muted">(no description in pumpx2)</div>';
    return (
      '<div class="interp">' +
      '<div class="interp-head">' +
      '<span class="bit-chip">bit ' +
      e.bit +
      "</span>" +
      '<span class="mono interp-name">' +
      esc(humanize(e.name)) +
      "</span>" +
      "</div>" +
      desc +
      "</div>"
    );
  }

  function categoryBlock(cat) {
    let html = "";
    html +=
      '<h3 class="section-title"><span class="tag tag-' +
      cat.key.toLowerCase() +
      '">' +
      esc(cat.label) +
      "</span></h3>";

    if (cat.entries.length) {
      html += '<div class="interps">';
      html += cat.entries.map(entryRow).join("");
      html += "</div>";
    } else {
      html +=
        '<p class="section-note">No defined ' +
        esc(cat.label.toLowerCase()) +
        " entries match the set bits.</p>";
    }

    if (cat.undefinedBits.length) {
      html +=
        '<p class="section-note">Set bits with no defined ' +
        esc(cat.label.toLowerCase()) +
        " mapping: " +
        cat.undefinedBits.map((b) => "bit " + b).join(", ") +
        ".</p>";
    }
    return html;
  }

  function render(parsed, selected) {
    result.hidden = false;

    if (!parsed.ok) {
      result.classList.add("is-error");
      result.classList.remove("is-ok");
      result.innerHTML = '<p class="error-msg">' + esc(parsed.error) + "</p>";
      return;
    }

    result.classList.add("is-ok");
    result.classList.remove("is-error");

    let html = "";
    html +=
      '<h2 class="result-code mono">' +
      esc(parsed.valueHex) +
      '</h2><p class="section-note">' +
      esc(parsed.valueDec) +
      " decimal &middot; set bits: " +
      (parsed.bits.length ? parsed.bits.join(", ") : "none") +
      "</p>";

    const cats =
      selected === "ALL"
        ? parsed.categories
        : parsed.categories.filter((c) => c.key === selected);

    html += cats.map(categoryBlock).join("");

    result.innerHTML = html;
  }

  function run() {
    render(decodeBitmask(input.value), categorySelect.value);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run();
  });

  categorySelect.addEventListener("change", function () {
    if (input.value.trim()) run();
  });

  document.querySelectorAll(".example").forEach(function (btn) {
    btn.addEventListener("click", function () {
      input.value = btn.getAttribute("data-code");
      run();
      input.focus();
    });
  });

  // Support deep-linking via ?code=&cat=
  const params = new URLSearchParams(window.location.search);
  const initial =
    params.get("code") ||
    decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const cat = params.get("cat");
  if (cat) categorySelect.value = cat.toUpperCase();
  if (initial) {
    input.value = initial;
    run();
  }
})();
