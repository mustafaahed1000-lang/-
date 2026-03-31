import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle, HelpCircle, Briefcase, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import AppLayout from '../layouts/AppLayout';

export default function ContactPage() {
    const [result, setResult] = useState<string>("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus("submitting");
        const formData = new FormData(event.currentTarget);
        
        // 🔑 MUSTAFA: Replace the key below with your Web3Forms Access Key
        // Go to https://web3forms.com/ to get your free key for mustafa.ahed1000@gmail.com
        const accessKey = import.meta.env.VITE_WEB3FORMS_KEY || "e21e871a-b7f9-476e-af4e-bb1086ba52a0";
        formData.append("access_key", accessKey);

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setResult("تم إرسال رسالتك بنجاح! شكراً لتواصلك معنا.");
                setStatus("success");
                (event.target as HTMLFormElement).reset();
            } else {
                console.log("Error", data);
                setResult(data.message);
                setStatus("error");
            }
        } catch (error) {
            setResult("حدث خطأ أثناء الإرسال. تأكد من اتصال الإنترنت ثم حاول ثانية.");
            setStatus("error");
        }
    };

    return (
        <AppLayout>
            <div className="py-8 sm:py-12" dir="rtl">
                
                <div className="text-center mb-10 max-w-2xl mx-auto px-4">
                    <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black mb-4 text-[var(--text-main)]">تواصل معنا 📞</h1>
                    <p className="text-lg text-[var(--text-muted)] leading-relaxed">
                        نحن هنا لدعمك. شاركنا أفكارك، مشاكلك، أو حتى اقتراحاتك لتطوير منصة <span className="text-[#2ba396] font-black uppercase">Solvica</span>.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 px-4">
                    
                    {/* Contact Information Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:0.1}} className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <Mail className="w-8 h-8 text-blue-500 mb-4" />
                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">البريد الإلكتروني المباشر</h3>
                            <p className="text-[var(--text-muted)] font-mono text-sm leading-relaxed" dir="ltr">mustafa.ahed1000@gmail.com</p>
                        </motion.div>
                        
                        <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:0.2}} className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <HelpCircle className="w-8 h-8 text-emerald-500 mb-4" />
                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">الدعم الفني</h3>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed">فريقنا متواجد للرد على كافة استفسارات الطلاب التقنية وحل مشاكل الحسابات والأدوات الذكية.</p>
                        </motion.div>

                        <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:0.3}} className="p-6 bg-gradient-to-br from-[#2ba396] to-teal-700 rounded-3xl shadow-lg shadow-[#2ba396]/20 text-white relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all pointer-events-none"></div>
                            <Briefcase className="w-8 h-8 mb-4 opacity-90 relative z-10" />
                            <h3 className="text-xl font-black mb-2 relative z-10">المطور مصطفى عاهد</h3>
                            <p className="text-white/80 text-sm leading-relaxed relative z-10 font-bold mb-4">مهندس برمجيات وصانع محرك Solvica الذكي. لأي تعاون أو مشاريع تطويرية، تفضل بالمراسلة مباشرة.</p>
                            <div className="flex gap-4 relative z-10 text-white/90 text-sm font-bold opacity-80">
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> فلسطين</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Form Area */}
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.4}} className="lg:col-span-3">
                        <div className="p-6 sm:p-10 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-lg relative overflow-hidden">
                            
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">أرسل رسالة سريعة 📬</h2>
                                <p className="text-[var(--text-muted)] text-sm font-bold">تصلنا رسالتك مباشرة عبر البريد الإلكتروني وسنرد عليك بأقرب فرصة.</p>
                            </div>

                            <form onSubmit={onSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-[var(--text-main)]" htmlFor="name">اسم الطالب / المرسل</label>
                                        <input 
                                            type="text" 
                                            name="name" 
                                            id="name"
                                            required 
                                            placeholder="مثال: أحمد محمود"
                                            className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] focus:ring-2 focus:ring-[#2ba396]/20 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-[var(--text-main)]" htmlFor="email">البريد الإلكتروني للرد</label>
                                        <input 
                                            type="email" 
                                            name="email" 
                                            id="email"
                                            required 
                                            placeholder="email@example.com"
                                            className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] focus:ring-2 focus:ring-[#2ba396]/20 transition-all font-bold text-left"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-[var(--text-main)]" htmlFor="subject">موضوع الرسالة</label>
                                    <input 
                                        type="text" 
                                        name="subject" 
                                        id="subject"
                                        required 
                                        placeholder="اقتراح / مشكلة / استفسار"
                                        className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] focus:ring-2 focus:ring-[#2ba396]/20 transition-all font-bold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-[var(--text-main)]" htmlFor="message">تفاصيل الرسالة</label>
                                    <textarea 
                                        name="message" 
                                        id="message"
                                        required 
                                        rows={5}
                                        placeholder="اكتب رسالتك هنا بوضوح وسنقوم بمراجعتها فوراً..."
                                        className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] focus:ring-2 focus:ring-[#2ba396]/20 transition-all font-bold resize-y min-h-[120px]"
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={status === "submitting" || status === "success"}
                                    className={`w-full py-4 text-lg font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3
                                        ${status === "success" 
                                            ? "bg-emerald-500 text-white cursor-default" 
                                            : "btn-primary hover:-translate-y-1"}`}
                                >
                                    {status === "submitting" ? (
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : status === "success" ? (
                                        <>تم الإرسال بنجاح <CheckCircle className="w-5 h-5" /></>
                                    ) : (
                                        <>إرسال الرسالة الآن <Send className="w-5 h-5 rotate-[180deg]" /></>
                                    )}
                                </button>

                                {result && (
                                    <p className={`text-center font-bold text-sm p-4 rounded-2xl ${status === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"}`}>
                                        {result}
                                    </p>
                                )}
                            </form>
                        </div>
                    </motion.div>

                </div>
            </div>
        </AppLayout>
    );
}
