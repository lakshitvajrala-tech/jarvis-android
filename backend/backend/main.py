
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="JARVIS AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lakshitvajrala-tech.github.io"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def home():
    return {"status": "JARVIS backend online"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()

    if not message:
        return {"reply": "Please say something."}

    return {
        "reply": (
            "I received your message: "
            + message
            + ". My AI brain is being connected."
        )
    }
  
