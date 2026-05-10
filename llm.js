import { GoogleGenAI } from "@google/genai";
import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';

// 1. Initialize with your API Key (Ideally use process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: 'AIzaSyB5HKgH5HPqxBnrwGXO_uN5zq3xtIY1K8M' });

// --- HTTP Server Setup ---
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile('c:/Users/Sky/practice-conda/llm/index.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');

    // For each connection, create a new chat instance to maintain separate histories
    const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
            systemInstruction: "You are a Data Structure expert. Do not answer any question that is not related to Data Structures. If the question is not related to Data Structures, respond with 'I can only answer questions related to Data Structures.'",
            tools: [{
                googleSearch: {}
            }]
        }
    });

    ws.on('message', async (message) => {
        const userMsg = message.toString();
        console.log('Received: %s', userMsg);

        try {
            const userResponse = await chat.sendMessage({ message: userMsg });
            const botResponse = userResponse.text;
            console.log('Sending back:', botResponse);
            ws.send(botResponse);
        } catch (error) {
            console.error("Error calling Gemini API:", error.message);
            ws.send("Sorry, I encountered an error processing your request.");
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// --- Start Server ---
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});