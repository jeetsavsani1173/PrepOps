document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. Dark/Light Theme Switcher Logic
  // ==========================================
  const themeToggleBtn = document.getElementById("theme-toggle");
  
  // Set initial icon states and button sync
  function initTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    themeToggleBtn.setAttribute(
      "aria-label",
      `Switch to ${isDark ? "light" : "dark"} mode`
    );
  }

  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    
    if (isDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("showcase-theme", "light");
      themeToggleBtn.setAttribute("aria-label", "Switch to dark mode");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("showcase-theme", "dark");
      themeToggleBtn.setAttribute("aria-label", "Switch to light mode");
    }
  });

  initTheme();

  // ==========================================
  // 2. Setup Guide Tab switcher
  // ==========================================
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      // Reset tabs
      tabButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabPanes.forEach((p) => p.classList.remove("active"));

      // Set active
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      
      const activePane = document.getElementById(targetId);
      if (activePane) {
        activePane.classList.add("active");
      }
    });
  });

  // ==========================================
  // 3. Terminal Copy to Clipboard Widgets
  // ==========================================
  const copyButtons = document.querySelectorAll(".copy-btn");

  copyButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const textToCopy = btn.getAttribute("data-clipboard");
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        
        // Visual success state
        btn.textContent = "Copied!";
        btn.classList.add("copied");

        // Reset state after delay
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 1500);
      } catch (err) {
        console.error("Failed to copy code snippet:", err);
      }
    });
  });

  // ==========================================
  // 4. Accordion Toggle Logic
  // ==========================================
  const accordionButtons = document.querySelectorAll(".accordion-toggle");

  accordionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentAccordion = btn.closest(".accordion");
      if (!parentAccordion) return;

      const isOpen = parentAccordion.classList.contains("open");
      
      // Toggle state
      if (isOpen) {
        parentAccordion.classList.remove("open");
      } else {
        parentAccordion.classList.add("open");
      }

      // Rotate indicator symbol (▶ to ▼)
      const labelSpan = btn.querySelector("span");
      if (labelSpan) {
        const text = labelSpan.textContent;
        if (isOpen) {
          labelSpan.textContent = text.replace("▼", "▶");
        } else {
          labelSpan.textContent = text.replace("▶", "▼");
        }
      }
    });
  });

  // ==========================================
  // 5. Mobile Navbar Burger Menu Trigger
  // ==========================================
  const burgerMenuBtn = document.querySelector(".nav-menu-btn");
  const navLinksContainer = document.querySelector(".nav-links");

  if (burgerMenuBtn && navLinksContainer) {
    burgerMenuBtn.addEventListener("click", () => {
      navLinksContainer.classList.toggle("open");
    });

    // Close menu when clicking any nav link
    const links = navLinksContainer.querySelectorAll("a");
    links.forEach((l) => {
      l.addEventListener("click", () => {
        navLinksContainer.classList.remove("open");
      });
    });
  }
});

