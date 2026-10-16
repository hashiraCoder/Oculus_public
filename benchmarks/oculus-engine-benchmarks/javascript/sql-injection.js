const db = require('db');

function getUser(req, res) {
    const id = req.body.id;
    // Vulnerable string concatenation
    db.query("SELECT * FROM users WHERE id=" + id);
}

function getUserTemplate(req, res) {
    const id = req.body.id;
    // Vulnerable template literal
    db.query(`SELECT * FROM users WHERE id=${id}`);
}

function safeQuery(req, res) {
    // Safe literal query
    db.query("SELECT * FROM users");
}
