// perfil_page.js
// Gerencia carregamento e edição da página de perfil.

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function fetchUserById(id) {
  const res = await fetch(`/user/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch user ${id}: ${res.status}`);
  return await res.json();
}

async function fetchMe() {
  // tenta rota protegida que retorna o usuário autenticado
  const res = await fetch('/me', { credentials: 'same-origin' });
  if (!res.ok) return null;
  return await res.json();
}

function populateForm(user, isOwner) {
  const usernameEl = document.getElementById('username');
  const emailEl = document.getElementById('email');
  const roleEl = document.getElementById('role');
  const prefsSection = document.querySelector('.notification-section');

  if (usernameEl) usernameEl.value = user.username || '';
  if (emailEl) emailEl.value = user.email || '';
  if (roleEl) roleEl.value = user.role || 'USUARIO';

  // Campos são apenas de exibição (não editáveis) tanto para o dono quanto para
  // visualizadores externos.
  if (usernameEl) usernameEl.setAttribute('disabled', 'disabled');
  if (emailEl) emailEl.setAttribute('disabled', 'disabled');
  if (roleEl) roleEl.setAttribute('disabled', 'disabled');

  // set profile picture if available
  const profilePicture = document.getElementById('profile-picture');
  if (profilePicture) {
    // suporte a vários nomes de campo que o backend pode fornecer
    const src = user.profile_picture || user.profilePicture || user.avatar || user.image || user.profile_picture_url || '';
    if (src) profilePicture.src = src;
  }

  // Mostrar/ocultar ações de avatar e preferências dependendo se é o dono do perfil
  const changeBtn = document.getElementById('change-photo-btn');
  const chooseBtn = document.getElementById('choose-photo-btn');
  const photoUpload = document.getElementById('photo-upload');
  if (!isOwner) {
    if (changeBtn) changeBtn.style.display = 'none';
    if (chooseBtn) chooseBtn.style.display = 'none';
    // remove o input de arquivo do DOM para visitantes (não deixa vestígios)
    try {
      if (photoUpload && photoUpload.remove) {
        photoUpload.remove();
      } else if (photoUpload && photoUpload.parentNode) {
        photoUpload.parentNode.removeChild(photoUpload);
      }
    } catch (e) {
      // falha silenciosa — não crítica
      console.warn('Não foi possível remover #photo-upload do DOM:', e);
    }
    if (prefsSection) prefsSection.style.display = 'none';
  } else {
    if (changeBtn) changeBtn.style.display = '';
    if (chooseBtn) chooseBtn.style.display = '';
    // manter input file oculto até o usuário acionar escolher
    if (photoUpload) photoUpload.style.display = 'none';
    if (prefsSection) prefsSection.style.display = '';
  }

  // store current loaded user id on the form for save
  const form = document.querySelector('.user-info-fields');
  if (form) form.dataset.loadedUserId = user.id;
}

async function saveProfile() {
  const form = document.querySelector('.user-info-fields');
  if (!form) return;
  const userId = form.dataset.loadedUserId;
  if (!userId) return alert('ID do usuário não definido.');

  const payload = {
    username: document.getElementById('username').value,
    email: document.getElementById('email').value,
    // role não é permitida a alteração por usuários comuns
  };

  try {
    const res = await fetch(`/user/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Status ${res.status}`);
    }
    const updated = await res.json();
    alert('Perfil atualizado com sucesso.');
    // reflect any changes
    populateForm(updated, true);
  } catch (err) {
    console.error('Erro ao salvar perfil:', err);
    alert('Falha ao salvar perfil. Veja o console para detalhes.');
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  const userIdParam = getQueryParam('user_id');
  let isOwner = false;
  let user = null;

  // If user_id param present, view that user's profile
  if (userIdParam) {
    try {
      user = await fetchUserById(userIdParam);
      isOwner = false;
    } catch (e) {
      console.error(e);
      alert('Não foi possível carregar o perfil solicitado.');
      return;
    }
  } else if (typeof window !== 'undefined' && window.APP_USER) {
    // server-injected user when rendering own profile
    user = window.APP_USER;
    isOwner = true;
  } else {
    // otherwise attempt to fetch /me
    try {
      user = await fetchMe();
      if (!user) {
        // not logged in; redirect to login
        window.location.href = '/login';
        return;
      }
      isOwner = true;
    } catch (e) {
      console.error('Erro ao obter usuário atual:', e);
      return;
    }
  }

  populateForm(user, isOwner);

  // Garantir que o avatar do cabeçalho mostre a foto do usuário logado
  try {
    (async function setHeaderAvatar() {
      try {
        let loggedUser = null;
        if (typeof window !== 'undefined' && window.APP_USER) {
          loggedUser = window.APP_USER;
        } else {
          // Se estamos vendo outro perfil (userIdParam), e não temos APP_USER,
          // tentamos buscar /me para obter os dados do usuário autenticado.
          if (userIdParam) {
            try {
              loggedUser = await fetchMe();
            } catch (e) {
              loggedUser = null;
            }
          } else {
            // quando não há userIdParam, `user` já representa o usuário logado
            loggedUser = user;
          }
        }

        if (loggedUser && loggedUser.profile_picture) {
          if (typeof window !== 'undefined' && typeof window.updateHeaderProfilePicture === 'function') {
            try {
              window.updateHeaderProfilePicture(loggedUser.profile_picture);
            } catch (err) {
              console.warn('updateHeaderProfilePicture falhou:', err);
            }
          } else {
            const headerImg = document.querySelector('#profileButton img');
            if (headerImg) headerImg.src = loggedUser.profile_picture;
          }
        }
      } catch (e) {
        console.error('Erro ao definir avatar do cabeçalho:', e);
      }
    })();
  } catch (e) {
    // não crítico
  }

  // Sincroniza notificações do servidor se usuário estiver autenticado
  if (isOwner && typeof window !== 'undefined' && window.notificationSystem) {
    try {
      if (typeof window.notificationSystem.syncWithServer === 'function') {
        await window.notificationSystem.syncWithServer();
      }
    } catch (e) {
      console.error('Erro ao sincronizar notificações:', e);
    }
  }

  // No save button; profile edits are not available from this page.
});
