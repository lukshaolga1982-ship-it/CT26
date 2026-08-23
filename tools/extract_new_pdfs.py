#!/usr/bin/env python3
import json
import re
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
UPLOAD = ROOT.parents[1] / "upload"
SOURCES = [
    (UPLOAD / "тесты-аналоги 2025 (26-32) Teacher's Copy-unlocked.pdf", "analogs-2025", "Аналоги 2025"),
    (UPLOAD / "тесты-аналоги 2025 (33-40) Teacher's Copy-разблокирован.pdf", "analogs-2025", "Аналоги 2025"),
    (UPLOAD / "Тесты-аналоги (51-60)  Teacher's Copy-unlocked.pdf", "analogs-51-60", "Аналоги 51–60"),
]

BLOCKS = ["A1–A4", "A5–A8", "A9–A12", "A13–A14", "A15–A18", "B1–B3", "B4–B6", "B7–B8", "B9–B18", "B19–B22"]


def block(section, number):
    if section == "A":
        return BLOCKS[0 if number <= 4 else 1 if number <= 8 else 2 if number <= 12 else 3 if number <= 14 else 4]
    return BLOCKS[5 if number <= 3 else 6 if number <= 6 else 7 if number <= 8 else 8 if number <= 18 else 9]


def clean(text):
    text = text.replace("\u00ad", "").replace("…", "...")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def make_lines(page, page_no):
    words = page.extract_words(extra_attrs=["fontname"], use_text_flow=False)
    words.sort(key=lambda w: (round(w["top"] / 2) * 2, w["x0"]))
    rows = []
    for word in words:
        if word["top"] < 30 or word["top"] > 805:
            continue
        if not rows or abs(rows[-1]["top"] - word["top"]) > 2.2:
            rows.append({"top": word["top"], "page": page_no, "words": []})
        rows[-1]["words"].append({"text": word["text"], "bold": "Bold" in word["fontname"], "x0": word["x0"]})
    for row in rows:
        row["text"] = " ".join(w["text"] for w in row["words"])
    return rows


def task_marker(text):
    compact = re.sub(r"\s+", "", text).replace("А", "A").replace("В", "B")
    m = re.match(r"^([AB])(\d{1,2})\.", compact)
    return (m.group(1), int(m.group(2))) if m else None


def option_parts(words):
    markers = [(i, int(m.group(1))) for i, w in enumerate(words) if (m := re.match(r"^([1-5])\)$", w["text"]))]
    parts = []
    for pos, (idx, number) in enumerate(markers):
        end = markers[pos + 1][0] if pos + 1 < len(markers) else len(words)
        chunk = words[idx + 1:end]
        text = clean(" ".join(w["text"] for w in chunk))
        if text:
            parts.append((number, text, sum(w["bold"] for w in chunk), len(chunk)))
    return parts


def extract_pdf(path, collection_id, collection_label):
    rows = []
    with pdfplumber.open(path) as pdf:
        for index, page in enumerate(pdf.pages, 1):
            rows.extend(make_lines(page, index))

    starts = []
    for i, row in enumerate(rows):
        m = re.search(r"(?:(?:Test|Тест)\s*-?\s*аналог\s*(\d{2})|(\d{2})\s*(?:Test|Тест)\s*-?\s*аналог|(?:Test|Тест)\s*(\d{2}))", row["text"], re.I)
        if m:
            starts.append((i, int(next(x for x in m.groups() if x))))
    starts = list(dict.fromkeys(starts))
    tests = []
    for k, (start, number) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(rows)
        segment = rows[start:end]
        flat_words = [w for row in segment for w in row["words"]]
        markers = []
        for idx, word in enumerate(flat_words):
            token = word["text"].replace("А", "A").replace("В", "B").replace("l", "1").replace("I", "1")
            if "–" in token or "-" in token:
                continue
            if idx + 1 < len(flat_words) and flat_words[idx + 1]["text"] in {"-", "–"}:
                continue
            m = re.match(r"^\(?([AB])(\d{1,2})(?:\.|\s|\)|$)(?:[^)]*)\)?$", token, re.I)
            used = 1
            if not m and re.match(r"^[AB]$", token, re.I) and idx + 2 < len(flat_words):
                joined = token + flat_words[idx + 1]["text"] + flat_words[idx + 2]["text"]
                m = re.match(r"^([AB])(\d{1,2})\.$", joined.replace("А", "A").replace("В", "B"), re.I)
                used = 3
            if not m and token == "14." and ("A", 13) in [x[1] for x in markers] and ("A", 14) not in [x[1] for x in markers]:
                m = re.match(r"^(A)(14)\.$", "A14.")
            if m:
                marker = (m.group(1).upper(), int(m.group(2)))
                if marker not in [x[1] for x in markers]:
                    markers.append((idx, marker, used))
        questions = []
        all_text = "\n".join(r["text"] for r in segment)
        part_b_match = re.search(r"Часть\s+[ВB]", all_text)
        part_a_text = all_text[:part_b_match.start()] if part_b_match else all_text
        for mi, (idx, (section, qn), used) in enumerate(markers):
            next_idx = markers[mi + 1][0] if mi + 1 < len(markers) else len(flat_words)
            qwords = flat_words[idx + used:next_idx]
            qrows = [{"text": " ".join(w["text"] for w in qwords), "words": qwords}]
            label_re = re.compile(rf"^[AАBВ]{qn}\.$", re.I)
            qwords = [w for w in qwords if not label_re.match(w["text"])]
            if section == "A":
                options = option_parts(qwords)
                if not options:
                    options = [(i, str(i), 1 if i == 1 else 0, 1) for i in range(1, 6)]
                answer_number = max(options, key=lambda item: (item[2] / max(item[3], 1), item[2]))[0]
                answer = next(item[1] for item in options if item[0] == answer_number)
                display_options = [x[1] for x in options]
                if len(display_options) < 4:
                    display_options = ["1", "2", "3", "4", "5"]
                    answer = str(answer_number)
                prompt_text = clean(" ".join(r["text"] for r in qrows))
                first_option = re.search(r"(?:^|\s)1\)", prompt_text)
                prompt_text = prompt_text[:first_option.start()].strip() if first_option else prompt_text
                if qn <= 4:
                    context = clean(re.split(r"\nA1\.", part_a_text.replace("А", "A"), maxsplit=1)[0])
                elif 9 <= qn <= 12:
                    before = part_a_text.replace("А", "A").split(f"A{qn}.")[0]
                    context = clean("\n".join(before.splitlines()[-14:]))
                elif qn >= 15:
                    before = part_a_text.replace("А", "A").split(f"A{qn}.")[0]
                    context = clean("\n".join(before.splitlines()[-35:]))
                else:
                    context = prompt_text
                questions.append({"id": f"A{qn}", "section": "A", "block": block("A", qn), "type": "choice", "prompt": prompt_text or f"Выберите правильный вариант для A{qn}.", "context": context, "options": display_options, "answer": answer, "accepted": [answer], "points": 1})
            else:
                bold_words = [w["text"] for w in qwords if w["bold"] and not re.match(r"^[BВ]\d+\.?$", w["text"])]
                answer = bold_words[-1] if bold_words else ""
                if not answer:
                    english_caps = [w["text"].strip(".,;:()") for w in qwords if re.match(r"^[A-Z][A-Z'/-]{1,20}$", w["text"].strip(".,;:()"))]
                    answer = english_caps[0] if english_caps else ""
                if 7 <= qn <= 8:
                    standalone = [clean(r["text"]) for r in qrows[1:] if clean(r["text"]).isupper() and len(clean(r["text"]).split()) <= 3]
                    if standalone:
                        answer = standalone[-1]
                text = clean("\n".join(r["text"] for r in qrows))
                if answer and qn <= 6:
                    text = re.sub(rf"\b{re.escape(answer)}\b", "...", text, count=1, flags=re.I)
                if answer and qn >= 19:
                    text = re.sub(rf"\b{re.escape(answer)}\b", "...", text, count=1, flags=re.I)
                if 7 <= qn <= 8:
                    text = re.sub(r"\n[A-Z][A-Z '-]{1,30}$", "", text)
                prompt = "Заполните пропуск одним предлогом." if qn <= 3 else "Заполните пропуск одним словом." if qn <= 6 else "Введите одно слово, подходящее для двух предложений." if qn <= 8 else "Выпишите одно лишнее слово." if qn <= 18 else "Образуйте однокоренное слово."
                questions.append({"id": f"B{qn}", "section": "B", "block": block("B", qn), "type": "input", "prompt": prompt, "context": text, "answer": answer.lower(), "accepted": [answer.lower()] if answer else [], "points": 2})
        by_id = {q["id"]: q for q in questions}
        for qid, q in by_id.items():
            if q["section"] == "B" and not q.get("accepted"):
                m = re.search(rf"(?:^|\n)\(?{qid}\.?\)?\s*(.*?)(?=\n\(?B\d{{1,2}}\.?|$)", all_text, re.I | re.S)
                fallback_text = clean(m.group(1)) if m else ""
                caps = re.findall(r"\b[A-Z][A-Z'/-]{1,20}\b", fallback_text)
                if caps:
                    answer = caps[-1] if qid in {"B7", "B8"} else caps[0]
                    q["answer"] = answer.lower()
                    q["accepted"] = [answer.lower()]
                    q["context"] = fallback_text
            if q["section"] == "B" and q.get("answer") and (int(qid[1:]) <= 6 or int(qid[1:]) >= 19):
                q["context"] = re.sub(rf"\b{re.escape(q['answer'])}\b", "...", q["context"], count=1, flags=re.I)
        ordered = [by_id.get(f"A{i}") for i in range(1, 19)] + [by_id.get(f"B{i}") for i in range(1, 23)]
        missing = [f"A{i}" for i in range(1, 19) if f"A{i}" not in by_id] + [f"B{i}" for i in range(1, 23) if f"B{i}" not in by_id]
        tests.append({"id": f"{collection_id}-{number}", "collection": collection_id, "year": collection_label, "number": number, "title": f"Тест-аналог {number}", "questionCount": len([q for q in ordered if q]), "status": "ready" if not missing else "review", "format": "interactive", "structure": "A1–A18 · B1–B22", "source": path.name, "questions": [q for q in ordered if q], "missing": missing})
    return tests


def main():
    tests = []
    for source in SOURCES:
        tests.extend(extract_pdf(*source))
    out = ROOT / "data" / "new-pdf-tests.js"
    out.write_text("window.NEW_PDF_TESTS = " + json.dumps(tests, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    report = [{"id": t["id"], "questions": t["questionCount"], "missing": t["missing"], "emptyAnswers": [q["id"] for q in t["questions"] if not q.get("accepted")]} for t in tests]
    (ROOT / "data" / "new-bank-validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
