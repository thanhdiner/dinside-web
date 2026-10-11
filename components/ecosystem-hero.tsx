"use client";

import * as React from "react";
import { ImageStreamHero, StreamImage } from "@/components/ui/image-stream-hero";

// Curated stock images for the AI Ecosystem corridor
const ECOSYSTEM_IMAGES: StreamImage[] = [
  {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    alt: "Abstract neon curves representing AI neural pathways",
  },
  {
    src: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80",
    alt: "Liquid gradient glass sphere representing LLM intelligence",
  },
  {
    src: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
    alt: "Deep learning AI digital network visualization",
  },
  {
    src: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
    alt: "Futuristic 3D mathematical geometric wave",
  },
  {
    src: "https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?auto=format&fit=crop&w=800&q=80",
    alt: "Vibrant iridescent chromatic abstraction",
  },
  {
    src: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=800&q=80",
    alt: "Dynamic flowing neon gradient ribbons",
  },
  {
    src: "https://images.unsplash.com/photo-1633493106115-f38fec64f068?auto=format&fit=crop&w=800&q=80",
    alt: "Synthesized digital intelligence structure",
  },
  {
    src: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=800&q=80",
    alt: "Multidimensional dark aurora background",
  },
];

export function EcosystemHero() {
  return (
    <section className="relative w-full py-16 overflow-hidden" id="ecosystem">
      <div className="container mx-auto px-4 mb-8 text-center">
        <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider text-emerald-700 uppercase bg-emerald-50 rounded-full border border-emerald-200">
          Ecosystem
        </span>
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 tracking-tight">
          Hỗ trợ 15+ Nhà cung cấp AI
        </h2>
        <p className="mt-3 text-sm md:text-base text-slate-600 max-w-xl mx-auto">
          Kết nối trực tiếp vào giao diện web của ChatGPT, Claude, Gemini, DeepSeek... 
          Không cần API Key trả phí, bảo toàn tối đa quyền riêng tư.
        </p>
      </div>

      <ImageStreamHero
        images={ECOSYSTEM_IMAGES}
        speed={18}
        cards={9}
        axis={55}
        className="h-[560px] w-full max-w-6xl mx-auto rounded-xl bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-md"
      >
        <div className="relative z-10 flex h-full flex-col items-center justify-between py-12 px-6 text-center">
          <div className="px-6">
            <h1 className="text-balance text-4xl font-serif font-bold tracking-tight text-slate-900 sm:text-5xl">
              Mọi mô hình AI bạn cần,
              <br />
              ngay trên thanh bên.
            </h1>
          </div>
          <p className="max-w-md text-balance px-6 text-sm text-slate-600">
            Đưa toàn bộ ngữ cảnh duyệt web vào thẳng ChatGPT, Claude, Gemini, DeepSeek... Trò chuyện song song, không cần copy-paste hay API Key trả phí.
          </p>
        </div>
      </ImageStreamHero>
    </section>
  );
}

export default EcosystemHero;
