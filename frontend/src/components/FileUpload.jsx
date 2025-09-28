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
    <div className="max-w-3xl mx-auto p-8 animate-fade-in">
      <div className="card p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        {selectedFiles.length === 0 ? (
          <div
            className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-500 ${
              isDragOver
                ? 'border-primary-400 bg-primary-50/50 scale-[1.02] shadow-glow'
                : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50/50 hover:scale-[1.01]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadAreaClick}
          >
            {/* Upload Icon */}
            <div className={`relative mb-6 transition-all duration-500 ${isDragOver ? 'animate-bounce-gentle' : ''}`}>
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center shadow-soft">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              {isDragOver && (
                <div className="absolute inset-0 bg-primary-200/30 rounded-2xl animate-pulse-subtle"></div>
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">
              {isDragOver ? 'Drop your files here!' : 'Drop your CSV files here'}
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              or{' '}
              <button
                type="button"
                className="text-primary-600 hover:text-primary-700 font-semibold underline decoration-2 underline-offset-2 transition-colors duration-200"
                onClick={handleBrowseClick}
              >
                browse files
              </button>
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-success-50 text-success-700 rounded-lg text-sm font-medium border border-success-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Up to 10 files
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium border border-primary-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                10MB max each
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary-50 text-secondary-700 rounded-lg text-sm font-medium border border-secondary-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                CSV format
              </span>
            </div>

            <small className="text-gray-500 block">
              Single or multiple files supported. Intelligent processing with real-time feedback.
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
          <div className="space-y-6 animate-slide-up">
            {/* File List Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-4 border border-primary-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-soft">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-lg">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    Total size: {formatFileSize(getTotalSize())}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 text-error-600 hover:text-error-700 px-4 py-2 rounded-xl hover:bg-error-50 transition-all duration-200 text-sm font-medium border border-error-200 hover:border-error-300"
                onClick={handleRemoveAllFiles}
                title="Remove all files"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Clear All
              </button>
            </div>

            {/* Individual Files */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="group bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:shadow-medium hover:border-primary-200 transition-all duration-300 animate-scale-in">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center group-hover:from-primary-100 group-hover:to-secondary-100 transition-all duration-300">
                      <svg className="w-6 h-6 text-gray-600 group-hover:text-primary-600 transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-base group-hover:text-primary-700 transition-colors duration-300">
                        {file.name}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-error-600 hover:bg-error-50 transition-all duration-200 border border-transparent hover:border-error-200"
                    onClick={() => handleRemoveFile(index)}
                    title="Remove file"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add More Button */}
            {selectedFiles.length < 10 && (
              <button
                type="button"
                className="w-full border-2 border-dashed border-primary-200 rounded-2xl p-6 text-primary-600 hover:text-primary-700 hover:border-primary-300 hover:bg-primary-50/50 transition-all duration-300 font-medium text-lg group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Add More CSV Files ({10 - selectedFiles.length} remaining)
                </div>
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

        <div className="flex justify-center mt-10">
          <button
            type="button"
            className={`group relative px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-primary-200 ${
              selectedFiles.length > 0
                ? 'gradient-bg text-white hover:scale-105 hover:shadow-large active:scale-[1.02] shadow-soft'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            disabled={selectedFiles.length === 0}
            onClick={handleProcess}
          >
            {selectedFiles.length > 0 && (
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
            <div className="relative flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {selectedFiles.length > 1
                ? `Generate Combined Picklist (${selectedFiles.length} files)`
                : 'Generate Picklist'
              }
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FileUpload