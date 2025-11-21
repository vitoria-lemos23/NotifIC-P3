function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Fallback se inválida
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function loadNews() {
    const newsId = getQueryParam("id");
    const newsDiv = document.getElementById("news");
    
    try {
    if (!newsId) {
        newsDiv.innerHTML = `<p>Notícia não especificada.</p>`;
        return;
    }

    // Fetch the news item from the backend API (GET /news/<id>)
    const res = await fetch(`/news/${encodeURIComponent(newsId)}`);
    if (!res.ok) {
        if (res.status === 404) {
            newsDiv.innerHTML = `<p>Notícia não encontrada.</p>`;
            return;
        }
        newsDiv.innerHTML = `<p>Erro ao carregar notícia.</p>`;
        return;
    }

    const newsItem = await res.json();
    const imgSrc = newsItem.image || '/static/img/novo-banner-notific.png';
    const metaDate = formatDate(newsItem.created_at || newsItem.start_date || '');

    const externalLink = newsItem.link;
    let linkHref = '';
    if (externalLink) {
        if (externalLink.startsWith('http://') || externalLink.startsWith('https://')) {
            linkHref = externalLink;
        } else {
            if (!externalLink.includes('www.')) {
                linkHref = `https://www.${externalLink}`;
            } else {
                linkHref = `https://${externalLink}`;
            }
        }
    }

    newsDiv.innerHTML = `
        <h2 class="news-title">${newsItem.title || 'Sem título'}</h2>
        <div class="news-meta">${metaDate}</div>
        <img src="${imgSrc}" alt="Imagem da notícia" class="news-img">
        <p class="news-desc">${newsItem.content || ''}</p>
        ${linkHref ? `<a href="${linkHref}" target="_blank" class="subscribe-btn">Ir para o site</a>` : ''}
    `;

    // Adiciona o botão de voltar, mas coloca no <main> (antes do container)
    try {
        if (!document.querySelector('.inline-back-btn')) {
            const backBtn = document.createElement('button');
            backBtn.className = 'inline-back-btn';
            backBtn.type = 'button';
            backBtn.setAttribute('aria-label', 'Voltar');
            backBtn.title = 'Voltar';
            backBtn.innerHTML = '←';
            backBtn.addEventListener('click', function () {
                if (typeof window !== 'undefined' && window.HOME_URL) {
                    window.location.href = window.HOME_URL;
                } else if (document.referrer) {
                    window.history.back();
                } else {
                    window.location.href = '/';
                }
            });

            const mainEl = document.querySelector('main') || document.body;
            const container = document.getElementById('news');
            if (mainEl && container && mainEl.contains(container)) {
                mainEl.insertBefore(backBtn, container);
            } else {
                (mainEl || document.body).appendChild(backBtn);
            }
        }
    } catch (e) {
        console.error('Falha ao inserir botão de voltar:', e);
    }
    } catch (e) {
        newsDiv.innerHTML = `<p>Erro ao carregar notícia.</p>`;
        console.error('Erro ao carregar notícia:', e);
    }
}

// Carrega a notícia quando a página estiver pronta
document.addEventListener('DOMContentLoaded', loadNews);