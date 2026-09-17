import os
import uuid
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="static")

API_BASE_URL = os.environ.get("VITE_API_BASE_URL", "/api")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-production")

sessions = {}

_genai_client = None
_genai_model = "gemini-2.5-flash"


def get_genai_client():
    global _genai_client
    if _genai_client is None:
        from google import genai
        _genai_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _genai_client


def generate_question(topic):
    client = get_genai_client()
    prompt = f"""Give me one multiple-choice question about {topic}.
Format your response EXACTLY like this, with no extra commentary:
Question: <question text>
A) <option>
B) <option>
C) <option>
D) <option>
Do not reveal the answer."""
    response = client.models.generate_content(model=_genai_model, contents=prompt)
    return response.text.strip()


def check_answer(question_text, answer):
    client = get_genai_client()
    prompt = f"""Here is the question:
{question_text}

The user's answer is: {answer}

Respond in exactly two lines:
Line 1: only the word Correct or Wrong
Line 2: the correct answer, as "Letter) full option text\""""
    result = client.models.generate_content(model=_genai_model, contents=prompt)
    lines = [l.strip() for l in result.text.split("\n") if l.strip()]
    is_correct = bool(lines) and "correct" in lines[0].lower()
    correct_answer = lines[1] if len(lines) > 1 else ""
    return is_correct, correct_answer


def get_template():
    template_path = os.path.join(app.static_folder, "index.html")
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(template_path, "r", encoding="latin-1") as f:
            return f.read()
    except FileNotFoundError:
        return """
        <!DOCTYPE html>
        <html>
        <head><title>QuizBot</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0B0F19; color: #f1f5f9;">
            <div style="text-align: center; padding: 2rem; background: rgba(17,24,39,0.8); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                <h1>QuizBot</h1>
                <p style="color: #EF4444;">Template file not found. Please ensure static/index.html exists.</p>
            </div>
        </body>
        </html>
        """
    except Exception as e:
        return f"""
        <!DOCTYPE html>
        <html>
        <head><title>QuizBot</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0B0F19; color: #f1f5f9;">
            <div style="text-align: center; padding: 2rem; background: rgba(17,24,39,0.8); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                <h1>QuizBot</h1>
                <p style="color: #EF4444;">Failed to load template: {e}</p>
            </div>
        </body>
        </html>
        """


@app.route("/")
def index():
    template = get_template()
    return render_template_string(template, api_base_url=API_BASE_URL)


@app.route("/api/start", methods=["POST"])
@app.route("/api/questions", methods=["POST"])
def start_quiz():
    data = request.get_json(force=True, silent=True) or {}
    topic = (data.get("topic") or "").strip()

    if not topic:
        return jsonify({"error": "Topic is required"}), 400

    try:
        num_questions = int(data.get("num_questions", data.get("numQuestions", 5)))
    except (ValueError, TypeError):
        num_questions = 5
    num_questions = max(1, min(5, num_questions))

    session_id = str(uuid.uuid4())

    try:
        question_text = generate_question(topic)
    except Exception as e:
        return jsonify({"error": f"Failed to generate question: {e}"}), 500

    sessions[session_id] = {
        "topic": topic,
        "num_questions": num_questions,
        "current": 1,
        "score": 0,
        "question_text": question_text,
    }

    return jsonify({
        "session_id": session_id,
        "question_number": 1,
        "total_questions": num_questions,
        "question": question_text,
    })


@app.route("/api/answer", methods=["POST"])
@app.route("/api/quiz/submit", methods=["POST"])
def answer_question():
    data = request.get_json(force=True, silent=True) or {}
    session_id = data.get("session_id") or data.get("sessionId")
    answer = (data.get("answer") or "").strip()

    session = sessions.get(session_id)
    if not session:
        return jsonify({"error": "Invalid or expired session"}), 400

    try:
        is_correct, correct_answer = check_answer(session["question_text"], answer)
    except Exception as e:
        return jsonify({"error": f"Failed to check answer: {e}"}), 500

    if is_correct:
        session["score"] += 1

    result = {
        "correct": is_correct,
        "correct_answer": correct_answer,
        "score": session["score"],
        "question_number": session["current"],
        "total_questions": session["num_questions"],
    }

    if session["current"] >= session["num_questions"]:
        result["finished"] = True
        result["final_score"] = session["score"]
        del sessions[session_id]
    else:
        session["current"] += 1
        try:
            question_text = generate_question(session["topic"])
        except Exception as e:
            return jsonify({"error": f"Failed to generate next question: {e}"}), 500
        session["question_text"] = question_text
        result["finished"] = False
        result["next_question"] = {
            "question_number": session["current"],
            "total_questions": session["num_questions"],
            "question": question_text,
        }

    return jsonify(result)


@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    return jsonify([])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
