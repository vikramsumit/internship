// public/client.gui.js
(() => {
  const socket = io({ transports: ['websocket'] });

  let myName = localStorage.getItem('chat:name') || `gui-${Math.floor(Math.random() * 1000)}`;

  const $status = document.getElementById('status');
  const $messages = document.getElementById('messages');
  const $emptyState = document.getElementById('emptyState');
  const $input = document.getElementById('input');
  const $sendBtn = document.getElementById('sendBtn');
  const $nameInput = document.getElementById('name');
  const $nameForm = document.getElementById('nameForm');
  const $clients = document.getElementById('clients');
  const $clientCount = document.getElementById('clientCount');
  const $composeForm = document.getElementById('composeForm');
  const $sidebar = document.getElementById('sidebar');
  const $toggleClients = document.getElementById('toggleClients');

  $nameInput.value = myName;

  function setStatus(text, state) {
    $status.textContent = text;
    $status.dataset.state = state;
    const connected = state === 'connected';
    $input.disabled = !connected;
    $sendBtn.disabled = !connected;
  }

  function shouldStickToBottom() {
    return $messages.scrollHeight - $messages.scrollTop - $messages.clientHeight < 80;
  }

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  function removeEmptyState() {
    $emptyState.hidden = true;
  }

  function appendMessage(msg) {
    const stickToBottom = shouldStickToBottom();
    const isMe = msg.socketId === socket.id;
    const el = document.createElement('article');
    const meta = document.createElement('div');
    const text = document.createElement('div');

    el.className = 'msg' + (isMe ? ' me' : '');
    meta.className = 'message-meta';
    text.className = 'message-text';

    meta.textContent = `${msg.from} (${msg.type}) · ${new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    text.textContent = msg.text;

    el.append(meta, text);
    removeEmptyState();
    $messages.appendChild(el);

    if (stickToBottom) scrollToBottom();
  }

  function appendNotice(notice) {
    const stickToBottom = shouldStickToBottom();
    const el = document.createElement('div');

    el.className = 'notice';
    el.textContent = `${new Date(notice.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${notice.text}`;

    removeEmptyState();
    $messages.appendChild(el);

    if (stickToBottom) scrollToBottom();
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?';
  }

  function renderClients(list) {
    $clients.replaceChildren();
    $clientCount.textContent = list.length;

    list.forEach((client) => {
      const item = document.createElement('li');
      const avatar = document.createElement('span');
      const copy = document.createElement('div');
      const name = document.createElement('div');
      const type = document.createElement('div');

      item.className = 'client';
      avatar.className = 'avatar';
      copy.className = 'client-copy';
      name.className = 'client-name';
      type.className = 'client-type';

      avatar.textContent = getInitials(client.name);
      name.textContent = client.name;
      type.textContent = client.type;

      copy.append(name, type);
      item.append(avatar, copy);
      $clients.appendChild(item);
    });
  }

  function resizeInput() {
    $input.style.height = 'auto';
    $input.style.height = `${Math.min($input.scrollHeight, 140)}px`;
  }

  socket.on('connect', () => {
    setStatus('Connected', 'connected');
    socket.emit('handshake', { type: 'gui', name: myName });
  });

  socket.on('disconnect', () => {
    setStatus('Disconnected', 'disconnected');
  });

  socket.on('connect_error', () => {
    setStatus('Reconnecting', 'connecting');
  });

  socket.on('message', appendMessage);
  socket.on('server:notice', appendNotice);
  socket.on('server:clients', renderClients);

  function sendMessage() {
    const text = $input.value.trim();
    if (!text || !socket.connected) return;

    socket.emit('message', { text, from: myName });
    $input.value = '';
    resizeInput();
  }

  $composeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage();
  });

  $input.addEventListener('input', resizeInput);
  $input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  $nameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextName = $nameInput.value.trim() || myName;
    myName = nextName;
    localStorage.setItem('chat:name', myName);
    socket.emit('handshake', { type: 'gui', name: myName });
  });

  $toggleClients.addEventListener('click', () => {
    const isOpen = $sidebar.classList.toggle('is-open');
    $toggleClients.setAttribute('aria-expanded', String(isOpen));
  });

  setStatus('Connecting', 'connecting');
  resizeInput();
})();
