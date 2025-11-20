// Estado de login e permissões
let isAdmin = false; // Será determinado a partir do usuário autenticado

const adminLink = document.getElementById('adminLink');
// Inicialmente oculto; será mostrado quando soubermos o papel do usuário
if (adminLink) adminLink.style.display = 'none';

// Verifica se o usuário é administrador baseado no window.APP_USER
function verificarPermissoesAdmin() {
    if (typeof window !== 'undefined' && window.APP_USER) {
        isAdmin = window.APP_USER.role === 'ADMIN' || window.APP_USER.role === 'MODERADOR';
        atualizarBotaoAdmin();
    }
}

// Atualiza a visibilidade do botão admin
function atualizarBotaoAdmin() {
    if (adminLink) {
        adminLink.style.display = isAdmin ? 'block' : 'none';
    }
}

// Verifica permissões quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    verificarPermissoesAdmin();
});

function toggleMenu() {
    const sideMenu = document.getElementById("sideMenu");
    const backdrop = document.getElementById("sideMenuBackdrop");
    const isActive = sideMenu.classList.toggle("active");
    if (backdrop) backdrop.classList.toggle('active', isActive);

    // Fecha o menu ao clicar fora dele
    if (isActive) {
        document.addEventListener("click", closeMenuOnClickOutside);
    } else {
        document.removeEventListener("click", closeMenuOnClickOutside);
    }

    sideMenu.setAttribute("aria-hidden", !isActive);
}

function closeMenuOnClickOutside(event) {
    const sideMenu = document.getElementById("sideMenu");
    const profileButton = document.getElementById("profileButton");

    // Se o clique foi fora do menu e fora do botão, fecha o menu
    if (
        !sideMenu.contains(event.target) &&
        !profileButton.contains(event.target)
    ) {
        sideMenu.classList.remove("active");
        sideMenu.setAttribute("aria-hidden", "true");
        const backdrop = document.getElementById('sideMenuBackdrop');
        if (backdrop) backdrop.classList.remove('active');
        document.removeEventListener("click", closeMenuOnClickOutside);
    }
}

// Adiciona o event listener ao botão de perfil
document.getElementById("profileButton").addEventListener("click", function (event) {
    event.stopPropagation(); // Impede que o clique propague para o document
    toggleMenu();
});

// Tornar o botão de notificações funcional no perfil (fallback robusto)
function bindProfileNotifications() {
    try {
        const nb = document.getElementById('notificationsButton');
        const dd = document.getElementById('notificationsDropdown');
        if (!nb) return;

        function onNotifClick(e) {
            console.log('[perfil.js] notificationsButton clicked');
            e.stopPropagation();
            try {
                if (typeof notificationSystem !== 'undefined' && notificationSystem && typeof notificationSystem.toggleDropdown === 'function') {
                    notificationSystem.toggleDropdown();
                    return;
                }
            } catch (err) {
                console.error('notificationSystem error:', err);
            }
            // fallback: toggle class on dropdown
            if (dd) dd.classList.toggle('active');
        }

        nb.removeEventListener('click', onNotifClick);
        nb.addEventListener('click', onNotifClick);

        // close dropdown on outside click (fallback)
        document.addEventListener('click', function (ev) {
            const dropdown = document.getElementById('notificationsDropdown');
            if (dropdown && dropdown.classList.contains('active')) {
                if (ev.target.closest && (ev.target.closest('#notificationsDropdown') || ev.target.closest('#notificationsButton'))) return;
                dropdown.classList.remove('active');
            }
        });
    } catch (e) {
        console.error('bindProfileNotifications error', e);
    }
}

// Bind notifications on DOMContentLoaded (perfil
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindProfileNotifications);
} else {
    bindProfileNotifications();
}

// Sincroniza o badge de notificações a partir do localStorage
function syncNotificationsFromStorage() {
    try {
        // Prefere usar a instância global se disponível
        if (typeof notificationSystem !== 'undefined' && notificationSystem) {
            notificationSystem.renderNotifications && notificationSystem.renderNotifications();
            notificationSystem.updateBadge && notificationSystem.updateBadge();
            return;
        }

        const raw = localStorage.getItem('userNotifications');
        const list = raw ? JSON.parse(raw) : [];
        const unread = Array.isArray(list) ? list.filter(n => !n.read).length : 0;
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.textContent = unread > 99 ? '99+' : String(unread);
    } catch (e) {
        console.error('Erro ao sincronizar notificações do storage:', e);
    }
}

// Atualiza badge quando outro script modificar as notificações
window.addEventListener('notifications:updated', function (ev) {
    try {
        // ev.detail é a lista atualizada
        const list = ev && ev.detail ? ev.detail : JSON.parse(localStorage.getItem('userNotifications') || '[]');
        const unread = Array.isArray(list) ? list.filter(n => !n.read).length : 0;
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.textContent = unread > 99 ? '99+' : String(unread);
    } catch (e) {
        console.error('notifications:updated handler error', e);
    }
});

// Escuta alterações de localStorage vindas de outras abas/janelas
window.addEventListener('storage', function (e) {
    if (!e || e.key !== 'userNotifications') return;
    syncNotificationsFromStorage();
});

// Sincroniza no carregamento inicial
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncNotificationsFromStorage);
} else {
    syncNotificationsFromStorage();
}

// Se a instância global existir e o usuário estiver autenticado, pede sincronização direta
try {
    if (typeof window !== 'undefined' && window.APP_USER && window.notificationSystem && typeof window.notificationSystem.syncWithServer === 'function') {
        window.notificationSystem.syncWithServer();
    }
} catch (e) {
    // ignore
}

// Função para atualizar a foto de perfil no header de todas as páginas
function updateHeaderProfilePicture(url) {
    // Atualiza a foto no header (profileButton img)
    const headerProfileImg = document.querySelector('#profileButton img');
    if (headerProfileImg) {
        headerProfileImg.src = url;
    }

    // Também atualiza qualquer outra referência à foto de perfil na página
    const allProfileImgs = document.querySelectorAll('img[alt*="Perfil"], img[alt*="perfil"]');
    allProfileImgs.forEach(img => {
        if (img.id !== 'profile-picture') { // Não sobrescrever a do perfil principal
            img.src = url;
        }
    });
}

// Fecha o menu ao pressionar ESC
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const sideMenu = document.getElementById("sideMenu");
        if (sideMenu) sideMenu.classList.remove("active");
        const backdrop = document.getElementById('sideMenuBackdrop');
        if (backdrop) backdrop.classList.remove('active');
        document.removeEventListener("click", closeMenuOnClickOutside);
    }
});

// Funções para upload de foto (se necessário)
document.addEventListener('DOMContentLoaded', function() {
    const changePhotoBtn = document.getElementById('change-photo-btn');
    const photoUpload = document.getElementById('photo-upload');
    const profilePicture = document.getElementById('profile-picture');

    if (changePhotoBtn && photoUpload && profilePicture) {
        changePhotoBtn.addEventListener('click', function() {
            photoUpload.click();
        });

        photoUpload.addEventListener('change', async function(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Validação básica do arquivo
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione um arquivo de imagem válido.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }

            // Preview imediato
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicture.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // Upload para o servidor
            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('/user/upload-profile-picture', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    // Atualiza a foto com a URL do servidor
                    profilePicture.src = result.url;

                    // Atualiza window.APP_USER se existir
                    if (window.APP_USER) {
                        window.APP_USER.profile_picture = result.url;
                    }

                    // Atualiza a foto no header de todas as páginas
                    updateHeaderProfilePicture(result.url);

                    alert('Foto de perfil atualizada com sucesso!');
                } else {
                    alert('Erro ao fazer upload: ' + result.error);
                    // Reverte para a foto anterior se falhar
                    if (window.APP_USER && window.APP_USER.profile_picture) {
                        profilePicture.src = window.APP_USER.profile_picture;
                    } else {
                        profilePicture.src = 'https://i.pravatar.cc/150';
                    }
                }
            } catch (error) {
                console.error('Erro no upload:', error);
                alert('Erro de conexão. Tente novamente.');
                // Reverte para a foto anterior
                if (window.APP_USER && window.APP_USER.profile_picture) {
                    profilePicture.src = window.APP_USER.profile_picture;
                } else {
                    profilePicture.src = 'https://i.pravatar.cc/150';
                }
            }
        });
    }

    // Carrega a foto do usuário no perfil se disponível
    // Só usa `window.APP_USER` quando NÃO estivermos visualizando outro perfil via ?user_id=
    (function() {
        try {
            const userIdParam = (typeof URLSearchParams !== 'undefined') ? new URLSearchParams(window.location.search).get('user_id') : null;
            if (!userIdParam && profilePicture && window.APP_USER && window.APP_USER.profile_picture) {
                profilePicture.src = window.APP_USER.profile_picture;
                updateHeaderProfilePicture(window.APP_USER.profile_picture);
            }
        } catch (e) {
            console.error('Erro ao ler user_id da URL para definir a foto do perfil:', e);
        }
    })();
});

document.addEventListener('DOMContentLoaded', function () {
    // O sistema de notificações modularizado já cuida da atualização do badge
    // Não é necessário fazer requisições adicionais aqui

    // Preferências de notificações: atualiza e envia para o backend
    const preferencesList = document.querySelector('.preferences-list');
    if (preferencesList && window.APP_USER) {
        const preferenceItems = preferencesList.querySelectorAll('.preference-item');
        preferenceItems.forEach(item => {
            const label = item.querySelector('span').textContent.trim();
            const checkbox = item.querySelector('input[type="checkbox"]');
            // Inicializa o estado do checkbox conforme as preferências do usuário
            checkbox.checked = window.APP_USER.notification_preferences?.includes(label);

            checkbox.addEventListener('change', function () {
                let prefs = window.APP_USER.notification_preferences || [];
                if (checkbox.checked) {
                    if (!prefs.includes(label)) prefs.push(label);
                } else {
                    prefs = prefs.filter(p => p !== label);
                }
                window.APP_USER.notification_preferences = prefs;

                // Envia para o backend
                fetch('/user/update-preferences', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ notification_preferences: prefs })
                })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        alert('Erro ao salvar preferências');
                    }
                })
                .catch(() => {
                    alert('Erro de conexão ao salvar preferências');
                });
            });
        });
    }
});