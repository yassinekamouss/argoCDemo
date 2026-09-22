const express = require("express");
const mongoose = require("mongoose");

const app = express();

const PORT = process.env.PORT || 3000;

const MONGO_HOST = process.env.MONGO_HOST || "mongodb";
const MONGO_PORT = process.env.MONGO_PORT || "27017";
const MONGO_DATABASE = process.env.MONGO_DATABASE || "users";
const MONGO_USERNAME = process.env.MONGO_USERNAME || "admin";
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || "password";

const MONGO_URI =
  `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}` +
  `@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}?authSource=admin`;

app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 150
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    setTimeout(connectToMongoDB, 5000);
  }
}

app.get("/health", async (req, res) => {
  const mongoStatus =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  res.json({
    status: "ok",
    mongodb: mongoStatus
  });
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to retrieve users"
    });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, age } = req.body;

    if (!name || age === undefined) {
      return res.status(400).json({
        error: "name and age are required"
      });
    }

    const user = await User.create({
      name,
      age
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to create user"
    });
  }
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kubernetes MongoDB Demo</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 700px;
            margin: 50px auto;
            padding: 20px;
          }

          input, button {
            padding: 10px;
            margin: 5px 0;
          }

          button {
            cursor: pointer;
          }

          li {
            margin: 8px 0;
          }
        </style>
      </head>

      <body>
        <h1>Kubernetes + Express + MongoDB</h1>

        <form id="userForm">
          <div>
            <input
              id="name"
              type="text"
              placeholder="Name"
              required
            />
          </div>

          <div>
            <input
              id="age"
              type="number"
              placeholder="Age"
              min="0"
              max="150"
              required
            />
          </div>

          <button type="submit">
            Save user
          </button>
        </form>

        <h2>Users</h2>

        <ul id="users"></ul>

        <script>
          async function loadUsers() {
            const response = await fetch("/api/users");
            const users = await response.json();

            const list = document.getElementById("users");

            list.innerHTML = "";

            users.forEach(user => {
              const item = document.createElement("li");

              item.textContent =
                user.name + " - " + user.age + " years old";

              list.appendChild(item);
            });
          }

          document
            .getElementById("userForm")
            .addEventListener("submit", async event => {

              event.preventDefault();

              const name =
                document.getElementById("name").value;

              const age =
                Number(document.getElementById("age").value);

              const response = await fetch("/api/users", {
                method: "POST",

                headers: {
                  "Content-Type": "application/json"
                },

                body: JSON.stringify({
                  name,
                  age
                })
              });

              if (!response.ok) {
                alert("Failed to save user");
                return;
              }

              document
                .getElementById("userForm")
                .reset();

              await loadUsers();
            });

          loadUsers();
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  connectToMongoDB();
});
