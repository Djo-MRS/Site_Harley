const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/sell', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sell.html'));
});

app.get('/connect', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'connect.html'));
});

app.use(express.json());

const dbPath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    `);
});

app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).send('Email déjà utilisé');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function(err) {
            if (err) {
                console.error('Échec de l\'enregistrement de l\'utilisateur:', err.message);
                return res.status(500).send('Échec de l\'enregistrement de l\'utilisateur');
            }
            console.log(`L'utilisateur a été enregistré avec l'ID ${this.lastID}`);
            res.status(201).send('Utilisateur enregistré');
        });
    } catch (error) {
        console.error('Échec de l\'enregistrement de l\'utilisateur:', error.message);
        res.status(500).send('Échec de l\'enregistrement de l\'utilisateur');
    }
});

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(404).send('Utilisateur non trouvé');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send('Mot de passe incorrect');
        }

        res.status(200).send('Authentification réussie');
    } catch (error) {
        console.error('Échec de l\'authentification:', error.message);
        res.status(500).send('Échec de l\'authentification');
    }
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});