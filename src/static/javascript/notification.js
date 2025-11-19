// Sistema de Notificações
class NotificationSystem {
  constructor() {
    this.notifications =
      JSON.parse(localStorage.getItem("userNotifications")) || [];
    // expõe a instância para outras páginas/scripts
    try {
      window.notificationSystem = this;
    } catch (e) {
      // ambiente restrito, ignora
    }

    this.init();
    // sincroniza alterações vindas de outras abas/janelas
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
  }

  init() {
    this.renderNotifications();
    this.setupEventListeners();
    this.checkForNewNotifications();
  }

  // Sincroniza notificações com o servidor se o usuário estiver autenticado
  async syncWithServer() {
    const usuarioLogado = (typeof window !== 'undefined' && !!window.APP_USER) ? true : false;
    if (!usuarioLogado) return;
    try {
      const res = await fetch('/notifications?per_page=100', { credentials: 'same-origin' });
      if (!res.ok) return;
      const body = await res.json();
      const serverList = Array.isArray(body.notifications) ? body.notifications : [];

      // Mapear notificações do servidor para o formato local e mesclar sem duplicatas
      const mapped = serverList.map(s => ({
        id: s.id,
        notification_id: s.notification_id || null,
        type: 'update',
        title: s.news_title || 'Atualização',
        message: s.message || '',
        newsId: s.news_id || s.newsId || null,
        sent_at: s.sent_at || null,
        timestamp: s.sent_at || new Date().toISOString(),
        read: !!s.viewed
      }));

      // Merge: manter notificações locais que não existam no servidor e adicionar/replace as do servidor
      const byKey = new Map();
      mapped.forEach(n => byKey.set(String(n.id), n));
      this.notifications.forEach(n => {
        const key = n.id ? String(n.id) : `local-${n.timestamp}`;
        if (!byKey.has(String(n.id))) byKey.set(key, n);
      });

      this.notifications = Array.from(byKey.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.saveToLocalStorage();
      this.renderNotifications();
      this.updateBadge();
    } catch (e) {
      console.error('Erro ao sincronizar notificações com o servidor:', e);
    }
  }

  // Adicione esta função à classe NotificationSystem
  clearAllNotifications() {
    if (this.notifications.length === 0) {
      return; // Não faz nada se não houver notificações
    }

    this.notifications = [];
    this.saveToLocalStorage();
    this.renderNotifications();
    this.updateBadge();

    // Opcional: Mostrar feedback visual
    this.showClearFeedback();
    const usuarioLogado = (typeof window !== 'undefined' && !!window.APP_USER) ? true : false;
    if (usuarioLogado) {
      fetch('/notifications/clear', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    }
  }

  // Método auxiliar para mostrar feedback (opcional)
  showClearFeedback() {
    // Cria um toast/feedback temporário
    const toast = document.createElement("div");
    toast.textContent = "Todas as notificações foram removidas";
    toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10000;
    animation: fadeInOut 3s ease-in-out;
  `;

    document.body.appendChild(toast);

    // Remove o toast após 3 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  setupEventListeners() {
    // Toggle dropdown
    const notifBtn = document.getElementById("notificationsButton");
    if (notifBtn) {
      notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        // Verifica se o usuário está logado
        const usuarioLogado = (typeof window !== 'undefined' && !!window.APP_USER) ? true : false;
        if (!usuarioLogado) {
          window.location.href = "/login";
          return;
        }

        this.toggleDropdown();
      });
    }

    // Marcar todas notificações como lidas
    const markAllBtn = document.getElementById("markAllRead");
    if (markAllBtn) markAllBtn.addEventListener("click", () => this.markAllAsRead());

    // Limpar todas as notificações (NOVO)
    const clearAllBtn = document.getElementById("clearAllNotifications");
    if (clearAllBtn) clearAllBtn.addEventListener("click", () => this.clearAllNotifications());

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", () => {
      this.closeDropdown();
    });

    // Prevenir fechamento ao clicar dentro do dropdown
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) dropdown.addEventListener("click", (e) => e.stopPropagation());
  }

  handleStorageEvent(event) {
    if (!event || event.key !== 'userNotifications') return;
    try {
      const newVal = event.newValue ? JSON.parse(event.newValue) : [];
      this.notifications = Array.isArray(newVal) ? newVal : [];
      this.renderNotifications();
      this.updateBadge();
    } catch (e) {
      console.error('Erro ao aplicar alterações de storage:', e);
    }
  }

  toggleDropdown() {
    const dropdown = document.getElementById("notificationsDropdown");
    dropdown.classList.toggle("active");

    if (dropdown.classList.contains("active")) {
      this.markAllAsRead();
    }
  }

  closeDropdown() {
    document.getElementById("notificationsDropdown").classList.remove("active");
  }

  addNotification(notification) {
    const newNotification = {
      id: Date.now(),
      notification_id: notification.notification_id || null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      newsId: notification.newsId,
      sent_at: notification.sent_at || null,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.saveToLocalStorage();
    this.renderNotifications();
    this.updateBadge();
  }

  markAsRead(notificationId) {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (notification && !notification.read) {
      notification.read = true;
      this.saveToLocalStorage();
      this.renderNotifications();
      this.updateBadge();
      // sincroniza com servidor
      const usuarioLogado = (typeof window !== 'undefined' && !!window.APP_USER) ? true : false;
      if (usuarioLogado) {
        fetch(`/notifications/${notificationId}/viewed`, { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      }
    }
  }

  markAllAsRead() {
    let updated = false;
    this.notifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        updated = true;
      }
    });

    if (updated) {
      this.saveToLocalStorage();
      this.renderNotifications();
      this.updateBadge();
      const usuarioLogado = (typeof window !== 'undefined' && !!window.APP_USER) ? true : false;
      if (usuarioLogado) {
        fetch('/notifications/mark_all_read', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      }
    }
  }

  getNotificationIcon(type) {
    const icons = {
      update: "🔄",
      reminder: "⏰",
      expiry: "⚠️",
      favorite: "⭐",
    };
    return `<span class="notification-icon">${icons[type]}</span>`;
  }

  formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  }

  renderNotifications() {
    const container = document.getElementById("notificationsList");
    const badge = document.getElementById("notificationBadge");

    if (!container || !badge) return;

    const unreadCount = this.notifications.filter((n) => !n.read).length;
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="notification-item read">
          <div class="notification-content" style="text-align: center;">
            <div class="notification-message">Nenhuma notificação</div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications
      .map(
        (notification) => `
      <div class="notification-item ${notification.read ? "read" : "unread"}" 
           onclick="notificationSystem.markAsRead(${notification.id})">
        ${this.getNotificationIcon(notification.type)}
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message}</div>
          <div class="notification-time">${this.formatTime(
            notification.timestamp
          )}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  updateBadge() {
    const unreadCount = this.notifications.filter((n) => !n.read).length;
    const badge = document.getElementById("notificationBadge");
    if (!badge) return;

    badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();

    // Adicionar animação quando há novas notificações
    if (unreadCount > 0) {
      badge.style.animation = "pulse 2s infinite";
    } else {
      badge.style.animation = "none";
    }
  }

  saveToLocalStorage() {
    localStorage.setItem("userNotifications", JSON.stringify(this.notifications));
    try {
      // notifica outras listeners na mesma janela (storage não dispara na mesma janela)
      window.dispatchEvent(new CustomEvent('notifications:updated', { detail: this.notifications }));
    } catch (e) {
      // ignore
    }
  }

  checkForNewNotifications() {
    // Simular notificações baseadas em notícias favoritadas
    const favoriteNews = JSON.parse(localStorage.getItem("favoriteNews")) || [];

    favoriteNews.forEach((news) => {
      // Simular atualizações ocasionais
      if (
        Math.random() < 0.3 &&
        !this.notifications.some((n) => n.newsId === news.id)
      ) {
        this.addNotification({
          type: "update",
          title: "Atualização na notícia",
          message: `"${news.title}" recebeu uma atualização`,
          newsId: news.id,
        });
      }
    });
  }

  // Método para simular notificações (para teste)
  simulateNotification() {
    const types = ["update", "reminder", "expiry", "favorite"];
    const messages = [
      "Nova oportunidade disponível na sua área",
      "Lembrete: Prazo se aproximando",
      "Atualização importante na vaga que você favoritou",
      "Novo conteúdo adicionado",
      "A sua notícia favorita está quase expirando",
    ];

    this.addNotification({
      type: types[Math.floor(Math.random() * types.length)],
      title: "Nova notificação",
      message: messages[Math.floor(Math.random() * messages.length)],
      newsId: Date.now(),
    });
  }
}

// Função auxiliar para inicializar o sistema de notificações
function initNotificationSystem() {
  if (!window.notificationSystem) {
    window.notificationSystem = new NotificationSystem();
    
    // Adicionar CSS para animação do badge
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
  return window.notificationSystem;
}

// Exporta para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationSystem, initNotificationSystem };
}
