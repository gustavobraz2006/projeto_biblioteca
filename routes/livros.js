const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/', (req, res) => {
  db.query('SELECT * FROM livros', (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar livros.' });
    res.json(results);
  });
});


router.post('/', (req, res) => {
  const { titulo, autor, ano_publicacao, quantidade_disponivel, perfil } = req.body;

  if (perfil !== 'bibliotecario') {
    return res.status(403).json({ erro: 'Apenas bibliotecários podem cadastrar livros.' });
  }

  if (!titulo || !autor || !quantidade_disponivel) {
    return res.status(400).json({ erro: 'Título, autor e quantidade são obrigatórios.' });
  }

  const sql = 'INSERT INTO livros (titulo, autor, ano_publicacao, quantidade_disponivel) VALUES (?, ?, ?, ?)';
  db.query(sql, [titulo, autor, ano_publicacao || null, quantidade_disponivel], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao cadastrar livro.' });
    res.status(201).json({ mensagem: 'Livro cadastrado com sucesso!' });
  });
});


router.put('/:id', (req, res) => {
  const { titulo, autor, ano_publicacao, quantidade_disponivel, perfil } = req.body;
  const { id } = req.params;

  if (perfil !== 'bibliotecario') {
    return res.status(403).json({ erro: 'Apenas bibliotecários podem editar livros.' });
  }

  const sql = 'UPDATE livros SET titulo = ?, autor = ?, ano_publicacao = ?, quantidade_disponivel = ? WHERE id = ?';
  db.query(sql, [titulo, autor, ano_publicacao || null, quantidade_disponivel, id], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao atualizar livro.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Livro não encontrado.' });
    res.json({ mensagem: 'Livro atualizado com sucesso!' });
  });
});


router.delete('/:id', (req, res) => {
  const { perfil } = req.body;
  const { id } = req.params;

  if (perfil !== 'bibliotecario') {
    return res.status(403).json({ erro: 'Apenas bibliotecários podem remover livros.' });
  }

  db.query('DELETE FROM livros WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao remover livro.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Livro não encontrado.' });
    res.json({ mensagem: 'Livro removido com sucesso!' });
  });
});

module.exports = router;
