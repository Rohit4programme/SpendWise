import { Github, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              S
            </div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">SpendWise</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">© 2026</span>
          </div>

          {/* Contact Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Feedback & Support:</span>
            
            {/* GitHub */}
            <a
              href="https://github.com/Rohit4programme"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors text-sm font-medium group"
              title="Visit GitHub"
            >
              <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            {/* Gmail */}
            <a
              href="mailto:kratos4all@gmail.com"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors text-sm font-medium group"
              title="Send Email"
            >
              <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Email</span>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
