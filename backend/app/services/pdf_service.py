"""PDF Processing Service using PyMuPDF (fitz).
Extracts text page-by-page, preserving 1-indexed page numbers for citation.
"""

import fitz  # PyMuPDF
import re
from typing import List, Tuple
from ..models.schemas import MaterialPage

class PDFProcessingError(Exception):
    pass

class PDFService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes, filename: str = "document.pdf") -> Tuple[List[MaterialPage], int]:
        """
        Extract text from PDF bytes.
        Returns:
            Tuple of (List[MaterialPage], total_words)
        Raises:
            PDFProcessingError if file is invalid, corrupted, or contains no extractable text.
        """
        if not file_bytes:
            raise PDFProcessingError("Uploaded file is empty (0 bytes).")

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise PDFProcessingError(f"Could not open file as PDF: {str(e)}")

        if doc.page_count == 0:
            doc.close()
            raise PDFProcessingError("The uploaded PDF file contains 0 pages.")

        pages: List[MaterialPage] = []
        total_words = 0

        for page_idx in range(doc.page_count):
            try:
                page = doc.load_page(page_idx)
                raw_text = page.get_text("text") or ""
                # Normalize line breaks and spaces while preserving paragraph breaks
                cleaned_text = re.sub(r'[ \t]+', ' ', raw_text).strip()
                words = cleaned_text.split()
                word_count = len(words)
                total_words += word_count

                pages.append(MaterialPage(
                    page_number=page_idx + 1,
                    text=cleaned_text,
                    word_count=word_count
                ))
            except Exception as e:
                # If a page fails to load, still preserve page slot with note
                pages.append(MaterialPage(
                    page_number=page_idx + 1,
                    text=f"[Error reading page {page_idx + 1}: {str(e)}]",
                    word_count=0
                ))

        doc.close()

        # Check if document has selectable text
        if total_words < 10:
            raise PDFProcessingError(
                "No selectable text could be extracted from this PDF. "
                "Scanned or image-only PDFs without an OCR text layer are not supported. "
                "Please upload a PDF containing selectable text or paste your study notes directly."
            )

        return pages, total_words

pdf_service = PDFService()
