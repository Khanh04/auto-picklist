import React, { useState, useRef } from 'react'

function FileUpload({ onFileUpload, onManageDatabase }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file.')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.')
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleBrowseClick = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleUploadAreaClick = () => {
    if (!selectedFile) {
      fileInputRef.current?.click()
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleProcess = () => {
    if (selectedFile) {
      onFileUpload(selectedFile)
    }
  }

  return (
    <div className="upload-section">
      {!selectedFile ? (
        <div 
          className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadAreaClick}
        >
          <div className="upload-icon">📄</div>
          <h3>Drop your CSV file here</h3>
          <p>or <button type="button" className="browse-btn" onClick={handleBrowseClick}>browse files</button></p>
          <small>Accepts CSV files up to 5MB</small>
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".csv" 
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
        </div>
      ) : (
        <div className="file-info">
          <div className="file-details">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">{formatFileSize(selectedFile.size)}</span>
          </div>
          <button 
            type="button" 
            className="remove-btn"
            onClick={handleRemoveFile}
          >
            ✕
          </button>
        </div>
      )}

      <div className="action-buttons">
        <button 
          type="button" 
          className="process-btn"
          disabled={!selectedFile}
          onClick={handleProcess}
        >
          Generate Picklist
        </button>
        
        <button 
          type="button" 
          className="manage-db-btn"
          onClick={onManageDatabase}
        >
          Manage Database
        </button>
      </div>
    </div>
  )
}

export default FileUpload