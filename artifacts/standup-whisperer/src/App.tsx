import React, { useState, useRef, useEffect } from "react";
import { Copy, Terminal, Check, AlertCircle } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

type Format = "plain" | "slack" | "markdown";

function StandupWhisperer() {
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState<Format>("slack");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleGenerate = async () => {
    if (!notes.trim()) {
      setError("Please enter your notes first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setOutput("");
    setCopied(false);

    try {
      const BASE = import.meta.env.BASE_URL;
      const response = await fetch(`${BASE}api/standup/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, format }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate standup.");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          try {
            const json = JSON.parse(line.slice(6));
            if (json.content) setOutput((prev) => prev + json.content);
            if (json.done) setIsGenerating(false);
            if (json.error) {
              setError(json.error);
              setIsGenerating(false);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl flex flex-col gap-8 h-full flex-1">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border pb-6 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(20,250,220,0.1)]">
              <Terminal className="text-primary w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Standup Whisperer</h1>
              <p className="text-sm text-muted-foreground">Convert messy notes to clean updates.</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col md:flex-row gap-6 flex-1 min-h-[500px]">
          
          {/* Input Section */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground tracking-wide uppercase">Raw Notes</label>
            </div>
            <textarea
              className="flex-1 w-full bg-card/50 border border-border rounded-lg p-4 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono text-sm leading-relaxed"
              placeholder="fixed google auth bug, had sync with design (2h), discussed new dashboard layout, opened PR for rate limiting, waiting on Agron for db schema decision"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isGenerating}
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div className="flex p-1 bg-card border border-border rounded-md">
                {(["plain", "slack", "markdown"] as Format[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    disabled={isGenerating}
                    className={`px-4 py-1.5 text-sm font-medium rounded-sm capitalize transition-colors ${
                      format === fmt 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !notes.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                    Generating
                  </span>
                ) : (
                  "Generate"
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="flex-1 flex flex-col gap-4">
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground tracking-wide uppercase">Output Stream</label>
              {(output || isGenerating) && (
                <button
                  onClick={handleCopy}
                  disabled={!output}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span className="text-primary">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div 
              ref={outputRef}
              className="flex-1 w-full bg-[#0a0c10] border border-border/80 rounded-lg p-5 font-mono text-[13px] text-foreground/90 overflow-y-auto relative shadow-inner"
            >
              {output ? (
                <div className="whitespace-pre-wrap leading-loose">
                  {output}
                  {isGenerating && (
                    <span className="inline-block w-2 h-4 bg-primary ml-1 align-middle animate-cursor-blink"></span>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/30 italic">
                  Awaiting generation...
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StandupWhisperer />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
