declare module "html2pdf.js" {
  interface Html2PdfInstance {
    from(source: HTMLElement): Html2PdfInstance;
    set(options: {
      margin?: number;
      filename?: string;
      html2canvas?: { scale?: number; useCORS?: boolean; letterRendering?: boolean; backgroundColor?: string; windowWidth?: number };
      jsPDF?: { unit?: string; format?: string; orientation?: string };
    }): Html2PdfInstance;
    save(): Promise<void>;
  }

  interface Html2PdfFactory {
    (): Html2PdfInstance;
  }

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
