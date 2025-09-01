const assemblyai = require('../config/assemblyai');
const openai = require('../config/openai');

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
      sentiment_analysis: true,
      punctuate: true,
      format_text: true
    };

    const transcript = await assemblyai.transcripts.transcribe(assemblyParams);
    
    if (transcript.status === "error") {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    const transcribedText = transcript.text || '';
    
    // Extract sentiment analysis data
    let sentimentData = {
      overall_sentiment: "NEUTRAL",
      sentiment_score: 0,
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
        
        // Calculate overall sentiment
        const avgConfidence = sentimentResults.reduce((sum, r) => sum + r.confidence, 0) / sentimentResults.length;
        sentimentData.sentiment_score = avgConfidence;
        sentimentData.overall_sentiment = sentimentResults[0].sentiment;
      } else {
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
      }
    } else {
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
    }

    // Step 2: Try OpenAI analysis, fallback to AssemblyAI-only if quota exceeded
    let openAIAnalysis = null;
    let useOpenAI = true;

    try {
      const openAIPrompt = `
You are Dr. Sarah Chen, a world-renowned English pronunciation expert. Provide detailed, helpful feedback in Vietnamese.

ANALYSIS CONTEXT:
ORIGINAL TARGET WORD: "${expectedText}"
ACTUAL SPEECH TRANSCRIBED: "${transcribedText}"
ASSEMBLYAI CONFIDENCE: ${Math.round((transcript.confidence || 0) * 100)}%
EMOTIONAL TONE ANALYSIS: ${JSON.stringify(sentimentData)}

CRITICAL ASSESSMENT PARAMETERS:
1. WORD ACCURACY CHECK: If user was asked to say "${expectedText}" but said "${transcribedText}", this is a CRITICAL ERROR. You MUST give a score below 50.

2. PHONETIC PRECISION: Analyze each phoneme, stress pattern, and intonation contour ONLY if the correct word was said.

3. COMMUNICATIVE EFFECTIVENESS: Assess how well the message would be understood by native speakers.

MANDATORY SCORING RULES:
- If wrong word said: Score MUST be between 20-50, regardless of pronunciation quality
- If correct word said: Score can be 50-100 based on pronunciation quality
- Word accuracy is the PRIMARY factor - pronunciation quality is secondary

Please provide feedback in Vietnamese with specific actionable insights.
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
      
      // Calculate score based on AssemblyAI data
      const confidenceScore = Math.round((transcript.confidence || 0) * 100);
      const wordScore = calculateWordScore(transcript.words || []);
      
      // Check if the user said the expected word
      const transcribedWords = transcribedText.toLowerCase().split(/\s+/);
      const expectedWord = expectedText.toLowerCase();
      
      // Strict word matching
      const saidExpectedWord = transcribedWords.some(word => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        const cleanExpected = expectedWord.replace(/[^a-zA-Z]/g, '');
        
        // Exact match
        if (cleanWord === cleanExpected) {
          return true;
        }
        
        // Very close similarity
        if (cleanWord.length >= 3 && cleanExpected.length >= 3) {
          const maxDiff = Math.min(cleanWord.length, cleanExpected.length) * 0.15;
          let differences = 0;
          const maxLen = Math.max(cleanWord.length, cleanExpected.length);
          
          for (let i = 0; i < maxLen; i++) {
            if (cleanWord[i] !== cleanExpected[i]) {
              differences++;
              if (differences > maxDiff) {
                return false;
              }
            }
          }
          if (differences <= maxDiff) {
            return true;
          }
        }
        
        return false;
      });
      
      // Calculate grammar score based on word accuracy and confidence
      const grammarScore = Math.round((wordScore * 0.7) + (confidenceScore * 0.3));
      
      // Calculate overall score based on actual speech quality
      let baseScore = Math.round((confidenceScore * 0.4) + (wordScore * 0.4) + (grammarScore * 0.2));
      
      // HEAVY PENALTY for wrong word
      if (!saidExpectedWord) {
        baseScore = Math.max(20, Math.min(50, baseScore * 0.3));
      }
      
      const overallScore = baseScore;
      
      // Find the closest word that was actually said
      let closestWord = "";
      if (!saidExpectedWord) {
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
          
          if (differences < minDiff) {
            minDiff = differences;
            closestWord = word;
          }
        });
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
        transcript.words.forEach(word => {
          const wordConfidence = Math.round((word.confidence || 0) * 100);
          if (wordConfidence >= 80) {
            strongWords.push({ text: word.text, confidence: wordConfidence });
          } else {
            weakWords.push({ text: word.text, confidence: wordConfidence });
            wordFeedback.push(`"${word.text}" - cần cải thiện phát âm (${wordConfidence}%)`);
          }
        });
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

module.exports = {
  assessPronunciationWithAssemblyAIAndOpenAI,
  calculateTextSimilarity,
  calculateWordScore
};
