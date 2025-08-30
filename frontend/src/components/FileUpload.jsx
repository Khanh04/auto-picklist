import React, { useState, useRef } from 'react'

function FileUpload({ onFileUpload, onMultiFileUpload }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (files) => {
    const validFiles = []
    const errors = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        errors.push(`${file.name}: Please select a CSV file.`)
        continue
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 10MB.`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'))
    }

    // Add to existing files (max 10)
    const newFiles = [...selectedFiles, ...validFiles]
    if (newFiles.length > 10) {
      alert('Maximum 10 CSV files allowed. Some files were not added.')
      setSelectedFiles(newFiles.slice(0, 10))
    } else {
      setSelectedFiles(newFiles)
    }
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
      handleFileSelect(files)
    }
  }

  const handleFileInputChange = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleBrowseClick = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleUploadAreaClick = () => {
    if (selectedFiles.length === 0) {
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

  const handleRemoveFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAllFiles = () => {
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleProcess = () => {
    if (selectedFiles.length > 0) {
      if (selectedFiles.length > 1 && onMultiFileUpload) {
        onMultiFileUpload(selectedFiles)
      } else if (onFileUpload) {
        onFileUpload(selectedFiles[0])
      }
    }
  }

  const getTotalSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {selectedFiles.length === 0 ? (
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
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Drop your CSV files here
            </h3>
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
            <small className="text-gray-500">
              Accepts up to 10 CSV files, 10MB each. Single or multiple files supported.
            </small>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv" 
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File List Header */}
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl">📚</div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: {formatFileSize(getTotalSize())}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                className="text-red-500 hover:text-red-700 px-3 py-1 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
                onClick={handleRemoveAllFiles}
                title="Remove all files"
              >
                Clear All
              </button>
            </div>

            {/* Individual Files */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <div className="font-medium text-gray-800">{file.name}</div>
                      <div className="text-sm text-gray-600">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="text-red-500 hover:text-red-700 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors"
                    onClick={() => handleRemoveFile(index)}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add More Button */}
            {selectedFiles.length < 10 && (
              <button
                type="button"
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:text-gray-800 hover:border-gray-400 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add More CSV Files ({10 - selectedFiles.length} remaining)
              </button>
            )}

            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv" 
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        )}

        <div className="flex justify-center mt-8">
          <button 
            type="button" 
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform ${
              selectedFiles.length > 0
                ? 'gradient-bg text-white hover:scale-105 hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={selectedFiles.length === 0}
            onClick={handleProcess}
          >
            {selectedFiles.length > 1 
              ? `Generate Combined Picklist (${selectedFiles.length} files)`
              : 'Generate Picklist'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default FileUpload