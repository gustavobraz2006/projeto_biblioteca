const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/usuarios/registro
router.post('/registro', (req, res) => {
  const { nome, email, senha, perfil } = req.body;

  // Validação simples: todos os campos são obrigatórios
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  }

  const sql = 'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)';
  db.query(sql, [nome, email, senha, perfil], (err, result) => {
    if (err) {
      // Erro de email duplicado
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Email já cadastrado.' });
      }
      return res.status(500).json({ erro: 'Erro ao registrar usuário.' });
    }
    res.status(201).json({ mensagem: 'Usuário registrado com sucesso!' });
  });
});

// POST /api/usuarios/login
router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
  }

  const sql = 'SELECT id, nome, perfil FROM usuarios WHERE email = ? AND senha = ?';
  db.query(sql, [email, senha], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao fazer login.' });

    if (results.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha inválidos.' });
    }

    // Retorna os dados do usuário para o frontend guardar
    const usuario = results[0];
    res.json({ mensagem: 'Login realizado com sucesso!', usuario });
  });
});

module.exports = router;