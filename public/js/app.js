import { api } from './api.js';

/* ==========================================================================
   COSMIC SOUND SYNTHESIZER (Web Audio API - Zero External Asset Dependency)
   ========================================================================== */
class CosmicAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('quizbot_audio_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('quizbot_audio_muted', this.muted);
    return this.muted;
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // ignore audio errors
    }
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + i * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {
      // ignore
    }
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch {
      // ignore
    }
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const fanfare = [392.00, 523.25, 659.25, 783.99, 1046.50];
      fanfare.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + i * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.52);
      });
    } catch {
      // ignore
    }
  }
}

/* ==========================================================================
   STARFIELD CANVAS ANIMATION (Twinkling Stardust & Meteors)
   ========================================================================== */
class CosmicStarfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.meteors = [];
    this.width = 0;
    this.height = 0;
    this.animationId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initStars();
    this.start();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initStars() {
    const starCount = Math.floor((this.width * this.height) / 5500);
    this.stars = [];
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 1.4 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleAngle: Math.random() * Math.PI * 2,
        color: ['#ffffff', '#e0f2fe', '#f3e8ff', '#fef3c7'][Math.floor(Math.random() * 4)],
      });
    }
  }

  createMeteor() {
    if (this.meteors.length >= 2) return;
    this.meteors.push({
      x: Math.random() * this.width * 0.8,
      y: 0,
      length: Math.random() * 70 + 40,
      speed: Math.random() * 7 + 8,
      angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
      opacity: 1,
      decay: Math.random() * 0.015 + 0.01,
    });
  }

  start() {
    let lastMeteorTime = Date.now();
    const animate = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Draw Twinkling Stars
      for (const s of this.stars) {
        s.twinkleAngle += s.twinkleSpeed;
        const alpha = s.baseAlpha + Math.sin(s.twinkleAngle) * 0.25;
        this.ctx.fillStyle = s.color;
        this.ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Handle Meteors
      const now = Date.now();
      if (now - lastMeteorTime > 4500 && Math.random() < 0.35) {
        this.createMeteor();
        lastMeteorTime = now;
      }

      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.opacity -= m.decay;

        if (m.opacity <= 0 || m.x > this.width || m.y > this.height) {
          this.meteors.splice(i, 1);
          continue;
        }

        this.ctx.save();
        const grad = this.ctx.createLinearGradient(
          m.x, m.y,
          m.x - Math.cos(m.angle) * m.length,
          m.y - Math.sin(m.angle) * m.length
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`);
        grad.addColorStop(0.3, `rgba(56, 189, 248, ${m.opacity * 0.8})`);
        grad.addColorStop(1, `rgba(99, 102, 241, 0)`);

        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 1.8;
        this.ctx.beginPath();
        this.ctx.moveTo(m.x, m.y);
        this.ctx.lineTo(
          m.x - Math.cos(m.angle) * m.length,
          m.y - Math.sin(m.angle) * m.length
        );
        this.ctx.stroke();
        this.ctx.restore();
      }

      this.ctx.globalAlpha = 1;
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }
}

/* ==========================================================================
   QUIZBOT APPLICATION CONTROLLER
   ========================================================================== */
class QuizApp {
  constructor() {
    this.audio = new CosmicAudio();
    this.sessionId = null;
    this.topic = '';
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.currentQuestion = 0;
    this.totalQuestions = 5;
    this.difficulty = 'medium';
    this.isTransitioning = false;
    this.questionAnswered = false;
    this.activeOptions = [];
    this.startTime = 0;
    this.loadingMessage = null;
    this.loadingIndicator = null;
    this.selectedOptionLetter = null;

    this.cacheDom();
    this.bindEvents();
    this.initAudioButton();
    this.checkApiHealth();
    this.initStarfield();
  }

  cacheDom() {
    this.dom = {
      canvas: document.getElementById('starfield'),
      audioBtn: document.getElementById('audio-toggle-btn'),
      chatToggleBtn: document.getElementById('chat-toggle-btn'),
      apiStatusDot: document.getElementById('api-status-dot'),
      apiStatusText: document.getElementById('api-status-text'),
      headerStreakBadge: document.getElementById('hud-streak-badge'),
      headerStreakCount: document.getElementById('hud-streak-count'),
      headerScoreBadge: document.getElementById('hud-score-badge'),
      headerScoreVal: document.getElementById('hud-score-val'),
      progressBar: document.getElementById('progress-bar'),

      // Screens
      setupScreen: document.getElementById('setup-screen'),
      quizScreen: document.getElementById('quiz-screen'),
      debriefScreen: document.getElementById('debrief-screen'),
      chatScreen: document.getElementById('chat-screen'),
      skeletonLayer: document.getElementById('skeleton-layer'),
      errorBanner: document.getElementById('error-banner'),
      errorText: document.getElementById('error-text'),

      // Setup Elements
      topicInput: document.getElementById('topic-input'),
      startBtn: document.getElementById('start-btn'),
      topicChips: document.querySelectorAll('.chip'),
      diffBtns: document.querySelectorAll('[data-difficulty]'),
      countBtns: document.querySelectorAll('[data-count]'),

      // Quiz Elements
      sectorIndicator: document.getElementById('sector-indicator'),
      difficultyPill: document.getElementById('difficulty-pill'),
      fallbackNotice: document.getElementById('fallback-notice'),
      questionHeading: document.getElementById('question-heading'),
      optionsContainer: document.getElementById('options-container'),
      feedbackBox: document.getElementById('feedback-box'),
      feedbackHeader: document.getElementById('feedback-header'),
      feedbackExplanation: document.getElementById('feedback-explanation'),
      nextBtn: document.getElementById('next-btn'),

      // Chat Elements
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      chatSendBtn: document.getElementById('chat-send-btn'),
      chatStatus: document.getElementById('chat-status'),
      chatStatusText: document.getElementById('chat-status-text'),
      loadingIndicator: document.getElementById('loading-indicator'),
      loadingText: document.getElementById('loading-text'),

      // Debrief Elements
      rankBadge: document.getElementById('rank-badge'),
      finalScoreHuge: document.getElementById('final-score-huge'),
      metricAccuracy: document.getElementById('metric-accuracy'),
      metricStreak: document.getElementById('metric-streak'),
      metricTopic: document.getElementById('metric-topic'),
      highScoreBadge: document.getElementById('high-score-badge'),
      replayBtn: document.getElementById('replay-btn'),
      newMissionBtn: document.getElementById('new-mission-btn'),
    };
  }

  initStarfield() {
    if (this.dom.canvas) {
      new CosmicStarfield(this.dom.canvas);
    }
  }

  initAudioButton() {
    if (!this.dom.audioBtn) return;
    this.dom.audioBtn.textContent = this.audio.muted ? '🔇' : '🔊';
    this.dom.audioBtn.title = this.audio.muted ? 'Sound muted' : 'Sound enabled';
    this.dom.audioBtn.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.dom.audioBtn.textContent = isMuted ? '🔇' : '🔊';
      this.dom.audioBtn.title = isMuted ? 'Sound muted' : 'Sound enabled';
      if (!isMuted) this.audio.playClick();
    });
  }

  initChatButton() {
    if (!this.dom.chatToggleBtn) return;
    
    this.dom.chatToggleBtn.addEventListener('click', () => {
      this.audio.playClick();
      this.showChatScreen();
    });
  }

  showChatScreen() {
    this.clearError();
    this.showScreen('chat');
    this.dom.chatStatusText.textContent = 'Connecting...';
    this.dom.chatStatus.classList.add('connecting');
    this.initializeChat();
  }

  async initializeChat() {
    try {
      const res = await api.startChat();
      this.chatSessionId = res.session_id;
      this.dom.chatStatusText.textContent = 'Ready to chat';
      this.dom.chatStatus.classList.remove('connecting');
      this.dom.chatInput.disabled = false;
      this.dom.chatSendBtn.disabled = false;
      this.dom.chatInput.focus();
    } catch (err) {
      this.showError(`Chat connection failed: ${err.message}`);
      this.dom.chatStatusText.textContent = 'Connection failed';
      this.dom.chatStatus.classList.add('error');
    }
  }

  addMessageToHistory(role, text, isLoading = false) {
    if (!this.dom.chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const avatarSpan = document.createElement('span');
    avatarSpan.className = 'message-avatar';
    avatarSpan.textContent = avatar;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (isLoading) {
      bubbleDiv.innerHTML = `
        <div class="loading-message">
          <div class="loading-spinner-small"></div>
          <span>Thinking...</span>
        </div>
      `;
    } else {
      const p = document.createElement('p');
      p.textContent = text;
      bubbleDiv.appendChild(p);
    }
    
    contentDiv.appendChild(avatarSpan);
    contentDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(contentDiv);
    
    this.dom.chatMessages.appendChild(messageDiv);
    this.scrollChatToBottom();
  }

  scrollChatToBottom() {
    if (this.dom.chatMessages) {
      this.dom.chatMessages.scrollTop = this.dom.chatMessages.scrollHeight;
    }
  }

  async sendChatMessage() {
    const message = this.dom.chatInput.value.trim();
    if (!message || !this.chatSessionId) return;
    
    // Add user message to UI immediately
    this.addMessageToHistory('user', message);
    this.dom.chatInput.value = '';
    this.dom.chatInput.disabled = true;
    this.dom.chatSendBtn.disabled = true;
    
    // Add loading indicator
    this.addMessageToHistory('bot', '', true);
    
    try {
      const res = await api.chat(this.chatSessionId, message);
      
      // Replace loading message with actual response
      const messages = this.dom.chatMessages.querySelectorAll('.chat-message.bot-message');
      if (messages.length > 0) {
        messages[messages.length - 1].remove();
      }
      
      this.addMessageToHistory('bot', res.response);
      
    } catch (err) {
      // Replace loading message with error
      const messages = this.dom.chatMessages.querySelectorAll('.chat-message.bot-message');
      if (messages.length > 0) {
        messages[messages.length - 1].remove();
      }
      
      this.showError(`Chat error: ${err.message}`);
      this.addMessageToHistory('bot', `Error: ${err.message}`);
    } finally {
      this.dom.chatInput.disabled = false;
      this.dom.chatSendBtn.disabled = false;
      this.dom.chatInput.focus();
    }
  }

  bindChatEvents() {
    if (this.dom.chatInput) {
      this.dom.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !this.dom.chatInput.disabled) {
          this.sendChatMessage();
        }
      });
    }
    
    if (this.dom.chatSendBtn) {
      this.dom.chatSendBtn.addEventListener('click', () => {
        this.sendChatMessage();
      });
    }
  }

  async checkApiHealth() {
    try {
      const res = await api.checkHealth();
      if (res.status === 'ok') {
        if (res.api_key_configured) {
          this.dom.apiStatusDot.className = 'status-dot';
          this.dom.apiStatusText.textContent = 'AI Core Online';
        } else {
          this.dom.apiStatusDot.className = 'status-dot warning';
          this.dom.apiStatusText.textContent = 'Cosmic Bank Active';
        }
      }
    } catch {
      this.dom.apiStatusDot.className = 'status-dot warning';
      this.dom.apiStatusText.textContent = 'Offline Safe Mode';
    }
  }

  bindEvents() {
    // Topic chips
    this.dom.topicChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.audio.playClick();
        this.dom.topicChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.dom.topicInput.value = chip.dataset.topic || chip.textContent.trim();
        this.dom.topicInput.focus();
      });
    });

    // Difficulty selection
    this.dom.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.playClick();
        this.dom.diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.difficulty;
      });
    });

    // Question count selection
    this.dom.countBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.playClick();
        this.dom.countBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.totalQuestions = parseInt(btn.dataset.count, 10) || 5;
      });
    });

    // Launch & Restart Buttons
    this.dom.startBtn.addEventListener('click', () => this.startMission());
    this.dom.replayBtn.addEventListener('click', () => this.replayMission());
    this.dom.newMissionBtn.addEventListener('click', () => this.showScreen('setup'));

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Enter' && this.dom.setupScreen && !this.dom.setupScreen.classList.contains('hidden')) {
        this.startMission();
      }
      return;
    }

    // Next question on Enter or Space
    if ((e.key === 'Enter' || e.key === ' ') && this.questionAnswered && !this.dom.nextBtn.classList.contains('hidden')) {
      e.preventDefault();
      this.dom.nextBtn.click();
      return;
    }

    // Option hotkeys: A, B, C, D or 1, 2, 3, 4
    if (!this.questionAnswered && this.activeOptions.length > 0) {
      const key = e.key.toUpperCase();
      let index = -1;
      if (['A', 'B', 'C', 'D'].includes(key)) {
        index = key.charCodeAt(0) - 65;
      } else if (['1', '2', '3', '4'].includes(key)) {
        index = parseInt(key, 10) - 1;
      }

      if (index >= 0 && index < this.activeOptions.length) {
        e.preventDefault();
        const btn = this.dom.optionsContainer.children[index];
        if (btn && !btn.disabled) {
          const letter = this.activeOptions[index].letter;
          this.submitOption(letter, btn);
        }
      }
    }
  }

  showScreen(name) {
    this.clearError();
    const screens = ['setup', 'quiz', 'debrief'];
    screens.forEach(s => {
      const el = this.dom[`${s}Screen`];
      if (el) el.classList.toggle('hidden', s !== name);
    });

    if (name === 'setup') {
      this.sessionId = null;
      this.currentQuestion = 0;
      this.score = 0;
      this.streak = 0;
      this.updateHud();
      this.dom.progressBar.style.width = '0%';
    }
  }

  startLoading(message = null) {
    this.clearError();
    this.loadingMessage = message;
    if (this.dom.loadingIndicator) {
      this.dom.loadingIndicator.classList.remove('hidden');
      this.updateLoadingText(message);
    }
    this.dom.nextBtn.disabled = true;
    this.disableAllOptions(true);
  }

  stopLoading() {
    this.loadingMessage = null;
    if (this.dom.loadingIndicator) {
      this.dom.loadingIndicator.classList.add('hidden');
      this.updateLoadingText(null);
    }
    this.enableAllOptions();
    this.dom.nextBtn.disabled = false;
  }

  updateLoadingText(message) {
    if (this.dom.loadingText) {
      if (message) {
        this.dom.loadingText.textContent = message;
      } else {
        this.dom.loadingText.textContent = '';
      }
    }
  }

  clearLoadingState() {
    this.stopLoading();
  }

  disableAllOptions(disable) {
    const optionBtns = this.dom.optionsContainer.querySelectorAll('.option-card');
    optionBtns.forEach(b => b.disabled = disable);
  }

  enableAllOptions() {
    this.disableAllOptions(false);
  }

    async startMission() {
    this.clearError();
    this.topic = this.dom.topicInput.value.trim();

    if (!this.topic) {
      this.showError('Please select or enter a cosmic topic to launch.');
      this.dom.topicInput.focus();
      return;
    }

    this.audio.playClick();
    this.dom.startBtn.disabled = true;
    this.setSkeleton(true);
    this.startTime = Date.now();

    try {
      const data = await api.getQuestions(this.topic, this.totalQuestions, this.difficulty, true);
      this.sessionId = data.session_id;
      this.score = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.totalQuestions = data.total_questions;
      this.currentQuestion = data.question_number;

      this.showScreen('quiz');
      this.renderQuestionData(data);
    } catch (err) {
      this.showError(err.message || 'Mission initialization failed. Please try again.');
    } finally {
      this.dom.startBtn.disabled = false;
      this.setSkeleton(false);
    }
  }

  async replayMission() {
    this.audio.playClick();
    this.showScreen('setup');
    this.dom.topicInput.value = this.topic;
    this.startMission();
  }

    renderQuestionData(data) {
    this.questionAnswered = false;
    this.isTransitioning = false;
    this.updateHud();
    this.clearLoadingState();

    // Sector indicator
    this.dom.sectorIndicator.textContent = `SECTOR ${String(data.question_number).padStart(2, '0')} OF ${String(data.total_questions).padStart(2, '0')}`;

    // Difficulty badge
    const diff = data.difficulty || this.difficulty || 'medium';
    this.dom.difficultyPill.className = `difficulty-pill ${diff}`;
    this.dom.difficultyPill.textContent = diff.toUpperCase();

    // Fallback notice
    if (data.fallback_used) {
      this.dom.fallbackNotice.classList.remove('hidden');
    } else {
      this.dom.fallbackNotice.classList.add('hidden');
    }

    // Question text and options
    const parsed = this.normalizeQuestion(data);
    this.dom.questionHeading.textContent = parsed.question;
    this.activeOptions = parsed.options;

    // Reset feedback and Next button
    this.dom.feedbackBox.classList.add('hidden');
    this.dom.nextBtn.classList.add('hidden');
    this.clearLoadingState();

    // Build Option buttons
    this.dom.optionsContainer.innerHTML = '';
    parsed.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-card';
      btn.innerHTML = `
        <span class="option-letter-badge">${opt.letter}</span>
        <span class="option-text">${opt.text}</span>
        <span class="option-shortcut">${opt.letter}</span>
      `;
      btn.addEventListener('click', () => this.submitOption(opt.letter, btn));
      this.dom.optionsContainer.appendChild(btn);
    });
  }

  normalizeQuestion(data) {
    if (data.options && data.options.length >= 2) {
      return {
        question: data.question.replace(/^Question:\s*/i, '').split('\nA)')[0].trim(),
        options: data.options,
      };
    }

    // Fallback string parsing if data.options not directly structured
    const raw = data.question || '';
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    let question = '';
    const options = [];

    for (const line of lines) {
      const optMatch = line.match(/^([A-D])[).]\s*(.+)$/i);
      if (optMatch) {
        options.push({ letter: optMatch[1].toUpperCase(), text: optMatch[2] });
      } else if (!line.toLowerCase().startsWith('correct:') && !line.toLowerCase().startsWith('explanation:')) {
        question += (question ? ' ' : '') + line.replace(/^Question:\s*/i, '');
      }
    }

    return { question: question || raw, options };
  }

  async submitOption(selectedLetter, clickedBtn) {
    if (this.questionAnswered || this.isTransitioning) return;
    this.questionAnswered = true;
    this.isTransitioning = true;
    this.clearError();
    this.selectedOptionLetter = selectedLetter;

    // Highlight the selected option immediately for persistent feedback
    clickedBtn.classList.add('selected');
    clickedBtn.disabled = true;

    // Show loading state with appropriate message
    const loadingMessage = clickedBtn.querySelector('.option-text').textContent.includes('correct', -1) ? 
      'Verifying your answer...' : 'Checking answer...';
    this.startLoading(loadingMessage);

    try {
      const res = await api.submitAnswer(this.sessionId, selectedLetter);
      const isCorrect = res.correct;

      // Play sound FX
      if (isCorrect) {
        this.audio.playCorrect();
        this.streak += 1;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;
      } else {
        this.audio.playWrong();
        this.streak = 0;
      }

      this.score = res.score;
      this.updateHud();

      // Show correct/incorrect styling based on result
      if (isCorrect) {
        clickedBtn.classList.add('correct');
      } else {
        clickedBtn.classList.add('wrong');
        // If wrong, highlight the correct answer
        if (res.correct_answer) {
          const correctLetter = res.correct_answer.charAt(0).toUpperCase();
          const allBtns = this.dom.optionsContainer.querySelectorAll('.option-card');
          allBtns.forEach(b => {
            const letterBadge = b.querySelector('.option-letter-badge');
            if (letterBadge && letterBadge.textContent.trim() === correctLetter) {
              b.classList.add('correct');
            }
          });
        }
      }

      // Display feedback box
      this.dom.feedbackBox.className = `feedback-box ${isCorrect ? 'correct' : 'wrong'}`;
      this.dom.feedbackHeader.textContent = isCorrect ? '✨ Stellar Trajectory Confirmed!' : '⚠️ Celestial Navigation Deviation';
      this.dom.feedbackExplanation.textContent = res.explanation || (isCorrect ? 'Excellent deduction!' : `Correct Answer: ${res.correct_answer}`);
      this.dom.feedbackBox.classList.remove('hidden');

      if (res.finished) {
        this.dom.nextBtn.classList.add('hidden');
        setTimeout(() => {
          this.dom.progressBar.style.width = '100%';
          this.showDebrief(res);
          this.isTransitioning = false;
          this.stopLoading();
        }, 1600);
      } else {
        this.dom.nextBtn.classList.remove('hidden');
        this.dom.nextBtn.onclick = () => {
          this.audio.playClick();
          this.currentQuestion = res.next_question.question_number;
          this.renderQuestionData(res.next_question);
        };
        this.isTransitioning = false;
        this.stopLoading();
      }
    } catch (err) {
      this.showError(err.message || 'Transmission failed. Retrying...');
      this.selectedOptionLetter = null;
      // Reset selected state on error
      clickedBtn.classList.remove('selected');
      clickedBtn.disabled = false;
      this.stopLoading();
    }
  }

  showDebrief(finalData) {
    this.audio.playVictory();
    this.showScreen('debrief');

    const total = finalData.total_questions || this.totalQuestions;
    const finalScore = finalData.final_score !== undefined ? finalData.final_score : this.score;
    const percentage = Math.round((finalScore / total) * 100);

    // Cosmic Rank Designation
    let rank = '🧑‍🚀 Star Cadet';
    if (percentage === 100) rank = '👑 Galactic Grandmaster';
    else if (percentage >= 80) rank = '🚀 Fleet Commander';
    else if (percentage >= 60) rank = '🛸 Orbital Navigator';

    this.dom.rankBadge.textContent = rank;
    this.dom.finalScoreHuge.textContent = `${finalScore} / ${total}`;
    this.dom.metricAccuracy.textContent = `${percentage}%`;
    this.dom.metricStreak.textContent = `${this.maxStreak}x 🔥`;
    this.dom.metricTopic.textContent = this.topic.length > 16 ? `${this.topic.slice(0, 16)}...` : this.topic;

    // High score check
    const isHighScore = this.saveHighScore(this.topic, finalScore);
    this.dom.highScoreBadge.style.display = isHighScore ? 'inline-flex' : 'none';
  }

  saveHighScore(topic, score) {
    try {
      const key = 'quizbot_cosmic_high_scores';
      const scores = JSON.parse(localStorage.getItem(key) || '{}');
      const prev = scores[topic] || 0;
      if (score > prev) {
        scores[topic] = score;
        localStorage.setItem(key, JSON.stringify(scores));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => {
  window.quizApp = new QuizApp();
});
