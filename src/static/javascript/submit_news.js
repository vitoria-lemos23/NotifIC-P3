document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.container');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const titleInput = form.querySelector('#titulo');
  const emailInput = form.querySelector('#email');
  const descricaoInput = form.querySelector('#descricao');
  const dataInicioInput = form.querySelector('#data-inicio');
  const dataFimInput = form.querySelector('#data-fim');
  const siteInput = form.querySelector('#site');
  const imagemInput = form.querySelector('#imagem-noticia');

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const title = titleInput.value?.trim();
    const content = descricaoInput.value?.trim();

    if (!title || !content) {
      alert('Por favor preencha o título e a descrição do anúncio.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      // Upload de imagem se houver
      let imageUrl = null;
      if (imagemInput?.files?.[0]) {
        const imageFile = imagemInput.files[0];
        const maxSize = 10 * 1024 * 1024; // 10 MB

        if (imageFile.size > maxSize) {
          throw new Error('A imagem deve ter no máximo 10 MB');
        }

        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch('/upload-image', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Erro ao fazer upload da imagem');
        }
        imageUrl = uploadData.url;
      }

      // Submissão da notícia
      const selectedTags = Array.from(form.querySelectorAll('input[name="tags"]:checked')).map(cb => cb.value);
      const payload = {
        title,
        content,
        link: siteInput.value?.trim() || null,
        start_date: dataInicioInput.value ? new Date(dataInicioInput.value).toISOString() : null,
        end_date: dataFimInput.value ? new Date(dataFimInput.value).toISOString() : null,
        tags: selectedTags,
        image: imageUrl
      };

      const res = await fetch('/news', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          alert('Você precisa fazer login para submeter uma notícia.');
          window.location = '/login';
          return;
        }
        throw new Error(body.error || res.statusText);
      }

      // Mensagem conforme status
      if (body.status === 'PENDENTE') {
        alert('Submetido com sucesso. Sua notícia ficará pendente até revisão.');
      } else if (body.status === 'ACEITA') {
        alert('Submetido com sucesso. Sua notícia foi publicada!');
      } else {
        alert(body.message || 'Submetido com sucesso.');
      }

      // Limpa o formulário
      titleInput.value = '';
      emailInput.value = '';
      descricaoInput.value = '';
      dataInicioInput.value = '';
      dataFimInput.value = '';
      siteInput.value = '';
      if (imagemInput) imagemInput.value = '';
      form.querySelectorAll('input[name="tags"]:checked').forEach(cb => cb.checked = false);

    } catch (err) {
      console.error('Erro ao submeter notícia:', err);
      alert(err.message || 'Erro ao submeter. Tente novamente mais tarde.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Anúncio';
    }
  });
});
