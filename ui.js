 // --- Scroll Reveal & Counters ---
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        entry.target.querySelectorAll(".stat-num").forEach(el => {
          const target = +el.dataset.target;
          let cur = 0;
          const step = Math.max(1, Math.ceil(target / 45));
          const timer = setInterval(() => {
            cur += step;
            if (cur >= target) { el.textContent = target.toLocaleString() + (target === 20 ? "+" : ""); clearInterval(timer); }
            else el.textContent = cur.toLocaleString();
          }, 25);
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

         // --- Mobile menu ---
const menuBtn = document.getElementById("menuBtn");
const navEl = document.querySelector("nav");

menuBtn.addEventListener("click", () => {
  const isOpen = navEl.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", isOpen);
});

navEl.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navEl.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});


// --- Close Modal ---

function closeModal(id) {

    const modal = document.getElementById(id);

    if (modal) {

        modal.classList.remove("open");

    }

}
    