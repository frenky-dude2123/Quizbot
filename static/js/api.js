const API_BASE_URL = document.querySelector('meta[name="api-base-url"]')?.content || '/api';

let authToken = localStorage.getItem('auth_token');

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    setAuthToken(null);
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

const api = {
  getQuestions: (topic, numQuestions) =>
    request('/questions', {
      method: 'POST',
      body: JSON.stringify({ topic, num_questions: numQuestions }),
    }),

  submitAnswer: (sessionId, answer) =>
    request('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, answer }),
    }),

  getLeaderboard: () =>
    request('/leaderboard', {
      method: 'GET',
    }),
};

export { api, setAuthToken, getAuthHeaders };
