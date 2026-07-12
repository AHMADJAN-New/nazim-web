# ────────────────────────────────────────────────────────────────────────────────
# SeatingMapReportDialog.py
# ────────────────────────────────────────────────────────────────────────────────

from PyQt5.QtCore import Qt, QSizeF, QUrl, QMarginsF
from PyQt5.QtGui import QPageLayout, QPageSize
from PyQt5.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QFileDialog,
    QProgressDialog,
    QMessageBox,
)
from PyQt5.QtPrintSupport import QPrintDialog
from PyQt5.QtWebEngineWidgets import QWebEngineView


class SeatingMapReportDialog(QDialog):
    def __init__(self, html: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle("د رقم الجلوس نقشه راپور")
        self.resize(900, 700)

        # Web view
        self.view = QWebEngineView(self)
        self.view.setHtml(html, QUrl("about:blank"))

        # Buttons
        btn_print = QPushButton("Print")
        btn_pdf = QPushButton("Save as PDF")
        btn_close = QPushButton("Close")
        btn_print.clicked.connect(self.print_dialog)
        btn_pdf.clicked.connect(self.save_pdf)
        btn_close.clicked.connect(self.close)

        # Layout
        btnlay = QHBoxLayout()
        btnlay.addWidget(btn_print)
        btnlay.addWidget(btn_pdf)
        btnlay.addStretch()
        btnlay.addWidget(btn_close)

        lay = QVBoxLayout(self)
        lay.addWidget(self.view, 1)
        lay.addLayout(btnlay)

    def print_dialog(self):
        dlg = QPrintDialog(self)
        if dlg.exec_() == QPrintDialog.Accepted:
            printer = dlg.printer()
            self.view.page().print(printer, lambda ok: None)

    def save_pdf(self):
        # 1) Ask for filename
        path, _ = QFileDialog.getSaveFileName(
            self, "Save HTML Report as PDF", "", "PDF Files (*.pdf)"
        )
        if not path:
            return
        if not path.lower().endswith(".pdf"):
            path += ".pdf"

        progress = QProgressDialog("Generating PDF…", None, 0, 0, self)
        progress.setWindowModality(Qt.WindowModal)
        progress.show()

        # 2) Measure height in px
        def got_height(h_px):
            pt_per_px = 72.0 / 96.0
            height_pt = h_px * pt_per_px
            w_px = self.view.page().contentsSize().width()
            width_pt = w_px * pt_per_px

            # 3) Build a zero-margin page layout of exactly that size
            layout = QPageLayout()
            layout.setUnits(QPageLayout.Point)
            layout.setPageSize(QPageSize(QSizeF(width_pt, height_pt), QPageSize.Point))
            layout.setOrientation(QPageLayout.Portrait)
            layout.setMargins(QMarginsF(0, 0, 0, 0))

            # 4) Render to PDF
            def on_pdf_ready(pdf_bytes):
                progress.close()
                try:
                    with open(path, "wb") as f:
                        f.write(pdf_bytes)
                    QMessageBox.information(self, "Saved", f"PDF saved to:\n{path}")
                except Exception as e:
                    QMessageBox.critical(self, "Error", str(e))

            self.view.page().printToPdf(on_pdf_ready, layout)

        # run JS to get the document height
        self.view.page().runJavaScript("document.body.scrollHeight", got_height)
