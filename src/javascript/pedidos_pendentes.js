// Painel de pedidos pendentes (admin)
// Usa cookie HttpOnly para autenticação; não tenta ler token via JS.

document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("pedidos-container");
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCloseBtn = document.querySelector(".modal-close-btn");

    let dadosDosPedidos = [];

    function abrirModal(item) {
        document.getElementById("modal-title").textContent = item.title;
        document.getElementById("modal-img").src = item.img || '/static/img/notific.svg';
        document.getElementById("modal-requester").textContent = item.author_username || 'Desconhecido';
        document.getElementById("modal-date").textContent = item.created_at ? new Date(item.created_at).toLocaleString() : '—';
        document.getElementById("modal-desc").textContent = item.content || '(sem descrição)';
        modalOverlay.classList.add("active");
    }

    function fecharModal() {
        modalOverlay.classList.remove("active");
    }

    function renderizarPedidos() {
        container.innerHTML = '';
        dadosDosPedidos.forEach(item => {
            const card = document.createElement('div');
            card.className = 'pedido-card';
            card.dataset.id = item.id;
            card.innerHTML = `
                <img src="${item.img || '/static/img/notific.svg'}" alt="Imagem para ${item.title}" class="pedido-imagem">
                <div class="pedido-conteudo">
                    <h3 class="pedido-titulo">${item.author_username || 'Desconhecido'}</h3>
                    <p class="pedido-info"><strong>Data:</strong> ${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</p>
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

    async function carregarDados() {
        try {
            const response = await fetch('/admin/news/pending', { credentials: 'same-origin' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            dadosDosPedidos = Array.isArray(data) ? data : [];
            renderizarPedidos();
        } catch (e) {
            console.error('Falha ao carregar pedidos pendentes', e);
            container.innerHTML = "<p style='color:red;'>Erro ao carregar pedidos pendentes.</p>";
        }
    }

    container.addEventListener('click', function(e) {
        const target = e.target;
        const card = target.closest('.pedido-card');
        if (!card) return;
        const id = parseInt(card.dataset.id, 10);
        const item = dadosDosPedidos.find(p => p.id === id);
        if (target.classList.contains('btn-detalhes')) abrirModal(item);
        if (target.classList.contains('btn-aceitar')) updateNewsStatus(id, 'ACEITA', card);
        if (target.classList.contains('btn-rejeitar')) updateNewsStatus(id, 'REJEITADA', card);
    });

    async function updateNewsStatus(id, status, card) {
        const endpoint = status === 'ACEITA' ? `/admin/news/${id}/approve` : `/admin/news/${id}/reject`;
        try {
            const resp = await fetch(endpoint, { method: 'POST', credentials: 'same-origin' });
            if (resp.ok) {
                card.remove();
            } else {
                const err = await resp.json().catch(()=>({error:'Erro desconhecido'}));
                alert(`Falha: ${err.error || 'Não foi possível atualizar.'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Erro de rede ao atualizar status');
        }
    }

    modalCloseBtn.addEventListener('click', fecharModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) fecharModal(); });

    carregarDados();
});