// Performance optimization utilities

// Debounce function để tối ưu hóa API calls
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function để giới hạn số lần gọi function
export function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Lazy load images
export function lazyLoadImage(img) {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.classList.remove('lazy')
          imageObserver.unobserve(img)
        }
      })
    })
    imageObserver.observe(img)
  } else {
    // Fallback for older browsers
    img.src = img.dataset.src
  }
}

// Preload critical resources
export function preloadCriticalResources() {
  const criticalResources = [
    // Add critical resources here
  ]
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    link.as = 'fetch'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

// Memory management
export function cleanupMemory() {
  // Clear unused event listeners
  if (window.gc) {
    window.gc()
  }
  
  // Clear console in production
  if (process.env.NODE_ENV === 'production') {
    console.clear()
  }
}

// Performance monitoring
export function measurePerformance(name, fn) {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${name} took ${end - start} milliseconds`)
  }
  
  return result
}

// Firebase lazy loading (simplified)
export function lazyLoadFirebase() {
  return import('../firebase/config.js').then(module => {
    return {
      auth: module.auth,
      db: module.db,
      app: module.default
    }
  })
}
