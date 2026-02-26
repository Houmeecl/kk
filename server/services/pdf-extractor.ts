import pdfParse from "pdf-parse";

export interface ExtractedData {
  text: string;
  metadata: {
    pages: number;
    info: any;
  };
}

export class PdfExtractor {
  async extractFromBuffer(buffer: Buffer): Promise<ExtractedData> {
    try {
      const pdf = (pdfParse as any).default || pdfParse;
      const data = await pdf(buffer);
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
        }
      };
    } catch (error) {
      console.error("Error extrayendo PDF:", error);
      throw new Error("No se pudo extraer el texto del archivo PDF.");
    }
  }
}

export const pdfExtractor = new PdfExtractor();