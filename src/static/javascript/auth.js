// Funções para autenticação
class AuthService {
    static baseURL = '';

    static async login(email, password) {
        print("Login chamado");
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Salva o token no localStorage
                localStorage.setItem('token', data.token);
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
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

            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
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

            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
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
        window.location.href = '/login-page';
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

// Handlers para os formulários
document.addEventListener('DOMContentLoaded', function() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const button = this.querySelector('button[type="submit"]');

            // Salva texto original do botão
            button.setAttribute('data-original-text', button.innerHTML);
            UIManager.setLoading(button, true);

            const result = await AuthService.login(email, password);

            UIManager.setLoading(button, false);

            if (result.success) {
                UIManager.showMessage('Login realizado com sucesso!', 'success');
                setTimeout(() => {
                    window.location.href = '/home';
                }, 1000);
            } else {
                UIManager.showMessage(result.error, 'error');
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const button = this.querySelector('button[type="submit"]');

            // Validação básica no frontend
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
                setTimeout(() => {
                    window.location.href = '/login-page';
                }, 2000);
            } else {
                UIManager.showMessage(result.error, 'error');
            }
        });
    }

    // Recovery Form
    const recoveryForm = document.getElementById('recoveryForm');
    if (recoveryForm) {
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
});