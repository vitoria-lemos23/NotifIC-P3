document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.container');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const titleInput = form.querySelector('#titulo');
  const descricaoInput = form.querySelector('#descricao');
  const dataInicioInput = form.querySelector('#data-inicio');
  const dataFimInput = form.querySelector('#data-fim');
  const siteInput = form.querySelector('#site');
  const imagemInput = form.querySelector('#imagem-noticia');
  const charCount = document.getElementById('char-count');

  // Contador de caracteres para descrição
  if (descricaoInput && charCount) {
    const updateCharCount = () => {
      const count = descricaoInput.value.length;
      charCount.textContent = `${count}/1200`;
      if (count > 1100) {
        charCount.style.color = 'red';
      } else if (count >= 900) {
        charCount.style.color = 'orange';
      } else {
        charCount.style.color = 'green';
      }
      charCount.style.fontSize = '16px';
    };
    descricaoInput.addEventListener('input', updateCharCount);
    updateCharCount(); // Inicial
  }

  // Mudança de cor para título
  if (titleInput) {
    const updateTitleColor = () => {
      // Removido: mudança de cor da borda
    };
    titleInput.addEventListener('input', updateTitleColor);
    updateTitleColor(); // Inicial
  }

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const title = titleInput.value?.trim();
    const content = descricaoInput.value?.trim();

    if (!title || !content) {
      alert('Por favor preencha o título e a descrição do anúncio.');
      return;
    }

    const selectedTags = Array.from(form.querySelectorAll('input[name="tags"]:checked')).map(cb => cb.value);
    if (selectedTags.length === 0) {
      alert('Por favor, selecione pelo menos uma tag.');
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
      const payload = {
        title,
        content,
        link: normalizeLink(siteInput.value?.trim()) || null,
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
      descricaoInput.value = '';
      dataInicioInput.value = '';
      dataFimInput.value = '';
      siteInput.value = '';
      if (imagemInput) imagemInput.value = '';
      form.querySelectorAll('input[name="tags"]:checked').forEach(cb => cb.checked = false);

      // Limpa a pré-visualização
      const previewElement = document.getElementById('preview');
      if (previewElement) previewElement.innerHTML = '';

    } catch (err) {
      console.error('Erro ao submeter notícia:', err);
      alert(err.message || 'Erro ao submeter. Tente novamente mais tarde.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Anúncio';
    }
  });

  function normalizeLink(link) {
    if (!link) return null;
    link = link.trim();
    if (link.startsWith('http://') || link.startsWith('https://')) {
        return link;
    } else {
        if (!link.includes('www.')) {
            return `https://www.${link}`;
        } else {
            return `https://${link}`;
        }
    }
  }
});
