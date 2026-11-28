function renderPdfs() {
      document.getElementById("pdfGrid").innerHTML = pdfs.map(pdf => `
        <div class="card">
          <div>
            <span class="pill">PDF Catalog</span>
            <h3 style="margin-top:0.6rem;">${esc(pdf.title)}</h3>
          </div>
          <a href="${safeUrl(pdf.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="width:fit-content;">Open / Download</a>
        </div>
      `).join("");
    }
