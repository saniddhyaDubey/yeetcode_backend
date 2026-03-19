import express from 'express';
import { getInterviewConfig, setInterviewConfig } from '../config/interview';
import { evaluateInterview } from '../services/evaluator';

const router = express.Router();

router.post('/setup', (req, res) => {
  const { difficulty, question, timer } = req.body;
  setInterviewConfig({ difficulty, question, timer });
  console.log('Interview configured:', { difficulty, question, timer });
  res.json({ success: true });
});

router.get('/config', (req, res) => {
  const config = getInterviewConfig();
  res.json(config || { error: 'No interview configured' });
});

router.post('/evaluate', async (req, res) => {
  try {
    const { conversationHistory } = req.body;
    if (!conversationHistory) {
      return res.status(400).json({ error: 'conversationHistory is required' });
    }
    console.log('Evaluating interview...');
    const evaluation = await evaluateInterview(conversationHistory);
    return res.json(evaluation);
  } catch (error: any) {
    console.error('Evaluation error:', error);
    res.status(500).json({ error: error.message || 'Evaluation failed' });
  }
});

export default router;
