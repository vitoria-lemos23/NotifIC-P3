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

  async function buscarUsuario() {
    const termo = campoBusca.value.trim().toLowerCase();
    if (!termo) {
      alert("Digite um ID, username ou e-mail!");
      return;
    }

    try {
    const response = await fetch("../json/admin.json");
      const usuarios = await response.json();

      const usuario = usuarios.find(
        u =>
          u.id.toString() === termo ||
          u.username.toLowerCase() === termo ||
          u.email.toLowerCase() === termo
      );

      if (!usuario) {
        alert("Usuário não encontrado!");
        resultado.classList.add("oculto");
        return;
      }

      infoId.textContent = usuario.id;
      infoUsername.textContent = usuario.username;
      infoEmail.textContent = usuario.email;
      infoStatus.textContent = usuario.status;

      resultado.classList.remove("oculto");

      // Botões
      btnBanir.onclick = () => alterarStatus("banido");
      btnMembro.onclick = () => alterarStatus("membro");
      btnExcluir.onclick = () => alert("🗑️ Anúncio do usuário excluído!");
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar usuário.");
    }
  }

  function alterarStatus(status) {
    infoStatus.textContent = status;
    alert(`${status}`);
  }

  btnBuscar.addEventListener("click", buscarUsuario);
  campoBusca.addEventListener("keydown", e => {
    if (e.key === "Enter") buscarUsuario();
  });
});
