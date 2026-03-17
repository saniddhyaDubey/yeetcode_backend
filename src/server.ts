import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupTranscriptionWebSocket } from './websocket/new-socket';
import transcriptionRoutes from './routes/transcription';
import { evaluateInterview } from './services/evaluator';

export let interviewConfig: { question: string; timer: number; difficulty: string } | null = null;

export function setInterviewConfig(config: typeof interviewConfig) {
  interviewConfig = config;
}

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/transcribe' });

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3001'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/interview/evaluate', async (req, res) => {
  try {
    const { conversationHistory } = req.body;

    if (!conversationHistory) {
      return res.status(400).json({ error: 'conversationHistory is required' });
    }

    console.log('Evaluating interview...');
    const evaluation = await evaluateInterview(conversationHistory);
    console.log('Evaluation complete:', evaluation);

    return res.json(evaluation);
  } catch (error: any) {
    console.error('Evaluation endpoint error:', error);
    res.status(500).json({ error: error.message || 'Evaluation failed' });
  }
});

app.post('/api/interview/setup', (req, res) => {
  const { difficulty, question, timer } = req.body;
  setInterviewConfig({ difficulty, question, timer });
  console.log('Interview configured:', interviewConfig);
  res.json({ success: true });
});

app.get('/api/interview/config', (req, res) => {
  res.json(interviewConfig || { error: 'No interview configured' });
});

app.use('/api/transcription', transcriptionRoutes);

setupTranscriptionWebSocket(wss);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws/transcribe`);
});
