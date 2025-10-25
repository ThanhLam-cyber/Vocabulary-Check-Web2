import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, CheckCircle, List, Languages, Lightbulb } from "lucide-react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "./firebase/config.js"

export default function App() {
  const [vocabulary, setVocabulary] = useState({
    vietnamese: "",
    english: "",
    example: "",
  })
  const [vocabList, setVocabList] = useState([])
  const [lastEdited, setLastEdited] = useState(null) // "en" hoặc "vi"

  const [notification, setNotification] = useState(null)
  const navigate = useNavigate()

  // Hàm viết hoa chữ cái đầu
  const capitalizeFirstLetter = (str) => {
    if (!str) return ""
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Hàm dịch tự động
  const translateText = async (text) => {
    if (!text.trim()) {
      setVocabulary((prev) => ({ ...prev, vietnamese: "" }))
      return
    }
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`)
      const data = await res.json()
      const translated = data?.responseData?.translatedText || ""
      setVocabulary((prev) => ({
        ...prev,
        vietnamese: capitalizeFirstLetter(translated),
      }))
    } catch (error) {
      console.error("Lỗi dịch:", error)
    }
  }
  const translateTextReverse = async (text) => {
  if (!text.trim()) {
    setVocabulary((prev) => ({ ...prev, english: "" }))
    return
  }
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|en`
    )
    const data = await res.json()
    const translated = data?.responseData?.translatedText || ""
    setVocabulary((prev) => ({
      ...prev,
      english: capitalizeFirstLetter(translated),
    }))
  } catch (error) {
    console.error("Lỗi dịch ngược:", error)
  }
}


// Khi sửa tiếng Anh thì chỉ dịch sang Việt nếu lastEdited == "en"
useEffect(() => {
  if (lastEdited === "en") {
    const delay = setTimeout(() => {
      translateText(vocabulary.english)
    }, 350)
    return () => clearTimeout(delay)
  }
}, [vocabulary.english, lastEdited])

// Khi sửa tiếng Việt thì chỉ dịch sang Anh nếu lastEdited == "vi"
useEffect(() => {
  if (lastEdited === "vi") {
    const delay = setTimeout(() => {
      translateTextReverse(vocabulary.vietnamese)
    }, 350)
    return () => clearTimeout(delay)
  }
}, [vocabulary.vietnamese, lastEdited])



 const handleChange = (e) => {
  const { name, value } = e.target

  setLastEdited(name === "english" ? "en" : name === "vietnamese" ? "vi" : lastEdited)

  let newValue = value
  if (name === "vietnamese") newValue = capitalizeFirstLetter(newValue)

  setVocabulary((prev) => ({ ...prev, [name]: newValue }))
}


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!vocabulary.english.trim() || !vocabulary.vietnamese.trim()) {
      setNotification({ 
        type: "error", 
        message: "Vui lòng nhập đầy đủ từ tiếng Anh và tiếng Việt!" 
      })
      return
    }

    try {
      // Thêm vào Firebase thay vì backend
      const docRef = await addDoc(collection(db, "vocabulary"), {
        vietnamese: vocabulary.vietnamese.trim(),
        english: vocabulary.english.trim(),
        example: vocabulary.example.trim(),
        createdAt: new Date()
      })
      
      console.log("Thành công:", docRef.id)
      setVocabList((prev) => [...prev, { ...vocabulary, id: docRef.id }])
      setNotification({ type: "success", message: "Thêm từ vựng thành công!" })
      
      // Reset form
      setVocabulary({ vietnamese: "", english: "", example: "" })
    } catch (error) {
      console.error("Lỗi submit:", error)
      setNotification({ type: "error", message: "Có lỗi xảy ra khi thêm từ vựng." })
    }
  }

  // Tự động ẩn notification sau 5 giây
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 sm:p-4 md:p-6 lg:p-8 relative z-10">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl sm:blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-rose-200/30 to-orange-200/30 rounded-full blur-2xl sm:blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-96 sm:h-96 bg-gradient-to-r from-violet-100/20 to-cyan-100/20 rounded-full blur-2xl sm:blur-3xl"></div>
      </div>

      <div className="form-container bg-white/90 backdrop-blur-sm p-5 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl border border-white/30 transition-all duration-500 hover:shadow-3xl hover:scale-[1.01] z-[9998]">
        {/* Header with icon */}
        <div className="header-container text-center mb-4 sm:mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl md:rounded-2xl mb-3 sm:mb-3 md:mb-4 shadow-lg">
            <Languages className="w-6 h-6 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div className="header-text-container">
            <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 mb-2 sm:mb-2 md:mb-3">
              Thêm Từ Vựng
            </h1>
            <p className="text-gray-600 text-sm sm:text-sm md:text-base">Học từ vựng một cách thông minh</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-content space-y-4 sm:space-y-4 md:space-y-6">
          {/* Form fields - Responsive grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">

            {/* Ô tiếng Việt */}
            <div className="group md:col-span-1">
              <label className="block text-sm sm:text-sm md:text-base font-semibold text-gray-700 mb-2 sm:mb-2 md:mb-3 flex items-center gap-2 sm:gap-2">
                <span className="text-sm sm:text-base md:text-lg flex items-center">🇻🇳</span>
                <span className="truncate">Nghĩa tiếng Việt</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="vietnamese"
                  value={vocabulary.vietnamese}
                  onChange={handleChange}
                  placeholder="Kết quả dịch sẽ hiện ở đây"
                  className="w-full p-3 sm:p-3 md:p-4 pl-10 sm:pl-10 md:pl-12 text-sm sm:text-sm md:text-base border-2 border-gray-200 rounded-xl sm:rounded-xl md:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-teal-100 focus:border-teal-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-gray-800 placeholder-gray-400 group-hover:border-gray-300"
                />
                <div className="absolute left-3 sm:left-3 md:left-4 top-1/4 transform -translate-y-1/2 w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] sm:text-xs md:text-sm font-bold flex items-center">VI</span>
                </div>
              </div>
            </div>

            {/* Ô tiếng Anh */}
            <div className="group md:col-span-1">
              <label className="block text-sm sm:text-sm md:text-base font-semibold text-gray-700 mb-2 sm:mb-2 md:mb-3 flex items-center gap-2 sm:gap-2">
                <span className="text-sm sm:text-base md:text-lg flex items-center">🇬🇧</span>
                <span className="truncate">Nghĩa tiếng Anh</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="english"
                  value={vocabulary.english}
                  onChange={handleChange}
                  placeholder="Nhập nghĩa tiếng Anh"
                  className="w-full p-3 sm:p-3 md:p-4 pl-10 sm:pl-10 md:pl-12 text-sm sm:text-sm md:text-base border-2 border-gray-200 rounded-xl sm:rounded-xl md:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-gray-800 placeholder-gray-400 group-hover:border-gray-300"
                />
                <div className="absolute left-3 sm:left-3 md:left-4 top-1/4 transform -translate-y-1/2 w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] sm:text-xs md:text-sm font-bold flex items-center">EN</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ví dụ - Full width */}
          <div className="group">
            <label className="block text-sm sm:text-sm md:text-base font-semibold text-gray-700 mb-2 sm:mb-2 md:mb-3 flex items-center gap-2 sm:gap-2">
              <Lightbulb className="text-amber-500 w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center" />
              <span className="truncate">Ví dụ (nếu có)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="example"
                value={vocabulary.example}
                onChange={handleChange}
                placeholder="Nhập ví dụ sử dụng từ vựng này trong câu"
                className="w-full p-3 sm:p-3 md:p-4 pl-10 sm:pl-10 md:pl-12 text-sm sm:text-sm md:text-base border-2 border-gray-200 rounded-xl sm:rounded-xl md:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-gray-800 placeholder-gray-400 group-hover:border-gray-300"
              />
              <div className="absolute left-3 sm:left-3 md:left-4 top-1/4 transform -translate-y-1/2 w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Lightbulb className="text-white w-3 h-3 sm:w-3 sm:h-3 md:w-4 md:h-4 flex items-center" />
              </div>
            </div>
          </div>

          {/* Buttons - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 md:gap-4 mt-5 sm:mt-6 md:mt-8">
            <button
              type="submit"
              className="flex-1 sm:min-w-0 group relative overflow-hidden flex items-center justify-center bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 sm:py-3 md:py-4 px-4 sm:px-4 md:px-6 text-sm sm:text-sm md:text-base rounded-xl sm:rounded-xl md:rounded-2xl hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-emerald-200 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 sm:hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Plus className="mr-2 sm:mr-2 md:mr-3 relative z-10 w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span className="relative z-10 truncate">Thêm từ vựng</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/check")}
              className="flex-1 sm:min-w-0 group relative overflow-hidden flex items-center justify-center bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 sm:py-3 md:py-4 px-4 sm:px-4 md:px-6 text-sm sm:text-sm md:text-base rounded-xl sm:rounded-xl md:rounded-2xl hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-200 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 sm:hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CheckCircle className="mr-2 sm:mr-2 md:mr-3 relative z-10 w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span className="relative z-10 truncate">Kiểm tra</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/list")}
              className="flex-1 sm:min-w-0 group relative overflow-hidden flex items-center justify-center bg-gradient-to-r from-violet-500 to-violet-600 text-white py-3 sm:py-3 md:py-4 px-4 sm:px-4 md:px-6 text-sm sm:text-sm md:text-base rounded-xl sm:rounded-xl md:rounded-2xl hover:from-violet-600 hover:to-violet-700 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-violet-200 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 sm:hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <List className="mr-2 sm:mr-2 md:mr-3 relative z-10 w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span className="relative z-10 truncate">Danh sách</span>
            </button>
          </div>
        </form>

        {/* Progress indicator - Enhanced responsive */}
        <div className="form-overlay-protection mt-4 sm:mt-4 md:mt-6 text-center">
          <div className="inline-flex items-center gap-2 sm:gap-2 md:gap-3 text-xs sm:text-xs md:text-sm text-gray-500 bg-gray-50/50 px-3 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="font-medium">
              Từ vựng đã thêm: <span className="text-emerald-600 font-bold">{vocabList.length}</span>
            </span>
          </div>
        </div>

        {/* Additional info - Always visible */}
        <div className="form-overlay-protection mt-3 md:mt-6 text-center">
          <p className="text-gray-400 text-xs md:text-sm">
            💡 Mẹo: Nhập từ tiếng Anh và hệ thống sẽ tự động dịch sang tiếng Việt
          </p>
        </div>
      </div>

      {/* Notification - Improved responsive positioning */}
      {notification && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm">
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