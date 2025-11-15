// submit_news.js
// Handles submission of the page_feed form and sends JSON to /submit-news

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.container'); // page_feed uses container as wrapper
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const titleInput = form.querySelector('#titulo');
  const email = form.querySelector('#email');
  const descricao = form.querySelector('#descricao');
  const dataInicio = form.querySelector('#data-inicio');
  const dataFim = form.querySelector('#data-fim');
  const site = form.querySelector('#site');

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const title = titleInput.value && titleInput.value.trim();
    const content = descricao.value && descricao.value.trim();
    const link = site.value && site.value.trim();
    const start_date = dataInicio.value ? new Date(dataInicio.value).toISOString() : null;
    const end_date = dataFim.value ? new Date(dataFim.value).toISOString() : null;

    if (!title || !content) {
      alert('Por favor preencha o nome e a descrição do anúncio.');
      return;
    }

    const payload = {
      title: title,
      content: content,
      link: link || null,
      start_date: start_date,
      end_date: end_date,
      // optional: include a tag for 'EVENTO' so it can be filtered
      tags: ['EVENTO']
    };

    // Image uploads have been disabled; clients should not send image fields.

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const res = await fetch('/cadastrar-noticia', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          alert('Você precisa fazer login para submeter uma notícia.');
          window.location = '/login';
          return;
        }
        alert('Falha ao submeter. ' + (body.error || res.statusText));
        return;
      }

      const body = await res.json();
      alert(body.message || 'Submetido com sucesso. Sua notícia ficará pendente até revisão.');
      // optional: clear form
      titleInput.value = '';
      email.value = '';
      descricao.value = '';
      dataInicio.value = '';
      dataFim.value = '';
      site.value = '';
    } catch (err) {
      console.error('Erro ao submeter notícia:', err);
      alert('Erro de rede ao submeter. Tente novamente mais tarde.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Anúncio';
    }
  });
});
