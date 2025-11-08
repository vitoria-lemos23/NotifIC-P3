function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadNews() {
    const newsId = getQueryParam("id");
    const newsDiv = document.getElementById("news");
    
    try {
        const response = await fetch("../json/news.json");
        const newsList = await response.json();
        const newsItem = newsList.find((n) => n.id == newsId);

        if (!newsItem) {
            newsDiv.innerHTML = `<p>Notícia não encontrada.</p>`;
            return;
        }

        newsDiv.innerHTML = `
            <h2 class="news-title">${newsItem.title}</h2>
            <div class="news-meta">${newsItem.date || ""}</div>
            <img src="${newsItem.img}" alt="Imagem da notícia" class="news-img">
            <p class="news-desc">${newsItem.desc}</p>
            ${
                newsItem.externalLink
                    ? `<a href="${newsItem.externalLink}" target="_blank" class="subscribe-btn">Ir para o site</a>`
                    : ""
            }
        `;
    } catch (e) {
        newsDiv.innerHTML = `<p>Erro ao carregar notícia.</p>`;
        console.error('Erro ao carregar notícia:', e);
    }
}

// Carrega a notícia quando a página estiver pronta
document.addEventListener('DOMContentLoaded', loadNews);