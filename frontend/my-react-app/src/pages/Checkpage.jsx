import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Play, Trophy, BookOpen, Mic, MicOff, Volume2, RefreshCw } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config.js"

export default function CheckPage() {
  const [vocabList, setVocabList] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [userAnswer, setUserAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [notification, setNotification] = useState(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [recordingFeedback, setRecordingFeedback] = useState(null)
  const [rapidAsrText, setRapidAsrText] = useState("")
  const [translatePostResult, setTranslatePostResult] = useState(null)
  const [microphonePermission, setMicrophonePermission] = useState('unknown') // 'unknown', 'granted', 'denied', 'prompt'
  const [realTimeText, setRealTimeText] = useState("") // Text hiển thị khi đang ghi âm
  const [isTranscribing, setIsTranscribing] = useState(false) // Trạng thái đang transcribe
  const [pronunciationFeedback, setPronunciationFeedback] = useState(null) // Phản hồi phân tích phát âm
  const [isAnalyzing, setIsAnalyzing] = useState(false) // Trạng thái đang phân tích
  const [practiceSentence, setPracticeSentence] = useState(null) // Đoạn văn luyện tập
  const [isGeneratingSentence, setIsGeneratingSentence] = useState(false) // Trạng thái đang tạo đoạn văn
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const transcriptionIntervalRef = useRef(null) // Interval để gửi audio chunks định kỳ
  const recognitionRef = useRef(null) // Web Speech API recognition instance
  const navigate = useNavigate()

  // Simple local assessment if backend fails or as a complement to ASR text
  const computeLocalAssessment = (recognized, expected) => {
    const rec = (recognized || '').toLowerCase().trim()
    const exp = (expected || '').toLowerCase().trim()
    if (!rec) {
      return { score: 0, feedback: 'Không thể nhận diện phát âm. Vui lòng thử lại.' }
    }
    if (rec === exp) {
      return { score: 100, feedback: 'Phát âm chính xác!' }
    }
    if (rec.includes(exp) || exp.includes(rec)) {
      return { score: 80, feedback: 'Phát âm gần đúng, cần cải thiện thêm.' }
    }
    const lenDiff = Math.abs(rec.length - exp.length)
    const score = Math.max(20, 100 - lenDiff * 10)
    return { score, feedback: 'Phát âm cần cải thiện. Hãy luyện tập thêm.' }
  }

  // Fetch vocabulary from Firebase
  const fetchVocabList = async () => {
    try {
      setLoading(true)
      const vocabCollectionRef = collection(db, "vocabulary")
      const querySnapshot = await getDocs(vocabCollectionRef)
      
      const vocabData = querySnapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }))
      
      setVocabList(vocabData)
      
      if (vocabData.length === 0) {
        setNotification({ 
          type: "error", 
          message: "Không có từ vựng nào để kiểm tra. Hãy thêm từ vựng trước!" 
        })
      }
    } catch (error) {
      console.error("Lỗi tải từ vựng:", error)
      setNotification({ 
        type: "error", 
        message: `Lỗi tải từ vựng: ${error.message}` 
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate random question
  const generateQuestion = () => {
    if (vocabList.length === 0) return

    const randomIndex = Math.floor(Math.random() * vocabList.length)
    const randomVocab = vocabList[randomIndex]
    
    // Only Vietnamese to English questions
    const question = {
      vocab: randomVocab,
      question: randomVocab.vietnamese,
      answer: randomVocab.english,
      type: "vietnamese-to-english",
      hint: randomVocab.example || null
    }
    
    setCurrentQuestion(question)
    setUserAnswer("")
    setShowResult(false)
    setIsCorrect(false)
    // Reset recording states for new question
    setRecording(false)
    setAudioUrl(null)
    setRecordingFeedback(null)
    setRealTimeText("")
    setIsTranscribing(false)
    setRapidAsrText("")
    setTranslatePostResult(null)
    setPronunciationFeedback(null)
    setIsAnalyzing(false)
  }

  // Start quiz
  const startQuiz = () => {
    if (vocabList.length === 0) {
      setNotification({ 
        type: "error", 
        message: "Không có từ vựng nào để kiểm tra!" 
      })
      return
    }
    
    setQuizStarted(true)
    setScore(0)
    setTotalQuestions(0)
    generateQuestion()
  }

  // Check answer
  const checkAnswer = () => {
    if (!currentQuestion || !userAnswer.trim()) {
      setNotification({ 
        type: "error", 
        message: "Vui lòng nhập câu trả lời!" 
      })
      return
    }

    // Clean and normalize both strings for comparison
    const cleanUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, ' ')
    const cleanCorrectAnswer = currentQuestion.answer.trim().toLowerCase().replace(/\s+/g, ' ')
    
    // More flexible comparison - check for exact match first, then check if user answer contains correct answer
    let correct = cleanUserAnswer === cleanCorrectAnswer
    
    // If exact match fails, try partial match (for cases where user adds extra words)
    if (!correct && cleanUserAnswer.includes(cleanCorrectAnswer)) {
      correct = true
    }
    
    // If still not correct, try the reverse (correct answer contains user answer)
    if (!correct && cleanCorrectAnswer.includes(cleanUserAnswer) && cleanUserAnswer.length > 2) {
      correct = true
    }
    
    setIsCorrect(correct)
    setShowResult(true)
    
    if (correct) {
      setScore(prev => prev + 1)
    }
    
    setTotalQuestions(prev => prev + 1)
  }

  // Next question
  const nextQuestion = () => {
    generateQuestion()
  }

  // Reset quiz
  const resetQuiz = () => {
    setQuizStarted(false)
    setScore(0)
    setTotalQuestions(0)
    setCurrentQuestion(null)
    setUserAnswer("")
    setShowResult(false)
    setIsCorrect(false)
    setRecording(false)
    setAudioUrl(null)
    setRecordingFeedback(null)
    setRealTimeText("")
    setIsTranscribing(false)
    setRapidAsrText("")
    setTranslatePostResult(null)
    setPronunciationFeedback(null)
    setIsAnalyzing(false)
  }

  // Check microphone permission status
  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophonePermission('denied')
        return false
      }

      // Check if we have permission
      const permission = await navigator.permissions.query({ name: 'microphone' })
      setMicrophonePermission(permission.state)
      
      if (permission.state === 'granted') {
        return true
      } else if (permission.state === 'denied') {
        setNotification({ 
          type: "error", 
          message: "Quyền microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt." 
        })
        return false
      } else {
        // Permission state is 'prompt'
        return true // Will prompt user when getUserMedia is called
      }
    } catch (error) {
      console.error("Lỗi kiểm tra quyền microphone:", error)
      setMicrophonePermission('unknown')
      return true // Try anyway
    }
  }

  // Retry microphone permission request
  const retryMicrophonePermission = async () => {
    setMicrophonePermission('unknown')
    const hasPermission = await checkMicrophonePermission()
    if (hasPermission) {
      setNotification({ 
        type: "success", 
        message: "Đã kiểm tra lại quyền microphone. Thử ghi âm để cấp quyền." 
      })
    }
  }

  // Send audio chunk for real-time transcription
  const sendAudioChunkForTranscription = async (audioBlob) => {
    try {
      setIsTranscribing(true)
      const formData = new FormData()
      formData.append("audio", audioBlob, "chunk.webm")

      const response = await fetch("http://localhost:4000/api/realtime-transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      
      if (data.success && data.transcribedText) {
        setRealTimeText(prev => {
          const prevClean = (prev || '').trim()
          const nextClean = (data.transcribedText || '').trim()
          if (!nextClean) return prevClean
          if (!prevClean) return nextClean
          const lowerPrev = prevClean.toLowerCase()
          const lowerNext = nextClean.toLowerCase()
          // If new text is already fully contained, skip
          if (lowerPrev.includes(lowerNext)) return prevClean
          // If prev is contained in new, replace with new
          if (lowerNext.includes(lowerPrev)) return nextClean
          // Merge with suffix/prefix overlap to avoid duplication
          const maxOverlap = Math.min(prevClean.length, nextClean.length)
          let merged = null
          for (let i = maxOverlap; i > 0; i--) {
            if (lowerPrev.endsWith(lowerNext.slice(0, i))) {
              merged = prevClean + nextClean.slice(i)
              break
            }
          }
          return (merged || (prevClean + ' ' + nextClean)).trim()
        })
      }
    } catch (error) {
      console.error("Lỗi khi gửi audio chunk:", error)
    } finally {
      setIsTranscribing(false)
    }
  }

  // Recording functions
  const startRecording = async () => {
    try {
      // Check permission first
      const hasPermission = await checkMicrophonePermission()
      if (!hasPermission) {
        return
      }

      // Reset real-time text
      setRealTimeText("")
      setIsTranscribing(false)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      audioChunksRef.current = []

      // Detect native in-browser speech recognition support (Web Speech API)
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
      const useNativeASR = !!SpeechRecognitionCtor

      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
          
          // If trình duyệt không hỗ trợ Web Speech API, không gửi lên backend nữa
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())

        // Clear transcription interval
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current)
          transcriptionIntervalRef.current = null
        }

        // Stop Web Speech recognition if running
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onend = null
            recognitionRef.current.stop()
          } catch (err) {
            // no-op
          }
          recognitionRef.current = null
        }

        setIsTranscribing(false)

        // Send audio for pronunciation assessment
        if (currentQuestion && currentQuestion.answer) {
          sendAudioForAssessment(audioBlob)
        }
      }

      mediaRecorderRef.current.start(500) // Start recording with 500ms timeslice for real-time processing
      setRecording(true)
      setMicrophonePermission('granted')
      setNotification({ type: "success", message: "Bắt đầu ghi âm phát âm..." })

      if (useNativeASR) {
        // Start in-browser speech recognition for immediate on-screen text
        try {
          const recognition = new SpeechRecognitionCtor()
          recognition.interimResults = true
          recognition.continuous = true
          recognition.lang = 'en-US'

          setIsTranscribing(true)

          recognition.onresult = (event) => {
            let interim = ''
            let finals = ''
            // Rebuild display text from current session results to avoid duplication
            for (let i = 0; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                finals += transcript + ' '
              } else {
                interim += transcript
              }
            }
            const display = (finals + interim).trim()
            setRealTimeText(display)
          }

          recognition.onerror = (e) => {
            console.error('SpeechRecognition error:', e)
          }

          recognition.onend = () => {
            // Auto-restart while still recording for continuous updates
            if (recording) {
              try { recognition.start() } catch (_) {}
            }
          }

          recognitionRef.current = recognition
          try { recognition.start() } catch (_) {}
        } catch (err) {
          console.error('Failed to start SpeechRecognition:', err)
        }
      } else {
        setNotification({ type: 'error', message: 'Trình duyệt không hỗ trợ nhận diện giọng nói (Web Speech API).' })
      }

    } catch (error) {
      console.error("Lỗi khi bắt đầu ghi âm:", error)
      
      // Handle specific error types
      if (error.name === 'NotAllowedError') {
        setMicrophonePermission('denied')
        setNotification({ 
          type: "error", 
          message: "Quyền microphone bị từ chối. Vui lòng cho phép truy cập microphone và thử lại." 
        })
      } else if (error.name === 'NotFoundError') {
        setNotification({ 
          type: "error", 
          message: "Không tìm thấy microphone. Vui lòng kiểm tra thiết bị và thử lại." 
        })
      } else if (error.name === 'NotReadableError') {
        setNotification({ 
          type: "error", 
          message: "Microphone đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại." 
        })
      } else {
        setNotification({ 
          type: "error", 
          message: `Lỗi truy cập microphone: ${error.message}` 
        })
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      setNotification({ type: "success", message: "Đã dừng ghi âm. Đang phân tích phát âm..." })
      
      // Clear transcription interval
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current)
        transcriptionIntervalRef.current = null
      }

      // Ensure Web Speech recognition is stopped
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null
          recognitionRef.current.stop()
        } catch (err) {
          // no-op
        }
        recognitionRef.current = null
      }
      setIsTranscribing(false)
      
      // The stream cleanup is handled in the onstop callback
    }
  }

  // Send audio for pronunciation assessment
  const sendAudioForAssessment = async (audioBlob) => {
    try {
      setIsAnalyzing(true)
      setNotification({ type: "info", message: "Đang phân tích phát âm..." })
      
      const formData = new FormData()
      formData.append("audio", audioBlob, "pronunciation.webm")
      formData.append("transcript", currentQuestion.answer)

      const response = await fetch("http://localhost:4000/api/pronunciation-assess", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      
      if (data.success) {
        setPronunciationFeedback({
          feedback: data.feedback,
          score: data.score || null,
          transcribedText: data.transcribedText,
          expectedText: data.expectedText,
          confidence: data.confidence,
          detailedAnalysis: data.detailedAnalysis || [],
          wordAnalysis: data.wordAnalysis || {},
          grammarAnalysis: data.grammarAnalysis || {},
          pronunciationAnalysis: data.pronunciationAnalysis || {},
          fluencyAnalysis: data.fluencyAnalysis || {},
          improvementSuggestions: data.improvementSuggestions || [],
          emotionalAnalysis: data.emotionalAnalysis || {},
          overallAssessment: data.overallAssessment || {},
          breakdown: data.breakdown || {},
          details: data.providerRaw
        })
        setNotification({ 
          type: "success", 
          message: "Phân tích phát âm hoàn tất!" 
        })
      } else {
        // Fallback to local assessment
        const localAssessment = computeLocalAssessment(realTimeText, currentQuestion.answer)
        setPronunciationFeedback({
          feedback: localAssessment.feedback,
          score: localAssessment.score,
          details: { method: 'local' }
        })
        setNotification({ 
          type: "warning", 
          message: "Sử dụng đánh giá cục bộ do lỗi server" 
        })
      }
    } catch (error) {
      console.error("Lỗi khi phân tích phát âm:", error)
      
      // Fallback to local assessment
      const localAssessment = computeLocalAssessment(realTimeText, currentQuestion.answer)
      setPronunciationFeedback({
        feedback: localAssessment.feedback,
        score: localAssessment.score,
        details: { method: 'local', error: error.message }
      })
      setNotification({ 
        type: "warning", 
        message: "Sử dụng đánh giá cục bộ do lỗi kết nối" 
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Generate practice sentence with OpenAI
  const generatePracticeSentence = async (word) => {
    try {
      setIsGeneratingSentence(true)
      setNotification({ type: "info", message: "Đang tạo đoạn văn luyện tập..." })
      
      const response = await fetch("http://localhost:4000/api/generate-practice-sentence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: word })
      })

      const data = await response.json()
      
      if (data.success) {
        setPracticeSentence(data.sentence)
        setNotification({ 
          type: "success", 
          message: "Đã tạo đoạn văn luyện tập!" 
        })
      } else {
        setNotification({ 
          type: "error", 
          message: "Lỗi tạo đoạn văn luyện tập" 
        })
      }
    } catch (error) {
      console.error("Lỗi khi tạo đoạn văn luyện tập:", error)
      setNotification({ 
        type: "error", 
        message: "Lỗi kết nối khi tạo đoạn văn luyện tập" 
      })
    } finally {
      setIsGeneratingSentence(false)
    }
  }

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Load vocabulary on component mount
  useEffect(() => {
    fetchVocabList()
  }, [])

  // Check microphone permission on component mount
  useEffect(() => {
    checkMicrophonePermission()
  }, [])

  // Cleanup transcription interval on unmount
  useEffect(() => {
    return () => {
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current)
      }
      // Cleanup Web Speech recognition on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null
          recognitionRef.current.stop()
        } catch (_) {}
        recognitionRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl sm:blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-blue-200/30 to-indigo-200/30 rounded-full blur-2xl sm:blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 relative header-container">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={() => navigate("/")}
              className="p-2 sm:p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg flex-shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 relative z-10 header-text-container">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                  Kiểm Tra Từ Vựng
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm truncate">
                  {quizStarted ? `Điểm: ${score}/${totalQuestions}` : `Có ${vocabList.length} từ để kiểm tra`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <div className="space-y-6">
            {/* Start Quiz Section */}
            {!quizStarted && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                      Sẵn sàng kiểm tra?
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Kiểm tra kiến thức từ vựng của bạn với {vocabList.length} từ có sẵn
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="text-purple-600 font-semibold">Từ vựng</div>
                      <div className="text-2xl font-bold text-purple-700">{vocabList.length}</div>
                    </div>
                    <div className="bg-pink-50 rounded-xl p-4">
                      <div className="text-pink-600 font-semibold">Câu hỏi</div>
                      <div className="text-2xl font-bold text-pink-700">Ngẫu nhiên</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-blue-600 font-semibold">Thời gian</div>
                      <div className="text-2xl font-bold text-blue-700">Không giới hạn</div>
                    </div>
                  </div>

                  <button
                    onClick={startQuiz}
                    disabled={vocabList.length === 0}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5 inline mr-2" />
                    Bắt đầu kiểm tra
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Section */}
            {quizStarted && currentQuestion && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{totalQuestions + 1}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      Tiếng Việt → Tiếng Anh
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Điểm:</span>
                    <span className="font-bold text-purple-600">{score}/{totalQuestions}</span>
                  </div>
                </div>

                {/* Question */}
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                      {currentQuestion.question}
                    </h3>
                    {currentQuestion.hint && (
                      <p className="text-gray-500 text-sm italic">
                        💡 {currentQuestion.hint}
                      </p>
                    )}
                  </div>

                  {/* Answer Input */}
                  <div className="max-w-md mx-auto">
                    <input
                      type="text"
                      placeholder="Nhập câu trả lời..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !showResult && checkAnswer()}
                      disabled={showResult}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-gray-800 placeholder-gray-400 disabled:opacity-50"
                    />
                  </div>

                  {/* Result Display */}
                  {showResult && (
                    <div className={`p-4 rounded-xl ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {isCorrect ? 'Chính xác!' : 'Sai rồi!'}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="text-center">
                          <p className="text-gray-700">
                            <span className="font-semibold">Đáp án đúng:</span> "{currentQuestion.answer}"
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Mẹo: Kiểm tra lại chính tả và khoảng cách
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recording Section - Show after result, regardless of correctness */}
                  {showResult && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200/60">
                      <div className="text-center space-y-4">
                                                <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-base sm:text-lg tracking-wide">Luyện phát âm</h4>
                        </div>
                        
                        <div className="text-center space-y-2 sm:space-y-3">
                          <p className="text-xs sm:text-sm text-slate-600 font-medium tracking-wide">
                            Ghi âm phát âm từ:
                          </p>
                          <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl px-4 sm:px-6 py-3 sm:py-4 border border-gray-200/80 shadow-lg">
                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 tracking-wide">
                              "{currentQuestion.answer}"
                            </p>
                          </div>
                        </div>               
                        
                        {/* Practice Sentence Suggestion Button */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => generatePracticeSentence(currentQuestion.answer)}
                            disabled={isGeneratingSentence}
                            className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-slate-400 disabled:via-slate-500 disabled:to-slate-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl transform hover:scale-105 disabled:transform-none border border-white/20"
                          >
                            {isGeneratingSentence ? (
                              <>
                                <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs sm:text-sm">Đang tạo gợi ý...</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
                                <span className="text-xs sm:text-sm">💡 Gợi ý đoạn văn luyện tập</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Practice Sentence Display */}
                        {practiceSentence && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-lg sm:shadow-xl">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              </div>
                              <p className="font-bold text-slate-800 text-base sm:text-lg tracking-wide">📝 Đoạn văn luyện tập</p>
                            </div>
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-200/60 mb-4 sm:mb-5 shadow-lg">
                              <p className="text-slate-800 text-sm sm:text-lg leading-relaxed italic font-semibold">
                                "{practiceSentence}"
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                              <button
                                onClick={() => {
                                  if ('speechSynthesis' in window) {
                                    const utterance = new SpeechSynthesisUtterance(practiceSentence);
                                    utterance.lang = 'en-US';
                                    utterance.rate = 0.8;
                                    speechSynthesis.speak(utterance);
                                  }
                                }}
                                className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
                              >
                                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                🔊 Nghe phát âm
                              </button>
                              <button
                                onClick={() => generatePracticeSentence(currentQuestion.answer)}
                                className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
                              >
                                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                                🔄 Tạo mẫu khác
                              </button>
                              <button
                                onClick={() => setPracticeSentence(null)}
                                className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-slate-500 via-gray-500 to-zinc-500 hover:from-slate-600 hover:via-gray-600 hover:to-zinc-600 text-white px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
                              >
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                Đóng
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Real-time Transcription Display (keep visible after stop) */}
                        {(recording || realTimeText) && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200/60 shadow-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              {recording ? (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse flex items-center justify-center shadow-lg">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                                </div>
                              ) : (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                                </div>
                              )}
                              <span className="text-base sm:text-lg font-bold text-slate-800 tracking-wide">
                                {recording ? '🎤 Đang ghi âm...' : '📝 Kết quả ghi âm'}
                              </span>
                              {recording && isTranscribing && (
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                              )}
                            </div>
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-200/60 shadow-lg">
                              {realTimeText ? (
                                <p className="text-slate-800 font-bold text-sm sm:text-lg leading-relaxed">
                                  "{realTimeText}"
                                </p>
                              ) : (
                                <p className="text-slate-500 italic text-sm sm:text-lg">
                                  {recording ? (isTranscribing ? 'Đang nhận diện giọng nói...' : 'Bắt đầu nói...') : 'Chưa có nội dung'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Permission Status */}
                        {microphonePermission === 'denied' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-700 text-sm">
                              <MicOff className="w-4 h-4" />
                              <span className="font-semibold">Quyền microphone bị từ chối</span>
                            </div>
                            <p className="text-red-600 text-xs mt-1">
                              Vui lòng cấp quyền microphone trong cài đặt trình duyệt để sử dụng tính năng ghi âm.
                            </p>
                            <div className="mt-2 text-xs text-red-600">
                              <p className="font-semibold">Cách cấp quyền:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Chrome: Nhấp vào biểu tượng khóa 🔒 trên thanh địa chỉ</li>
                                <li>Firefox: Nhấp vào biểu tượng microphone bị gạch chéo</li>
                                <li>Safari: Vào Safari → Preferences → Websites → Microphone</li>
                              </ul>
                            </div>
                            <div className="mt-3">
                              <button
                                onClick={retryMicrophonePermission}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors duration-200"
                              >
                                Thử lại
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Help Section - Show when not recording */}
                        {!recording && (
                          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-5 shadow-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                              </div>
                              <p className="text-base sm:text-lg font-bold text-slate-800 tracking-wide">💡 Không biết nói gì?</p>
                            </div>
                            <p className="text-slate-700 text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">
                              Nhấn nút <span className="font-bold text-amber-700">"Gợi ý đoạn văn luyện tập"</span> ở trên để lấy ý tưởng đoạn văn có chứa từ <span className="font-bold text-slate-800">"{currentQuestion.answer}"</span>
                            </p>
                      
                          </div>
                        )}

                        {/* Recording Button */}
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={recording ? stopRecording : startRecording}
                            disabled={microphonePermission === 'denied'}
                            className={`flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl transform hover:scale-105 disabled:transform-none border border-white/20 ${
                              recording 
                                ? "bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 text-white" 
                                : microphonePermission === 'denied'
                                ? "bg-gradient-to-r from-slate-400 via-gray-400 to-zinc-400 text-slate-600 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white"
                            }`}
                          >
                            {recording ? (
                              <>
                                <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
                                <span className="text-sm sm:text-base">Dừng ghi âm</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                                <span className="text-sm sm:text-base">{microphonePermission === 'denied' ? 'Không có quyền' : 'Bắt đầu ghi âm'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Audio Player (hidden as requested) */}
                        {audioUrl && (
                          <div className="mt-3 hidden">
                            <audio 
                              src={audioUrl} 
                              controls 
                              className="w-full max-w-xs mx-auto"
                            />
                          </div>
                        )}

                        {/* Pronunciation Analysis Feedback */}
                        {(isAnalyzing || pronunciationFeedback) && (
                          <div className="mt-4">
                            {isAnalyzing ? (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                                  <span className="text-yellow-700 font-semibold">Đang phân tích phát âm...</span>
                                </div>
                              </div>
                            ) : pronunciationFeedback ? (
                              <div className={`border-2 rounded-lg p-4 ${
                                pronunciationFeedback.score >= 80 
                                  ? 'bg-green-50 border-green-200' 
                                  : pronunciationFeedback.score >= 60 
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {pronunciationFeedback.score >= 80 ? (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : pronunciationFeedback.score >= 60 ? (
                                      <div className="w-5 h-5 border-2 border-yellow-600 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                                      </div>
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    )}
                                    <span className={`font-semibold ${
                                      pronunciationFeedback.score >= 80 
                                        ? 'text-green-700' 
                                        : pronunciationFeedback.score >= 60 
                                        ? 'text-yellow-700'
                                        : 'text-red-700'
                                    }`}>
                                      Phân tích phát âm
                                    </span>
                                  </div>
                                  {pronunciationFeedback.score !== null && (
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      pronunciationFeedback.score >= 80 
                                        ? 'bg-green-100 text-green-700' 
                                        : pronunciationFeedback.score >= 60 
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {pronunciationFeedback.score}/100
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-sm">
                                  <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/60 shadow-lg backdrop-blur-sm">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                      </div>
                                      <p className="font-bold text-slate-800 text-base sm:text-lg tracking-wide">🏆 Đánh giá tổng quan</p>
                                    </div>
                                    <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-5 border border-slate-200/60 shadow-lg">
                                      <p className={`font-bold text-sm sm:text-lg leading-relaxed ${
                                        pronunciationFeedback.feedback.includes('⚠️') 
                                          ? 'text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200'
                                          : pronunciationFeedback.score >= 80 
                                          ? 'text-emerald-700' 
                                          : pronunciationFeedback.score >= 60 
                                          ? 'text-amber-700'
                                          : 'text-rose-700'
                                      }`}>
                                        {pronunciationFeedback.feedback}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Detailed Analysis */}
                                  {pronunciationFeedback.detailedAnalysis && pronunciationFeedback.detailedAnalysis.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                      {pronunciationFeedback.detailedAnalysis.map((analysis, index) => (
                                        <p key={index} className="text-xs text-gray-600">
                                          {analysis}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Word-Level Analysis */}
                                  {pronunciationFeedback.wordAnalysis && (
                                    <div className="mt-4 sm:mt-5 p-4 sm:p-5 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl sm:rounded-2xl border border-violet-200/60 shadow-lg backdrop-blur-sm">
                                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                                        </div>
                                        <p className="font-bold text-slate-800 text-base sm:text-lg tracking-wide">🔍 Phân tích từng từ</p>
                                      </div>
                                      
                                      {/* Strong Words */}
                                      {pronunciationFeedback.wordAnalysis.strongWords && pronunciationFeedback.wordAnalysis.strongWords.length > 0 && (
                                        <div className="mb-4 sm:mb-5">
                                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                                              <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                            </div>
                                            <p className="text-emerald-700 font-bold text-sm sm:text-base">✅ Phát âm tốt</p>
                                          </div>
                                          <div className="flex flex-wrap gap-2 sm:gap-3">
                                            {pronunciationFeedback.wordAnalysis.strongWords.map((word, index) => (
                                              <span key={index} className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold shadow-md border border-emerald-200/60">
                                                {word.text} ({word.confidence}%)
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Weak Words */}
                                      {pronunciationFeedback.wordAnalysis.weakWords && pronunciationFeedback.wordAnalysis.weakWords.length > 0 && (
                                        <div className="mb-4 sm:mb-5">
                                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                                              <XCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                            </div>
                                            <p className="text-rose-700 font-bold text-sm sm:text-base">❌ Cần cải thiện</p>
                                          </div>
                                          <div className="flex flex-wrap gap-2 sm:gap-3">
                                            {pronunciationFeedback.wordAnalysis.weakWords.map((word, index) => (
                                              <span key={index} className="bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold shadow-md border border-rose-200/60">
                                                {word.text} ({word.confidence}%)
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Word Analysis Details */}
                                      {pronunciationFeedback.wordAnalysis.wordAnalysis && pronunciationFeedback.wordAnalysis.wordAnalysis.length > 0 && (
                                        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                                          {pronunciationFeedback.wordAnalysis.wordAnalysis.map((analysis, index) => (
                                            <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-violet-200/60 shadow-md">
                                              <p className="text-slate-700 text-sm sm:text-base font-semibold leading-relaxed">
                                                {analysis}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Debug: Log pronunciation feedback structure */}
                                  {console.log('Pronunciation Feedback Structure:', pronunciationFeedback)}
                                  
                                  {/* Improvement Suggestions */}
                                  {pronunciationFeedback.improvementSuggestions && pronunciationFeedback.improvementSuggestions.length > 0 && (
                                    <div className="mt-4 sm:mt-5 p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl sm:rounded-2xl border border-emerald-200/60 shadow-lg backdrop-blur-sm">
                                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                                          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                                        </div>
                                        <p className="font-bold text-slate-800 text-base sm:text-lg tracking-wide">💡 Gợi ý cải thiện</p>
                                      </div>
                                      <div className="space-y-3 sm:space-y-4">
                                        {pronunciationFeedback.improvementSuggestions.map((suggestion, index) => (
                                          <div key={index} className="flex items-start gap-3 sm:gap-4 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-200/60 shadow-md">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mt-2 flex-shrink-0 shadow-sm"></div>
                                            <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-semibold">
                                              {suggestion}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      
                                       
                                       {/* Practice Sentence Display */}
                                       {practiceSentence && (
                                         <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                           <p className="font-semibold text-blue-700 mb-2 text-xs">📝 Đoạn văn luyện tập:</p>
                                           <p className="text-blue-600 text-sm leading-relaxed">
                                             {practiceSentence}
                                           </p>
                                           <div className="mt-2 flex gap-2">
                                             <button
                                               onClick={() => {
                                                 if ('speechSynthesis' in window) {
                                                   const utterance = new SpeechSynthesisUtterance(practiceSentence);
                                                   utterance.lang = 'en-US';
                                                   utterance.rate = 0.8;
                                                   speechSynthesis.speak(utterance);
                                                 }
                                               }}
                                               className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded transition-colors duration-200"
                                             >
                                               🔊 Nghe
                                             </button>
                                             <button
                                               onClick={() => setPracticeSentence(null)}
                                               className="bg-gray-500 hover:bg-gray-600 text-white text-xs py-1 px-2 rounded transition-colors duration-200"
                                             >
                                               ✕ Đóng
                                             </button>
                                           </div>
                                         </div>
                                       )}
                                    </div>
                                  )}

                                  {/* Grammar Analysis - Only show if there's meaningful data */}
                                  {pronunciationFeedback.grammarAnalysis && 
                                   (pronunciationFeedback.grammarAnalysis.grammarScore > 0 || 
                                    (pronunciationFeedback.grammarAnalysis.grammarErrors && pronunciationFeedback.grammarAnalysis.grammarErrors.length > 0) ||
                                    (pronunciationFeedback.grammarAnalysis.grammarStrengths && pronunciationFeedback.grammarAnalysis.grammarStrengths.length > 0)) && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                      <p className="font-semibold text-gray-700 mb-2">Phân tích ngữ pháp:</p>
                                      <div className="space-y-1">
                                        {pronunciationFeedback.grammarAnalysis.grammarScore > 0 && (
                                          <p className="text-gray-600">
                                            Điểm ngữ pháp: {pronunciationFeedback.grammarAnalysis.grammarScore}%
                                          </p>
                                        )}
                                        {pronunciationFeedback.grammarAnalysis.grammarFeedback && 
                                         pronunciationFeedback.grammarAnalysis.grammarFeedback !== "Không có dữ liệu ngữ pháp" && (
                                          <p className="text-gray-600">
                                            {pronunciationFeedback.grammarAnalysis.grammarFeedback}
                                          </p>
                                        )}
                                        {pronunciationFeedback.grammarAnalysis.grammarStrengths && pronunciationFeedback.grammarAnalysis.grammarStrengths.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Điểm mạnh:</p>
                                            {pronunciationFeedback.grammarAnalysis.grammarStrengths.map((strength, index) => (
                                              <p key={index} className="text-gray-600 ml-2">
                                                • {strength}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                        {pronunciationFeedback.grammarAnalysis.grammarErrors && pronunciationFeedback.grammarAnalysis.grammarErrors.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Lỗi ngữ pháp:</p>
                                            {pronunciationFeedback.grammarAnalysis.grammarErrors.map((error, index) => (
                                              <div key={index} className="ml-2 mt-1">
                                                <p className="text-gray-600">
                                                  • {error.error} → {error.correction}
                                                </p>
                                                <p className="text-gray-500 text-xs ml-2">
                                                  {error.explanation}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Pronunciation Analysis - Only show if there's meaningful data */}
                                  {pronunciationFeedback.pronunciationAnalysis && 
                                   (pronunciationFeedback.pronunciationAnalysis.pronunciationScore > 0 || 
                                    (pronunciationFeedback.pronunciationAnalysis.phoneticIssues && pronunciationFeedback.pronunciationAnalysis.phoneticIssues.length > 0) ||
                                    (pronunciationFeedback.pronunciationAnalysis.stressPatterns && pronunciationFeedback.pronunciationAnalysis.stressPatterns.length > 0)) && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                      <p className="font-semibold text-gray-700 mb-2">Phân tích phát âm:</p>
                                      <div className="space-y-1">
                                        {pronunciationFeedback.pronunciationAnalysis.pronunciationScore > 0 && (
                                          <p className="text-gray-600">
                                            Điểm phát âm: {pronunciationFeedback.pronunciationAnalysis.pronunciationScore}%
                                          </p>
                                        )}
                                        {pronunciationFeedback.pronunciationAnalysis.clarityAssessment && 
                                         pronunciationFeedback.pronunciationAnalysis.clarityAssessment !== "Không có dữ liệu" && (
                                          <p className="text-gray-600">
                                            {pronunciationFeedback.pronunciationAnalysis.clarityAssessment}
                                          </p>
                                        )}
                                        {pronunciationFeedback.pronunciationAnalysis.phoneticIssues && pronunciationFeedback.pronunciationAnalysis.phoneticIssues.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Vấn đề phát âm:</p>
                                            {pronunciationFeedback.pronunciationAnalysis.phoneticIssues.map((issue, index) => (
                                              <p key={index} className="text-gray-600 ml-2">
                                                • {issue}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                        {pronunciationFeedback.pronunciationAnalysis.stressPatterns && pronunciationFeedback.pronunciationAnalysis.stressPatterns.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Nhấn nhá:</p>
                                            {pronunciationFeedback.pronunciationAnalysis.stressPatterns.map((pattern, index) => (
                                              <p key={index} className="text-gray-600 ml-2">
                                                • {pattern}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Fluency Analysis - Only show if there's meaningful data */}
                                  {pronunciationFeedback.fluencyAnalysis && 
                                   (pronunciationFeedback.fluencyAnalysis.fluencyScore > 0 || 
                                    (pronunciationFeedback.fluencyAnalysis.hesitationPatterns && pronunciationFeedback.fluencyAnalysis.hesitationPatterns.length > 0)) && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                      <p className="font-semibold text-gray-700 mb-2">Phân tích lưu loát:</p>
                                      <div className="space-y-1">
                                        {pronunciationFeedback.fluencyAnalysis.fluencyScore > 0 && (
                                          <p className="text-gray-600">
                                            Điểm lưu loát: {pronunciationFeedback.fluencyAnalysis.fluencyScore}%
                                          </p>
                                        )}
                                        {pronunciationFeedback.fluencyAnalysis.paceAssessment && 
                                         pronunciationFeedback.fluencyAnalysis.paceAssessment !== "Không có dữ liệu" && (
                                          <p className="text-gray-600">
                                            {pronunciationFeedback.fluencyAnalysis.paceAssessment}
                                          </p>
                                        )}
                                        {pronunciationFeedback.fluencyAnalysis.naturalness && 
                                         pronunciationFeedback.fluencyAnalysis.naturalness !== "Không có dữ liệu" && (
                                          <p className="text-gray-600">
                                            {pronunciationFeedback.fluencyAnalysis.naturalness}
                                          </p>
                                        )}
                                        {pronunciationFeedback.fluencyAnalysis.hesitationPatterns && pronunciationFeedback.fluencyAnalysis.hesitationPatterns.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Vấn đề lưu loát:</p>
                                            {pronunciationFeedback.fluencyAnalysis.hesitationPatterns.map((pattern, index) => (
                                              <p key={index} className="text-gray-600 ml-2">
                                                • {pattern}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Overall Assessment - Only show if there's meaningful data */}
                                  {pronunciationFeedback.overallAssessment && 
                                   ((pronunciationFeedback.overallAssessment.strengths && pronunciationFeedback.overallAssessment.strengths.length > 0) ||
                                    (pronunciationFeedback.overallAssessment.priorityAreas && pronunciationFeedback.overallAssessment.priorityAreas.length > 0) ||
                                    (pronunciationFeedback.overallAssessment.learningPath && pronunciationFeedback.overallAssessment.learningPath !== "Không có dữ liệu")) && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                      <p className="font-semibold text-gray-700 mb-2">Đánh giá tổng quan:</p>
                                      <div className="space-y-1">
                                        {pronunciationFeedback.overallAssessment.strengths && pronunciationFeedback.overallAssessment.strengths.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Điểm mạnh:</p>
                                            {pronunciationFeedback.overallAssessment.strengths.map((strength, index) => (
                                              <p key={index} className="text-gray-600 ml-2">
                                                • {strength}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                        {pronunciationFeedback.overallAssessment.priorityAreas && pronunciationFeedback.overallAssessment.priorityAreas.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Ưu tiên cải thiện:</p>
                                            {pronunciationFeedback.overallAssessment.priorityAreas.map((area, index) => (
                                              <p key={index} className="text-gray-600 ml-2">
                                                {index + 1}. {area}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                        {pronunciationFeedback.overallAssessment.learningPath && 
                                         pronunciationFeedback.overallAssessment.learningPath !== "Không có dữ liệu" && (
                                          <div className="mt-2">
                                            <p className="text-gray-600 font-semibold">Lộ trình học:</p>
                                            <p className="text-gray-600 ml-2">
                                              {pronunciationFeedback.overallAssessment.learningPath}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Emotional Analysis - Only show if there's meaningful data */}
                               

                                  {/* Score Breakdown - Hidden from users */}
                                  {/* {pronunciationFeedback.breakdown && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                      <p className="font-semibold text-gray-700 mb-1">Chi tiết điểm:</p>
                                      <div className="space-y-1">
                                        <p className="text-gray-600">
                                          AssemblyAI: {pronunciationFeedback.breakdown.assemblyAIConfidence}%
                                        </p>
                                        <p className="text-gray-600">
                                          OpenAI: {pronunciationFeedback.breakdown.openAIScore !== null ? `${pronunciationFeedback.breakdown.openAIScore}%` : 'Không khả dụng'}
                                        </p>
                                        {pronunciationFeedback.breakdown.sentimentScore && (
                                          <p className="text-gray-600">
                                            Cảm xúc: {pronunciationFeedback.breakdown.sentimentScore}%
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )} */}
                                  
                                  {pronunciationFeedback.details?.method === 'local' && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      💡 Sử dụng đánh giá cục bộ
                                    </p>
                                  )}
                                </div>

                                {/* Detailed feedback if available - Hidden from users */}
                                {/* {pronunciationFeedback.details && pronunciationFeedback.details.method !== 'local' && (
                                  <details className="mt-3">
                                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                      Chi tiết phân tích
                                    </summary>
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(pronunciationFeedback.details, null, 2)}
                                      </pre>
                                    </div>
                                  </details>
                                )} */}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3">
                    {!showResult ? (
                      <button
                        onClick={checkAnswer}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                      >
                        Kiểm tra
                      </button>
                    ) : (
                      <button
                        onClick={nextQuestion}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                      >
                        Câu tiếp theo
                      </button>
                    )}
                  </div>

                  {/* Removed translate post demo */}
                </div>
              </div>
            )}

            {/* Quiz Controls */}
            {quizStarted && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={resetQuiz}
                  className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-xl hover:bg-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-semibold">Làm lại</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div
            className={`flex items-center gap-3 p-4 rounded-xl shadow-2xl border-l-4 transform transition-all duration-300 ease-out
              ${notification.type === "success" 
                ? "bg-white border-l-green-500 text-green-700 shadow-green-100" 
                : notification.type === "error" 
                ? "bg-white border-l-red-500 text-red-700 shadow-red-100" 
                : "bg-white border-l-blue-500 text-blue-700 shadow-blue-100"}`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${notification.type === "success" 
                ? "bg-green-100 text-green-600" 
                : notification.type === "error" 
                ? "bg-red-100 text-red-600" 
                : "bg-blue-100 text-blue-600"}`}
            >
              {notification.type === "success" ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : notification.type === "error" ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">
                {notification.message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200
                ${notification.type === "success" 
                  ? "hover:bg-green-100 text-green-600" 
                  : notification.type === "error" 
                  ? "hover:bg-red-100 text-red-600" 
                  : "hover:bg-blue-100 text-blue-600"}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}