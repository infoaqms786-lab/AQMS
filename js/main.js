// --- Configuration ---
    const OWNER_WHATSAPP = "919664143828";
    const OWNER_EMAIL = "infoaqms786@gmail.com";
    

      
      // Makes text safe to place inside HTML
      function esc(s) {
        return String(s ?? "").replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      }

      let products = [],
          pdfs = [],
          tray = [],
          activeCat = "All";    
        
    const arg=v=>esc(JSON.stringify(String(v)));
    
    function safeUrl(v,relative=false){
      try{
        const u=new URL(v,location.href);
        return u.protocol==='https:' || (relative && !/^[a-z]+:/i.test(v) && !v.startsWith('//')) ? esc(v):'';}catch{return '';
      }
    }

    async function loadCatalog(){

      products=await query(
        sb.from('products').select('*').order('created_at')
      );
      
      pdfs=await query(
        sb.from('pdf_catalogs').select('*').order('created_at')
      );
      
      if(!products.some(p=>p.category===activeCat)){
        activeCat='All';
      }

      renderTabs();
      renderProducts();
      renderPdfs();
    }
      


    // --- Init ---
    document.getElementById("year").textContent = new Date().getFullYear();
    document.getElementById("searchInput").addEventListener("input", renderProducts);
    loadCatalog().catch(e=>{$("productGrid").textContent="Catalog unavailable: "+e.message;});
    renderOffers();