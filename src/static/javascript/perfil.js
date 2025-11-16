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