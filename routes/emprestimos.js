const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/', (req, res) => {
  const sql = `
    SELECT 
      emprestimos.id,
      usuarios.nome AS leitor,
      livros.titulo AS livro,
      emprestimos.data_emprestimo,
      emprestimos.data_devolucao_prevista,
      emprestimos.data_devolucao_real,
      emprestimos.status
    FROM emprestimos
    JOIN usuarios ON emprestimos.leitor_id = usuarios.id
    JOIN livros ON emprestimos.livro_id = livros.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar empréstimos.' });
    res.json(results);
  });
});


router.get('/meus/:leitor_id', (req, res) => {
  const { leitor_id } = req.params;

  const sql = `
    SELECT 
      emprestimos.id,
      livros.titulo AS livro,
      emprestimos.data_emprestimo,
      emprestimos.data_devolucao_prevista,
      emprestimos.data_devolucao_real,
      emprestimos.status
    FROM emprestimos
    JOIN livros ON emprestimos.livro_id = livros.id
    WHERE emprestimos.leitor_id = ?
  `;
  db.query(sql, [leitor_id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar seus empréstimos.' });
    res.json(results);
  });
});


router.post('/', (req, res) => {
  const { livro_id, leitor_id, perfil, data_devolucao_prevista } = req.body;

  if (perfil !== 'leitor') {
    return res.status(403).json({ erro: 'Apenas leitores podem solicitar empréstimos.' });
  }

  if (!livro_id || !leitor_id || !data_devolucao_prevista) {
    return res.status(400).json({ erro: 'Livro, leitor e data de devolução são obrigatórios.' });
  }

 
  db.query('SELECT quantidade_disponivel FROM livros WHERE id = ?', [livro_id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao verificar livro.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Livro não encontrado.' });

    const quantidade = results[0].quantidade_disponivel;
    if (quantidade <= 0) {
      return res.status(400).json({ erro: 'Livro sem estoque disponível.' });
    }

    const data_emprestimo = new Date().toISOString().split('T')[0]; 

    
    const sqlEmprestimo = `
      INSERT INTO emprestimos (livro_id, leitor_id, data_emprestimo, data_devolucao_prevista, status)
      VALUES (?, ?, ?, ?, 'ativo')
    `;
    db.query(sqlEmprestimo, [livro_id, leitor_id, data_emprestimo, data_devolucao_prevista], (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao registrar empréstimo.' });

      
      db.query('UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?', [livro_id], (err) => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar estoque.' });
        res.status(201).json({ mensagem: 'Empréstimo solicitado com sucesso!' });
      });
    });
  });
});


router.put('/:id/devolver', (req, res) => {
  const { perfil } = req.body;
  const { id } = req.params;

  if (perfil !== 'bibliotecario') {
    return res.status(403).json({ erro: 'Apenas bibliotecários podem aprovar devoluções.' });
  }


  db.query('SELECT * FROM emprestimos WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar empréstimo.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado.' });

    const emprestimo = results[0];

    if (emprestimo.status === 'devolvido') {
      return res.status(400).json({ erro: 'Este empréstimo já foi devolvido.' });
    }

    const data_devolucao_real = new Date().toISOString().split('T')[0];

   
    const sqlAtualiza = `
      UPDATE emprestimos 
      SET status = 'devolvido', data_devolucao_real = ? 
      WHERE id = ?
    `;
    db.query(sqlAtualiza, [data_devolucao_real, id], (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao registrar devolução.' });

   
      db.query('UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?', [emprestimo.livro_id], (err) => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar estoque.' });
        res.json({ mensagem: 'Devolução registrada com sucesso!' });
      });
    });
  });
});


router.put('/:id/solicitar-devolucao', (req, res) => {
  const { perfil } = req.body;
  const { id } = req.params;

  if (perfil !== 'leitor') {
    return res.status(403).json({ erro: 'Apenas leitores podem solicitar devoluções.' });
  }

  db.query('UPDATE emprestimos SET status = ? WHERE id = ?', ['pendente_devolucao', id], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao solicitar devolução.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
    res.json({ mensagem: 'Solicitação de devolução enviada!' });
  });
});

module.exports = router;
