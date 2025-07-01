# API Usage Examples

## File Upload với Multer và FFmpeg

### 1. Upload File Đơn

```bash
# Upload một file
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.mp4" \
  -F "description=Video mô tả sản phẩm" \
  -F "tags=video,demo,product" \
  -F "processVideo=true" \
  -F "targetResolution=1280x720"
```

### 2. Upload Nhiều File

```bash
# Upload nhiều file cùng lúc
curl -X POST http://localhost:3000/api/files/upload-multiple \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.mp4" \
  -F "files=@/path/to/file3.pdf" \
  -F "folderId=60f7b3b4b236a23c50b23a12"
```

### 3. Stream Video

```bash
# Stream video với range support
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Range: bytes=0-1048576" \
     http://localhost:3000/api/files/60f7b3b4b236a23c50b23a12/stream
```

### 4. Download File

```bash
# Download file
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/files/60f7b3b4b236a23c50b23a12/download \
     -o downloaded_file.ext
```

### 5. Xem Trạng Thái Upload

```bash
# Kiểm tra tiến độ upload
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/files/upload/upload_12345/status
```

## JavaScript Examples

### Frontend Upload với Progress

```javascript
// Upload file với progress tracking
async function uploadFileWithProgress(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Thêm metadata
  if (options.description) formData.append('description', options.description);
  if (options.folderId) formData.append('folderId', options.folderId);
  if (options.processVideo) formData.append('processVideo', 'true');
  
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.log(`Upload progress: ${progress}%`);
        if (options.onProgress) options.onProgress(progress);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Upload failed'));
      }
    };
    
    xhr.onerror = () => reject(new Error('Upload error'));
    
    xhr.open('POST', '/api/files/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
    xhr.send(formData);
  });
}

// Sử dụng
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const result = await uploadFileWithProgress(file, {
      description: 'My uploaded file',
      processVideo: file.type.startsWith('video/'),
      onProgress: (progress) => {
        document.getElementById('progress').textContent = `${progress}%`;
      }
    });
    
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
});
```

### Video Player với Range Requests

```javascript
// Custom video player với range support
class CustomVideoPlayer {
  constructor(fileId, containerId) {
    this.fileId = fileId;
    this.container = document.getElementById(containerId);
    this.createPlayer();
  }
  
  createPlayer() {
    this.video = document.createElement('video');
    this.video.controls = true;
    this.video.style.width = '100%';
    
    // Set source với auth header
    this.video.src = `/api/files/${this.fileId}/stream`;
    
    // Custom range request handling
    this.video.addEventListener('loadstart', () => {
      this.setupRangeRequests();
    });
    
    this.container.appendChild(this.video);
  }
  
  setupRangeRequests() {
    // Intercept video requests để thêm auth header
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      if (url.includes('/stream')) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        };
      }
      return originalFetch(url, options);
    };
  }
}

// Sử dụng
const player = new CustomVideoPlayer('60f7b3b4b236a23c50b23a12', 'videoContainer');
```

## API Response Examples

### Upload Response

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "id": "60f7b3b4b236a23c50b23a12",
      "name": "video.mp4",
      "size": 15728640,
      "mimeType": "video/mp4",
      "driveFileId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "webViewLink": "https://drive.google.com/file/d/1BxiMVs.../view",
      "thumbnailLink": "https://drive.google.com/thumbnail?id=1BxiMVs...",
      "isPublic": false,
      "createdAt": "2023-07-20T10:30:00Z",
      "metadata": {
        "duration": 120.5,
        "resolution": {
          "width": 1280,
          "height": 720
        },
        "bitrate": 2000000,
        "frameRate": 30,
        "thumbnails": [
          {
            "size": "medium",
            "url": "https://drive.google.com/...",
            "width": 640,
            "height": 360
          }
        ]
      }
    },
    "uploadId": "enhanced_1642681800_abc123"
  }
}
```

### File List Response

```json
{
  "success": true,
  "message": "Files retrieved successfully",
  "data": {
    "files": [
      {
        "id": "60f7b3b4b236a23c50b23a12",
        "name": "document.pdf",
        "size": 1048576,
        "mimeType": "application/pdf",
        "createdAt": "2023-07-20T10:30:00Z",
        "folder": {
          "id": "60f7b3b4b236a23c50b23a13",
          "name": "Documents",
          "path": "/Documents"
        }
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 100,
      "limit": 20
    }
  }
}
```

## Integration Notes

### 1. Multer Configuration

Service tự động chọn storage type:
- File < 50MB: Memory storage (nhanh hơn)
- File ≥ 50MB: Disk storage (tiết kiệm RAM)

### 2. FFmpeg Processing

Tự động xử lý video:
- Tạo thumbnail tại giây thứ 5
- Chuyển đổi định dạng thành MP4
- Tối ưu hóa bitrate và resolution
- Extract metadata (duration, resolution, fps)

### 3. Streaming Support

- Hỗ trợ HTTP Range requests
- Streaming video mượt mà
- Adaptive bitrate (nếu có nhiều quality)
- Resume download

### 4. Error Handling

Các lỗi phổ biến:
- File quá lớn: 413 Payload Too Large
- Định dạng không hỗ trợ: 415 Unsupported Media Type
- Quota Google Drive hết: 507 Insufficient Storage
- Service Account không khả dụng: 503 Service Unavailable

### 5. Performance Tips

- Sử dụng CDN cho static files
- Enable gzip compression
- Implement client-side caching
- Use WebSocket for real-time upload progress
- Queue large file processing
