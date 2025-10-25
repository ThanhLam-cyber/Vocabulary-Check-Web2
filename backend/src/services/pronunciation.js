const assemblyai = require('../config/assemblyai');
const { 
  generateAIFeedback, 
  generateAIImprovementSuggestions,
  generateAIDetailedAnalysis,
  calculateWordScore 
} = require('./assemblyaiService');

// AssemblyAI + OpenAI pronunciation assessment with DYNAMIC AI feedback
async function assessPronunciationWithAssemblyAIAndOpenAI(audioFilePath, expectedText) {
  try {
    console.log('🎙️ Starting pronunciation assessment...');
    
    // Step 1: Use AssemblyAI for transcription with sentiment analysis
    const assemblyParams = {
      audio: audioFilePath,
      speech_model: "universal",
      language_code: "en",
      word_boost: [expectedText.toLowerCase()],
      boost_param: "high",
      sentiment_analysis: true,
      punctuate: true,
      format_text: true
    };

    const transcript = await assemblyai.transcripts.transcribe(assemblyParams);
    
    if (transcript.status === "error") {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    const transcribedText = transcript.text || '';
    console.log(`📝 Transcribed: "${transcribedText}" | Expected: "${expectedText}"`);
    
    // Extract sentiment analysis data
    let sentimentData = {
      overall_sentiment: "NEUTRAL",
      sentiment_score: 0.5,
      sentiment_details: []
    };

    if (transcript.sentiment_analysis && transcript.sentiment_analysis.results) {
      const sentimentResults = transcript.sentiment_analysis.results;
      
      if (sentimentResults && sentimentResults.length > 0) {
        sentimentData.sentiment_details = sentimentResults.map(result => ({
          text: result.text,
          sentiment: result.sentiment,
          confidence: result.confidence
        }));
        
        const avgConfidence = sentimentResults.reduce((sum, r) => sum + r.confidence, 0) / sentimentResults.length;
        sentimentData.sentiment_score = avgConfidence;
        sentimentData.overall_sentiment = sentimentResults[0].sentiment;
      }
    }

    // Step 2: Calculate scores
    const confidenceScore = Math.round((transcript.confidence || 0) * 100);
    const wordScore = calculateWordScore(transcript.words || []);
    
    // Step 3: Check if the user said the expected word - STRICT CHECKING
    const transcribedWords = transcribedText.toLowerCase().split(/\s+/);
    const expectedWord = expectedText.toLowerCase();
    
    console.log('🔍 Word matching:', { transcribedWords, expectedWord });
    
    const saidExpectedWord = transcribedWords.some(word => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      const cleanExpected = expectedWord.replace(/[^a-zA-Z]/g, '');
      
      // Exact match
      if (cleanWord === cleanExpected) {
        console.log('✅ Exact match!');
        return true;
      }
      
      // Very close similarity (15% difference allowed)
      if (cleanWord.length >= 3 && cleanExpected.length >= 3) {
        const maxDiff = Math.min(cleanWord.length, cleanExpected.length) * 0.15;
        let differences = 0;
        const maxLen = Math.max(cleanWord.length, cleanExpected.length);
        
        for (let i = 0; i < maxLen; i++) {
          if (cleanWord[i] !== cleanExpected[i]) {
            differences++;
            if (differences > maxDiff) return false;
          }
        }
        if (differences <= maxDiff) {
          console.log(`✅ Close match (${differences} differences)`);
          return true;
        }
      }
      
      return false;
    });
    
    console.log('Result:', saidExpectedWord ? '✓ Correct word' : '✗ Wrong word');
    
    // Step 4: Calculate grammar score
    const grammarScore = Math.round((wordScore * 0.7) + (confidenceScore * 0.3));
    
    // Step 5: Calculate overall score with heavy penalty for wrong word
    let baseScore = Math.round((confidenceScore * 0.4) + (wordScore * 0.4) + (grammarScore * 0.2));
    
    if (!saidExpectedWord) {
      baseScore = Math.max(20, Math.min(50, baseScore * 0.3)); // Force 20-50 for wrong word
      console.log('⚠️ Wrong word penalty applied');
    }
    
    const overallScore = baseScore;
    console.log(`📊 Scores: Overall=${overallScore}, Confidence=${confidenceScore}, Word=${wordScore}`);
    
    // Step 6: Find closest word if wrong
    let closestWord = transcribedText;
    if (!saidExpectedWord) {
      let minDiff = Infinity;
      transcribedWords.forEach(word => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        const cleanExpected = expectedWord.replace(/[^a-zA-Z]/g, '');
        
        let differences = 0;
        const maxLen = Math.max(cleanWord.length, cleanExpected.length);
        for (let i = 0; i < maxLen; i++) {
          if (cleanWord[i] !== cleanExpected[i]) differences++;
        }
        
        if (differences < minDiff) {
          minDiff = differences;
          closestWord = word;
        }
      });
      console.log(`🔎 Closest word found: "${closestWord}"`);
    }
    
    // Step 7: Analyze words
    const strongWords = [];
    const weakWords = [];
    const wordFeedback = [];
    
    if (transcript.words && transcript.words.length > 0) {
      transcript.words.forEach(word => {
        const wordConfidence = Math.round((word.confidence || 0) * 100);
        if (wordConfidence >= 80) {
          strongWords.push({ text: word.text, confidence: wordConfidence });
        } else {
          weakWords.push({ text: word.text, confidence: wordConfidence });
          wordFeedback.push(`"${word.text}" - cần cải thiện (${wordConfidence}%)`);
        }
      });
    }

    // Step 8: Generate DYNAMIC AI feedback using OpenAI
    console.log('🤖 Generating AI feedback...');
    
    const feedbackData = {
      expectedText,
      transcribedText,
      confidenceScore,
      wordScore,
      saidExpectedWord,
      closestWord,
      overallScore,
      strongWords,
      weakWords,
      sentimentData
    };

    const [aiFeedback, aiSuggestions, aiAnalysis] = await Promise.all([
      generateAIFeedback(feedbackData),
      generateAIImprovementSuggestions(feedbackData),
      generateAIDetailedAnalysis(feedbackData)
    ]);

    console.log('✅ AI feedback generated successfully');

    // Step 9: Build final result
    const result = {
      score: overallScore,
      feedback: aiFeedback, // DYNAMIC AI feedback
      transcribedText,
      expectedText,
      confidence: transcript.confidence || 0,
      words: transcript.words || [],
      detailedAnalysis: aiAnalysis, // DYNAMIC AI analysis
      wordAnalysis: {
        strongWords,
        weakWords,
        wordFeedback
      },
      grammarAnalysis: {
        grammarScore,
        grammarErrors: [],
        grammarFeedback: grammarScore >= 80 
          ? "Ngữ pháp chính xác" 
          : grammarScore >= 60 
            ? "Ngữ pháp cần cải thiện" 
            : "Ngữ pháp cần luyện tập nhiều"
      },
      pronunciationAnalysis: {
        pronunciationScore: overallScore,
        phoneticIssues: !saidExpectedWord 
          ? [`Phát âm sai từ: "${closestWord}" thay vì "${expectedText}"`]
          : weakWords.map(w => `Âm "${w.text}" cần cải thiện (${w.confidence}%)`),
        clarityAssessment: confidenceScore >= 80 
          ? "Phát âm rõ ràng" 
          : confidenceScore >= 60 
            ? "Phát âm khá rõ" 
            : "Cần phát âm rõ ràng hơn"
      },
      fluencyAnalysis: {
        fluencyScore: Math.round((confidenceScore + wordScore) / 2),
        naturalness: confidenceScore >= 85 
          ? "Tự nhiên, trôi chảy" 
          : confidenceScore >= 70 
            ? "Khá tự nhiên" 
            : "Cần luyện để tự nhiên hơn"
      },
      improvementSuggestions: aiSuggestions, // DYNAMIC AI suggestions
      emotionalAnalysis: {
        sentiment: sentimentData.overall_sentiment,
        confidence: sentimentData.sentiment_score,
        analysis: !saidExpectedWord 
          ? `Lỗi nghiêm trọng: Đọc sai từ "${expectedText}" thành "${closestWord}"`
          : sentimentData.sentiment_score > 0 
            ? `Cảm xúc ${sentimentData.overall_sentiment.toLowerCase()} với độ tin cậy ${Math.round(sentimentData.sentiment_score * 100)}%`
            : "Không đủ dữ liệu phân tích cảm xúc"
      },
      overallAssessment: {
        strengths: [
          ...strongWords.map(w => `Phát âm tốt: "${w.text}" (${w.confidence}%)`),
          confidenceScore >= 80 ? "Độ rõ ràng cao" : null,
          saidExpectedWord ? "Đọc đúng từ yêu cầu" : null
        ].filter(Boolean),
        weaknesses: [
          !saidExpectedWord ? `Đọc sai từ "${expectedText}"` : null,
          ...weakWords.map(w => `Cần cải thiện: "${w.text}" (${w.confidence}%)`),
          confidenceScore < 70 ? "Cần phát âm rõ ràng hơn" : null
        ].filter(Boolean),
        priorityAreas: !saidExpectedWord 
          ? [`Ưu tiên số 1: Phát âm đúng từ "${expectedText}"`]
          : weakWords.length > 0 
            ? [`Cải thiện: ${weakWords.map(w => w.text).join(', ')}`]
            : ["Duy trì chất lượng hiện tại"],
        learningPath: !saidExpectedWord
          ? `Tập trung nghe và nhắc lại từ "${expectedText}" cho đến khi thành thạo`
          : overallScore >= 85
            ? "Tiếp tục luyện tập và học từ mới"
            : "Luyện tập đều đặn, chú ý phát âm từng âm"
      },
      breakdown: {
        assemblyAIConfidence: confidenceScore,
        wordAccuracyScore: wordScore,
        grammarScore: grammarScore,
        sentimentScore: Math.round(sentimentData.sentiment_score * 100)
      },
      details: {
        method: 'assemblyai_dynamic_ai_feedback',
        assemblyAI: {
          status: transcript.status,
          audio_duration: transcript.audio_duration,
          sentiment_analysis: sentimentData
        },
        ai_feedback_generated: true
      }
    };

    console.log('✅ Pronunciation assessment completed');
    return result;

  } catch (error) {
    console.error('❌ Pronunciation assessment error:', error);
    throw error;
  }
}

module.exports = {
  assessPronunciationWithAssemblyAIAndOpenAI
};