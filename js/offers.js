 // --- Offers slider (data comes from Supabase) ---
    let stopOffers=()=>{};
    async function renderOffers() {
      stopOffers();
      const section = document.getElementById("offers");

      let rows;
      try {
        const { data, error } = await sb.from("offers")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        rows = data;
      } catch (err) {
        console.error("Offers could not load:", err);
        return;
      }

      const parts = new Intl.DateTimeFormat(
          'en-GB',
          {
              timeZone: 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
          }
      ).formatToParts(new Date());

      const getPart = type =>
          parts.find(part => part.type === type).value;

      const today =
          getPart('year') + '-' +
          getPart('month') + '-' +
          getPart('day');

      const active = rows.filter(o => !o.ends_on || o.ends_on >= today);

      if (!active.length) {
        section.hidden=true;
        $("offerTrack").replaceChildren();
        $("offerDots").replaceChildren();
        return;
      }

      section.hidden = false;

      document.getElementById("offerTrack").innerHTML = active.map((o, i) => `
        <article class="offer-slide ${i === 0 ? "active" : ""} ${o.image_url ? "" : "no-img"}">
          ${o.image_url ? `<img class="offer-img" src="${safeUrl(o.image_url)}" alt="${esc(o.title)}" draggable="false">` : ""}
          <div class="offer-body">
            ${o.badge ? `<span class="offer-badge">${esc(o.badge)}</span>` : ""}
            <h3>${esc(o.title)}</h3>
            ${o.description ? `<p>${esc(o.description)}</p>` : ""}
            ${o.ends_on ? `<span class="offer-ends">Valid until ${esc(o.ends_on)}</span>` : ""}
            <button class="btn btn-gold offer-inquire" style="width:fit-content;" data-title="${esc(o.title)}">Inquire about this offer</button>
          </div>
        </article>
      `).join("");

      document.querySelectorAll(".offer-inquire").forEach(b =>
        b.addEventListener("click", () => { addToTray("Offer: " + b.dataset.title); openTray(); }));

      const dots = document.getElementById("offerDots");
      dots.innerHTML = active.length > 1
        ? active.map((_, i) => `<button class="offer-dot ${i === 0 ? "active" : ""}" aria-label="Show offer ${i + 1}" data-i="${i}"></button>`).join("")
        : "";

      const slides = document.querySelectorAll(".offer-slide");
      const dotEls = document.querySelectorAll(".offer-dot");
      let current = 0, timer;
      const controls=$('offerControls'), track=$('offerTrack');
      controls.hidden=slides.length<2;
      const controller=new AbortController(), opts={signal:controller.signal};
      slides.forEach((slide,i)=>{slide.inert=i!==0;});

      function show(n) {
        slides[current].classList.remove("active"); slides[current].inert=true;
        dotEls[current]?.classList.remove("active");
        current = (n + slides.length) % slides.length;
        slides[current].classList.add("active"); slides[current].inert=false;
        dotEls[current]?.classList.add("active");
      }
      function start() {
        if (slides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        clearInterval(timer); timer = setInterval(() => show(current + 1), 6000);
      }
      function stop() { clearInterval(timer); }

      dotEls.forEach(d => d.addEventListener("click", () => { stop(); show(+d.dataset.i); start(); }));
      const slider = document.getElementById("offerSlider");
      function move(delta){stop();show(current+delta);start();}
      $('offerPrev').addEventListener('click',()=>move(-1),opts);
      $('offerNext').addEventListener('click',()=>move(1),opts);
      let gesture=null, suppress=false;
      track.addEventListener('pointerdown',e=>{if(slides.length<2||!e.isPrimary||e.button!==0||e.target.closest('button,a,input'))return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};stop();track.classList.add('dragging');track.setPointerCapture(e.pointerId);},opts);
      track.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;track.classList.remove('dragging');if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){suppress=true;move(dx<0?1:-1);setTimeout(()=>suppress=false,400);}else start();},opts);
      track.addEventListener('pointercancel',()=>{gesture=null;track.classList.remove('dragging');start();},opts);
      track.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopPropagation();suppress=false;}},{capture:true,signal:controller.signal});
      slider.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}},opts);
      slider.onmouseenter=stop; slider.onmouseleave=start; stopOffers=()=>{stop();controller.abort();track.classList.remove('dragging');slider.onmouseenter=null;slider.onmouseleave=null;};
      start();
    }