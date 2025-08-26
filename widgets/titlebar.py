try:
    from qframelesswindow import TitleBar as QFTitleBar
    from PySide6.QtCore import Qt

    class TitleBar(QFTitleBar):
        """Custom minimal title bar for frameless window."""
        def __init__(self, parent=None):
            super().__init__(parent)
            self.setFixedHeight(36)
            self.setAttribute(Qt.WA_StyledBackground, True)
except Exception:  # pragma: no cover - fallback when qframelesswindow missing
    from PySide6.QtWidgets import QWidget

    class TitleBar(QWidget):
        def __init__(self, parent=None):
            super().__init__(parent)
