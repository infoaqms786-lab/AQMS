// --- Render Catalog ---
    function renderTabs() {
      const cats = ["All", ...new Set(products.map(p => p.category))];
      document.getElementById("categoryTabs").innerHTML = cats.map(c => `
        <button class="tab ${c === activeCat ? 'active' : ''}" onclick="setCat(${arg(c)})">${esc(c)}</button>
      `).join("");
    }

    function setCat(c) {
      activeCat = c;
      renderTabs();
      renderProducts();
    }
    function renderProducts() {
      const q = document.getElementById("searchInput").value.toLowerCase();
      const filtered = products.filter(p => {
        const matchCat = activeCat === "All" || p.category === activeCat;
        const matchText = p.name.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          p.skus.some(s => s.code.toLowerCase().includes(q) || s.size.toLowerCase().includes(q));
        return matchCat && matchText;
      });

      document.getElementById("productGrid").innerHTML = filtered.map(p => `
        <div class="card">
          <div>
                          
        ${p.image && safeUrl(p.image,true) ? `<img class="card-img" src="${safeUrl(p.image,true)}" alt="${esc(p.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"> <div class="card-image-missing" hidden>Product image unavailable</div>` : `<div class="card-image-missing">Product image unavailable</div>`}

            <div class="card-top">
              <span class="pill">${esc(p.category)}</span>
              <span style="color:var(--muted); font-size:0.78rem;">${p.skus.length} SKUs</span>
            </div>
            <h3>${esc(p.name)}</h3>
            <p style="margin-top:0.5rem;">${esc(p.desc)}</p>
          </div>

          <div>
            <ul class="meta-list" style="margin-bottom:0.85rem;">
              ${(p.highlights || []).map(h => `<li>${esc(h)}</li>`).join("")}
            </ul>

            <div class="card-actions">
              <button class="btn btn-outline" onclick="openSkuModal(${arg(p.id)})">View Specs</button>
              <button class="btn btn-gold" onclick="addToTray(${arg(p.name+" (General)")})">+ Inquire</button>
            </div>
          </div>
        </div>
      `).join("") || `<p style="color:var(--muted);">No matching products found.</p>`;
    }



     // --- SKU Modal ---
    function openSkuModal(id) {
      const p = products.find(x => x.id === id);
      if (!p) return;
      document.getElementById("modalCat").textContent = p.category;
      document.getElementById("modalTitle").textContent = p.name;
      document.getElementById("modalDesc").textContent = p.desc;
      document.getElementById("modalTableBody").innerHTML = p.skus.map(s => `
        <tr>
          <td><strong>${esc(s.code)}</strong></td>
          <td>${esc(s.size)}</td>
          <td>${esc(s.mat)}</td>
          <td>${esc(s.spec)}</td>
          <td>${esc(s.qty)}</td>
          <td><button class="btn btn-gold" style="padding:0.35rem 0.7rem; font-size:0.76rem;" onclick="addToTray(${arg(s.code+" - "+p.name+" ("+s.size+")")})">+ Add</button></td>
        </tr>
      `).join("");
      document.getElementById("skuModal").classList.add("open");
    }