// server.js
// Node + Express + Socket.IO server that serves a simple GUI and accepts CLI/browser clients.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const HOST = '0.0.0.0';
const io = new Server(server);

// Serve static GUI files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Simple HTTP health endpoint
app.get('/ping', (req, res) => res.send('pong'));

// In-memory connected clients (for demo)
const clients = new Map(); // socketId -> {type, name}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Expect initial handshake event from client with { type: 'cli'|'gui', name: '...' }
  socket.on('handshake', (meta = {}) => {
    const { type = 'unknown', name = 'Anonymous' } = meta;
    clients.set(socket.id, { type, name });
    console.log(`Handshake from ${socket.id}: type=${type}, name=${name}`);

    // Notify others
    socket.broadcast.emit('server:notice', {
      text: `${name} (${type}) joined.`,
      time: Date.now()
    });

    // Send current clients list to everyone
    emitClientList();
  });

  socket.on('message', (payload) => {
    // payload: { text, from }
    const fromMeta = clients.get(socket.id) || {};
    const msg = {
      text: payload.text,
      from: payload.from || fromMeta.name || 'Unknown',
      type: fromMeta.type || 'unknown',
      ts: Date.now(),
      socketId: socket.id
    };
    console.log(`[MSG] ${msg.from} (${msg.type}): ${msg.text}`);

    // Broadcast to all (including sender)
    io.emit('message', msg);
  });

  socket.on('disconnect', (reason) => {
    const meta = clients.get(socket.id) || {};
    console.log(`Socket disconnected: ${socket.id} (${meta.name || 'Unknown'}) reason=${reason}`);
    if (meta.name) {
      socket.broadcast.emit('server:notice', {
        text: `${meta.name} (${meta.type}) left.`,
        time: Date.now()
      });
    }
    clients.delete(socket.id);
    emitClientList();
  });

  // optional: handle server-targeted commands from clients
  socket.on('server:whoami', (_, cb) => {
    const m = clients.get(socket.id) || {};
    cb && cb(m);
  });
});

function emitClientList() {
  const list = Array.from(clients.values());
  io.emit('server:clients', list);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
