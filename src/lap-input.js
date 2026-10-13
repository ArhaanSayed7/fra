export function formatLapDigits(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 7);
  let n = 0;
  return (digits.length > 6 ? "__:__.___" : "_:__.___").replace(
    /_/g,
    () => digits[n++] || "_",
  );
}
export function enhanceLapInput(input) {
  if (input.dataset.maskBound) return;
  input.dataset.maskBound = "true";
  const paint = (digits, cursor = digits.length) => {
    input.value = formatLapDigits(digits);
    let position = 0,
      found = 0;
    while (position < input.value.length && found < cursor) {
      if (/\d/.test(input.value[position])) found++;
      position++;
    }
    while (input.value[position] === ":" || input.value[position] === ".")
      position++;
    input.setSelectionRange(position, position);
  };
  paint(input.value.replace(/\D/g, ""));
  input.addEventListener("beforeinput", (event) => {
    if (
      event.isComposing ||
      !["insertText", "deleteContentBackward", "deleteContentForward"].includes(
        event.inputType,
      )
    )
      return;
    event.preventDefault();
    const digits = input.value.replace(/\D/g, ""),
      start = input.value
        .slice(0, input.selectionStart)
        .replace(/\D/g, "").length,
      end = input.value.slice(0, input.selectionEnd).replace(/\D/g, "").length;
    if (event.inputType === "insertText") {
      const added = (event.data || "").replace(/\D/g, "");
      paint(
        (digits.slice(0, start) + added + digits.slice(end)).slice(0, 7),
        Math.min(start + added.length, 7),
      );
    } else if (start !== end)
      paint(digits.slice(0, start) + digits.slice(end), start);
    else if (event.inputType === "deleteContentBackward")
      paint(
        digits.slice(0, Math.max(0, start - 1)) + digits.slice(start),
        Math.max(0, start - 1),
      );
    else paint(digits.slice(0, start) + digits.slice(start + 1), start);
  });
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const added = event.clipboardData.getData("text").replace(/\D/g, ""),
      digits = input.value.replace(/\D/g, ""),
      start = input.value
        .slice(0, input.selectionStart)
        .replace(/\D/g, "").length,
      end = input.value.slice(0, input.selectionEnd).replace(/\D/g, "").length;
    paint(
      (digits.slice(0, start) + added + digits.slice(end)).slice(0, 7),
      Math.min(start + added.length, 7),
    );
  });
  input.addEventListener("input", () => paint(input.value.replace(/\D/g, "")));
}
