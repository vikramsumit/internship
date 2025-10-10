// Node CLI chat client using socket.io-client.

const { io } = require('socket.io-client');
const readline = require('readline');

const name = process.argv[2] || `cli-${Math.floor(Math.random()*1000)}`;
const serverUrl = process.argv[3] || 'http://localhost:3000';

const socket = io(serverUrl, { transports: ['websocket'] });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${name}> `
});

socket.on('connect', () => {
  console.log(`Connected to ${serverUrl} as ${name} (socket ${socket.id})`);
  socket.emit('handshake', { type: 'cli', name });

  rl.prompt();
});

socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`);
  process.exit(0);
});

socket.on('message', (msg) => {
  const time = new Date(msg.ts).toLocaleTimeString();
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(`[${time}] ${msg.from} (${msg.type}): ${msg.text}`);
  rl.prompt(true);
});

socket.on('server:notice', (n) => {
  const time = new Date(n.time).toLocaleTimeString();
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(`[NOTICE ${time}] ${n.text}`);
  rl.prompt(true);
});

socket.on('server:clients', (list) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(`[CLIENTS] ${list.map(c => `${c.name}:${c.type}`).join(', ')}`);
  rl.prompt(true);
});

// read lines and send as messages
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  if (trimmed === '/quit' || trimmed === '/exit') {
    console.log('Exiting...');
    socket.disconnect();
    process.exit(0);
  }
  // send message
  socket.emit('message', { text: trimmed, from: name });
  rl.prompt();
});

rl.on('SIGINT', () => {
  console.log('Caught interrupt, exiting...');
  socket.disconnect();
  process.exit(0);
});
