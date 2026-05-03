/* ===== QazaqAI — App Logic v2 ===== */
'use strict';

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let state = {
  user: null,        // { name, username, level, goal }
  xp: 0,
  gems: 0,
  streak: 0,
  lastLoginDate: null,
  wordsLearned: 0,
  msgsSent: 0,
  quizCorrect: 0,
  quizTotal: 0,
  achievements: [],
  apiKey: '',
  dailyChat: 0,
  dailyFlash: 0,
  dailyQuiz: 0,
  flashMastered: 0,
};

// ═══════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════
function saveState() {
  localStorage.setItem('qazaqai_state', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('qazaqai_state');
  if (raw) {
    try { state = { ...state, ...JSON.parse(raw) }; } catch(e) {}
  }
}

// ═══════════════════════════════════════════
//  SPLASH + BOOT
// ═══════════════════════════════════════════
window.addEventListener('load', () => {
  loadState();

  let pct = 0;
  const fill = document.getElementById('splash-fill');
  const iv = setInterval(() => {
    pct += Math.random() * 18 + 8;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    if (fill) fill.style.width = pct + '%';
  }, 160);

  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').style.display = '';

    if (state.user) {
      checkStreak();
      goto('screen-home');
      refreshHome();
      loadApiKeyInput();
      checkApiBanner();
    } else {
      goto('screen-auth');
    }
  }, 2200);
});

// ═══════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════
function goto(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById(id);
  if (t) { t.classList.add('active'); t.scrollTop = 0; }
}

function navGoto(id, el) {
  goto(id);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  // Refresh screens
  if (id === 'screen-home') refreshHome();
  if (id === 'screen-profile') refreshProfile();
  if (id === 'screen-flashcards') initFlashcards();
  if (id === 'screen-grammar') initGrammar();
  if (id === 'screen-quiz') resetQuiz();
}

// ═══════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
}

// ═══════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════
const USERS_KEY = 'qazaqai_users';

function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  try { return raw ? JSON.parse(raw) : { demo: { password: 'demo123', name: 'Демо', level: 'A2' } }; }
  catch(e) { return {}; }
}

function saveUsers(u) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

function switchAuthTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + (tab === 'login' ? 'login' : 'reg')).classList.add('active');
  document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
}

function doLogin() {
  const username = document.getElementById('login-name').value.trim();
  const password = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');

  if (!username || !password) { err.textContent = 'Заполни все поля!'; return; }

  const users = getUsers();
  if (!users[username]) { err.textContent = 'Пользователь не найден.'; return; }
  if (users[username].password !== password) { err.textContent = 'Неверный пароль.'; return; }

  err.textContent = '';
  state.user = { name: users[username].name || username, username, level: users[username].level || 'A2', goal: users[username].goal || 10 };

  // Load user-specific state
  const uState = localStorage.getItem('qazaqai_state_' + username);
  if (uState) {
    try { state = { ...state, ...JSON.parse(uState), user: state.user }; } catch(e) {}
  }

  checkStreak();
  saveState();
  goto('screen-home');
  refreshHome();
  checkApiBanner();
  loadApiKeyInput();
  showToast('Сәлем, ' + state.user.name + '! 👋');
}

function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim().toLowerCase();
  const pass = document.getElementById('reg-pass').value;
  const level = document.getElementById('reg-level').value;
  const err = document.getElementById('reg-error');

  if (!name || !username || !pass) { err.textContent = 'Заполни все поля!'; return; }
  if (pass.length < 6) { err.textContent = 'Пароль минимум 6 символов.'; return; }
  if (!/^[a-z0-9_]+$/.test(username)) { err.textContent = 'Только латинские буквы, цифры и _'; return; }

  const users = getUsers();
  if (users[username]) { err.textContent = 'Такой пользователь уже есть!'; return; }

  users[username] = { password: pass, name, level, goal: 10 };
  saveUsers(users);

  err.textContent = '';
  state = {
    user: { name, username, level, goal: 10 },
    xp: 0, gems: 0, streak: 0, lastLoginDate: null,
    wordsLearned: 0, msgsSent: 0,
    quizCorrect: 0, quizTotal: 0,
    achievements: [], apiKey: '',
    dailyChat: 0, dailyFlash: 0, dailyQuiz: 0, flashMastered: 0
  };
  saveState();
  goto('screen-home');
  refreshHome();
  checkApiBanner();
  showToast('Добро пожаловать, ' + name + '! 🎉');
}

function doLogout() {
  saveState();
  state.user = null;
  goto('screen-auth');
}

// ═══════════════════════════════════════════
//  STREAK
// ═══════════════════════════════════════════
function checkStreak() {
  const today = new Date().toDateString();
  if (state.lastLoginDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (state.lastLoginDate === yesterday) {
    state.streak = (state.streak || 0) + 1;
  } else if (state.lastLoginDate !== today) {
    state.streak = 1;
  }
  state.lastLoginDate = today;
  if (state.streak === 3) unlockAch('streak_3');
  if (state.streak === 7) unlockAch('streak_7');
}

// ═══════════════════════════════════════════
//  XP & GEMS
// ═══════════════════════════════════════════
function addXP(amount) {
  state.xp = (state.xp || 0) + amount;
  if (state.xp >= 500) unlockAch('xp_500');
  if (state.xp >= 1000) unlockAch('xp_1000');
  state.gems = Math.floor(state.xp / 50);
  saveState();
}

function getXPForLevel(lvl) { return { A0: 200, A1: 500, B1: 1000 }[lvl] || 500; }

// ═══════════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════════
function unlockAch(id) {
  if (state.achievements.includes(id)) return;
  state.achievements.push(id);
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a) {
    if (a.xp) addXP(a.xp);
    showToast('🏆 Достижение: ' + a.name + '!');
  }
  saveState();
}

// ═══════════════════════════════════════════
//  HOME REFRESH
// ═══════════════════════════════════════════
function refreshHome() {
  if (!state.user) return;
  const u = state.user;

  // Avatar initials
  const initials = u.name.split(' ').map(w => w[0].toUpperCase()).join('').slice(0, 2);
  const av = document.getElementById('home-avatar');
  if (av) av.textContent = initials;

  setText('home-greeting', 'Сәлем, ' + u.name + '! 👋');
  setText('home-level', 'Уровень: ' + u.level);
  setText('home-streak', '🔥 ' + (state.streak || 0) + ' дней');

  const maxXP = getXPForLevel(u.level);
  const xpPct = Math.min(100, Math.round((state.xp / maxXP) * 100));
  setText('home-xp-num', state.xp + ' / ' + maxXP + ' XP');
  setStyle('home-xp-fill', 'width', xpPct + '%');
  setText('home-gems', state.gems || 0);

  // Daily quests
  const chatPct = Math.min(100, (state.dailyChat / 5) * 100);
  const flashPct = Math.min(100, (state.dailyFlash / 10) * 100);
  const quizPct = Math.min(100, (state.dailyQuiz / 5) * 100);
  setStyle('quest-chat-fill', 'width', chatPct + '%');
  setStyle('quest-flash-fill', 'width', flashPct + '%');
  setStyle('quest-quiz-fill', 'width', quizPct + '%');
  setText('quest-chat-count', Math.min(state.dailyChat, 5) + '/5');
  setText('quest-flash-count', Math.min(state.dailyFlash, 10) + '/10');
  setText('quest-quiz-count', Math.min(state.dailyQuiz, 5) + '/5');

  // Stats
  setText('stat-words', state.wordsLearned || 0);
  setText('stat-msgs', state.msgsSent || 0);
  setText('stat-xp', state.xp || 0);
  const acc = state.quizTotal > 0 ? Math.round((state.quizCorrect / state.quizTotal) * 100) + '%' : '–';
  setText('stat-acc', acc);

  // Achievements strip
  renderAchStrip();
}

function renderAchStrip() {
  const el = document.getElementById('ach-strip');
  if (!el) return;
  el.innerHTML = ACHIEVEMENTS.slice(0, 8).map(a => {
    const earned = state.achievements.includes(a.id);
    return `<div class="ach-chip ${earned ? 'earned' : 'locked'}" title="${a.name}: ${a.desc}">${a.icon}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════
function refreshProfile() {
  if (!state.user) return;
  const u = state.user;
  const initials = u.name.split(' ').map(w => w[0].toUpperCase()).join('').slice(0, 2);

  setText('profile-avatar-big', initials);
  setText('profile-name', u.name);
  setText('profile-username', '@' + u.username);
  setText('profile-level-badge', u.level);
  setText('profile-streak-badge', '🔥 ' + (state.streak || 0) + ' дней');

  // Fill edit form
  setVal('edit-name', u.name);
  setVal('edit-goal', u.goal || 10);
  setVal('edit-level', u.level);

  // Big stats
  setText('ps-xp', state.xp || 0);
  setText('ps-words', state.wordsLearned || 0);
  setText('ps-msgs', state.msgsSent || 0);
  setText('ps-streak', state.streak || 0);

  // Skill bars (derived)
  const chatSkill = Math.min(100, Math.round((state.msgsSent / 50) * 100));
  const readSkill = Math.min(100, Math.round((state.flashMastered / 20) * 100));
  const gramSkill = Math.min(100, Math.round((state.quizCorrect / 20) * 100));
  setStyle('sk-speak', 'width', chatSkill + '%');
  setStyle('sk-read', 'width', readSkill + '%');
  setStyle('sk-gram', 'width', gramSkill + '%');
  setText('sk-speak-lbl', chatSkill + '%');
  setText('sk-read-lbl', readSkill + '%');
  setText('sk-gram-lbl', gramSkill + '%');

  // All achievements
  const grid = document.getElementById('ach-full-grid');
  if (grid) {
    grid.innerHTML = ACHIEVEMENTS.map(a => {
      const earned = state.achievements.includes(a.id);
      return `<div class="ach-full-item ${earned ? 'earned' : 'locked'}">
        <div class="afi-icon">${a.icon}</div>
        <div class="afi-name">${a.name}</div>
        <div class="afi-desc">${earned ? a.desc : '???'}</div>
        ${a.xp ? `<div class="afi-xp">+${a.xp} XP</div>` : ''}
      </div>`;
    }).join('');
  }

  loadApiKeyInput();
}

function saveProfile() {
  const name = document.getElementById('edit-name').value.trim();
  const goal = document.getElementById('edit-goal').value;
  const level = document.getElementById('edit-level').value;
  if (!name) { showToast('Имя не может быть пустым!'); return; }

  state.user.name = name;
  state.user.goal = goal;
  state.user.level = level;

  // Update user record
  const users = getUsers();
  if (state.user.username && users[state.user.username]) {
    users[state.user.username].name = name;
    users[state.user.username].goal = goal;
    users[state.user.username].level = level;
    saveUsers(users);
  }

  saveState();
  refreshProfile();
  showToast('Профиль обновлён! ✅');
}

// ═══════════════════════════════════════════
//  API KEY
// ═══════════════════════════════════════════
function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) { showToast('Введи ключ!'); return; }
  state.apiKey = key;
  saveState();
  checkApiBanner();
  unlockAch('api_set');
  showToast('API-ключ сохранён! 🤖');
}

function openApiModal() {
  document.getElementById('api-modal').style.display = 'flex';
}
function closeApiModal() {
  document.getElementById('api-modal').style.display = 'none';
}
function saveApiKeyFromModal() {
  const key = document.getElementById('api-modal-input').value.trim();
  if (!key) { showToast('Введи ключ!'); return; }
  state.apiKey = key;
  saveState();
  closeApiModal();
  checkApiBanner();
  unlockAch('api_set');
  showToast('Gemini подключён! 🤖✨');
}
function checkApiBanner() {
  const banner = document.getElementById('api-banner');
  if (banner) banner.style.display = state.apiKey ? 'none' : '';
}
function loadApiKeyInput() {
  const el = document.getElementById('api-key-input');
  if (el && state.apiKey) el.value = state.apiKey;
}

// ═══════════════════════════════════════════
//  CHAT (Gemini AI)
// ═══════════════════════════════════════════
function getSystemPrompt() {
  return `Ты QazaqBot — дружелюбный AI-ассистент для изучения казахского языка.

Правила:
1. Отвечай по-казахски + русский перевод
2. Будь дружелюбным
3. Исправляй ошибки после ✏️
4. Коротко (2-4 предложения)

Уровень ученика: ${state.user?.level || 'A2'}`;
}

let chatHistory = [];

async function callGemini(userMessage) {
  if (!state.apiKey) return null;

  chatHistory.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: chatHistory.slice(-6),
          system_instruction: {
          parts: [{ text: getSystemPrompt() }]
},
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300
          }
        })
      }
    );

    const data = await res.json();

    console.log("Gemini response:", data); // 🔥 важно

    if (!data.candidates || !data.candidates.length) {
      throw new Error("Empty response");
    }

    const reply = data.candidates[0].content.parts[0].text;

    chatHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    return reply;

  } catch (e) {
    console.error("Gemini error:", e);
    return null;
  }
}

// Fallback local responses
const LOCAL_REPLIES = [
  { triggers: ['атым', 'мен', 'аты'], kz: 'Өте жақсы! Сіздің атыңыз керемет. Қазақстанда тұрасыз ба? 😊', ru: '(Очень хорошо! Ваше имя прекрасно. Вы живёте в Казахстане?)' },
  { triggers: ['студент', 'оқимын', 'оқушы'], kz: 'Керемет! Оқу — бұл мықты! Қай мамандық? 📚', ru: '(Отлично! Учиться — это здорово! Какая специальность?)' },
  { triggers: ['жақсы', 'рахмет', 'сау'], kz: 'Рахмет! Сіз де жақсы! Бүгін не жасадыңыз? 🌟', ru: '(Спасибо! И вы тоже! Что делали сегодня?)' },
  { triggers: ['қазақ', 'тіл', 'тілді', 'үйрен'], kz: 'Қазақ тілін үйрену — керемет шешім! Мен сізге көмектесемін! 💪', ru: '(Изучать казахский — отличное решение! Я помогу вам!)' },
  { triggers: ['алматы', 'астана', 'нур-sultan'], kz: 'О, сіз Алматы туралы білесіз! Ол керемет қала. Барғаныңыз бар ма? 🏙️', ru: '(О, вы знаете Алматы! Это прекрасный город. Вы там бывали?)' },
  { triggers: ['бала', 'жас', 'жыл'], kz: 'Жас маңызды емес — қазақ тілін кез келген уақытта үйренуге болады! 😄', ru: '(Возраст не важен — казахский можно учить в любое время!)' },
];

const RANDOM_FALLBACK = [
  { kz: 'Жарайды, түсіндім! Өте жақсы. Тағы айтыңызшы? 😊', ru: '(Хорошо, понял! Очень хорошо. Расскажите ещё?)' },
  { kz: 'Бұл қызықты! Сіз жақсы үйренесіз. Жалғастырайық! 🎯', ru: '(Это интересно! Вы хорошо учитесь. Продолжим!)' },
  { kz: 'Керемет! Сіздің қазақ тіліңіз жақсарып келеді. 🌟', ru: '(Прекрасно! Ваш казахский улучшается!)' },
  { kz: 'Сіз жақсы сөйлейсіз! Маған ұнайды. Қайда тұрасыз? 🏡', ru: '(Вы хорошо говорите! Мне нравится. Где живёте?)' },
];

let turnCount = 0;

function sendSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  document.querySelectorAll('.suggestion-row').forEach(r => r.remove());
  addChatMsg('user', text, null);

  state.msgsSent = (state.msgsSent || 0) + 1;
  state.dailyChat = Math.min((state.dailyChat || 0) + 1, 5);

  if (state.msgsSent === 1) unlockAch('first_msg');
  if (state.msgsSent >= 5) unlockAch('chat_5');
  if (state.msgsSent >= 20) unlockAch('chat_20');

  addXP(15);
  showToast('+15 XP 🎉');

  const aiStatus = document.getElementById('ai-status');
  if (aiStatus) aiStatus.textContent = 'Печатает...';

  const typing = addTyping();

  // Try Gemini first
  let reply = null;
  if (state.apiKey) {
    reply = await callGemini(text);
  }

  typing.remove();
  if (aiStatus) aiStatus.textContent = 'Онлайн · Готов к диалогу';

  if (reply) {
    // Gemini response — split kazakh and russian parts
    addChatMsg('ai', reply, null);
  } else {
    // Local fallback
    const lower = text.toLowerCase();
    let chosen = RANDOM_FALLBACK[turnCount % RANDOM_FALLBACK.length];
    for (const r of LOCAL_REPLIES) {
      if (r.triggers.some(t => lower.includes(t))) { chosen = r; break; }
    }
    addChatMsg('ai', chosen.kz, chosen.ru);
  }

  turnCount++;

  if (turnCount % 3 === 0) {
    addSuggestions(['Иә, дұрыс', 'Мен түсіндім', 'Тағы айтыңыз']);
  }

  // Update quest count in DOM
  document.querySelectorAll('#quest-chat-count').forEach(el => el.textContent = Math.min(state.dailyChat, 5) + '/5');
  setStyle('quest-chat-fill', 'width', Math.min(100, (state.dailyChat / 5) * 100) + '%');

  saveState();
  scrollChat();
}

function addChatMsg(role, text, trans) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const transHtml = trans ? `<div class="msg-trans">${trans}</div>` : '';
  div.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g, '<br>')}${transHtml}</div>`;
  document.getElementById('chat-messages').appendChild(div);
  scrollChat();
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = `<div class="msg-bubble typing"><span></span><span></span><span></span></div>`;
  document.getElementById('chat-messages').appendChild(div);
  scrollChat();
  return div;
}

function addSuggestions(list) {
  const row = document.createElement('div');
  row.className = 'suggestion-row';
  list.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'sug';
    btn.textContent = s;
    btn.onclick = () => sendSuggestion(s);
    row.appendChild(btn);
  });
  document.getElementById('chat-messages').appendChild(row);
  scrollChat();
}

function scrollChat() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function showFeedback(text) {
  document.getElementById('feedback-text').textContent = text;
  document.getElementById('feedback-panel').style.display = '';
}
function closeFeedback() {
  document.getElementById('feedback-panel').style.display = 'none';
}

// ═══════════════════════════════════════════
//  FLASHCARDS
// ═══════════════════════════════════════════
let flashDeck = [];
let flashIdx = 0;
let flashFlipped = false;
let flashStreakLocal = 0;

function initFlashcards() {
  flashDeck = [...VOCAB].sort(() => Math.random() - 0.5);
  flashIdx = 0;
  flashFlipped = false;
  flashStreakLocal = 0;
  showCard();
}

function showCard() {
  const card = flashDeck[flashIdx];
  if (!card) return;

  document.getElementById('card-kz').textContent = card.kz;
  document.getElementById('card-ru').textContent = card.ru;
  document.getElementById('card-ex').textContent = card.ex || '';
  document.getElementById('card-cat').textContent = card.cat || '';

  // Reset flip
  const inner = document.getElementById('card-inner');
  inner.classList.remove('flipped');
  flashFlipped = false;
  document.getElementById('flash-actions').style.display = 'none';

  // Progress
  const total = flashDeck.length;
  const pct = Math.round(((flashIdx) / total) * 100);
  document.getElementById('flash-idx').textContent = (flashIdx + 1) + ' / ' + total;
  document.getElementById('flash-prog-fill').style.width = pct + '%';
  document.getElementById('flash-streak-lbl').textContent = '🔥 ' + flashStreakLocal;
  document.getElementById('flash-mastered-num').textContent = state.flashMastered || 0;
}

function flipCard() {
  if (flashFlipped) return;
  flashFlipped = true;
  document.getElementById('card-inner').classList.add('flipped');
  setTimeout(() => {
    document.getElementById('flash-actions').style.display = 'flex';
  }, 300);
}

function rateCard(rating) {
  state.dailyFlash = Math.min((state.dailyFlash || 0) + 1, 10);

  if (rating === 'easy') {
    flashStreakLocal++;
    state.flashMastered = (state.flashMastered || 0) + 1;
    state.wordsLearned = Math.max(state.wordsLearned || 0, state.flashMastered);
    addXP(10);
    showToast('+10 XP ✅');
    if (state.flashMastered >= 10) unlockAch('flash_10');
    if (state.flashMastered >= 20) unlockAch('flash_master');
  } else if (rating === 'ok') {
    flashStreakLocal = 0;
    addXP(5);
    showToast('+5 XP 🤔');
  } else {
    flashStreakLocal = 0;
    // Move card to end of deck for retry
    const current = flashDeck.splice(flashIdx, 1)[0];
    flashDeck.push(current);
    showCard();
    saveState();
    return;
  }

  setStyle('quest-flash-fill', 'width', Math.min(100, (state.dailyFlash / 10) * 100) + '%');
  setText('quest-flash-count', Math.min(state.dailyFlash, 10) + '/10');

  flashIdx++;
  if (flashIdx >= flashDeck.length) {
    // Deck complete
    showToast('🎉 Все карточки пройдены! +50 XP');
    addXP(50);
    flashIdx = 0;
    flashDeck = [...VOCAB].sort(() => Math.random() - 0.5);
  }
  showCard();
  saveState();
}

// ═══════════════════════════════════════════
//  QUIZ
// ═══════════════════════════════════════════
let quizMode = '';
let quizQuestions = [];
let quizCurrent = 0;
let quizScore = 0;
let quizTimer = null;
let quizTimeLeft = 30;

function resetQuiz() {
  clearInterval(quizTimer);
  show('quiz-start');
  hide('quiz-question');
  hide('quiz-result');
}

function startQuiz(mode) {
  quizMode = mode;
  const pool = QUIZ_QUESTIONS[mode];
  quizQuestions = pool.sort(() => Math.random() - 0.5).slice(0, 10);
  quizCurrent = 0;
  quizScore = 0;
  hide('quiz-start');
  show('quiz-question');
  hide('quiz-result');
  showQuizQ();
}

function showQuizQ() {
  if (quizCurrent >= quizQuestions.length) {
    finishQuiz();
    return;
  }
  const q = quizQuestions[quizCurrent];
  setText('quiz-q-num', 'Вопрос ' + (quizCurrent + 1) + '/' + quizQuestions.length);
  setText('quiz-score-live', quizScore);
  setText('quiz-q-word', q.q);
  setText('quiz-q-label', q.label || 'Что означает это слово?');

  const pct = (quizCurrent / quizQuestions.length) * 100;
  setStyle('quiz-prog-fill', 'width', pct + '%');

  const opts = document.getElementById('quiz-options');
  opts.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.onclick = () => answerQuiz(i, btn, q.ans);
    opts.appendChild(btn);
  });

  // Timer
  clearInterval(quizTimer);
  quizTimeLeft = 30;
  setText('quiz-timer', quizTimeLeft);
  quizTimer = setInterval(() => {
    quizTimeLeft--;
    setText('quiz-timer', quizTimeLeft);
    if (quizTimeLeft <= 0) {
      clearInterval(quizTimer);
      // Auto-advance
      quizCurrent++;
      state.quizTotal = (state.quizTotal || 0) + 1;
      showQuizQ();
    }
  }, 1000);
}

function answerQuiz(idx, btn, correctIdx) {
  clearInterval(quizTimer);
  state.quizTotal = (state.quizTotal || 0) + 1;

  const opts = document.querySelectorAll('.quiz-opt');
  opts.forEach(b => b.disabled = true);
  opts[correctIdx].classList.add('correct');

  if (idx === correctIdx) {
    btn.classList.add('correct');
    quizScore++;
    state.quizCorrect = (state.quizCorrect || 0) + 1;
    state.dailyQuiz = Math.min((state.dailyQuiz || 0) + 1, 5);
    addXP(10);
    showToast('+10 XP ✅');
  } else {
    btn.classList.add('wrong');
  }

  setStyle('quest-quiz-fill', 'width', Math.min(100, (state.dailyQuiz / 5) * 100) + '%');
  setText('quest-quiz-count', Math.min(state.dailyQuiz, 5) + '/5');

  setTimeout(() => {
    quizCurrent++;
    showQuizQ();
  }, 1200);
  saveState();
}

function finishQuiz() {
  clearInterval(quizTimer);
  hide('quiz-question');
  show('quiz-result');

  const pct = Math.round((quizScore / quizQuestions.length) * 100);
  let icon = '😔', label = 'Попробуй ещё раз!';
  if (pct >= 80) { icon = '🏆'; label = 'Отлично! Ты молодец!'; }
  else if (pct >= 50) { icon = '😊'; label = 'Неплохо! Продолжай!'; }

  setText('quiz-result-icon', icon);
  setText('quiz-result-score', quizScore + '/' + quizQuestions.length);
  setText('quiz-result-label', label);
  const xpEarned = quizScore * 10;
  setText('quiz-result-xp', '+' + xpEarned + ' XP');

  if (quizScore === quizQuestions.length) unlockAch('quiz_perfect');
  unlockAch('quiz_done');
  saveState();
}

// ═══════════════════════════════════════════
//  GRAMMAR
// ═══════════════════════════════════════════
function initGrammar() {
  const list = document.getElementById('grammar-list');
  if (!list) return;
  list.innerHTML = GRAMMAR_DATA.map((g, i) => {
    const cls = g.status === 'locked' ? 'gc locked' : g.status === 'done' ? 'gc done' : 'gc current';
    const statusMark = g.status === 'done' ? '<span class="gc-status done">✓</span>' :
                       g.status === 'current' ? '<span class="gc-status cur">→</span>' :
                       '<span class="gc-status lock">🔒</span>';
    const clickable = g.status !== 'locked' ? `onclick="openGrammar(${i})"` : '';
    return `<div class="${cls}" ${clickable}>
      <div class="gc-icon">${g.icon}</div>
      <div class="gc-body">
        <div class="gc-title">${g.title}</div>
      </div>
      ${statusMark}
    </div>`;
  }).join('');
}

function openGrammar(idx) {
  const g = GRAMMAR_DATA[idx];
  document.getElementById('gmodal-title').textContent = g.icon + ' ' + g.title;
  document.getElementById('gmodal-body').innerHTML = g.body;
  document.getElementById('gmodal').style.display = 'flex';
}
function closeGrammar() {
  document.getElementById('gmodal').style.display = 'none';
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
