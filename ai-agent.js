import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDVImR0aYC6di0sj4G_rPMoL84W2X321OI", // ⚠️ don't hardcode real key in production
});

const History = [];

// ---------------- TOOLS ---------------- //

const stockPrice = async ({ stockName }) => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${stockName}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.chart.result[0].meta.regularMarketPrice;
  } catch (error) {
    return `Error fetching stock price`;
  }
};

const cryptoPrice = async ({ cryptoName }) => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${cryptoName}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.chart.result[0].meta.regularMarketPrice;
  } catch (error) {
    return `Error fetching crypto price`;
  }
};

// ---------------- DECLARATIONS ---------------- //

const stockDeclaration = {
  name: "stockPrice",
  description: "Get current stock price",
  parameters: {
    type: "OBJECT",
    properties: {
      stockName: {
        type: "STRING",
        description: "Stock symbol like AAPL, TSLA",
      },
    },
    required: ["stockName"],
  },
};

const cryptoDeclaration = {
  name: "cryptoPrice",
  description: "Get current crypto price",
  parameters: {
    type: "OBJECT",
    properties: {
      cryptoName: {
        type: "STRING",
        description: "Crypto symbol like BTC-USD, ETH-USD",
      },
    },
    required: ["cryptoName"],
  },
};

const availableTools = {
  stockPrice,
  cryptoPrice,
};

// ---------------- AGENT ---------------- //

async function runAgent(userProblem) {
  History.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  let steps = 0;

  while (steps < 5) {
    steps++;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: History,
      config: {
        systemInstruction: `
You are an AI agent with access to tools:
- stockPrice → get stock price
- cryptoPrice → get crypto price

RULES:
- ALWAYS use tools when user asks price
- DO NOT guess prices
- After tool execution, return final answer
`,
        tools: [
          {
            functionDeclarations: [stockDeclaration, cryptoDeclaration],
          },
        ],
      },
    });

    // 🧠 TOOL CALL
    if (response.functionCalls && response.functionCalls.length > 0) {
      const { name, args } = response.functionCalls[0];

      const tool = availableTools[name];
      const result = await tool(args);

      const functionResponsePart = {
        name: name,
        response: { result },
      };

      // push function call
      History.push({
        role: "model",
        parts: [{ functionCall: response.functionCalls[0] }],
      });

      // push function result
      History.push({
        role: "user",
        parts: [{ functionResponse: functionResponsePart }],
      });
    } 
    // ✅ FINAL RESPONSE
    else {
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });

      console.log("\n" + response.text);
      break;
    }
  }
}

// ---------------- CLI LOOP ---------------- //

async function main() {
  while (true) {
    const userProblem = readlineSync.question("Ask me anything --> ");
    await runAgent(userProblem);
  }
}

main();