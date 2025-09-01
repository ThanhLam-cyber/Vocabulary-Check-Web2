const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

// Import services
const { transcribeAudio, transcribeStreamingAudio } = require('./services/transcription');
const { assessPronunciationWithAssemblyAIAndOpenAI } = require('./services/pronunciation');
const { generatePracticeSentence } = require('./services/practice');

// Import configs
const upload = require('./config/multer');

const app = express();
const port = 4000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Initialize Firebase Admin (if needed)
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   databaseURL: "https://your-project.firebaseio.com"
// });

// Endpoint: Analyze recorded audio (webm) with AssemblyAI and return text
app.post('/api/assemblyai-transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' })
    }

    const filePath = req.file.path
    console.log('Transcribing with AssemblyAI:', filePath);

    const text = await transcribeAudio(filePath)

    // Clean up uploaded file
    try { fs.unlinkSync(filePath) } catch (_) {}

    console.log('AssemblyAI transcription response:', { success: true, text });
    return res.json({ success: true, text })
  } catch (err) {
    console.error('AssemblyAI transcription error:', err)
    // Clean up uploaded file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path) } catch (_) {}
    }
    console.log('AssemblyAI transcription error response:', { success: false, error: err.message || 'Internal error' });
    return res.status(500).json({ success: false, error: err.message || 'Internal error' })
  }
})

// Real-time transcription endpoint using AssemblyAI
app.post('/api/realtime-transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('Received real-time transcription request with AssemblyAI');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        success: false 
      });
    }

    const audioFilePath = req.file.path;
    console.log('Transcribing streaming audio file with AssemblyAI:', audioFilePath);
    
    const transcribedText = await transcribeStreamingAudio(fs.readFileSync(audioFilePath));
    console.log('Real-time transcribed text with AssemblyAI:', transcribedText);

    // Clean up the uploaded file
    fs.unlinkSync(audioFilePath);
    console.log('Cleaned up streaming audio file');

    const responseData = {
      success: true,
      transcribedText: transcribedText,
      timestamp: new Date().toISOString()
    };
    console.log('Real-time transcription response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Error in real-time transcription with AssemblyAI:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const errorResponse = { 
      error: 'Internal server error during real-time transcription',
      success: false,
      message: error.message 
    };
    console.log('Real-time transcription error:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Pronunciation assessment endpoint using AssemblyAI + OpenAI
app.post('/api/pronunciation-assess', upload.single('audio'), async (req, res) => {
  try {
    console.log('Received pronunciation assessment request with AssemblyAI + OpenAI');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        success: false 
      });
    }

    const expectedText = req.body.transcript || '';

    console.log('Audio file received:', req.file.filename);
    console.log('Expected text:', expectedText);

    // Use AssemblyAI + OpenAI for pronunciation assessment
    const audioFilePath = req.file.path;
    const assessmentResult = await assessPronunciationWithAssemblyAIAndOpenAI(audioFilePath, expectedText);
    
    // Clean up file
    try { fs.unlinkSync(audioFilePath) } catch (_) {}

    const result = {
      success: true,
      feedback: assessmentResult.feedback,
      score: assessmentResult.score,
      transcribedText: assessmentResult.transcribedText,
      expectedText: assessmentResult.expectedText,
      confidence: assessmentResult.confidence,
      detailedAnalysis: assessmentResult.detailedAnalysis,
      wordAnalysis: assessmentResult.wordAnalysis,
      improvementSuggestions: assessmentResult.improvementSuggestions,
      emotionalAnalysis: assessmentResult.emotionalAnalysis,
      breakdown: assessmentResult.breakdown,
      providerRaw: assessmentResult
    };

    console.log('AssemblyAI + OpenAI assessment result:', result);
    console.log('Pronunciation assessment response:', result);
    res.json(result);

  } catch (error) {
    console.error('Error in pronunciation assessment with AssemblyAI + OpenAI:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const errorResponse = { 
      error: 'Internal server error during pronunciation assessment',
      success: false,
      message: error.message 
    };
    console.log('Pronunciation assessment error:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Generate practice sentence endpoint
app.post('/api/generate-practice-sentence', async (req, res) => {
  try {
    console.log('Received practice sentence generation request');
    
    const { word } = req.body;
    
    if (!word) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing word parameter' 
      });
    }

    console.log('Generating practice sentence for word:', word);

    const result = await generatePracticeSentence(word);
    
    console.log('Practice sentence generation response:', result);
    res.json(result);

  } catch (error) {
    console.error('Error in practice sentence generation:', error);
    
    const errorResponse = { 
      error: 'Internal server error during practice sentence generation',
      success: false,
      message: error.message 
    };
    console.log('Practice sentence generation error:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthResponse = { 
    status: 'OK', 
    message: 'Pronunciation assessment service is running',
    timestamp: new Date().toISOString()
  };
  console.log('Health check response:', healthResponse);
  res.json(healthResponse);
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('- POST /api/assemblyai-transcribe - AssemblyAI audio transcription');
  console.log('- POST /api/pronunciation-assess - AssemblyAI + OpenAI pronunciation assessment');
  console.log('- POST /api/realtime-transcribe - Real-time audio transcription with AssemblyAI');
  console.log('- POST /api/generate-practice-sentence - Generate practice sentences');
  console.log('- GET /api/health - Health check');
});
