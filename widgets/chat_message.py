from __future__ import annotations

from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QVBoxLayout, QLabel, QTextBrowser,
    QListWidget, QListWidgetItem, QFrame, QPushButton, QPlainTextEdit
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont

import markdown
import re

from config import ACCENT_COLOR, NEUTRALS, BORDER_RADIUS


class CodeBlockWidget(QFrame):
    """Code block with inline toolbar actions."""

    copy_clicked = Signal(str)
    insert_clicked = Signal(str)
    expand_clicked = Signal(str)

    def __init__(self, code: str):
        super().__init__()
        self.code = code
        self.setStyleSheet(
            f"background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: {BORDER_RADIUS}px;"
        )
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(4)

        # Toolbar (hidden until hover)
        toolbar = QHBoxLayout()
        toolbar.setContentsMargins(0, 0, 0, 0)
        toolbar.setSpacing(4)
        self.btn_copy = QPushButton("Copy")
        self.btn_insert = QPushButton("Insert")
        self.btn_expand = QPushButton("Expand")
        for btn in (self.btn_copy, self.btn_insert, self.btn_expand):
            btn.setVisible(False)
            btn.setFixedHeight(20)
            btn.setStyleSheet(
                "QPushButton {border: 1px solid #d1d5db; border-radius: 4px; background: #ffffff; font-size: 11px;}"\
                "QPushButton:hover {background: #f3f4f6;}"
            )
        self.btn_copy.clicked.connect(lambda: self.copy_clicked.emit(self.code))
        self.btn_insert.clicked.connect(lambda: self.insert_clicked.emit(self.code))
        self.btn_expand.clicked.connect(lambda: self.expand_clicked.emit(self.code))
        toolbar.addStretch(1)
        toolbar.addWidget(self.btn_copy)
        toolbar.addWidget(self.btn_insert)
        toolbar.addWidget(self.btn_expand)
        layout.addLayout(toolbar)

        self.editor = QPlainTextEdit(code)
        self.editor.setReadOnly(True)
        self.editor.setLineWrapMode(QPlainTextEdit.NoWrap)
        self.editor.setFont(QFont("Courier", 10))
        layout.addWidget(self.editor)

    def enterEvent(self, event):  # pragma: no cover - UI interaction
        for btn in (self.btn_copy, self.btn_insert, self.btn_expand):
            btn.setVisible(True)
        super().enterEvent(event)

    def leaveEvent(self, event):  # pragma: no cover - UI interaction
        for btn in (self.btn_copy, self.btn_insert, self.btn_expand):
            btn.setVisible(False)
        super().leaveEvent(event)


class ChatMessageWidget(QWidget):
    """Chat bubble for user or assistant messages."""

    copy_code = Signal(str)
    insert_code = Signal(str)
    expand_code = Signal(str)

    def __init__(self, role: str, text: str = "", theme: str = "light"):
        super().__init__()
        self.role = role
        self.theme = theme
        self.raw_text = text
        self.renderer = markdown.Markdown(extensions=["fenced_code", "tables"])

        self.main_layout = QHBoxLayout(self)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(8)

        avatar = QLabel("U" if role == "user" else "A")
        avatar.setFixedSize(32, 32)
        avatar.setAlignment(Qt.AlignCenter)
        avatar.setStyleSheet(
            "border-radius:16px; background-color: {} ; color: #ffffff; font-weight:600;".format(
                ACCENT_COLOR if role == "user" else "#4b5563"
            )
        )

        self.bubble = QFrame()
        bubble_layout = QVBoxLayout(self.bubble)
        bubble_layout.setContentsMargins(12, 8, 12, 8)
        bubble_layout.setSpacing(8)

        self.content_layout = QVBoxLayout()
        self.content_layout.setContentsMargins(0, 0, 0, 0)
        self.content_layout.setSpacing(8)
        bubble_layout.addLayout(self.content_layout)

        palette = NEUTRALS.get(theme, NEUTRALS["light"])
        bg = ACCENT_COLOR if role == "user" else palette["surface"]
        fg = "#ffffff" if role == "user" else palette["text"]
        self.bubble.setStyleSheet(
            f"background-color: {bg}; color: {fg}; border-radius: {BORDER_RADIUS}px;"
        )

        if role == "assistant":
            self.main_layout.addWidget(avatar)
            self.main_layout.addWidget(self.bubble)
            self.main_layout.addStretch(1)
        else:
            self.main_layout.addStretch(1)
            self.main_layout.addWidget(self.bubble)
            self.main_layout.addWidget(avatar)

        if text:
            self.render_content()

    def render_content(self):
        # Clear previous widgets
        while self.content_layout.count():
            item = self.content_layout.takeAt(0)
            w = item.widget()
            if w:
                w.deleteLater()
        text = self.raw_text
        code_pattern = re.compile(r"```[\w]*\n(.*?)```", re.DOTALL)
        last_end = 0
        for match in code_pattern.finditer(text):
            before = text[last_end:match.start()]
            if before.strip():
                html = self.renderer.convert(before)
                lbl = QTextBrowser()
                lbl.setHtml(self._wrap_html(html))
                lbl.setOpenExternalLinks(True)
                lbl.setStyleSheet("background: transparent; border: none;")
                lbl.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
                lbl.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
                self.content_layout.addWidget(lbl)
                self.renderer.reset()
            code = match.group(1)
            cb = CodeBlockWidget(code)
            cb.copy_clicked.connect(self.copy_code)
            cb.insert_clicked.connect(self.insert_code)
            cb.expand_clicked.connect(self.expand_code)
            self.content_layout.addWidget(cb)
            last_end = match.end()
        after = text[last_end:]
        if after.strip() or text.strip() == "":
            html = self.renderer.convert(after)
            lbl = QTextBrowser()
            lbl.setHtml(self._wrap_html(html))
            lbl.setOpenExternalLinks(True)
            lbl.setStyleSheet("background: transparent; border: none;")
            lbl.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
            lbl.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
            self.content_layout.addWidget(lbl)
            self.renderer.reset()

    def _wrap_html(self, body: str) -> str:
        return (
            "<style>pre{background:#f8fafc;padding:8px;border-radius:6px;overflow-x:auto;}"\
            "code{font-family:'SF Mono','Cascadia Code',monospace;}"\
            "</style><body>{}</body>".format(body)
        )

    def set_text(self, text: str):
        self.raw_text = text
        self.render_content()

    def append_stream(self, delta: str):
        self.raw_text += delta
        self.render_content()

    def to_plain_text(self) -> str:
        return self.raw_text.strip()


class MessageList(QListWidget):
    """Container for chat messages."""

    def __init__(self):
        super().__init__()
        self.setFrameShape(QFrame.NoFrame)
        self.setStyleSheet("QListWidget{background:transparent;border:none;}")
        self.setSpacing(8)
        self.current_assistant: ChatMessageWidget | None = None
        self.skeleton_item: QListWidgetItem | None = None

    def add_user_message(self, text: str):
        widget = ChatMessageWidget("user", text)
        item = QListWidgetItem()
        item.setSizeHint(widget.sizeHint())
        self.addItem(item)
        self.setItemWidget(item, widget)
        self.scrollToBottom()

    def add_assistant_message(self, text: str = "") -> ChatMessageWidget:
        widget = ChatMessageWidget("assistant", text)
        item = QListWidgetItem()
        item.setSizeHint(widget.sizeHint())
        self.addItem(item)
        self.setItemWidget(item, widget)
        self.current_assistant = widget
        self.scrollToBottom()
        return widget

    def show_skeleton(self, skeleton: QWidget):
        item = QListWidgetItem()
        item.setSizeHint(skeleton.sizeHint())
        self.addItem(item)
        self.setItemWidget(item, skeleton)
        self.skeleton_item = item
        self.scrollToBottom()

    def remove_skeleton(self):
        if self.skeleton_item is not None:
            row = self.row(self.skeleton_item)
            self.takeItem(row)
            self.skeleton_item = None

    def append_streaming_text(self, text: str) -> ChatMessageWidget:
        if self.current_assistant is None:
            self.current_assistant = self.add_assistant_message("")
        self.current_assistant.append_stream(text)
        self.scrollToBottom()
        return self.current_assistant

    def set_final_text(self, text: str) -> ChatMessageWidget:
        if self.current_assistant is None:
            self.current_assistant = self.add_assistant_message(text)
        else:
            self.current_assistant.set_text(text)
        self.scrollToBottom()
        return self.current_assistant

    def clear_content(self):
        self.clear()
        self.current_assistant = None
        self.skeleton_item = None

    def last_assistant_text(self) -> str:
        for i in range(self.count()-1, -1, -1):
            w = self.itemWidget(self.item(i))
            if isinstance(w, ChatMessageWidget) and w.role == "assistant":
                return w.to_plain_text()
        return ""
