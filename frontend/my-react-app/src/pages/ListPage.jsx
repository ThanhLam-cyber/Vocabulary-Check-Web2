import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Search, Filter, Trash2, Edit, Plus, BookOpen, Save, X, Sparkles, RefreshCw } from "lucide-react"
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config.js"

export default function ListPage() {
  const [vocabList, setVocabList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [notification, setNotification] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingVocab, setEditingVocab] = useState({
    english: "",
    vietnamese: "",
    example: ""
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const navigate = useNavigate()

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
      setNotification({ type: "success", message: `Đã tải ${vocabData.length} từ vựng từ Firebase` })
    } catch (error) {
      console.error("Lỗi fetch từ Firebase:", error)
      setNotification({ 
        type: "error", 
        message: `Không thể tải danh sách từ vựng: ${error.message}` 
      })
    } finally {
      setLoading(false)
    }
  }

  // Show delete confirmation modal
  const showDeleteConfirmation = (vocab) => {
    setDeleteTarget(vocab)
    setShowDeleteModal(true)
  }

  // Delete vocabulary from Firebase
  const deleteVocab = async (id) => {
    try {
      const vocabDocRef = doc(db, "vocabulary", id)
      await deleteDoc(vocabDocRef)
      setNotification({ type: "success", message: "Xóa từ vựng thành công!" })
      
      setVocabList(prev => prev.filter(vocab => vocab._id !== id))
      
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error("Lỗi delete từ Firebase:", error)
      setNotification({ 
        type: "error", 
        message: `Có lỗi xảy ra khi xóa từ vựng: ${error.message}` 
      })
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  // Start editing vocabulary
  const startEdit = (vocab) => {
    setEditingId(vocab._id)
    setEditingVocab({
      english: vocab.english || "",
      vietnamese: vocab.vietnamese || "",
      example: vocab.example || ""
    })
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditingVocab({
      english: "",
      vietnamese: "",
      example: ""
    })
  }

  // Update vocabulary in Firebase
  const updateVocab = async (id) => {
    try {
      if (!editingVocab.english.trim() || !editingVocab.vietnamese.trim()) {
        setNotification({ 
          type: "error", 
          message: "Vui lòng nhập đầy đủ từ tiếng Anh và tiếng Việt!" 
        })
        return
      }

      const vocabDocRef = doc(db, "vocabulary", id)
      const updateData = {
        english: editingVocab.english.trim(),
        vietnamese: editingVocab.vietnamese.trim(),
        example: editingVocab.example.trim(),
        updatedAt: new Date()
      }

      await updateDoc(vocabDocRef, updateData)
      setNotification({ type: "success", message: "Cập nhật từ vựng thành công!" })
      
      setEditingId(null)
      setEditingVocab({
        english: "",
        vietnamese: "",
        example: ""
      })
      
      fetchVocabList()
    } catch (error) {
      console.error("Lỗi update từ Firebase:", error)
      setNotification({ 
        type: "error", 
        message: `Có lỗi xảy ra khi cập nhật từ vựng: ${error.message}` 
      })
    }
  }

  // Handle editing input changes
  const handleEditChange = (field, value) => {
    setEditingVocab(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Filter and search vocabulary
  const filteredVocabList = vocabList.filter((vocab) => {
    if (!vocab || !vocab.english || !vocab.vietnamese) return false;
    
    const matchesSearch = 
      vocab.english?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vocab.vietnamese?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vocab.example?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterType === "english") {
      return vocab.english?.toLowerCase().includes(searchTerm.toLowerCase())
    } else if (filterType === "vietnamese") {
      return vocab.vietnamese?.toLowerCase().includes(searchTerm.toLowerCase())
    }
    
    return matchesSearch
  })

  useEffect(() => {
    fetchVocabList()
  }, [])

  // Test Firebase connection
  const testFirebaseConnection = async () => {
    try {
      const testCollectionRef = collection(db, "vocabulary")
      const testSnapshot = await getDocs(testCollectionRef)
      setNotification({ 
        type: "success", 
        message: `Kết nối Firebase thành công! Có ${testSnapshot.size} từ vựng trong database.` 
      })
    } catch (error) {
      console.error("Firebase connection test failed:", error)
      setNotification({ 
        type: "error", 
        message: `Lỗi kết nối Firebase: ${error.message}` 
      })
    }
  }

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-violet-300/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-fuchsia-300/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-cyan-300/10 to-blue-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="group relative p-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-110 border border-white/50"
              >
                <ArrowLeft className="w-6 h-6 text-violet-600 group-hover:-translate-x-1 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur-lg opacity-70 animate-pulse"></div>
                  <div className="relative p-3 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl shadow-xl">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                    Danh Sách Từ Vựng
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <p className="text-sm font-semibold text-violet-600">
                      {vocabList.length} từ vựng
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={testFirebaseConnection}
                className="group relative px-4 py-2.5 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Test Firebase
                </span>
              </button>
              
              <button
                onClick={() => navigate("/")}
                className="group relative px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  <span className="font-bold text-sm">Thêm từ mới</span>
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-violet-400 group-focus-within:text-violet-600 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ vựng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 border-2 border-violet-200/50 rounded-2xl focus:ring-4 focus:ring-violet-200 focus:border-violet-400 transition-all duration-300 text-gray-800 placeholder-violet-400 font-medium"
                />
              </div>
              
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-12 pr-10 py-4 bg-gradient-to-r from-purple-50/50 to-fuchsia-50/50 border-2 border-purple-200/50 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all duration-300 text-gray-800 font-medium appearance-none cursor-pointer"
                >
                  <option value="all">Tất cả</option>
                  <option value="english">Tiếng Anh</option>
                  <option value="vietnamese">Tiếng Việt</option>
                </select>
              </div>
              
              <button
                onClick={fetchVocabList}
                className="group relative px-6 py-4 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="font-bold text-sm">Làm mới</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-fuchsia-600 rounded-full animate-spin animation-delay-150"></div>
            </div>
            <p className="mt-6 text-violet-600 font-semibold animate-pulse">Đang tải từ vựng...</p>
          </div>
        )}

        {/* Vocabulary List */}
        {!loading && (
          <div className="space-y-5">
            {filteredVocabList.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-400/30 to-fuchsia-400/30 rounded-full blur-2xl"></div>
                  <BookOpen className="relative w-24 h-24 text-violet-300 mx-auto mb-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-3">
                  {searchTerm ? "Không tìm thấy từ vựng" : "Chưa có từ vựng nào"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? "Thử tìm kiếm với từ khóa khác" : "Hãy thêm từ vựng đầu tiên của bạn"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate("/")}
                    className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative font-bold">Thêm từ vựng ngay</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredVocabList.map((vocab, index) => (
                  <div
                    key={vocab._id || index}
                    className="group relative bg-white/70 backdrop-blur-2xl rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/60 hover:scale-[1.02] overflow-hidden"
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                    
                    <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
                      {/* Content */}
                      <div className="flex-1 space-y-4">
                        {editingId === vocab._id ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-white text-sm font-black">EN</span>
                              </div>
                              <input
                                type="text"
                                value={editingVocab.english}
                                onChange={(e) => handleEditChange('english', e.target.value)}
                                className="flex-1 px-4 py-3 bg-emerald-50/70 border-2 border-emerald-300 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 transition-all duration-300 text-gray-800 font-medium"
                                placeholder="Nhập từ tiếng Anh..."
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-white text-sm font-black">VI</span>
                              </div>
                              <input
                                type="text"
                                value={editingVocab.vietnamese}
                                onChange={(e) => handleEditChange('vietnamese', e.target.value)}
                                className="flex-1 px-4 py-3 bg-blue-50/70 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 text-gray-800 font-medium"
                                placeholder="Nhập từ tiếng Việt..."
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-white text-lg">💡</span>
                              </div>
                              <input
                                type="text"
                                value={editingVocab.example}
                                onChange={(e) => handleEditChange('example', e.target.value)}
                                className="flex-1 px-4 py-3 bg-amber-50/70 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 transition-all duration-300 text-gray-800 font-medium"
                                placeholder="Nhập ví dụ (không bắt buộc)..."
                              />
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>

                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl blur-md opacity-50"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                                  <span className="text-white text-sm font-black">VI</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-base sm:text-lg font-bold text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                                  {vocab.vietnamese}
                                </h4>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-2xl blur-md opacity-50"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl">
                                  <span className="text-white text-sm font-black">EN</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg sm:text-xl font-black text-gray-800 group-hover:text-emerald-600 transition-colors duration-300">
                                  {vocab.english}
                                </h3>
                              </div>
                            </div>

                        

                            {vocab.example && (
                              <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50/70 to-orange-50/70 rounded-2xl p-4 border border-amber-200/50">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-red-500 rounded-2xl blur-md opacity-50"></div>
                                  <div className="relative w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl">
                                    <span className="text-white text-xl">💡</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-700 font-medium italic leading-relaxed">
                                    "{vocab.example}"
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col items-center gap-3">
                        {editingId === vocab._id ? (
                          <>
                            <button
                              onClick={() => updateVocab(vocab._id)}
                              className="group relative p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 overflow-hidden"
                              title="Lưu thay đổi"
                            >
                              <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-2xl"></div>
                              <Save className="relative w-5 h-5 text-white" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="group relative p-3 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 overflow-hidden"
                              title="Hủy chỉnh sửa"
                            >
                              <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-2xl"></div>
                              <X className="relative w-5 h-5 text-white" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(vocab)}
                              className="group relative p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 overflow-hidden"
                              title="Chỉnh sửa"
                            >
                              <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-2xl"></div>
                              <Edit className="relative w-5 h-5 text-white" />
                            </button>
                            <button
                              onClick={() => showDeleteConfirmation(vocab)}
                              className="group relative p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 overflow-hidden"
                              title="Xóa"
                            >
                              <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-2xl"></div>
                              <Trash2 className="relative w-5 h-5 text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Floating Add Button for Mobile */}
        <button
          onClick={() => navigate("/")}
          className="fixed bottom-8 right-8 sm:hidden group relative p-5 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50"
        >
          <div className="absolute inset-0 bg-white/30 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
          <Plus className="relative w-7 h-7" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 blur-xl opacity-60 animate-pulse"></div>
        </button>
      </div>

      {/* Enhanced Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-slideInRight">
          <div
            className={`relative flex items-center gap-4 p-5 rounded-2xl shadow-2xl backdrop-blur-xl border-2 transform transition-all duration-500
              ${notification.type === "success" 
                ? "bg-white/95 border-emerald-300 shadow-emerald-200" 
                : notification.type === "error" 
                ? "bg-white/95 border-red-300 shadow-red-200" 
                : "bg-white/95 border-blue-300 shadow-blue-200"}`}
          >
            {/* Animated Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg
              ${notification.type === "success" 
                ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                : notification.type === "error" 
                ? "bg-gradient-to-br from-red-500 to-rose-600" 
                : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}
            >
              {notification.type === "success" ? (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : notification.type === "error" ? (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold leading-6
                ${notification.type === "success" 
                  ? "text-emerald-800" 
                  : notification.type === "error" 
                  ? "text-red-800" 
                  : "text-blue-800"}`}
              >
                {notification.message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110
                ${notification.type === "success" 
                  ? "hover:bg-emerald-100 text-emerald-700" 
                  : notification.type === "error" 
                  ? "hover:bg-red-100 text-red-700" 
                  : "hover:bg-blue-100 text-blue-700"}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full transform transition-all duration-500 scale-100 animate-slideInUp">
            {/* Header */}
            <div className="relative overflow-hidden rounded-t-3xl">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 opacity-10"></div>
              <div className="relative flex items-center gap-4 p-6 border-b border-gray-100">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Trash2 className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800">Xác nhận xóa</h3>
                  <p className="text-sm text-gray-600 mt-1">Bạn có chắc muốn xóa từ vựng này?</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-5 space-y-3 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white text-sm font-black">EN</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">
                      {deleteTarget.english}
                    </h4>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white text-sm font-black">VI</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-700">
                      {deleteTarget.vietnamese}
                    </h4>
                  </div>
                </div>
                
                {deleteTarget.example && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-white text-lg">💡</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm italic">
                        "{deleteTarget.example}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-semibold">
                  ⚠️ Hành động này không thể hoàn tác. Từ vựng sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={cancelDelete}
                className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-md"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => deleteVocab(deleteTarget._id)}
                className="group relative flex-1 px-6 py-4 bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative">Xóa từ vựng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}