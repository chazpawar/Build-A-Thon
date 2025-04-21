import { Summarize } from "@/components/demo/summarize";

export default function SummarizePage() {
  return (
    <div className="min-h-screen bg-indigo-100">

      {/* Page Content */}
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4">
              Summarize Your Content
            </h1>
            <p className="text-lg text-indigo-700">
              Get concise, accurate summaries of your books, lectures, or notes in seconds.
            </p>
          </div>
          
          <Summarize />
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-white py-8 border-t border-indigo-200 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-indigo-500">© 2023 Lecture Lite. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 