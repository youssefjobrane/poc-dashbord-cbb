"""One-shot converter: Power BI POC workbook -> compact JSON for the Angular mock API.

Usage: python tools/xlsx_to_json.py [path/to/POC_ChatbotBanque.zip | path/to/01_Donnees_fictives.xlsx]
Writes public/data/dataset.json and prints golden KPI values (Octobre 2026, tous départements).
"""
import io
import json
import sys
import zipfile
from datetime import date, datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT.parent / "POC_ChatbotBanque.zip"
MEMBER = "POC_ChatbotBanque/01_Donnees_fictives.xlsx"
OUT = ROOT / "public" / "data" / "dataset.json"


def load_workbook(src: Path):
    if src.suffix.lower() == ".zip":
        with zipfile.ZipFile(src) as z:
            return openpyxl.load_workbook(io.BytesIO(z.read(MEMBER)), read_only=True, data_only=True)
    return openpyxl.load_workbook(src, read_only=True, data_only=True)


def rows(wb, sheet):
    it = wb[sheet].iter_rows(values_only=True)
    header = next(it)
    return [dict(zip(header, r)) for r in it if any(v is not None for v in r)]


def as_date(v) -> date:
    return v.date() if isinstance(v, datetime) else v


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    wb = load_workbook(src)

    settings = rows(wb, "Settings")[0]
    dim_date = rows(wb, "Dim_Date")
    start = as_date(dim_date[0]["Date"])
    end = as_date(dim_date[-1]["Date"])

    departments = [
        {"id": r["DeptID"], "name": r["Département"], "short": r["DeptCourt"], "headcount": r["Effectif"], "order": r["Ordre"]}
        for r in rows(wb, "Dim_Department")
    ]
    themes = [
        {"id": r["ThemeID"], "name": r["Thématique"], "short": r["ThemeCourt"], "color": r["Couleur"], "order": r["Ordre"]}
        for r in rows(wb, "Dim_Theme")
    ]
    documents = [{"id": r["DocID"], "title": r["Document"], "category": r["Catégorie"]} for r in rows(wb, "Dim_Document")]

    users: dict[str, int] = {}
    keywords: dict[str, int] = {}
    convs: dict[str, int] = {}
    q = {k: [] for k in ("day", "user", "dept", "theme", "kw", "rt", "err", "cost", "fb", "conv")}
    qid_to_row: dict[int, int] = {}
    for r in rows(wb, "Fact_Questions"):
        qid_to_row[r["QuestionID"]] = len(q["day"])
        q["day"].append((as_date(r["Date"]) - start).days)
        q["user"].append(users.setdefault(r["UserID"], len(users)))
        q["dept"].append(r["DeptID"])
        q["theme"].append(r["ThemeID"])
        q["kw"].append(keywords.setdefault(r["Keyword"], len(keywords)))
        q["rt"].append(round(float(r["ResponseTimeSec"]), 2))
        q["err"].append(int(r["IsError"]))
        q["cost"].append(round(float(r["CostTND"]), 5))
        q["fb"].append(-1 if r["Feedback"] is None else int(r["Feedback"]))
        q["conv"].append(convs.setdefault(r["ConversationID"], len(convs)))

    cit = {"q": [], "doc": []}
    for r in rows(wb, "Fact_DocCitations"):
        cit["q"].append(qid_to_row[r["QuestionID"]])
        cit["doc"].append(r["DocID"])

    dataset = {
        "settings": {
            "dataAsOf": as_date(settings["DataAsOf"]).isoformat(),
            "monthlyBudgetTnd": settings["BudgetMensuelTND"],
            "satisfactionThreshold": settings["SeuilSatisfaction"],
            "adoptionThreshold": settings["SeuilAdoption"],
            "responseTimeThresholdSec": settings["SeuilTempsReponse"],
        },
        "calendar": {"start": start.isoformat(), "end": end.isoformat()},
        "departments": departments,
        "themes": themes,
        "documents": documents,
        "keywords": list(keywords),
        "userCount": len(users),
        "questions": q,
        "citations": cit,
    }
    OUT.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB), {len(q['day'])} questions, {len(cit['q'])} citations")

    # Golden values: Octobre 2026 (01/10 -> DataAsOf), all departments.
    d0 = (date(2026, 10, 1) - start).days
    d1 = (as_date(settings["DataAsOf"]) - start).days
    idx = [i for i, d in enumerate(q["day"]) if d0 <= d <= d1]
    n = len(idx)
    actifs = len({q["user"][i] for i in idx})
    cost = sum(q["cost"][i] for i in idx)
    voted = [i for i in idx if q["fb"][i] >= 0]
    sat = sum(1 for i in voted if q["fb"][i] == 1) / len(voted)
    in_period = set(idx)
    docs = len({cit["doc"][k] for k, qi in enumerate(cit["q"]) if qi in in_period})
    headcount = sum(d["headcount"] for d in departments)
    print(f"golden Oct 2026: actifs={actifs} questions={n} taux={actifs / headcount:.3%} q/u={n / actifs:.2f} "
          f"cost={cost:.2f} sat={sat:.2%} docs={docs}/{len(documents)} projection={cost / 21 * 31:.1f}")


if __name__ == "__main__":
    main()
