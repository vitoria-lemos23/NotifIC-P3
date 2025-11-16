// admin_manage.js
// Simple management UI: fetch /news and render rows with Edit / Pause / Delete

async function fetchAllNews() {
  const res = await fetch('/news?per_page=1000', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Failed to load news');
  const j = await res.json();
  return j.news || j || [];
}

function renderRow(item) {
  const tr = document.createElement('tr');
  const statusClass = `status-${(item.status || '').toLowerCase()}`;
  tr.innerHTML = `
    <td data-label="ID">${item.id}</td>
    <td data-label="Título">${item.title}</td>
    <td data-label="Status"><span class="status-badge ${statusClass}">${item.status || ''}</span></td>
    <td data-label="Tags">${(item.tags||[]).join(', ')}</td>
    <td class="actions-cell" data-label="Ações">
      <button class="action-btn btn-edit" data-id="${item.id}">Editar</button>
      <button class="action-btn btn-pause" data-id="${item.id}">Pausar</button>
      <button class="action-btn btn-delete" data-id="${item.id}">Excluir</button>
    </td>
  `;
  return tr;
}

async function initManage() {
  const tbody = document.getElementById('news-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
  try {
    const items = await fetchAllNews();
    tbody.innerHTML = '';
    items.forEach(it => {
      const r = renderRow(it);
      tbody.appendChild(r);
    });

    // attach handlers
    tbody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', onDelete));
    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', onEdit));
    tbody.querySelectorAll('.btn-pause').forEach(b => b.addEventListener('click', onPause));
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar notícias: ${e.message}</td></tr>`;
  }
}

async function onDelete(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Confirma exclusão da notícia ' + id + '?')) return;
  try {
    const r = await fetch('/news/' + id, { method: 'DELETE', credentials: 'same-origin' });
    if (!r.ok) throw new Error('delete failed');
    alert('Notícia excluída');
    initManage();
  } catch (err) {
    alert('Falha ao excluir: ' + err.message);
  }
}

async function onPause(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Pausar/definir como pendente a notícia ' + id + '?')) return;
  try {
    const payload = { status: 'PENDENTE' };
    const r = await fetch('/news/' + id, { method: 'PUT', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error('pause failed');
    alert('Notícia pausada');
    initManage();
  } catch (err) {
    alert('Falha ao pausar: ' + err.message);
  }
}

async function onEdit(e) {
  const id = e.currentTarget.dataset.id;
  try {
    // fetch item detail
    const r = await fetch('/news/' + id, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('failed to fetch news');
    const item = await r.json();
    const newTitle = prompt('Título', item.title || '');
    if (newTitle === null) return; // cancel
    const newContent = prompt('Conteúdo', item.content || '');
    if (newContent === null) return;
    const payload = { title: newTitle, content: newContent, tags: item.tags || [] };
    const u = await fetch('/news/' + id, { method: 'PUT', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!u.ok) throw new Error('update failed');
    alert('Notícia atualizada');
    initManage();
  } catch (err) {
    alert('Falha ao editar: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', initManage);
