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
    const choosePhotoBtn = document.getElementById('choose-photo-btn');
    const photoUpload = document.getElementById('photo-upload');
    const profilePicture = document.getElementById('profile-picture');

    if (changePhotoBtn && choosePhotoBtn && photoUpload && profilePicture) {
        changePhotoBtn.addEventListener('click', function() {
            // Lógica para tirar foto (implementar se necessário)
            console.log('Tirar foto');
        });

        choosePhotoBtn.addEventListener('click', function() {
            photoUpload.click();
        });

        photoUpload.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePicture.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
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
                        headers: { 'Content-Type': 'application/json' },
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

document.addEventListener('DOMContentLoaded', function () {
    async function updateNotificationBadge() {
        try {
            const res = await fetch('/notifications/unread-count', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + (window.AUTH_TOKEN || '')
                }
            });
            const data = await res.json();
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (data.success && data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.textContent = '';
                    badge.style.display = 'none';
                }
            }
        } catch (e) {
            // opcional: log de erro
        }
    }
    updateNotificationBadge();
});