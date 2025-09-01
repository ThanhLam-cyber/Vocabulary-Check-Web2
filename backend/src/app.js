const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { AssemblyAI } = require('assemblyai');
require('dotenv').config(); // Thêm dòng này để load biến môi trường từ file .env

const app = express();
const port = 4000; // Changed to 4000 to match frontend expectation

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize AssemblyAI
const assemblyai = new AssemblyAI({
  apiKey: "7a229d92bcab4396a26fffce338e5cd0",
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.webm');
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Cho phép CORS để frontend có thể gọi API từ domain khác

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

// Helpers
async function callRapidApiASRFromBase64(base64Audio, options = {}) {
  const {
    language = 'en',
    encode = 'true',
    word_timestamps = 'false',
    output = 'txt',
    task = 'transcribe',
  } = options

  const url = `https://speech-analysis-api.p.rapidapi.com/asr?language=${encodeURIComponent(language)}&encode=${encode}&word_timestamps=${word_timestamps}&output=${encodeURIComponent(output)}&task=${encodeURIComponent(task)}`

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-rapidapi-host': 'speech-analysis-api.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
  }

  if (!headers['x-rapidapi-key']) {
    throw new Error('Missing RAPIDAPI_KEY in environment')
  }

  const body = new URLSearchParams({ audio: base64Audio }).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })

  // Try to parse as text first (output=txt). If JSON, parse accordingly
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`RapidAPI ASR error ${response.status}: ${errText}`)
  }
  if (contentType.includes('application/json')) {
    const json = await response.json()
    // Extract text if present
    return typeof json === 'string' ? json : (json.text || JSON.stringify(json))
  }
  return await response.text()
}

// AssemblyAI + OpenAI pronunciation assessment function with sentiment analysis
async function assessPronunciationWithAssemblyAIAndOpenAI(audioFilePath, expectedText) {
  try {
         // Step 1: Use AssemblyAI for transcription with sentiment analysis
     const assemblyParams = {
       audio: audioFilePath,
       speech_model: "universal",
       language_code: "en",
       word_boost: [expectedText.toLowerCase()],
       boost_param: "high",
       sentiment_analysis: true,  // Enable sentiment analysis
       punctuate: true,
       format_text: true
     };

         const transcript = await assemblyai.transcripts.transcribe(assemblyParams);
     
     if (transcript.status === "error") {
       throw new Error(`Transcription failed: ${transcript.error}`);
     }

     console.log('AssemblyAI transcript full response:', JSON.stringify(transcript, null, 2));
     console.log('AssemblyAI sentiment_analysis field:', transcript.sentiment_analysis);

     const transcribedText = transcript.text || '';
    
    // Extract sentiment analysis data
    let sentimentData = {
      overall_sentiment: "NEUTRAL",
      sentiment_score: 0,
      sentiment_details: []
    };

                   if (transcript.sentiment_analysis && transcript.sentiment_analysis.results) {
        const sentimentResults = transcript.sentiment_analysis.results;
        console.log('Sentiment analysis - Raw results:', sentimentResults);
        
        if (sentimentResults && sentimentResults.length > 0) {
          sentimentData.sentiment_details = sentimentResults.map(result => ({
            text: result.text,
            sentiment: result.sentiment,
            confidence: result.confidence
          }));
          
          // Calculate overall sentiment
          const avgConfidence = sentimentResults.reduce((sum, r) => sum + r.confidence, 0) / sentimentResults.length;
          sentimentData.sentiment_score = avgConfidence;
          sentimentData.overall_sentiment = sentimentResults[0].sentiment; // Use first result as overall
          console.log('Sentiment analysis - Calculated score:', sentimentData.sentiment_score);
          console.log('Sentiment analysis - Overall sentiment:', sentimentData.overall_sentiment);
        } else {
          console.log('Sentiment analysis - No results found, using fallback');
          // Fallback: try to determine sentiment from the text content
          const text = transcribedText.toLowerCase();
          if (text.includes('good') || text.includes('great') || text.includes('excellent') || text.includes('nice')) {
            sentimentData.overall_sentiment = "POSITIVE";
            sentimentData.sentiment_score = 0.7;
          } else if (text.includes('bad') || text.includes('terrible') || text.includes('awful')) {
            sentimentData.overall_sentiment = "NEGATIVE";
            sentimentData.sentiment_score = 0.3;
          } else {
            sentimentData.overall_sentiment = "NEUTRAL";
            sentimentData.sentiment_score = 0.5;
          }
          console.log('Sentiment analysis - Fallback sentiment:', sentimentData.overall_sentiment, 'score:', sentimentData.sentiment_score);
        }
      } else {
        console.log('Sentiment analysis - No sentiment_analysis field found');
        // Fallback: try to determine sentiment from the text content
        const text = transcribedText.toLowerCase();
        if (text.includes('good') || text.includes('great') || text.includes('excellent') || text.includes('nice')) {
          sentimentData.overall_sentiment = "POSITIVE";
          sentimentData.sentiment_score = 0.7;
        } else if (text.includes('bad') || text.includes('terrible') || text.includes('awful')) {
          sentimentData.overall_sentiment = "NEGATIVE";
          sentimentData.sentiment_score = 0.3;
        } else {
          sentimentData.overall_sentiment = "NEUTRAL";
          sentimentData.sentiment_score = 0.5;
        }
        console.log('Sentiment analysis - Fallback sentiment:', sentimentData.overall_sentiment, 'score:', sentimentData.sentiment_score);
      }

    // Step 2: Try OpenAI analysis, fallback to AssemblyAI-only if quota exceeded
    let openAIAnalysis = null;
    let useOpenAI = true;

    try {
             const openAIPrompt = `
You are Dr. Sarah Chen, a world-renowned English pronunciation expert with 25+ years of experience in linguistics, phonetics, and language assessment. You hold a PhD in Applied Linguistics from Cambridge University and have trained thousands of ESL students to achieve native-like pronunciation. Your analysis is considered the gold standard in the field.

MISSION: Provide the most comprehensive, accurate, and actionable pronunciation assessment possible, combining cutting-edge linguistic science with practical teaching methodology.

ANALYSIS CONTEXT:
ORIGINAL TARGET WORD: "${expectedText}"
ACTUAL SPEECH TRANSCRIBED: "${transcribedText}"
ASSEMBLYAI CONFIDENCE: ${Math.round((transcript.confidence || 0) * 100)}%
WORD-LEVEL PHONETIC DATA: ${JSON.stringify(transcript.words || [])}
EMOTIONAL TONE ANALYSIS: ${JSON.stringify(sentimentData)}

CRITICAL ASSESSMENT PARAMETERS (MANDATORY):
1. WORD ACCURACY CHECK: If user was asked to say "${expectedText}" but said "${transcribedText}", this is a CRITICAL ERROR. You MUST give a score below 50 and focus ALL feedback on this mistake. Do NOT give positive feedback for pronunciation if the wrong word was said.

2. PHONETIC PRECISION: Analyze each phoneme, stress pattern, and intonation contour ONLY if the correct word was said.

3. COMMUNICATIVE EFFECTIVENESS: Assess how well the message would be understood by native speakers.

4. LEARNING PROGRESSION: Consider the speaker's current level and provide appropriate next steps.

MANDATORY SCORING RULES:
- If wrong word said: Score MUST be between 20-50, regardless of pronunciation quality
- If correct word said: Score can be 50-100 based on pronunciation quality
- Word accuracy is the PRIMARY factor - pronunciation quality is secondary

EXPERT ANALYSIS FRAMEWORK:
You must conduct a comprehensive multi-dimensional assessment covering:

1. COMPREHENSIVE PHONETIC ANALYSIS (Microscopic Precision):
   - VOWEL SYSTEM: All English vowels (monophthongs, diphthongs, triphthongs) with IPA notation
   - CONSONANT SYSTEM: All English consonants (stops, fricatives, affricates, nasals, liquids, glides)
   - STRESS PATTERNS: Primary, secondary, tertiary stress with syllable weight analysis
   - INTONATION: Pitch contours, tone units, nuclear stress, boundary tones
   - CONNECTED SPEECH: Assimilation, elision, linking, intrusion, coalescence
   - ARTICULATORY PRECISION: Place, manner, voicing, aspiration, release
   - ACCENT INTELLIGIBILITY: Comprehensibility quotient, native speaker perspective
   - PHONEMIC VARIATIONS: Allophonic distribution, contextual variations
   - RHYTHM AND TIMING: Syllable-timed vs stress-timed patterns, isochrony
   - COARTICULATION: Anticipatory and perseverative coarticulation effects
   - PROSODIC FEATURES: Pitch, loudness, tempo, rhythm, pause patterns
   - PHONOLOGICAL PROCESSES: Reduction, deletion, insertion, metathesis
   - SYLLABLE STRUCTURE: Onset, nucleus, coda analysis, syllable boundaries
   - WORD BOUNDARIES: Juncture, boundary markers, word-final phenomena
   - INTONATIONAL PHRASES: Tonic syllables, pre-head, head, tail analysis

2. COMPREHENSIVE GRAMMATICAL ANALYSIS (Exhaustive Error Detection):
   - MORPHOLOGICAL ANALYSIS: Word formation, inflection, derivation, compounding
   - SYNTACTIC ANALYSIS: Sentence structure, phrase structure, word order, constituency
   - TENSE-ASPECT-MODALITY: All verb forms, temporal relationships, modality expression
   - AGREEMENT SYSTEMS: Subject-verb, determiner-noun, pronoun-antecedent, case marking
   - FUNCTIONAL CATEGORIES: Articles (a/an/the), prepositions, conjunctions, auxiliaries
   - NOMINAL SYSTEM: Count/mass nouns, pluralization, possessives, quantifiers
   - VERBAL SYSTEM: Transitivity, voice, mood, aspect, tense consistency
   - PRONOUN SYSTEM: Personal, reflexive, demonstrative, relative, interrogative
   - ADJECTIVAL/ADVERBIAL: Comparative/superlative, position, modification patterns
   - CLAUSE STRUCTURE: Main/subordinate clauses, coordination, subordination
   - NEGATION: Negative forms, scope, placement, double negation
   - QUESTION FORMATION: Yes/no questions, wh-questions, tag questions, embedded questions
   - PASSIVE VOICE: Formation, usage, appropriateness
   - CONDITIONAL SENTENCES: All types (0, 1, 2, 3, mixed)
   - REPORTED SPEECH: Direct/indirect speech, tense backshift, pronoun changes
   - RELATIVE CLAUSES: Restrictive/non-restrictive, relative pronoun choice
   - GERUNDS AND INFINITIVES: Usage patterns, verb + gerund/infinitive combinations
   - PARTICIPLES: Present/past participles, participial phrases
   - ELLIPSIS AND SUBSTITUTION: Omitted elements, pro-forms, substitution
   - DISCOURSE MARKERS: Connectors, transitions, cohesive devices

3. COMPREHENSIVE FLUENCY ASSESSMENT (Multi-Dimensional Analysis):
   - TEMPORAL FLUENCY: Speech rate (WPM), pause frequency, pause duration, rhythm patterns
   - DISFLUENCY ANALYSIS: Hesitations (filled/unfilled), fillers, repairs, false starts, repetitions
   - PROSODIC FLUENCY: Intonation patterns, stress timing, rhythm consistency, pitch variation
   - COGNITIVE FLUENCY: Planning time, processing speed, lexical retrieval, syntactic planning
   - INTERACTIVE FLUENCY: Turn-taking skills, responsiveness, backchanneling, topic management
   - SELF-MONITORING: Error detection, self-correction, monitoring strategies, awareness
   - CONFIDENCE INDICATORS: Vocal quality, delivery style, hesitation patterns, repair strategies
   - NATURALNESS: Native-like flow, authenticity, spontaneity, communicative effectiveness
   - LEXICAL FLUENCY: Word retrieval speed, vocabulary range, collocational fluency
   - SYNTACTIC FLUENCY: Sentence construction speed, complexity management, clause linking
   - DISCOURSE FLUENCY: Coherence, cohesion, topic development, logical progression
   - PRAGMATIC FLUENCY: Appropriateness, register awareness, cultural sensitivity

4. COMPREHENSIBILITY ANALYSIS (Listener-Centered Assessment):
   - INTELLIGIBILITY QUOTIENT: Percentage of words understood by native speakers
   - COMPREHENSIBILITY FACTORS: Accent strength, clarity, structure, vocabulary
   - LISTENER EFFORT: Cognitive load required for understanding, processing difficulty
   - COMMUNICATION BREAKDOWN: Potential misunderstanding points, clarification needs
   - CROSS-CULTURAL EFFECTIVENESS: Cultural appropriateness, pragmatic competence
   - NATIVE SPEAKER PERSPECTIVE: How native speakers would perceive the speech
   - CONTEXT APPROPRIATENESS: Register, formality, situational appropriateness
   - MESSAGE CONVEYANCE: Success rate in conveying intended meaning
   - ACCENT INTELLIGIBILITY: Impact of accent on understanding, accent reduction needs
   - PRONUNCIATION CLARITY: Articulation precision, sound distinction, word boundaries
   - GRAMMATICAL INTELLIGIBILITY: Impact of grammar errors on understanding
   - VOCABULARY ACCESSIBILITY: Word choice appropriateness, lexical difficulty
   - DISCOURSE COHERENCE: Logical flow, topic development, connection clarity
   - PRAGMATIC EFFECTIVENESS: Appropriateness, politeness, cultural sensitivity

5. WORD-LEVEL PHONETIC ANALYSIS (Microscopic Precision):
   - INDIVIDUAL WORD ACCURACY: Confidence-based assessment with specific error identification
   - PHONETIC ERROR PATTERNS: Substitution, omission, addition, distortion, assimilation
   - WORD STRESS ANALYSIS: Primary, secondary, tertiary stress with syllable weight
   - SYLLABLE BOUNDARY IDENTIFICATION: Onset, nucleus, coda analysis, syllable division
   - PHONEME ANALYSIS: Individual sound accuracy, allophonic variation, contextual effects
   - COARTICULATION EFFECTS: Anticipatory, perseverative, bidirectional coarticulation
   - CONSONANT CLUSTER ANALYSIS: Initial, medial, final clusters, cluster reduction
   - VOWEL QUALITY ASSESSMENT: Vowel height, frontness, rounding, length, tenseness
   - WORD-FINAL PHENOMENA: Final consonant devoicing, aspiration, release patterns
   - WORD-INITIAL PHENOMENA: Aspiration, glottalization, consonant strengthening
   - LEXICAL STRESS PATTERNS: Stress placement, stress shift, compound stress
   - PHONOLOGICAL PROCESSES: Reduction, deletion, insertion, metathesis, assimilation
   - PROSODIC FEATURES: Pitch accent, boundary tones, phrase-final lengthening
   - ARTICULATORY PRECISION: Place, manner, voicing, aspiration, release characteristics
   - ACOUSTIC CORRELATES: Formant frequencies, duration, intensity, spectral characteristics

EXPERT ASSESSMENT METHODOLOGY (MAXIMUM PRECISION):
- Apply evidence-based linguistic analysis using cutting-edge computational linguistics research
- Use confidence scores < 80% as critical intervention points with detailed error categorization
- Provide phonetically precise, actionable feedback with specific improvement strategies and practice techniques
- Implement scaffolding approach based on learner's current proficiency level with personalized progression
- Balance motivational support with rigorous, honest assessment using growth mindset principles
- Prioritize high-impact improvements using the 80/20 principle with data-driven intervention strategies
- Consider L1 interference patterns and cross-linguistic influence with specific Vietnamese-English transfer analysis
- Apply communicative language teaching principles with task-based learning approaches
- Incorporate sociolinguistic awareness and pragmatic competence with cultural sensitivity
- Use formative assessment principles for continuous improvement with measurable progress tracking
- Apply cognitive load theory to optimize learning progression and information processing
- Implement error analysis framework with comprehensive categorization and severity assessment
- Use corpus-based frequency analysis for error prioritization and authentic language patterns
- Apply sociolinguistic principles for context-appropriate language use and register awareness
- Include pragmatic competence assessment for real-world communication effectiveness
- Provide detailed Vietnamese explanations with linguistic terminology and pedagogical examples
- Consider both accuracy (form) and effectiveness (function) in real-world communication contexts
- Apply scaffolding feedback with immediate, short-term, and long-term improvement goals
- Use evidence-based intervention strategies with proven effectiveness in ESL contexts
- Include cross-cultural communication analysis with cultural appropriateness assessment

EXPERT OUTPUT FORMAT (JSON):
{
  "score": number (0-100, comprehensive assessment using weighted criteria),
  "feedback": "Professional, encouraging, and precise feedback in Vietnamese with specific actionable insights",
  "detailedAnalysis": [
    "Phonetic precision assessment with specific sound analysis",
    "Grammatical accuracy evaluation with error categorization", 
    "Fluency measurement with temporal and prosodic analysis",
    "Comprehensibility quotient with listener perspective"
  ],
  "wordAnalysis": {
    "strongWords": [{"text": "word", "confidence": number, "strength": "specific phonetic strength with linguistic terminology"}],
    "weakWords": [{"text": "word", "confidence": number, "issue": "detailed phonetic issue with improvement strategy"}],
    "wordFeedback": ["Expert-level feedback for each word with specific correction techniques"]
  },
  "grammarAnalysis": {
    "grammarScore": number (0-100, weighted assessment of morphosyntactic accuracy),
    "grammarErrors": [
      {
        "error": "exact linguistic error with context",
        "correction": "grammatically correct version with explanation",
        "explanation": "detailed Vietnamese explanation using linguistic terminology",
        "category": "specific error type (morphological, syntactic, semantic, pragmatic)",
        "severity": "high/medium/low impact on communication"
      }
    ],
    "grammarFeedback": "Comprehensive grammar assessment with pedagogical insights in Vietnamese",
    "grammarStrengths": ["Detailed analysis of grammatical competencies demonstrated"]
  },
  "pronunciationAnalysis": {
    "pronunciationScore": number (0-100, comprehensive phonetic assessment),
    "phoneticIssues": ["Detailed phonetic problems with IPA notation and correction strategies"],
    "stressPatterns": ["Comprehensive stress pattern analysis with primary/secondary stress identification"],
    "intonationAnalysis": "Detailed intonation contour analysis with pitch pattern assessment",
    "clarityAssessment": "Articulatory clarity assessment with specific improvement recommendations",
    "accentIntelligibility": "Accent intelligibility quotient with native speaker comprehensibility rating"
  },
  "fluencyAnalysis": {
    "fluencyScore": number (0-100, comprehensive fluency assessment),
    "paceAssessment": "Detailed temporal fluency analysis with speech rate and rhythm assessment",
    "hesitationPatterns": ["Comprehensive disfluency analysis with hesitation type categorization"],
    "naturalness": "Native-like naturalness assessment with prosodic fluency evaluation",
    "cognitiveFluency": "Cognitive processing fluency with planning and retrieval assessment",
    "interactiveFluency": "Interactive communication fluency with turn-taking and responsiveness analysis"
  },
  "improvementSuggestions": [
    "Evidence-based, prioritized improvement strategies with specific implementation steps",
    "High-impact intervention recommendations using the 80/20 principle",
    "Scaffolded learning progression with immediate and long-term goals",
    "Personalized practice techniques with measurable outcomes"
  ],
  "emotionalAnalysis": {
    "sentiment": "POSITIVE/NEGATIVE/NEUTRAL",
    "confidence": number,
    "analysis": "Comprehensive emotional tone analysis with affective communication assessment",
    "expressiveness": "Emotional expressiveness evaluation with prosodic and paralinguistic analysis",
    "pragmaticEffectiveness": "Pragmatic communication effectiveness with sociolinguistic appropriateness"
  },
  "overallAssessment": {
    "strengths": ["Comprehensive analysis of demonstrated competencies with specific examples"],
    "weaknesses": ["Detailed identification of improvement areas with impact assessment"],
    "priorityAreas": ["Evidence-based priority ranking with maximum improvement potential"],
    "learningPath": "Personalized learning trajectory with scaffolded progression and measurable milestones"
  }
}

EXPERT QUALITY STANDARDS (MAXIMUM PRECISION):
- Conduct exhaustive linguistic analysis using advanced computational linguistics principles
- Apply comprehensive error analysis framework covering ALL grammatical categories
- Provide microscopic-level feedback with specific correction strategies for EVERY error
- Implement evidence-based pedagogical approaches with proven effectiveness
- Balance rigorous academic standards with accessible, actionable guidance
- Ensure 100% accuracy in error identification and correction suggestions
- Focus on high-impact interventions using data-driven prioritization
- Provide detailed Vietnamese explanations with linguistic terminology and examples
- Consider both accuracy (form) and effectiveness (function) in real-world communication
- Apply cognitive load theory to optimize learning progression
- Include cross-linguistic interference analysis for Vietnamese speakers
- Provide scaffolded feedback with immediate, short-term, and long-term improvement goals
- Use corpus-based frequency analysis for error prioritization
- Apply sociolinguistic principles for context-appropriate language use
- Include pragmatic competence assessment for real-world communication effectiveness
`;

      const openAIResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert English pronunciation teacher and speech analyst. Provide detailed, helpful feedback in Vietnamese."
          },
          {
            role: "user",
            content: openAIPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      try {
        const responseText = openAIResponse.choices[0].message.content;
        openAIAnalysis = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        console.error('Raw response:', openAIResponse.choices[0].message.content);
        useOpenAI = false;
      }
    } catch (openAIError) {
      console.error('OpenAI API error (quota exceeded or other issue):', openAIError.message);
      useOpenAI = false;
    }

    // Step 3: Generate analysis based on available data
    let finalAnalysis;
    if (useOpenAI && openAIAnalysis) {
             // Use OpenAI analysis
       finalAnalysis = {
         score: openAIAnalysis.score || 0,
         feedback: openAIAnalysis.feedback || "Phát âm cần cải thiện",
         detailedAnalysis: openAIAnalysis.detailedAnalysis || [],
         wordAnalysis: {
           strongWords: openAIAnalysis.wordAnalysis?.strongWords || [],
           weakWords: openAIAnalysis.wordAnalysis?.weakWords || [],
           wordFeedback: openAIAnalysis.wordAnalysis?.wordFeedback || []
         },
         grammarAnalysis: openAIAnalysis.grammarAnalysis || {
           grammarScore: 0,
           grammarErrors: [],
           grammarFeedback: "Không có dữ liệu ngữ pháp",
           grammarStrengths: []
         },
         pronunciationAnalysis: openAIAnalysis.pronunciationAnalysis || {
           pronunciationScore: 0,
           phoneticIssues: [],
           stressPatterns: [],
           intonationAnalysis: "Không có dữ liệu",
           clarityAssessment: "Không có dữ liệu"
         },
         fluencyAnalysis: openAIAnalysis.fluencyAnalysis || {
           fluencyScore: 0,
           paceAssessment: "Không có dữ liệu",
           hesitationPatterns: [],
           naturalness: "Không có dữ liệu"
         },
         improvementSuggestions: openAIAnalysis.improvementSuggestions || [],
         emotionalAnalysis: openAIAnalysis.emotionalAnalysis || {
           sentiment: sentimentData.overall_sentiment,
           confidence: sentimentData.sentiment_score,
           analysis: "Phân tích cảm xúc từ AssemblyAI",
           expressiveness: "Không có dữ liệu"
         },
         overallAssessment: openAIAnalysis.overallAssessment || {
           strengths: [],
           weaknesses: [],
           priorityAreas: [],
           learningPath: "Không có dữ liệu"
         }
       };
    } else {
      // Fallback to AssemblyAI-only analysis
      console.log('Using AssemblyAI-only analysis due to OpenAI quota/error');
      
      // Calculate score based on AssemblyAI data - focus on what was actually spoken
      const confidenceScore = Math.round((transcript.confidence || 0) * 100);
      const wordScore = calculateWordScore(transcript.words || []);
      
      // Check if the user said the expected word - STRICT CHECKING (MUST BE FIRST)
      const transcribedWords = transcribedText.toLowerCase().split(/\s+/);
      const expectedWord = expectedText.toLowerCase();
      
      console.log('🔍 Word Check Debug:');
      console.log('Expected word:', expectedWord);
      console.log('Transcribed words:', transcribedWords);
      
      // Strict word matching - only exact match or very close similarity
      const saidExpectedWord = transcribedWords.some(word => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        const cleanExpected = expectedWord.replace(/[^a-zA-Z]/g, '');
        
        console.log(`Comparing: "${cleanWord}" vs "${cleanExpected}"`);
        
        // Exact match
        if (cleanWord === cleanExpected) {
          console.log('✅ Exact match found!');
          return true;
        }
        
        // Very close similarity (max 1-2 character difference)
        if (cleanWord.length >= 3 && cleanExpected.length >= 3) {
          const maxDiff = Math.min(cleanWord.length, cleanExpected.length) * 0.15; // Allow only 15% difference
          let differences = 0;
          const maxLen = Math.max(cleanWord.length, cleanExpected.length);
          
          for (let i = 0; i < maxLen; i++) {
            if (cleanWord[i] !== cleanExpected[i]) {
              differences++;
              if (differences > maxDiff) {
                console.log(`❌ Too many differences: ${differences} > ${maxDiff}`);
                return false;
              }
            }
          }
          if (differences <= maxDiff) {
            console.log(`✅ Close match found with ${differences} differences`);
            return true;
          }
        }
        
        console.log(`❌ No match for "${cleanWord}"`);
        return false;
      });
      
      console.log('Final result - saidExpectedWord:', saidExpectedWord);
      
      // Calculate grammar score based on word accuracy and confidence
      const grammarScore = Math.round((wordScore * 0.7) + (confidenceScore * 0.3));
      
      // Calculate overall score based on actual speech quality
      let baseScore = Math.round((confidenceScore * 0.4) + (wordScore * 0.4) + (grammarScore * 0.2));
      
      // HEAVY PENALTY for wrong word - this is the PRIMARY factor
      if (!saidExpectedWord) {
        baseScore = Math.max(20, Math.min(50, baseScore * 0.3)); // Force score between 20-50
      }
      
      const overallScore = baseScore;
      
             // Find the closest word that was actually said (MUST BE OUTSIDE IF BLOCK)
       let closestWord = "";
       if (!saidExpectedWord) {
         console.log('🔍 Finding closest word...');
         const transcribedWordsForClosest = transcribedText.toLowerCase().split(/\s+/);
         const expectedWordForClosest = expectedText.toLowerCase();
         let minDiff = Infinity;
         
         transcribedWordsForClosest.forEach(word => {
           const cleanWord = word.replace(/[^a-zA-Z]/g, '');
           const cleanExpected = expectedWordForClosest.replace(/[^a-zA-Z]/g, '');
           
           // Calculate difference
           let differences = 0;
           const maxLen = Math.max(cleanWord.length, cleanExpected.length);
           for (let i = 0; i < maxLen; i++) {
             if (cleanWord[i] !== cleanExpected[i]) {
               differences++;
             }
           }
           
           console.log(`Closest word check: "${cleanWord}" vs "${cleanExpected}" = ${differences} differences`);
           
           if (differences < minDiff) {
             minDiff = differences;
             closestWord = word;
             console.log(`New closest word: "${closestWord}" with ${differences} differences`);
           }
         });
         console.log('Final closest word:', closestWord);
       }
       
       // Generate feedback based on actual speech quality and word accuracy
       let feedback = "";
       if (!saidExpectedWord) {
         feedback = `❌ LỖI NGHIÊM TRỌNG: Bạn được yêu cầu đọc từ "${expectedText}" nhưng đã đọc "${closestWord}". Đây là hai từ hoàn toàn khác nhau! Điểm bị trừ nặng vì đọc sai từ. Hãy tập trung vào từ "${expectedText}" và thử lại!`;
       } else if (overallScore >= 90) {
         feedback = `Phát âm xuất sắc! Bạn đã nói "${transcribedText}" rất rõ ràng và chính xác.`;
       } else if (overallScore >= 80) {
         feedback = `Phát âm rất tốt! "${transcribedText}" được phát âm khá rõ ràng.`;
       } else if (overallScore >= 70) {
         feedback = `Phát âm tốt! "${transcribedText}" cần luyện tập thêm để rõ ràng hơn.`;
       } else if (overallScore >= 60) {
         feedback = `Phát âm cần cải thiện. "${transcribedText}" chưa đủ rõ ràng.`;
       } else {
         feedback = `Cần luyện tập nhiều hơn. "${transcribedText}" cần được phát âm rõ ràng hơn.`;
       }

             // Analyze words based on what was actually spoken
       const strongWords = [];
       const weakWords = [];
       const wordFeedback = [];
       
       if (transcript.words && transcript.words.length > 0) {
         console.log('Word analysis - Raw words from AssemblyAI:', transcript.words);
         transcript.words.forEach(word => {
           const wordConfidence = Math.round((word.confidence || 0) * 100);
           if (wordConfidence >= 80) {
             strongWords.push({ text: word.text, confidence: wordConfidence });
           } else {
             weakWords.push({ text: word.text, confidence: wordConfidence });
             wordFeedback.push(`"${word.text}" - cần cải thiện phát âm (${wordConfidence}%)`);
           }
         });
         console.log('Word analysis - Strong words:', strongWords);
         console.log('Word analysis - Weak words:', weakWords);
       }

             finalAnalysis = {
         score: overallScore,
         feedback: feedback,
         detailedAnalysis: [
           !saidExpectedWord ? `⚠️ TỪ KHÔNG ĐÚNG: Bạn đọc "${transcribedText}" thay vì "${expectedText}"` : null,
           sentimentData.overall_sentiment !== "NEUTRAL" ? `Cảm xúc: ${sentimentData.overall_sentiment}` : null
         ].filter(Boolean),
                 wordAnalysis: {
           strongWords: strongWords,
           weakWords: weakWords,
           wordFeedback: wordFeedback
         },
         grammarAnalysis: {
           grammarScore: grammarScore,
           grammarErrors: [],
           grammarFeedback: grammarScore >= 80 ? "Ngữ pháp chính xác" : grammarScore >= 60 ? "Ngữ pháp cần cải thiện" : "Ngữ pháp cần luyện tập nhiều"
         },
                 improvementSuggestions: [
           !saidExpectedWord ? `🚨 LỖI NGHIÊM TRỌNG: Bạn cần đọc từ "${expectedText}", không phải "${closestWord}"` : 
           weakWords.length > 0 ? `Tập trung cải thiện: ${weakWords.map(w => w.text).join(', ')}` : "Duy trì phát âm hiện tại",
           !saidExpectedWord ? `📝 LẶP LẠI: Hãy nói rõ ràng từ "${expectedText}" một vài lần` :
           weakWords.length > 0 ? `Luyện tập từng từ: ${weakWords.map(w => `"${w.text}" (${w.confidence}%)`).join(', ')}` : "Phát âm tốt, tiếp tục duy trì",
           !saidExpectedWord ? `🔊 NGHE MẪU: Sử dụng nút "Nghe phát âm" để nghe cách đọc "${expectedText}"` :
           `Nói chậm và rõ ràng hơn khi phát âm "${transcribedText}"`,
        
           "Luyện tập thường xuyên để cải thiện"
         ],
                 emotionalAnalysis: {
           sentiment: sentimentData.overall_sentiment,
           confidence: sentimentData.sentiment_score,
           analysis: !saidExpectedWord ? `❌ LỖI NGHIÊM TRỌNG: Đọc sai từ "${expectedText}" thành "${closestWord}"` : 
           sentimentData.sentiment_score > 0 ? `Cảm xúc ${sentimentData.overall_sentiment.toLowerCase()} với độ tin cậy ${Math.round(sentimentData.sentiment_score * 100)}%` : "Không đủ dữ liệu để phân tích cảm xúc"
         }
      };
    }

    // Step 4: Combine all data
    const result = {
      score: finalAnalysis.score,
      feedback: finalAnalysis.feedback,
      transcribedText,
      expectedText,
      confidence: transcript.confidence || 0,
      words: transcript.words || [],
      detailedAnalysis: finalAnalysis.detailedAnalysis,
             wordAnalysis: finalAnalysis.wordAnalysis,
       grammarAnalysis: finalAnalysis.grammarAnalysis || {
         grammarScore: 0,
         grammarErrors: [],
         grammarFeedback: "Không có dữ liệu ngữ pháp",
         grammarStrengths: []
       },
       pronunciationAnalysis: finalAnalysis.pronunciationAnalysis || {
         pronunciationScore: 0,
         phoneticIssues: [],
         stressPatterns: [],
         intonationAnalysis: "Không có dữ liệu",
         clarityAssessment: "Không có dữ liệu"
       },
       fluencyAnalysis: finalAnalysis.fluencyAnalysis || {
         fluencyScore: 0,
         paceAssessment: "Không có dữ liệu",
         hesitationPatterns: [],
         naturalness: "Không có dữ liệu"
       },
       improvementSuggestions: finalAnalysis.improvementSuggestions,
       emotionalAnalysis: finalAnalysis.emotionalAnalysis,
       overallAssessment: finalAnalysis.overallAssessment || {
         strengths: [],
         weaknesses: [],
         priorityAreas: [],
         learningPath: "Không có dữ liệu"
       },
             breakdown: {
         assemblyAIConfidence: Math.round((transcript.confidence || 0) * 100),
         openAIScore: useOpenAI ? finalAnalysis.score : null,
         sentimentScore: sentimentData.sentiment_score > 0 ? Math.round(sentimentData.sentiment_score * 100) : null
       },
      details: {
        method: useOpenAI ? 'assemblyai_openai_sentiment' : 'assemblyai_only_sentiment',
        assemblyAI: {
          status: transcript.status,
          audio_duration: transcript.audio_duration,
          punctuate: transcript.punctuate,
          format_text: transcript.format_text,
          sentiment_analysis: sentimentData
        },
        openAI: useOpenAI ? {
          model: "gpt-3.5-turbo",
          tokens_used: 0
        } : null
      }
    };

    return result;
  } catch (error) {
    console.error('AssemblyAI + OpenAI pronunciation assessment error:', error);
    throw error;
  }
}

// Helper functions for AssemblyAI-only analysis
function calculateTextSimilarity(transcribed, expected) {
  const transcribedLower = transcribed.toLowerCase().trim();
  const expectedLower = expected.toLowerCase().trim();
  
  if (transcribedLower === expectedLower) return 100;
  if (transcribedLower.includes(expectedLower) || expectedLower.includes(transcribedLower)) return 85;
  
  const maxLength = Math.max(expectedLower.length, transcribedLower.length);
  const minLength = Math.min(expectedLower.length, transcribedLower.length);
  
  if (maxLength > 0) {
    return Math.round((minLength / maxLength) * 100);
  }
  return 0;
}

function calculateWordScore(words) {
  if (!words || words.length === 0) return 0;
  const avgConfidence = words.reduce((sum, word) => sum + (word.confidence || 0), 0) / words.length;
  return Math.round(avgConfidence * 100);
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

// Endpoint: Analyze recorded audio (webm) with RapidAPI ASR and return text
app.post('/api/rapid-asr', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.RAPIDAPI_KEY) {
      return res.status(400).json({ success: false, error: 'Missing RAPIDAPI_KEY in server environment' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' })
    }

    const language = (req.query.language || 'en').toString()
    const output = (req.query.output || 'txt').toString()
    const filePath = req.file.path

    // Read file and convert to base64 per RapidAPI requirement
    const fileBuffer = await fs.promises.readFile(filePath)
    const base64Audio = fileBuffer.toString('base64')

    const text = await callRapidApiASRFromBase64(base64Audio, {
      language,
      output,
      encode: 'true',
      word_timestamps: 'false',
      task: 'transcribe',
    })

    // Clean up uploaded file
    try { fs.unlinkSync(filePath) } catch (_) {}

    console.log('Rapid ASR response:', { success: true, text });
    return res.json({ success: true, text })
  } catch (err) {
    console.error('Rapid ASR endpoint error:', err)
    // Clean up uploaded file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path) } catch (_) {}
    }
    console.log('Rapid ASR error:', { success: false, error: err.message || 'Internal error' });
    return res.status(500).json({ success: false, error: err.message || 'Internal error' })
  }
})

// Real-time transcription function for streaming audio using AssemblyAI
async function transcribeStreamingAudio(audioBuffer) {
  try {
    // Create a temporary file from the audio buffer
    const tempFilePath = path.join(__dirname, 'uploads', `temp-${Date.now()}.webm`);
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

    // Create prompt for OpenAI to generate practice sentence
    const practicePrompt = `
You are an expert English language teacher and creative writing specialist. Create a diverse, natural practice sentence that includes the word "${word}" to help students improve their pronunciation and speaking skills.

CREATIVITY REQUIREMENTS:
- Create a sentence that is DIFFERENT from typical practice sentences
- Use various sentence structures and contexts
- Make it engaging and memorable
- Include the word "${word}" naturally and meaningfully

SENTENCE VARIETY OPTIONS (choose one randomly):
1. QUESTION SENTENCE: Ask a question using the word
2. OPINION SENTENCE: Express a personal opinion or preference
3. STORY SENTENCE: Create a mini-story or scenario
4. COMPARISON SENTENCE: Compare something using the word
5. DESCRIPTIVE SENTENCE: Describe something in detail
6. ACTION SENTENCE: Describe an action or activity
7. EMOTIONAL SENTENCE: Express feelings or emotions
8. FUTURE SENTENCE: Talk about plans or predictions
9. PAST SENTENCE: Describe a past experience
10. CONDITIONAL SENTENCE: Use "if" or "when" structures

CONTEXT VARIETY:
- Daily life situations
- Work or school scenarios
- Travel and adventure
- Food and cooking
- Technology and gadgets
- Nature and environment
- Sports and hobbies
- Family and relationships
- Shopping and fashion
- Health and wellness

LANGUAGE LEVEL:
- Suitable for intermediate English learners
- Natural, conversational tone
- Clear pronunciation practice opportunities
- 1-2 sentences maximum
- Engaging and fun to say

EXAMPLES FOR DIFFERENT STYLES:
- Question: "Have you ever tried making ${word} at home?"
- Opinion: "I think ${word} is the most amazing thing I've discovered this year."
- Story: "Yesterday, I found the most incredible ${word} while exploring the local market."
- Comparison: "This ${word} tastes much better than the one I had last week."
- Descriptive: "The ${word} in this restaurant has the perfect balance of flavors."

Please provide only the sentence, no explanations or additional text. Make it creative and different from typical practice sentences!
`;

    try {
      const openAIResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert English language teacher who creates natural practice sentences for pronunciation improvement."
          },
          {
            role: "user",
            content: practicePrompt
          }
        ],
        temperature: 0.9,
        max_tokens: 150
      });

      const sentence = openAIResponse.choices[0].message.content.trim();
      
      console.log('Generated practice sentence:', sentence);
      
      const result = {
        success: true,
        sentence: sentence,
        word: word,
        timestamp: new Date().toISOString()
      };

      console.log('Practice sentence generation response:', result);
      res.json(result);

    } catch (openAIError) {
      console.error('OpenAI API error for practice sentence:', openAIError.message);
      
      // Fallback: create diverse practice sentences
      const fallbackSentences = [
        `Have you ever tried making ${word} at home?`,
        `I think ${word} is absolutely amazing!`,
        `Yesterday, I discovered the most incredible ${word}.`,
        `This ${word} tastes much better than the usual ones.`,
        `The ${word} in this place has the perfect flavor.`,
        `Would you like to learn how to make ${word}?`,
        `I can't believe how delicious this ${word} is!`,
        `Have you seen the new ${word} at the market?`,
        `This is the best ${word} I've ever tasted.`,
        `Let's practice saying "${word}" together.`
      ];
      
      const randomIndex = Math.floor(Math.random() * fallbackSentences.length);
      const fallbackSentence = fallbackSentences[randomIndex];
      
      const fallbackResult = {
        success: true,
        sentence: fallbackSentence,
        word: word,
        fallback: true,
        timestamp: new Date().toISOString()
      };

      console.log('Practice sentence fallback response:', fallbackResult);
      res.json(fallbackResult);
    }

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
  console.log('- POST /api/assemblyai-transcribe - AssemblyAI audio transcription (Node.js SDK)');
  console.log('- POST /api/pronunciation-assess - AssemblyAI + OpenAI pronunciation assessment');
  console.log('- POST /api/realtime-transcribe - Real-time audio transcription with AssemblyAI');
  console.log('- POST /api/rapid-asr - RapidAPI ASR transcription for recorded audio');
  console.log('- GET /api/health - Health check');
});