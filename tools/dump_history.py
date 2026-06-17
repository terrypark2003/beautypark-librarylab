import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import json, sys
from parse_request import parse_sheet
import openpyxl

PATH = "assets/event-requests/2026-07-design-request.xlsx"
wb = openpyxl.load_workbook(PATH, read_only=True)
sheets = [s for s in wb.sheetnames if __import__("re").match(r"^\d{4}\.\d{1,2}$", s)]
out = {}
for s in sheets:
    try:
        d = parse_sheet(PATH, s)
        groups = []
        for g in d["event_groups"]:
            items = [{"name": it["name"], "event": it["이벤트가"], "normal": it["정상가"]}
                     for it in g["items"] if it.get("name") and it["name"] != "`"]
            if items:
                groups.append({"group": g["group"].replace("\n", " ").strip(), "items": items})
        out[s] = {"title": d.get("title", ""), "emphasis": (d.get("emphasis") or "").replace("\n", " | "), "groups": groups}
    except Exception as e:
        out[s] = {"error": str(e)}
json.dump(out, open("dashboard/src/data/history.json", "w"), ensure_ascii=False, indent=1)
# summary
for s in sheets:
    g = out[s].get("groups", [])
    print(f"{s}: {len(g)} groups, {sum(len(x['items']) for x in g)} items")
