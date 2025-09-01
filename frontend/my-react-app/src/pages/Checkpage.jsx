import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Play, Trophy, BookOpen, Mic, MicOff, Volume2, RefreshCw, Lightbulb, Star } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config.js"
import API_ENDPOINTS from "../config/api.js"

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

              const response = await fetch(API_ENDPOINTS.realtimeTranscribe, {
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

      mediaRecorderRef.current.start(500)
      setRecording(true)
      setMicrophonePermission('granted')
      setNotification({ type: "success", message: "Bắt đầu ghi âm phát âm..." })

      if (useNativeASR) {
        try {
          const recognition = new SpeechRecognitionCtor()
          recognition.interimResults = true
          recognition.continuous = true
          recognition.lang = 'en-US'

          setIsTranscribing(true)

          recognition.onresult = (event) => {
            let interim = ''
            let finals = ''
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
      
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current)
        transcriptionIntervalRef.current = null
      }

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

      const response = await fetch(API_ENDPOINTS.pronunciationAssess, {
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
      
      const response = await fetch(API_ENDPOINTS.generatePracticeSentence, {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-200/20 to-indigo-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-purple-200/20 to-pink-300/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10">
        {/* Modern Header */}
        <div className="bg-white/70 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/")}
                  className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700 group-hover:text-indigo-600 transition-colors" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      Kiểm tra từ vựng
                    </h1>
                    <p className="text-sm text-gray-500">
                      {quizStarted ? `Điểm: ${score}/${totalQuestions}` : `${vocabList.length} từ có sẵn`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Score Display */}
              {quizStarted && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-full shadow-lg">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span className="font-bold">{score}/{totalQuestions}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 border-b-purple-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Đang tải từ vựng...</p>
            </div>
          )}

          {/* Main Content */}
          {!loading && (
            <div className="space-y-8">
              {/* Start Quiz Section */}
              {!quizStarted && (
                <div className="text-center">
                  {/* Hero Section */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-gray-200/50 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                      <BookOpen className="w-12 h-12 text-white" />
                    </div>
                    
                    <h2 className="text-4xl font-bold text-gray-800 mb-4">
                      Sẵn sàng thử thách?
                    </h2>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                      Kiểm tra trình độ từ vựng với {vocabList.length} từ được tuyển chọn
                    </p>

                    <button
                      onClick={startQuiz}
                      disabled={vocabList.length === 0}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Play className="w-6 h-6 inline mr-3" />
                      Bắt đầu ngay
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-gray-800 mb-2">{vocabList.length}</div>
                      <div className="text-gray-600 font-medium">Từ vựng</div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-gray-800 mb-2">∞</div>
                      <div className="text-gray-600 font-medium">Câu hỏi</div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Volume2 className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-gray-800 mb-2">AI</div>
                      <div className="text-gray-600 font-medium">Phân tích phát âm</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quiz Section */}
              {quizStarted && currentQuestion && (
                <div className="space-y-8">
                  {/* Question Card */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-200/50">
                    {/* Question Header */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold">{totalQuestions + 1}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-indigo-600 mb-1">Câu hỏi #{totalQuestions + 1}</div>
                          <div className="text-xs text-gray-500">Tiếng Việt → Tiếng Anh</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-800">{score}/{totalQuestions}</div>
                        <div className="text-xs text-gray-500">Điểm hiện tại</div>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-center space-y-8">
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dịch sang tiếng Anh</div>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                          <h3 className="text-3xl font-bold text-gray-800 mb-4">
                            {currentQuestion.question}
                          </h3>
                          {currentQuestion.hint && (
                            <div className="bg-white/70 rounded-xl p-4 inline-block">
                              <div className="flex items-center gap-2 text-amber-700">
                                <Lightbulb className="w-4 h-4" />
                                <span className="text-sm font-medium">{currentQuestion.hint}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Answer Input */}
                      <div className="max-w-lg mx-auto space-y-4">
                        <input
                          type="text"
                          placeholder="Nhập câu trả lời của bạn..."
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !showResult && checkAnswer()}
                          disabled={showResult}
                          className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-400 disabled:opacity-50 text-lg font-medium"
                        />
                        
                        {!showResult && (
                          <button
                            onClick={checkAnswer}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            Kiểm tra đáp án
                          </button>
                        )}
                      </div>

                      {/* Result Display */}
                      {showResult && (
                        <div className="space-y-6">
                          <div className={`p-6 rounded-2xl border-2 ${
                            isCorrect 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-center gap-3 mb-4">
                              {isCorrect ? (
                                <CheckCircle className="w-8 h-8 text-green-600" />
                              ) : (
                                <XCircle className="w-8 h-8 text-red-600" />
                              )}
                              <span className={`font-bold text-xl ${
                                isCorrect ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {isCorrect ? 'Chính xác!' : 'Chưa đúng!'}
                              </span>
                            </div>
                            
                            {!isCorrect && (
                              <div className="bg-white/80 rounded-xl p-4">
                                <div className="text-gray-700 mb-2">
                                  <span className="font-semibold text-red-700">Đáp án của bạn:</span> "{userAnswer}"
                                </div>
                                <div className="text-gray-700">
                                  <span className="font-semibold text-green-700">Đáp án đúng:</span> "{currentQuestion.answer}"
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={nextQuestion}
                            className="w-full max-w-md mx-auto block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            Câu tiếp theo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pronunciation Practice Section */}
                  {showResult && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-200/50">
                      <div className="text-center space-y-6">
                        {/* Section Header */}
                        <div className="flex items-center justify-center gap-3 mb-8">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                            <Mic className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Luyện phát âm</h3>
                        </div>

                        {/* Word to Practice */}
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
                          <div className="text-sm font-medium text-blue-600 mb-2">Luyện phát âm từ:</div>
                          <div className="text-3xl font-bold text-gray-800 mb-4">"{currentQuestion.answer}"</div>
                        </div>

                        {/* Practice Sentence Generator */}
                        <button
                          onClick={() => generatePracticeSentence(currentQuestion.answer)}
                          disabled={isGeneratingSentence}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                        >
                          {isGeneratingSentence ? (
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Đang tạo câu mẫu...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Lightbulb className="w-5 h-5" />
                              <span>Tạo câu mẫu luyện tập</span>
                            </div>
                          )}
                        </button>

                        {/* Spacer to increase distance between buttons */}
                        <div className="h-8"></div>

                        {/* Practice Sentence Display */}
                        {practiceSentence && (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-4">
                              <BookOpen className="w-5 h-5 text-emerald-600" />
                              <span className="font-bold text-emerald-700">Câu mẫu luyện tập</span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-4 mb-4">
                              <p className="text-gray-800 text-lg italic font-medium">
                                "{practiceSentence}"
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3 justify-center">
                              <button
                                onClick={() => {
                                  if ('speechSynthesis' in window) {
                                    const utterance = new SpeechSynthesisUtterance(practiceSentence);
                                    utterance.lang = 'en-US';
                                    utterance.rate = 0.8;
                                    speechSynthesis.speak(utterance);
                                  }
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
                              >
                                <Volume2 className="w-4 h-4 inline mr-2" />
                                Nghe phát âm
                              </button>
                              <button
                                onClick={() => generatePracticeSentence(currentQuestion.answer)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
                              >
                                <RefreshCw className="w-4 h-4 inline mr-2" />
                                Tạo câu khác
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Real-time Recording Display */}
                        {(recording || realTimeText) && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                            <div className="flex items-center justify-center gap-3 mb-4">
                              {recording ? (
                                <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                                  <div className="w-3 h-3 bg-white rounded-full"></div>
                                </div>
                              ) : (
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <span className="font-bold text-gray-800">
                                {recording ? 'Đang ghi âm...' : 'Kết quả ghi âm'}
                              </span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-4">
                              {realTimeText ? (
                                <p className="text-gray-800 font-semibold text-lg">
                                  "{realTimeText}"
                                </p>
                              ) : (
                                <p className="text-gray-500 italic">
                                  {recording ? 'Hãy bắt đầu nói...' : 'Chưa có nội dung'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Microphone Permission Error */}
                        {microphonePermission === 'denied' && (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                            <div className="flex items-center gap-3 text-red-700 mb-4">
                              <MicOff className="w-6 h-6" />
                              <span className="font-bold text-lg">Quyền microphone bị từ chối</span>
                            </div>
                            <p className="text-red-600 mb-4">
                              Vui lòng cấp quyền microphone trong cài đặt trình duyệt để sử dụng tính năng ghi âm.
                            </p>
                            <button
                              onClick={retryMicrophonePermission}
                              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
                            >
                              Thử lại
                            </button>
                          </div>
                        )}

                        {/* Recording Button */}
                        <button
                          onClick={recording ? stopRecording : startRecording}
                          disabled={microphonePermission === 'denied'}
                          className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 ${
                            recording 
                              ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white" 
                              : microphonePermission === 'denied'
                              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                          }`}
                        >
                          {recording ? (
                            <div className="flex items-center gap-3">
                              <MicOff className="w-6 h-6" />
                              <span>Dừng ghi âm</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Mic className="w-6 h-6" />
                              <span>{microphonePermission === 'denied' ? 'Không có quyền' : 'Bắt đầu ghi âm'}</span>
                            </div>
                          )}
                        </button>

                        {/* Pronunciation Analysis */}
                        {(isAnalyzing || pronunciationFeedback) && (
                          <div className="space-y-6">
                            {isAnalyzing ? (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                                <div className="flex items-center justify-center gap-3">
                                  <div className="w-8 h-8 border-4 border-yellow-300 border-t-yellow-600 rounded-full animate-spin"></div>
                                  <span className="text-yellow-700 font-bold text-lg">Đang phân tích phát âm...</span>
                                </div>
                              </div>
                            ) : pronunciationFeedback && (
                              <div className={`rounded-2xl p-6 border-2 ${
                                pronunciationFeedback.score >= 80 
                                  ? 'bg-green-50 border-green-200' 
                                  : pronunciationFeedback.score >= 60 
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-3">
                                    {pronunciationFeedback.score >= 80 ? (
                                      <CheckCircle className="w-8 h-8 text-green-600" />
                                    ) : pronunciationFeedback.score >= 60 ? (
                                      <div className="w-8 h-8 border-3 border-yellow-600 rounded-full flex items-center justify-center">
                                        <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                                      </div>
                                    ) : (
                                      <XCircle className="w-8 h-8 text-red-600" />
                                    )}
                                    <span className={`font-bold text-xl ${
                                      pronunciationFeedback.score >= 80 
                                        ? 'text-green-700' 
                                        : pronunciationFeedback.score >= 60 
                                        ? 'text-yellow-700'
                                        : 'text-red-700'
                                    }`}>
                                      Kết quả phân tích
                                    </span>
                                  </div>
                                  {pronunciationFeedback.score !== null && (
                                    <div className={`px-4 py-2 rounded-full font-bold text-lg ${
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
                                
                                <div className="bg-white/80 rounded-xl p-6 mb-6">
                                  <p className={`font-bold text-lg ${
                                    pronunciationFeedback.score >= 80 
                                      ? 'text-green-700' 
                                      : pronunciationFeedback.score >= 60 
                                      ? 'text-yellow-700'
                                      : 'text-red-700'
                                  }`}>
                                    {pronunciationFeedback.feedback}
                                  </p>
                                </div>

                                {/* Word Analysis */}
                                {pronunciationFeedback.wordAnalysis && (
                                  <div className="space-y-4">
                                    {pronunciationFeedback.wordAnalysis.strongWords && pronunciationFeedback.wordAnalysis.strongWords.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3">
                                          <CheckCircle className="w-5 h-5 text-green-600" />
                                          <span className="font-bold text-green-700">Phát âm tốt</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {pronunciationFeedback.wordAnalysis.strongWords.map((word, index) => (
                                            <span key={index} className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold">
                                              {word.text} ({word.confidence}%)
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pronunciationFeedback.wordAnalysis.weakWords && pronunciationFeedback.wordAnalysis.weakWords.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3">
                                          <XCircle className="w-5 h-5 text-red-600" />
                                          <span className="font-bold text-red-700">Cần cải thiện</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {pronunciationFeedback.wordAnalysis.weakWords.map((word, index) => (
                                            <span key={index} className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold">
                                              {word.text} ({word.confidence}%)
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Improvement Suggestions */}
                                {pronunciationFeedback.improvementSuggestions && pronunciationFeedback.improvementSuggestions.length > 0 && (
                                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <div className="flex items-center gap-2 mb-4">
                                      <Lightbulb className="w-5 h-5 text-blue-600" />
                                      <span className="font-bold text-blue-700">Gợi ý cải thiện</span>
                                    </div>
                                    <div className="space-y-3">
                                      {pronunciationFeedback.improvementSuggestions.map((suggestion, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                          <p className="text-blue-700 font-medium">{suggestion}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz Controls */}
              {quizStarted && (
                <div className="flex justify-center">
                  <button
                    onClick={resetQuiz}
                    className="flex items-center gap-3 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Làm lại từ đầu</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modern Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 max-w-sm">
          <div className={`flex items-center gap-4 p-6 rounded-2xl shadow-2xl backdrop-blur-xl border transform transition-all duration-500 ease-out ${
            notification.type === "success" 
              ? "bg-green-50/90 border-green-200 text-green-700" 
              : notification.type === "error" 
              ? "bg-red-50/90 border-red-200 text-red-700" 
              : "bg-blue-50/90 border-blue-200 text-blue-700"
          }`}>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              notification.type === "success" 
                ? "bg-green-100 text-green-600" 
                : notification.type === "error" 
                ? "bg-red-100 text-red-600" 
                : "bg-blue-100 text-blue-600"
            }`}>
              {notification.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : notification.type === "error" ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm leading-6">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/50`}
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}