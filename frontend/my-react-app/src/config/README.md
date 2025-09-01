# API Configuration

## Overview
Frontend application sử dụng API từ server Render để xử lý audio transcription và pronunciation assessment.

## API Endpoints

### Base URL
- **Development**: `http://localhost:4000`
- **Production**: `https://vocabulary-check-web.onrender.com`

### Available Endpoints

#### 1. Real-time Transcription
- **URL**: `/api/realtime-transcribe`
- **Method**: `POST`
- **Description**: Transcribe audio in real-time using AssemblyAI
- **Body**: FormData with audio file

#### 2. Pronunciation Assessment
- **URL**: `/api/pronunciation-assess`
- **Method**: `POST`
- **Description**: Assess pronunciation using AssemblyAI + OpenAI
- **Body**: FormData with audio file and transcript

#### 3. Practice Sentence Generation
- **URL**: `/api/generate-practice-sentence`
- **Method**: `POST`
- **Description**: Generate practice sentences for vocabulary words
- **Body**: JSON with word parameter

#### 4. AssemblyAI Transcription
- **URL**: `/api/assemblyai-transcribe`
- **Method**: `POST`
- **Description**: Transcribe audio using AssemblyAI
- **Body**: FormData with audio file

#### 5. RapidAPI ASR
- **URL**: `/api/rapid-asr`
- **Method**: `POST`
- **Description**: Transcribe audio using RapidAPI ASR
- **Body**: FormData with audio file

#### 6. Health Check
- **URL**: `/api/health`
- **Method**: `GET`
- **Description**: Check server status and available endpoints

## Usage

### Import API Configuration
```javascript
import API_ENDPOINTS from "../config/api.js"
```

### Make API Calls
```javascript
// Real-time transcription
const response = await fetch(API_ENDPOINTS.realtimeTranscribe, {
  method: "POST",
  body: formData
})

// Pronunciation assessment
const response = await fetch(API_ENDPOINTS.pronunciationAssess, {
  method: "POST",
  body: formData
})

// Generate practice sentence
const response = await fetch(API_ENDPOINTS.generatePracticeSentence, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ word: "example" })
})
```

## Environment Detection
The API configuration automatically detects the environment:
- **Development**: Uses localhost:4000
- **Production**: Uses Render server URL

## Error Handling
All API calls should include proper error handling:
```javascript
try {
  const response = await fetch(API_ENDPOINTS.endpoint)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const data = await response.json()
} catch (error) {
  console.error('API call failed:', error)
}
```
