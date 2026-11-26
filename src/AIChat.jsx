import React, { useState } from "react";
import "./AIChat.css";
import SplineScene from "./SplineScene";
import MouseStars from "./MouseStars";

function AIChat({ onBack }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hey bro! 👋 I'm FIT BRO AI. Your personal fitness assistant. Ask me anything about workouts, nutrition or fitness!"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Mouse-following star movement
  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    e.currentTarget.style.setProperty("--mouse-x", x);
    e.currentTarget.style.setProperty("--mouse-y", y);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    setMessages(prev => [
      ...prev,
      { role: "user", text: userMessage }
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "AI request failed");
      }

      setMessages(prev => [
        ...prev,
        { role: "ai", text: data.reply }
      ]);

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "Sorry bro! AI connection failed. Please try again."
        }
      ]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "ai",
        text: "Chat cleared! 💚 What would you like to know?"
      }
    ]);
  };

  return (
    <div className="ai-page" onMouseMove={handleMouseMove}>
      {/* Stars that move with the mouse */}
      <MouseStars />

      <div className="ai-stars"></div>

      <div className="ai-header">
        <button onClick={onBack}>← Dashboard</button>

        <div className="ai-brand">
          <span>🤖</span>
          <div>
            <h2>FIT BRO AI</h2>
            <p>YOUR PERSONAL FITNESS COACH</p>
          </div>
        </div>

        <button onClick={clearChat}>Clear Chat</button>
      </div>

      <div className="ai-chat-container">
        <div className="ai-welcome">
          <h1>YOUR AI FITNESS PARTNER</h1>
          <p>Ask anything. Get smarter fitness guidance.</p>
        </div>

        <div className="ai-robot-area">
          <div className="ai-spline-wrap">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="ai-spline"
            />
          </div>
        </div>

        <div className="ai-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`ai-message ${msg.role}`}
            >
              <div className="ai-avatar">
                {msg.role === "ai" ? "🤖" : "👤"}
              </div>

              <div className="ai-bubble">
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="ai-message ai">
              <div className="ai-avatar">🤖</div>
              <div className="ai-bubble ai-typing">
                FIT BRO AI is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="ai-suggestions">
          {[
            "Give me a workout plan",
            "How much protein do I need?",
            "How can I build muscle?",
            "Suggest a healthy diet"
          ].map((question, index) => (
            <button
              key={index}
              onClick={() => setInput(question)}
            >
              {question}
            </button>
          ))}
        </div>

        <div className="ai-input-area">
          <input
            type="text"
            placeholder="Ask FIT BRO AI anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") sendMessage();
            }}
          />

          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            SEND ↗
          </button>
        </div>

        <p className="ai-footer">
          POWERED BY LOCAL AI • OLLAMA
        </p>
      </div>
    </div>
  );
}

export default AIChat;
