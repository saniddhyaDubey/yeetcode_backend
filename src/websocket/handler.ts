import { WebSocketServer, WebSocket } from 'ws';
import { TranscriptionService } from '../services/transcription';
import { GeminiService } from '../services/gemini';
import { ElevenLabsTTSService } from '../services/tts';

export function setupInterviewWebSocket(wss: WebSocketServer) {
  console.log('WebSocket server initialized');

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    const transcriptionService = new TranscriptionService();
    const geminiService = new GeminiService();
    const ttsService = new ElevenLabsTTSService();

    // Prevents processing a new audio chunk while one is still in flight
    let isProcessing = false;
    // Stores the latest editor content sent alongside audio
    let editorContent = '';

    const send = (data: object) =>
      ws.send(JSON.stringify({ ...data, timestamp: Date.now() }));

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'start':
            send({ type: 'status', message: 'Interview started' });
            break;

          case 'audio':
            if (isProcessing) return;
            transcriptionService.setAudioBuffer(Buffer.from(data.audio, 'base64'));
            editorContent = data.editorContent || '';
            break;

          case 'stop':
            if (isProcessing) return;
            isProcessing = true;
            send({ type: 'lock', message: 'Processing your input...' });

            const transcript = await transcriptionService.transcribeSingle();

            if (!transcript?.text.trim()) {
              isProcessing = false;
              send({ type: 'unlock' });
              return;
            }

            send({ type: 'transcript', text: transcript.text });

            await geminiService.generateResponse(
              transcript.text,
              editorContent,
              async (response) => {
                if (!response.isDone) {
                  if (response.shouldSpeak && response.text) {
                    const audioBuffer = await ttsService.textToSpeechStream(response.text);
                    send({
                      type: 'audio_response',
                      audio: audioBuffer.toString('base64'),
                      text: response.text,
                      responseType: response.responseType,
                    });
                    isProcessing = false;
                  }
                } else {
                  if (!response.shouldSpeak) {
                    isProcessing = false;
                    send({ type: 'unlock' });
                  }
                }
              }
            );
            break;

          case 'end_interview':
            isProcessing = false;
            send({ type: 'interview_ended', history: geminiService.getHistory() });
            geminiService.clearHistory();
            break;

          case 'ping':
            send({ type: 'pong' });
            break;

          default:
            send({ type: 'error', message: 'Unknown message type' });
        }
      } catch (error: any) {
        console.error('WebSocket message error:', error);
        send({ type: 'error', message: error?.message || 'Unknown error' });
      }
    });

    ws.on('close', () => console.log('WebSocket connection closed'));
    ws.on('error', (error) => console.error('WebSocket error:', error));

    send({ type: 'connected', message: 'Interview session ready' });
  });
}
