---
title: Special Characters and Unicode Testing
description: Document containing various special characters and Unicode symbols
keywords:
  - special characters
  - unicode
  - symbols
  - internationalization
---

# Special Characters and Unicode Testing

This document contains various special characters and Unicode symbols for testing search functionality.

## Punctuation and Symbols

### Common Punctuation

Standard punctuation marks: . , ; : ! ? ' " ( ) [ ] { } < >

### Mathematical Symbols

Basic math operators: + - × ÷ = ≠ ≈ < > ≤ ≥

Advanced symbols: ∑ ∏ ∫ √ ∞ ∈ ∉ ∀ ∃ ∅ ∪ ∩ ⊆ ⊇

### Currency Symbols

World currencies: $ £ € ¥ ₹ ₽ ₩ ₪ ₫ ₡ ₦ ₱ ₲ ₴ ₸

### Special Characters

Brackets and braces: [test] {content} (parentheses) ⟨angle⟩

Other symbols: @ # % ^ & * _ | \ / ~ `

## International Characters

### European Languages

#### German
Übergrößenträger, Müller, Schön, ä ö ü ß

#### French
Café, naïve, château, résumé, é à è ê ë î ï ô ù û ç œ

#### Spanish
Niño, piñata, ¿Cómo está?, ¡Hola!, á é í ó ú ñ ü

#### Italian
Perché, pizza,caffè, à è é ì ò ù

#### Scandinavian
Ångström, København, Skagen, å ä ö ø

### Eastern European

#### Russian
Привет мир, тестирование поиска, Москва, Санкт-Петербург

#### Polish
Wałęsa, zażółć gęślą jaźń, ą ć ę ł ń ó ś ź ż

#### Czech
Český Krumlov, Říp, ščřžýáíé

### Asian Languages

#### Japanese (Hiragana/Katakana/Kanji)
こんにちは世界, テスト, 東京, 大阪, 検索機能

#### Korean (Hangul)
안녕하세요, 검색, 서울, 부산

#### Chinese (Simplified)
你好世界，测试功能，北京，上海

#### Arabic
مرحبا بالعالم، اختبار البحث، القاهرة

#### Hebrew
שלום עולם, בדיקת חיפוש, תל אביב

#### Hindi
नमस्ते दुनिया, खोज परीक्षण, दिल्ली

## Technical Symbols

### Programming Symbols

Common programming symbols: && || != == ++ -- += -= *= /= %=

Regular expression patterns: \d+ \w+ [a-zA-Z] \s+ ^$ \b

URL encoding: %20 %2F %3F %3D %26

### File Paths

Windows paths: C:\Users\Username\Documents\file.txt

Unix paths: /home/user/documents/file.txt

UNC paths: \\server\share\folder\file.txt

### Markup and Code

HTML entities: &lt; &gt; &amp; &quot; &apos; &nbsp;

Markdown: **bold** *italic* `code` [link](url)

## Special Whitespace

Various whitespace characters for testing:

Regular space: " "
Tab character: "	"
Non-breaking space: " "
En space: " "
Em space: " "
Thin space: " "
Hair space: " "

## Emoji and Modern Symbols

### Common Emojis
😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾

### Hand Symbols
👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏

## Mixed Content Examples

### Code with International Comments
```javascript
// 这是一个中文注释 - This is a Chinese comment
function calcularTotal(productos) { // Spanish function name
    // German variable names
    const gesamtpreis = produkten.reduce((summe, produkt) => {
        return summe + produkt.preis; // French variable name
    }, 0);

    return gesamtpreis; // Return total in German
}
```

### Mathematical Expressions with Unicode
The formula E = mc² represents mass-energy equivalence.

Greek letters: α (alpha), β (beta), γ (gamma), δ (delta), θ (theta), λ (lambda), μ (mu), π (pi), σ (sigma), φ (phi), ω (omega)

### Multilingual Text
English: "Search functionality works well"
German: "Suchfunktionalität funktioniert gut"
French: "La fonctionnalité de recherche fonctionne bien"
Spanish: "La funcionalidad de búsqueda funciona bien"
Japanese: "検索機能は正常に動作します"
Russian: "Функциональность поиска работает хорошо"

## Edge Cases for Search

### Regex Special Characters
Characters that need escaping in regex: . ^ $ * + ? ( ) [ ] { } \ |

### Quote Variations
Different quote styles: "double quotes" 'single quotes' „German quotes" «French quotes» 「Japanese quotes」

### Dash Types
Various dash characters: - (hyphen) – (en dash) — (em dash) ― (horizontal bar)

### Number Formats
Different number representations: 1,000 1.000 1 000 ١٬٠٠٠ (Arabic numerals)

### Date Formats
Various date formats: 12/31/2023 31.12.2023 31-12-2023 2023年12月31日