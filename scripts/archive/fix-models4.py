with open('packages/ai/src/models.ts', 'r') as f:
    text = f.read()

text = text.replace(r'\n  "llama-3.3-70b-versatile": {\n', '\n  "llama-3.3-70b-versatile": {\n')
text = text.replace(r'}', '}')

import re
text = re.sub(r'  \},\n  "llama-3\.1-8b"', r'  },\n  "llama3.1-8b"', text)
text = text.replace(r'\n', '\n')
