(() => {
  const emailInput = document.querySelector("#email");
  if (!emailInput) return;

  const domains = [
    "gmail.com",
    "outlook.com",
    "outlook.co.il",
    "yahoo.com",
    "hotmail.com",
    "walla.co.il",
    "icloud.com",
  ];
  const field = emailInput.parentElement;
  const suggestionsBox = document.createElement("div");
  let selectedIndex = -1;

  field.classList.add("email-suggestions-field");
  suggestionsBox.className = "email-suggestions";
  suggestionsBox.id = "email-suggestions";
  suggestionsBox.setAttribute("role", "listbox");
  suggestionsBox.hidden = true;
  field.appendChild(suggestionsBox);
  emailInput.setAttribute("aria-controls", suggestionsBox.id);
  emailInput.setAttribute("aria-expanded", "false");

  const closeSuggestions = () => {
    suggestionsBox.hidden = true;
    emailInput.setAttribute("aria-expanded", "false");
    selectedIndex = -1;
  };

  const setSelectedSuggestion = (buttons) => {
    buttons.forEach((button, index) => {
      const isSelected = index === selectedIndex;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-selected", String(isSelected));
    });
  };

  const isCompleteEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const renderSuggestions = () => {
    const value = emailInput.value.trim();
    const atIndex = value.indexOf("@");
    selectedIndex = -1;
    suggestionsBox.replaceChildren();

    if (atIndex < 1 || isCompleteEmail(value)) {
      closeSuggestions();
      return;
    }

    const localPart = value.slice(0, atIndex);
    const domainPart = value.slice(atIndex + 1).toLowerCase();
    const matches = domains.filter(
      (domain) => domain.startsWith(domainPart) && domain !== domainPart,
    );

    if (!matches.length) {
      closeSuggestions();
      return;
    }

    matches.forEach((domain) => {
      const option = document.createElement("button");
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.textContent = `${localPart}@${domain}`;
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => {
        emailInput.value = option.textContent;
        closeSuggestions();
      });
      suggestionsBox.appendChild(option);
    });

    suggestionsBox.hidden = false;
    emailInput.setAttribute("aria-expanded", "true");
  };

  emailInput.addEventListener("input", renderSuggestions);
  emailInput.addEventListener("keydown", (event) => {
    const buttons = [...suggestionsBox.querySelectorAll("button")];
    if (!buttons.length || suggestionsBox.hidden) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex =
        event.key === "ArrowDown"
          ? (selectedIndex + 1) % buttons.length
          : (selectedIndex - 1 + buttons.length) % buttons.length;
      setSelectedSuggestion(buttons);
    } else if (event.key === "Enter" && selectedIndex > -1) {
      event.preventDefault();
      buttons[selectedIndex].click();
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  emailInput.addEventListener("blur", () => {
    window.setTimeout(closeSuggestions, 0);
  });

  document.addEventListener("click", (event) => {
    if (!field.contains(event.target)) closeSuggestions();
  });
})();
