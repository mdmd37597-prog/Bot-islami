const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

let userAnswers = {}; // تخزين الأجوبة الصحيحة

// Webhook verification
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Webhook events
app.post("/webhook", async (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async function(entry) {
      let event = entry.messaging[0];
      let sender_psid = event.sender.id;

      if (event.message && event.message.text) {
        let userMessage = event.message.text.trim();

        // المستخدم دخل رقم للإجابة
        if (/^[1-4]$/.test(userMessage) && userAnswers[sender_psid]) {
          if (parseInt(userMessage) === userAnswers[sender_psid]) {
            await sendMessage(sender_psid, "✅ صحيح! أحسنت 🎉");
          } else {
            await sendMessage(sender_psid, "❌ خطأ! حاول مرة أخرى.");
          }
          delete userAnswers[sender_psid]; // نمسحو الجواب من بعد
        } else {
          // نجيب سؤال جديد من API
          try {
            const { data } = await axios.get("https://api.bk9.dev/Islam//quizQuestions");

            if (data.status) {
              let quiz = data;
              let reply = `❓ ${quiz.question}\n\n1️⃣ ${quiz.answer_1}\n2️⃣ ${quiz.answer_2}\n3️⃣ ${quiz.answer_3}\n4️⃣ ${quiz.answer_4}\n\n📩 جاوب برقم (1-4)`;

              await sendMessage(sender_psid, reply);
              userAnswers[sender_psid] = quiz.right_answer;
            }
          } catch (err) {
            console.error(err);
            await sendMessage(sender_psid, "⚠️ وقع خطأ فجلب السؤال!");
          }
        }
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

async function sendMessage(sender_psid, response) {
  await axios.post(
    `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: sender_psid },
      message: { text: response },
    }
  );
}

module.exports = app;
            
