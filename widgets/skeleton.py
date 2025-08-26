from PySide6.QtWidgets import QFrame
from PySide6.QtCore import QPropertyAnimation, QRect


class SkeletonBubble(QFrame):
    """Simple shimmering skeleton placeholder."""

    def __init__(self, width: int = 200, height: int = 40):
        super().__init__()
        self.setFixedSize(width, height)
        self.setStyleSheet("border-radius:6px; background-color:#e5e7eb;")
        # Optional subtle animation on the palette to mimic shimmer
        self.anim = QPropertyAnimation(self, b"geometry")
        self.anim.setDuration(1000)
        self.anim.setStartValue(QRect(0, 0, width, height))
        self.anim.setEndValue(QRect(0, 0, width, height))
        self.anim.setLoopCount(-1)
        self.anim.start()
