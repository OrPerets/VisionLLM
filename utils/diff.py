import difflib
from typing import List, Tuple, Optional

def side_by_side(a: str, b: str) -> Tuple[List[str], List[str], List[Optional[str]], List[Optional[str]]]:
    """Return side-by-side diff data between strings ``a`` and ``b``.

    Returns tuple of (left_lines, right_lines, left_styles, right_styles) where
    styles list contains ``'del'`` for deletions and ``'add'`` for additions.
    ``None`` indicates unchanged line.
    """
    left_lines: List[str] = []
    right_lines: List[str] = []
    left_styles: List[Optional[str]] = []
    right_styles: List[Optional[str]] = []

    for line in difflib.ndiff(a.splitlines(), b.splitlines()):
        tag = line[:2]
        text = line[2:]
        if tag == ' ':  # unchanged
            left_lines.append('  ' + text)
            right_lines.append('  ' + text)
            left_styles.append(None)
            right_styles.append(None)
        elif tag == '- ':  # deletion on left
            left_lines.append('- ' + text)
            right_lines.append('')
            left_styles.append('del')
            right_styles.append(None)
        elif tag == '+ ':  # addition on right
            left_lines.append('')
            right_lines.append('+ ' + text)
            left_styles.append(None)
            right_styles.append('add')
        # ignore '? ' lines produced by ndiff
    return left_lines, right_lines, left_styles, right_styles
