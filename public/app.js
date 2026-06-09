// Alterna entre as abas de login e registro
function mostrarAba(aba) {
  document.getElementById('form-login').classList.add('escondido');
  document.getElementById('form-registro').classList.add('escondido');
  document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));

  document.getElementById(`form-${aba}`).classList.remove('escondido');
  event.target.classList.add('ativa');
}

// Faz o registro do usuário
async function fazerRegistro() {
  const nome = document.getElementById('reg-nome').value;
  const email = document.getElementById('reg-email').value;
  const senha = document.getElementById('reg-senha').value;
  const perfil = document.getElementById('reg-perfil').value;
  const msg = document.getElementById('msg-registro');

  if (!nome || !email || !senha || !perfil) {
    msg.textContent = 'Preencha todos os campos.';
    msg.className = 'mensagem erro';
    return;
  }

  try {
    const resposta = await fetch('/api/usuarios/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, perfil })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      msg.textContent = dados.erro;
      msg.className = 'mensagem erro';
      return;
    }

    msg.textContent = 'Conta criada com sucesso! Faça login.';
    msg.className = 'mensagem sucesso';

  } catch (err) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.className = 'mensagem erro';
  }
}

// Faz o login do usuário
async function fazerLogin() {
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  const msg = document.getElementById('msg-login');

  if (!email || !senha) {
    msg.textContent = 'Preencha todos os campos.';
    msg.className = 'mensagem erro';
    return;
  }

  try {
    const resposta = await fetch('/api/usuarios/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      msg.textContent = dados.erro;
      msg.className = 'mensagem erro';
      return;
    }

    // Salva os dados do usuário no localStorage
    localStorage.setItem('usuario', JSON.stringify(dados.usuario));

    // Redireciona conforme o perfil
    if (dados.usuario.perfil === 'bibliotecario') {
      window.location.href = 'bibliotecario.html';
    } else {
      window.location.href = 'leitor.html';
    }

  } catch (err) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.className = 'mensagem erro';
  }
}