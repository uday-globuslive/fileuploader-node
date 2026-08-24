// Progressive enhancement: shows a real upload progress bar using XHR (fetch cannot
// report upload progress). Falls back to a normal form POST if JS is unavailable.
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('uploadForm');
  if (!form) return;

  var wrap = document.getElementById('uploadProgressWrap');
  var bar = document.getElementById('uploadProgressBar');
  var label = document.getElementById('uploadProgressLabel');
  var submitBtn = form.querySelector('button[type="submit"]');
  var fileInput = form.querySelector('input[type="file"]');

  form.addEventListener('submit', function (e) {
    if (!fileInput || !fileInput.files.length) return;

    e.preventDefault();

    var xhr = new XMLHttpRequest();
    xhr.open('POST', form.action, true);

    xhr.upload.addEventListener('progress', function (evt) {
      if (!evt.lengthComputable) return;
      var pct = Math.round((evt.loaded / evt.total) * 100);
      bar.style.width = pct + '%';
      label.textContent = pct < 100 ? 'Uploading... ' + pct + '%' : 'Processing...';
    });

    xhr.addEventListener('loadend', function () {
      // The server redirects back to /dashboard and stores a flash message in
      // the session; reloading picks that up since cookies are shared with the XHR.
      window.location.href = '/dashboard';
    });

    submitBtn.disabled = true;
    wrap.hidden = false;
    bar.style.width = '0%';
    label.textContent = 'Uploading... 0%';

    xhr.send(new FormData(form));
  });
});
