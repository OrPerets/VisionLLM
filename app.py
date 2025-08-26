import sys
from PySide6.QtWidgets import (
    QApplication, QWidget, QTabWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QPlainTextEdit, QTextEdit, QLabel, QComboBox, QProgressBar,
    QCheckBox, QFileDialog, QSplitter, QFrame, QToolBar, QMenuBar, QMenu,
    QDialog, QLineEdit, QListWidget, QListWidgetItem, QGraphicsDropShadowEffect
)
from PySide6.QtCore import Qt, QObject, Signal, QThread, QTimer, QSettings
from PySide6.QtGui import QShortcut, QKeySequence, QFont, QSyntaxHighlighter, QTextCharFormat, QAction, QIcon, QColor

import qtawesome as qta

try:  # Frameless window support
    from qframelesswindow import FramelessWindow
    QF_AVAILABLE = True
except Exception:  # pragma: no cover - library optional
    FramelessWindow = QWidget  # type: ignore
    QF_AVAILABLE = False

from llm import LLM, CancelledError
from prompts import SYSTEM_PROMPT, ETL_BLUEPRINT_TEMPLATE
from config import (
    DEFAULT_SOURCE_DIALECT, DEFAULT_TARGET_DIALECT, DEFAULT_LINT_DIALECT,
    UI_DEFAULT_STREAM, UI_LOGS_OPEN, THEME,
    UI_USE_FLUENT, UI_FRAMELESS, UI_ACRYLIC, UI_ENABLE_ANIMATIONS,
    ACCENT_COLOR, NEUTRALS, BORDER_RADIUS, SPACING, SPACING_HALF, FONT_SIZES
)
from tools.sql_tools import transpile_sql, lint_sql
import sqlfluff
import re
import markdown

BaseWindow = FramelessWindow if UI_FRAMELESS and QF_AVAILABLE else QWidget

# --------------------------------------
# Helpers
# --------------------------------------

def show_toast(widget: QWidget, message: str, timeout_ms: int = 1200) -> None:
    """Show a small non-blocking toast label near widget's top-right."""
    try:
        label = QLabel(message, widget)
        label.setStyleSheet(
            """
            QLabel {
                background-color: rgba(60, 60, 60, 210);
                color: #ffffff;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 12px;
            }
            """
        )
        label.adjustSize()
        # Position near top-right within parent widget
        margin = 12
        x = max(0, widget.width() - label.width() - margin)
        y = margin
        label.move(x, y)
        label.setAttribute(Qt.WA_TransparentForMouseEvents, True)
        label.show()
        if UI_ENABLE_ANIMATIONS:
            QTimer.singleShot(timeout_ms, label.deleteLater)
        else:
            QTimer.singleShot(timeout_ms, lambda: label.hide())
    except Exception:
        # Silent fail; toast is non-critical
        pass


def apply_card_surface(widget: QWidget, theme: str) -> None:
    """Give widget a card-like surface with shadow."""
    palette = NEUTRALS.get(theme, NEUTRALS["light"])
    widget.setStyleSheet(
        f"background-color: {palette['surface']}; border: none; border-radius: {BORDER_RADIUS}px;"
    )
    effect = QGraphicsDropShadowEffect(widget)
    effect.setBlurRadius(12)
    effect.setOffset(0, 2)
    effect.setColor(QColor(0, 0, 0, 40))
    widget.setGraphicsEffect(effect)

class SqlSyntaxHighlighter(QSyntaxHighlighter):
    """SQL syntax highlighter for code blocks."""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.highlighting_rules = []
        
        # SQL keywords
        keyword_format = QTextCharFormat()
        keyword_format.setForeground(Qt.blue)
        keyword_format.setFontWeight(QFont.Bold)
        
        keywords = [
            r'\bSELECT\b', r'\bFROM\b', r'\bWHERE\b', r'\bJOIN\b', r'\bINNER\b', r'\bLEFT\b', r'\bRIGHT\b',
            r'\bON\b', r'\bGROUP\b', r'\bBY\b', r'\bORDER\b', r'\bHAVING\b', r'\bINSERT\b', r'\bUPDATE\b',
            r'\bDELETE\b', r'\bCREATE\b', r'\bTABLE\b', r'\bINDEX\b', r'\bVIEW\b', r'\bDROP\b', r'\bALTER\b',
            r'\bAND\b', r'\bOR\b', r'\bNOT\b', r'\bIN\b', r'\bLIKE\b', r'\bBETWEEN\b', r'\bIS\b', r'\bNULL\b',
            r'\bAS\b', r'\bDISTINCT\b', r'\bUNION\b', r'\bEXISTS\b', r'\bCASE\b', r'\bWHEN\b', r'\bTHEN\b',
            r'\bELSE\b', r'\bEND\b', r'\bWITH\b', r'\bCTE\b'
        ]
        
        for keyword in keywords:
            self.highlighting_rules.append((re.compile(keyword, re.IGNORECASE), keyword_format))
        
        # String literals
        string_format = QTextCharFormat()
        string_format.setForeground(Qt.darkGreen)
        self.highlighting_rules.append((re.compile(r"'[^']*'"), string_format))
        
        # Numbers
        number_format = QTextCharFormat()
        number_format.setForeground(Qt.darkMagenta)
        self.highlighting_rules.append((re.compile(r'\b\d+\.?\d*\b'), number_format))
        
        # Comments
        comment_format = QTextCharFormat()
        comment_format.setForeground(Qt.gray)
        comment_format.setFontItalic(True)
        self.highlighting_rules.append((re.compile(r'--[^\n]*'), comment_format))
        self.highlighting_rules.append((re.compile(r'/\*.*\*/'), comment_format))
    
    def highlightBlock(self, text):
        for pattern, format in self.highlighting_rules:
            for match in pattern.finditer(text):
                start, end = match.span()
                self.setFormat(start, end - start, format)

class MarkdownRenderer:
    """Converts markdown text to HTML for rich text display."""
    
    def __init__(self):
        self.md = markdown.Markdown(extensions=['codehilite', 'fenced_code', 'tables'])
    
    def render(self, text):
        """Convert markdown to HTML."""
        # First convert markdown to HTML
        html = self.md.convert(text)
        
        # Add some basic styling for better appearance
        styled_html = f"""
        <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui; 
            font-size: 14px; 
            line-height: 1.6; 
            color: #1f2937;
        }}
        code {{ 
            background-color: #f1f5f9; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 13px;
        }}
        pre {{ 
            background-color: #f8fafc; 
            padding: 12px; 
            border-radius: 6px; 
            border-left: 4px solid #2563eb;
            overflow-x: auto;
        }}
        pre code {{ 
            background-color: transparent; 
            padding: 0;
        }}
        h1, h2, h3 {{ color: #1f2937; font-weight: 600; }}
        h1 {{ font-size: 18px; margin: 16px 0 8px 0; }}
        h2 {{ font-size: 16px; margin: 12px 0 6px 0; }}
        h3 {{ font-size: 14px; margin: 8px 0 4px 0; }}
        ul, ol {{ margin: 8px 0; padding-left: 20px; }}
        li {{ margin: 2px 0; }}
        strong {{ font-weight: 600; }}
        em {{ font-style: italic; color: #4b5563; }}
        blockquote {{ 
            margin: 8px 0; 
            padding: 8px 12px; 
            background-color: #f9fafb; 
            border-left: 3px solid #d1d5db;
            font-style: italic;
        }}
        table {{ border-collapse: collapse; width: 100%; margin: 8px 0; }}
        th, td {{ border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }}
        th {{ background-color: #f9fafb; font-weight: 600; }}
        </style>
        <body>{html}</body>
        """
        
        return styled_html

class RichTextOutput(QTextEdit):
    """Rich text output area with markdown rendering."""
    
    def __init__(self):
        super().__init__()
        self.setReadOnly(True)
        self.setPlaceholderText("Model responses will appear here…")
        self.setMinimumHeight(200)
        self.renderer = MarkdownRenderer()
        self._streaming_buffer = ""
        
        # Timer to batch streaming updates for better performance
        self.update_timer = QTimer()
        self.update_timer.setSingleShot(True)
        self.update_timer.timeout.connect(self._update_display)
    
    def append_streaming_text(self, text):
        """Append streaming text with batched updates."""
        self._streaming_buffer += text
        # Batch updates every 50ms for smooth streaming without lag
        self.update_timer.start(50)
    
    def _update_display(self):
        """Update the display with batched streaming content."""
        if self._streaming_buffer:
            # For streaming, just append as plain text to avoid re-rendering overhead
            cursor = self.textCursor()
            cursor.movePosition(cursor.End)
            cursor.insertText(self._streaming_buffer)
            self._streaming_buffer = ""
            self.verticalScrollBar().setValue(self.verticalScrollBar().maximum())
    
    def set_final_text(self, text):
        """Set final text with full markdown rendering."""
        try:
            # Check if text contains markdown elements
            has_markdown = any(marker in text for marker in ['**', '*', '`', '#', '```', '|', '- ', '1.'])
            
            if has_markdown:
                html = self.renderer.render(text)
                self.setHtml(html)
            else:
                # Use plain text for simple responses
                self.setPlainText(text)
        except Exception:
            # Fallback to plain text if markdown rendering fails
            self.setPlainText(text)
        
        # Clear streaming buffer
        self._streaming_buffer = ""
        self.update_timer.stop()
    
    def clear_content(self):
        """Clear all content."""
        self.clear()
        self._streaming_buffer = ""
        self.update_timer.stop()

    def contextMenuEvent(self, event):
        """Extend context menu with copy/export ergonomics."""
        menu = self.createStandardContextMenu()
        menu.addSeparator()

        def copy_markdown():
            text = self.toPlainText().strip()
            if not text:
                return
            QApplication.clipboard().setText(text)
            show_toast(self, "Copied!")

        def copy_code_blocks():
            text = self.toPlainText()
            blocks = re.findall(r"```[a-zA-Z0-9_-]*\n([\s\S]*?)```", text)
            if blocks:
                joined = ("\n\n").join([b.strip() for b in blocks if b.strip()])
                QApplication.clipboard().setText(joined)
                show_toast(self, "Copied!")
            else:
                QApplication.clipboard().setText(text.strip())
                show_toast(self, "Copied!")

        def save_as_sql():
            content = self.toPlainText().strip()
            if not content:
                return
            path, _ = QFileDialog.getSaveFileName(self, "Save as .sql", "output.sql", "SQL Files (*.sql)")
            if not path:
                return
            try:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                show_toast(self, "Saved")
            except Exception:
                pass

        a1 = QAction("Copy as Markdown", self)
        a1.setToolTip("Copy plain text content")
        a1.triggered.connect(copy_markdown)
        menu.addAction(a1)

        a2 = QAction("Copy code blocks", self)
        a2.setToolTip("Extract fenced code blocks and copy")
        a2.triggered.connect(copy_code_blocks)
        menu.addAction(a2)

        a3 = QAction("Save as .sql", self)
        a3.setToolTip("Save content to a .sql file")
        a3.triggered.connect(save_as_sql)
        menu.addAction(a3)

        menu.exec(event.globalPos())

class ChatWorker(QObject):
    delta = Signal(str)
    finished = Signal(str, dict)
    error = Signal(str)

    def __init__(self, llm: LLM, system: str, user: str, history, stream: bool, should_cancel=None):
        super().__init__()
        self.llm = llm
        self.system = system
        self.user = user
        self.history = history
        self.stream = stream
        self.should_cancel = should_cancel or (lambda: False)

    def run(self):
        try:
            if self.stream:
                text, meta = self.llm.chat_with_meta(
                    self.system,
                    self.user,
                    history=self.history,
                    stream=True,
                    on_delta=lambda d: self.delta.emit(d),
                    should_cancel=self.should_cancel,
                )
            else:
                text, meta = self.llm.chat_with_meta(
                    self.system,
                    self.user,
                    history=self.history,
                    stream=False,
                    should_cancel=self.should_cancel,
                )
            self.finished.emit(text, meta)
        except CancelledError as ce:
            # Surface partial text without error state
            try:
                self.finished.emit(getattr(ce, "partial_text", ""), getattr(ce, "meta", {"cancelled": True}))
            except Exception:
                self.finished.emit("", {"cancelled": True})
        except Exception as e:
            self.error.emit(str(e))


class CommandPalette(QDialog):
    """Lightweight command palette with fuzzy filtering."""
    triggered = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setModal(True)
        self.setWindowTitle("Command Palette")
        self.setWindowFlag(Qt.FramelessWindowHint, True)
        self.setFixedSize(420, 300)

        layout = QVBoxLayout()
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(8)

        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText("Type a command…")
        self.filter_edit.setClearButtonEnabled(True)
        layout.addWidget(self.filter_edit)

        self.list_widget = QListWidget()
        layout.addWidget(self.list_widget)

        self.setLayout(layout)

        self._actions = [
            ("Send", "send", "fa5s.paper-plane"),
            ("New Chat", "new_chat", "fa5s.comments"),
            ("Lint & Fix", "lint_fix", "fa5s.magic"),
            ("Transpile", "transpile", "fa5s.exchange-alt"),
            ("Toggle Theme", "toggle_theme", "fa5s.adjust"),
            ("Export", "export", "fa5s.file-export"),
        ]
        self._populate()

        self.filter_edit.textChanged.connect(self._populate)
        self.list_widget.itemDoubleClicked.connect(self._trigger_item)

        # Keyboard navigation handled by default; Enter triggers
        self.filter_edit.returnPressed.connect(self._trigger_current)

    def _populate(self):
        q = self.filter_edit.text().strip().lower()
        self.list_widget.clear()
        for label, action_id, icon_name in self._actions:
            hay = f"{label} {action_id}".lower()
            if not q or q in hay:
                item = QListWidgetItem(label)
                item.setData(Qt.UserRole, action_id)
                try:
                    item.setIcon(qta.icon(icon_name))
                except Exception:
                    pass
                self.list_widget.addItem(item)
        if self.list_widget.count() > 0:
            self.list_widget.setCurrentRow(0)

    def _trigger_current(self):
        item = self.list_widget.currentItem()
        if item is None:
            return
        self._trigger_item(item)

    def _trigger_item(self, item: QListWidgetItem):
        action_id = str(item.data(Qt.UserRole))
        self.triggered.emit(action_id)
        self.accept()

class ChatTab(QWidget):
    def __init__(self, llm: LLM, set_status_callback=None, apply_theme_callback=None, initial_theme: str = THEME):
        super().__init__()
        self.llm = llm
        self.set_status = set_status_callback or (lambda s: None)
        self.apply_theme = apply_theme_callback or (lambda t: None)
        self.history = []
        self.last_meta = {}
        self.settings = QSettings("VisionBI", "VisionBI-AI")
        self._cancelled = False
        self._thread = None
        self._worker = None

        # Top strip: backend/model + ctx info + theme toggle + stream toggle
        self.model_info = QLabel("")
        self.model_info.setStyleSheet("color: #6b7280; font-size: 13px;")
        self.ctx_info = QLabel("")
        self.ctx_info.setStyleSheet("color: #6b7280; font-size: 13px;")
        self.theme_toggle = QCheckBox("Dark")
        # Theme from persisted setting if present
        persisted_theme = str(self.settings.value("ui/theme", initial_theme)).lower()
        self.theme_toggle.setChecked(persisted_theme == "dark")
        self.theme_toggle.setToolTip("Toggle light/dark theme")
        self.theme_toggle.toggled.connect(self.on_theme_toggled)
        self.stream_toggle = QCheckBox("Stream")
        # Stream persisted
        persisted_stream = bool(self.settings.value("ui/stream", UI_DEFAULT_STREAM, type=bool))
        self.stream_toggle.setChecked(persisted_stream)
        self.stream_toggle.setToolTip("Stream tokens if model supports it")
        self.stream_toggle.toggled.connect(lambda v: self.settings.setValue("ui/stream", bool(v)))

        top = QHBoxLayout()
        top.setContentsMargins(16, 12, 16, 12)
        top.setSpacing(16)
        top.addWidget(self.model_info)
        top.addStretch(1)
        top.addWidget(self.ctx_info)
        top.addStretch(1)
        theme_label = QLabel("Theme:")
        theme_label.setStyleSheet("color: #6b7280; font-size: 13px;")
        top.addWidget(theme_label)
        top.addWidget(self.theme_toggle)
        top.addWidget(self.stream_toggle)

        # Quick action toolbar
        self.create_quick_actions()
        
        # Prompt presets
        self.presets = QComboBox(); self.presets.setEditable(True)
        self.presets.setToolTip("Prompt presets. Select to seed input.")
        self.presets.setMinimumHeight(32)
        self.presets.addItems([
            "Data Modeling Advice",
            "SQL Optimization", 
            "Explain Query",
            "ETL Blueprint",
            "Performance Tuning",
            "Schema Design",
            "Query Debugging"
        ])
        self.presets.activated.connect(self.on_preset)

        # Input at bottom
        self.input = QPlainTextEdit(); self.input.setPlaceholderText("Ask about SQL/ETL/DWH…")
        self.input.setMinimumHeight(80)
        self.input.setMaximumHeight(120)

        # Buttons (aligned right)
        self.btn_chat = QPushButton("Send"); self.btn_chat.setToolTip("Send message (⌘↩)")
        self.btn_chat.setIcon(qta.icon("fa5s.paper-plane"))
        self.btn_chat.setMinimumHeight(32)
        self.btn_etl = QPushButton("ETL Blueprint")
        self.btn_etl.setIcon(qta.icon("fa5s.project-diagram"))
        self.btn_etl.setToolTip("Generate ETL blueprint using input as context")
        self.btn_etl.setMinimumHeight(32)
        self.btn_chat.clicked.connect(self.on_chat)
        self.btn_etl.clicked.connect(self.on_etl)
        btns = QHBoxLayout(); btns.setSpacing(8); btns.addStretch(1); btns.addWidget(self.btn_chat); btns.addWidget(self.btn_etl)

        # Output area
        self.output = RichTextOutput()
        self.progress = QProgressBar(); self.progress.setRange(0, 0); self.progress.setVisible(False)
        self.progress.setToolTip("Thinking…")
        self.progress.setMaximumHeight(4)
        self.progress.setTextVisible(False)

        # Output controls
        self.btn_copy_out = QPushButton("Copy"); self.btn_copy_out.setToolTip("Copy response to clipboard")
        self.btn_copy_out.setMinimumHeight(28)
        self.btn_clear_out = QPushButton("Clear"); self.btn_clear_out.setToolTip("Clear response")
        self.btn_clear_out.setMinimumHeight(28)
        self.btn_new_chat = QPushButton("New Chat"); self.btn_new_chat.setToolTip("Reset history (⌘N)")
        self.btn_new_chat.setMinimumHeight(28)
        self.btn_export = QPushButton("Export"); self.btn_export.setToolTip("Export transcript to .txt")
        self.btn_export.setIcon(qta.icon("fa5s.file-export"))
        self.btn_export.setMinimumHeight(28)
        self.btn_copy_out.clicked.connect(self.copy_output)
        self.btn_clear_out.clicked.connect(lambda: self.output.clear_content())
        self.btn_new_chat.clicked.connect(self.on_new_chat)
        self.btn_export.clicked.connect(self.export_transcript)
        out_controls = QHBoxLayout()
        out_controls.setSpacing(8)
        out_controls.addWidget(self.btn_copy_out)
        out_controls.addWidget(self.btn_clear_out)
        out_controls.addWidget(self.btn_new_chat)
        out_controls.addWidget(self.btn_export)
        out_controls.addStretch(1)

        # Logs panel (collapsible)
        persisted_logs_open = bool(self.settings.value("ui/logs_open", UI_LOGS_OPEN, type=bool))
        self.logs_toggle = QPushButton("▼ Hide Logs" if persisted_logs_open else "▶ Show Logs")
        self.logs_toggle.setCheckable(True)
        self.logs_toggle.setChecked(bool(persisted_logs_open))
        self.logs_toggle.setToolTip("Toggle request/response metrics")
        self.logs_toggle.setMinimumHeight(28)
        self.logs_toggle.toggled.connect(self.toggle_logs)
        self.logs = QPlainTextEdit(); self.logs.setReadOnly(True)
        self.logs.setMaximumHeight(120)
        self.logs.setVisible(bool(persisted_logs_open))

        # Card surfaces
        apply_card_surface(self.output, initial_theme)
        apply_card_surface(self.logs, initial_theme)

        # Shortcuts
        for seq in ("Ctrl+Return", "Ctrl+Enter", "Meta+Return", "Meta+Enter"):
            QShortcut(QKeySequence(seq), self, activated=self.on_chat)
        for seq in ("Ctrl+L", "Meta+L"):
            QShortcut(QKeySequence(seq), self, activated=lambda: self.input.setPlainText(""))
        for seq in ("Ctrl+N", "Meta+N"):
            QShortcut(QKeySequence(seq), self, activated=self.on_new_chat)
        for seq in ("Ctrl+K", "Meta+K"):
            QShortcut(QKeySequence(seq), self, activated=self.show_command_palette)
        # Cancel with Esc
        QShortcut(QKeySequence("Escape"), self, activated=self.cancel_request)

        # Create resizable splitter layout
        self.main_splitter = QSplitter(Qt.Vertical)
        self.main_splitter.setHandleWidth(8)
        
        # Top section (controls + response area)
        top_widget = QWidget()
        top_layout = QVBoxLayout()
        top_layout.setContentsMargins(16, 8, 16, 8)
        top_layout.setSpacing(16)
        top_layout.addLayout(top)
        top_layout.addWidget(self.quick_actions_widget)
        
        # Response section with label and progress inline
        response_header = QHBoxLayout()
        response_label = QLabel("Response:")
        response_label.setStyleSheet("font-weight: 500; color: #374151;")
        response_header.addWidget(response_label)
        response_header.addWidget(self.progress)
        response_header.addStretch(1)
        top_layout.addLayout(response_header)
        
        top_layout.addWidget(self.output)
        top_layout.addLayout(out_controls)
        top_layout.addWidget(self.logs_toggle)
        top_layout.addWidget(self.logs)
        top_widget.setLayout(top_layout)
        
        # Bottom section (input area)
        bottom_widget = QWidget()
        bottom_widget.setMinimumHeight(180)
        bottom_widget.setMaximumHeight(250)
        bottom_layout = QVBoxLayout()
        bottom_layout.setContentsMargins(16, 8, 16, 16)
        bottom_layout.setSpacing(8)
        prompt_label = QLabel("Prompt:")
        prompt_label.setStyleSheet("font-weight: 500; color: #374151;")
        bottom_layout.addWidget(prompt_label)
        bottom_layout.addWidget(self.presets)
        bottom_layout.addWidget(self.input)
        bottom_layout.addLayout(btns)
        bottom_widget.setLayout(bottom_layout)
        
        # Add to splitter
        self.main_splitter.addWidget(top_widget)
        self.main_splitter.addWidget(bottom_widget)
        # Restore splitter sizes if present
        sizes = self.settings.value("ui/main_splitter_sizes")
        if isinstance(sizes, list) and all(isinstance(n, int) for n in sizes):
            self.main_splitter.setSizes(sizes)
        else:
            self.main_splitter.setSizes([400, 200])
        # Persist on move
        self.main_splitter.splitterMoved.connect(self._save_splitter_sizes)
        
        # Main layout
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.main_splitter)
        self.setLayout(layout)

        # Initialize info labels
        self.refresh_info()

    def _save_splitter_sizes(self, *_):
        try:
            self.settings.setValue("ui/main_splitter_sizes", self.main_splitter.sizes())
        except Exception:
            pass

    def on_theme_toggled(self, checked: bool):
        theme = "dark" if checked else "light"
        self.settings.setValue("ui/theme", theme)
        self.apply_theme(theme)
        apply_card_surface(self.output, theme)
        apply_card_surface(self.logs, theme)
    
    def create_quick_actions(self):
        """Create quick action buttons for common operations."""
        self.quick_actions_widget = QFrame()
        self.quick_actions_widget.setStyleSheet("""
            QFrame {
                background-color: #f8f9fa;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 8px;
            }
        """)
        
        layout = QHBoxLayout()
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(8)
        
        # Quick action buttons with icons (using text for now, can be replaced with actual icons)
        actions = [
            ("🔍 Explain", "Explain this query step by step", self.quick_explain),
            ("⚡ Optimize", "How can I optimize this SQL query for better performance?", self.quick_optimize),
            ("🔧 Debug", "Help me debug this SQL query - what might be wrong?", self.quick_debug),
            ("📊 Sample Data", "Generate sample data for this schema", self.quick_sample_data),
            ("🏗️ Schema", "Design a database schema for", self.quick_schema),
        ]
        
        for text, prompt_template, callback in actions:
            btn = QPushButton(text)
            btn.setMinimumHeight(28)
            btn.setStyleSheet("""
                QPushButton {
                    background-color: #ffffff;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    padding: 4px 12px;
                    font-size: 13px;
                    color: #374151;
                }
                QPushButton:hover {
                    background-color: #f3f4f6;
                    border-color: #9ca3af;
                }
                QPushButton:pressed {
                    background-color: #e5e7eb;
                }
            """)
            btn.setToolTip(f"Quick action: {prompt_template}")
            btn.clicked.connect(lambda checked, template=prompt_template: self.apply_quick_action(template))
            layout.addWidget(btn)
        
        layout.addStretch(1)
        
        # Recent queries button
        self.recent_btn = QPushButton("📚 Recent")
        self.recent_btn.setMinimumHeight(28)
        self.recent_btn.setStyleSheet("""
            QPushButton {
                background-color: #ffffff;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 4px 12px;
                font-size: 13px;
                color: #374151;
            }
            QPushButton:hover {
                background-color: #f3f4f6;
                border-color: #9ca3af;
            }
        """)
        self.recent_btn.setToolTip("Show recent queries")
        self.recent_btn.clicked.connect(self.show_recent_queries)
        layout.addWidget(self.recent_btn)
        
        self.quick_actions_widget.setLayout(layout)
    
    def apply_quick_action(self, prompt_template):
        """Apply a quick action prompt template."""
        current_input = self.input.toPlainText().strip()
        if current_input:
            full_prompt = f"{prompt_template}:\n\n{current_input}"
        else:
            full_prompt = prompt_template
        
        self.input.setPlainText(full_prompt)
        self.input.setFocus()
        # Move cursor to end
        cursor = self.input.textCursor()
        cursor.movePosition(cursor.End)
        self.input.setTextCursor(cursor)
    
    def quick_explain(self):
        self.apply_quick_action("Explain this query step by step")
    
    def quick_optimize(self):
        self.apply_quick_action("How can I optimize this SQL query for better performance?")
    
    def quick_debug(self):
        self.apply_quick_action("Help me debug this SQL query - what might be wrong?")
    
    def quick_sample_data(self):
        self.apply_quick_action("Generate sample data for this schema")
    
    def quick_schema(self):
        self.apply_quick_action("Design a database schema for")
    
    def show_recent_queries(self):
        """Show recent queries in a simple way."""
        if not hasattr(self, 'recent_queries'):
            self.recent_queries = []
        
        if not self.recent_queries:
            self.set_status("No recent queries")
            return
        
        # Simple implementation: cycle through recent queries
        if not hasattr(self, 'recent_index'):
            self.recent_index = 0
        
        if self.recent_index < len(self.recent_queries):
            self.input.setPlainText(self.recent_queries[self.recent_index])
            self.recent_index = (self.recent_index + 1) % len(self.recent_queries)
            self.set_status(f"Recent query {self.recent_index}/{len(self.recent_queries)}")
        else:
            self.recent_index = 0

    def refresh_info(self):
        backend = getattr(self.llm, "backend", "?")
        model = getattr(self.llm, "ollama_model", None) if backend == "ollama" else "GGUF"
        self.model_info.setText(f"Backend: {backend}  |  Model: {model}")
        self.ctx_info.setText(f"n_ctx: {getattr(self.llm, 'n_ctx', '')}  temp: {getattr(self.llm, 'temperature', '')}  max_tokens: {getattr(self.llm, 'max_tokens', '')}")

    def toggle_logs(self, checked: bool):
        self.logs.setVisible(checked)
        self.logs_toggle.setText("▼ Hide Logs" if checked else "▶ Show Logs")
        self.settings.setValue("ui/logs_open", bool(checked))

    def append_log(self, meta: dict, error: str | None = None):
        parts = []
        if error:
            parts.append(f"Error: {error}")
        if meta:
            parts.append(f"backend={meta.get('backend')} model={meta.get('model')} n_ctx={meta.get('n_ctx')} temp={meta.get('temperature')} max_tokens={meta.get('max_tokens')}")
            parts.append(f"start={meta.get('start_time')} end={meta.get('end_time')} elapsed={meta.get('elapsed_sec')}s")
            usage = meta.get('usage') or {}
            if usage:
                parts.append(f"usage: prompt={usage.get('prompt_tokens')} completion={usage.get('completion_tokens')} total={usage.get('total_tokens')}")
            tps = meta.get('tokens_per_sec')
            if tps:
                parts.append(f"tokens/sec={round(tps, 2)}")
            warnings = meta.get('warnings') or []
            if warnings:
                parts.append("warnings=" + "; ".join([str(w) for w in warnings]))
        line = " | ".join(parts)
        if line:
            self.logs.appendPlainText(line)

    def on_preset(self):
        text = self.presets.currentText().strip()
        if not text:
            return
        # Seed input and keep item in list if it's a new custom entry
        if self.presets.findText(text) == -1:
            self.presets.addItem(text)
        self.input.setPlainText(text)
        self.input.setFocus()

    def on_chat(self):
        prompt = self.input.toPlainText().strip()
        if not prompt:
            return
        self._start_request(user_text=prompt)

    def on_etl(self):
        ctx = self.input.toPlainText().strip() or "(no extra context)"
        prompt = ETL_BLUEPRINT_TEMPLATE.format(context=ctx)
        self._start_request(user_text=prompt)

    def _start_request(self, user_text: str):
        self.output.clear_content()
        self.output.setPlainText("Thinking…")
        self._set_busy(True)
        stream = self.stream_toggle.isChecked()
        self.token_counter = 0
        self.set_status("Thinking…")
        self._cancelled = False

        # Track recent queries (keep last 10)
        if not hasattr(self, 'recent_queries'):
            self.recent_queries = []
        if user_text not in self.recent_queries:
            self.recent_queries.insert(0, user_text)
            self.recent_queries = self.recent_queries[:10]  # Keep only last 10

        # Add user to history
        self.history.append({"role": "user", "content": user_text})

        self._thread = QThread()
        self._worker = ChatWorker(self.llm, SYSTEM_PROMPT, user_text, self.history[:-1], stream, should_cancel=lambda: self._cancelled)
        self._worker.moveToThread(self._thread)
        self._thread.started.connect(self._worker.run)
        self._worker.delta.connect(self._on_delta)
        self._worker.finished.connect(self._on_finished)
        self._worker.error.connect(self._on_error)
        # Ensure cleanup
        self._worker.finished.connect(lambda *_: self._thread.quit())
        self._worker.error.connect(lambda *_: self._thread.quit())
        self._thread.finished.connect(self._thread.deleteLater)
        self._thread.start()

    def _on_delta(self, d: str):
        # Append to output and update approximate token count
        self.output.append_streaming_text(d)
        self.token_counter += max(0, len(d.strip().split()))
        self.set_status(f"Streaming… ≈{self.token_counter} tokens")

    def _on_finished(self, text: str, meta: dict):
        self.last_meta = meta or {}
        # Append assistant to history
        self.history.append({"role": "assistant", "content": text})
        self.output.set_final_text(text)
        self._set_busy(False)
        self.append_log(meta)
        self.refresh_info()
        if meta.get("cancelled"):
            self.set_status("Cancelled")
        else:
            self.set_status("Done")

    def _on_error(self, err: str):
        # Attempt non-streaming fallback if streaming was on
        if self.stream_toggle.isChecked():
            try:
                text, meta = self.llm.chat_with_meta(SYSTEM_PROMPT, self.history[-1]["content"], history=self.history[:-1], stream=False)
                self._on_finished(text, meta)
                return
            except Exception as e:
                err = f"{err} | Fallback failed: {e}"
        self.output.setPlainText(f"Error: {err}\n\nTip: Ensure Resources/model.gguf exists or configure bootstrap.")
        self._set_busy(False)
        self.append_log({}, error=str(err))
        self.set_status("Error")

    def _set_busy(self, busy: bool):
        self.input.setEnabled(not busy)
        self.btn_chat.setEnabled(not busy)
        self.btn_etl.setEnabled(not busy)
        self.progress.setVisible(busy)
        QApplication.setOverrideCursor(Qt.BusyCursor if busy else Qt.ArrowCursor)
        # Update send button label
        self.btn_chat.setText("Sending…" if busy else "Send")

    def cancel_request(self):
        if getattr(self, "_thread", None) and self.progress.isVisible():
            self._cancelled = True
            self.set_status("Cancelling…")

    def show_command_palette(self):
        dlg = CommandPalette(self)
        # Center relative to parent
        parent_rect = self.rect()
        dlg.move(self.mapToGlobal(parent_rect.center()) - dlg.rect().center())

        def handle(action_id: str):
            if action_id == "send":
                self.on_chat()
            elif action_id == "new_chat":
                self.on_new_chat()
            elif action_id == "lint_fix":
                self.on_lint_fix_input()
            elif action_id == "transpile":
                self.on_transpile_input()
            elif action_id == "toggle_theme":
                self.theme_toggle.toggle()
            elif action_id == "export":
                self.export_transcript()

        dlg.triggered.connect(handle)
        dlg.exec()

    def adjust_font(self, delta: int):
        """Increase/decrease input/output font size."""
        # Start from 14 (matches stylesheet) unless overridden
        def _current_px(widget):
            # Try to parse inline font-size from styleSheet
            ss = widget.styleSheet() or ""
            import re as _re
            m = _re.search(r"font-size:\s*(\d+)px", ss)
            if m:
                return int(m.group(1))
            return 14

        new_in = max(10, _current_px(self.input) + delta)
        new_out = max(10, _current_px(self.output) + delta)
        self.input.setStyleSheet(f"font-size: {new_in}px;")
        self.output.setStyleSheet(f"font-size: {new_out}px;")
        try:
            new_logs = max(10, _current_px(self.logs) + delta)
            self.logs.setStyleSheet(f"font-size: {new_logs}px;")
        except Exception:
            pass

    def on_transpile_input(self):
        sql = self.input.toPlainText().strip()
        if not sql:
            self.set_status("No input to transpile")
            return
        try:
            src = DEFAULT_SOURCE_DIALECT
            dst = DEFAULT_TARGET_DIALECT
            out = transpile_sql(sql, source=src, target=dst)
            self.show_diff_and_apply("Transpile", sql, out, applied_toast="Transpiled")
        except Exception as e:
            self.set_status(f"Transpile failed: {e}")

    def _extract_fixed_from_lint(self, lint_text: str) -> str:
        marker = "Suggested fix:\n"
        if marker in lint_text:
            return lint_text.split(marker, 1)[-1].strip()
        # No issues case
        parts = lint_text.split("\n\n", 1)
        if len(parts) == 2:
            return parts[1].strip()
        return lint_text.strip()

    def on_lint_fix_input(self):
        sql = self.input.toPlainText().strip()
        if not sql:
            self.set_status("No input to lint")
            return
        try:
            report = lint_sql(sql, dialect=DEFAULT_LINT_DIALECT)
            fixed = self._extract_fixed_from_lint(report)
            self.show_diff_and_apply("Lint & Fix", sql, fixed, applied_toast="Formatted")
        except Exception as e:
            self.set_status(f"Lint failed: {e}")

    def show_diff_and_apply(self, title: str, original_text: str, transformed_text: str, applied_toast: str = "Applied"):
        dlg = DiffDialog(title, original_text, transformed_text, self)
        res = dlg.exec()
        if dlg.result_action == "apply":
            self.input.setPlainText(transformed_text)
            self.input.setFocus()
            show_toast(self, applied_toast)

    def on_new_chat(self):
        self.history = []
        self.output.clear_content()
        self.logs.setPlainText("")
        self.input.setPlainText("")
        self.input.setFocus()
        self.set_status("New chat started")

    def copy_output(self):
        output = self.output.toPlainText().strip()
        if not output:
            self.set_status("No response to copy")
            return
        QApplication.clipboard().setText(output)
        self.set_status("Response copied to clipboard")

    def export_transcript(self):
        if not self.history:
            self.set_status("No conversation to export")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export Transcript", "transcript.txt", "Text Files (*.txt)")
        if not path:
            self.set_status("Export cancelled")
            return
        try:
            lines = []
            for msg in self.history:
                role = msg.get("role", "")
                content = msg.get("content", "")
                lines.append(f"[{role}] {content}")
            with open(path, "w", encoding="utf-8") as f:
                f.write("\n\n".join(lines))
            filename = path.split("/")[-1]  # Get just the filename
            self.set_status(f"Exported to {filename}")
        except Exception as e:
            self.set_status(f"Export failed: {e}")

class SqlTab(QWidget):
    def __init__(self, set_status_callback=None):
        super().__init__()
        self.set_status = set_status_callback or (lambda s: None)
        
        # Dialect selectors
        self.source = QComboBox(); self.source.addItems([
            "snowflake", "bigquery", "postgres", "databricks", "mysql", "oracle"
        ])
        self.source.setCurrentText(DEFAULT_SOURCE_DIALECT)
        self.source.setMinimumHeight(32)
        self.source.setToolTip("Source SQL dialect")
        
        self.target = QComboBox(); self.target.addItems([
            "snowflake", "bigquery", "postgres", "databricks", "mysql", "oracle"
        ])
        self.target.setCurrentText(DEFAULT_TARGET_DIALECT)
        self.target.setMinimumHeight(32)
        self.target.setToolTip("Target SQL dialect")

        # SQL input/output areas with syntax highlighting
        self.sql_in = QPlainTextEdit(); self.sql_in.setPlaceholderText("Paste SQL here…")
        self.sql_in.setMinimumHeight(200)
        self.sql_in_highlighter = SqlSyntaxHighlighter(self.sql_in.document())
        
        self.sql_out = QPlainTextEdit(); self.sql_out.setReadOnly(True)
        self.sql_out.setMinimumHeight(200)
        self.sql_out.setPlaceholderText("Output will appear here…")
        self.sql_out_highlighter = SqlSyntaxHighlighter(self.sql_out.document())
        apply_card_surface(self.sql_out, THEME)

        # Action buttons
        self.btn_transpile = QPushButton("Transpile")
        self.btn_transpile.setMinimumHeight(32)
        self.btn_transpile.setToolTip("Convert SQL between dialects")
        self.btn_transpile.setIcon(qta.icon("fa5s.exchange-alt"))
        
        self.btn_lint = QPushButton("Lint & Fix")
        self.btn_lint.setMinimumHeight(32)
        self.btn_lint.setToolTip("Check SQL for issues and suggest fixes")
        self.btn_lint.setIcon(qta.icon("fa5s.magic"))
        
        self.btn_format = QPushButton("Format")
        self.btn_format.setMinimumHeight(32)
        self.btn_format.setToolTip("Format SQL with consistent style")
        
        self.btn_copy_out = QPushButton("Copy Output")
        self.btn_copy_out.setMinimumHeight(32)
        self.btn_copy_out.setToolTip("Copy output to clipboard")
        self.btn_copy_out.setIcon(qta.icon("fa5s.copy"))

        self.btn_transpile.clicked.connect(self.on_transpile)
        self.btn_lint.clicked.connect(self.on_lint)
        self.btn_format.clicked.connect(self.on_format)
        self.btn_copy_out.clicked.connect(self.copy_output)

        # Layout assembly
        layout = QVBoxLayout()
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(16)
        
        # Dialect selection row
        dialect_row = QHBoxLayout()
        dialect_row.setSpacing(16)
        from_label = QLabel("From:")
        from_label.setStyleSheet("font-weight: 500; color: #374151;")
        dialect_row.addWidget(from_label)
        dialect_row.addWidget(self.source)
        arrow_label = QLabel("→")
        arrow_label.setStyleSheet("font-size: 16px; color: #6b7280;")
        dialect_row.addWidget(arrow_label)
        to_label = QLabel("To:")
        to_label.setStyleSheet("font-weight: 500; color: #374151;")
        dialect_row.addWidget(to_label)
        dialect_row.addWidget(self.target)
        dialect_row.addStretch(1)
        layout.addLayout(dialect_row)
        
        # Input section
        input_label = QLabel("Input SQL:")
        input_label.setStyleSheet("font-weight: 500; color: #374151;")
        layout.addWidget(input_label)
        layout.addWidget(self.sql_in)
        
        # Action buttons
        buttons = QHBoxLayout()
        buttons.setSpacing(8)
        buttons.addWidget(self.btn_transpile)
        buttons.addWidget(self.btn_lint)
        buttons.addWidget(self.btn_format)
        buttons.addWidget(self.btn_copy_out)
        buttons.addStretch(1)
        layout.addLayout(buttons)
        
        # Output section
        output_label = QLabel("Output:")
        output_label.setStyleSheet("font-weight: 500; color: #374151;")
        layout.addWidget(output_label)
        layout.addWidget(self.sql_out)
        
        self.setLayout(layout)

    def adjust_font(self, delta: int):
        def _current_px(widget):
            ss = widget.styleSheet() or ""
            import re as _re
            m = _re.search(r"font-size:\s*(\d+)px", ss)
            if m:
                return int(m.group(1))
            return 14
        new_in = max(10, _current_px(self.sql_in) + delta)
        new_out = max(10, _current_px(self.sql_out) + delta)
        self.sql_in.setStyleSheet(f"font-size: {new_in}px;")
        self.sql_out.setStyleSheet(f"font-size: {new_out}px;")

    def on_transpile(self):
        src = self.source.currentText(); dst = self.target.currentText()
        sql = self.sql_in.toPlainText().strip()
        if not sql:
            self.set_status("No SQL to transpile")
            return
        try:
            self.set_status(f"Transpiling {src} → {dst}...")
            out = transpile_sql(sql, source=src, target=dst)
            # Diff and apply
            dlg = DiffDialog("Transpile", sql, out, self)
            dlg.exec()
            if dlg.result_action == "apply":
                self.sql_in.setPlainText(out)
                self.sql_in.setFocus()
                show_toast(self, "Transpiled")
            else:
                self.sql_out.setPlainText(out)
                self.set_status("Transpile complete")
        except Exception as e:
            self.sql_out.setPlainText(f"Transpile failed: {e}\n\nTip: Check SQL syntax and verify source dialect matches your query.")
            self.set_status("Transpile failed")

    def on_lint(self):
        sql = self.sql_in.toPlainText().strip()
        if not sql:
            self.set_status("No SQL to lint")
            return
        try:
            self.set_status("Linting SQL...")
            report = lint_sql(sql, dialect=self.source.currentText() or DEFAULT_LINT_DIALECT)
            # Try to extract fixed SQL
            fixed = report
            marker = "Suggested fix:\n"
            if marker in report:
                fixed = report.split(marker, 1)[-1].strip()
            else:
                parts = report.split("\n\n", 1)
                if len(parts) == 2:
                    fixed = parts[1].strip()
            dlg = DiffDialog("Lint & Fix", sql, fixed, self)
            dlg.exec()
            if dlg.result_action == "apply":
                self.sql_in.setPlainText(fixed)
                self.sql_in.setFocus()
                show_toast(self, "Formatted")
            else:
                self.sql_out.setPlainText(report)
                self.set_status("Lint complete")
        except Exception as e:
            self.sql_out.setPlainText(f"Lint failed: {e}\n\nTip: Verify SQL syntax and check dialect compatibility.")
            self.set_status("Lint failed")

    def on_format(self):
        sql = self.sql_in.toPlainText().strip()
        if not sql:
            self.set_status("No SQL to format")
            return
        try:
            self.set_status("Formatting SQL...")
            fixed = sqlfluff.fix(sql, dialect=self.source.currentText() or DEFAULT_LINT_DIALECT)
            self.sql_out.setPlainText(fixed)
            self.set_status("Format complete")
        except Exception as e:
            self.sql_out.setPlainText(f"Format failed: {e}\n\nTip: Check SQL syntax before formatting.")
            self.set_status("Format failed")

    def copy_output(self):
        output = self.sql_out.toPlainText().strip()
        if not output:
            self.set_status("No output to copy")
            return
        QApplication.clipboard().setText(output)
        self.set_status("Output copied to clipboard")

class MainWindow(BaseWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("VisionBI AI (Offline)")
        self.resize(980, 720)

        # Feature flag: optional frameless window using qframelesswindow
        if UI_FRAMELESS and QF_AVAILABLE:
            from widgets.titlebar import TitleBar as CustomTitleBar
            self.setTitleBar(CustomTitleBar(self))
            if UI_ACRYLIC:
                try:
                    self.setMicaEffectEnabled(True)
                except Exception:
                    try:
                        self.setAcrylicEffectEnabled(True)
                    except Exception:
                        pass
        elif UI_FRAMELESS:
            self.setWindowFlag(Qt.FramelessWindowHint, True)

        # Settings
        self.settings = QSettings("VisionBI", "VisionBI-AI")

        self.llm = LLM()

        tabs = QTabWidget(); self.tabs = tabs
        # Theme from persisted settings
        initial_theme = str(self.settings.value("ui/theme", THEME)).lower()
        tabs.addTab(ChatTab(self.llm, set_status_callback=self.set_status, apply_theme_callback=self.apply_theme, initial_theme=initial_theme), "Chat")
        tabs.addTab(SqlTab(set_status_callback=self.set_status), "SQL Tools")

        self.status = QLabel("Ready")
        self.status.setStyleSheet("""
            QLabel {
                padding: 6px 12px; 
                color: #6b7280; 
                font-size: 13px;
                background-color: #f8f9fa;
                border-top: 1px solid #e5e7eb;
                border-radius: 0px;
            }
        """)
        # Menu bar
        menubar = QMenuBar()
        view_menu = QMenu("View", self)
        help_menu = QMenu("Help", self)
        menubar.addMenu(view_menu)
        menubar.addMenu(help_menu)

        act_inc = QAction("Increase Font Size", self)
        act_inc.setShortcut(QKeySequence("Ctrl++"))
        act_inc.setToolTip("Increase font size (Ctrl/Cmd +)")
        act_inc.triggered.connect(lambda: self.adjust_font_global(+1))
        view_menu.addAction(act_inc)

        act_inc2 = QAction("Increase Font Size (Cmd)", self)
        act_inc2.setShortcut(QKeySequence("Meta++"))
        act_inc2.triggered.connect(lambda: self.adjust_font_global(+1))
        view_menu.addAction(act_inc2)

        act_dec = QAction("Decrease Font Size", self)
        act_dec.setShortcut(QKeySequence("Ctrl+-"))
        act_dec.setToolTip("Decrease font size (Ctrl/Cmd -)")
        act_dec.triggered.connect(lambda: self.adjust_font_global(-1))
        view_menu.addAction(act_dec)

        act_dec2 = QAction("Decrease Font Size (Cmd)", self)
        act_dec2.setShortcut(QKeySequence("Meta+-"))
        act_dec2.triggered.connect(lambda: self.adjust_font_global(-1))
        view_menu.addAction(act_dec2)

        act_help = QAction("Shortcuts…", self)
        act_help.setToolTip("Show keyboard shortcuts")
        act_help.triggered.connect(self.show_shortcuts)
        help_menu.addAction(act_help)

        layout = QVBoxLayout(); layout.addWidget(menubar); layout.addWidget(tabs); layout.addWidget(self.status)
        self.setLayout(layout)

        # Apply initial theme
        self.apply_theme(initial_theme)

        # Restore window geometry/state
        try:
            geom = self.settings.value("ui/geometry")
            if geom:
                self.restoreGeometry(geom)
            win_state = self.settings.value("ui/windowState")
            if str(win_state).lower() == "maximized" or win_state == int(Qt.WindowMaximized):
                self.showMaximized()
        except Exception:
            pass

    def apply_theme(self, theme: str):
        """Apply global QSS based on design tokens."""
        if UI_USE_FLUENT:
            palette = NEUTRALS.get(theme, NEUTRALS["light"])
            qss = f"""
            QWidget {{
                background-color: {palette['background']};
                color: {palette['text']};
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
                font-size: {FONT_SIZES['body']}px;
            }}
            QPlainTextEdit, QTextEdit {{
                background-color: {palette['background']};
                color: {palette['text']};
                border: 1px solid {palette['border']};
                border-radius: {BORDER_RADIUS}px;
                padding: {SPACING_HALF}px {SPACING}px;
                font-size: {FONT_SIZES['body']}px;
            }}
            QPushButton {{
                background-color: {ACCENT_COLOR};
                color: #ffffff;
                border: none;
                border-radius: {BORDER_RADIUS}px;
                padding: {SPACING_HALF}px {SPACING * 2}px;
                font-weight: 500;
                font-size: {FONT_SIZES['label']}px;
            }}
            QPushButton:hover {{
                background-color: {ACCENT_COLOR}dd;
            }}
            QComboBox {{
                background-color: {palette['background']};
                color: {palette['text']};
                border: 1px solid {palette['border']};
                border-radius: {BORDER_RADIUS}px;
                padding: {SPACING_HALF}px {SPACING}px;
                font-size: {FONT_SIZES['body']}px;
            }}
            QLabel {{
                color: {palette['text_muted']};
            }}
            QCheckBox {{
                color: {palette['text_muted']};
                spacing: {SPACING_HALF}px;
            }}
            QCheckBox::indicator {{
                width: 16px;
                height: 16px;
                border: 1px solid {palette['border']};
                border-radius: 3px;
                background-color: {palette['surface']};
            }}
            QCheckBox::indicator:checked {{
                background-color: {ACCENT_COLOR};
                border-color: {ACCENT_COLOR};
            }}
            QProgressBar {{
                background-color: {palette['surface']};
                border: none;
                border-radius: 2px;
            }}
            QProgressBar::chunk {{
                background-color: {ACCENT_COLOR};
                border-radius: 2px;
            }}
            QTabWidget::pane {{
                border: 1px solid {palette['border']};
                border-radius: {BORDER_RADIUS}px;
                background-color: {palette['background']};
            }}
            QTabBar::tab {{
                background-color: {palette['surface']};
                color: {palette['text_muted']};
                padding: {SPACING_HALF}px {SPACING * 2}px;
                margin-right: {SPACING_HALF}px;
                border-top-left-radius: {BORDER_RADIUS}px;
                border-top-right-radius: {BORDER_RADIUS}px;
            }}
            QTabBar::tab:selected {{
                background-color: {palette['background']};
                color: {palette['text']};
            }}
            """
            QApplication.instance().setStyleSheet(qss)
        else:
            # Fallback to legacy stylesheet
            if theme == "dark":
                QApplication.instance().setStyleSheet(
                    """
                    QWidget {
                        background-color: #1f2937;
                        color: #f9fafb;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
                    }
                    QPlainTextEdit {
                        background-color: #374151;
                        color: #f9fafb;
                        border: 1px solid #4b5563;
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    QPlainTextEdit:focus {
                        border: 2px solid #3b82f6;
                    }
                    QPushButton {
                        background-color: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        padding: 6px 16px;
                        font-weight: 500;
                        font-size: 14px;
                    }
                    QPushButton:hover {
                        background-color: #2563eb;
                    }
                    QPushButton:pressed {
                        background-color: #1d4ed8;
                    }
                    QComboBox {
                        background-color: #374151;
                        color: #f9fafb;
                        border: 1px solid #4b5563;
                        border-radius: 6px;
                        padding: 6px 12px;
                        font-size: 14px;
                    }
                    QComboBox:focus {
                        border: 2px solid #3b82f6;
                    }
                    QProgressBar {
                        background-color: #111827;
                        border: none;
                        border-radius: 2px;
                    }
                    QProgressBar::chunk {
                        background-color: #3b82f6;
                        border-radius: 2px;
                    }
                    QLabel {
                        color: #d1d5db;
                    }
                    QCheckBox {
                        color: #d1d5db;
                        spacing: 8px;
                    }
                    QCheckBox::indicator {
                        width: 16px;
                        height: 16px;
                        border: 1px solid #4b5563;
                        border-radius: 3px;
                        background-color: #374151;
                    }
                    QCheckBox::indicator:checked {
                        background-color: #3b82f6;
                        border-color: #3b82f6;
                    }
                    QTabWidget::pane {
                        border: 1px solid #4b5563;
                        border-radius: 6px;
                        background-color: #1f2937;
                    }
                    QTabBar::tab {
                        background-color: #374151;
                        color: #d1d5db;
                        padding: 8px 16px;
                        margin-right: 2px;
                        border-top-left-radius: 6px;
                        border-top-right-radius: 6px;
                    }
                    QTabBar::tab:selected {
                        background-color: #1f2937;
                        color: #f9fafb;
                    }
                    """
                )
            else:
                QApplication.instance().setStyleSheet(
                    """
                    QWidget {
                        background-color: #ffffff;
                        color: #1f2937;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
                    }
                    QPlainTextEdit {
                        background-color: #ffffff;
                        color: #1f2937;
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    QPlainTextEdit:focus {
                        border: 2px solid #2563eb;
                    }
                    QPushButton {
                        background-color: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        padding: 6px 16px;
                        font-weight: 500;
                        font-size: 14px;
                    }
                    QPushButton:hover {
                        background-color: #1d4ed8;
                    }
                    QPushButton:pressed {
                        background-color: #1e40af;
                    }
                    QComboBox {
                        background-color: #ffffff;
                        color: #1f2937;
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        padding: 6px 12px;
                        font-size: 14px;
                    }
                    QComboBox:focus {
                        border: 2px solid #2563eb;
                    }
                    QProgressBar {
                        background-color: #f8f9fa;
                        border: none;
                        border-radius: 2px;
                    }
                    QProgressBar::chunk {
                        background-color: #2563eb;
                        border-radius: 2px;
                    }
                    QLabel {
                        color: #6b7280;
                    }
                    QCheckBox {
                        color: #6b7280;
                        spacing: 8px;
                    }
                    QCheckBox::indicator {
                        width: 16px;
                        height: 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 3px;
                        background-color: #ffffff;
                    }
                    QCheckBox::indicator:checked {
                        background-color: #2563eb;
                        border-color: #2563eb;
                    }
                    QTabWidget::pane {
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        background-color: #ffffff;
                    }
                    QTabBar::tab {
                        background-color: #f8f9fa;
                        color: #6b7280;
                        padding: 8px 16px;
                        margin-right: 2px;
                        border-top-left-radius: 6px;
                        border-top-right-radius: 6px;
                    }
                    QTabBar::tab:selected {
                        background-color: #ffffff;
                        color: #1f2937;
                    }
                    """
                )

    def set_status(self, text: str):
        self.status.setText(text)

    def adjust_font_global(self, delta: int):
        try:
            chat_tab = self.tabs.widget(0)
            if hasattr(chat_tab, "adjust_font"):
                chat_tab.adjust_font(delta)
        except Exception:
            pass
        try:
            sql_tab = self.tabs.widget(1)
            if hasattr(sql_tab, "adjust_font"):
                sql_tab.adjust_font(delta)
        except Exception:
            pass

    def show_shortcuts(self):
        dlg = QDialog(self)
        dlg.setWindowTitle("Shortcuts")
        layout = QVBoxLayout(); layout.setContentsMargins(16, 16, 16, 16); layout.setSpacing(8)
        label = QLabel(
            """
            <b>Keyboard Shortcuts</b><br><br>
            Send: Ctrl/Cmd+Enter<br>
            Command Palette: Ctrl/Cmd+K<br>
            New Chat: Ctrl/Cmd+N<br>
            Clear Input: Ctrl/Cmd+L<br>
            Cancel: Esc<br>
            Font Size +: Ctrl/Cmd+<b>+</b><br>
            Font Size -: Ctrl/Cmd+<b>-</b><br>
            """
        )
        layout.addWidget(label)
        btn = QPushButton("Close"); btn.clicked.connect(dlg.accept)
        layout.addWidget(btn)
        dlg.setLayout(layout)
        dlg.setFixedSize(360, 220)
        dlg.exec()

    def closeEvent(self, event):
        # Persist window geometry/state
        try:
            self.settings.setValue("ui/geometry", self.saveGeometry())
            state = "maximized" if self.isMaximized() else "normal"
            self.settings.setValue("ui/windowState", state)
        except Exception:
            pass
        super().closeEvent(event)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = MainWindow(); win.show()
    sys.exit(app.exec())


# --------------------------------------
# Diff Dialog (placed at bottom for clarity)
# --------------------------------------

class DiffDialog(QDialog):
    """Minimal side-by-side diff/apply dialog."""
    def __init__(self, title: str, original_text: str, transformed_text: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setModal(True)
        self.result_action = None  # "apply" | "copy" | None
        self.resize(820, 480)

        layout = QVBoxLayout(); layout.setContentsMargins(12, 12, 12, 12); layout.setSpacing(8)
        panes = QHBoxLayout(); panes.setSpacing(8)

        left = QPlainTextEdit(); left.setReadOnly(True); left.setPlainText(original_text)
        right = QPlainTextEdit(); right.setReadOnly(True); right.setPlainText(transformed_text)
        apply_card_surface(left, THEME)
        apply_card_surface(right, THEME)
        font = QFont("Monospace"); font.setStyleHint(QFont.TypeWriter)
        left.setFont(font); right.setFont(font)
        left.setLineWrapMode(QPlainTextEdit.NoWrap); right.setLineWrapMode(QPlainTextEdit.NoWrap)
        panes.addWidget(left); panes.addWidget(right)
        layout.addLayout(panes)

        btns = QHBoxLayout(); btns.addStretch(1)
        btn_apply = QPushButton("Apply to Input"); btn_copy = QPushButton("Copy Result"); btn_close = QPushButton("Close")
        btns.addWidget(btn_apply); btns.addWidget(btn_copy); btns.addWidget(btn_close)
        layout.addLayout(btns)

        btn_apply.clicked.connect(lambda: self._finish("apply"))
        def _copy():
            QApplication.clipboard().setText(transformed_text)
            self.result_action = "copy"; self.accept()
        btn_copy.clicked.connect(_copy)
        btn_close.clicked.connect(self.reject)

        self.setLayout(layout)

    def _finish(self, action: str):
        self.result_action = action
        self.accept()
