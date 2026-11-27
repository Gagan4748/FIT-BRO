
const axios = require("axios");

const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a question",
      });
    }

    const response = await axios.post(
      "http://localhost:11434/api/chat",
      {
        model: "qwen2.5:3b",
        messages: [
          {
            role: "system",
            content:
              "You are FIT BRO AI, a friendly fitness assistant. Answer questions about workouts, nutrition, BMI, muscle building and healthy lifestyle. Give safe, practical and easy-to-understand advice. Never diagnose medical conditions.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        stream: false,
      }
    );

    res.json({
      success: true,
      reply: response.data.message.content,
    });
  } catch (error) {
    console.error("AI Error:", error.message);

    res.status(500).json({
      success: false,
      message: "AI server is not responding",
    });
  }
};

module.exports = { chatWithAI };
