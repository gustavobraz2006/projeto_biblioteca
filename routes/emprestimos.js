const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');

function atualizarEmprestimosAtrasados(callback) {
  const sql = `
    UPDATE emprestimos
    SET status = 'atrasado'
    WHERE status = 'ativo'
      AND data_devolucao_prevista < CURDATE()
  `;
  db.query(sql, callback);
}

router.get('/', (req, res) => {
  atualizarEmprestimosAtrasados(err => {
    if (err) return res.status(500).json({ erro: 'Erro ao atualizar status de empréstimos.' });

    const sql = `
      SELECT 
        emprestimos.id,
        usuarios.nome AS leitor,
        livros.titulo AS livro,
        emprestimos.data_emprestimo,
        emprestimos.data_devolucao_prevista,
        emprestimos.data_devolucao AS data_devolucao_real,
        emprestimos.status
      FROM emprestimos
      JOIN usuarios ON emprestimos.id_leitor = usuarios.id
      JOIN livros ON emprestimos.id_livro = livros.id
    `;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ erro: 'Erro ao buscar empréstimos.' });
      res.json(results);
    });
  });
});

router.get('/meus/:leitor_id', (req, res) => {
  const { leitor_id } = req.params;

  atualizarEmprestimosAtrasados(err => {
    if (err) return res.status(500).json({ erro: 'Erro ao atualizar status de empréstimos.' });

    const sql = `
      SELECT 
        emprestimos.id,
        livros.titulo AS livro,
        emprestimos.data_emprestimo,
        emprestimos.data_devolucao_prevista,
        emprestimos.data_devolucao AS data_devolucao_real,
        emprestimos.status
      FROM emprestimos
      JOIN livros ON emprestimos.id_livro = livros.id
      WHERE emprestimos.id_leitor = ?
    `;
    db.query(sql, [leitor_id], (err, results) => {
      if (err) return res.status(500).json({ erro: 'Erro ao buscar seus empréstimos.' });
      res.json(results);
    });
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

  const hoje = new Date().toISOString().split('T')[0];
  if (data_devolucao_prevista <= hoje) {
    return res.status(400).json({ erro: 'A data de devolução prevista deve ser posterior à data de hoje.' });
  }

  try{ fs.appendFileSync('emprestimos_debug.log', new Date().toISOString() + ' START emprestimo livro=' + livro_id + ' leitor=' + leitor_id + '\n'); }catch(e){}

  db.query('SELECT quantidade_disponivel FROM livros WHERE id = ?', [livro_id], (err, results) => {
    try{ fs.appendFileSync('emprestimos_debug.log', new Date().toISOString() + ' AFTER SELECT err=' + (err?err.message:'null') + ' rows=' + (results?results.length:0) + '\n'); }catch(e){}
    if (err) return res.status(500).json({ erro: 'Erro ao verificar livro.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Livro não encontrado.' });

    const quantidade = results[0].quantidade_disponivel;
    if (quantidade <= 0) {
      return res.status(400).json({ erro: 'Livro sem estoque disponível.' });
    }

    const data_emprestimo = new Date().toISOString().split('T')[0];

    const sqlEmprestimo = `
      INSERT INTO emprestimos (id_livro, id_leitor, data_emprestimo, data_devolucao_prevista, status)
      VALUES (?, ?, ?, ?, 'ativo')
    `;
    try{ fs.appendFileSync('emprestimos_debug.log', new Date().toISOString() + ' BEFORE INSERT\n'); }catch(e){}
    db.query(sqlEmprestimo, [livro_id, leitor_id, data_emprestimo, data_devolucao_prevista], (err) => {
      try{ fs.appendFileSync('emprestimos_debug.log', new Date().toISOString() + ' AFTER INSERT err=' + (err?err.message:'null') + '\n'); }catch(e){}
      if (err) {
        console.error('Erro ao inserir empréstimo:', err);
        try { fs.appendFileSync('emprestimos_error.log', new Date().toISOString() + ' INSERT ERROR: ' + (err.stack||err.message) + '\n'); } catch(e){}
        return res.status(500).json({ erro: 'Erro ao registrar empréstimo.', detail: err.message });
      }

      try{ fs.appendFileSync('emprestimos_debug.log', new Date().toISOString() + ' BEFORE UPDATE LIVROS\n'); }catch(e){}
      db.query('UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?', [livro_id], (err) => {
        try{ fs.appendFileSync('emprestimos_debug.log', new Date().toISOString() + ' AFTER UPDATE err=' + (err?err.message:'null') + '\n'); }catch(e){}
        if (err) {
          console.error('Erro ao atualizar estoque após empréstimo:', err);
          try { fs.appendFileSync('emprestimos_error.log', new Date().toISOString() + ' UPDATE ERROR: ' + (err.stack||err.message) + "\n"); } catch(e){}
          return res.status(500).json({ erro: 'Erro ao atualizar estoque.', detail: err.message });
        }
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
      SET status = 'devolvido', data_devolucao = ? 
      WHERE id = ?
    `;
    db.query(sqlAtualiza, [data_devolucao_real, id], (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao registrar devolução.' });

      db.query('UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?', [emprestimo.id_livro], (err) => {
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

  db.query('SELECT status FROM emprestimos WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar empréstimo.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado.' });

    const emprestimo = results[0];
    if (emprestimo.status === 'devolvido') {
      return res.status(400).json({ erro: 'Este empréstimo já foi devolvido.' });
    }

    const sqlSolicitacao = 'UPDATE emprestimos SET status = ? WHERE id = ?';
    db.query(sqlSolicitacao, ['pedido_devolucao', id], (err, result) => {
      if (err) return res.status(500).json({ erro: 'Erro ao solicitar devolução.' });
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado.' });

      res.json({ mensagem: 'Solicitação de devolução enviada! Aguarde aprovação do bibliotecário.' });
    });
  });
});

module.exports = router;
