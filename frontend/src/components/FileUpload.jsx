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
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {!selectedFile ? (
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50 scale-105' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadAreaClick}
          >
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Drop your CSV file here</h3>
            <p className="text-gray-600 mb-4">
              or{' '}
              <button 
                type="button" 
                className="text-blue-600 hover:text-blue-700 font-semibold underline"
                onClick={handleBrowseClick}
              >
                browse files
              </button>
            </p>
            <small className="text-gray-500">Accepts CSV files up to 5MB</small>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv" 
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">📄</div>
              <div>
                <div className="font-semibold text-gray-800">{selectedFile.name}</div>
                <div className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</div>
              </div>
            </div>
            <button 
              type="button" 
              className="text-red-500 hover:text-red-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
              onClick={handleRemoveFile}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button 
            type="button" 
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform ${
              selectedFile
                ? 'gradient-bg text-white hover:scale-105 hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!selectedFile}
            onClick={handleProcess}
          >
            📊 Generate Picklist
          </button>
          
          <button 
            type="button" 
            className="px-8 py-4 gradient-green text-white rounded-lg font-semibold text-lg hover:scale-105 hover:shadow-lg transition-all duration-300 transform"
            onClick={onManageDatabase}
          >
            🗄️ Manage Database
          </button>
        </div>
      </div>
    </div>
  )
}

export default FileUpload