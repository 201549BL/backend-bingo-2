import dotenv from "dotenv";
dotenv.config();
import express, { json } from "express";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
// import { PrismaClient } from "@prisma/client";

import { createItems, createRoom } from "./room/createRoom";
import jwt from "jsonwebtoken";
import { createJwt } from "./jwt/createJwt";
import { colorArray, newColorArray } from "./colors";
import { roomManager } from "./room/roomManager";
import { chatFactory, createChat } from "./chat";
import categories from "./lib/board-categories/index";

console.log("🚀 ~ file: index.js ~ line 15 ~ roomManager", roomManager);

// roomManager.set("123", {
//   id: "123",
//   name: "Henrys game",
//   password: "123",
//   creator: "Henry",
//   game: "Minecraft",
//   isHidden: true,
//   items: createItems(),
//   players: {},
//   chats: [],
// });

// const roomMap = {};

// Object.setPrototypeOf(roomMap, {
//   getAll() {
//     return Object.values(this);
//   },
//   updateItems(rid, item) {
//     this[rid].items = this[rid].items.map((i) => (i.id !== item.id ? i : item));
//     io.to(rid).emit("update");
//   },
//   updatePlayers(rid, player) {},
//   updateItem(rid, id, owner) {
//     this[rid].items = this[rid].items.map((item) =>
//       item.id !== id
//         ? item
//         : {
//             ...item,
//             owners: item.owners.includes(owner)
//               ? item.owners.filter((own) => own !== owner)
//               : [...item.owners, owners],
//           }
//     );
//   },
// });

// roomMap["123"] = {
//   id: "123",
//   name: "Henrys game",
//   password: "123",
//   creator: "Henry",
//   game: "Minecraft",
//   isHidden: true,
//   items: createItems(),
//   players: {},
// };

// console.log(roomMap.getAll());

// const prisma = new PrismaClient();

const port = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);
app.use(json());
app.use(cookieParser(process.env.COOKIE_SECRET));

io.on("connection", (socket) => {
  console.log(`new connection: ${socket.id}`);

  socket.on("join-room", async (rid) => {
    await socket.join(rid);

    console.log("client connected to room: " + rid);

    io.to(rid).emit("update");
  });

  socket.on("update", (rid, event) => {
    io.to(rid).emit("update");
    // socket.emit("update");
    console.log("sending update");
  });

  socket.on("disconnect", (reason) => {
    console.log(`connection closed: ${reason}`);
  });
});

const requireAuth = (req, res, next) => {
  const { rid } = req.params;

  if (!req.cookies[rid]) return res.status(401).json({ msg: "unauthorized" });
  const token = req.cookies[rid];

  try {
    const verifiedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log("VERIFIED", verifiedToken);

    if (verifiedToken.rid !== rid) {
      return res.status(403).json({ msg: "unauthorized" });
    }

    const room = roomManager.get(rid);

    console.log(
      "🚀 ~ file: index.js ~ line 131 ~ requireAuth ~ players",
      room.players[verifiedToken.nickname]
    );

    if (!room.players[verifiedToken.nickname]) {
      const unavailableColors = Object.values(roomManager.get(rid).players).map(
        (player) => player.color
      );

      const color = Object.keys(newColorArray).find(
        (color) => !unavailableColors.includes(color)
      );

      const player = {
        nickname: verifiedToken.nickname,
        color,
      };

      room.players[verifiedToken.nickname] = player;

      const newChat = createChat(undefined, {
        nickname: verifiedToken.nickname,
        text: "Joined the game",
        color,
      });

      room.chats.push(newChat);

      req.player = player;
    } else {
      req.player = room.players[verifiedToken.nickname];
    }
  } catch (error) {
    console.log("ERROR ", error);

    return res.status(403).json({ msg: "Expired jwt" });
  }

  next();
};

app.post("/auth/:rid", async (req, res) => {
  console.log(req.body);
  console.log(req.params);

  const { password, nickname } = req.body;
  const { rid } = req.params;

  const room = roomManager.get(rid);

  if (!room) return res.status(404).json({ msg: "room does not exist" });

  if (room.password !== password)
    return res.status(401).json({ msg: "invalid credentials" });

  if (room.players[nickname])
    return res.status(403).json({ msg: "nickname is taken" });

  const token = createJwt({ nickname: nickname, rid: rid });

  res.cookie(`${rid}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
  });

  return res.status(200).json({ nickname });
});

app.get("/", (req, res) => {
  res.json({ msg: "Hello world" });
});

app.get("/get-rooms", async (req, res) => {
  const rooms = Array.from(roomManager, (entry) => ({
    id: entry[1].id,
    name: entry[1].name,
    creator: entry[1].creator,
    game: entry[1].game,
  }));

  console.log(rooms);

  res.json(rooms);
});

app.get("/categories", async (req, res) => {
  const options = Array.from(categories.entries(), (entry) => entry[0]);
  // console.log("🚀 ~ file: index.js ~ line 209 ~ app.get ~ options", options);

  return res.json({ categories: options });
});

app.get("/get-room/:rid", requireAuth, async (req, res) => {
  const { rid } = req.params;

  const room = roomManager.get(rid);

  res.json(room);
});

app.get("/player-data/:rid", requireAuth, async (req, res) => {
  const { rid } = req.params;

  if (!req.player) return res.status(401).json({ msg: "Missing jwt" });

  const { nickname } = req.player;

  const playerData = { nickname };

  return res.status(200).json(playerData);
});

app.post("/update-room/:rid", requireAuth, (req, res) => {
  const { rid } = req.params;
  const { event } = req.query;
  console.log(req.player);
  const { nickname } = req.player;

  const room = roomManager.get(rid);

  if (event === "update-item") {
    console.log("BODY ", req.body);

    const { id } = req.body;

    const item = room.items.find((item) => item.id === id);
    const isMarkedByPlayer = item.owners.includes(nickname);

    const newChat = createChat(undefined, {
      nickname,
      color: room.players[nickname].color,
      text: isMarkedByPlayer
        ? ` unmarked ${item.content}`
        : ` marked ${item.content}`,
    });

    room.chats.push(newChat);

    room.items = roomManager.get(rid).items.map((item) =>
      item.id !== id
        ? item
        : {
            ...item,
            owners: item.owners.includes(nickname)
              ? item.owners.filter((own) => own !== nickname)
              : [...item.owners, nickname],
          }
    );

    res.json({ msg: "ok" });

    return io.to(rid).emit("update");
  }

  if (event === "remove-player") {
    const newChat = createChat(undefined, {
      nickname,
      color: roomManager.get(rid).players[nickname].color,
      text: "left the game",
    });

    room.chats.push(newChat);

    delete room.players[nickname];

    res.status(200).json({ msg: "player removed" });

    return io.to(rid).emit("update");
  }

  if (event === "change-player-color") {
    const { color } = req.body;
    room.players[nickname].color = color;

    const newChat = createChat(color, {
      nickname,
      color,
      text: "changed color to: ",
    });
    console.log("🚀 ~ file: index.js ~ line 262 ~ app.post ~ newChat", newChat);

    room.chats.push(newChat);

    res.status(200).json({ msg: "color changed" });

    return io.to(rid).emit("update");
  }

  if (event === "new-chat-message") {
    const { msg } = req.body;

    const newChat = createChat(msg, {
      nickname,
      color: roomManager.get(rid).players[nickname].color,
      text: "~ ",
    });

    room.chats.push(newChat);

    res.status(200).json({ msg: "message recieved" });

    return io.to(rid).emit("update");
  }

  if (event === "hide-board") {
    room.isHidden = !room.isHidden;

    res.status(200).json({ msg: "visibility changed" });

    return io.to(rid).emit("update");
  }

  if (event === "generate-new-board") {
    console.log("HELLOOOOOOOOOO");

    const { game } = req.body;

    const newItems = createItems(game);

    room.items = newItems;

    res.status(200).json({ items: newItems });

    return io.to(rid).emit("update");
  }

  return res.status(400).json({ msg: "Missing event in query" });
});

app.post("/create-room", async (req, res) => {
  const { name, password, nickname: creator, game, isHidden } = req.body;
  const room = createRoom({ name, password, creator, game, isHidden });
  console.log("🚀 ~ file: index.js ~ line 360 ~ app.post ~ room", room);

  roomManager.set(room.id, room);

  res.json({ id: room.id });
});

app.get("/colors", (req, res) => {
  // res.status(200).json({ colors: colorArray });
  res.status(200).json({ colors: newColorArray });
});

server.listen(port, () => {
  console.log(`Server listening to port: ${port}`);
});
