// public/client.gui.js
(() => {
  const socket = io();

  let myName = localStorage.getItem('chat:name') || `gui-${Math.floor(Math.random()*1000)}`;

  const $status = document.getElementById('status');
  const $messages = document.getElementById('messages');
  const $input = document.getElementById('input');
  const $sendBtn = document.getElementById('sendBtn');
  const $nameInput = document.getElementById('name');
  const $setNameBtn = document.getElementById('setName');
  const $clients = document.getElementById('clients');

  $nameInput.value = myName;

  function appendMessage(text, cls) {
    const d = document.createElement('div');
    d.className = cls || 'msg';
    d.innerText = text;
    $messages.appendChild(d);
    $messages.scrollTop = $messages.scrollHeight;
  }

  socket.on('connect', () => {
    $status.innerText = 'connected';
    socket.emit('handshake', { type: 'gui', name: myName });
  });

  socket.on('disconnect', () => {
    $status.innerText = 'disconnected';
  });

  socket.on('message', (msg) => {
    const when = new Date(msg.ts).toLocaleTimeString();
    const prefix = `${when} ${msg.from} (${msg.type}): `;
    const isMe = (msg.from === myName && msg.type === 'gui');
    const el = document.createElement('div');
    el.className = 'msg' + (isMe ? ' me' : '');
    el.textContent = prefix + msg.text;
    $messages.appendChild(el);
    $messages.scrollTop = $messages.scrollHeight;
  });

  socket.on('server:notice', (n) => {
    const el = document.createElement('div');
    el.className = 'notice';
    el.textContent = `${new Date(n.time).toLocaleTimeString()} — ${n.text}`;
    $messages.appendChild(el);
  });

  socket.on('server:clients', (list) => {
    $clients.innerText = list.map(c => `${c.name} (${c.type})`).join('\n') || '(none)';
  });

  function sendMessage() {
    const txt = $input.value.trim();
    if (!txt) return;
    socket.emit('message', { text: txt, from: myName });
    $input.value = '';
  }

  $sendBtn.addEventListener('click', sendMessage);
  $input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  $setNameBtn.addEventListener('click', () => {
    const v = $nameInput.value.trim() || myName;
    myName = v;
    localStorage.setItem('chat:name', myName);
    socket.emit('handshake', { type: 'gui', name: myName });
  });
})();
