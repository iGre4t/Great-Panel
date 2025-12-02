from pathlib import Path
path = Path('index.php')
text = path.read_text(encoding='utf-8')
print(text)
