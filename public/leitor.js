
const usuario = JSON.parse(localStorage.getItem('usuario'));


if (!usuario || usuario.perfil !== 'leitor') {
  window.location.href = 'index.html';
}


carregarLivros();
carregarMeusEmprestimos();



async function carregarLivros() {
  const resposta = await fetch('/api/livros');
  const livros = await resposta.json();
  const corpo = document.getElementById('corpo-livros');
  corpo.innerHTML = '';

  livros.forEach(livro => {
    const semEstoque = livro.quantidade_disponivel <= 0;

    corpo.innerHTML += `
      <tr>
        <td>${livro.id}</td>
        <td>${livro.titulo}</td>
        <td>${livro.autor}</td>
        <td>${livro.ano_publicacao || '—'}</td>
        <td>${livro.quantidade_disponivel}</td>
        <td>
          <button 
            onclick="abrirModal(${livro.id}, '${livro.titulo}')"
            ${semEstoque ? 'disabled' : ''}
          >
            ${semEstoque ? 'Indisponível' : 'Solicitar'}
          </button>
        </td>
      </tr>
    `;
  });
}



function abrirModal(livroId, livroTitulo) {
  document.getElementById('modal-livro-id').value = livroId;
  document.getElementById('modal-livro-nome').textContent = `Livro: ${livroTitulo}`;
  document.getElementById('modal-data-devolucao').value = '';
  document.getElementById('msg-emprestimo').textContent = '';
  document.getElementById('modal-emprestimo').classList.remove('escondido');
}

function fecharModal() {
  document.getElementById('modal-emprestimo').classList.add('escondido');
}

async function confirmarEmprestimo() {
  const livro_id = document.getElementById('modal-livro-id').value;
  const data_devolucao_prevista = document.getElementById('modal-data-devolucao').value;
  const msg = document.getElementById('msg-emprestimo');

  if (!data_devolucao_prevista) {
    msg.textContent = 'Selecione a data de devolução.';
    msg.className = 'mensagem erro';
    return;
  }


  const hoje = new Date().toISOString().split('T')[0];
  if (data_devolucao_prevista <= hoje) {
    msg.textContent = 'A data de devolução deve ser futura.';
    msg.className = 'mensagem erro';
    return;
  }

  const resposta = await fetch('/api/emprestimos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      livro_id,
      leitor_id: usuario.id,
      perfil: usuario.perfil,
      data_devolucao_prevista
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    msg.textContent = dados.erro;
    msg.className = 'mensagem erro';
    return;
  }

  msg.textContent = 'Empréstimo solicitado com sucesso!';
  msg.className = 'mensagem sucesso';


  setTimeout(() => {
    fecharModal();
    carregarLivros();
    carregarMeusEmprestimos();
  }, 1000);
}



async function carregarMeusEmprestimos() {
  const resposta = await fetch(`/api/emprestimos/meus/${usuario.id}`);
  const emprestimos = await resposta.json();
  const corpo = document.getElementById('corpo-meus-emprestimos');
  corpo.innerHTML = '';

  if (emprestimos.length === 0) {
    corpo.innerHTML = '<tr><td colspan="6">Você não tem empréstimos.</td></tr>';
    return;
  }

  emprestimos.forEach(emp => {
    const podeDevolver = emp.status === 'ativo' || emp.status === 'atrasado';
    const aguardando = emp.status === 'pedido_devolucao';

    corpo.innerHTML += `
      <tr>
        <td>${emp.id}</td>
        <td>${emp.livro}</td>
        <td>${emp.data_emprestimo}</td>
        <td>${emp.data_devolucao_prevista}</td>
        <td class="status-${emp.status}">${emp.status}</td>
        <td>
          ${podeDevolver
            ? `<button onclick="solicitarDevolucao(${emp.id})">Solicitar Devolução</button>`
            : aguardando
              ? 'Aguardando aprovação'
              : '—'
          }
        </td>
      </tr>
    `;
  });
}

async function solicitarDevolucao(id) {
  if (!confirm('Deseja solicitar a devolução deste livro?')) return;

  const resposta = await fetch(`/api/emprestimos/${id}/solicitar-devolucao`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil: usuario.perfil })
  });

  const dados = await resposta.json();
  alert(dados.mensagem || dados.erro);
  carregarMeusEmprestimos();
}



function sair() {
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}
