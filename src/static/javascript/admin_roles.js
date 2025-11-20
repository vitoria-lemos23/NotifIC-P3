document.addEventListener("DOMContentLoaded", () => {
  
  // --- 1. SELETORES DA SEÇÃO DE BUSCA ---
  const campoBusca = document.getElementById("campoBusca");
  const btnBuscar = document.getElementById("btnBuscar");
  const resultado = document.getElementById("resultadoUsuario");
  const infoId = document.getElementById("infoId");
  const infoUsername = document.getElementById("infoUsername");
  const infoEmail = document.getElementById("infoEmail");
  const infoStatus = document.getElementById("infoStatus");
  const acoesBusca = document.getElementById("acoesBusca");
  
  let usuarioEncontrado = null; // Guarda o usuário da busca

  // --- 2. SELETORES DA SEÇÃO DE LISTAS ---
  const adminContainer = document.getElementById("lista-admins-container");
  const modContainer = document.getElementById("lista-moderadores-container");

  // ===============================================
  // LÓGICA DA BUSCA (PARTE 1)
  // ===============================================

  async function buscarUsuario() {
    const termo = campoBusca.value.trim();
    if (!termo) {
      alert("⚠️ Digite um ID, username ou e-mail!");
      return;
    }
    try {
      // Rota do admin_panel.py
      const response = await fetch(`/admin/api/search-user?termo=${termo}`, {
        method: 'GET',
        credentials: 'include'
      });
      const usuario = await response.json();
      if (!response.ok) throw new Error(usuario.error || "Usuário não encontrado");
      
      usuarioEncontrado = usuario; 
      infoId.textContent = usuarioEncontrado.id;
      infoUsername.textContent = usuarioEncontrado.username;
      infoEmail.textContent = usuarioEncontrado.email;
      infoStatus.textContent = usuarioEncontrado.role; 
      resultado.classList.remove("oculto");
    } catch (error) {
      console.error(error);
      alert(`❌ ${error.message}`);
      resultado.classList.add("oculto");
    }
  }

  async function alterarCargo(novoCargo) {
    if (!usuarioEncontrado) {
      alert("Nenhum usuário selecionado.");
      return;
    }
    try {
      // Rota do admin_panel.py
      const response = await fetch('/admin/change-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: usuarioEncontrado.id,
          new_role: novoCargo
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro desconhecido");
      
      infoStatus.textContent = novoCargo; // Atualiza o status no card
      alert(`✅ ${data.message}`);
      
      // ATUALIZA AS LISTAS!
      // Depois de mudar o cargo, recarrega as listas de cargos
      carregarListas(); 
    } catch (error) {
      console.error(error);
      alert(`❌ Erro ao alterar cargo: ${error.message}`);
    }
  }

  // Event Listeners da Busca
  btnBuscar.addEventListener("click", buscarUsuario);
  campoBusca.addEventListener("keydown", e => {
    if (e.key === "Enter") buscarUsuario();
  });

  // Event Listeners dos botões de Ação da Busca
  acoesBusca.addEventListener("click", (e) => {
    if (e.target.tagName !== 'BUTTON') return;

    if (e.target.id === 'btnSetAdmin') alterarCargo('ADMIN');
    if (e.target.id === 'btnSetMod') alterarCargo('MODERADOR');
    if (e.target.id === 'btnSetUser') alterarCargo('USUARIO');
  });

  // ===============================================
  // LÓGICA DAS LISTAS (PARTE 2)
  // ===============================================

  // Função para criar o HTML de um card de lista (sem botões)
  function criarCardLista(usuario) {
    return `
      <div class="pedido-card" data-user-id="${usuario.id}">
        <div class="pedido-conteudo">
          <h3 class="pedido-titulo">${usuario.username}</h3>
          <p class="pedido-info"><strong>ID:</strong> <span>${usuario.id}</span></p>
          <p class="pedido-info"><strong>Email:</strong> <span>${usuario.email}</span></p>
        </div>
      </div>
    `;
  }

  // Função para preencher um container com cards
  async function popularLista(url, container) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
      
      const usuarios = await response.json();
      container.innerHTML = ""; // Limpa a mensagem "Carregando..."
      
      if (!usuarios || usuarios.length === 0) {
        container.innerHTML = "<p>Nenhum usuário nesta categoria.</p>";
        return;
      }
      
      usuarios.forEach(user => {
        container.innerHTML += criarCardLista(user);
      });
    } catch (error) {
      console.error(error);
      container.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  }

  // Função principal para carregar todas as listas
  function carregarListas() {
    popularLista('/admin/api/lista_admins', adminContainer);
    popularLista('/admin/api/lista_moderadores', modContainer);
  }

  // --- INICIALIZAÇÃO ---
  // Carrega as listas assim que a página abre
  carregarListas();
});