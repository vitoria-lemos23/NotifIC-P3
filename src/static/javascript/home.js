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
// Define estado inicial de login a partir da variável server-driven `window.APP_USER`.
// Se o servidor injetou `window.APP_USER` no template, usamos isso como fonte de verdade.
let usuarioLogado = (typeof window !== 'undefined' && !!window.APP_USER) ? true : false;
let data = [];
let isAdmin = false; // Será determinado a partir do usuário autenticado

const adminBtn = document.getElementById("adminBtn");
const adminMenu = document.getElementById("adminMenu");

// Inicialmente oculta o botão admin; será mostrado quando soubermos o papel do usuário
if (adminBtn) adminBtn.style.display = 'none';

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
  window.location.href = "/admin/news/pending/view";
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

  // Seleciona itens marcados como hotNews (ou com tag DESTAQUE).
  const carouselItems = newsData
    .filter((item) => (item.hotNews === true || (item.tags || []).includes('DESTAQUE')))
    .slice(0, 5);

  carouselItems.forEach((item, index) => {
    // 1. Criar o Slide
    const slide = document.createElement("div");
    slide.className = "carousel-slide";

    if (index === 0) {
      slide.classList.add("active");
    }

    // Usa imagem_banner se disponível, senão img, senão placeholder
    const slideImage = item.imagem_banner || item.img || '/static/img/placeholder_banner.png';

    slide.innerHTML = `
        ${(() => {
          const target = (item.id !== undefined && item.id !== null)
            ? `/noticia?id=${encodeURIComponent(item.id)}`
            : (item.link || '#');
          const targetAttrs = (item.id !== undefined && item.id !== null) ? '' : ' target="_blank"';
          return `<a href="${target}"${targetAttrs} style="text-decoration: none;">`;
        })()}
        <img src="${slideImage}" alt="${item.title}" />
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
  // Try to fetch accepted news from backend API first
  try {
    const res = await fetch('/news?status=ACEITA&per_page=50');
    if (res.ok) {
      const payload = await res.json();
      const list = payload && Array.isArray(payload.news) ? payload.news : (payload || []);
      data = normalizeNewsData(list);
    } else {
      // fallback to static JSON if backend returns error
      console.warn('Backend /news returned', res.status, 'falling back to static JSON');
      const fresp = await fetch('/static/json/noticias.json');
      const raw = await fresp.json();
      data = normalizeNewsData(raw);
    }
  } catch (e) {
    console.warn('Failed to fetch backend news, using static JSON', e);
    try {
      const fresp = await fetch('/static/json/noticias.json');
      const raw = await fresp.json();
      data = normalizeNewsData(raw);
    } catch (ee) {
      console.error('Erro ao carregar notícias:', ee);
      feed.innerHTML = "<p>Erro ao carregar notícias.</p>";
      return;
    }
  }

  // render feed and initialize carousel
  render(currentTab, searchBar.value.toLowerCase());
  renderCarousel(data);
  initializeCarousel();
  renderFilterMenu();
}

// Normaliza os objetos do JSON para o shape esperado pelo front/back
function normalizeNewsData(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const tags = (item.tags || []).map((t) => String(t).toUpperCase());
    // map common synonyms to tag enum values if needed
    const normalizedTags = tags.map((t) => {
      if (t === 'VAGAS' || t === 'VAGA') return 'VAGA';
      if (t === 'EVENTO' || t === 'EVENTOS' || t === 'DESTAQUE') return 'EVENTO';
      if (t === 'PROJETO' || t === 'PROJETOS' || t === 'PESQUISA') return 'PROJETO';
      if (t === 'GERAL') return 'PROJETO';
      return t;
    });

    // normalize status to model values (ACEITA/PENDENTE/REJEITADA)
    let status = (item.status || '').toString().toUpperCase();
    if (status === 'PUBLICADO' || status === 'ABERTA' || status === 'ABERTO' || status === 'ACEITA') {
      status = 'ACEITA';
    } else if (status === 'FECHADA' || status === 'FECHADO' || status === 'REJEITADA') {
      status = 'REJEITADA';
    } else {
      status = 'PENDENTE';
    }

    // Normalizar campos de imagem: usar 'image' do backend como prioridade
    const imagePath = item.image || item.img || null;
    const bannerPath = item.imagem_banner || imagePath || null;

    return {
      id: item.id,
      title: item.title,
      content: item.content || item.desc || '',
      author_id: item.author_id || null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
      hotNews: item.hotNews === true || normalizedTags.includes('DESTAQUE') || false,
      start_date: item.start_date || null,
      end_date: item.end_date || null,
      status: status,
      tags: normalizedTags,
      link: item.link || null,
      img: normalizeImagePath(imagePath),
      imagem_banner: normalizeImagePath(bannerPath),
    };
  });
}


function normalizeImagePath(p) {
  if (!p) return null;
  // If it's already an absolute URL, return as-is
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  // Se já começa com /static/, retorna como está
  if (p.startsWith('/static/')) return p;
  // Se começa com /, adiciona /static
  if (p.startsWith('/')) return `/static${p}`;
  // Convert relative path like ../img/... or img/... to /static/img/...
  if (p.startsWith('../')) return p.replace(/^(\.\.\/)+/, '/static/');
  // Se não tem prefixo, assume que é relativo a /static/
  return `/static/${p}`;
}

// Utility: truncate a string to `n` chars and append ellipsis
function truncate(s, n = 150) {
  if (!s) return '';
  const str = String(s);
  return str.length > n ? str.slice(0, n).trim() + '…' : str;
}

let favoritos = [];
const headerUsername = document.getElementById('headerUsername');

// Função para atualizar o estado visual do login
function atualizarEstadoLogin() {
  if (!profileButton) return;
  const menuTitle = document.querySelector("#sideMenu .menu-title");

  if (usuarioLogado) {
    profileButton.classList.add("logged");
    profileButton.classList.remove("not-logged");
    if (menuTitle) menuTitle.textContent = "./notifIC";
    // determina se usuário é admin e mostra/esconde o botão de admin
    try {
      const userRole = (window.APP_USER && window.APP_USER.role) || null;
      const role = (userRole && String(userRole).toUpperCase()) || '';
      // Mostrar o botão admin para usuários com papel ADMIN ou variantes de moderador
      // Inclui 'ADMIN', 'MODERATOR', 'MOD', e a variante em português 'MODERADOR'
      const privileged = ['ADMIN', 'MODERATOR', 'MOD', 'MODERADOR'].includes(role);
      isAdmin = privileged; // tratamos moderadores como privilegiados para fins de UI
      if (adminBtn) adminBtn.style.display = privileged ? 'inline-block' : 'none';
    } catch (e) {
      console.error('Erro ao determinar papel do usuário:', e);
    }
    // mostra nome do usuário ao lado do ícone de perfil, se disponível
    try {
      const user = window.APP_USER || null;
      if (headerUsername) {
        if (user && (user.username || user.name)) {
          headerUsername.textContent = user.username || user.name;
          headerUsername.style.display = 'flex';
          headerUsername.style.alignItems = 'center';
          headerUsername.style.marginRight = '8px';
          headerUsername.style.color = '#fff';
          headerUsername.style.fontWeight = '600';
        } else {
          headerUsername.textContent = '';
          headerUsername.style.display = 'none';
        }
      }

      // Atualiza a foto do perfil no header se disponível
      if (user && user.profile_picture) {
        const profileImg = profileButton ? profileButton.querySelector('img') : null;
        if (profileImg) {
          profileImg.src = user.profile_picture;
        }
      }
    } catch (e) {
      console.error('Erro ao exibir nome do usuário:', e);
    }
  } else {
    profileButton.classList.remove("logged");
    profileButton.classList.add("not-logged");
    if (menuTitle) menuTitle.textContent = "Login";
    favoritos = [];
    render(currentTab, searchBar.value.toLowerCase());
    if (headerUsername) headerUsername.style.display = 'none';
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
      window.location.href = "/login";
    }
  });
}

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
async function verificarLogin() {
  // Se o servidor já injetou a variável window.APP_USER (render-time), usamos isso
  if (typeof window !== 'undefined' && window.APP_USER) {
    usuarioLogado = true;
    atualizarEstadoLogin();
    // garantir que, mesmo quando o servidor injetou o usuário no template,
    // carregamos os favoritos do servidor para sincronizar o estado
    await loadFavoritesFromServer();
    // sincroniza notificações do servidor
    try { if (window.notificationSystem && typeof window.notificationSystem.syncWithServer === 'function') window.notificationSystem.syncWithServer(); } catch(e) {}
    return;
  }

  // Caso contrário, tentamos perguntar ao servidor (cookie HttpOnly enviado via fetch)
  await fetchServerUser();
}


// Pergunta ao servidor se há um usuário autenticado (lê cookie HttpOnly no servidor)
async function fetchServerUser() {
  try {
    const res = await fetch('/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
      usuarioLogado = false;
      atualizarEstadoLogin();
      return null;
    }
    const user = await res.json();
    // Ajusta estado e disponibiliza para outros scripts
    window.APP_USER = user;
    usuarioLogado = true;
    atualizarEstadoLogin();
    // após confirmar usuário, carregamos favoritos do servidor
    await loadFavoritesFromServer();
    // sincroniza notificações do servidor
    try { if (window.notificationSystem && typeof window.notificationSystem.syncWithServer === 'function') window.notificationSystem.syncWithServer(); } catch(e) {}
    return user;
  } catch (err) {
    console.error('Erro ao verificar usuário no servidor:', err);
    usuarioLogado = false;
    atualizarEstadoLogin();
    return null;
  }
}


// Busca favoritos do servidor para o usuário autenticado
async function loadFavoritesFromServer() {
  try {
    const res = await fetch('/user/favorites', { credentials: 'same-origin' });
    if (!res.ok) {
      favoritos = [];
      localStorage.removeItem('favoriteNews');
      return [];
    }
    const body = await res.json();
    // body: { favorites: [newsObj,...] }
    favoritos = (body.favorites || []).map((n) => ({ id: n.id, title: n.title }));
    // store minimal info in localStorage as fallback for offline
    localStorage.setItem('favoriteNews', JSON.stringify(favoritos));
    return favoritos;
  } catch (err) {
    console.error('Erro ao carregar favoritos do servidor:', err);
    return [];
  }
}


// Toggle favorito no servidor (adiciona ou remove)
async function toggleFavoriteServer(news) {
  try {
    // send full news object as fallback so server can create DB record when necessary
    const payload = (typeof news === 'object') ? news : { news_id: news };
    const res = await fetch('/user/favorites', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('Falha ao alternar favorito', await res.text());
      return null;
    }
    const body = await res.json();
    const returnedNewsId = body.news_id;
    // atualiza lista local: se foi removido, filtra; se adicionado, adiciona
    if (res.status === 200) {
      // removed
      favoritos = favoritos.filter((f) => f.id !== returnedNewsId);
    } else if (res.status === 201) {
      // added
      // find news in data by id if present, otherwise use payload
      const newsItem = data.find((d) => d.id === returnedNewsId) || (typeof news === 'object' ? news : null);
      if (newsItem) favoritos.push({ id: returnedNewsId, title: newsItem.title || 'Sem título' });
      else favoritos.push({ id: returnedNewsId, title: 'Sem título' });
    }
    localStorage.setItem('favoriteNews', JSON.stringify(favoritos));
    return body;
  } catch (err) {
    console.error('Erro ao alternar favorito no servidor:', err);
    return null;
  }
}

// Renderizar o feed de notícias
function render(tab, query = "") {
  if (!feed) return;
  feed.innerHTML = "";
  let items;

  if (tab === "pessoal") {
    items = favoritos.map(f => data.find(d => String(d.id) === String(f.id)) || f);
  } else if (tab === "geral") {
    items = [...data];
  } else if (tab === "vagas") {
    items = data.filter((item) => (item.tags || []).includes("VAGA"));
  }

  if (query) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.content || '').toLowerCase().includes(query)
    );
  }

  if (activeTags.length) {
    items = items.filter(
      (item) => item.tags && activeTags.every((tag) => item.tags.includes(tag))
    );
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    const isFav = favoritos.some((f) => String(f.id) === String(item.id));

    let statusHTML = "";
    let timerHTML = "";

    if (item.tags && item.tags.includes("VAGA")) {
      if (item.status === "ACEITA") {
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

    // Usa img se disponível, senão placeholder
    const cardImage = item.img || '/static/img/placeholder_icon.png';

    card.innerHTML = `
      <span class="favorite ${isFav ? "active" : ""}">★</span>
      ${isAdmin ? `<div class="card-admin-actions">
          <button class="admin-edit-tags" title="Alterar tags">🏷️</button>
          <button class="admin-toggle-hot" title="Alternar destaque">✨</button>
          <button class="admin-set-pending" title="Voltar para pendente">⏪</button>
          <button class="admin-delete" title="Excluir notícia">🗑️</button>
        </div>` : ''}
      <img src="${cardImage}" alt="${item.title}">
      <div>
        <div class="card-header">
          <h3>${item.title} ${statusHTML} ${tagsHTML}</h3>
          ${timerHTML}
        </div>
        <p>${truncate(item.content, 150)}</p>
        ${(() => {
          if (item.id !== undefined && item.id !== null) {
            return `<a href="/noticia?id=${encodeURIComponent(item.id)}">Saiba mais...</a>`;
          }
          if (item.link) {
            const isAbsolute = item.link.startsWith('http://') || item.link.startsWith('https://');
            const attrs = isAbsolute ? ' target="_blank"' : '';
            return `<a href="${item.link}"${attrs}>Saiba mais...</a>`;
          }
          return `<span class="no-link">Saiba mais...</span>`;
        })()}
      </div>
    `;

    card.querySelector(".favorite").addEventListener("click", async () => {
      if (!usuarioLogado) {
        mostrarModalLogin();
        return;
      }
      const res = await toggleFavoriteServer(item.id);
      render(tab, searchBar.value.toLowerCase());
    });

    // Admin/moderator actions
    if (isAdmin && item.id !== undefined && item.id !== null) {
      const btnEditTags = card.querySelector('.admin-edit-tags');
      const btnToggleHot = card.querySelector('.admin-toggle-hot');
      const btnSetPending = card.querySelector('.admin-set-pending');
      const btnDelete = card.querySelector('.admin-delete');

      if (btnEditTags) btnEditTags.addEventListener('click', async (e) => {
        e.stopPropagation();
        const current = (item.tags || []).join(', ');
        const res = prompt('Informe as tags separadas por vírgula (PROJETO, EVENTO, VAGA)', current);
        if (res === null) return;
        const tags = res.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        try {
          const r = await fetch(`/admin/news/${item.id}/update-tags`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags })
          });
          if (!r.ok) throw new Error('Status ' + r.status);
          await loadNews();
        } catch (err) {
          alert('Falha ao atualizar tags: ' + err.message);
        }
      });

      if (btnToggleHot) btnToggleHot.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const r = await fetch(`/admin/news/${item.id}/set_hot`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hot: !item.hotNews })
          });
          if (!r.ok) throw new Error('Status ' + r.status);
          await loadNews();
        } catch (err) {
          alert('Falha ao alternar destaque: ' + err.message);
        }
      });

      if (btnSetPending) btnSetPending.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Deseja mover esta notícia para PENDENTE?')) return;
        try {
          const r = await fetch(`/admin/news/${item.id}/set_pending`, {
            method: 'POST',
            credentials: 'same-origin'
          });
          if (!r.ok) throw new Error('Status ' + r.status);
          await loadNews();
        } catch (err) {
          alert('Falha ao alterar status: ' + err.message);
        }
      });

      if (btnDelete) btnDelete.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Confirma exclusão desta notícia? Esta operação é irreversível.')) return;
        try {
          const r = await fetch(`/admin/news/${item.id}/delete`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (!r.ok) throw new Error('Status ' + r.status);
          await loadNews();
        } catch (err) {
          alert('Falha ao excluir notícia: ' + err.message);
        }
      });
    }

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

// Inicializar a aplicação: garantir que carregamos o estado de login/favoritos
// antes de buscar e renderizar as notícias, assim as estrelinhas já aparecem ativadas.
async function initApp() {
  // garante que o estado de login/favoritos é carregado primeiro
  await verificarLogin();
  // depois carrega notícias (render será chamado no final de loadNews)
  await loadNews();
}

// Inicializa
initApp();
