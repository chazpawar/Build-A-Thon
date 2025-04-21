"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Summarize } from "@/components/demo/summarize"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"

export default function Home() {

  return (
    <div className="min-h-screen bg-indigo-100">
      <div className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 container mx-auto text-center">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-6xl font-semibold text-indigo-950">
            Quick Summaries in Seconds!
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-indigo-950">
            Paste or upload your book chapters, class notes, or lecture <br/>
            transcript and get clear, concise takeaways.
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg" className="bg-indigo-700 hover:bg-indigo-100 hover:text-indigo-700 font-mono">
              <Link href="/chat" className="flex items-center">
                GET STARTED
              </Link>
            </Button>
          </div>
        </div>
      </section>
        {/* Summarize Section */}
        <section id="summarize-section" className="bg-indigo-100">
          <div className="container mx-auto px-4">
            <Summarize />
          </div>
        </section>
      </div>
    </div>
  )
}
