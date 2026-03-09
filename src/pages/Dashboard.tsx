import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { motion } from "motion/react";
import { LogOut, PenTool, Image as ImageIcon, AlignLeft, List, Loader2, Sparkles } from "lucide-react";
import { generateBlogWithImages } from "../lib/gemini";
import Markdown from "react-markdown";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [length, setLength] = useState("500");
  const [numImages, setNumImages] = useState("1");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{title: string, content: string, images: string[]} | null>(null);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const data = await generateBlogWithImages(topic, keyPoints, length, parseInt(numImages));
      setResult(data);
    } catch (err: any) {
      setError("Failed to generate blog: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <PenTool className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-zinc-900 tracking-tight">AI Blog Writer</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500 hidden sm:inline-block">{currentUser?.email}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline-block">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Blog Parameters
              </h2>
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Topic</label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. The Future of Artificial Intelligence"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Key Points</label>
                  <textarea
                    required
                    rows={3}
                    value={keyPoints}
                    onChange={(e) => setKeyPoints(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                    placeholder="e.g. Machine learning, Neural networks, Ethical concerns"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-1">
                      <AlignLeft className="h-4 w-4 text-zinc-400" /> Length (words)
                    </label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    >
                      <option value="300">Short (~300)</option>
                      <option value="500">Medium (~500)</option>
                      <option value="800">Long (~800)</option>
                      <option value="1200">In-depth (~1200)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-1">
                      <ImageIcon className="h-4 w-4 text-zinc-400" /> Images
                    </label>
                    <select
                      value={numImages}
                      onChange={(e) => setNumImages(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    >
                      <option value="0">None</option>
                      <option value="1">1 Image</option>
                      <option value="2">2 Images</option>
                      <option value="3">3 Images</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating Magic...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Blog
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Result Section */}
          <div className="lg:col-span-8">
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-zinc-200 min-h-[600px]">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Generation Error
                  </div>
                  <p className="text-red-600">{error}</p>
                  {(error.includes("API key") || error.includes("rate limit")) && (
                    <div className="mt-2 text-sm bg-red-100 p-3 rounded-lg text-red-800">
                      <strong>How to fix:</strong> Open the AI Studio settings (gear icon) and check your Secrets/Environment Variables. Ensure your keys are correct and you haven't exceeded your free tier limits.
                    </div>
                  )}
                </div>
              )}
              
              {!loading && !result && !error && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 py-20">
                  <div className="bg-zinc-50 p-4 rounded-full">
                    <PenTool className="h-12 w-12 text-zinc-300" />
                  </div>
                  <p className="text-lg">Fill out the form to generate a blog post</p>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center text-indigo-500 space-y-4 py-20">
                  <Loader2 className="h-12 w-12 animate-spin" />
                  <p className="text-lg font-medium animate-pulse">Crafting your masterpiece...</p>
                  <p className="text-sm text-zinc-400">This might take a minute if generating images.</p>
                </div>
              )}

              {result && !loading && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-zinc prose-indigo max-w-none"
                >
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 mb-8">
                    {result.title}
                  </h1>
                  
                  {result.images && result.images.length > 0 && (
                    <div className="my-8 rounded-2xl overflow-hidden shadow-md">
                      <img src={result.images[0]} alt="Blog hero" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="markdown-body text-zinc-800 leading-relaxed">
                    <Markdown>{result.content}</Markdown>
                  </div>

                  {result.images && result.images.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
                      {result.images.slice(1).map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-zinc-100">
                          <img src={img} alt={`Blog illustration ${idx + 2}`} className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
