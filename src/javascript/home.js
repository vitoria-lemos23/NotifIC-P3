// Seletores de elementos
const tabs = document.querySelectorAll(".tab");
const feed = document.getElementById("feed");
const searchBar = document.getElementById("searchBar");
const profileButton = document.getElementById("profileButton");
const filterBtn = document.getElementById("filterBtn");
const filterMenu = document.getElementById("filterMenu");
const sideMenu = document.getElementById("sideMenu");
const sideMenuBackdrop = document.getElementById("sideMenuBackdrop");

let activeTags = [];
let currentTab = "geral";
let usuarioLogado = false;
let data = [];
let isAdmin = true; // Simulação

const adminBtn = document.getElementById("adminBtn");
const adminMenu = document.getElementById("adminMenu");

// Mostrar/ocultar botão admin
if (isAdmin) {
  adminBtn.style.display = "inline-block";
}

// Menu de admin
adminBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  filterMenu.classList.remove("active");
  adminMenu.classList.toggle("active");

  if (adminMenu.classList.contains("active")) {
    adminMenu.innerHTML = `
        <h3>Opções Admin</h3>
        <button onclick="mostrarModalLogin()">Tela de requerimento de Login</button>
        <button onclick="alternarEstadoLogin()">Alternar Login</button>
        <button onclick="Painel()">Tela do Administrador</button>
        <button onclick="fecharMenus()">Fechar</button>
    `;
    // Posiciona o menu próximo ao botão admin
    const adminBtnRect = adminBtn.getBoundingClientRect();
    adminMenu.style.top = `${adminBtnRect.bottom + window.scrollY}px`;
    adminMenu.style.right = `${window.innerWidth - adminBtnRect.right}px`;
  }
});

// Fechar menus ao clicar fora
document.addEventListener("click", (e) => {
  if (adminMenu && !adminMenu.contains(e.target) && e.target !== adminBtn) {
    adminMenu.classList.remove("active");
  }
  if (filterMenu && !filterMenu.contains(e.target) && e.target !== filterBtn) {
    filterMenu.classList.remove("active");
  }
});

// Função para fechar todos os menus
function fecharMenus() {
  adminMenu.classList.remove("active");
  filterMenu.classList.remove("active");
}

// Função para alternar estado de login
function alternarEstadoLogin() {
  usuarioLogado = !usuarioLogado;
  atualizarEstadoLogin();
  alert(
    `Estado de login alterado para: ${usuarioLogado ? "LOGADO" : "DESLOGADO"}`
  );
  atualizarEstadoLogin();
  fecharMenus();
}

// Função para ir ao Painel de Pendentes
function Painel() {
  // ATENÇÃO: Verifique se o nome do arquivo é "pedidos.html" ou "pedidos_pendentes.html"
  window.location.href = "/admin/news/pending"
}

/**
 * Cria os slides e dots do carrossel com base nos dados das notícias.
 * @param {Array} newsData - O array de notícias vindo do JSON.
 */
function renderCarousel(newsData) {
  const slidesWrapper = document.querySelector(".carousel-slides-wrapper");
  const dotsWrapper = document.querySelector(".carousel-dots");

  if (!slidesWrapper || !dotsWrapper) {
    console.error("Elementos do carrossel não encontrados!");
    return;
  }

  slidesWrapper.innerHTML = "";
  dotsWrapper.innerHTML = "";

  // Filtra apenas os itens que TÊM uma imagem_banner e pega os 5 primeiros
  const carouselItems = newsData
    .filter((item) => item.imagem_banner && item.tags.includes("destaque"))
    .slice(0, 5);

  carouselItems.forEach((item, index) => {
    // 1. Criar o Slide
    const slide = document.createElement("div");
    slide.className = "carousel-slide";

    if (index === 0) {
      slide.classList.add("active");
    }

    slide.innerHTML = `
      <a href="${item.link}" target="_blank" style="text-decoration: none;">
        <img src="${item.imagem_banner}" alt="${item.title}" />
        <div class="carousel-gradient"></div> 
        <div class="carousel-text"> 
          <h2>${item.title}</h2> 
          <p>${item.content}</p> 
        </div>
      </a>
    `;
    slidesWrapper.appendChild(slide);

    // 2. Criar o Dot (bolinha)
    const dot = document.createElement("button");
    dot.dataset.slide = index;

    if (index === 0) {
      dot.classList.add("active");
    }
    dotsWrapper.appendChild(dot);
  });
}

/**
 * Inicializa toda a lógica de navegação e timer do carrossel.
 */
function initializeCarousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".carousel-dots button");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");

  if (slides.length === 0 || !prevBtn || !nextBtn) return; // Se não houver slides, não faz nada

  let currentSlide = 0;
  const numSlides = slides.length;
  let autoSlideTimer;

  function goToSlide(slideIndex) {
    slides.forEach((slide) => slide.classList.remove("active"));
    dots.forEach((dot) => dot.classList.remove("active"));

    currentSlide = (slideIndex + numSlides) % numSlides;

    slides[currentSlide].classList.add("active");
    dots[currentSlide].classList.add("active");
  }

  function goToNext() {
    goToSlide(currentSlide + 1);
  }

  function goToPrev() {
    goToSlide(currentSlide - 1);
  }

  function startAutoSlide() {
    clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(goToNext, 5000);
  }

  function stopAutoSlide() {
    clearInterval(autoSlideTimer);
  }

  prevBtn.addEventListener("click", () => {
    goToPrev();
    stopAutoSlide();
    startAutoSlide();
  });

  nextBtn.addEventListener("click", () => {
    goToNext();
    stopAutoSlide();
    startAutoSlide();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const slideIndex = parseInt(dot.dataset.slide);
      goToSlide(slideIndex);
      stopAutoSlide();
      startAutoSlide();
    });
  });

  startAutoSlide();
}

// Função para carregar as notícias
async function loadNews() {
  try {
    const res = await fetch("../json/noticias.json");
    data = await res.json();
    render(currentTab, searchBar.value.toLowerCase());

    // Inicializa o carrossel com os dados
    renderCarousel(data);
    initializeCarousel();
  } catch (e) {
    feed.innerHTML = "<p>Erro ao carregar notícias.</p>";
    console.error("Erro ao carregar notícias:", e);
  }
  renderFilterMenu();
}

let favoritos = [];

// Função para atualizar o estado visual do login
function atualizarEstadoLogin() {
  if (!profileButton) return;
  const menuTitle = document.querySelector("#sideMenu .menu-title");
  const notificationsButton = document.getElementById("notificationsButton");

  if (usuarioLogado) {
    profileButton.classList.add("logged");
    profileButton.classList.remove("not-logged");
    if (menuTitle) menuTitle.textContent = "./notifIC";
    if (notificationsButton) notificationsButton.style.display = "block";
  } else {
    profileButton.classList.remove("logged");
    profileButton.classList.add("not-logged");
    if (menuTitle) menuTitle.textContent = "Login";
    if (notificationsButton) notificationsButton.style.display = "none";
    favoritos = [];
    render(currentTab, searchBar.value.toLowerCase());
  }
}

// Função para mostrar o modal de "Login Necessário"
function mostrarModalLogin() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";

  modal.innerHTML = `
      <div class="modal-content">
          <h3>Login Necessário</h3>
          <p>Você deve fazer login antes de favoritar conteúdos.</p>
          <button class="modal-button" id="fecharModal">Entendi</button>
      </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#fecharModal").addEventListener("click", function () {
    document.body.removeChild(modal);
  });
}

// Evento de clique no botão de perfil
if (profileButton) {
  profileButton.addEventListener("click", () => {
    if (usuarioLogado) {
      sideMenu.classList.add("active");
      sideMenuBackdrop.classList.add("active");
    } else {
      window.location.href = "login.html";
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const token = getCookie("access_token");

  if (token) {
    const notification = new Notification(token);
    notification.init();
  }
});

class Notification {
  constructor(token) {
    this.token = token;
    this.notifications = [];
    this.notificationButton = document.getElementById("notificationsButton");
    this.notificationBadge = document.getElementById("notificationBadge");
    this.notificationDropdown = document.getElementById("notificationsDropdown");
    this.notificationList = document.getElementById("notificationsList");
    this.markAllReadButton = document.getElementById("markAllRead");
    this.clearAllButton = document.getElementById("clearAllNotifications");
    this.userRole = USER_ROLE;
  }

  init() {
    this.fetchNotifications();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.notificationButton.addEventListener("click", () => {
      this.notificationDropdown.classList.toggle("active");
    });

    this.markAllReadButton.addEventListener("click", () => {
      this.markAllAsRead();
    });

    this.clearAllButton.addEventListener("click", () => {
      this.clearAllNotifications();
    });
  }

  async fetchNotifications() {
    try {
      const response = await fetch("/notifications", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.notifications = data.notifications;
        this.renderNotifications();
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }

  renderNotifications() {
    this.notificationList.innerHTML = "";
    let unreadCount = 0;

    if (this.notifications.length === 0) {
      this.notificationList.innerHTML = "<li>Nenhuma notificação</li>";
    } else {
      this.notifications.forEach((notification) => {
        const listItem = document.createElement("li");
        listItem.textContent = notification.message;
        listItem.classList.add(notification.viewed ? "read" : "unread");

        if (!notification.viewed) {
          unreadCount++;
        }

        listItem.addEventListener("click", () => {
          this.handleNotificationClick(notification);
        });

        this.notificationList.appendChild(listItem);
      });
    }

    this.notificationBadge.textContent = unreadCount;
  }

  async handleNotificationClick(notification) {
    try {
      await fetch(`/notifications/${notification.id}/viewed`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (
        this.userRole === "ADMIN" &&
        notification.message.includes("Nova solicitação de notícia")
      ) {
        window.location.href = "/admin/news/pending";
      } else if (
        notification.message.includes("Nova solicitação de notícia") ||
        notification.message.includes("Sua notícia foi aprovada")
      ) {
        window.location.href = `/noticia?id=${notification.news_id}`;
      } else {
        this.fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async markAllAsRead() {
    try {
      await fetch("/notifications/mark-all-viewed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      this.fetchNotifications();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  async clearAllNotifications() {
    // This functionality is not implemented in the backend yet.
    // For now, we'll just clear the notifications from the UI.
    this.notifications = [];
    this.renderNotifications();
  }
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

// Gerar lista de tags únicas
function getAllTags() {
  const allTags = new Set();
  data.forEach((item) => item.tags?.forEach((t) => allTags.add(t)));
  return [...allTags];
}

// Renderizar o menu de filtro
function renderFilterMenu() {
  if (!filterMenu) return;
  filterMenu.innerHTML = getAllTags()
    .map(
      (tag) => `
  <span class="filter-tag ${
    activeTags.includes(tag) ? "active" : ""
  }" data-tag="${tag}">
    ${tag}
  </span>
`
    )
    .join("");

  filterMenu.querySelectorAll(".filter-tag").forEach((el) => {
    el.addEventListener("click", () => {
      const tag = el.dataset.tag;
      if (activeTags.includes(tag)) {
        activeTags = activeTags.filter((t) => t !== tag);
        el.classList.remove("active");
      } else {
        activeTags.push(tag);
        el.classList.add("active");
      }
      render(currentTab, searchBar.value.toLowerCase());
    });
  });
}

// Simular verificação de login
async function checkLoginStatus() {
  try {
    const response = await fetch('/status');
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        usuarioLogado = true;
      } else {
        usuarioLogado = false;
      }
    } else {
      usuarioLogado = false;
    }
  } catch (error) {
    usuarioLogado = false;
  }
  atualizarEstadoLogin();
}

// Renderizar o feed de notícias
function render(tab, query = "") {
  if (!feed) return; // Sai se o feed não existir
  feed.innerHTML = "";
  let items;

  if (tab === "pessoal") {
    items = [...favoritos];
  } else if (tab === "geral") {
    items = [...data];
  } else if (tab === "vagas") {
    items = data.filter((item) => item.tags.includes("vagas"));
  }

  // filtro por busca
  if (query) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
    );
  }

  // filtro por tags
  if (activeTags.length) {
    items = items.filter(
      (item) => item.tags && activeTags.every((tag) => item.tags.includes(tag))
    );
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    const isFav = favoritos.some((f) => f.title === item.title);

    let statusHTML = "";
    let timerHTML = "";

    if (item.tags && item.tags.includes("vagas")) {
      if (item.status === "aberta") {
        statusHTML = `<span class="status aberta">ABERTA</span>`;
        timerHTML = `<div class="timer" data-deadline="${item.end_date}"></div>`;
      } else {
        statusHTML = `<span class="status fechada">FECHADA</span>`;
      }
    }

    let tagsHTML = "";
    if (item.tags && item.tags.length) {
      tagsHTML = `<div class="tags">${item.tags
        .map((tag) => `<span class="tag">${tag}</span>`)
        .join(" ")}</div>`;
    }

    card.innerHTML = `
      <span class="favorite ${isFav ? "active" : ""}">★</span>
      <img src="${item.img}" alt="">
      <div>
        <div class="card-header">
          <h3>${item.title} ${statusHTML} ${tagsHTML}</h3>
          ${timerHTML}
        </div>
        <p>${item.content}</p> <a href="${item.link}">Saiba mais...</a>
      </div>
    `;

    card.querySelector(".favorite").addEventListener("click", () => {
      if (!usuarioLogado) {
        mostrarModalLogin();
        return;
      }

      if (isFav) {
        favoritos = favoritos.filter((f) => f.title !== item.title);
      } else {
        favoritos.push(item);
      }
      render(tab, searchBar.value.toLowerCase());
    });

    feed.appendChild(card);
  });

  document.querySelectorAll(".timer").forEach((el) => {
    const deadline = new Date(el.dataset.deadline);
    function updateTimer() {
      const diff = deadline - new Date();
      if (diff <= 0) {
        el.innerHTML = "Expirado";
        return;
      }
      const h = Math.floor(diff / 1000 / 3600);
      const m = Math.floor(((diff / 1000) % 3600) / 60);
      const s = Math.floor((diff / 1000) % 60);
      el.innerHTML = `Encerra em: ${h}h ${m}m ${s}s`;
    }
    updateTimer();
    setInterval(updateTimer, 1000);
  });
}

// Eventos das abas
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector(".tab.active").classList.remove("active");
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    render(currentTab, searchBar.value.toLowerCase());
  });
});

// Evento da barra de pesquisa
if (searchBar) {
  searchBar.addEventListener("input", () => {
    render(currentTab, searchBar.value.toLowerCase());
  });
}

// Função para abrir/fechar menu lateral
function toggleMenu() {
  if (!sideMenu || !sideMenuBackdrop) return;
  sideMenu.classList.toggle("active");
  sideMenuBackdrop.classList.toggle("active");
  document.body.style.overflow = sideMenu.classList.contains("active")
    ? "hidden"
    : "";
}

// Inicializar
loadNews();
checkLoginStatus();
