const metaApiBase = document.querySelector('meta[name="api-base-url"]')?.content?.trim();
const API_BASE_URL = (metaApiBase && !metaApiBase.startsWith('{{')) ? metaApiBase : '/api';

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

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new Error(`Network failure: Unable to reach server (${netErr.message || 'Offline'})`);
  }

  if (response.status === 401) {
    setAuthToken(null);
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorCode = 'SERVER_ERROR';
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorMessage;
      errorCode = errorJson.code || errorCode;
    } catch {
      // keep fallback string if non-json
    }
    const err = new Error(errorMessage);
    err.code = errorCode;
    err.status = response.status;
    throw err;
  }

  return response.json();
}

const api = {
  checkHealth: () =>
    request('/health', {
      method: 'GET',
    }),

  getQuestions: async (topic, numQuestions = 5, difficulty = 'medium', allowFallback = true) => {
    try {
      return await request('/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic,
          num_questions: numQuestions,
          difficulty,
          allow_fallback: allowFallback,
        }),
      });
    } catch (err) {
      // Re-throw with additional context for UI handling
      throw new Error(`Failed to generate question: ${err.message || 'Unknown error'}`);
    }
  },

  submitAnswer: async (sessionId, answer) => {
    try {
      return await request('/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, answer }),
      });
    } catch (err) {
      // Re-throw with additional context for UI handling
      throw new Error(`Failed to submit answer: ${err.message || 'Unknown error'}`);
    }
  },

  startChat: async () => {
    try {
      return await request('/chat/start', {
        method: 'POST',
      });
    } catch (err) {
      throw new Error(`Failed to start chat: ${err.message || 'Unknown error'}`);
    }
  },

  chat: async (sessionId, message) => {
    try {
      return await request('/chat', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, message }),
      });
    } catch (err) {
      throw new Error(`Failed to send message: ${err.message || 'Unknown error'}`);
    }
  },

  getLeaderboard: () =>
    request('/leaderboard', {
      method: 'GET',
    }),
};

export { api, setAuthToken, getAuthHeaders, API_BASE_URL };
