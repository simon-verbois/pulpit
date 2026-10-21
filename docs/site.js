// Screenshot enlargement. Every screenshot is also a plain link to the image,
// so the page works without JavaScript.
const dialog = document.querySelector("#preview");
const previewImage = document.querySelector("#preview-image");
const previewCaption = document.querySelector("#preview-caption");
let opener;

if (typeof dialog?.showModal === "function") {
  document.querySelectorAll("[data-preview]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      opener = link;
      previewImage.src = link.href;
      previewImage.alt = link.querySelector("img").alt;
      previewCaption.textContent = previewImage.alt;
      dialog.showModal();
    });
  });
  dialog.querySelector("button").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    previewImage.removeAttribute("src");
    opener?.focus({ preventScroll: true });
  });
}
