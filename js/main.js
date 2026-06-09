// DOM Elements
const emailInput = document.getElementById("userEmail");
const suggestionsBox = document.getElementById("customSuggestions");
const leadForm = document.getElementById("leadForm");
const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");
const consentInput = document.getElementById("marketingConsent");
const submitBtn = document.getElementById("submitBtn");

let selectedIndex = -1;

// ============================================================
// Initialize Email Suggestions
// ============================================================
function initEmailSuggestions() {
  // --- Navigation with arrow keys and Enter ---
  emailInput.addEventListener("keydown", function (e) {
    const btns = suggestionsBox.querySelectorAll("button");
    if (btns.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (e.key === "ArrowDown")
        selectedIndex = (selectedIndex + 1) % btns.length;
      else selectedIndex = (selectedIndex - 1 + btns.length) % btns.length;

      btns.forEach((b, i) =>
        b.classList.toggle("bg-slate-100", i === selectedIndex),
      );
    } else if (e.key === "Enter" && selectedIndex > -1) {
      e.preventDefault();
      btns[selectedIndex].click();
    }
  });

  // --- Build suggestions list on input ---
  emailInput.addEventListener("input", function (e) {
    selectedIndex = -1;
    const val = e.target.value.trim();
    suggestionsBox.innerHTML = "";

    if (val.includes("@") && val.indexOf("@") > 0) {
      const [pre, suf] = val.split("@");
      const domains = [
        "gmail.com",
        "outlook.com",
        "outlook.co.il",
        "hotmail.com",
        "walla.co.il",
        "icloud.com",
      ];
      const filtered = domains.filter(
        (d) =>
          (!suf || d.startsWith(suf.toLowerCase())) &&
          d !== suf.toLowerCase(),
      );

      if (filtered.length > 0) {
        suggestionsBox.classList.remove("hidden");
        filtered.forEach((d) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className =
            "w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 block border-b border-slate-100";
          btn.textContent = `${pre}@${d}`;
          btn.onmousedown = (e) => e.preventDefault();
          btn.onclick = () => {
            emailInput.value = btn.textContent;
            suggestionsBox.classList.add("hidden");
            selectedIndex = -1;
          };
          suggestionsBox.appendChild(btn);
        });
      } else suggestionsBox.classList.add("hidden");
    } else suggestionsBox.classList.add("hidden");
  });

  // --- Close suggestions menu on click outside ---
  document.addEventListener("click", (e) => {
    if (e.target !== emailInput) suggestionsBox.classList.add("hidden");
  });
}

// ============================================================
// Hide Messages on User Input
// ============================================================
function hideMessages() {
  leadForm.addEventListener("input", () => {
    if (!successMessage.classList.contains("hidden")) {
      successMessage.classList.add("hidden");
    }
  });
}

// ============================================================
// Build Lead Object
// ============================================================
function buildLead() {
  return {
    name: leadForm.elements.userName.value.trim(),
    email: leadForm.elements.userEmail.value.trim(),
    consent: consentInput.checked,
    source:
      new URLSearchParams(window.location.search).get("ref") ||
      "newsletter_landing",
    page: window.location.href,
  };
}

// ============================================================
// Set Submit Loading State
// ============================================================
function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  if (isLoading) {
    submitBtn.innerHTML = "<span>מצרף אותך לקהילה...</span>";
  } else {
    submitBtn.innerHTML = "<span>אני רוצה להצטרף לניוזלטר</span>";
  }
}

// ============================================================
// Initialize Lead Form
// ============================================================
function initLeadForm() {
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    successMessage.classList.add("hidden");
    errorMessage.classList.add("hidden");

    const honeyPotValue = document.getElementById("honeyPot").value.trim();
    if (honeyPotValue) return;

    const lead = buildLead();

    setSubmitLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 1500));

      console.log("Simulated lead signup:", lead);

      // Success
      successMessage.classList.remove("hidden");

      // Reset form
      leadForm.reset();
    } catch (error) {
      errorMessage.classList.remove("hidden");
      console.error("Simulated lead signup failed:", error);
    } finally {
      // Restore button state
      setSubmitLoading(false);
    }
  });
}

// ============================================================
// Initialize All
// ============================================================
initEmailSuggestions();
hideMessages();
initLeadForm();
