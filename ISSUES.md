1. Help icon looks too cluttered ? is touching the circle
2. Hovering over help icon doesn't give the role tooltip
3. There's no close button on the dialog
4. Clicking outside of the dialog closes it when it shouldn't
5. There shouldn't be a cancel button in dialogs as there should be a close in top right
6. Add buttons should be wrapped in a bottom-sticker and another div with bottom-sticker-inner jenkins-buttons-row jenkins-buttons-row--equal-width
7. Excessive spacing between controls in dialog caused by gap: 1 rem
8. checkName isn't being called for the cards example code provided below from refine-ui branch:
```javascript
rspValidateUserCards = () => {
  const dataHolder = document.getElementById("role-strategy-data");
  const descriptorUrl = dataHolder?.dataset.descriptorUrl;
  if (!descriptorUrl) return;

  // Abort any previous validation batch
  if (rspValidationAbortController) rspValidationAbortController.abort();
  rspValidationAbortController = new AbortController();
  const signal = rspValidationAbortController.signal;

  // Collect cards to validate
  const cards = [];
  document.querySelectorAll("#rsp-user-cards .rsp-card").forEach((card) => {
    const userName = card.dataset.userName;
    const userType = card.dataset.userType;
    if (!userName || !userType) return;
    if (userName === "anonymous" && userType === "USER") return;
    if (userName === "authenticated" && userType === "GROUP") return;
    if (!card.querySelector(".rsp-card__validation-target")) return;
    cards.push(card);
  });

  const maxParallel = isHttp2Enabled() ? 30 : 1;

  const validateCard = (card) => {
    if (signal.aborted) return Promise.resolve();
    const target = card.querySelector(".rsp-card__validation-target");
    const checkValue =
      "[" + card.dataset.userType + ":" + card.dataset.userName + "]";
    const checkUrl =
      descriptorUrl + "/checkName?value=" + encodeURIComponent(checkValue);
    return fetch(checkUrl, { method: "POST", headers: crumb.wrap({}), signal })
      .then((rsp) => rsp.text())
      .then((html) => {
        if (signal.aborted) return;
        target.innerHTML = html;
        rspProcessValidation(card);
      })
      .catch(() => {});
  };

  // Process in batches of maxParallel
  let idx = 0;
  const processNext = () => {
    if (signal.aborted || idx >= cards.length) return Promise.resolve();
    const batch = cards.slice(idx, idx + maxParallel);
    idx += maxParallel;
    return Promise.all(batch.map(validateCard)).then(processNext);
  };
  processNext();
}
```
9. User or group or ambiguous icons should be used and not a chip for [user] or group its too repetitive
10. No tooltips for edit or delete
11. Delete uses the browser confirmation dialog rather than a jenkins confirmation dialog