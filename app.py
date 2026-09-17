import os
import re
import time
import uuid
import random
import logging
from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv

load_dotenv()

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("quizbot")

app = Flask(__name__, static_folder='static', static_url_path='')

API_BASE_URL = os.environ.get("VITE_API_BASE_URL", "/api")
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
_genai_model = DEFAULT_MODEL
_genai_client = None

# Active quiz sessions in-memory
sessions = {}

# Rich Fallback Question Bank (used if Gemini API key is missing or quota/rate limit is exceeded)
FALLBACK_QUESTIONS = {
    "space": [
        {
            "question": "What is the boundary surrounding a black hole beyond which nothing, not even light, can escape?",
            "options": [
                {"letter": "A", "text": "Accretion Disk"},
                {"letter": "B", "text": "Event Horizon"},
                {"letter": "C", "text": "Singularity"},
                {"letter": "D", "text": "Photon Sphere"}
            ],
            "correct": "B",
            "explanation": "The event horizon marks the mathematical threshold where gravitational pull becomes inescapable."
        },
        {
            "question": "Which moon in our solar system is believed to have a vast subsurface liquid ocean beneath its icy crust?",
            "options": [
                {"letter": "A", "text": "Europa"},
                {"letter": "B", "text": "Phobos"},
                {"letter": "C", "text": "Io"},
                {"letter": "D", "text": "Deimos"}
            ],
            "correct": "A",
            "explanation": "Europa, an icy moon of Jupiter, harbors an ocean containing twice as much water as Earth's oceans combined."
        },
        {
            "question": "What stellar phenomenon occurs when a massive star collapses under its own gravity at the end of its life?",
            "options": [
                {"letter": "A", "text": "Protostar Formation"},
                {"letter": "B", "text": "Planetary Nebula"},
                {"letter": "C", "text": "Supernova Explosion"},
                {"letter": "D", "text": "Coronal Mass Ejection"}
            ],
            "correct": "C",
            "explanation": "A supernova is a catastrophic cosmic explosion triggered by core collapse in giant stars."
        },
        {
            "question": "How long does light emitted from the Sun take to reach Earth on average?",
            "options": [
                {"letter": "A", "text": "About 8 minutes and 20 seconds"},
                {"letter": "B", "text": "Instantaneous"},
                {"letter": "C", "text": "1 hour 15 minutes"},
                {"letter": "D", "text": "24 hours"}
            ],
            "correct": "A",
            "explanation": "Traveling at roughly 300,000 km/s across 150 million km, sunlight takes approximately 8.3 minutes to reach Earth."
        },
        {
            "question": "Which space telescope, launched in December 2021, orbits the Sun at the second Lagrange point (L2)?",
            "options": [
                {"letter": "A", "text": "Hubble Space Telescope"},
                {"letter": "B", "text": "James Webb Space Telescope"},
                {"letter": "C", "text": "Spitzer Space Telescope"},
                {"letter": "D", "text": "Kepler Observatory"}
            ],
            "correct": "B",
            "explanation": "The James Webb Space Telescope (JWST) peers back 13.5 billion years into cosmic dawn from Sun-Earth L2."
        }
    ],
    "physics": [
        {
            "question": "What is the speed of light in a vacuum represented by 'c' in Einstein's E = mc²?",
            "options": [
                {"letter": "A", "text": "~300,000 km/s"},
                {"letter": "B", "text": "~150,000 km/s"},
                {"letter": "C", "text": "~1,000,000 km/s"},
                {"letter": "D", "text": "~30,000 km/s"}
            ],
            "correct": "A",
            "explanation": "Light in a vacuum travels at exactly 299,792,458 meters per second."
        },
        {
            "question": "Which quantum principle asserts that one cannot simultaneously know the exact position and momentum of a particle?",
            "options": [
                {"letter": "A", "text": "Pauli Exclusion Principle"},
                {"letter": "B", "text": "Heisenberg Uncertainty Principle"},
                {"letter": "C", "text": "Born Rule"},
                {"letter": "D", "text": "Schrodinger Equivalence"}
            ],
            "correct": "B",
            "explanation": "Heisenberg's Uncertainty Principle reflects a fundamental wave property of quantum mechanics."
        }
    ],
    "general": [
        {
            "question": "What is the most abundant chemical element in the observable universe?",
            "options": [
                {"letter": "A", "text": "Helium"},
                {"letter": "B", "text": "Oxygen"},
                {"letter": "C", "text": "Hydrogen"},
                {"letter": "D", "text": "Carbon"}
            ],
            "correct": "C",
            "explanation": "Hydrogen accounts for roughly 75% of all elemental mass in the cosmos."
        },
        {
            "question": "Which programming language, widely used for data science and AI, was named after Monty Python?",
            "options": [
                {"letter": "A", "text": "Java"},
                {"letter": "B", "text": "Python"},
                {"letter": "C", "text": "Ruby"},
                {"letter": "D", "text": "Rust"}
            ],
            "correct": "B",
            "explanation": "Guido van Rossum named Python after the British comedy troupe Monty Python's Flying Circus."
        }
    ]
}


def get_genai_client():
    global _genai_client
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing or empty.")
    if _genai_client is None:
        from google import genai
        _genai_client = genai.Client(api_key=api_key)
    return _genai_client


def cleanup_old_sessions():
    now = time.time()
    expired = [sid for sid, s in sessions.items() if now - s.get("timestamp", now) > 7200]
    for sid in expired:
        sessions.pop(sid, None)


def build_raw_question_text(q_data):
    """Format question data into standard text:
       Question: ...
       A) ...
       B) ...
       C) ...
       D) ...
    """
    lines = [f"Question: {q_data['question']}"]
    for opt in q_data["options"]:
        lines.append(f"{opt['letter']}) {opt['text']}")
    return "\n".join(lines)


def get_fallback_question(topic, used_indices=None):
    """Select or synthesize a high-quality fallback question for a topic."""
    used_indices = used_indices or set()
    t_lower = (topic or "").lower()

    category = "general"
    if any(k in t_lower for k in ["space", "astronomy", "planet", "galaxy", "black hole", "mars", "nasa", "moon", "star"]):
        category = "space"
    elif any(k in t_lower for k in ["physic", "quantum", "gravity", "energy", "mechanic", "atom"]):
        category = "physics"

    pool = FALLBACK_QUESTIONS.get(category, FALLBACK_QUESTIONS["general"])
    available = [i for i in range(len(pool)) if i not in used_indices]
    if not available:
        available = list(range(len(pool)))

    idx = random.choice(available)
    selected = pool[idx]

    correct_opt_text = ""
    for o in selected["options"]:
        if o["letter"] == selected["correct"]:
            correct_opt_text = f"{o['letter']}) {o['text']}"

    return {
        "question": selected["question"],
        "options": selected["options"],
        "raw_text": build_raw_question_text(selected),
        "correct_letter": selected["correct"],
        "correct_answer": correct_opt_text,
        "explanation": selected.get("explanation", ""),
        "fallback_used": True,
        "pool_index": idx
    }


def parse_ai_response(text):
    """Parse Gemini output into question, options, correct letter, and explanation."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    question = ""
    options = []
    correct_letter = ""
    explanation = ""

    for line in lines:
        if line.lower().startswith("question:"):
            question = line[len("question:"):].strip()
        elif re.match(r"^[A-D][\).]\s*", line, re.IGNORECASE):
            match = re.match(r"^([A-D])[\).]\s*(.*)$", line, re.IGNORECASE)
            if match:
                letter = match.group(1).upper()
                opt_text = match.group(2).strip()
                options.append({"letter": letter, "text": opt_text})
        elif line.lower().startswith("correct:"):
            c_text = line[len("correct:"):].strip().upper()
            m = re.search(r"[A-D]", c_text)
            if m:
                correct_letter = m.group(0)
        elif line.lower().startswith("explanation:"):
            explanation = line[len("explanation:"):].strip()
        elif not question:
            question = line

    # If options didn't parse with standard prefix, ensure at least 4 placeholders
    if len(options) < 2:
        return None

    correct_answer_text = ""
    for opt in options:
        if opt["letter"] == correct_letter:
            correct_answer_text = f"{opt['letter']}) {opt['text']}"

    # Build standard raw_text for backwards compatibility
    raw_lines = [f"Question: {question}"]
    for opt in options:
        raw_lines.append(f"{opt['letter']}) {opt['text']}")
    raw_text = "\n".join(raw_lines)

    return {
        "question": question,
        "options": options,
        "raw_text": raw_text,
        "correct_letter": correct_letter or "A",
        "correct_answer": correct_answer_text or f"A) {options[0]['text']}",
        "explanation": explanation or "Verified cosmic trivia.",
        "fallback_used": False
    }


def generate_question_with_ai(topic, difficulty="medium"):
    """Try to generate a question using Gemini API with model failover."""
    client = get_genai_client()

    candidate_models = [
        _genai_model,
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
    ]
    # Deduplicate while preserving order
    seen = set()
    models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

    prompt = f"""Generate exactly 1 multiple-choice quiz question about: "{topic}".
Difficulty level: {difficulty}.
Requirements:
1. Provide exactly 4 options labeled A), B), C), D).
2. Exactly one option must be unequivocally correct.
3. Keep the question engaging and educational.
4. Format your output EXACTLY as follows:

Question: <Question text>
A) <Option A>
B) <Option B>
C) <Option C>
D) <Option D>
Correct: <Letter A, B, C, or D>
Explanation: <1-2 sentence cosmic explanation>
"""

    last_err = None
    for model_name in models_to_try:
        try:
            logger.info("Attempting Gemini question generation with model: %s", model_name)
            response = client.models.generate_content(model=model_name, contents=prompt)
            if response and response.text:
                parsed = parse_ai_response(response.text)
                if parsed:
                    return parsed
                else:
                    logger.warning("Failed to parse Gemini output structure for model %s: %s", model_name, response.text)
        except Exception as e:
            last_err = e
            logger.warning("Gemini model %s failed: %s", model_name, str(e))
            # Continue trying next model if 404, 503, etc.
            continue

    if last_err:
        raise last_err
    raise RuntimeError("No candidate Gemini model succeeded in generating question.")


# ==========================================
# Routes & API Endpoints
# ==========================================

@app.route("/")
def index():
    """Serve the single-page application entrypoint."""
    return send_from_directory("static", "index.html")


@app.route("/static/<path:filename>")
def serve_static(filename):
    """Direct static asset handler to ensure both /static/* and root paths resolve."""
    return send_from_directory("static", filename)


@app.route("/api/health")
def health():
    """Health check endpoint exposing API key configuration and model status."""
    has_key = bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY").strip())
    return jsonify({
        "status": "ok",
        "api_key_configured": has_key,
        "model": _genai_model
    })


@app.route("/api/generate", methods=["POST"])
@app.route("/api/questions", methods=["POST"])
@app.route("/api/start", methods=["POST"])
def start_quiz():
    """Generate the initial question and initialize a quiz session."""
    cleanup_old_sessions()
    data = request.get_json(force=True, silent=True) or {}
    topic = (data.get("topic") or "").strip()

    if not topic:
        return jsonify({"error": "Topic is required", "code": "INVALID_INPUT"}), 400

    try:
        num_questions = int(data.get("num_questions", data.get("numQuestions", 5)))
    except (ValueError, TypeError):
        num_questions = 5
    num_questions = max(1, min(10, num_questions))

    difficulty = data.get("difficulty", "easy").lower()
    allow_fallback = data.get("allow_fallback", True)

    session_id = str(uuid.uuid4())
    question_data = None
    fallback_used = False
    error_notice = None

    # Try generating with Gemini
    has_api_key = bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY").strip())
    if not has_api_key:
        logger.warning("GEMINI_API_KEY is not configured.")
        if not allow_fallback:
            return jsonify({
                "error": "Gemini API key is not configured on the server. Please set GEMINI_API_KEY.",
                "code": "MISSING_API_KEY"
            }), 500
        error_notice = "GEMINI_API_KEY not configured. Switched to Cosmic Fallback Bank."
        question_data = get_fallback_question(topic)
        fallback_used = True
    else:
        try:
            question_data = generate_question_with_ai(topic, difficulty=difficulty)
        except Exception as e:
            logger.exception("Gemini API generation failed for topic '%s': %s", topic, e)
            if not allow_fallback:
                return jsonify({
                    "error": f"AI Generation Failed: {str(e)}",
                    "code": "AI_GENERATION_FAILED",
                    "details": str(e)
                }), 502
            error_notice = f"AI Generation limit/network issue ({type(e).__name__}). Switched to Cosmic Fallback Bank."
            question_data = get_fallback_question(topic)
            fallback_used = True

    used_pool_indices = set()
    if question_data.get("pool_index") is not None:
        used_pool_indices.add(question_data["pool_index"])

    sessions[session_id] = {
        "session_id": session_id,
        "topic": topic,
        "num_questions": num_questions,
        "difficulty": difficulty,
        "current": 1,
        "score": 0,
        "streak": 0,
        "timestamp": time.time(),
        "current_question": question_data,
        "fallback_used": fallback_used,
        "used_indices": used_pool_indices
    }

    logger.info("Started session %s for topic '%s' (Total: %d, Fallback: %s)", session_id, topic, num_questions, fallback_used)

    return jsonify({
        "session_id": session_id,
        "question_number": 1,
        "total_questions": num_questions,
        "question": question_data["raw_text"],
        "options": question_data["options"],
        "difficulty": difficulty,
        "fallback_used": fallback_used,
        "notice": error_notice
    })


@app.route("/api/answer", methods=["POST"])
@app.route("/api/quiz/submit", methods=["POST"])
def answer_question():
    """Verify submitted answer, update score/streak, and prepare the next question."""
    cleanup_old_sessions()
    data = request.get_json(force=True, silent=True) or {}
    session_id = data.get("session_id") or data.get("sessionId")
    user_answer = (data.get("answer") or "").strip().upper()

    session = sessions.get(session_id)
    if not session:
        return jsonify({"error": "Invalid or expired session. Please start a new quiz.", "code": "EXPIRED_SESSION"}), 400

    session["timestamp"] = time.time()
    curr_q = session.get("current_question", {})
    correct_letter = curr_q.get("correct_letter", "").upper()
    correct_answer = curr_q.get("correct_answer", "")
    explanation = curr_q.get("explanation", "")

    # Compare user answer (handles both 'A' or 'A) Option Text' or direct text match)
    user_letter_match = re.match(r"^([A-D])", user_answer)
    user_letter = user_letter_match.group(1).upper() if user_letter_match else ""

    is_correct = False
    if user_letter and correct_letter:
        is_correct = (user_letter == correct_letter)
    elif correct_answer and (user_answer.lower() in correct_answer.lower() or correct_answer.lower() in user_answer.lower()):
        is_correct = True

    if is_correct:
        session["score"] += 1
        session["streak"] += 1
    else:
        session["streak"] = 0

    result = {
        "correct": is_correct,
        "correct_answer": correct_answer or f"{correct_letter}) Option {correct_letter}",
        "explanation": explanation,
        "score": session["score"],
        "streak": session["streak"],
        "question_number": session["current"],
        "total_questions": session["num_questions"]
    }

    if session["current"] >= session["num_questions"]:
        result["finished"] = True
        result["final_score"] = session["score"]
        logger.info("Finished session %s with score %d/%d", session_id, session["score"], session["num_questions"])
        sessions.pop(session_id, None)
    else:
        session["current"] += 1
        next_q = None
        next_fallback = session.get("fallback_used", False)
        error_notice = None

        if not next_fallback:
            try:
                next_q = generate_question_with_ai(session["topic"], difficulty=session["difficulty"])
            except Exception as e:
                logger.warning("Gemini failed on question %d: %s. Reverting to fallback pool.", session["current"], e)
                next_fallback = True
                error_notice = "Switched to Cosmic Fallback Bank due to AI limit."

        if next_fallback or not next_q:
            next_q = get_fallback_question(session["topic"], used_indices=session.get("used_indices"))
            if next_q.get("pool_index") is not None:
                session.setdefault("used_indices", set()).add(next_q["pool_index"])

        session["current_question"] = next_q
        session["fallback_used"] = next_fallback

        result["finished"] = False
        result["next_question"] = {
            "question_number": session["current"],
            "total_questions": session["num_questions"],
            "question": next_q["raw_text"],
            "options": next_q["options"],
            "fallback_used": next_fallback,
            "notice": error_notice
        }

    return jsonify(result)


@app.route("/api/leaderboard", methods=["GET", "POST"])
def leaderboard():
    """Return cosmic high scores."""
    return jsonify({
        "status": "ok",
        "leaders": [
            {"rank": 1, "callsign": "AstroVoyager", "score": 5, "streak": 5, "topic": "Black Holes & Gravity"},
            {"rank": 2, "callsign": "CosmicNebula", "score": 5, "streak": 4, "topic": "Quantum Mechanics"},
            {"rank": 3, "callsign": "SolarFlare", "score": 4, "streak": 3, "topic": "Mars Exploration"},
            {"rank": 4, "callsign": "NovaSpectra", "score": 4, "streak": 2, "topic": "Exoplanets"}
        ]
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("Launching QuizBot on http://0.0.0.0:%d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
