import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { webSearch, visitPage } from "./Tools/index.js";

// Load .env automatically in Node 20.6+
if (process.loadEnvFile) {
  try {
    process.loadEnvFile();
  } catch (err) {
    // Ignore if already loaded by --env-file
  }
}

const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;

if (!apiKey) {
  console.error("❌ Error: Missing GROQ_API or GROQ_API_KEY in .env file.");
  process.exit(1);
}

// Configurable Groq model
const modelName = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// Configure Groq using ChatOpenAI pointing to Groq's OpenAI-compatible endpoint
const model = new ChatOpenAI({
  apiKey: apiKey,
  configuration: {
    baseURL: "https://api.groq.com/openai/v1",
  },
  model: modelName,
  temperature: 0.7,
  streaming: true,
});

const agent = createAgent({
  model: model,
  tools: [webSearch, visitPage],
  systemPrompt:
    "You are a helpful assistant. Answer clearly and keep replies short. You also have visit_page for urls, web_search for general search.",
});

// Check if a question was passed directly as command-line arguments
const cliQuestion = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("-"))
  .join(" ");

if (cliQuestion) {
  console.log(`You: ${cliQuestion}`);
  process.stdout.write("Agent: ");
  try {
    const result = await agent.stream(
      { messages: [{ role: "human", content: cliQuestion }] },
      { streamMode: "messages" }
    );

    for await (const [token] of result) {
      if (token && typeof token.content === "string") {
        process.stdout.write(token.content);
      }
    }
  } catch (err) {
    console.error("\nError during execution:", err.message);
  }
  console.log("\n");
  process.exit(0);
}

const rl = readline.createInterface({ input, output });

console.log("==================================================");
console.log("🤖 Chat Agent (Groq + LangChain Tools)");
console.log(`💡 Model: ${modelName}`);
console.log("💡 Type 'exit' to quit.");
console.log("==================================================\n");

while (true) {
  const question = await rl.question("You: ");

  if (question && question.trim().toLowerCase() === "exit") {
    console.log("👋 Goodbye!");
    break;
  }

  if (!question || !question.trim()) continue;

  process.stdout.write("Agent: ");
  try {
    const result = await agent.stream(
      { messages: [{ role: "human", content: question.trim() }] },
      { streamMode: "messages" }
    );

    for await (const [token] of result) {
      if (token && typeof token.content === "string") {
        process.stdout.write(token.content);
      }
    }
  } catch (err) {
    console.error("\nError during execution:", err.message);
  }
  console.log("\n");
}

rl.close();