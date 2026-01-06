"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeadDemo } from "@/components/customs/Heading";
import Link from "next/link";
import { IconPackage, IconPlus, IconArrowRight } from "@tabler/icons-react";

export default function Home() {
  const router = useRouter();

  // Auto-redirect to projects page after a short delay (optional)
  useEffect(() => {
    // Uncomment below to auto-redirect
    // const timer = setTimeout(() => router.push("/projects"), 3000);
    // return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="flex flex-col items-center mx-auto pt-10 px-4">
        <HeadDemo />

        {/* Welcome Card */}
        <div className="w-full max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <IconPackage className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Cutting Stock Optimizer
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Optimize your rebar cutting with advanced algorithms. Create projects, upload sheets, and minimize waste.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link
              href="/projects"
              className="flex items-center justify-between w-full p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <IconPackage className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">View Projects</div>
                  <div className="text-blue-100 text-sm">Manage existing projects and sheets</div>
                </div>
              </div>
              <IconArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/projects"
              className="flex items-center justify-between w-full p-5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <IconPlus className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">Create New Project</div>
                  <div className="text-slate-500 text-sm">Start a new cutting optimization project</div>
                </div>
              </div>
              <IconArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Info Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">How it works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-2">1</div>
                <div className="font-medium text-slate-900">Create Project</div>
                <div className="text-slate-500 mt-1">Group related sheets together</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-2">2</div>
                <div className="font-medium text-slate-900">Upload Sheets</div>
                <div className="text-slate-500 mt-1">Add Excel files with bar data</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-2">3</div>
                <div className="font-medium text-slate-900">Optimize & Export</div>
                <div className="text-slate-500 mt-1">Run calculations, reuse waste</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="w-full max-w-2xl mx-auto mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-2xl mb-1">🔄</div>
            <div className="text-sm font-medium text-slate-900">Waste Reuse</div>
            <div className="text-xs text-slate-500">Cross-sheet optimization</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-sm font-medium text-slate-900">Fast Algorithms</div>
            <div className="text-xs text-slate-500">Greedy & Dynamic</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-sm font-medium text-slate-900">Excel Export</div>
            <div className="text-xs text-slate-500">Detailed reports</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
            <div className="text-2xl mb-1">💾</div>
            <div className="text-sm font-medium text-slate-900">Auto-Save</div>
            <div className="text-xs text-slate-500">Results persist</div>
          </div>
        </div>
      </div>
    </div>
  );
}
