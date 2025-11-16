document.addEventListener("DOMContentLoaded", () => {
  // Containers onde os cards serão inseridos
  const pedidosContainer = document.getElementById("lista-pedidos-container");
  const modsContainer = document.getElementById("lista-mods-container");

  // --- 1. FUNÇÕES DE RENDERIZAÇÃO (CRIAR OS CARDS) ---

  function criarCard(usuario, tipo) {
    let botoes = "";
    if (tipo === "pedido") {
      botoes = `
        <button class="btn-aceitar" data-id="${usuario.id}">Aceitar</button>
        <button class="btn-rejeitar" data-id="${usuario.id}">Rejeitar</button>
      `;
    } else if (tipo === "moderador") {
      botoes = `
        <button class="btn-rejeitar" data-id="${usuario.id}">Remover</button>
      `;
    }

    return `
      <div class="pedido-card" data-user-id="${usuario.id}">
        <div class="pedido-conteudo">
          <h3 class="pedido-titulo">${usuario.username}</h3>
          <p class="pedido-info"><strong>ID:</strong> <span>${usuario.id}</span></p>
          <p class="pedido-info"><strong>Email:</strong> <span>${usuario.email}</span></p>
        </div>
        <div class="pedido-acoes">
          ${botoes}
        </div>
      </div>
    `;
  }

  function renderizarListas(pedidos, moderadores) {
    // Limpa os containers
    pedidosContainer.innerHTML = "";
    modsContainer.innerHTML = "";

    // Renderiza Pedidos Pendentes
    if (!pedidos || pedidos.length === 0) {
      pedidosContainer.innerHTML = "<p>Nenhum pedido pendente.</p>";
    } else {
      pedidos.forEach(user => {
        pedidosContainer.innerHTML += criarCard(user, "pedido");
      });
    }

    // Renderiza Moderadores Atuais
    if (!moderadores || moderadores.length === 0) {
      modsContainer.innerHTML = "<p>Nenhum moderador cadastrado.</p>";
    } else {
      moderadores.forEach(user => {
        modsContainer.innerHTML += criarCard(user, "moderador");
      });
    }
  }

  // --- 2. FUNÇÕES DE AÇÃO (FETCH PARA O BACKEND) ---

  // Função para CARREGAR OS DADOS INICIAIS (GET)
  async function carregarDadosIniciais() {
    try {
      // (ROTA 2/6 do Python)
      const responsePedidos = await fetch('/admin/api/pedidos');
      if (!responsePedidos.ok) throw new Error('Falha ao buscar pedidos');
      const pedidos = await responsePedidos.json();

      // (ROTA 3/6 do Python)
      const responseMods = await fetch('/admin/api/moderadores');
      if (!responseMods.ok) throw new Error('Falha ao buscar moderadores');
      const moderadores = await responseMods.json();

      renderizarListas(pedidos, moderadores);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      pedidosContainer.innerHTML = `<p style="color: red;">Erro ao carregar pedidos: ${error.message}</p>`;
      modsContainer.innerHTML = `<p style="color: red;">Erro ao carregar moderadores: ${error.message}</p>`;
    }
  }

  // Aceitar Pedido (POST)
  async function aceitarPedido(id) {
    try {
      // (ROTA 4/6 do Python)
      const response = await fetch(`/admin/api/aceitar/${id}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Falha ao aceitar pedido');
      carregarDadosIniciais(); // Recarrega tudo
    } catch (error) {
      console.error(error);
      alert("Erro ao aceitar pedido.");
    }
  }

  // Rejeitar Pedido (POST)
  async function rejeitarPedido(id) {
    try {
      // (ROTA 5/6 do Python)
      const response = await fetch(`/admin/api/rejeitar/${id}`, {
        method: 'POST', 
      });
      if (!response.ok) throw new Error('Falha ao rejeitar pedido');
      carregarDadosIniciais(); // Recarrega tudo
    } catch (error) {
      console.error(error);
      alert("Erro ao rejeitar pedido.");
    }
  }

  // Remover Moderador (POST)
  async function removerModerador(id) {
    try {
      // (ROTA 6/6 do Python)
      const response = await fetch(`/admin/api/remover/${id}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Falha ao remover moderador');
      carregarDadosIniciais(); // Recarrega tudo
    } catch (error) {
      console.error(error);
      alert("Erro ao remover moderador.");
    }
  }

  // --- 3. EVENT LISTENERS (OUVINTES DE EVENTOS) ---

  pedidosContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-aceitar")) {
      aceitarPedido(parseInt(e.target.dataset.id));
    }
    if (e.target.classList.contains("btn-rejeitar")) {
      rejeitarPedido(parseInt(e.target.dataset.id));
    }
  });

  modsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-rejeitar")) {
      removerModerador(parseInt(e.target.dataset.id));
    }
  });

  // --- 4. INICIALIZAÇÃO ---
  carregarDadosIniciais();
});