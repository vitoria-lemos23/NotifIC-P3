document.addEventListener("DOMContentLoaded", () => {
  const campoBusca = document.getElementById("campoBusca");
  const btnBuscar = document.getElementById("btnBuscar");
  const resultado = document.getElementById("resultadoUsuario");

  const infoId = document.getElementById("infoId");
  const infoUsername = document.getElementById("infoUsername");
  const infoEmail = document.getElementById("infoEmail");
  const infoStatus = document.getElementById("infoStatus");

  const btnBanir = document.getElementById("btnBanir");
  const btnMembro = document.getElementById("btnMembro");
  const btnExcluir = document.getElementById("btnExcluir");

// Em static/javascript/admin.js

  // ... (o topo do arquivo, com as variáveis) ...
  let usuarioEncontrado = null; // Para guardar o usuário atual

  async function buscarUsuario() {
    const termo = campoBusca.value.trim(); // Não precisa de toLowerCase() aqui
    if (!termo) {
      alert("⚠️ Digite um ID, username ou e-mail!");
      return;
    }

    try {
      // --- ESTA É A MUDANÇA ---
      // Substituímos a simulação por um fetch real
      
      // (ROTA NOVA DO PYTHON)
      const response = await fetch(`/admin/api/search-user?termo=${termo}`, {
          method: 'GET',
          credentials: 'include' // Para enviar o cookie de login
      });

      const usuario = await response.json();

      if (!response.ok) {
        // Se o backend retornou um erro (ex: 404), ele virá no 'usuario.error'
        throw new Error(usuario.error || "Usuário não encontrado");
      }
      
      // Se deu certo, guarda o usuário e preenche a tela
      usuarioEncontrado = usuario; 

      infoId.textContent = usuarioEncontrado.id;
      infoUsername.textContent = usuarioEncontrado.username;
      infoEmail.textContent = usuarioEncontrado.email;
      // No seu userModel, o 'role' vem como "USUARIO", "MODERADOR", etc.
      infoStatus.textContent = usuarioEncontrado.role; 

      resultado.classList.remove("oculto");

    } catch (error) {
      console.error(error);
      alert(`❌ ${error.message}`);
      resultado.classList.add("oculto"); // Esconde o resultado se deu erro
    }
  }

  // --- FUNÇÃO DE ALTERAR CARGO (JÁ CORRIGIDA ANTES) ---
  
  async function alterarCargo(novoCargo) {
    if (!usuarioEncontrado) {
      alert("Nenhum usuário selecionado.");
      return;
    }

    try {
      // (ROTA ANTIGA DO PYTHON)
      const response = await fetch('/admin/change-role', {
        method: 'POST',
        credentials: 'include', // <-- IMPORTANTE ADICIONAR AQUI TAMBÉM
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: usuarioEncontrado.id,
          new_role: novoCargo // Ex: "PENDENTE_MOD"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro desconhecido");
      }

      // Se der certo, atualiza o status na tela
      infoStatus.textContent = novoCargo;
      alert(`✅ ${data.message}`);

    } catch (error) {
      console.error(error);
      alert(`❌ Erro ao alterar cargo: ${error.message}`);
    }
  }

  // ... (Resto do arquivo com os event listeners) ...

  function alterarStatus(status) {
    infoStatus.textContent = status;
    alert(`✅ Status do usuário alterado para: ${status}`);
  }

  btnBuscar.addEventListener("click", buscarUsuario);
  campoBusca.addEventListener("keydown", e => {
    if (e.key === "Enter") buscarUsuario();
  });
});
