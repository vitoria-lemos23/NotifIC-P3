// Espera o HTML ser totalmente carregado
document.addEventListener("DOMContentLoaded", async function() {

    // --- Pegar os elementos do HTML ---
    const container = document.getElementById("pedidos-container");
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCloseBtn = document.querySelector(".modal-close-btn");

    // --- Variável para guardar os dados ---
    let dadosDosPedidos = []; 

    // --- Funções do Modal ---
    function abrirModal(item) {
        document.getElementById("modal-title").textContent = item.title;
        document.getElementById("modal-img").src = item.img;
        document.getElementById("modal-requester").textContent = item.requester;
        document.getElementById("modal-date").textContent = item.date;
        document.getElementById("modal-desc").textContent = item.full_description;
        modalOverlay.classList.add("active");
    }

    function fecharModal() {
        modalOverlay.classList.remove("active");
    }

    // --- Função para desenhar os cards na tela ---
    function renderizarPedidos() {
        container.innerHTML = ""; // Limpa o container
        
        dadosDosPedidos.forEach(item => {
            const card = document.createElement("div");
            card.className = "pedido-card";
            card.dataset.id = item.id; // Guarda o ID no card

            card.innerHTML = `
                <img src="${item.img}" alt="Imagem para ${item.title}" class="pedido-imagem">
                <div class="pedido-conteudo">
                    <h3 class="pedido-titulo">${item.requester}</h3>
                    <p class="pedido-info"><strong>Data:</strong> ${item.date}</p>
                    <p class="pedido-info"><strong>Item:</strong> ${item.title}</p>
                    <div class="pedido-acoes">
                        <button class="btn-detalhes">Ver Detalhes</button>
                        <button class="btn-aceitar">Aceitar</button>
                        <button class="btn-rejeitar">Rejeitar</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Função para Carregar os Dados do JSON ---
    async function carregarDados() {
        try {
            // Caminho para o seu JSON, relativo ao ARQUIVO HTML
            const response = await fetch("../json/controle.json");
            
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }
            
            dadosDosPedidos = await response.json(); 
            renderizarPedidos(); // Desenha os cards na tela

        } catch (error) {
            console.error("Não foi possível carregar os pedidos:", error);
            container.innerHTML = "<p style='color: red;'>Erro ao carregar dados. Verifique o console (F12) para mais detalhes.</p>";
        }
    }

    // --- Event Listeners (Ouvintes de Clique) ---
    
    // Para fechar o modal
    modalCloseBtn.addEventListener("click", fecharModal);
    modalOverlay.addEventListener("click", function(event) {
        if (event.target === modalOverlay) {
            fecharModal();
        }
    });

    // Para os botões "Detalhes", "Aceitar", "Rejeitar"
    container.addEventListener("click", function(event) {
        const target = event.target; 
        const card = target.closest(".pedido-card");
        if (!card) return; // Sai se o clique não foi em um card

        const itemId = parseInt(card.dataset.id);
        const item = dadosDosPedidos.find(p => p.id === itemId);

        if (target.classList.contains("btn-detalhes")) {
            abrirModal(item);
        }
        
        if (target.classList.contains("btn-aceitar")) {
            alert("Pedido " + itemId + " aceito!");
            card.style.opacity = '0.5'; 
        }

        if (target.classList.contains("btn-rejeitar")) {
            alert("Pedido " + itemId + " rejeitado!");
            card.style.opacity = '0.5'; 
        }
    });

    // --- Inicia o processo ---
    carregarDados();
});