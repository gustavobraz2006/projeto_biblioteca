const express = require('express');
const app = express();
const port = 3000;
const path = require('path');

const usuariosRoutes = require('./routes/usuarios');
const emprestimosRoutes = require('./routes/emprestimos');
const livrosRoutes = require('./routes/livros');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/emprestimos', emprestimosRoutes);
app.use('/api/livros', livrosRoutes);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

