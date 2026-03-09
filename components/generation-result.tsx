"use client";

import { useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import type { GeneratedEssay } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GenerationResultProps {
  result: GeneratedEssay;
  onRegenerateNatural: () => Promise<void>;
  loading: boolean;
}

export function GenerationResult({
  result,
  onRegenerateNatural,
  loading,
}: GenerationResultProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  function buildPdfNode() {
    const wrapper = document.createElement("div");
    wrapper.style.background = "#ffffff";
    wrapper.style.color = "#111111";
    wrapper.style.fontFamily = "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
    wrapper.style.fontSize = "14px";
    wrapper.style.lineHeight = "1.6";
    wrapper.style.padding = "24px";
    wrapper.style.maxWidth = "780px";

    const title = document.createElement("h1");
    title.textContent = result.title;
    title.style.fontSize = "22px";
    title.style.margin = "0 0 16px 0";
    wrapper.appendChild(title);

    result.sections.forEach((section, index) => {
      const question = document.createElement("h2");
      question.textContent = `${index + 1}. ${section.question}`;
      question.style.fontSize = "16px";
      question.style.margin = "0 0 8px 0";
      wrapper.appendChild(question);

      const answer = document.createElement("p");
      answer.textContent = section.answer;
      answer.style.margin = "0 0 16px 0";
      answer.style.whiteSpace = "pre-wrap";
      wrapper.appendChild(answer);
    });

    if (result.overallTip) {
      const tipTitle = document.createElement("h2");
      tipTitle.textContent = "보완 팁";
      tipTitle.style.fontSize = "16px";
      tipTitle.style.margin = "8px 0";
      wrapper.appendChild(tipTitle);

      const tip = document.createElement("p");
      tip.textContent = result.overallTip;
      tip.style.margin = "0";
      tip.style.whiteSpace = "pre-wrap";
      wrapper.appendChild(tip);
    }

    return wrapper;
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("복사되었습니다.");
  }

  async function downloadPdf() {
    if (!pdfRef.current) {
      return;
    }

    setDownloading(true);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf =
        (html2pdfModule as unknown as { default?: unknown }).default ??
        (html2pdfModule as unknown);

      if (typeof html2pdf !== "function") {
        throw new Error("html2pdf 모듈 로딩에 실패했습니다.");
      }

      // Create an isolated iframe to avoid dark-mode / inherited style issues
      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-10000px";
      iframe.style.left = "-10000px";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      iframe.style.border = "none";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("PDF 생성용 프레임을 만들 수 없습니다.");
      }

      // Write a clean HTML document with explicit light-mode styles
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #ffffff !important;
      color: #111111 !important;
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
    }
  </style>
</head>
<body></body>
</html>`);
      iframeDoc.close();

      // Build the PDF content node and append into the isolated iframe body
      const pdfNode = buildPdfNode();
      pdfNode.style.width = "100%";
      iframeDoc.body.appendChild(pdfNode);

      // Wait for the iframe content to fully render (fonts, layout)
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        }, 300);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdf as any)()
        .from(iframeDoc.body)
        .set({
          margin: 10,
          filename: `jasoseovibe-${new Date().toISOString().slice(0, 10)}.pdf`,
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            backgroundColor: "#ffffff",
            windowWidth: 794,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();
      toast.success("PDF 다운로드가 완료되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "PDF 생성 중 오류가 발생했습니다.",
      );
    } finally {
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{result.title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadPdf} disabled={downloading}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={onRegenerateNatural} disabled={loading}>
            더 자연스럽게
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={pdfRef} className="space-y-4 rounded-md bg-white p-2">
          <Accordion type="multiple" className="w-full">
            {result.sections.map((section, index) => (
              <AccordionItem value={`item-${index}`} key={`${section.question}-${index}`}>
                <AccordionTrigger>{section.question}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap text-zinc-700">{section.answer}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyText(section.answer)}
                    >
                      <Copy className="h-4 w-4" /> 복사
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {result.overallTip ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-medium">보완 팁</p>
              <p>{result.overallTip}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
