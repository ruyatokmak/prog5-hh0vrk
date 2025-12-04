const express = require("express");
const app = express();
app.use(express.json());

let nextUserId = 1;
const usersById = new Map();
const usersByName = new Map();

// Register/login with username
app.post("/register", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username required" });
  }

  // if username already exists, just return it (login)
  if (usersByName.has(username)) {
    const user = usersByName.get(username);
    return res.json(user);
  }

  const user = {
    userId: String(nextUserId++),
    username
  };

  usersById.set(user.userId, user);
  usersByName.set(username, user);

  res.json(user);
});

// Optional: validate userId (used by other services if needed)
app.post("/validate", (req, res) => {
  const { userId } = req.body;
  const valid = usersById.has(userId);
  res.json({ valid });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`User Service listening on http://localhost:${PORT}`);
});
