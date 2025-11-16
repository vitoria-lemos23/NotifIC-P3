// static/javascript/admin.js (O ARQUIVO ORIGINAL, AGORA CORRIGIDO)

document.addEventListener("DOMContentLoaded", () => {
  const campoBusca = document.getElementById("campoBusca");
  const btnBuscar = document.getElementById("btnBuscar");
  const resultado = document.getElementById("resultadoUsuario");

  const infoId = document.getElementById("infoId");
  const infoUsername = document.getElementById("infoUsername");
  const infoEmail = document.getElementById("infoEmail");
  const infoStatus = document.getElementById("infoStatus");

  const btnBanir = document.getElementById("btnBanir"); // (Não implementamos a rota disto)
  const btnMembro = document.getElementById("btnMembro");
  const btnExcluir = document.getElementById("btnExcluir"); // (Não implementamos a rota disto)

  let usuarioEncontrado = null; // Para guardar o usuário atual

  async function buscarUsuario() {
    const termo = campoBusca.value.trim().toLowerCase();
    if (!termo) {
      alert("⚠️ Digite um ID, username ou e-mail!");
      return;
    }

    try {
      // --- LÓGICA DE BUSCA ---
      // (O seu JSON estático não vai funcionar para buscar. 
      // Você precisará de uma rota no backend para "buscar" um usuário)
      // Por enquanto, vamos simular que encontramos o usuário para
      // poder testar a mudança de cargo.

      // --- SIMULAÇÃO ---
      // (Substitua isso por uma rota de busca real: ex: /admin/api/buscar_usuario?termo=...)
      
      // Vamos fingir que encontramos um usuário
      usuarioEncontrado = {
          id: 123,
          username: "usuario_teste",
          email: "teste@email.com",
          role: "USUARIO"
      };
      // --- FIM DA SIMULAÇÃO ---

      if (!usuarioEncontrado) {
        alert("❌ Usuário não encontrado!");
        resultado.classList.add("oculto");
        return;
      }

      // Preenche os dados na tela
      infoId.textContent = usuarioEncontrado.id;
      infoUsername.textContent = usuarioEncontrado.username;
      infoEmail.textContent = usuarioEncontrado.email;
      infoStatus.textContent = usuarioEncontrado.role;

      resultado.classList.remove("oculto");

    } catch (error) {
      console.error(error);
      alert("Erro ao buscar usuário.");
    }
  }

  // --- A MUDANÇA MAIS IMPORTANTE ESTÁ AQUI ---
  
  async function alterarCargo(novoCargo) {
    if (!usuarioEncontrado) {
      alert("Nenhum usuário selecionado.");
      return;
    }

    try {
      // Esta é a rota que já existe no seu admin_panel.py
      const response = await fetch('/admin/change-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: usuarioEncontrado.id,
          new_role: novoCargo
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


  // --- Event Listeners ---

  btnBuscar.addEventListener("click", buscarUsuario);
  campoBusca.addEventListener("keydown", e => {
    if (e.key === "Enter") buscarUsuario();
  });

  // O botão "Tornar Moderador" agora envia o usuário para a lista de pendentes
  btnMembro.onclick = () => alterarCargo("PENDENTE_MOD");
  
  // O botão Banir (se você quiser implementar) poderia mudar o role para "BANIDO"
  // btnBanir.onclick = () => alterarCargo("BANIDO"); // (Exigiria "BANIDO" no seu Enum)

  btnExcluir.onclick = () => alert("🗑️ Ação de excluir anúncio não implementada.");
});