(function(){
  function qs(id){return document.getElementById(id)}
  const btn = qs('notificationsButton');
  const dd = qs('notificationsDropdown');
  const badge = qs('notificationBadge');
  const list = qs('notificationsList');
  const markAllBtn = qs('markAllRead');
  const clearBtn = qs('clearAllNotifications');
  if(!btn || !dd || !badge || !list) return;

  function render(items){
    if(!Array.isArray(items) || items.length===0){
      list.innerHTML = '<div class="notification-item read"><div class="notification-content" style="text-align:center">Nenhuma notificação</div></div>';
      return;
    }
    list.innerHTML = items.map(n => {
      const title = (n.news_title && n.news_title !== 'undefined') ? n.news_title : (n.message ? n.message.slice(0,40) : 'Notificação');
      const msg = n.message || '';
      const time = n.sent_at || '';
      const nid = n.news_id || n.newsId || '';
      return `
      <div class="notification-item ${n.viewed? 'read':'unread'}" data-id="${n.id}" data-news-id="${nid}">
        <div class="notification-content">
          <div class="notification-title">${title}</div>
          <div class="notification-message">${msg}</div>
          <div class="notification-time">${time}</div>
        </div>
      </div>`;
    }).join('');

    // attach click handlers to items to navigate appropriately
    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const newsId = item.dataset.newsId || null;
        const nid = newsId || '';
        if (nid) {
          // navigate to admin pending view, focusing on the news
          window.location.href = `/admin/news/pending/view?focus=${encodeURIComponent(nid)}`;
          return;
        }
      });
    });
  }

  async function fetchAll(){
    try{
      const r = await fetch('/notifications?page=1&per_page=10', { credentials:'same-origin' });
      if(!r.ok) return;
      const data = await r.json();
      render(data.notifications || []);
    }catch(e){/* ignore */}
  }

  async function pollUnread(){
    try{
      const r = await fetch('/notifications/unread-count', { credentials:'same-origin' });
      if(!r.ok) return;
      const d = await r.json();
      const unread = d.unread || 0;
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.animation = unread > 0 ? 'pulse 2s infinite' : 'none';
    }catch(e){}
  }

  async function markAll(){
    try{ await fetch('/notifications/mark-all-viewed', { method:'POST', credentials:'same-origin' }); }catch(e){}
    await fetchAll();
    await pollUnread();
  }

  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    dd.classList.toggle('active');
    if(dd.classList.contains('active')){
      markAll();
    }
  });
  document.addEventListener('click', ()=> dd.classList.remove('active'));
  if(dd) dd.addEventListener('click', (e)=> e.stopPropagation());

  if(markAllBtn) markAllBtn.addEventListener('click', markAll);
  if(clearBtn) clearBtn.addEventListener('click', ()=>{ list.innerHTML=''; badge.textContent='0'; badge.style.animation='none'; });

  // initial
  fetchAll();
  pollUnread();
  setInterval(pollUnread, 15000);

  // add badge animation keyframes
  const style = document.createElement('style');
  style.textContent = '@keyframes pulse {0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}';
  document.head.appendChild(style);
})();
