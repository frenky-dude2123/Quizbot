import { api, setAuthToken } from './api.js';

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', class: 'easy' },
  medium: { label: 'Medium', class: 'medium' },
  hard: { label: 'Hard', class: 'hard' },
};

class QuizApp {
  constructor() {
    this.sessionId = null;
    this.currentOptions = [];
    this.score = 0;
    this.totalQuestions = 0;
    this.currentQuestion = 0;
    this.isTransitioning = false;
    this.streak = 0;
    this.difficulty = 'easy';

    this.els = {
      error: document.getElementById('error'),
      setupScreen: document.getElementById('setup-screen'),
      quizScreen: document.getElementById('quiz-screen'),
      finalScreen: document.getElementById('final-screen'),
      loading: document.getElementById('loading'),
      skeleton: document.getElementById('skeleton'),
      errorFallback: document.getElementById('error-fallback'),
      topic: document.getElementById('topic'),
      numQuestions: document.getElementById('num-questions'),
      startBtn: document.getElementById('start-btn'),
      progressText: document.getElementById('progress-text'),
      scoreText: document.getElementById('score-text'),
      questionText: document.getElementById('question-text'),
      optionsContainer: document.getElementById('options-container'),
      feedback: document.getElementById('feedback'),
      nextBtn: document.getElementById('next-btn'),
      finalScore: document.getElementById('final-score'),
      restartBtn: document.getElementById('restart-btn'),
      retryBtn: document.getElementById('retry-btn'),
      headerScore: document.getElementById('header-score'),
      streakBadge: document.getElementById('streak-badge'),
      streakCount: document.getElementById('streak-count'),
      progressFill: document.getElementById('progress-fill'),
      questionNumberLabel: document.getElementById('question-number-label'),
      difficultyBadge: document.getElementById('difficulty-badge'),
      highScoreRow: document.getElementById('high-score-row'),
    };

    this.highScores = this.loadHighScores();
    this.bindEvents();
  }

  loadHighScores() {
    try {
      const raw = localStorage.getItem('quizbot_high_scores');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveHighScores() {
    try {
      localStorage.setItem('quizbot_high_scores', JSON.stringify(this.highScores));
    } catch {
      // ignore storage errors
    }
  }

  getTopicHighScore(topic) {
    return this.highScores[topic] || 0;
  }

  setTopicHighScore(topic, score) {
    const current = this.getTopicHighScore(topic);
    if (score > current) {
      this.highScores[topic] = score;
      this.saveHighScores();
      return true;
    }
    return false;
  }

  bindEvents() {
    this.els.startBtn.addEventListener('click', () => this.startQuiz());
    this.els.restartBtn.addEventListener('click', () => this.restart());
    this.els.retryBtn?.addEventListener('click', () => this.showScreen('setup'));
  }

  updateHeader() {
    this.els.headerScore.textContent = this.score;
    if (this.streak > 1) {
      this.els.streakBadge.style.display = 'inline-flex';
      this.els.streakCount.textContent = this.streak;
    } else {
      this.els.streakBadge.style.display = 'none';
    }

    if (this.totalQuestions > 0) {
      const pct = ((this.currentQuestion - 1) / this.totalQuestions) * 100;
      this.els.progressFill.style.width = `${pct}%`;
    }
  }

  updateDifficultyBadge() {
    const config = DIFFICULTY_CONFIG[this.difficulty] || DIFFICULTY_CONFIG.easy;
    const badge = this.els.difficultyBadge;
    badge.textContent = config.label;
    badge.className = `difficulty-badge ${config.class}`;
  }

  showError(msg) {
    this.els.error.textContent = msg;
    this.els.error.classList.remove('hidden');
  }

  clearError() {
    this.els.error.classList.add('hidden');
  }

  setLoading(isLoading) {
    this.els.loading.classList.toggle('hidden', !isLoading);
  }

  showSkeleton(show) {
    this.els.skeleton.classList.toggle('hidden', !show);
  }

  showScreen(name) {
    const screens = ['setup', 'quiz', 'final'];
    screens.forEach(s => {
      this.els[`${s}Screen`].classList.toggle('hidden', s !== name);
      if (s === name) {
        this.animateScreenIn(this.els[`${s}Screen`]);
      }
    });

    if (name === 'setup') {
      this.els.errorFallback.classList.add('hidden');
      this.updateHeader();
    }
  }

  animateScreenIn(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(12px)';
    requestAnimationFrame(() => {
      element.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  animateQuestionExit(callback) {
    const container = this.els.optionsContainer;
    container.classList.add('question-exit');
    setTimeout(() => {
      container.classList.remove('question-exit');
      callback();
      container.classList.add('question-enter');
      setTimeout(() => {
        container.classList.remove('question-enter');
      }, 400);
    }, 250);
  }

  showErrorFallback(message) {
    this.els.errorFallback.querySelector('.error-message').textContent = message;
    this.els.errorFallback.classList.remove('hidden');
    this.showSkeleton(false);
    this.animateScreenIn(this.els.errorFallback);
  }

  async startQuiz() {
    this.clearError();
    const topic = this.els.topic.value.trim();
    const numQuestions = parseInt(this.els.numQuestions.value, 10);

    if (!topic) {
      this.showError('Please enter a topic.');
      return;
    }

    this.setLoading(true);
    this.showSkeleton(true);
    this.showScreen('setup');

    try {
      const data = await api.getQuestions(topic, numQuestions);
      this.sessionId = data.session_id;
      this.score = 0;
      this.totalQuestions = data.total_questions;
      this.currentQuestion = data.question_number;
      this.streak = 0;
      this.difficulty = data.difficulty || 'easy';

      this.updateHeader();
      this.updateDifficultyBadge();
      this.showSkeleton(false);
      this.showScreen('quiz');
      this.renderQuestion(data.question_number, data.total_questions, 0, data.question);
    } catch (e) {
      this.showErrorFallback(e.message || 'Failed to connect to the server. Please check your connection and try again.');
    } finally {
      this.setLoading(false);
    }
  }

  renderQuestion(qNum, total, score, rawQuestion) {
    this.els.questionNumberLabel.textContent = `Question ${qNum} of ${total}`;
    this.els.scoreText.textContent = `Score: ${score}`;
    this.els.feedback.classList.add('hidden');
    this.els.nextBtn.classList.add('hidden');

    const { question, options } = this.parseQuestion(rawQuestion);
    this.currentOptions = options;

    this.els.questionText.textContent = question || rawQuestion;

    const container = this.els.optionsContainer;
    container.innerHTML = '';

    if (options.length > 0) {
      options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-letter">${opt.letter}</span><span class="option-text">${opt.text}</span>`;
        btn.style.transitionDelay = `${index * 60}ms`;
        btn.addEventListener('click', () => this.submitAnswer(opt.letter, btn));
        container.appendChild(btn);

        requestAnimationFrame(() => {
          btn.style.opacity = '1';
          btn.style.transform = 'translateY(0)';
        });
      });
    } else {
      const input = document.createElement('input');
      input.id = 'fallback-answer';
      input.placeholder = 'Type your answer';
      const btn = document.createElement('button');
      btn.textContent = 'Submit';
      btn.addEventListener('click', () => this.submitAnswer(input.value, btn));
      container.appendChild(input);
      container.appendChild(btn);
    }
  }

  parseQuestion(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    let question = '';
    const options = [];
    for (const line of lines) {
      const optMatch = line.match(/^([A-D])[).]\s*(.+)$/i);
      if (optMatch) {
        options.push({ letter: optMatch[1].toUpperCase(), text: optMatch[2] });
      } else {
        question += (question ? ' ' : '') + line.replace(/^Question:\s*/i, '');
      }
    }
    return { question, options };
  }

  async submitAnswer(answer, clickedBtn) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.clearError();

    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    this.setLoading(true);

    try {
      const data = await api.submitAnswer(this.sessionId, answer);

      if (clickedBtn) {
        clickedBtn.classList.add(data.correct ? 'correct' : 'wrong');
        clickedBtn.classList.add(data.correct ? 'pulse-correct' : 'shake-wrong');
      }

      const fb = this.els.feedback;
      fb.classList.remove('hidden', 'correct', 'wrong');
      fb.classList.add(data.correct ? 'correct' : 'wrong');
      fb.textContent = data.correct ? 'Correct! 🎉' : `Wrong. Correct answer: ${data.correct_answer}`;

      this.els.scoreText.textContent = `Score: ${data.score}`;

      if (data.correct) {
        this.streak += 1;
      } else {
        this.streak = 0;
      }
      this.updateHeader();

      if (data.finished) {
        const topic = this.els.topic.value.trim();
        const isNewHighScore = this.setTopicHighScore(topic, data.final_score);

        setTimeout(() => {
          this.els.progressFill.style.width = '100%';
          this.els.finalScore.textContent = `${data.final_score} / ${data.total_questions}`;
          this.els.highScoreRow.style.display = isNewHighScore ? 'inline-flex' : 'none';
          this.showScreen('final');
          this.isTransitioning = false;
        }, 1500);
      } else {
        this.els.nextBtn.classList.remove('hidden');
        this.els.nextBtn.onclick = () => {
          this.nextQuestion(data);
          this.isTransitioning = false;
        };
        this.isTransitioning = false;
      }
    } catch (e) {
      this.showError(e.message);
      this.isTransitioning = false;
    } finally {
      this.setLoading(false);
    }
  }

  nextQuestion(data) {
    this.currentQuestion = data.next_question.question_number;
    this.score = data.score;
    this.updateHeader();
    this.animateQuestionExit(() => {
      this.renderQuestion(
        data.next_question.question_number,
        data.next_question.total_questions,
        data.score,
        data.next_question.question
      );
    });
  }

  restart() {
    this.sessionId = null;
    this.score = 0;
    this.streak = 0;
    this.els.topic.value = '';
    this.els.progressFill.style.width = '0%';
    this.els.streakBadge.style.display = 'none';
    this.els.highScoreRow.style.display = 'none';
    this.updateHeader();
    this.showScreen('setup');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.quizApp = new QuizApp();
});
