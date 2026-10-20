(() => {
  const wrapper = document.querySelector(".sendmsg-form-wrapper");
  const successMessage = document.getElementById("sendmsgSuccessMessage");

  if (!wrapper || !successMessage) return;

  const successLabel = "הטופס נשלח בהצלחה";
  const normalise = (value) => value.replace(/\s+/g, " ").trim();

  const hasConfirmedSendMsgSuccess = () => {
    const button = wrapper.querySelector(".fc_button");
    const fields = [
      ...wrapper.querySelectorAll(
        ".tr.fc-row-field input:not([type='hidden']), .tr.fc-row-field textarea",
      ),
    ];

    return (
      button &&
      normalise(button.value || button.textContent || "") === successLabel &&
      fields.length > 0 &&
      fields.every((field) => field.disabled)
    );
  };

  const showSuccess = () => {
    if (!hasConfirmedSendMsgSuccess()) return;

    wrapper.hidden = true;
    successMessage.classList.remove("hidden");
    observer.disconnect();
  };

  const observer = new MutationObserver(showSuccess);

  observer.observe(wrapper, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["disabled", "value"],
  });

  showSuccess();
})();
