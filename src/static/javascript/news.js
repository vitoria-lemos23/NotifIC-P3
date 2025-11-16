function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
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

    // Prefer banner image (from static JSON enrichment) or uploaded image_url if available
    const imgSrc = newsItem.imagem_banner || newsItem.image_url || '';
    const metaDate = newsItem.created_at || newsItem.start_date || '';

    newsDiv.innerHTML = `
        <h2 class="news-title">${newsItem.title || 'Sem título'}</h2>
        <div class="news-meta">${metaDate}</div>
        ${imgSrc ? `<img src="${imgSrc}" alt="Imagem da notícia" class="news-img">` : ''}
        <p class="news-desc">${newsItem.content || ''}</p>
        ${newsItem.link ? `<a href="${newsItem.link}" target="_blank" class="subscribe-btn">Ir para o site</a>` : ''}
    `;
    } catch (e) {
        newsDiv.innerHTML = `<p>Erro ao carregar notícia.</p>`;
        console.error('Erro ao carregar notícia:', e);
    }
}

// Carrega a notícia quando a página estiver pronta
document.addEventListener('DOMContentLoaded', loadNews);