// submit_news.js
// Handles submission of the page_feed form and sends JSON to /submit-news

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.container'); // page_feed uses container as wrapper
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const titleInput = form.querySelector('#titulo');
  const instituicao = form.querySelector('#instituicao');
  const email = form.querySelector('#email');
  const descricao = form.querySelector('#descricao');
  const dataInicio = form.querySelector('#data-inicio');
  const dataFim = form.querySelector('#data-fim');
  const local = form.querySelector('#local');
  const site = form.querySelector('#site');
  const fotoInput = form.querySelector('#foto');

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
      content: `Instituição: ${instituicao.value || ''}\nContato: ${email.value || ''}\nLocal: ${local.value || ''}\n\n${content}`,
      link: link || null,
      start_date: start_date,
      end_date: end_date,
      // optional: include a tag for 'EVENTO' so it can be filtered
      tags: ['EVENTO']
    };

    // If a photo was selected, upload it first and include returned path
    if (fotoInput && fotoInput.files && fotoInput.files.length > 0) {
      const file = fotoInput.files[0];
      const formData = new FormData();
      formData.append('foto', file);
      try {
        const up = await fetch('/upload-image', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        });
        if (up.ok) {
          const jb = await up.json();
          if (jb && jb.path) {
            payload.imagem_banner = jb.path;
            payload.img = jb.path;
          }
        } else {
          console.warn('Upload failed, continuing without image', up.status);
        }
      } catch (e) {
        console.warn('Upload error, continuing without image', e);
      }
    }

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
      instituicao.value = '';
      email.value = '';
      descricao.value = '';
      dataInicio.value = '';
      dataFim.value = '';
      local.value = '';
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
