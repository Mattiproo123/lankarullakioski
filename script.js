(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Sticky nav + mobile menu */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");

  function setMenuOpen(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Sulje valikko" : "Avaa valikko");
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenuOpen(!nav.classList.contains("is-open"));
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });

    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) setMenuOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenuOpen(false);
    });
  }

  /* Smooth in-page navigation */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var id = this.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var smooth = prefersReducedMotion ? "auto" : "smooth";
      target.scrollIntoView({ behavior: smooth, block: "start" });
    });
  });

  /* Fade-in on scroll */
  var revealEls = document.querySelectorAll(".reveal");

  if (prefersReducedMotion) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else if (revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealEls.forEach(function (el) {
      io.observe(el);
    });
  }

  /* Menu category tabs: sticky highlight + scroll spy */
  var menuSection = document.getElementById("menu");
  var catsNav = document.querySelector(".menu-cats");
  var categoryIds = ["menu-hampurilaiset", "menu-lisukkeet", "menu-grill-trahteet", "menu-juomat-kiosk"];
  var headerEl = document.querySelector(".site-header");

  if (menuSection && catsNav) {
    var currentCategoryId = null;

    function syncMenuCatsHeight() {
      var h = catsNav.offsetHeight;
      document.documentElement.style.setProperty("--menu-cats-sticky-h", h + "px");
    }

    function getScanlineY() {
      var headerH = headerEl ? headerEl.offsetHeight : 72;
      return headerH + catsNav.offsetHeight + 14;
    }

    function setActiveCategory(id, options) {
      options = options || {};
      var scrollTabIntoView = options.scrollTabIntoView === true;

      var buttons = catsNav.querySelectorAll(".menu-cats__btn");
      buttons.forEach(function (btn) {
        var href = btn.getAttribute("href") || "";
        var match = href === "#" + id;
        btn.classList.toggle("is-active", match);
        if (match) {
          btn.setAttribute("aria-current", "true");
          if (scrollTabIntoView && !prefersReducedMotion) {
            btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
          }
        } else {
          btn.removeAttribute("aria-current");
        }
      });

      currentCategoryId = id;
    }

    function setActiveIfChanged(id, opts) {
      if (id && id !== currentCategoryId) setActiveCategory(id, opts);
    }

    function updateActiveFromScroll() {
      var menuRect = menuSection.getBoundingClientRect();
      var y = getScanlineY();

      if (menuRect.bottom <= y) {
        setActiveIfChanged(categoryIds[categoryIds.length - 1], {});
        return;
      }

      if (menuRect.top > y) {
        setActiveIfChanged(categoryIds[0], {});
        return;
      }

      var activeId = categoryIds[0];
      categoryIds.forEach(function (cid) {
        var el = document.getElementById(cid);
        if (!el) return;
        if (el.getBoundingClientRect().top <= y) activeId = cid;
      });

      setActiveIfChanged(activeId, {});
    }

    var scrollTicking = false;
    function onScrollOrResize() {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        scrollTicking = false;
        updateActiveFromScroll();
      });
    }

    catsNav.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest(".menu-cats__btn");
        if (!btn) return;
        var href = btn.getAttribute("href");
        if (!href || href.charAt(0) !== "#") return;
        var id = href.slice(1);
        window.requestAnimationFrame(function () {
          setActiveCategory(id, { scrollTabIntoView: true });
        });
      },
      true
    );

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", function () {
      syncMenuCatsHeight();
      onScrollOrResize();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncMenuCatsHeight).catch(syncMenuCatsHeight);
    } else {
      syncMenuCatsHeight();
    }

    window.addEventListener("load", function () {
      syncMenuCatsHeight();
      updateActiveFromScroll();
    });

    syncMenuCatsHeight();
    updateActiveFromScroll();
  }
})();
