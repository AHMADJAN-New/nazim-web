# -*- coding: utf-8 -*-
"""
Unified Roll-Number Manager v3.8 - Nazim UI Standards
تمام فیچرونه:
 • د Excel له لارې واردول (شیټ + سرلیک کرښه)
 • خودکار ډکول (خالي نمبرې) — د تصدیق پیغام ښيي
 • د ټاکلو صنفونو لپاره د سلسلې ورکول — د تصدیق پیغام ښيي
 • د نقشې له مخې نمبرې مقررول (تر Save پورې په موډل کې ساتل)
 • د ټولو نمبرونو پاکول
 • Export to Excel
 • د بدلونونو ثبتول (یوازې students.roll_number)
 • secret-number یوازې ښودل کېږي، په ډیټابیس کې نه بدلېږي
 • Nazim UI Standards: Bahij fonts, dark blue colors, consistent layout
"""

import sys, pandas as pd
from PyQt5.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QGridLayout,
    QLabel,
    QComboBox,
    QPushButton,
    QFileDialog,
    QMessageBox,
    QSizePolicy,
    QCheckBox,
    QSpinBox,
    QTableView,
    QStyledItemDelegate,
    QInputDialog,
    QDialog,
    QDialogButtonBox,
    QScrollArea,
    QGroupBox,
    QFrame,
    QProgressDialog,
)
from PyQt5.QtGui import QFont, QColor, QPainter, QImage
from PyQt5.QtCore import Qt, QAbstractTableModel, QVariant
from PyQt5.QtWidgets import QHeaderView
from PyQt5.QtPrintSupport import QPrintDialog, QPrinter
from nazim.db_singleton import DBManager
import tempfile
import fitz  # PyMuPDF
import datetime


# ─── Custom picker dialog ─────────────────────────────────────
class PickerDialog(QDialog):
    def __init__(self, title, label_text, items, parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setMinimumSize(400, 180)
        self.setLayoutDirection(Qt.RightToLeft)
        
        # Nazim font standards
        label_font = QFont("Bahij Nassim", 14)
        label_font.setBold(True)
        input_font = QFont("Bahij Nassim", 12)
        label_color = "color: #0b0b56;"
        button_style = "background-color: #0b0b56; color: white;"
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        lbl = QLabel(label_text)
        lbl.setFont(label_font)
        lbl.setStyleSheet(label_color)
        layout.addWidget(lbl)

        self.combo = QComboBox()
        self.combo.addItems(items)
        self.combo.setFont(input_font)
        self.combo.setEditable(False)  # Nazim standard
        layout.addWidget(self.combo)

        bb = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        bb.setFont(input_font)
        # Apply Nazim button styling
        for button in bb.buttons():
            button.setStyleSheet(button_style)
        layout.addWidget(bb)
        bb.accepted.connect(self.accept)
        bb.rejected.connect(self.reject)

    def selected(self):
        return self.combo.currentText()


# ─── Header-row picker dialog ─────────────────────────────────
class HeaderDialog(QDialog):
    def __init__(self, max_rows, parent=None):
        super().__init__(parent)
        self.setWindowTitle("سرلیک کرښه وټاکئ")
        self.setMinimumSize(300, 160)
        self.setLayoutDirection(Qt.RightToLeft)
        
        # Nazim font standards
        label_font = QFont("Bahij Nassim", 14)
        label_font.setBold(True)
        input_font = QFont("Bahij Nassim", 12)
        label_color = "color: #0b0b56;"
        button_style = "background-color: #0b0b56; color: white;"
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        lbl = QLabel("سرلیک کرښه (۱ = لومړی):")
        lbl.setFont(label_font)
        lbl.setStyleSheet(label_color)
        layout.addWidget(lbl)

        self.spin = QSpinBox()
        self.spin.setRange(1, max_rows)
        self.spin.setValue(1)
        self.spin.setFont(input_font)
        layout.addWidget(self.spin)

        bb = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        bb.setFont(input_font)
        # Apply Nazim button styling
        for button in bb.buttons():
            button.setStyleSheet(button_style)
        layout.addWidget(bb)
        bb.accepted.connect(self.accept)
        bb.rejected.connect(self.reject)

    def value(self):
        return self.spin.value()


# ─── Table model ─────────────────────────────────────────────
class RollTableModel(QAbstractTableModel):
    HEADERS = ["ID", "نوم", "د پلار نوم", "صنف", "اصلي نمبر", "محرم #", "شمېرې"]

    def __init__(self, rows=None):
        super().__init__()
        self._data = rows or []
        # original roll stored to detect changes
        self._orig = {r["ID"]: r["اصلي نمبر"] for r in self._data}
        self._errors = set()

    def rowCount(self, _):
        return len(self._data)

    def columnCount(self, _):
        return len(self.HEADERS)

    def data(self, index, role=Qt.DisplayRole):
        if not index.isValid():
            return QVariant()
        row = self._data[index.row()]
        col = self.HEADERS[index.column()]
        val = row.get(col)
        if role in (Qt.DisplayRole, Qt.EditRole):
            return "" if val is None else str(val)
        if role == Qt.BackgroundRole and row["ID"] in self._errors:
            return QColor("#fdd")
        return QVariant()

    def headerData(self, sec, ori, role):
        if ori == Qt.Horizontal and role == Qt.DisplayRole:
            return self.HEADERS[sec]
        return QVariant()

    def flags(self, index):
        if not index.isValid():
            return Qt.ItemIsEnabled
        if self.HEADERS[index.column()] == "شمېرې":
            return Qt.ItemIsSelectable | Qt.ItemIsEnabled | Qt.ItemIsEditable
        return Qt.ItemIsSelectable | Qt.ItemIsEnabled

    def setData(self, index, value, role):
        if role != Qt.EditRole:
            return False
        col = self.HEADERS[index.column()]
        if col != "شمېرې":
            return False
        v = value.strip()
        self._data[index.row()][col] = int(v) if v.isdigit() else None
        self.dataChanged.emit(index, index)
        return True

    def mark_errors(self, ids):
        self._errors = set(ids)
        self.layoutChanged.emit()

    def clear_errors(self):
        self._errors.clear()
        self.layoutChanged.emit()

    def changed_rows(self):
        for r in self._data:
            if r["شمېرې"] != self._orig.get(r["ID"]):
                yield r["ID"], r["شمېرې"]


# ─── Main application ───────────────────────────────────────
class RollNumberManager(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("د امتحان د رقم الجلوس مدیریت")
        self.setGeometry(100, 100, 1200, 800)
        self.setLayoutDirection(Qt.RightToLeft)  # RTL support
        
        # Initialize Nazim UI standards
        self.initUI()
        
        # ─ Signals ───────────────────────────────────
        self.btn_import.clicked.connect(self.import_from_excel)
        self.btn_autofill.clicked.connect(self.auto_fill_missing)
        self.btn_map_assign.clicked.connect(self.assign_from_map)
        self.btn_range.clicked.connect(self.show_range_dialog)
        self.btn_clear.clicked.connect(self.clear_all_rolls)
        self.btn_export.clicked.connect(self.export_to_excel)
        self.btn_pdf.clicked.connect(self.export_to_pdf)
        self.btn_print.clicked.connect(self.print_table)
        self.btn_save.clicked.connect(self.save_changes)
        self.exam_cb.currentIndexChanged.connect(self.on_exam_changed)
        self.class_cb.currentIndexChanged.connect(self.reload_data)
        self.missing_chk.stateChanged.connect(self.apply_filter)

        # ─ Initialization ────────────────────────────
        self.load_exams()
        self.on_exam_changed(0)

    def initUI(self):
        """Initialize the user interface with Nazim standards - Two panel layout"""
        # Define Nazim standard fonts and colors
        self.label_font = QFont("Bahij Nassim", 14)
        self.label_font.setBold(True)
        self.input_font = QFont("Bahij Nassim", 12)
        self.title_font = QFont("Bahij Titr", 24)
        self.header_font = QFont("Bahij Nassim", 12)
        self.header_font.setBold(True)
        
        self.label_color = "color: #0b0b56;"  # Dark blue color for labels
        self.button_style = "background-color: #0b0b56; color: white;"  # Matching buttons
        self.title_color = "color: #0b0b56;"  # Dark blue for titles
        
        # Message box styling
        self.message_box_style = """
            QMessageBox {
                font-family: 'Bahij Nassim';
                font-size: 12pt;
            }
            QMessageBox QLabel {
                color: #0b0b56;
            }
            QMessageBox QPushButton {
                background-color: #0b0b56;
                color: white;
                font-size: 12pt;
                min-width: 80px;
            }
        """
        
        # Main widget and layout
        main_widget = QWidget(self)
        main_layout = QVBoxLayout(main_widget)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(5)

        # Title with separator
        title_label = QLabel("د امتحان د رقم الجلوس مدیریت")
        title_label.setFont(self.title_font)
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet(self.title_color)
        main_layout.addWidget(title_label)

        separator = QFrame(self)
        separator.setFrameShape(QFrame.HLine)
        separator.setFrameShadow(QFrame.Sunken)
        separator.setStyleSheet("color: #0b0b56;")
        separator.setLineWidth(1)
        main_layout.addWidget(separator)

        # Content layout (horizontal for left panel + main table)
        content_layout = QHBoxLayout()
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(10)

        # Left side: Controls panel
        left_panel = QWidget()
        left_panel.setFixedWidth(350)  # Fixed width for left panel
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(10)

        # Filters section
        filters_group = QGroupBox("فلټرونه")
        filters_group.setFont(self.label_font)
        filters_layout = QVBoxLayout()
        filters_layout.setContentsMargins(5, 5, 5, 5)
        filters_layout.setSpacing(5)

        # Exam filter
        exam_layout = QHBoxLayout()
        exam_layout.addWidget(self.create_label("امتحان:", self.label_font, self.label_color))
        self.exam_cb = QComboBox()
        self.exam_cb.setFont(self.input_font)
        self.exam_cb.setEditable(False)  # Nazim standard
        exam_layout.addWidget(self.exam_cb)
        filters_layout.addLayout(exam_layout)

        # Class filter
        class_layout = QHBoxLayout()
        class_layout.addWidget(self.create_label("صنف:", self.label_font, self.label_color))
        self.class_cb = QComboBox()
        self.class_cb.setFont(self.input_font)
        self.class_cb.setEditable(False)  # Nazim standard
        class_layout.addWidget(self.class_cb)
        filters_layout.addLayout(class_layout)

        # Missing numbers checkbox
        self.missing_chk = QCheckBox("یوازي خالي نمبرې")
        self.missing_chk.setFont(self.input_font)
        filters_layout.addWidget(self.missing_chk)

        filters_group.setLayout(filters_layout)
        left_layout.addWidget(filters_group)

        # Actions section
        actions_group = QGroupBox("عملیات")
        actions_group.setFont(self.label_font)
        actions_layout = QVBoxLayout()
        actions_layout.setContentsMargins(5, 5, 5, 5)
        actions_layout.setSpacing(8)

        # Import section
        import_group = QGroupBox("واردول")
        import_group.setFont(self.input_font)
        import_layout = QVBoxLayout()
        import_layout.setContentsMargins(5, 5, 5, 5)
        import_layout.setSpacing(5)
        
        self.btn_import = self.make_button("د Excel واردول")
        import_layout.addWidget(self.btn_import)
        import_group.setLayout(import_layout)
        actions_layout.addWidget(import_group)

        # Auto-fill section
        autofill_group = QGroupBox("خودکار ډکول")
        autofill_group.setFont(self.input_font)
        autofill_layout = QVBoxLayout()
        autofill_layout.setContentsMargins(5, 5, 5, 5)
        autofill_layout.setSpacing(5)
        
        self.btn_autofill = self.make_button("خالي ډکول")
        autofill_layout.addWidget(self.btn_autofill)
        
        # Start number
        start_layout = QHBoxLayout()
        start_layout.addWidget(self.create_label("پیل له:", self.input_font, self.label_color))
        self.spin_start = QSpinBox()
        self.spin_start.setRange(1, 9999)
        self.spin_start.setValue(1)
        self.spin_start.setFont(self.input_font)
        start_layout.addWidget(self.spin_start)
        autofill_layout.addLayout(start_layout)
        
        autofill_group.setLayout(autofill_layout)
        actions_layout.addWidget(autofill_group)

        # Assignment section
        assign_group = QGroupBox("د نمبرونو ورکول")
        assign_group.setFont(self.input_font)
        assign_layout = QVBoxLayout()
        assign_layout.setContentsMargins(5, 5, 5, 5)
        assign_layout.setSpacing(5)
        
        self.btn_map_assign = self.make_button("د نقشې له مخې")
        self.btn_range = self.make_button("د سلسلې ورکول")
        assign_layout.addWidget(self.btn_map_assign)
        assign_layout.addWidget(self.btn_range)
        assign_group.setLayout(assign_layout)
        actions_layout.addWidget(assign_group)

        # Management section
        manage_group = QGroupBox("مدیریت")
        manage_group.setFont(self.input_font)
        manage_layout = QVBoxLayout()
        manage_layout.setContentsMargins(5, 5, 5, 5)
        manage_layout.setSpacing(5)
        
        self.btn_clear = self.make_button("ټولې نمبرې پاکول")
        self.btn_export = self.make_button("Excel ته صادرول")
        self.btn_pdf = self.make_button("PDF راپور")
        self.btn_print = self.make_button("پرنټ")
        self.btn_save = self.make_button("تغییرات ثبتول")
        manage_layout.addWidget(self.btn_clear)
        manage_layout.addWidget(self.btn_export)
        manage_layout.addWidget(self.btn_pdf)
        manage_layout.addWidget(self.btn_print)
        manage_layout.addWidget(self.btn_save)
        manage_group.setLayout(manage_layout)
        actions_layout.addWidget(manage_group)

        actions_group.setLayout(actions_layout)
        left_layout.addWidget(actions_group)
        left_layout.addStretch()  # Push everything to top

        # Add left panel to content layout
        content_layout.addWidget(left_panel)

        # Right side: Table panel
        table_panel = QWidget()
        table_layout = QVBoxLayout(table_panel)
        table_layout.setContentsMargins(0, 0, 0, 0)
        table_layout.setSpacing(5)

        # Table section
        table_group = QGroupBox("د زده کوونکو شمېرې")
        table_group.setFont(self.label_font)
        table_inner_layout = QVBoxLayout()
        table_inner_layout.setContentsMargins(5, 5, 5, 5)
        table_inner_layout.setSpacing(5)

        self.table = QTableView()
        self.apply_table_style()
        self.model = RollTableModel([])
        self.table.setModel(self.model)
        delegate = QStyledItemDelegate()
        self.table.setItemDelegateForColumn(RollTableModel.HEADERS.index("شمېرې"), delegate)
        
        table_inner_layout.addWidget(self.table)
        table_group.setLayout(table_inner_layout)
        table_layout.addWidget(table_group)

        # Add table panel to content layout
        content_layout.addWidget(table_panel, 1)  # Stretch factor 1 for main area

        # Add content layout to main layout
        main_layout.addLayout(content_layout)

        self.setCentralWidget(main_widget)

    def create_label(self, text, font, color):
        """Helper method for creating consistent labels (Nazim standard)"""
        label = QLabel(text)
        label.setFont(font)
        label.setStyleSheet(color)
        return label

    def show_message_box(self, title, message, icon=QMessageBox.Information):
        """Helper method for consistent message boxes (Nazim standard)"""
        msg_box = QMessageBox(self)
        msg_box.setWindowTitle(title)
        msg_box.setText(message)
        msg_box.setIcon(icon)
        msg_box.setStyleSheet(self.message_box_style)
        msg_box.exec_()

    def make_button(self, text):
        """Create button with Nazim standards"""
        btn = QPushButton(text)
        btn.setFont(self.input_font)
        btn.setStyleSheet(self.button_style)
        return btn

    def apply_table_style(self):
        """Apply Nazim table styling standards"""
        self.table.setAlternatingRowColors(True)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        # Apply Nazim header font
        self.table.horizontalHeader().setFont(self.header_font)
        
        # Apply Nazim table styling
        self.table.setStyleSheet(
            """
            QTableView {
                background: white;
                font-family: 'Bahij Nassim';
                font-size: 12px;
                alternate-background-color: #f0f0f0;
                border: 1px solid #d0d0d0;
            }
            QHeaderView::section {
                background: #0b0b56;
                color: white;
                font-weight: bold;
                padding: 6px;
            }
            QTableView::item {
                text-align: center;
                padding: 6px;
            }
        """
        )

    def _get_columns_and_rows(self):
        """Get columns and rows data for report generation"""
        # Get column headers
        columns = [self.table.horizontalHeaderItem(i).text() 
                  for i in range(self.table.columnCount())]
        
        # Get row data
        rows = []
        for r in range(self.table.rowCount()):
            row = []
            for c in range(self.table.columnCount()):
                item = self.table.item(r, c)
                row.append(item.text() if item else "")
            rows.append(row)
        
        return columns, rows

    def _get_report_title(self):
        """Generate report title based on current filters"""
        parts = []
        
        # Add exam name
        exam_text = self.exam_cb.currentText()
        if exam_text and exam_text != "انتخاب":
            parts.append(f"امتحان: {exam_text}")
        
        # Add class name
        class_text = self.class_cb.currentText()
        if class_text and class_text != "ټول صنفونه":
            parts.append(f"صنف: {class_text}")
        
        # Add missing filter
        if self.missing_chk.isChecked():
            parts.append("یوازي خالي نمبرې")
        
        title = ("، ".join(parts) + " د امتحان د رقم الجلوس راپور") if parts else "د امتحان د رقم الجلوس راپور"
        return title

    def _get_custom_column_widths_a4(self):
        """Define custom column widths for A4 portrait (7 columns)"""
        return {
            "ID": 15.0,
            "نوم": 35.0,
            "د پلار نوم": 35.0,
            "صنف": 20.0,
            "اصلي نمبر": 20.0,
            "محرم #": 20.0,
            "شمېرې": 20.0
        }

    def _generate_enhanced_pdf(self, output_path: str, columns: list, rows: list, title: str) -> bool:
        """Generate PDF using Nazim report engine"""
        try:
            from nazim.reports.report_engine import create_a4_portrait_report
            
            return create_a4_portrait_report(
                output_path=output_path,
                columns=columns,
                rows=rows,
                table_title=title,
                custom_widths=self._get_custom_column_widths_a4()
            )
        except Exception as e:
            print(f"PDF generation error: {e}")
            return False

    # ─── Load Exams ───────────────────────────────────
    def load_exams(self):
        self.exam_cb.clear()
        self.exam_cb.addItem("انتخاب", None)
        with DBManager.get_cursor() as cur:
            cur.execute(
                "SELECT DISTINCT ce.exam_id,e.exam_name FROM ClassExams ce JOIN exams e ON ce.exam_id=e.id"
            )
            for eid, name in cur.fetchall():
                self.exam_cb.addItem(name, eid)

    # ─── Exam changed ────────────────────────────────
    def on_exam_changed(self, idx):
        eid = self.exam_cb.itemData(idx)
        self.class_cb.blockSignals(True)
        self.class_cb.clear()
        self.class_cb.addItem("ټول صنفونه", None)
        if eid:
            with DBManager.get_cursor() as cur:
                cur.execute(
                    "SELECT DISTINCT c.class_name FROM classes c JOIN ClassExams ce ON ce.class_id=c.id WHERE ce.exam_id=?",
                    eid,
                )
                for (cls,) in cur.fetchall():
                    self.class_cb.addItem(cls, cls)
        self.class_cb.blockSignals(False)
        self.reload_data()

    # ─── Reload table ───────────────────────────────
    def reload_data(self):
        eid = self.exam_cb.currentData()
        cls = self.class_cb.currentData()
        rows = []
        if eid:
            sql = """
                SELECT s.id, s.name, s.father_name, c.class_name,
                       s.roll_number,
                       ISNULL(esn.roll_number,'')
                  FROM Admissions a
                  JOIN students s ON s.id=a.student_id
                  JOIN ClassExams ce ON a.class_exam_id=ce.id
                  JOIN classes c ON ce.class_id=c.id
                  LEFT JOIN exam_secret_number esn
                    ON esn.student_id=s.id AND esn.exam_id=ce.exam_id
                 WHERE ce.exam_id=?
            """
            params = [eid]
            if cls:
                sql += " AND c.class_name=?"
                params.append(cls)
            sql += " ORDER BY c.class_name, s.id"
            with DBManager.get_cursor() as cur:
                cur.execute(sql, *params)
                rows = cur.fetchall()

        data = [
            {
                "ID": sid,
                "نوم": nm,
                "د پلار نوم": fn,
                "صنف": cl,
                "اصلي نمبر": rn,
                "محرم #": sn,
                "شمېرې": rn,
            }
            for sid, nm, fn, cl, rn, sn in rows
        ]

        self.model = RollTableModel(data)
        self.table.setModel(self.model)
        self.apply_filter()
        self.model.clear_errors()

    # ─── Filter missing ──────────────────────────────
    def apply_filter(self):
        hide = self.missing_chk.isChecked()
        col = RollTableModel.HEADERS.index("شمېرې")
        for r in range(self.model.rowCount(None)):
            idx = self.model.index(r, col)
            v = self.model.data(idx, Qt.DisplayRole)
            self.table.setRowHidden(r, bool(hide and v and v.strip()))

    # ─── 1) Import from Excel ───────────────────────
    def import_from_excel(self):
        fn, _ = QFileDialog.getOpenFileName(self, "Excel فایل وټاکئ", "", "Excel (*.xlsx)")
        if not fn:
            return
        xls = pd.ExcelFile(fn)
        if len(xls.sheet_names) == 1:
            sheet = xls.sheet_names[0]
        else:
            dlg = PickerDialog("شیټ وټاکئ", "د شیټ نوم وټاکئ:", xls.sheet_names, self)
            if dlg.exec_() != QDialog.Accepted:
                return
            sheet = dlg.selected()

        temp = pd.read_excel(fn, sheet_name=sheet, header=None)
        hdr = HeaderDialog(min(20, temp.shape[0]), self)
        if hdr.exec_() != QDialog.Accepted:
            return
        header_row = hdr.value() - 1

        df = pd.read_excel(fn, sheet_name=sheet, header=header_row)
        cols = [str(c) for c in df.columns]

        dlg_roll = PickerDialog("د نمبر ستنه", "د Roll # ستنه وټاکئ:", cols, self)
        if dlg_roll.exec_() != QDialog.Accepted:
            return
        roll_col = dlg_roll.selected()

        dlg_id = PickerDialog("د ID ستنه", "د ID ستنه وټاکئ:", cols, self)
        if dlg_id.exec_() != QDialog.Accepted:
            return
        id_col = dlg_id.selected()

        not_found = []
        for _, row in df.iterrows():
            sid = str(row[id_col]).strip()
            rn = str(row[roll_col]).strip()
            if sid.isdigit() and rn.isdigit():
                sid_i, rn_i = int(sid), int(rn)
                updated = False
                for r in range(self.model.rowCount(None)):
                    if self.model._data[r]["ID"] == sid_i:
                        self.model._data[r]["شمېرې"] = rn_i
                        updated = True
                        break
                if not updated:
                    not_found.append(sid_i)

        self.model.layoutChanged.emit()
        self.model.mark_errors(not_found)
        self.show_message_box(
            "واردول بشپړ شول",
            f"{self.model.rowCount(None)-len(not_found)} زده‌کوونکو شمېرې وارد شوې.\n"
            f"{len(not_found)} ونه موندل شول.",
        )

    # ─── 2) Auto-fill missing ───────────────────────
    def auto_fill_missing(self):
        start = self.spin_start.value()
        blanks = [r for r, row in enumerate(self.model._data) if row["شمېرې"] is None]
        if not blanks:
            self.show_message_box("خبرتیا", "ټول زده کوونکي نمبرې لري.")
            return
        end = start + len(blanks) - 1
        cls = self.class_cb.currentText() or "ټول صنفونه"
        msg = f"د «{cls}» لپاره {len(blanks)} زده کوونکو ته له {start} تر {end} پورې نمبرې ورکول کېږي.\nتصدیق؟"
        if (
            QMessageBox.question(self, "تصدیق", msg, QMessageBox.Yes | QMessageBox.No)
            != QMessageBox.Yes
        ):
            return
        for i, r in enumerate(blanks):
            self.model._data[r]["شمېرې"] = start + i
        self.model.layoutChanged.emit()
        self.show_message_box(
            "بریالی", f"{len(blanks)} زده کوونکو ته {start}–{end} ورکړل شول."
        )

    # ─── 3) Assign from map ──────────────────────────
    def assign_from_map(self):
        eid = self.exam_cb.currentData()
        if not eid:
            self.show_message_box("خطا", "لومړی امتحان وټاکئ.", QMessageBox.Warning)
            return
        with DBManager.get_cursor() as cur:
            cur.execute(
                "SELECT SeatingMapID,MapName FROM dbo.SeatingMaps WHERE ExamID=? ORDER BY CreatedAt DESC",
                eid,
            )
            maps = cur.fetchall()
        if not maps:
            self.show_message_box("خبرتیا", "د دې امتحان لپاره نقشه نشته.")
            return
        opts = [f"{mid} - {name}" for mid, name in maps]
        dlg = PickerDialog("نقشه وټاکئ", "نقشه وټاکئ:", opts, self)
        if dlg.exec_() != QDialog.Accepted:
            return
        sel = dlg.selected()
        mid = int(sel.split(" - ", 1)[0])

        with DBManager.get_cursor() as cur:
            cur.execute(
                "SELECT StudentID,SeatNumber FROM dbo.SeatAssignments WHERE SeatingMapID=?", mid
            )
            assigns = cur.fetchall()
        if not assigns:
            self.show_message_box("خبرتیا", "په نقشه کې کومه ټاکنه نشته.")
            return

        with DBManager.get_cursor() as cur:
            cur.execute(
                "SELECT student_id FROM Admissions a JOIN ClassExams ce ON a.class_exam_id=ce.id WHERE ce.exam_id=?",
                eid,
            )
            studs = {r[0] for r in cur.fetchall()}

        matched = [(sid, num) for sid, num in assigns if sid in studs]
        unmatched = len(assigns) - len(matched)
        msg = f"{len(matched)} وموندل شول، {unmatched} پاتې دي.\nتصدیق؟"
        if (
            QMessageBox.question(self, "تصدیق", msg, QMessageBox.Yes | QMessageBox.No)
            != QMessageBox.Yes
        ):
            return

        # Only update model; save_changes will commit to DB
        for sid, num in matched:
            for r, row in enumerate(self.model._data):
                if row["ID"] == sid:
                    self.model._data[r]["شمېرې"] = num
                    break
        self.model.layoutChanged.emit()
        self.show_message_box("بریالی", f"{len(matched)} زده کوونکو ته نمبرې ورکړل شوې.")

    # ─── 4) Assign range by class ───────────────────
    def show_range_dialog(self):
        eid = self.exam_cb.currentData()
        if not eid:
            self.show_message_box("خطا", "لومړی امتحان وټاکئ.", QMessageBox.Warning)
            return
        with DBManager.get_cursor() as cur:
            cur.execute(
                "SELECT DISTINCT c.class_name FROM classes c JOIN ClassExams ce ON ce.class_id=c.id WHERE ce.exam_id=?",
                eid,
            )
            classes = [r[0] for r in cur.fetchall()]

        dlg = QDialog(self)
        dlg.setWindowTitle("صنف(ونه) وټاکئ")
        dlg.setMinimumSize(400, 300)
        layout = QVBoxLayout(dlg)
        scroll = QScrollArea()
        inner = QWidget()
        vbox = QVBoxLayout(inner)
        self._cbs = []
        for cls in classes:
            cb = QCheckBox(cls)
            cb.setFont(QFont("Bahij Nassim", 14))
            vbox.addWidget(cb)
            self._cbs.append(cb)
        inner.setLayout(vbox)
        scroll.setWidget(inner)
        scroll.setWidgetResizable(True)
        layout.addWidget(scroll)
        bb = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        bb.setFont(QFont("Bahij Nassim", 14))
        layout.addWidget(bb)
        bb.accepted.connect(dlg.accept)
        bb.rejected.connect(dlg.reject)
        if dlg.exec_() != QDialog.Accepted:
            return

        picked = [cb.text() for cb in self._cbs if cb.isChecked()]
        if not picked:
            self.show_message_box("خطا", "هیڅ صنف ونه موندل شو.", QMessageBox.Warning)
            return

        start, ok = QInputDialog.getInt(
            self, "د سلسلې پیل", "شمېرې د دې څخه پیل شي:", self.spin_start.value(), 1, 9999
        )
        if not ok:
            return

        ph = ",".join("?" for _ in picked)
        sql = f"""
            SELECT s.id FROM Admissions a
            JOIN students s ON s.id=a.student_id
            JOIN ClassExams ce ON a.class_exam_id=ce.id
            JOIN classes c ON ce.class_id=c.id
            WHERE ce.exam_id=? AND c.class_name IN ({ph})
              AND (s.roll_number IS NULL OR s.roll_number='')
            ORDER BY c.class_name,s.id
        """
        params = [eid] + picked
        with DBManager.get_cursor() as cur:
            cur.execute(sql, *params)
            miss = [r[0] for r in cur.fetchall()]

        if not miss:
            self.show_message_box("خبرتیا", "په ټاکلو صنفونو کې خالي زده‌کوونکي نشته.")
            return

        end = start + len(miss) - 1
        cls_list = ", ".join(picked)
        msg = f"د صنف(ونو) {cls_list} لپاره {len(miss)} زده کوونکو ته له {start} تر {end} پورې نمبرې ورکول کېږي.\nتصدیق؟"
        if (
            QMessageBox.question(self, "تصدیق", msg, QMessageBox.Yes | QMessageBox.No)
            != QMessageBox.Yes
        ):
            return

        for i, sid in enumerate(miss):
            for r, row in enumerate(self.model._data):
                if row["ID"] == sid:
                    self.model._data[r]["شمېرې"] = start + i
                    break
        self.model.layoutChanged.emit()
        self.show_message_box(
            "بریالی", f"{len(miss)} زده کوونکو ته نمبرې ورکړل شوې: {start}–{end}."
        )

    # ─── 5) Clear all rolls ──────────────────────────
    def clear_all_rolls(self):
        eid = self.exam_cb.currentData()
        if not eid:
            self.show_message_box("خطا", "لومړی امتحان وټاکئ.", QMessageBox.Warning)
            return
        if QMessageBox.question(self, "تائید", "ټولې نمبرې پاک شي؟") != QMessageBox.Yes:
            return
        if QMessageBox.question(self, "دوهم تائید", "دې عمل نه شي بیرته ورتګ!") != QMessageBox.Yes:
            return

        conn = DBManager.get_connection()
        cur = conn.cursor()

        # Clear roll numbers from students table
        cur.execute(
            """UPDATE students SET roll_number=NULL
                       FROM students s
                       JOIN Admissions a ON a.student_id=s.id
                       JOIN ClassExams ce ON a.class_exam_id=ce.id
                       WHERE ce.exam_id=?""",
            eid,
        )

        # Clear roll numbers from exam_secret_number table
        cur.execute(
            """UPDATE exam_secret_number SET roll_number=NULL
                       WHERE exam_id=?""",
            eid,
        )

        conn.commit()
        self.show_message_box("پاک شول", "ټولې نمبرې پاکې شوې.")
        self.reload_data()

    # ─── 6) Export to Excel ─────────────────────────
    def export_to_excel(self):
        fn, _ = QFileDialog.getSaveFileName(self, "Excel ته صادرول", "", "Excel (*.xlsx)")
        if not fn:
            return
        data = [
            {
                "ID": r["ID"],
                "نوم": r["نوم"],
                "د پلار نوم": r["د پلار نوم"],
                "صنف": r["صنف"],
                "نمبر": r["شمېرې"],
                "محرم #": r["محرم #"],
            }
            for r in self.model._data
        ]
        df = pd.DataFrame(data)
        with pd.ExcelWriter(fn, engine="xlsxwriter") as w:
            df.to_excel(w, index=False, sheet_name="Rolls")
            ws = w.sheets["Rolls"]
            fmt = w.book.add_format(
                {
                    "font_name": "Bahij Nassim",
                    "font_size": 12,
                    "align": "center",
                    "valign": "vcenter",
                    "border": 1,
                }
            )
            ws.set_column("A:F", 20, fmt)
        self.show_message_box("صادر شو", "Excel فایل جوړ شو.")

    # ─── 7) Export to PDF ────────────────────────────
    def export_to_pdf(self):
        """Export table to PDF using Nazim report engine"""
        if self.model.rowCount(None) == 0:
            self.show_message_box("خبرتیا", "د صادرولو لپاره ډیټا نشته.")
            return
        
        # Get file path
        fn, _ = QFileDialog.getSaveFileName(
            self, "PDF ته صادرول", "", "PDF (*.pdf)"
        )
        if not fn:
            return
        
        # Collect data
        columns, rows = self._get_columns_and_rows()
        title = self._get_report_title()
        
        # Generate PDF with progress
        def generate_pdf_with_progress(output_path, progress_callback=None, cancel_check=None):
            return self._generate_enhanced_pdf(output_path, columns, rows, title)
        
        try:
            from nazim.core.pdf_progress import show_pdf_progress
            
            success = show_pdf_progress(
                parent=self,
                report_function=generate_pdf_with_progress,
                file_path=fn,
                show_completion=True
            )
            
            if success:
                self.show_message_box("بریا", "PDF راپور په بریالیتوب سره جوړ شو!")
            else:
                self.show_message_box("تېروتنه", "د PDF جوړولو کې تېروتنه وشوه.")
                
        except ImportError:
            # Fallback if progress module not available
            success = self._generate_enhanced_pdf(fn, columns, rows, title)
            if success:
                self.show_message_box("بریا", "PDF راپور په بریالیتوب سره جوړ شو!")
            else:
                self.show_message_box("تېروتنه", "د PDF جوړولو کې تېروتنه وشوه.")

    # ─── 8) Print table ──────────────────────────────
    def print_table(self):
        """Print table using QPrinter with PDF generation and progress bars"""
        if self.model.rowCount(None) == 0:
            self.show_message_box("خبرتیا", "د پرنټ لپاره ډیټا نشته.")
            return
        
        # Collect data
        columns, rows = self._get_columns_and_rows()
        title = self._get_report_title()
        
        # Create temporary PDF file
        temp_pdf_path = tempfile.mktemp(suffix='.pdf')
        
        # Generate PDF with progress
        def generate_pdf_with_progress(output_path, progress_callback=None, cancel_check=None):
            return self._generate_enhanced_pdf(output_path, columns, rows, title)
        
        try:
            from nazim.core.pdf_progress import show_pdf_progress
            
            # Show progress bar for PDF generation
            pdf_success = show_pdf_progress(
                parent=self,
                report_function=generate_pdf_with_progress,
                file_path=temp_pdf_path,
                show_completion=False
            )
            
            if not pdf_success:
                self.show_message_box("تېروتنه", "د PDF جوړولو کې تېروتنه وشوه.")
                return
            
            # Set up printer
            printer = QPrinter(QPrinter.HighResolution)
            printer.setPageSize(QPrinter.A4)
            printer.setOrientation(QPrinter.Portrait)  # A4 Portrait
            
            # Show print dialog
            dialog = QPrintDialog(printer, self)
            dialog.setWindowTitle("پرنټر غوره کړئ")
            if dialog.exec_() != QPrintDialog.Accepted:
                # Clean up temp file if user cancels
                try:
                    import os
                    if os.path.exists(temp_pdf_path):
                        os.remove(temp_pdf_path)
                except:
                    pass
                return
            
            # Print the PDF using QPainter (must be in main thread)
            try:
                # Show progress dialog for printing
                progress = QProgressDialog("پرنټ کېږي...", "لغوه کړئ", 0, 0, self)
                progress.setWindowModality(Qt.WindowModal)
                progress.setCancelButton(None)  # Disable cancel for printing
                progress.show()
                
                # Process events to show progress dialog
                QApplication.processEvents()
                
                # Open the PDF with PyMuPDF
                pdf_doc = fitz.Document(temp_pdf_path)
                painter = QPainter(printer)
                painter.setRenderHint(QPainter.Antialiasing)
                
                total_pages = len(pdf_doc)
                for page_num in range(total_pages):
                    # Update progress
                    progress.setLabelText(f"د پاڼې {page_num + 1} پرنټ کېږي...")
                    QApplication.processEvents()
                    
                    if page_num > 0:
                        printer.newPage()
                    
                    # Load the page
                    page = pdf_doc.load_page(page_num)
                    
                    # Render page to pixmap with high resolution
                    matrix = fitz.Matrix(2, 2)  # 2x scaling for better quality
                    pixmap = page.get_pixmap(matrix=matrix)
                    
                    # Convert to QImage
                    img_data = pixmap.tobytes("png")
                    image = QImage.fromData(img_data)
                    
                    # Scale to fit printer page
                    printer_rect = painter.viewport()
                    scaled_image = image.scaled(
                        printer_rect.size(), 
                        Qt.KeepAspectRatio, 
                        Qt.SmoothTransformation
                    )
                    
                    # Center the image on the page
                    x = (printer_rect.width() - scaled_image.width()) // 2
                    y = (printer_rect.height() - scaled_image.height()) // 2
                    
                    painter.drawImage(x, y, scaled_image)
                    
                    # Process events to keep UI responsive
                    QApplication.processEvents()
                
                painter.end()
                pdf_doc.close()
                progress.close()
                
                self.show_message_box("بریا", "پرنټ په بریالیتوب سره بشپړ شو!")
                
            except Exception as e:
                try:
                    progress.close()
                except:
                    pass
                self.show_message_box("تېروتنه", f"پرنټ کولو کې تېروتنه وشوه: {e}")
            
            finally:
                # Clean up temporary file
                try:
                    import os
                    if os.path.exists(temp_pdf_path):
                        os.remove(temp_pdf_path)
                except:
                    pass
                    
        except ImportError:
            # Fallback if progress module not available
            self.show_message_box("تېروتنه", "د پرنټ ماډول شتون نلري.")

    # ─── 9) Save changes ─────────────────────────────
    def save_changes(self):
        eid = self.exam_cb.currentData()
        if not eid:
            self.show_message_box("خطا", "لومړی امتحان وټاکئ.", QMessageBox.Warning)
            return

        conn = DBManager.get_connection()
        cur = conn.cursor()

        # Get exam data for students
        exam_students = {}
        sql = """
            SELECT s.id, s.name, s.father_name, c.class_name, s.roll_number,
                   ISNULL(esn.roll_number,'') as exam_roll, esn.room
              FROM Admissions a
              JOIN students s ON s.id=a.student_id
              JOIN ClassExams ce ON a.class_exam_id=ce.id
              JOIN classes c ON ce.class_id=c.id
              LEFT JOIN exam_secret_number esn
                ON esn.student_id=s.id AND esn.exam_id=ce.exam_id
             WHERE ce.exam_id=?
        """
        params = [eid]
        if self.class_cb.currentData():
            sql += " AND c.class_name=?"
            params.append(self.class_cb.currentData())

        cur.execute(sql, *params)
        for sid, name, father_name, class_name, student_roll, exam_roll, room in cur.fetchall():
            exam_students[sid] = {
                'name': name,
                'father_name': father_name,
                'class_name': class_name,
                'student_roll': student_roll,
                'exam_roll': exam_roll,
                'room': room
            }

        # Update both students table and exam_secret_number table
        for sid, new_roll in self.model.changed_rows():
            if new_roll is None:
                continue

            # Update students table
            cur.execute("UPDATE students SET roll_number=? WHERE id=?", new_roll, sid)

            # Update or insert exam_secret_number table
            student_data = exam_students.get(sid)
            if student_data:
                # Check if record exists in exam_secret_number
                cur.execute("SELECT COUNT(*) FROM exam_secret_number WHERE student_id=? AND exam_id=?",
                           sid, eid)
                exists = cur.fetchone()[0] > 0

                if exists:
                    # Update existing record
                    cur.execute("""
                        UPDATE exam_secret_number
                        SET roll_number=?, name=?, father_name=?, [class]=?, room=?
                        WHERE student_id=? AND exam_id=?
                    """, (
                        new_roll,
                        student_data['name'],
                        student_data['father_name'],
                        student_data['class_name'],
                        student_data['room'] or '',
                        sid,
                        eid
                    ))
                else:
                    # Insert new record
                    cur.execute("""
                        INSERT INTO exam_secret_number
                        (student_id, roll_number, name, father_name, [class], room, exam_id, secret_number)
                        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
                    """, (
                        sid,
                        new_roll,
                        student_data['name'],
                        student_data['father_name'],
                        student_data['class_name'],
                        student_data['room'] or '',
                        eid
                    ))

        conn.commit()
        self.show_message_box("ثبت شو", "ټولې تغیرات ثبت شول.")
        self.reload_data()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    try:
        from nazim.core.qt_startup import prime_desktop
        prime_desktop()
    except Exception:
        pass
    app.setFont(QFont("Bahij Nassim", 12))  # Nazim standard input font
    window = RollNumberManager()
    window.show()
    sys.exit(app.exec_())
