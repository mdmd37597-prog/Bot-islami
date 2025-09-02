const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🔑 توكنات مباشرة
const PAGE_ACCESS_TOKEN = "EAAOGSi6yzuIBPYJdZCThgMsduUHiSM3OkErtbrZC5bK5stPlNh2u9ZCYaauZC6xuLflYvnZCH4ow070U29nTICZAbvVn2zaVvuRly7NZCr6kkCHAY1w2ZBSHLYVCsxSCm0DEQGFJEoZCurHX8fgEYKVcTpHhvXpi0Cb3L3ORDPJDIihvzE9YY6TZB0yyNHbAYTjrZB6io6tfJey"; 
const VERIFY_TOKEN = "ABCD123";

let userAnswers = {};

// ✅ Webhook verification
app.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      } else {
        return res.sendStatus(403);
      }
    }
    res.send("OK");
  } catch (err) {
    console.error("Webhook verification error:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Handle messages
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        const event = entry.messaging[0];
        const sender_psid = event.sender.id;

        if (event.message && event.message.text) {
          let userMessage = event.message.text.trim();

          if (/^[1-4]$/.test(userMessage) && userAnswers[sender_psid]) {
            if (parseInt(userMessage) === userAnswers[sender_psid]) {
              await sendMessage(sender_psid, "✅ صحيح! أحسنت 🎉");
            } else {
              await sendMessage(sender_psid, "❌ خطأ! حاول مرة أخرى.");
            }
            delete userAnswers[sender_psid];
          } else {
            try {
              const { data } = await axios.get("https://api.bk9.dev/Islam//quizQuestions");

              if (data && data.status) {
                let reply = `❓ ${data.question}\n\n1️⃣ ${data.answer_1}\n2️⃣ ${data.answer_2}\n3️⃣ ${data.answer_3}\n4️⃣ ${data.answer_4}\n\n📩 جاوب برقم (1-4)`;
                await sendMessage(sender_psid, reply);
                userAnswers[sender_psid] = data.right_answer;
              } else {
                await sendMessage(sender_psid, "⚠️ ما قدرناش نجيب السؤال.");
              }
            } catch (err) {
              console.error("API error:", err.message);
              await sendMessage(sender_psid, "⚠️ مشكل فجلب السؤال.");
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } else {
      return res.sendStatus(404);
    }
  } catch (err) {
    console.error("Webhook POST error:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Send message safely
async function sendMessage(sender_psid, response) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: sender_psid },
        message: { text: response }
      }
    );
  } catch (err) {
    console.error("Send message error:", err.message);
  }
}

// مهم لـ Vercel
module.exports = app;
