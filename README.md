# QuizBot

A small web app: type a topic, answer AI-generated multiple-choice questions, get scored.

## Local setup

```bash
cd quiz-app
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a file named `.env` in this folder (copy `.env.example` and rename it)
and put your real key inside:

```
GEMINI_API_KEY=your_real_key_here
```

`.env` is listed in `.gitignore`, so it will never be committed. Then run:

```bash
python app.py
```

Visit http://localhost:5000

## Deployment

See the step-by-step guide provided alongside this project (Render is the
recommended free option). The short version:

1. Push this folder to a GitHub repo.
2. Create a new Web Service on Render, connect the repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. Add environment variable `GEMINI_API_KEY` in Render's dashboard.
6. Deploy.
