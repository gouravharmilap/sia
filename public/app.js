const chat = document.getElementById('chat');
const input = document.getElementById('input');
const form = document.getElementById('composer');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clearBtn');

const HISTORY_KEY = 'sia:history';

let history = [];
try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { history = []; }

function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-60))); } catch (e) {}
}

function removeWelcome() {
  const w = chat.querySelector('.welcome');
  if (w) w.remove();
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addMessage(role, content) {
  removeWelcome();
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if (role === 'assistant') {
    const img = document.createElement('img');
    img.src = '6300666454747059379_120.jpg';
    img.alt = 'Sia';
    avatar.appendChild(img);
  } else {
    avatar.textContent = 'Y';
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return msg;
}

function showTyping() {
  removeWelcome();
  const msg = document.createElement('div');
  msg.className = 'msg assistant';
  msg.id = 'typing';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const img = document.createElement('img');
  img.src = '6300666454747059379_120.jpg';
  img.alt = 'Sia';
  avatar.appendChild(img);
  const bubble = document.createElement('div');
  bubble.className = 'bubble typing';
  bubble.innerHTML = '<span></span><span></span><span></span>';
  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

function renderHistory() {
  history.forEach((m) => addMessage(m.role, m.content));
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  autoResize();
  addMessage('user', text);
  history.push({ role: 'user', content: text });
  saveHistory();

  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    const raw = await res.text();
    hideTyping();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = { error: raw || `HTTP ${res.status}` }; }
    if (!res.ok) {
      addMessage('assistant', `… ${data.error || 'Something broke.'}`);
      return;
    }
    addMessage('assistant', data.reply);
    history.push({ role: 'assistant', content: data.reply });
    saveHistory();
  } catch (err) {
    hideTyping();
    addMessage('assistant', `… ${err.message || 'Network error.'}`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
}

input.addEventListener('input', autoResize);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
form.addEventListener('submit', (e) => { e.preventDefault(); send(); });

clearBtn.addEventListener('click', () => {
  history = [];
  localStorage.removeItem(HISTORY_KEY);
  chat.innerHTML = '';
  const w = document.createElement('div');
  w.className = 'welcome';
  w.innerHTML = '<img src="logo.png" alt="Micro Nova" class="splash-logo" /><h1>Sia.</h1><p>Talk. I\'ll keep it short.</p><p class="hint">One line. Go.</p>';
  chat.appendChild(w);
});

renderHistory();
if (history.length) removeWelcome();
autoResize();
