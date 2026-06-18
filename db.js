const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'CAMPeao20*6',
  database: 'biblioteca',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function createUsuariosTable(next) {
  const sql = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      perfil ENUM('bibliotecario','leitor') NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  db.query(sql, err => {
    if (err) throw err;
    next();
  });
}

function createLivrosTable(next) {
  const sql = `
    CREATE TABLE IF NOT EXISTS livros (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      autor VARCHAR(255) NOT NULL,
      ano_publicacao INT NULL,
      quantidade_disponivel INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  db.query(sql, err => {
    if (err) throw err;
    next();
  });
}

function createEmprestimosTable(next) {
  const sql = `
    CREATE TABLE IF NOT EXISTS emprestimos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      id_livro INT NOT NULL,
      id_leitor INT NOT NULL,
      data_emprestimo DATE NOT NULL,
      data_devolucao_prevista DATE NOT NULL,
      data_devolucao DATE DEFAULT NULL,
      status ENUM('ativo','devolvido','atrasado','pedido_devolucao') NOT NULL DEFAULT 'ativo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_emprestimos_livros FOREIGN KEY (id_livro) REFERENCES livros(id) ON DELETE CASCADE,
      CONSTRAINT fk_emprestimos_usuarios FOREIGN KEY (id_leitor) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  db.query(sql, err => {
    if (err) throw err;
    next();
  });
}

function renameLegacyEmprestimos(next) {
  db.query("SHOW TABLES LIKE 'emprestimos'", (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return createEmprestimosTable(next);
    }

    db.query("SHOW COLUMNS FROM emprestimos LIKE 'status'", (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        return next();
      }

      const legacyName = `emprestimos_legacy_${Date.now()}`;
      db.query(`RENAME TABLE emprestimos TO \`${legacyName}\``, err => {
        if (err) throw err;
        createEmprestimosTable(next);
      });
    });
  });
}

function setupDatabase() {
  createUsuariosTable(() => {
    createLivrosTable(() => {
      renameLegacyEmprestimos(() => {
        console.log('Banco de dados preparado.');
      });
    });
  });
}

// Ensure database schema exists. Using pool so no explicit connect is required.
setupDatabase();

console.log('Banco de dados (pool) inicializado.');

module.exports = db;