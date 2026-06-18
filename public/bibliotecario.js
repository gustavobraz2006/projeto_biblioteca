
const usuario = JSON.parse(localStorage.getItem('usuario'));


if (!usuario || usuario.perfil !== 'bibliotecario') {
  window.location.href = 'index.html';
}


carregarLivros();
carregarEmprestimos();



async function carregarLivros() {
  const resposta = await fetch('/api/livros');
  const livros = await resposta.json();
  const corpo = document.getElementById('corpo-livros');
  corpo.innerHTML = '';

  livros.forEach(livro => {
    corpo.innerHTML += `
      <tr>
        <td>${livro.id}</td>
        <td>${livro.titulo}</td>
        <td>${livro.autor}</td>
        <td>${livro.ano_publicacao || '—'}</td>
        <td>${livro.quantidade_disponivel}</td>
        <td>
          <button onclick="abrirEdicao(${livro.id}, '${livro.titulo}', '${livro.autor}', ${livro.ano_publicacao || 0}, ${livro.quantidade_disponivel})">Editar</button>
          <button onclick="excluirLivro(${livro.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

async function cadastrarLivro() {
  const titulo = document.getElementById('livro-titulo').value;
  const autor = document.getElementById('livro-autor').value;
  const ano_publicacao = document.getElementById('livro-ano').value;
  const quantidade_disponivel = document.getElementById('livro-quantidade').value;
  const msg = document.getElementById('msg-livro');

  if (!titulo || !autor || !quantidade_disponivel) {
    msg.textContent = 'Preencha todos os campos obrigatórios.';
    msg.className = 'mensagem erro';
    return;
  }

  const resposta = await fetch('/api/livros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, autor, ano_publicacao, quantidade_disponivel, perfil: usuario.perfil })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    msg.textContent = dados.erro;
    msg.className = 'mensagem erro';
    return;
  }

  msg.textContent = 'Livro cadastrado com sucesso!';
  msg.className = 'mensagem sucesso';

  document.getElementById('livro-titulo').value = '';
  document.getElementById('livro-autor').value = '';
  document.getElementById('livro-ano').value = '';
  document.getElementById('livro-quantidade').value = '';
  carregarLivros();
}

function abrirEdicao(id, titulo, autor, ano, quantidade) {
  document.getElementById('form-editar').classList.remove('escondido');
  document.getElementById('editar-id').value = id;
  document.getElementById('editar-titulo').value = titulo;
  document.getElementById('editar-autor').value = autor;
  document.getElementById('editar-ano').value = ano || '';
  document.getElementById('editar-quantidade').value = quantidade;

  document.getElementById('form-editar').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicao() {
  document.getElementById('form-editar').classList.add('escondido');
}

async function salvarEdicao() {
  const id = document.getElementById('editar-id').value;
  const titulo = document.getElementById('editar-titulo').value;
  const autor = document.getElementById('editar-autor').value;
  const ano_publicacao = document.getElementById('editar-ano').value;
  const quantidade_disponivel = document.getElementById('editar-quantidade').value;
  const msg = document.getElementById('msg-editar');

  const resposta = await fetch(`/api/livros/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, autor, ano_publicacao, quantidade_disponivel, perfil: usuario.perfil })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    msg.textContent = dados.erro;
    msg.className = 'mensagem erro';
    return;
  }

  msg.textContent = 'Livro atualizado com sucesso!';
  msg.className = 'mensagem sucesso';
  cancelarEdicao();
  carregarLivros();
}

async function excluirLivro(id) {
  if (!confirm('Tem certeza que deseja excluir este livro?')) return;

  const resposta = await fetch(`/api/livros/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil: usuario.perfil })
  });

  const dados = await resposta.json();
  alert(dados.mensagem || dados.erro);
  carregarLivros();
}



async function carregarEmprestimos() {
  const resposta = await fetch('/api/emprestimos');
  const emprestimos = await resposta.json();
  const corpo = document.getElementById('corpo-emprestimos');
  corpo.innerHTML = '';

  emprestimos.forEach(emp => {

    if (emp.status === 'devolvido') return;

    corpo.innerHTML += `
      <tr>
        <td>${emp.id}</td>
        <td>${emp.leitor}</td>
        <td>${emp.livro}</td>
        <td>${emp.data_emprestimo}</td>
        <td>${emp.data_devolucao_prevista}</td>
        <td>${emp.status}</td>
        <td>
          <button onclick="aprovarDevolucao(${emp.id})">Aprovar Devolução</button>
        </td>
      </tr>
    `;
  });
}

async function aprovarDevolucao(id) {
  if (!confirm('Confirmar devolução deste livro?')) return;

  const resposta = await fetch(`/api/emprestimos/${id}/devolver`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil: usuario.perfil })
  });

  const dados = await resposta.json();
  alert(dados.mensagem || dados.erro);
  carregarEmprestimos();
  carregarLivros(); 
}



function sair() {
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}
