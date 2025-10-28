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
      let usuarioLogado = true;

      let data = [];

      let isAdmin = true; // simulação: mude para false para esconder o botão

      const adminBtn = document.getElementById("adminBtn");
      const adminMenu = document.getElementById("adminMenu");

      // Mostrar/ocultar botão admin
      if (isAdmin) {
        adminBtn.style.display = "inline-block";
      }

      // Menu de admin
      adminBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        // Fecha outros menus abertos
        filterMenu.classList.remove("active");

        // Alterna o menu admin
        adminMenu.classList.toggle("active");

        // Preenche o conteúdo do menu admin
        if (adminMenu.classList.contains("active")) {
          adminMenu.innerHTML = `
            <h3>Opções Admin</h3>
            <button onclick="mostrarModalLogin()">Tela de requerimento de Login</button>
            <button onclick="alternarEstadoLogin()">Alternar Login</button>
            <button onclick="mostrarPendentes()">Ver Pendentes</button>
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
        if (!adminMenu.contains(e.target) && e.target !== adminBtn) {
          adminMenu.classList.remove("active");
        }
        if (!filterMenu.contains(e.target) && e.target !== filterBtn) {
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
          `Estado de login alterado para: ${
            usuarioLogado ? "LOGADO" : "DESLOGADO"
          }`
        );
        atualizarEstadoLogin();
        fecharMenus();
      }

      function mostrarPendentes() {
        const modal = document.createElement("div");
        modal.className = "modal-backdrop";
        modal.innerHTML = `
        <div class="modal-content">
            <h3>Submissões Pendentes</h3>
            <p>Notícia 1 <button>Aceitar</button> <button>Rejeitar</button></p>
            <p>Notícia 2 <button>Aceitar</button> <button>Rejeitar</button></p>
            <button class="modal-button" onclick="document.body.removeChild(this.parentElement.parentElement)">Fechar</button>
        </div>
    `;
        document.body.appendChild(modal);
        fecharMenus();
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
  const carouselItems = newsData.filter(item => item.imagem_banner).slice(0, 5); 

  carouselItems.forEach((item, index) => {
    // 1. Criar o Slide
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    
    if (index === 0) {
      slide.classList.add("active");
    }

    //
    // ESTA É A PARTE QUE MUDOU PARA BATER COM O SEU CSS
    //
    slide.innerHTML = `
      <a href="${item.link}" target="_blank" style="text-decoration: none;">
        <img src="${item.imagem_banner}" alt="${item.title}" />
        
        <div class="carousel-gradient"></div> 
        
        <div class="carousel-text"> 
          
          <h2>${item.title}</h2> 
          
          <p>${item.desc}</p> 
        </div>
      </a>
    `;
    slidesWrapper.appendChild(slide);
    //
    // FIM DA PARTE QUE MUDOU
    //

    // 2. Criar o Dot (bolinha) - isso continua igual
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
 * DEVE ser chamada DEPOIS que renderCarousel() criar os slides.
 */
function initializeCarousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".carousel-dots button");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");

  if (slides.length === 0) return; // Se não houver slides, não faz nada

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
    async function loadNews() {
        try {
         const res = await fetch("../json/homeNews.json");
         data = await res.json();
         render(currentTab, searchBar.value.toLowerCase());
          
          // ✨ ADICIONE ESTAS DUAS LINHAS: ✨
          renderCarousel(data); 
          initializeCarousel(); 

        } catch (e) {
         feed.innerHTML = "<p>Erro ao carregar notícias.</p>";
          console.error("Erro ao carregar notícias:", e); // 👈 É bom adicionar isso
  }
         renderFilterMenu(); // Deixe esta linha aqui fora, como já estava
}
      

      let favoritos = [];

      function atualizarEstadoLogin() {
        const profileButton = document.getElementById("profileButton");
        const menuTitle = document.querySelector("#sideMenu .menu-title");

        console.log("Atualizando estado de login:", usuarioLogado);
        console.log("Elemento profileButton:", profileButton);

        if (usuarioLogado) {
          // Usuário logado - mostra avatar circular com borda esférica
          profileButton.classList.add("logged");
          profileButton.classList.remove("not-logged");
          menuTitle.textContent = "./notifIC";
          console.log("Classe added: logged");
        } else {
          // Usuário não logado - mostra ícone com borda quadrada
          profileButton.classList.remove("logged");
          profileButton.classList.add("not-logged");
          menuTitle.textContent = "Login";
          favoritos = [];
          render(currentTab, searchBar.value.toLowerCase());
          console.log("Classe added: not-logged");
        }

        // Debug: verificar quais elementos estão visíveis
        const img = profileButton.querySelector("img");
        const icon = profileButton.querySelector(".profile-icon");
        console.log("Imagem display:", window.getComputedStyle(img).display);
        console.log("Ícone display:", window.getComputedStyle(icon).display);
      }

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

        modal
          .querySelector("#fecharModal")
          .addEventListener("click", function () {
            document.body.removeChild(modal);
          });
      }

      profileButton.addEventListener("click", () => {
        if (usuarioLogado) {
          // Se estiver logado, abre o menu lateral
          sideMenu.classList.add("active");
          sideMenuBackdrop.classList.add("active");
        } else {
          // Se não estiver logado, redireciona para a página de login
          window.location.href = "login.html"; // Altere para o caminho correto da sua página de login
        }
      });

      filterBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Impede que o evento se propague

        // Fecha o menu admin se estiver aberto
        adminMenu.classList.remove("active");

        // Abre o menu de filtro
        renderFilterMenu();
        filterMenu.classList.toggle("active");
      });

      // Gerar lista de tags únicas
      function getAllTags() {
        const allTags = new Set();
        data.forEach((item) => item.tags?.forEach((t) => allTags.add(t)));
        return [...allTags];
      }

      function renderFilterMenu() {
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

      function verificarLogin() {
        // Simulação - na implementação real, isso verifica se há um token de sesão
        usuarioLogado = Math.random() > 0.5;
        atualizarEstadoLogin();
      }

      // Ajustar o render
      function render(tab, query = "") {
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
            (item) =>
              item.tags && activeTags.every((tag) => item.tags.includes(tag))
          );
        }

        items.forEach((item) => {
          const card = document.createElement("div");
          card.className = "card";

          const isFav = favoritos.some((f) => f.title === item.title);

          let statusHTML = "";
          let timerHTML = "";

          if (item.tags.includes("vagas")) {
            if (item.status === "aberta") {
              statusHTML = `<span class="status aberta">ABERTA</span>`;
              timerHTML = `<div class="timer" data-deadline="${item.deadline}"></div>`;
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
    <p>${item.desc}</p>
    <a href="${item.link}">Saiba mais...</a>
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

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          document.querySelector(".tab.active").classList.remove("active");
          tab.classList.add("active");
          currentTab = tab.dataset.tab;
          render(currentTab, searchBar.value.toLowerCase());
        });
      });

      searchBar.addEventListener("input", () => {
        render(currentTab, searchBar.value.toLowerCase());
      });

      function toggleMenu() {
        sideMenu.classList.toggle("active");
        sideMenuBackdrop.classList.toggle("active");

        // Impede a rolagem do corpo quando o menu está aberto
        document.body.style.overflow = sideMenu.classList.contains("active")
          ? "hidden"
          : "";
      }

      

      // Inicializar
      loadNews();
      verificarLogin();