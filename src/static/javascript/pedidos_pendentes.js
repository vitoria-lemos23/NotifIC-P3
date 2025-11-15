// Espera o HTML ser totalmente carregado
document.addEventListener("DOMContentLoaded", async function () {
    // elementos
    const container = document.getElementById("pedidos-container");
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCloseBtn = document.querySelector(".modal-close-btn");

    let dadosDosPedidos = [];

    function truncate(s, n = 180) {
        if (!s) return "";
        return s.length > n ? s.slice(0, n).trim() + '…' : s;
    }

    function escapeHTML(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Field extraction heuristics removed: `instituicao`, `contato`, `local` are not model-backed.

    function formatDate(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return d.toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
        } catch (e) { return iso; }
    }

    function abrirModal(item) {
        if (!item) return;
        document.getElementById("modal-title").textContent = item.title || 'Detalhes';
        document.getElementById("modal-img").src = item.imagem_banner || '/static/img/notific.svg';
        // requester: show name with link to profile if author_id present
        const requesterEl = document.getElementById("modal-requester");
        requesterEl.innerHTML = '';
        const authorName = item.author_username || item.author || (item.author_id ? `Usuário` : 'Desconhecido');
        if (item.author_id) {
            const a = document.createElement('a');
            a.href = `/perfil?user_id=${item.author_id}`;
            a.textContent = `${authorName} [${item.author_id}]`;
            a.className = 'modal-author-link';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            requesterEl.appendChild(a);
        } else {
            // show name only when no id available
            requesterEl.textContent = authorName;
        }

        document.getElementById("modal-date").textContent = formatDate(item.created_at || item.createdAt || item.createdAtISO || '');

        // Description: allow simple formatting (preserve line breaks)
        const descEl = document.getElementById('modal-desc');
        const rawDesc = item.content || item.description || '';
        // basic safe formatting: escape then replace newlines with <br>
        const escaped = rawDesc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        descEl.innerHTML = escaped.replace(/\n/g, '<br>');

        // No extra fields; modal shows only description and metadata (date, requester)
        modalOverlay.classList.add("active");
    }

    function fecharModal() {
        modalOverlay.classList.remove("active");
    }

    // render compact cards similar to home feed
    function renderizarPedidos() {
        container.innerHTML = "";
        if (!Array.isArray(dadosDosPedidos) || dadosDosPedidos.length === 0) {
            container.innerHTML = '<p class="vazio">Sem pedidos pendentes no momento.</p>';
            return;
        }

        dadosDosPedidos.forEach(item => {
            const card = document.createElement('article');
            card.className = 'pedido-card compact-card';
            card.dataset.id = item.id;

            const imgSrc = item.imagem_banner || '/static/img/notific.svg';
                        const authorBase = item.author_username || item.author || 'Desconhecido';
                        const authorEsc = escapeHTML(authorBase);
                        const author = item.author_id ? `${authorEsc} [${item.author_id}]` : authorEsc;
                        const titleEsc = escapeHTML(item.title || 'Sem título');
            const created = formatDate(item.created_at || item.createdAt || item.createdAtISO || '');

            card.innerHTML = `
                <div class="card-left">
                  <img class="card-thumb" src="${imgSrc}" alt="${(item.title||'thumb').replace(/"/g,'')}">
                </div>
                <div class="card-body">
                                                                        <h3 class="card-title">${titleEsc}</h3>
                                                                                                                                                <div class="card-meta">${item.author_id ? `<a class="card-author-link" href="/perfil?user_id=${item.author_id}" target="_blank" rel="noopener noreferrer">${author}</a>` : `<span class="card-author">${author}</span>`} · <span class="card-date">${created}</span></div>
                                                                        <div class="card-hot">
                                                                            <label><input type="checkbox" class="hot-checkbox" ${item.hotNews ? 'checked' : ''}/> Destaque</label>
                                                                        </div>
                                                                                                                                                <div class="card-tag-selection">
                                                                                                                                                        <div class="card-tag-title">Tags:</div>
                                                                                                                                                        <div class="card-tag-list">
                                                                                                                                                            <label><input type="checkbox" class="tag-checkbox" value="PROJETO" ${(item.tags||[]).includes('PROJETO') ? 'checked' : ''}/> Projeto</label>
                                                                                                                                                            <label><input type="checkbox" class="tag-checkbox" value="EVENTO" ${(item.tags||[]).includes('EVENTO') ? 'checked' : ''}/> Evento</label>
                                                                                                                                                            <label><input type="checkbox" class="tag-checkbox" value="VAGA" ${(item.tags||[]).includes('VAGA') ? 'checked' : ''}/> Vaga</label>
                                                                                                                                                        </div>
                                                                                                                                                </div>
                                    <!-- Extra fields removed (instituicao/contato/local) -->
                                    <div class="card-tags">${(item.tags||[]).map(t => `<span class="tag">${t}</span>`).join(' ')}</div>
                  <div class="card-actions">
                    <button class="btn-detalhes">Ver</button>
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
            const resp = await fetch('/admin/news/pending', { credentials: 'same-origin' });
            if (resp.status === 401 || resp.status === 403) {
                container.innerHTML = '<p style="color:darkred">Acesso negado. Verifique se você está autenticado como administrador.</p>';
                return;
            }
            if (!resp.ok) throw new Error('Erro ao buscar pendentes: ' + resp.status);
            const list = await resp.json();
            // endpoint retorna lista de objetos
            dadosDosPedidos = Array.isArray(list) ? list : (list.news || []);
            // If some items lack author_username but have author_id, fetch author names
            const idsToFetch = [...new Set(dadosDosPedidos
                .filter(i => i.author_id && !i.author_username)
                .map(i => i.author_id))];
            if (idsToFetch.length) {
                await Promise.all(idsToFetch.map(async (uid) => {
                    try {
                        const ru = await fetch(`/user/${uid}`);
                        if (!ru.ok) return;
                        const u = await ru.json();
                        // populate matching items
                        dadosDosPedidos.forEach(it => {
                            if (String(it.author_id) === String(uid)) it.author_username = u.username;
                        });
                    } catch (e) {
                        console.warn('Failed to fetch user', uid, e);
                    }
                }));
            }
            // No extraction of non-model fields. Render as provided by API.
            renderizarPedidos();
        } catch (err) {
            console.error('Erro ao carregar pendentes', err);
            container.innerHTML = '<p style="color: red;">Erro ao carregar pendentes. Veja console.</p>';
        }
    }

    // Event delegation for card actions
    container.addEventListener('click', async function (ev) {
        const target = ev.target;
        const card = target.closest('.pedido-card');
        if (!card) return;
        const id = card.dataset.id;
        const item = dadosDosPedidos.find(x => String(x.id) === String(id));

        if (target.classList.contains('btn-detalhes')) {
            abrirModal(item);
            return;
        }

        if (target.classList.contains('btn-aceitar')) {
            if (!confirm('Confirma aceitar essa notícia?')) return;
            try {
                // include hotNews state when approving
                const hotBox = card.querySelector('.hot-checkbox');
                const hotState = hotBox ? Boolean(hotBox.checked) : false;
                // collect selected tags
                const selectedTags = Array.from(card.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
                const payload = { hot: hotState, tags: selectedTags };
                const r = await fetch(`/admin/news/${id}/approve`, { method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
                if (!r.ok) throw new Error('Status ' + r.status);
                // remove item from list and re-render
                dadosDosPedidos = dadosDosPedidos.filter(x => String(x.id) !== String(id));
                renderizarPedidos();
            } catch (e) {
                alert('Falha ao aceitar: ' + e.message);
            }
            return;
        }

        if (target.classList.contains('btn-rejeitar')) {
            if (!confirm('Confirma rejeitar essa notícia?')) return;
            try {
                const r = await fetch(`/admin/news/${id}/reject`, { method: 'POST', credentials: 'same-origin' });
                if (!r.ok) throw new Error('Status ' + r.status);
                dadosDosPedidos = dadosDosPedidos.filter(x => String(x.id) !== String(id));
                renderizarPedidos();
            } catch (e) {
                alert('Falha ao rejeitar: ' + e.message);
            }
            return;
        }
    });

    // modal listeners
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', fecharModal);
    if (modalOverlay) modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) fecharModal();
    });

    // start
    carregarDados();
});