// Confirmation prompt for forms marked with data-confirm, replacing CSP-unsafe inline onclick handlers.
document.addEventListener('submit', function (e) {
  var form = e.target;
  if (form instanceof HTMLFormElement && form.hasAttribute('data-confirm')) {
    if (!window.confirm(form.getAttribute('data-confirm'))) {
      e.preventDefault();
    }
  }
});
