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
  window.location.href = "pedidos_pendentes.html";
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

  if (usuarioLogado) {
    profileButton.classList.add("logged");
    profileButton.classList.remove("not-logged");
    if (menuTitle) menuTitle.textContent = "./notifIC";
  } else {
    profileButton.classList.remove("logged");
    profileButton.classList.add("not-logged");
    if (menuTitle) menuTitle.textContent = "Login";
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

// Sistema de Notificações
class NotificationSystem {
  constructor() {
    this.notifications =
      JSON.parse(localStorage.getItem("userNotifications")) || [];
    this.init();
  }

  init() {
    this.renderNotifications();
    this.setupEventListeners();
    this.checkForNewNotifications();
  }

  // Adicione esta função à classe NotificationSystem
  clearAllNotifications() {
    if (this.notifications.length === 0) {
      return; // Não faz nada se não houver notificações
    }

    this.notifications = [];
    this.saveToLocalStorage();
    this.renderNotifications();
    this.updateBadge();

    // Opcional: Mostrar feedback visual
    this.showClearFeedback();
  }

  // Método auxiliar para mostrar feedback (opcional)
  showClearFeedback() {
    // Cria um toast/feedback temporário
    const toast = document.createElement("div");
    toast.textContent = "Todas as notificações foram removidas";
    toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10000;
    animation: fadeInOut 3s ease-in-out;
  `;

    document.body.appendChild(toast);

    // Remove o toast após 3 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  setupEventListeners() {
    // Toggle dropdown
    document
      .getElementById("notificationsButton")
      .addEventListener("click", (e) => {
        e.stopPropagation();

        // Verifica se o usuário está logado
        if (!usuarioLogado) {
          window.location.href = "login.html";
          return;
        }

        this.toggleDropdown();
      });

    // Marcar todas notificações como lidas
    document.getElementById("markAllRead").addEventListener("click", () => {
      this.markAllAsRead();
    });

    document.getElementById("markAllRead").addEventListener("click", () => {
      this.markAllAsRead();
    });

    // Limpar todas as notificações (NOVO)
    document
      .getElementById("clearAllNotifications")
      .addEventListener("click", () => {
        this.clearAllNotifications();
      });

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", () => {
      this.closeDropdown();
    });

    // Prevenir fechamento ao clicar dentro do dropdown
    document
      .getElementById("notificationsDropdown")
      .addEventListener("click", (e) => {
        e.stopPropagation();
      });
  }

  toggleDropdown() {
    const dropdown = document.getElementById("notificationsDropdown");
    dropdown.classList.toggle("active");

    if (dropdown.classList.contains("active")) {
      this.markAllAsRead();
    }
  }

  closeDropdown() {
    document.getElementById("notificationsDropdown").classList.remove("active");
  }

  addNotification(notification) {
    const newNotification = {
      id: Date.now(),
      notification_id: notification.notification_id || null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      newsId: notification.newsId,
      sent_at: notification.sent_at || null,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.saveToLocalStorage();
    this.renderNotifications();
    this.updateBadge();
  }

  markAsRead(notificationId) {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (notification && !notification.read) {
      notification.read = true;
      this.saveToLocalStorage();
      this.renderNotifications();
      this.updateBadge();
    }
  }

  markAllAsRead() {
    let updated = false;
    this.notifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        updated = true;
      }
    });

    if (updated) {
      this.saveToLocalStorage();
      this.renderNotifications();
      this.updateBadge();
    }
  }

  getNotificationIcon(type) {
    const icons = {
      update: "🔄",
      reminder: "⏰",
      expiry: "⚠️",
      favorite: "⭐",
    };
    return `<span class="notification-icon">${icons[type]}</span>`;
  }

  formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  }

  renderNotifications() {
    const container = document.getElementById("notificationsList");
    const badge = document.getElementById("notificationBadge");

    const unreadCount = this.notifications.filter((n) => !n.read).length;
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="notification-item read">
          <div class="notification-content" style="text-align: center;">
            <div class="notification-message">Nenhuma notificação</div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications
      .map(
        (notification) => `
      <div class="notification-item ${notification.read ? "read" : "unread"}" 
           onclick="notificationSystem.markAsRead(${notification.id})">
        ${this.getNotificationIcon(notification.type)}
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message}</div>
          <div class="notification-time">${this.formatTime(
            notification.timestamp
          )}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  updateBadge() {
    const unreadCount = this.notifications.filter((n) => !n.read).length;
    const badge = document.getElementById("notificationBadge");
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();

    // Adicionar animação quando há novas notificações
    if (unreadCount > 0) {
      badge.style.animation = "pulse 2s infinite";
    } else {
      badge.style.animation = "none";
    }
  }

  saveToLocalStorage() {
    localStorage.setItem(
      "userNotifications",
      JSON.stringify(this.notifications)
    );
  }

  checkForNewNotifications() {
    // Simular notificações baseadas em notícias favoritadas
    const favoriteNews = JSON.parse(localStorage.getItem("favoriteNews")) || [];

    favoriteNews.forEach((news) => {
      // Simular atualizações ocasionais
      if (
        Math.random() < 0.3 &&
        !this.notifications.some((n) => n.newsId === news.id)
      ) {
        this.addNotification({
          type: "update",
          title: "Atualização na notícia",
          message: `"${news.title}" recebeu uma atualização`,
          newsId: news.id,
        });
      }
    });
  }

  // Método para simular notificações (para teste)
  simulateNotification() {
    const types = ["update", "reminder", "expiry", "favorite"];
    const messages = [
      "Nova oportunidade disponível na sua área",
      "Lembrete: Prazo se aproximando",
      "Atualização importante na vaga que você favoritou",
      "Novo conteúdo adicionado",
      "A sua notícia favorita está quase expirando",
    ];

    this.addNotification({
      type: types[Math.floor(Math.random() * types.length)],
      title: "Nova notificação",
      message: messages[Math.floor(Math.random() * messages.length)],
      newsId: Date.now(),
    });
  }
}

// Inicializar o sistema de notificações
const notificationSystem = new NotificationSystem();

// Adicionar CSS para animação do badge
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

// Para testar: adicionar uma notificação a cada 30 segundos (remover em produção)
setInterval(() => notificationSystem.simulateNotification(), 10000);

// Evento de clique no botão de filtro
if (filterBtn) {
  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    adminMenu.classList.remove("active");
    renderFilterMenu();
    filterMenu.classList.toggle("active");
  });
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
function verificarLogin() {
  //usuarioLogado = Math.random() > 0.5;
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
verificarLogin();
