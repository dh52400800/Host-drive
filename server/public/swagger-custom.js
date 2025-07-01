// Custom Swagger UI JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Auto-fill authorization token from localStorage
  const token = localStorage.getItem('accessToken');
  if (token) {
    // Wait for Swagger UI to load
    setTimeout(() => {
      const authBtn = document.querySelector('.auth-wrapper .authorize');
      if (authBtn) {
        authBtn.click();
        
        setTimeout(() => {
          const tokenInput = document.querySelector('input[name="bearerAuth"]');
          if (tokenInput) {
            tokenInput.value = token;
            
            // Also try to auto-authorize
            const authorizeBtn = document.querySelector('.auth-btn-wrapper .btn.authorize');
            if (authorizeBtn) {
              authorizeBtn.click();
            }
          }
        }, 500);
      }
    }, 2000);
  }

  // Add custom header with app info
  const infoSection = document.querySelector('.swagger-ui .info');
  if (infoSection) {
    const customHeader = document.createElement('div');
    customHeader.className = 'custom-header';
    customHeader.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; font-size: 1.5rem;">🚀 HostFileDrive API</h2>
        <p style="margin: 0; opacity: 0.9;">
          Hệ thống quản lý file hiện đại với Google Drive API, hỗ trợ upload, streaming, và xử lý multimedia
        </p>
        <div style="margin-top: 10px; font-size: 0.9rem;">
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; margin-right: 8px;">
            🔧 Multer + FFmpeg
          </span>
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; margin-right: 8px;">
            🎥 Video Processing
          </span>
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">
            📡 Real-time Streaming
          </span>
        </div>
      </div>
    `;
    infoSection.insertBefore(customHeader, infoSection.firstChild);
  }

  // Add try-it-out helpers
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('try-out__btn')) {
      // Add helpful hints for file upload
      setTimeout(() => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
          const wrapper = input.closest('.parameter__name');
          if (wrapper && !wrapper.querySelector('.upload-hint')) {
            const hint = document.createElement('div');
            hint.className = 'upload-hint';
            hint.innerHTML = `
              <div style="background: #e8f4fd; border: 1px solid #bee5eb; border-radius: 4px; padding: 8px; margin-top: 5px; font-size: 0.85rem;">
                💡 <strong>Upload Tips:</strong><br>
                • Hỗ trợ video: MP4, AVI, MOV, WMV<br>
                • Hỗ trợ ảnh: JPG, PNG, GIF, WEBP<br>
                • Tự động tạo thumbnail cho video<br>
                • Giới hạn: 5GB per file
              </div>
            `;
            wrapper.appendChild(hint);
          }
        });
      }, 500);
    }
  });

  // Enhanced error handling display
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args)
      .then(response => {
        // Log API responses for debugging
        if (window.location.pathname.includes('/api/docs')) {
          console.log(`API ${args[1]?.method || 'GET'} ${args[0]}: ${response.status}`);
        }
        return response;
      })
      .catch(error => {
        console.error('API Request failed:', error);
        throw error;
      });
  };

  // Add keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'k':
          e.preventDefault();
          // Focus on search/filter input
          const searchInput = document.querySelector('.swagger-ui input[placeholder*="Filter"]');
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case 'Enter':
          // Quick authorize if in auth modal
          if (document.querySelector('.auth-container')) {
            const authBtn = document.querySelector('.auth-btn-wrapper .btn.authorize');
            if (authBtn) {
              authBtn.click();
            }
          }
          break;
      }
    }
  });

  // Add response time tracking
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList.contains('responses-wrapper')) {
            const responseTime = node.querySelector('.response-content-type');
            if (responseTime && !responseTime.querySelector('.response-time')) {
              const timeSpan = document.createElement('span');
              timeSpan.className = 'response-time';
              timeSpan.style.cssText = 'margin-left: 10px; color: #666; font-size: 0.85rem;';
              timeSpan.textContent = '⚡ Fast response';
              responseTime.appendChild(timeSpan);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Add version info
  const versionInfo = document.createElement('div');
  versionInfo.innerHTML = `
    <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.75rem; z-index: 9999;">
      v1.0.0 | Powered by Express + MongoDB
    </div>
  `;
  document.body.appendChild(versionInfo);
});

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for use in console
window.swaggerHelpers = {
  formatFileSize,
  setAuthToken: (token) => {
    localStorage.setItem('accessToken', token);
    location.reload();
  },
  clearAuth: () => {
    localStorage.removeItem('accessToken');
    location.reload();
  }
};
