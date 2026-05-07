import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import MedicationCard from './components/MedicationCard';
import HealthStats from './components/HealthStats';
import PersonaList from './components/PersonaList';
import PersonaForm from './components/PersonaForm';
import ActivePersonaSelector from './components/ActivePersonaSelector';
import PersonaHealthSummary from './components/PersonaHealthSummary';
import { Message, Medication, PatientPersona, PatientPersonaFormData } from './types';
import { getDifyChatResponse } from './services/difyService';
import { personaService } from './services/personaService';
import { buildChatQueryWithPersona } from './services/personaContext';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

const normalizeMarkdownContent = (content: string) =>
  content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?p>/gi, '');

const sanitizeAssistantContent = (content: string) => {
  const disclaimerPatterns = [
    /^\s*คำถาม(?:นี้)?ไม่สามารถยืนยัน(?:ได้)?จากข้อมูล(?:อ้างอิง)?ที่มีอยู่[:：]?\s*/u,
    /^\s*ไม่สามารถยืนยัน(?:ได้)?จากข้อมูล(?:อ้างอิง)?ที่มีอยู่[:：]?\s*/u
  ];
  const brandingPatterns = [
    /^\s*(?:RSU\s*Pharma|PharmaAI)\s*(?:ขอ)?แนะนำ(?:ว่า)?\s*ให้\s*/iu,
    /^\s*(?:RSU\s*Pharma|PharmaAI)\s*(?:ขอ)?แนะนำ(?:ว่า)?\s*/iu,
    /^\s*(?:RSU\s*Pharma|PharmaAI)\s*(?:ขอ)?(?:ให้คำแนะนำ|ขอให้คำแนะนำ)(?:ว่า)?\s*/iu
  ];

  let sanitized = content.trim();
  let previous = '';

  while (sanitized && sanitized !== previous) {
    previous = sanitized;
    for (const pattern of disclaimerPatterns) {
      sanitized = sanitized.replace(pattern, '').trimStart();
    }
    for (const pattern of brandingPatterns) {
      sanitized = sanitized.replace(pattern, (match) =>
        /แนะนำ(?:ว่า)?\s*ให้\s*$/iu.test(match) ? 'แนะนำให้ ' : ''
      ).trimStart();
    }
  }

  return sanitized.trim();
};

const MarkdownMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const markdown = normalizeMarkdownContent(content);
  const className = isUser ? 'markdown-content markdown-user' : 'markdown-content markdown-assistant';

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{markdown}</ReactMarkdown>
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'สวัสดีค่ะ ยินดีต้อนรับสู่ RSU Pharma ค่ะ คุณมีอาการหรือปัญหาอะไรที่ต้องการคำปรึกษาในวันนี้คะ? (กรุณาบอกอาการหลักและว่าเป็นของคุณเองหรือของคนอื่น)',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'personas' | 'meds' | 'stats'>('chat');
  const [personas, setPersonas] = useState<PatientPersona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [isPersonaFormOpen, setIsPersonaFormOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PatientPersona | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const loadPersonas = async () => {
      const [loadedPersonas, loadedActiveId] = await Promise.all([
        personaService.getAll(),
        personaService.getActive(),
      ]);
      setPersonas(loadedPersonas);
      setActivePersonaId(loadedActiveId || loadedPersonas[0]?.id || null);
    };

    loadPersonas();
  }, []);

  const activePersona = personas.find((persona) => persona.id === activePersonaId) || personas[0] || null;

  const handleSetActivePersona = async (id: string) => {
    setActivePersonaId(id);
    await personaService.setActive(id);
  };

  const handleSavePersona = async (data: PatientPersonaFormData) => {
    const savedPersona = editingPersona
      ? await personaService.update(editingPersona.id, data)
      : await personaService.create(data);
    const updatedPersonas = editingPersona
      ? personas.map((persona) => (persona.id === savedPersona.id ? savedPersona : persona))
      : [savedPersona, ...personas];
    setPersonas(updatedPersonas);
    setEditingPersona(null);
    setIsPersonaFormOpen(false);
    if (!activePersonaId) {
      await handleSetActivePersona(savedPersona.id);
    }
  };

  const handleDeletePersona = async (id: string) => {
    await personaService.delete(id);
    const updatedPersonas = personas.filter((persona) => persona.id !== id);
    setPersonas(updatedPersonas);
    if (activePersonaId === id) {
      const nextActiveId = updatedPersonas[0]?.id || null;
      setActivePersonaId(nextActiveId);
      if (nextActiveId) await personaService.setActive(nextActiveId);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userInput = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    try {
      const result = await getDifyChatResponse(buildChatQueryWithPersona(userInput, activePersona));
      const answerContent = sanitizeAssistantContent(result?.answer || '');

      if (!answerContent) {
        return;
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
        const result = await getDifyChatResponse(
          buildChatQueryWithPersona('I uploaded a medicine image. Please help analyze it.', activePersona)
        );
        const analysis = sanitizeAssistantContent(result?.answer || '');

        if (!analysis) {
          return;
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

  const healthHighlights = [
    { label: 'ความดันเฉลี่ย', value: '120/78', unit: 'mmHg', tone: 'emerald' },
    { label: 'ชีพจรล่าสุด', value: '72', unit: 'bpm', tone: 'blue' },
    { label: 'การนอนเมื่อคืน', value: '7.5', unit: 'ชั่วโมง', tone: 'amber' },
    { label: 'ดื่มน้ำวันนี้', value: '1.8', unit: 'ลิตร', tone: 'rose' }
  ] as const;

  const healthTasks = [
    { title: 'ทานยาหลังอาหารเย็น', time: '18:30 น.', status: 'ครบตามเวลา' },
    { title: 'วัดความดันโลหิต', time: '20:00 น.', status: 'รอดำเนินการ' },
    { title: 'เดินเบา ๆ 20 นาที', time: 'ก่อน 21:00 น.', status: 'แนะนำวันนี้' }
  ];

  const healthNotes = [
    'อาการโดยรวมคงที่ ไม่มีสัญญาณเสี่ยงเร่งด่วน',
    'ความดันสัปดาห์นี้อยู่ในเกณฑ์ใกล้เคียงปกติ',
    'ควรเพิ่มการดื่มน้ำอีกประมาณ 200-300 มล. ในช่วงบ่าย'
  ];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-slate-50 shadow-2xl overflow-hidden relative">
      <Header />

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto scroll-smooth" ref={scrollRef}>
            <ActivePersonaSelector
              personas={personas}
              activePersonaId={activePersonaId}
              onChange={handleSetActivePersona}
            />
            <PersonaHealthSummary persona={activePersona} />
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                  }`}>
                  {msg.attachments && msg.attachments.map((att, i) => (
                    <img key={i} src={att} alt="upload" className="mb-2 rounded-lg w-full max-h-48 object-cover border border-white/20" />
                  ))}
                  <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
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

        {activeTab === 'personas' && (
          <div className="h-full overflow-y-auto bg-slate-50 p-5 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Patient Persona</p>
                <h2 className="text-2xl font-bold text-slate-800">โปรไฟล์ผู้ป่วย</h2>
                <p className="mt-1 text-sm text-slate-500">จัดการข้อมูลสมาชิกเพื่อให้การปรึกษายาปลอดภัยขึ้น</p>
              </div>
              <button
                onClick={() => {
                  setEditingPersona(null);
                  setIsPersonaFormOpen(true);
                }}
                className="shrink-0 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100"
              >
                + เพิ่มสมาชิก
              </button>
            </div>

            {isPersonaFormOpen && (
              <PersonaForm
                initialPersona={editingPersona}
                onSubmit={handleSavePersona}
                onCancel={() => {
                  setEditingPersona(null);
                  setIsPersonaFormOpen(false);
                }}
              />
            )}

            <PersonaList
              personas={personas}
              activePersonaId={activePersonaId}
              onSelect={handleSetActivePersona}
              onEdit={(persona) => {
                setEditingPersona(persona);
                setIsPersonaFormOpen(true);
              }}
              onDelete={handleDeletePersona}
            />
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
          <div className="h-full overflow-y-auto bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Health Profile</p>
                <h2 className="text-2xl font-bold text-slate-800">แดชบอร์ดสุขภาพ</h2>
              </div>
              <div className="rounded-full border border-emerald-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                อัปเดตล่าสุด 19 มี.ค.
              </div>
            </div>

            <section className="rounded-[2rem] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-5 text-white shadow-xl shadow-emerald-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/18 text-2xl font-bold ring-1 ring-white/25">
                    ส
                  </div>
                  <div>
                    <p className="text-sm text-emerald-100">โปรไฟล์สุขภาพของคุณ</p>
                    <h3 className="text-xl font-bold">สมศรี ใจดี</h3>
                    <p className="text-sm text-emerald-50/90">หญิง 34 ปี • ติดตามความดันและการนอนหลับ</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-right backdrop-blur-sm ring-1 ring-white/15">
                  <p className="text-xs text-emerald-100">Health Score</p>
                  <p className="text-2xl font-bold">86</p>
                  <p className="text-xs text-emerald-50">สมดุลดี</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/10">
                  <p className="text-xs text-emerald-100">เป้าหมายสัปดาห์นี้</p>
                  <p className="mt-1 text-sm font-semibold">นอนให้ครบ 7-8 ชั่วโมงต่อคืน</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/10">
                  <p className="text-xs text-emerald-100">สถานะยา</p>
                  <p className="mt-1 text-sm font-semibold">ทานยาแล้ว 2 จาก 3 มื้อ</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              {healthHighlights.map((item) => {
                const toneClass = {
                  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
                  blue: 'border-blue-100 bg-blue-50 text-blue-700',
                  amber: 'border-amber-100 bg-amber-50 text-amber-700',
                  rose: 'border-rose-100 bg-rose-50 text-rose-700'
                }[item.tone];

                return (
                  <div key={item.label} className={`rounded-3xl border p-4 shadow-sm ${toneClass}`}>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-2xl font-bold leading-none">{item.value}</span>
                      <span className="pb-0.5 text-xs font-medium opacity-80">{item.unit}</span>
                    </div>
                  </div>
                );
              })}
            </section>

            <HealthStats />

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">แผนติดตามวันนี้</h3>
                  <p className="text-sm text-slate-500">สรุปสิ่งที่ต้องเช็กวันนี้ในรูปแบบหน้า overview</p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  3 รายการ
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {healthTasks.map((task) => (
                  <div key={task.title} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.time}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4">
              <div className="rounded-[2rem] bg-blue-600 p-6 text-white shadow-lg shadow-blue-200">
                <h3 className="mb-2 flex items-center text-lg font-bold">
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  เคล็ดลับวันนี้
                </h3>
                <p className="text-sm leading-relaxed text-blue-100">
                  การดื่มน้ำให้เพียงพอช่วยให้ระบบเผาผลาญทำงานได้ดีขึ้น และช่วยลดอาการปวดหัวจากการขาดน้ำได้ ควรจิบน้ำเพิ่มอีกเล็กน้อยในช่วงบ่าย
                </p>
              </div>

              <div className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-lg shadow-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">สรุปสุขภาพประจำวัน</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">AI Summary</span>
                </div>
                <div className="mt-4 space-y-3">
                  {healthNotes.map((note) => (
                    <div key={note} className="flex items-start gap-3 text-sm text-slate-200">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400"></span>
                      <p>{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
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
          onClick={() => setActiveTab('personas')}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'personas' ? 'text-emerald-500 scale-110' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill={activeTab === 'personas' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m6-6a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0" />
          </svg>
          <span className="text-[10px] font-bold">ผู้ป่วย</span>
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
