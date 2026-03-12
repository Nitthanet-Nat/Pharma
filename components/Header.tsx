
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-emerald-100 py-4 px-6 sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-200">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">PharmaAI</h1>
          <p className="text-xs text-emerald-600 font-medium">เภสัชกรอัจฉริยะส่วนตัวของคุณ</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-semibold text-emerald-700">Online</span>
      </div>
    </header>
  );
};

export default Header;
