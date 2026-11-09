(() => {
  const storageKey = "cnz-pta-tools:favourites";
  const favoritesGrid = document.getElementById("favorites-grid");
  const favoritesEmpty = document.getElementById("favorites-empty");
  const categoryLinks = new Set([
    "data-aggregation.html",
    "report-builders.html",
    "video-analysis.html"
  ]);
  const renamedFavorites = new Map([
    ["200m Q Approach.html", { href: "Flying 200m Approach Analysis.html", title: "Flying 200m Approach Analysis" }],
    ["Qualifying 200m Approach Analysis.html", { href: "Flying 200m Approach Analysis.html", title: "Flying 200m Approach Analysis" }]
  ]);
  const titleCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  function getCardTitle(card) {
    return card.querySelector("h3")?.textContent.trim() || "";
  }

  function sortToolGrids() {
    document.querySelectorAll(".tool-grid:not(#favorites-grid)").forEach((grid) => {
      const cards = Array.from(grid.children).filter((child) => child.matches(".tool-card"));
      const pinned = cards.filter((card) => card.hasAttribute("data-sort-last"));
      const sorted = cards
        .filter((card) => !card.hasAttribute("data-sort-last"))
        .sort((left, right) => titleCollator.compare(getCardTitle(left), getCardTitle(right)));

      grid.append(...sorted, ...pinned);
    });
  }

  sortToolGrids();

  const favoriteCards = Array.from(
    document.querySelectorAll(".tool-grid .tool-card:not([data-no-favorite])")
  );
  let favorites = [];

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) {
      favorites = saved
        .map((item) => typeof item === "string" ? { href: item, title: item, description: "" } : item)
        .filter((item) => item && typeof item.href === "string")
        .map((item) => ({
          href: item.href,
          title: typeof item.title === "string" ? item.title : item.href,
          description: typeof item.description === "string" ? item.description : "",
          target: typeof item.target === "string" ? item.target : "",
          rel: typeof item.rel === "string" ? item.rel : ""
        }));
    }
  } catch {
    favorites = [];
  }

  favorites = favorites.map((favorite) => ({
    ...favorite,
    ...(renamedFavorites.get(favorite.href) || {})
  }));
  favorites = favorites.filter((favorite) => !categoryLinks.has(favorite.href));

  function getCardData(card) {
    return {
      href: card.getAttribute("href"),
      title: card.querySelector("h3")?.textContent.trim() || "Tool",
      description: card.querySelector("p")?.textContent.trim() || "",
      target: card.getAttribute("target") || "",
      rel: card.getAttribute("rel") || ""
    };
  }

  function saveFavorites() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch {
      // Keep the current selection for this page session if storage is unavailable.
    }
  }

  function makeFavoriteButton(data, wrapper) {
    const button = document.createElement("button");
    button.className = "favorite-toggle";
    button.type = "button";
    button.textContent = "";
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `Remove ${data.title} from favourites`);
    button.title = "Remove from favourites";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(data);
    });
    wrapper.append(button);
  }

  function toggleFavorite(data) {
    const index = favorites.findIndex((favorite) => favorite.href === data.href);
    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(data);
    }

    favorites.sort((left, right) => titleCollator.compare(left.title, right.title));
    saveFavorites();
    updateCatalogButtons();
    renderFavoritesPage();
  }

  function updateCatalogButtons() {
    favoriteCards.forEach((card) => {
      const wrapper = card.parentElement;
      const button = wrapper?.querySelector(".favorite-toggle");
      if (!button) return;

      const data = getCardData(card);
      const isFavorite = favorites.some((favorite) => favorite.href === data.href);
      button.setAttribute("aria-pressed", String(isFavorite));
      button.setAttribute(
        "aria-label",
        `${isFavorite ? "Remove" : "Add"} ${data.title} ${isFavorite ? "from" : "to"} favourites`
      );
      button.title = isFavorite ? "Remove from favourites" : "Add to favourites";
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(data);
      };
    });
  }

  function renderFavoritesPage() {
    if (!favoritesGrid || !favoritesEmpty) return;

    favoritesGrid.replaceChildren();
    favorites.forEach((data) => {
      const wrapper = document.createElement("div");
      const card = document.createElement("a");
      const content = document.createElement("div");
      const title = document.createElement("h3");
      const description = document.createElement("p");

      wrapper.className = "tool-card-item";
      card.className = "tool-card";
      card.href = data.href;
      if (data.target) card.target = data.target;
      if (data.rel) card.rel = data.rel;
      title.textContent = data.title;
      description.textContent = data.description;
      content.append(title, description);
      card.append(content);
      wrapper.append(card);
      makeFavoriteButton(data, wrapper);
      favoritesGrid.append(wrapper);
    });

    favoritesEmpty.hidden = favorites.length > 0;
  }

  favoriteCards.forEach((card) => {
    const wrapper = document.createElement("div");
    const button = document.createElement("button");

    wrapper.className = "tool-card-item";
    button.className = "favorite-toggle";
    button.type = "button";
    button.textContent = "";
    card.replaceWith(wrapper);
    wrapper.append(card, button);
  });

  const catalog = new Map(favoriteCards.map((card) => {
    const data = getCardData(card);
    return [data.href, data];
  }));
  favorites = favorites.map((favorite) => catalog.get(favorite.href) || favorite);
  favorites.sort((left, right) => titleCollator.compare(left.title, right.title));
  saveFavorites();

  updateCatalogButtons();
  renderFavoritesPage();
})();