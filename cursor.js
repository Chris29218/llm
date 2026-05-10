import { GoogleGenAI } from "@google/genai";
import readLineSync from "readline-sync";
import { exec } from "child_process";
import util from "util";
import os from "os";
import "dotenv/config";

const platform = os.platform();

const asyncExec = util.promisify(exec);

// 1. Initialize with your API Key (Ideally use process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const history = [];

async function execCommand(command) {
  try {
    const { stdout, stderr } = await asyncExec(command);
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return `Error: ${stderr}`;
    }
    return stdout;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return `Error: ${error.message}`;
  }
}

const execCommandDeclaration = {
  name: "execCommand",
  description:
    "Execute a single terminal/shell command and command can create a folder/file and CRUD on files.",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: "It'll be a terminal/shell command to execute",
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  execCommand,
};

async function runAgent(userProblem) {
  history.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history,
      config: {
        systemInstruction: `You are a helpful website builder expert(called AI Agent CURSOR). 
          You have to create the frontend by analysing user requirements.
           You can only use the tool execCommand to create files and folders and do CRUD operations on files.

           What you will do:
           1. Analyse the user requirement and create a plan to create the website.
           2. Give them commands to execute one by one to create the website.
           3. Use the tool execCommand to execute the commands based on the ${platform}. For example, if you want to create a folder named Calculator, the command will be "mkdir Calculator" for Windows and "mkdir -p Calculator" for Mac and Linux. So you have to give commands according to the user's system.

           Example:
           User Requirement: I want a website Calculator
           1. Create a folder Calculator        
           2. Create an index.html file inside Calculator folder example touch Calculator/index.html
           3. Create a style.css file inside Calculator folder example touch Calculator/style.css
           4. Create a script.js file inside Calculator folder example touch Calculator/script.js
           5. Write code for index.html, style.css and script.js to make a calculator website.

           Always give one command at a time and wait for the execution result before giving the next command.
           If the command execution is successful, give a confirmation message and then give the next command.
           If the command execution fails, give an error message and try to give a different command to achieve the same result. 
a

           `,
        tools: [{ functionDeclarations: [execCommandDeclaration] }],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const tool = await availableTools[call.name];
      const result = await tool(call.args.command);

      history.push({
        role: "model",
        parts: [{ functionCall: call }],
      });

      history.push({
        role: "user",
        parts: [{ functionResponse: { id: call.id, name: call.name, response: { result } } }],
      });
    } else {
      history.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      console.log("\n" + response.text + "\n");
      break;
    }
  }
}

async function main() {
  while (true) {
    const userProblem = readLineSync.question(
      "Please enter your problem statement: ",
    );
    await runAgent(userProblem);
  }
}

main();
