const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 3000,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Table scores prête");
}

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      error: "database_unavailable",
      message: "La base de données est indisponible.",
    });
  }
});

app.post("/scores", async (req, res) => {
  const username =
    typeof req.body.username === "string"
      ? req.body.username.trim()
      : "";

  const score = Number(req.body.score);

  if (username.length < 1 || username.length > 50) {
    return res.status(400).json({
      error: "invalid_username",
      message: "Le nom doit contenir entre 1 et 50 caractères.",
    });
  }

  if (!Number.isInteger(score) || score < 0) {
    return res.status(400).json({
      error: "invalid_score",
      message: "Le score doit être un entier positif ou nul.",
    });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO scores (username, score)
        VALUES ($1, $2)
        RETURNING id, username, score, created_at
      `,
      [username, score]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Impossible d'enregistrer le score :", error.message);

    return res.status(503).json({
      error: "database_unavailable",
      message: "Le score n'a pas pu être enregistré.",
    });
  }
});

app.get("/scores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, score, created_at
      FROM scores
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Impossible de récupérer le classement :", error.message);

    return res.status(503).json({
      error: "database_unavailable",
      message: "Le classement est temporairement indisponible.",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    message: "Route inexistante.",
  });
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(port, "0.0.0.0", () => {
      console.log(`API ClickFast disponible sur le port ${port}`);
    });
  } catch (error) {
    console.error(
      "Impossible d'initialiser la base :",
      error.message
    );

    process.exit(1);
  }
}

startServer();