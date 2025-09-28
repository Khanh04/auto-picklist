import React from 'react'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative py-12 px-4 mt-auto">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Section */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <span className="text-lg font-bold text-white">📋</span>
            </div>
            <div className="text-white">
              <div className="font-bold text-lg">Auto Picklist</div>
              <div className="text-white/70 text-sm">Intelligent inventory management</div>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Real-time Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Multi-Supplier Support</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Intelligent Matching</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-white/70 text-sm text-center md:text-right">
            <div className="mb-1">© {currentYear} Auto Picklist Generator</div>
            <div className="flex items-center justify-center md:justify-end gap-1">
              <span>Built with</span>
              <svg className="w-4 h-4 text-red-400 animate-pulse-subtle" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span>for efficiency</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/20 mt-8 mb-4"></div>

        {/* Tech Stack */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-white/60 text-xs">
          <span className="px-2 py-1 bg-white/10 rounded-md">React</span>
          <span className="px-2 py-1 bg-white/10 rounded-md">Node.js</span>
          <span className="px-2 py-1 bg-white/10 rounded-md">PostgreSQL</span>
          <span className="px-2 py-1 bg-white/10 rounded-md">Tailwind CSS</span>
          <span className="px-2 py-1 bg-white/10 rounded-md">WebSocket</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer