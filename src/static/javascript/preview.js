const descricao = document.getElementById('descricao');
const preview = document.getElementById('preview');

descricao.addEventListener('input', () => {
  preview.innerHTML = marked.parse(descricao.value);
});
