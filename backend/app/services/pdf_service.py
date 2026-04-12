"""
Convierte documentos Word (.docx) a PDF usando LibreOffice headless
y fusiona múltiples PDFs en uno solo.
"""
import io
import os
import subprocess
import tempfile

from pypdf import PdfWriter


def _docx_bytes_to_pdf(docx_bytes: bytes) -> bytes:
    """Convierte bytes de .docx a bytes de .pdf via LibreOffice headless."""
    with tempfile.TemporaryDirectory() as tmpdir:
        docx_path = os.path.join(tmpdir, "document.docx")
        with open(docx_path, "wb") as f:
            f.write(docx_bytes)

        env = os.environ.copy()
        env["HOME"] = tmpdir  # LibreOffice necesita un HOME escribible

        subprocess.run(
            [
                "libreoffice", "--headless",
                "--convert-to", "pdf",
                "--outdir", tmpdir,
                docx_path,
            ],
            check=True,
            capture_output=True,
            timeout=120,
            env=env,
        )

        pdf_path = os.path.join(tmpdir, "document.pdf")
        with open(pdf_path, "rb") as f:
            return f.read()


def merge_pdfs(pdf_bytes_list: list[bytes]) -> bytes:
    """Fusiona una lista de PDFs (bytes) en un solo PDF."""
    writer = PdfWriter()
    tmp_files = []
    try:
        for pdf_bytes in pdf_bytes_list:
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            tmp.write(pdf_bytes)
            tmp.flush()
            tmp.close()
            tmp_files.append(tmp.name)
            writer.append(tmp.name)

        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()
    finally:
        for path in tmp_files:
            try:
                os.unlink(path)
            except OSError:
                pass


def generate_pdf_from_words(carta_docx: bytes, cotizacion_docx: bytes) -> bytes:
    """
    Convierte cada Word a PDF y los fusiona:
    carta.pdf + cotizacion.pdf → pdf_combinado.pdf
    """
    carta_pdf      = _docx_bytes_to_pdf(carta_docx)
    cotizacion_pdf = _docx_bytes_to_pdf(cotizacion_docx)
    return merge_pdfs([carta_pdf, cotizacion_pdf])
