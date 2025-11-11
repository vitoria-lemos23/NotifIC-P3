// Funções para autenticação
class AuthService {
    static baseURL = '';

    static async login(email, password) {
        console.log("Login chamado");
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            // tenta parsear JSON com segurança
            let data = {};
            try { data = await response.json(); } catch (e) { /* corpo vazio ou não-JSON */ }

            if (response.ok) {
                // Salva o token no localStorage
                if (data.token) localStorage.setItem('token', data.token);
                return { success: true, data };
            }

            // Trata códigos específicos do backend
            if (response.status === 401) {
                console.warn('login unauthorized', data);
                return { success: false, error: data.error || 'Credenciais inválidas' };
            }

            console.error('login failed', response.status, data);
            return { success: false, error: data.error || `Erro: ${response.status}` };
        } catch (error) {
            console.error('login error', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    static async register(username, email, password) {
        try {
            const response = await fetch('/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            // parse JSON safely
            let data = {};
            try { data = await response.json(); } catch (e) { console.warn('register: no JSON response', e); }

            if (response.ok) {
                return { success: true, data };
            }

            // specific handling for conflict
            if (response.status === 409) {
                console.warn('register conflict', data);
                return { success: false, error: data.error || 'Usuário ou email já existe' };
            }

            console.error('register failed', response.status, data);
            return { success: false, error: data.error || `Erro: ${response.status}` };
        } catch (error) {
            console.error('register error', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    static async recoverPassword(email) {
        try {
            const response = await fetch('/recuperar-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            let data = {};
            try { data = await response.json(); } catch (e) { console.warn('recoverPassword: no JSON response', e); }

            if (response.ok) return { success: true, data };

            if (response.status === 404) {
                console.warn('recoverPassword not found', data);
                return { success: false, error: data.error || 'E-mail não encontrado' };
            }

            console.error('recoverPassword failed', response.status, data);
            return { success: false, error: data.error || `Erro: ${response.status}` };
        } catch (error) {
            console.error('recoverPassword error', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    static isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    static getToken() {
        return localStorage.getItem('token');
    }

    static logout() {
        localStorage.removeItem('token');
        // rota de login no backend é '/login' (GET)
        window.location.href = '/login';
    }
}

// Funções de utilidade para UI
class UIManager {
    static showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        if (!container) return;

        container.innerHTML = `
            <div class="flash ${type}">
                ${message}
            </div>
        `;

        // Auto-remove após 5 segundos para mensagens de sucesso/info
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (container.innerHTML.includes(message)) {
                    container.innerHTML = '';
                }
            }, 5000);
        }
    }

    static setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = 'Carregando...';
        } else {
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text') || 'Enviar';
        }
    }
}

// Init functions per-page -------------------------------------------------
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const button = this.querySelector('button[type="submit"]');

        button.setAttribute('data-original-text', button.innerHTML);
        UIManager.setLoading(button, true);

        const result = await AuthService.login(email, password);

        UIManager.setLoading(button, false);

        if (result.success) {
            UIManager.showMessage('Login realizado com sucesso!', 'success');
            // Redirect to the root path (home page is served at '/')
            setTimeout(() => { window.location.href = '/'; }, 1000);
        } else {
            UIManager.showMessage(result.error, 'error');
        }
    });
}

function initRegister() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const button = this.querySelector('button[type="submit"]');

        if (password !== confirmPassword) {
            UIManager.showMessage('As senhas não coincidem!', 'error');
            return;
        }
        if (password.length < 6) {
            UIManager.showMessage('A senha deve ter pelo menos 6 caracteres!', 'error');
            return;
        }

        button.setAttribute('data-original-text', button.innerHTML);
        UIManager.setLoading(button, true);

        const result = await AuthService.register(username, email, password);

        UIManager.setLoading(button, false);

        if (result.success) {
            UIManager.showMessage('Conta criada com sucesso! Redirecionando para login...', 'success');
            setTimeout(() => { window.location.href = '/login'; }, 2000);
        } else {
            UIManager.showMessage(result.error, 'error');
        }
    });
}

function initRecovery() {
    const recoveryForm = document.getElementById('recoveryForm');
    if (!recoveryForm) return;

    recoveryForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const button = this.querySelector('button[type="submit"]');

        button.setAttribute('data-original-text', button.innerHTML);
        UIManager.setLoading(button, true);

        const result = await AuthService.recoverPassword(email);

        UIManager.setLoading(button, false);

        if (result.success) {
            UIManager.showMessage('Se o email existir em nosso sistema, enviaremos instruções de recuperação.', 'info');
        } else {
            UIManager.showMessage(result.error, 'error');
        }
    });
}

function initReset() {
    // If you have a reset page with token param and a form, implement hookup here.
    const resetForm = document.getElementById('resetForm');
    if (!resetForm) return;

    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const token = document.getElementById('token').value;
        const nova_senha = document.getElementById('nova_senha').value;
        const button = this.querySelector('button[type="submit"]');

        button.setAttribute('data-original-text', button.innerHTML);
        UIManager.setLoading(button, true);

        const result = await resetPassword(token, nova_senha);

        UIManager.setLoading(button, false);
        if (result.success) {
            UIManager.showMessage('Senha redefinida com sucesso!', 'success');
            setTimeout(() => { window.location.href = '/login'; }, 1200);
        } else {
            UIManager.showMessage(result.error, 'error');
        }
    });
}

// Bootstrap: pick init based on data-page or element presence
document.addEventListener('DOMContentLoaded', function() {
    const page = document.body && document.body.dataset && document.body.dataset.page;
    if (page === 'login') return initLogin();
    if (page === 'register') return initRegister();
    if (page === 'recovery') return initRecovery();
    if (page === 'reset') return initReset();

    // fallback: detect by element ids
    if (document.getElementById('loginForm')) initLogin();
    if (document.getElementById('registerForm')) initRegister();
    if (document.getElementById('recoveryForm')) initRecovery();
    if (document.getElementById('resetForm')) initReset();
});

// Helpers para fluxo de redefinição de senha (frontend)
// valida token (faz GET /redefinir-senha?token=...)
async function validateResetToken(token) {
    try {
        const res = await fetch(`/redefinir-senha?token=${encodeURIComponent(token)}`, { method: 'GET' });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        if (res.ok) return { valid: true, data };
        return { valid: false, error: data.error || `Erro: ${res.status}` };
    } catch (err) {
        return { valid: false, error: 'Erro de conexão' };
    }
}

// efetua redefinição (POST /redefinir-senha { token, nova_senha })
async function resetPassword(token, nova_senha) {
    try {
        const res = await fetch('/redefinir-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, nova_senha })
        });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        if (res.ok) return { success: true, data };
        return { success: false, error: data.error || `Erro: ${res.status}` };
    } catch (err) {
        return { success: false, error: 'Erro de conexão' };
    }
}