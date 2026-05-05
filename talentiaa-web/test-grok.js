const fetch = require('node-fetch');

async function test() {
  const API_KEY = "sk-cJftIQMYGz6yM8vPCM2Z63V8DyngBamsU7aqsO09ziJ58DIM";
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: [{ role: "user", content: "Hello" }]
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
