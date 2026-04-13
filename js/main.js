(function (Drupal, once) {
  Drupal.behaviors.idtTheme = {
    attach: function (context) {
      /* ------------------------------
  * SEARCH COMPONENT TOGGLE
  * ------------------------------ */
      once("idt-search-toggle", ".search-comp", context).forEach((searchComp) => {
        const openBtn = searchComp.querySelector("#openSearch");
        const overlay = searchComp.querySelector(".overlay");
        const closeBtn = overlay ? overlay.querySelector(".close") : null;
        const searchInput = searchComp.querySelector("#search-input");
        const searchResults = searchComp.querySelector("#search-results");

        const closeSearch = () => {
          if (!overlay) return;
          overlay.classList.remove("active");
          if (searchInput) searchInput.value = "";
          if (searchResults) searchResults.innerHTML = "";
        };

        if (openBtn && overlay) {
          openBtn.addEventListener("click", () => {
            overlay.classList.toggle("active");
            if (overlay.classList.contains("active") && searchInput) {
              searchInput.focus();
            }
          });
        }

        if (closeBtn) {
          closeBtn.addEventListener("click", closeSearch);
        }

        // Close on Escape key
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && overlay && overlay.classList.contains("active")) {
            closeSearch();
          }
        });

        // Close on background click
        if (overlay) {
          overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeSearch();
          });
        }

        if (!searchInput || !searchResults) return;

        let controller = new AbortController();

        function getResultImage(result) {
          return result.field_mainimg
            || result.field_cover
            || result.field_image
            || result.field_imagen_proveedores
            || result.field_imagen_mobile
            || "";
        }

        async function performSearch(query) {
          try {
            if (query !== "") {
              const lang = (drupalSettings && drupalSettings.path && drupalSettings.path.currentLanguage) || "es";
              const signal = controller.signal;

              const response = await fetch(
                `/${lang}/api/search?query=${encodeURIComponent(query)}&langcode=${lang}`,
                { signal }
              );

              if (!response.ok) throw new Error("Error al realizar la consulta");

              const data = await response.json();
              searchResults.innerHTML = "";

              if (data.length === 0) {
                searchResults.innerHTML = `<li class="no-results">No se encontraron resultados</li>`;
                return;
              }

              data.forEach((result) => {
                const title = result.title || "";
                const url = result.view_node || "#";
                const type = result.type || "";
                const img = getResultImage(result);

                searchResults.innerHTML += `
                  <li title="${title}">
                    <a href="${url}">
                      ${img ? `<img src="${img}" alt="${title}">` : `<div class="no-img"></div>`}
                      <div class="info">
                        <p>${title}</p>
                        <span>${type}</span>
                      </div>
                    </a>
                  </li>`;
              });
            } else {
              searchResults.innerHTML = "";
            }
          } catch (error) {
            if (error.name !== "AbortError") {
              console.error("Search error:", error.message);
            }
          }
        }

        searchInput.addEventListener("keyup", (event) => {
          const query = event.target.value;

          controller.abort();
          controller = new AbortController();

          performSearch(query);
        });
      });
      // Usamos once para evitar múltiples inicializaciones
      once('init-aos', 'html', context).forEach(function () {

        // Función interna de inicialización
        const runAOS = () => {
          if (typeof AOS !== 'undefined') {
            AOS.init({
              duration: 1000,
              once: true,
              startEvent: 'DOMContentLoaded',
            });
            // Forzamos un refresh para que detecte los elementos del DOM actuales
            AOS.refresh();
          }
        };

        // Lógica de espera:
        // 1. Si ya existe el objeto AOS, ejecutar.
        // 2. Si no existe (común en anónimos), esperar a que la ventana cargue todo.
        if (typeof AOS !== 'undefined') {
          runAOS();
        } else {
          window.addEventListener('load', runAOS);
        }
      });
      document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      /* ------------------------------
      * GASTRONOMY FILTER (checkboxes)
      * ------------------------------ */
      once("idt-gastro-filter", ".filters", context).forEach((filtersWrapper) => {

        const cards = context.querySelectorAll("#cardsList .card");
        const checkboxes = filtersWrapper.querySelectorAll("input[type='checkbox']");

        if (!cards.length || !checkboxes.length) {
          console.warn("Gastro filter: no hay cards o checkboxes");
          return;
        }

        // Función auxiliar para extraer datos de la card
        function getCardTerms(card) {
          return [
            ...(card.dataset.categoria || "").split(","),
            ...(card.dataset.zona || "").split(","),
            ...(card.dataset.precios || "").split(","),
            ...(card.dataset.servicios || "").split(","),
            ...(card.dataset.tipo || "").split(",")
          ].filter(t => t !== ""); // Limpiar vacíos
        }

        function updateAvailableFilters(activeFilters = []) {
          checkboxes.forEach((cb) => {
            // Si ya está chequeado, lo dejamos habilitado para que puedan desmarcarlo
            if (cb.checked) {
              cb.parentElement.style.opacity = "1";
              cb.disabled = false;
              return;
            }

            // Simulamos: "¿Qué pasaría si marco este checkbox específico?"
            const potentialFilters = [...activeFilters, cb.value];

            const wouldHaveResults = Array.from(cards).some((card) => {
              const cardTerms = getCardTerms(card);
              return potentialFilters.every((f) => cardTerms.includes(f));
            });

            // Si no habría resultados, visualmente lo "apagamos"
            if (wouldHaveResults) {
              cb.disabled = false;
              cb.parentElement.style.opacity = "1";
              cb.parentElement.style.pointerEvents = "auto";
              cb.parentElement.style.display = "block"; // Feedback visual de deshabilitado
            } else {
              cb.disabled = true;
              cb.parentElement.style.display = "none"; // Feedback visual de deshabilitado
              cb.parentElement.style.pointerEvents = "none";
            }
          });
        }

        /* ============================================
        * 2. Aplicar filtros seleccionados (Lógica AND)
        * ============================================ */
        function applyFilters() {
          const activeFilters = Array.from(checkboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);

          // 1. Aplicar el filtrado real a las cards (Lógica AND)
          cards.forEach((card) => {
            const cardTerms = getCardTerms(card);
            const match = activeFilters.length === 0 || activeFilters.every((f) => cardTerms.includes(f));
            card.style.display = match ? "" : "none";
          });

          // 2. Actualizar qué filtros seguirían dando resultados (Predictivo)
          updateAvailableFilters(activeFilters);
        }

        /* ============================================
         * 3. Eventos checkbox
         * ============================================ */
        checkboxes.forEach((cb) => {
          cb.addEventListener("change", applyFilters);
        });
        applyFilters();
      });
      once('fancybox', 'html', context).forEach(() => {
        if (window.Fancybox && typeof window.Fancybox.bind === 'function') {
          window.Fancybox.bind("[data-fancybox]", {
          });
        }
      });
      once('splide', context.querySelectorAll('.splide')).forEach(el => {
        new Splide(el, {
          type: 'loop',
          perPage: 3,
          gap: '19px',
          focus: 'center',
        }).mount();
      });

      const qs = (selector, scope = context) => scope.querySelector(selector);


      /* ------------------------------
       * TOP NAV
       * ------------------------------ */
      once("idt-top-nav", ".top-nav", context).forEach((topNav) => {
        const toggleButton = qs(".top-nav__toggle", topNav);
        const mobileMenu = qs("#mobile-quick-nav");
        const toggleText = qs(".top-nav__toggle-text");

        if (!toggleButton || !mobileMenu) return;

        const labels = {
          open: "Cerrar menú principal",
          closed: "Abrir menú principal",
        };

        const setState = (open) => {
          toggleButton.setAttribute("aria-expanded", String(open));
          toggleButton.setAttribute(
            "aria-label",
            open ? labels.open : labels.closed
          );

          if (toggleText)
            toggleText.textContent = open ? labels.open : labels.closed;

          topNav.classList.toggle("top-nav--menu-open", open);
          mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
        };

        setState(false);

        toggleButton.addEventListener("click", () => {
          const nextState =
            toggleButton.getAttribute("aria-expanded") !== "true";
          setState(nextState);
        });

        toggleButton.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            setState(false);
            toggleButton.blur();
          }
        });
      });

      /* ------------------------------
       * UPDATE YEAR
       * ------------------------------ */
      once("idt-year", "#year", context).forEach((yearNode) => {
        yearNode.textContent = new Date().getFullYear();
      });

      /* ------------------------------
       * CTA BUTTON
       * ------------------------------ */
      once("idt-cta", "#cta-primary", context).forEach((button) => {
        button.addEventListener("click", () => {
          button.textContent = "Gracias por tu interes";
          button.disabled = true;
        });
      });

      /* ------------------------------
       * SYNC SELECT LABEL
       * ------------------------------ */
      const syncSelectLabel = (key, selectSelector, labelSelector) => {
        once(key, selectSelector, context).forEach((select) => {
          const label = qs(labelSelector);
          if (!label) return;

          const update = () => {
            const option = select.selectedOptions[0];
            if (option) label.textContent = option.textContent.trim();
          };

          update();
          select.addEventListener("change", update);
        });
      };

      syncSelectLabel("sync-stopover", 'select[name="stopover"]', ".pill--light .pill__label");
      syncSelectLabel("sync-language", 'select[name="language"]', ".pill--flag .pill__value");


      /* ------------------------------
       * LANGUAGE SELECTOR
       * ------------------------------ */
      once("idt-language-selector", 'select[name="language"]', context).forEach(
        (select) => {
          const valueNode = qs(".pill--flag .pill__value");
          const flagNode = qs(".pill--flag .pill__flag");

          if (!valueNode || !flagNode) return;

          const flagMap = {
            en: { className: "fi fi-gb", label: "EN" },
            es: { className: "fi fi-es", label: "ES" },
          };

          const update = () => {
            const config = flagMap[select.value] || flagMap.en;
            valueNode.textContent = config.label;
            flagNode.className = `pill__flag ${config.className}`;
          };

          update();
          select.addEventListener("change", update);
        }
      );

      /* ------------------------------
       * INFINITE CAROUSELS
       * ------------------------------ */
      once("idt-carousel", "[data-carousel]", context).forEach((carousel) => {
        const viewport = carousel.querySelector("[data-carousel-viewport]");
        const track = carousel.querySelector("[data-carousel-track]");
        const prevBtn = carousel.querySelector("[data-carousel-prev]");
        const nextBtn = carousel.querySelector("[data-carousel-next]");

        if (!viewport || !track || !prevBtn || !nextBtn) return;

        const originals = [...track.querySelectorAll("[data-carousel-item]")];
        if (!originals.length) return;

        const indicatorsContainer = carousel.querySelector(
          "[data-carousel-indicators]"
        );
        // Identificar a qué carrusel pertenece
        const carouselId = carousel.getAttribute("data-carousel-id");

        // Obtener únicamente las tabs que apunten a este carrusel
        let indicatorButtons = [
          ...document.querySelectorAll(`[data-carousel-indicator][data-carousel-target="${carouselId}"]`)
        ];

        if (indicatorsContainer) {
          indicatorsContainer.innerHTML = "";
          indicatorButtons = originals.map((_, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.setAttribute("aria-label", `Ir al elemento ${i + 1}`);
            indicatorsContainer.appendChild(btn);
            return btn;
          });
        }

        const cloneItem = (item) => {
          const clone = item.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          return clone;
        };

        originals.forEach((item) => track.appendChild(cloneItem(item)));
        [...originals].reverse().forEach((item) => {
          track.insertBefore(cloneItem(item), track.firstChild);
        });

        let step = 0;
        const calcStep = () => {
          const first = track.querySelector("[data-carousel-item]");
          if (!first) return;
          const gap =
            parseFloat(
              getComputedStyle(track).columnGap ||
              getComputedStyle(track).gap ||
              "0"
            ) || 0;

          step = first.getBoundingClientRect().width + gap;
        };

        const totalItems = track.querySelectorAll(
          "[data-carousel-item]"
        ).length;
        const baseCount = originals.length;
        const minIndex = baseCount;
        const maxIndex = totalItems - baseCount;

        let index = minIndex;
        let isAnimating = false;

        const updateIndicators = () => {
          if (!indicatorButtons.length) return;

          const relativeIndex =
            (((index - minIndex) % baseCount) + baseCount) % baseCount;

          indicatorButtons.forEach((btn, i) => {
            const active = i === relativeIndex;
            btn.setAttribute("aria-selected", active ? "true" : "false");
            btn.classList.toggle("is-active", active);
          });
        };

        const jumpTo = (n) => {
          viewport.scrollLeft = n * step;
          updateIndicators();
        };

        const animateTo = (n) => {
          if (!step) return;
          isAnimating = true;

          const target = n * step;

          const onScroll = () => {
            if (Math.abs(viewport.scrollLeft - target) < 1) {
              cleanup();
              finalize();
            }
          };

          const finalize = () => {
            isAnimating = false;

            if (index >= maxIndex) {
              index = minIndex;
              jumpTo(index);
            } else if (index < minIndex) {
              index = maxIndex - 1;
              jumpTo(index);
            }
          };

          const cleanup = () => {
            viewport.removeEventListener("scroll", onScroll);
            clearTimeout(timeout);
          };

          viewport.addEventListener("scroll", onScroll);
          const timeout = setTimeout(() => {
            cleanup();
            finalize();
          }, 500);

          viewport.scrollTo({ left: target, behavior: "smooth" });
          updateIndicators();
        };

        const move = (dir) => {
          if (isAnimating) return;
          index += dir;
          animateTo(index);
        };

        prevBtn.addEventListener("click", () => move(-1));
        nextBtn.addEventListener("click", () => move(1));

        // Swipe
        let startX = 0;
        let deltaX = 0;

        viewport.addEventListener(
          "touchstart",
          (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            deltaX = 0;
          },
          { passive: true }
        );

        viewport.addEventListener(
          "touchmove",
          (e) => {
            deltaX = e.touches[0].clientX - startX;
          },
          { passive: true }
        );

        viewport.addEventListener("touchend", () => {
          if (Math.abs(deltaX) > 40) {
            move(deltaX < 0 ? 1 : -1);
          }
        });

        if (indicatorButtons.length) {
          indicatorButtons.forEach((btn, i) => {
            btn.addEventListener("click", () => {
              if (isAnimating) return;
              index = minIndex + i;
              animateTo(index);
            });
          });
        }

        const handleResize = () => {
          calcStep();
          jumpTo(index);
        };

        window.addEventListener("resize", handleResize);

        calcStep();
        jumpTo(index);
        updateIndicators();
      });

      /* ------------------------------
       * DETAIL GALLERY
       * ------------------------------ */
      once("idt-detail-gallery", "[data-detail-gallery]", context).forEach(
        (gallery) => {
          const mainImage = gallery.querySelector("[data-gallery-image]");
          const captionNode = gallery.querySelector("[data-gallery-caption]");
          const thumbs = [...gallery.querySelectorAll("[data-gallery-thumb]")];

          // NUEVO: obtener imágenes cuando no hay thumbs
          let items = thumbs;

          if (thumbs.length === 0) {
            items = [...gallery.querySelectorAll("[data-gallery-item]")];
          }

          if (!mainImage || items.length === 0) return;

          const prevBtn = gallery.querySelector("[data-gallery-prev]");
          const nextBtn = gallery.querySelector("[data-gallery-next]");

          let currentIndex = 0;

          const apply = (i) => {
            const target = items[i];
            const { image, caption, alt } = target.dataset;

            if (image) mainImage.src = image;
            if (alt) mainImage.alt = alt;
            if (captionNode) captionNode.textContent = caption || "";
            currentIndex = i;
          };

          apply(0);

          const move = (dir) => {
            const total = items.length;
            const next = (currentIndex + dir + total) % total;
            apply(next);
          };

          if (prevBtn) prevBtn.addEventListener("click", () => move(-1));
          if (nextBtn) nextBtn.addEventListener("click", () => move(1));
        }
      );


      /* ------------------------------
       * LIVEBOX MAP
       * ------------------------------ */
      once("idt-map-livebox", "[data-map-trigger]", context).forEach(() => {
        const trigger = qs("[data-map-trigger]");
        const livebox = qs("[data-map-livebox]");
        if (!trigger || !livebox) return;

        const dialog = livebox.querySelector(".map-livebox__dialog");
        const closeButtons = livebox.querySelectorAll("[data-map-close]");
        let lastFocus = null;
        let timeout = null;

        const showLivebox = () => {
          if (!livebox.hidden) return;
          lastFocus = document.activeElement;
          livebox.hidden = false;
          livebox.setAttribute("aria-hidden", "false");

          requestAnimationFrame(() => {
            livebox.classList.add("is-open");
            dialog?.focus();
          });
        };

        const hideLivebox = () => {
          if (livebox.hidden) return;

          livebox.classList.remove("is-open");

          if (timeout) clearTimeout(timeout);

          timeout = setTimeout(() => {
            livebox.hidden = true;
            livebox.setAttribute("aria-hidden", "true");
            if (lastFocus?.focus) lastFocus.focus();
          }, 220);
        };

        trigger.addEventListener("click", showLivebox);
        closeButtons.forEach((b) => b.addEventListener("click", hideLivebox));

        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && !livebox.hidden) hideLivebox();
        });
      });

      /* ------------------------------
       * DETAIL ROOMS TABS
       * ------------------------------ */
      once("idt-detail-rooms", ".detail-rooms", context).forEach((section) => {
        const tabs = section.querySelectorAll(".rooms-tab");
        const cards = section.querySelectorAll(".room-card");

        if (!tabs.length || !cards.length) return;

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const index = tab.dataset.roomIndex;

            tabs.forEach((btn) => {
              const active = btn === tab;
              btn.classList.toggle("is-active", active);
              btn.setAttribute("aria-selected", active ? "true" : "false");
            });

            cards.forEach((card) => {
              card.style.display =
                card.dataset.roomIndex === index ? "block" : "none";
            });
          });
        });
      });

      /* ------------------------------
       * RANGE BUBBLES
       * ------------------------------ */
      once("idt-range-bubbles", "[data-range-control]", context).forEach(
        (control) => {
          const input = control.querySelector('input[type="range"]');
          const valueNode = control.querySelector("[data-range-value]");
          if (!input || !valueNode) return;

          const update = () => {
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const val = Number(input.value) || 0;

            const percent = max === min ? 0 : ((val - min) / (max - min)) * 100;
            const clamped = Math.max(0, Math.min(100, percent));

            valueNode.textContent = val.toLocaleString("es-CO");
            control.style.setProperty("--range-progress", `${clamped}%`);
          };

          input.addEventListener("input", update);
          input.addEventListener("change", update);

          update();
        }
      );
      /* ------------------------------
    * PLACES FILTER (Drupal behavior)
    * ------------------------------ */
      once("idt-places-filter", "#places", context).forEach((wrapper) => {
        // Si prefieres usar la clase: once("idt-places-filter", ".places", context)
        console.log(wrapper);

        if (!wrapper) {
          console.warn("Places filter: no se encontró el contenedor #places en el contexto.");
          return;
        }

        const chips = wrapper.querySelectorAll(".places-chip");
        const range = wrapper.querySelector("[data-range-control] input[type='range']");
        const rangeValue = wrapper.querySelector("[data-range-value]");
        const locationSelect = wrapper.querySelector("select[name='location']");
        const cards = wrapper.querySelectorAll(".place-card");
        const typeSelect = wrapper.querySelector("select[name='type']");



        // Debug (opcional) — coméntalo si no quieres logs
        console.log('places filter init', { chips, range, rangeValue, locationSelect, cards });

        // Estado actual de filtros
        let filters = {
          types: [],
          capacity: 0,
          location: null,
          type: null, // ← NUEVO
        };
        /** SELECT TIPO DE VENUE **/
        if (typeSelect) {
          typeSelect.addEventListener("change", (e) => {
            filters.type = e.target.value || null;
            applyFilters();
          });
        }
        /** RANGO **/
        if (range && rangeValue) {
          range.addEventListener("input", (e) => {
            rangeValue.textContent = e.target.value;
            filters.capacity = parseInt(e.target.value, 10) || 0;
            applyFilters();
          });
        }

        /** SELECT UBICACIÓN **/
        if (locationSelect) {
          locationSelect.addEventListener("change", (e) => {
            filters.location = e.target.value || null;
            applyFilters();
          });
        }

        /** CHIPS **/
        if (chips && chips.length) {
          chips.forEach((chip) => {
            chip.addEventListener("click", () => {
              const labelNode = chip.querySelector(".places-chip__label");
              const label = labelNode ? labelNode.textContent.trim() : null;
              if (!label) return;

              chip.classList.toggle("places-chip--muted");

              if (filters.types.includes(label)) {
                filters.types = filters.types.filter((t) => t !== label);
              } else {
                filters.types.push(label);
              }

              applyFilters();
            });
          });
        }

        /** FUNCIÓN DE FILTRO **/
        function applyFilters() {
          if (!cards) return;

          // 1. Filtrar cards normalmente
          cards.forEach((card) => {
            let visible = true;

            // Chips
            if (filters.types.length > 0) {
              const titleNode = card.querySelector(".place-card__title");
              const title = titleNode ? titleNode.textContent.toLowerCase() : "";

              visible = filters.types.some((t) =>
                title.includes(t.toLowerCase())
              );
            }

            // Capacidad
            const cardCapacity = parseInt(card.dataset.capacity || 0, 10);
            if (filters.capacity > 0 && cardCapacity < filters.capacity) {
              visible = false;
            }

            // Ubicación
            const cardLocation = card.dataset.location;
            if (filters.location && cardLocation !== filters.location) {
              visible = false;
            }

            // Tipo venue
            const cardType = card.dataset.type;
            if (filters.type && filters.type !== cardType) {
              visible = false;
            }

            card.style.display = visible ? "" : "none";
          });

          // 2. Actualizar filtros disponibles
          updateAvailableFilters();
        }
        function updateAvailableFilters() {
          // Cards visibles actualmente
          const visibleCards = Array.from(cards).filter(
            (card) => card.style.display !== "none"
          );

          // --- LOCATIONS DISPONIBLES ---
          if (locationSelect) {
            const availableLocations = new Set(
              visibleCards.map((card) => card.dataset.location)
            );

            Array.from(locationSelect.options).forEach((option) => {
              if (option.value === "") return; // dejar placeholder

              option.hidden = !availableLocations.has(option.value);
            });
          }

          // --- TYPES DISPONIBLES ---
          if (typeSelect) {
            const availableTypes = new Set(
              visibleCards.map((card) => card.dataset.type)
            );

            Array.from(typeSelect.options).forEach((option) => {
              if (option.value === "") return;

              option.hidden = !availableTypes.has(option.value);
            });
          }

          // --- CHIPS DISPONIBLES ---
          if (chips.length) {
            chips.forEach((chip) => {
              const labelNode = chip.querySelector(".places-chip__label");
              const label = labelNode
                ? labelNode.textContent.trim().toLowerCase()
                : "";

              // Si alguna card visible contiene ese chip
              const exists = visibleCards.some((card) => {
                const titleNode = card.querySelector(".place-card__title");
                const title = titleNode
                  ? titleNode.textContent.toLowerCase()
                  : "";

                return title.includes(label);
              });

              chip.style.display = exists ? "" : "none";
            });
          }
        }




        // Si quieres que aplique filtros al inicio (por ej. hay un valor por defecto)
        applyFilters();
      });



      /* ------------------------------
       * EVENTS FILTER (NUEVO)
       * ------------------------------ */
      once("idt-events-filter", ".events__filters", context).forEach((filtersWrapper) => {

        const buttons = filtersWrapper.querySelectorAll("button");
        const cards = context.querySelectorAll(".event-card");

        if (!buttons.length || !cards.length) {
          console.warn("Events filter: No encontró botones o cards");
          return;
        }

        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const buttonActive = filtersWrapper.querySelector("button.active");
            console.log(buttonActive);
            if (buttonActive) {
              buttonActive.classList.remove('active');
            }
            btn.classList.add('active')
            const tid = btn.dataset.tid;

            cards.forEach((card) => {
              const types = (card.dataset.type || "")
                .split(",")
                .map((v) => v.trim());

              if (tid === "all") {
                // Botón TODOS
                card.style.display = "";
              } else if (types.includes(tid)) {
                card.style.display = "";
              } else {
                card.style.display = "none";
              }
            });
          });
        });
      });

      const modal = document.getElementById("gallery-modal");
      const track = document.getElementById("carousel-track");

      let images = [];
      let index = 0;

      // --- Navegación: solo una vez ---
      once("gallery-prev", "[data-prev]", context).forEach(function (prevBtn) {
        prevBtn.addEventListener("click", function () {
          if (!images.length) return;
          index = (index - 1 + images.length) % images.length;
          updateCarousel();
        });
      });

      once("gallery-next", "[data-next]", context).forEach(function (nextBtn) {
        nextBtn.addEventListener("click", function () {
          if (!images.length) return;
          index = (index + 1) % images.length;
          updateCarousel();
        });
      });

      once("gallery-close", "[data-close-modal]", context).forEach(function (closeBtn) {
        closeBtn.addEventListener("click", function () {
          modal.setAttribute("hidden", true);
        });
      });


      // --- Cada botón se procesa UNA VEZ, pero el contenido cambia siempre ---
      once("gallery-open", ".open-gallery", context).forEach(function (button) {

        button.addEventListener("click", function () {
          // 1. Cargar imágenes desde el dataset
          images = JSON.parse(button.dataset.gallery);
          index = 0;

          // 2. Render dinámico del carrusel
          track.innerHTML = images
            .map(img => `
              <div class="carousel__item">
                <img src="${img.url}" alt="${img.alt}">
              </div>
            `)
            .join("");

          // 3. Mostrar modal
          modal.removeAttribute("hidden");

          // 4. Posicionar
          updateCarousel();
        });

      });


      // --- Función de movimiento ---
      function updateCarousel() {
        track.style.transform = "translateX(-" + (index * 100) + "%)";
      }

      /* ------------------------------
       * MEGA MENU
       * ------------------------------ */
      once("mega-menu", ".main-nav", context).forEach((nav) => {
        const items = [...nav.querySelectorAll(".nav-item.has-mega")];
        const toggle = nav.querySelector(".nav-toggle");
        const list = nav.querySelector(".nav-list");
        let activeItem = null;

        const isMobile = () => window.innerWidth < 1025;

        const closeItem = (item) => {
          if (!item) return;
          const panel = item.querySelector(".mega-menu");
          if (panel) {
            panel.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
          }
          item.classList.remove("is-active");
          const link = item.querySelector(".nav-link");
          if (link) link.setAttribute("aria-expanded", "false");
        };

        const closeAll = () => {
          closeItem(activeItem);
          activeItem = null;
        };

        const openItem = (item) => {
          if (activeItem && activeItem !== item) closeItem(activeItem);
          const panel = item.querySelector(".mega-menu");
          if (!panel) return;
          panel.classList.add("is-open");
          panel.setAttribute("aria-hidden", "false");
          item.classList.add("is-active");
          const link = item.querySelector(".nav-link");
          if (link) link.setAttribute("aria-expanded", "true");
          activeItem = item;
        };

        items.forEach((item) => {
          // Desktop: hover
          item.addEventListener("mouseenter", () => {
            if (!isMobile()) openItem(item);
          });
          item.addEventListener("mouseleave", () => {
            if (!isMobile()) closeAll();
          });

          // Mobile: tap top-level link to accordion-toggle
          const link = item.querySelector(".nav-link");
          if (link) {
            link.addEventListener("click", (e) => {
              if (!isMobile()) return;
              e.preventDefault();
              activeItem === item ? closeAll() : openItem(item);
            });
          }
        });

        // Close on outside click
        document.addEventListener("click", (e) => {
          if (!nav.contains(e.target)) closeAll();
        });

        // Escape closes panel and/or mobile nav
        document.addEventListener("keydown", (e) => {
          if (e.key !== "Escape") return;
          closeAll();
          if (list && list.classList.contains("is-open")) {
            list.classList.remove("is-open");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
          }
        });

        // Mobile hamburger toggle
        if (toggle && list) {
          toggle.addEventListener("click", () => {
            const isOpen = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!isOpen));
            toggle.setAttribute("aria-label", !isOpen ? "Cerrar menú" : "Abrir menú");
            list.classList.toggle("is-open", !isOpen);
            if (isOpen) closeAll();
          });
        }
      });

      /* ------------------------------
   * AGENDA FILTER (Mejorado con Fecha Fin)
   * ------------------------------ */
      once("idt-agenda-filter", "#events-filter-form", context).forEach((form) => {
        const grid = document.getElementById("events-grid");
        const cards = Array.from(grid.querySelectorAll(".card"));

        const selectCat = form.querySelector("#categoria");
        const selectTipo = form.querySelector("#tipo");
        const inputDesde = form.querySelector("#fecha_desde");
        const inputHasta = form.querySelector("#fecha_hasta");

        const applyFilters = () => {
          const valCat = selectCat.value;
          const valTipo = selectTipo.value;
          const valDesde = inputDesde.value; // YYYY-MM-DD
          const valHasta = inputHasta.value;

          cards.forEach((card) => {
            const { categoria, tipo, fecha, fechaFin } = card.dataset;

            // 1. Filtros de Taxonomía
            const matchCat = (valCat === "all" || valCat === categoria);
            const matchTipo = (valTipo === "all" || valTipo === tipo);

            // 2. Lógica de Rango de Fechas (Intersección)
            let matchFecha = true;

            // Si el usuario pone "Desde", el evento debe terminar después o ese día
            if (valDesde && fechaFin < valDesde) {
              matchFecha = false;
            }

            // Si el usuario pone "Hasta", el evento debe empezar antes o ese día
            if (valHasta && fecha > valHasta) {
              matchFecha = false;
            }

            if (matchCat && matchTipo && matchFecha) {
              card.style.display = "";
              card.classList.remove("aos-animate");
              setTimeout(() => card.classList.add("aos-animate"), 10);
            } else {
              card.style.display = "none";
            }
          });

          // Función que ya tenías para ocultar opciones sin resultados
          updateAvailableOptions();
        };

        form.addEventListener("change", applyFilters);
        applyFilters();
      });

    }, // end attach
  };
})(Drupal, once);
