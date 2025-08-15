import React from 'react'

function Header() {
  return (
    <header className="text-center py-10 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
        🎯 Auto Picklist Generator
      </h1>
      <p className="text-lg md:text-xl text-white opacity-90 max-w-2xl mx-auto">
        Upload your CSV order file and get an optimized picklist with the best suppliers and prices
      </p>
    </header>
  )
}

export default Header