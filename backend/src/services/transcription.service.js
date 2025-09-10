const assemblyai = require('../config/assemblyai');

// AssemblyAI transcription function using Node.js SDK
async function transcribeWithAssemblyAI(audioFilePath) {
  try {
    const params = {
      audio: audioFilePath,
      speech_model: "universal",
    };

    const transcript = await assemblyai.transcripts.transcribe(params);
    
    if (transcript.status === "error") {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }
    
    return transcript.text;
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    throw error;
  }
}

// Audio transcription function using AssemblyAI
async function transcribeAudio(filePath) {
  try {
    const transcription = await transcribeWithAssemblyAI(filePath);
    return transcription;
  } catch (error) {
    console.error('Error transcribing audio with AssemblyAI:', error);
    throw error;
  }
}

// Real-time transcription function for streaming audio using AssemblyAI
async function transcribeStreamingAudio(audioBuffer) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Create a temporary file from the audio buffer
    const tempFilePath = path.join(__dirname, '../uploads', `temp-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    const transcription = await transcribeWithAssemblyAI(tempFilePath);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return transcription;
  } catch (error) {
    console.error('Error transcribing streaming audio with AssemblyAI:', error);
    throw error;
  }
}

module.exports = {
  transcribeWithAssemblyAI,
  transcribeAudio,
  transcribeStreamingAudio
};
