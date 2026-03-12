import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import MedicationCard from './components/MedicationCard';
import HealthStats from './components/HealthStats';
import { Message, Medication } from './types';
import { getDifyChatResponse } from './services/difyService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'สวัสดีค่ะ ยินดีต้อนรับสู่ RSU Pharma ค่ะ ขอเริ่มต้นด้วยการสอบถามข้อมูลเบื้องต้นนะคะ คุณมีอาการหรือปัญหาอะไรที่ต้องการคำปรึกษาในวันนี้คะ? (กรุณาบอกอาการหลักและว่าเป็นของคุณเองหรือของคนอื่น)',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'meds' | 'stats'>('chat');
  const [conversationId, setConversationId] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    try {
      const result = await getDifyChatResponse(input, conversationId, {});
      const answerContent = result?.answer || 'Sorry, the assistant cannot respond right now.';
      if (result?.conversation_id) {
        setConversationId(result.conversation_id);
      }
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answerContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, unable to connect to chat service right now.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsTyping(true);
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Uploading medication image for analysis...',
        timestamp: new Date(),
        attachments: [e.target?.result as string]
      };
      setMessages(prev => [...prev, userMessage]);
      try {
        const result = await getDifyChatResponse('I uploaded a medicine image. Please help analyze it.', conversationId, {});
        const analysis = result?.answer || 'Sorry, unable to analyze this information right now.';
        if (result?.conversation_id) {
          setConversationId(result.conversation_id);
        }
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: analysis,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Analyze image error:', error);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, unable to send image analysis request right now.',
            timestamp: new Date()
          }
        ]);
      } finally {
        setIsTyping(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const meds: Medication[] = [
    { id: '1', name: 'Paracetamol 500mg', dosage: '1 เม็ด', frequency: 'ทุก 4-6 ชั่วโมง', instruction: 'รับประทานเมื่อมีอาการปวดหรือไข้', type: 'pill' },
    { id: '2', name: 'Amoxicillin 250mg', dosage: '1 เม็ด', frequency: 'วันละ 2 ครั้ง หลังอาหาร', instruction: 'ทานให้ครบตามแพทย์สั่ง', type: 'pill' }
  ];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-slate-50 shadow-2xl overflow-hidden relative">
      <Header />

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto scroll-smooth" ref={scrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                  }`}>
                  {msg.attachments && msg.attachments.map((att, i) => (
                    <img key={i} src={att} alt="upload" className="mb-2 rounded-lg w-full max-h-48 object-cover border border-white/20" />
                  ))}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className={`text-[10px] mt-2 block opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'meds' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-slate-800">รายการยาของฉัน</h2>
            <div className="grid gap-4">
              {meds.map(med => <MedicationCard key={med.id} med={med} />)}
            </div>
            <button className="w-full py-4 bg-emerald-50 text-emerald-600 font-bold rounded-2xl border-2 border-dashed border-emerald-200 hover:bg-emerald-100 transition-colors">
              + เพิ่มยาใหม่
            </button>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-slate-800">แดชบอร์ดสุขภาพ</h2>
            <HealthStats />
            <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-200">
              <h3 className="font-bold text-lg mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                เคล็ดลับวันนี้
              </h3>
              <p className="text-blue-100 text-sm">การดื่มน้ำให้เพียงพอช่วยให้ระบบเผาผลาญทำงานได้ดีขึ้น และช่วยลดอาการปวดหัวจากการขาดน้ำได้นะครับ</p>
            </div>
          </div>
        )}
      </main>

      {/* Input Section - Only for Chat */}
      {activeTab === 'chat' && (
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col space-y-3">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            {['ยาพารา', 'เจ็บคอทานยาอะไร', 'ลืมทานยาต้องทำยังไง', 'ผลข้างเคียงยา'].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="whitespace-nowrap px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-emerald-100 hover:text-emerald-600 transition-all active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="สอบถามอาการหรือชื่อยา..."
                className="w-full bg-slate-100 text-slate-700 py-3 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-sm"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none hover:bg-emerald-600 transition-all active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <nav className="bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center safe-area-inset-bottom">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'chat' ? 'text-emerald-500 scale-110' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill={activeTab === 'chat' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-[10px] font-bold">ปรึกษา AI</span>
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'meds' ? 'text-emerald-500 scale-110' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill={activeTab === 'meds' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="text-[10px] font-bold">ตารางยา</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'stats' ? 'text-emerald-500 scale-110' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill={activeTab === 'stats' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-bold">สุขภาพ</span>
        </button>
      </nav>
    </div>
  );
};

export default App;


