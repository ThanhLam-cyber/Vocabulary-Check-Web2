import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Search, Filter, Trash2, Edit, Plus, BookOpen, Save, X } from "lucide-react"
import { collection, getDocs, deleteDoc, doc, updateDoc, orderBy, query } from "firebase/firestore"
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
      
      // Update local state immediately instead of refetching
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl sm:blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-rose-200/30 to-orange-200/30 rounded-full blur-2xl sm:blur-3xl"></div>
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
              <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg flex-shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 relative z-10 header-text-container">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate">
                  Danh Sách Từ Vựng
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm truncate">
                  Tổng cộng: {vocabList.length} từ
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={testFirebaseConnection}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl text-xs"
            >
              <span className="text-xs font-semibold">Test Firebase</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Thêm từ mới</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm từ vựng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-gray-800 placeholder-gray-400"
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-gray-800 appearance-none"
              >
                <option value="all">Tất cả</option>
                <option value="english">Tiếng Anh</option>
                <option value="vietnamese">Tiếng Việt</option>
              </select>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={fetchVocabList}
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
            >
              Làm mới
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {/* Vocabulary List */}
        {!loading && (
          <div className="space-y-4">
            {filteredVocabList.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchTerm ? "Không tìm thấy từ vựng" : "Chưa có từ vựng nào"}
                </h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm ? "Thử tìm kiếm với từ khóa khác" : "Hãy thêm từ vựng đầu tiên"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate("/")}
                    className="mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-semibold"
                  >
                    Thêm từ vựng
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredVocabList.map((vocab, index) => (
                  <div
                    key={vocab._id || index}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        {editingId === vocab._id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            {/* English Input */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">EN</span>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={editingVocab.english}
                                  onChange={(e) => handleEditChange('english', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-300 bg-white/70 text-gray-800 text-sm"
                                  placeholder="Nhập từ tiếng Anh..."
                                />
                              </div>
                            </div>

                            {/* Vietnamese Input */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">VI</span>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={editingVocab.vietnamese}
                                  onChange={(e) => handleEditChange('vietnamese', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition-all duration-300 bg-white/70 text-gray-800 text-sm"
                                  placeholder="Nhập từ tiếng Việt..."
                                />
                              </div>
                            </div>

                            {/* Example Input */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">💡</span>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={editingVocab.example}
                                  onChange={(e) => handleEditChange('example', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all duration-300 bg-white/70 text-gray-800 text-sm"
                                  placeholder="Nhập ví dụ (không bắt buộc)..."
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            {/* English */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">EN</span>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                                  {vocab.english}
                                </h3>
                              </div>
                            </div>

                            {/* Vietnamese */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">VI</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-700 text-sm sm:text-base">
                                  {vocab.vietnamese}
                                </h4>
                              </div>
                            </div>

                            {/* Example */}
                            {vocab.example && (
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs">💡</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-600 text-sm italic">
                                    "{vocab.example}"
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        {editingId === vocab._id ? (
                          // Edit Mode Actions
                          <>
                            <button
                              onClick={() => updateVocab(vocab._id)}
                              className="p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-300 hover:scale-105"
                              title="Lưu thay đổi"
                            >
                              <Save className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-105"
                              title="Hủy chỉnh sửa"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          </>
                        ) : (
                          // View Mode Actions
                          <>
                            <button
                              onClick={() => startEdit(vocab)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-300 hover:scale-105"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                                                         <button
                               onClick={() => showDeleteConfirmation(vocab)}
                               className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-300 hover:scale-105"
                               title="Xóa"
                             >
                               <Trash2 className="w-4 h-4 text-red-600" />
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
          className="fixed bottom-6 right-6 sm:hidden bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <Plus className="w-6 h-6" />
        </button>
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

       {/* Delete Confirmation Modal */}
       {showDeleteModal && deleteTarget && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
             {/* Header */}
             <div className="flex items-center gap-3 p-6 border-b border-gray-100">
               <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                 <Trash2 className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-gray-800">Xác nhận xóa</h3>
                 <p className="text-sm text-gray-600">Bạn có chắc muốn xóa từ vựng này?</p>
               </div>
             </div>

             {/* Content */}
             <div className="p-6">
               <div className="bg-gray-50 rounded-xl p-4 mb-4">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                     <span className="text-white text-xs font-bold">EN</span>
                   </div>
                   <div className="flex-1">
                     <h4 className="font-semibold text-gray-800 text-sm">
                       {deleteTarget.english}
                     </h4>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 mt-2">
                   <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                     <span className="text-white text-xs font-bold">VI</span>
                   </div>
                   <div className="flex-1">
                     <h4 className="font-medium text-gray-700 text-sm">
                       {deleteTarget.vietnamese}
                     </h4>
                   </div>
                 </div>
                 {deleteTarget.example && (
                   <div className="flex items-center gap-3 mt-2">
                     <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-white text-xs">💡</span>
                     </div>
                     <div className="flex-1">
                       <p className="text-gray-600 text-sm italic">
                         "{deleteTarget.example}"
                       </p>
                     </div>
                   </div>
                 )}
               </div>
               <p className="text-sm text-gray-600 mb-6">
                 Hành động này không thể hoàn tác. Từ vựng sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu.
               </p>
             </div>

             {/* Actions */}
             <div className="flex gap-3 p-6 border-t border-gray-100">
               <button
                 onClick={cancelDelete}
                 className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
               >
                 Hủy bỏ
               </button>
               <button
                 onClick={() => deleteVocab(deleteTarget._id)}
                 className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
               >
                 Xóa từ vựng
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
