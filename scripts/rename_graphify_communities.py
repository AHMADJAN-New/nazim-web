from __future__ import annotations

import json
import math
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path

from networkx.readwrite import json_graph

from graphify import export
from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.detect import detect
from graphify.report import generate as generate_report


GENERIC_TOKENS = {
    "app",
    "apps",
    "backend",
    "frontend",
    "src",
    "lib",
    "http",
    "controller",
    "controllers",
    "model",
    "models",
    "service",
    "services",
    "provider",
    "providers",
    "request",
    "requests",
    "response",
    "responses",
    "route",
    "routes",
    "query",
    "queries",
    "page",
    "pages",
    "component",
    "components",
    "hook",
    "hooks",
    "function",
    "functions",
    "helper",
    "helpers",
    "util",
    "utils",
    "type",
    "types",
    "file",
    "files",
    "document",
    "documents",
    "module",
    "modules",
    "feature",
    "features",
    "common",
    "core",
    "data",
    "index",
    "main",
    "test",
    "tests",
    "migration",
    "migrations",
    "build",
    "builder",
    "boot",
    "construct",
    "create",
    "update",
    "delete",
    "remove",
    "render",
    "show",
    "list",
    "get",
    "set",
    "handle",
    "map",
    "mapper",
    "mappers",
    "load",
    "save",
    "validate",
    "check",
    "apply",
    "default",
    "root",
    "json",
    "js",
    "ts",
    "tsx",
    "php",
    "md",
    "use",
    "table",
    "factory",
    "management",
    "command",
    "console",
    "script",
    "platform",
    "org",
    "setting",
    "policy",
    "scope",
    "has",
    "object",
    "change",
    "insert",
    "observer",
    "form",
    "dialog",
    "detail",
    "editor",
    "layout",
    "view",
    "template",
    "middleware",
    "name",
    "property",
    "status",
    "code",
    "prepare",
    "authorize",
    "validation",
    "extract",
    "entity",
    "action",
    "add",
    "start",
    "cancel",
    "store",
    "en",
    "fa",
    "ps",
    "ar",
}

PATH_SKIP_PARTS = {
    "app",
    "backend",
    "frontend",
    "src",
    "components",
    "hooks",
    "models",
    "http",
    "controllers",
    "services",
    "pages",
    "lib",
    "resources",
    "tests",
    "database",
    "migrations",
    "vendor",
    "help-center",
    "articles",
    "console",
    "commands",
}

DOMAIN_TOKENS = {
    "academic",
    "account",
    "activity",
    "admin",
    "admission",
    "article",
    "asset",
    "attendance",
    "audit",
    "branding",
    "building",
    "calendar",
    "certificate",
    "class",
    "contact",
    "content",
    "course",
    "currency",
    "discipline",
    "dms",
    "document",
    "donor",
    "event",
    "exam",
    "facility",
    "fatwa",
    "fee",
    "finance",
    "graduation",
    "grade",
    "help",
    "history",
    "hostel",
    "i18n",
    "id",
    "letter",
    "library",
    "login",
    "media",
    "message",
    "notification",
    "onboarding",
    "organization",
    "payment",
    "performance",
    "permission",
    "public",
    "report",
    "role",
    "room",
    "school",
    "scholar",
    "staff",
    "storage",
    "student",
    "subject",
    "subscription",
    "support",
    "timetable",
    "translation",
    "website",
}

ACRONYM_DISPLAY = {
    "api": "API",
    "dms": "DMS",
    "hr": "HR",
    "id": "ID",
    "i18n": "I18n",
    "pdf": "PDF",
    "sms": "SMS",
    "ui": "UI",
}

IRREGULAR_NORMALIZATION = {
    "admissions": "admission",
    "articles": "article",
    "assets": "asset",
    "certificates": "certificate",
    "classes": "class",
    "currencies": "currency",
    "documents": "document",
    "donors": "donor",
    "events": "event",
    "exams": "exam",
    "fees": "fee",
    "graduations": "graduation",
    "grades": "grade",
    "hostels": "hostel",
    "messages": "message",
    "notifications": "notification",
    "organizations": "organization",
    "payments": "payment",
    "permissions": "permission",
    "reports": "report",
    "roles": "role",
    "rooms": "room",
    "scholars": "scholar",
    "schools": "school",
    "seeders": "seeder",
    "students": "student",
    "subjects": "subject",
    "subscriptions": "subscription",
    "templates": "template",
    "timetables": "timetable",
    "translations": "translation",
    "websites": "website",
}

MANUAL_OVERRIDES = {
    37: "Attendance",
}


def split_words(text: str) -> list[str]:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", str(text))
    text = re.sub(r"[^A-Za-z0-9]+", " ", text)
    return [part for part in text.split() if part]


def normalize_token(token: str) -> str | None:
    token = token.strip().lower()
    if not token or token.isdigit():
        return None
    token = IRREGULAR_NORMALIZATION.get(token, token)
    if len(token) <= 2 and token not in ACRONYM_DISPLAY:
        return None
    if token.endswith("ies") and len(token) > 4:
        token = token[:-3] + "y"
    elif token.endswith("s") and len(token) > 4 and not token.endswith(("ss", "us")):
        token = token[:-1]
    if token in GENERIC_TOKENS:
        return None
    return token


def display_text(token: str) -> str:
    return ACRONYM_DISPLAY.get(token, token.capitalize())


def safe_name(label: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|#^[\]]', "", label.replace("\r\n", " ").replace("\r", " ").replace("\n", " ")).strip()
    cleaned = re.sub(r"\.(md|mdx|markdown)$", "", cleaned, flags=re.IGNORECASE)
    return cleaned or "unnamed"


def communities_from_graph(graph) -> dict[int, list[str]]:
    communities: defaultdict[int, list[str]] = defaultdict(list)
    for node_id, attrs in graph.nodes(data=True):
        community = attrs.get("community")
        if community is None:
            continue
        communities[int(community)].append(node_id)
    return dict(sorted(communities.items()))


def label_weight(label: str, degree: int) -> float:
    weight = 1.0 + math.log1p(max(degree, 1))
    if "(" in label or ")" in label:
        weight *= 0.12
    if label[:1].islower():
        weight *= 0.65
    return weight


def collect_scores(graph, members: list[str]) -> tuple[Counter[str], Counter[str]]:
    token_scores: Counter[str] = Counter()
    domain_scores: Counter[str] = Counter()

    for node_id in members:
        attrs = graph.nodes[node_id]
        label = attrs.get("label", node_id)
        weight = label_weight(label, graph.degree(node_id))

        for raw in split_words(label):
            token = normalize_token(raw)
            if not token:
                continue
            token_scores[token] += weight * 1.8
            if token in DOMAIN_TOKENS:
                domain_scores[token] += weight * 2.8

        source_file = attrs.get("source_file") or ""
        file_stem = Path(source_file).stem
        for raw in split_words(file_stem):
            token = normalize_token(raw)
            if not token:
                continue
            token_scores[token] += max(weight, 1.0) * 3.0
            if token in DOMAIN_TOKENS:
                domain_scores[token] += max(weight, 1.0) * 4.0

        for part in Path(source_file).parts:
            stem = Path(part).stem
            if stem.lower() in PATH_SKIP_PARTS:
                continue
            for raw in split_words(stem):
                token = normalize_token(raw)
                if not token:
                    continue
                token_scores[token] += max(weight, 1.0) * 1.3
                if token in DOMAIN_TOKENS:
                    domain_scores[token] += max(weight, 1.0) * 3.2

    return token_scores, domain_scores


def choose_candidates(token_scores: Counter[str], domain_scores: Counter[str]) -> list[str]:
    preferred = domain_scores if domain_scores else token_scores
    if not preferred:
        return ["Unlabeled Community"]

    top_tokens = [token for token, _ in preferred.most_common(6)]
    top_score = preferred[top_tokens[0]]

    candidates: list[str] = []
    if top_tokens:
        candidates.append(display_text(top_tokens[0]))

    if len(top_tokens) >= 2 and preferred[top_tokens[1]] >= top_score * 0.5:
        candidates.insert(0, f"{display_text(top_tokens[0])} & {display_text(top_tokens[1])}")
    elif len(top_tokens) >= 2:
        candidates.append(f"{display_text(top_tokens[0])} & {display_text(top_tokens[1])}")

    if len(top_tokens) >= 3 and preferred[top_tokens[2]] >= top_score * 0.35:
        candidates.append(f"{display_text(top_tokens[0])} & {display_text(top_tokens[2])}")
        candidates.append(f"{display_text(top_tokens[1])} & {display_text(top_tokens[2])}")

    for token in top_tokens[1:]:
        candidates.append(display_text(token))

    deduped: list[str] = []
    for candidate in candidates:
        if candidate not in deduped:
            deduped.append(candidate)
    return deduped or ["Unlabeled Community"]


def build_labels(graph, communities: dict[int, list[str]]) -> dict[int, str]:
    labels: dict[int, str] = {}
    used_names: Counter[str] = Counter()
    reserved_names = set(MANUAL_OVERRIDES.values())

    for cid, label in MANUAL_OVERRIDES.items():
        if cid not in communities:
            continue
        labels[cid] = label
        used_names[label] += 1

    for cid, members in communities.items():
        if cid in labels:
            continue
        token_scores, domain_scores = collect_scores(graph, members)
        candidates = choose_candidates(token_scores, domain_scores)
        filtered = [
            candidate
            for candidate in candidates
            if not (candidate in reserved_names and used_names[candidate] > 0)
        ]
        candidate_pool = filtered or candidates
        base = next((candidate for candidate in candidate_pool if used_names[candidate] == 0), candidate_pool[0])
        count = used_names[base]
        used_names[base] += 1
        labels[cid] = base if count == 0 else f"{base} {count + 1}"

    return labels


def update_workspace(vault_dir: Path) -> None:
    workspace_path = vault_dir / ".obsidian" / "workspace.json"
    if not workspace_path.exists():
        return

    workspace = json.loads(workspace_path.read_text(encoding="utf-8"))

    def walk(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if child == "Welcome.md":
                    value[key] = "Home.md"
                elif child == "Welcome":
                    value[key] = "Home"
                else:
                    walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(workspace)
    last_open_files = workspace.setdefault("lastOpenFiles", [])
    merged = []
    for entry in ["Home.md", "GRAPH_REPORT.md", "graph.canvas", *last_open_files]:
        if entry not in merged:
            merged.append(entry)
    workspace["lastOpenFiles"] = merged
    workspace_path.write_text(json.dumps(workspace, indent=2), encoding="utf-8")


def detection_from_report(report_path: Path) -> dict | None:
    if not report_path.exists():
        return None

    text = report_path.read_text(encoding="utf-8")
    counts_match = re.search(r"- (\d+) files · ~([\d,]+) words", text)
    if counts_match:
        return {
            "total_files": int(counts_match.group(1)),
            "total_words": int(counts_match.group(2).replace(",", "")),
        }

    warning_match = re.search(r"## Corpus Check\s+- (.+)", text)
    if warning_match:
        return {
            "total_files": 0,
            "total_words": 0,
            "warning": warning_match.group(1).strip(),
        }

    return None


def write_home(vault_dir: Path, graph, communities: dict[int, list[str]], written_count: int, detect_result: dict) -> None:
    markdown_count = len(list(vault_dir.glob("*.md")))
    canvas_count = len(list(vault_dir.glob("*.canvas")))
    lines = [
        "---",
        "type: index",
        "tags:",
        "  - graphify/index",
        "  - graphify/vault",
        "---",
        "",
        "# Nazim Graph Vault",
        "",
        "This vault contains the full Graphify export with renamed community labels:",
        "- one note per graph node",
        "- one overview note per community",
        "- the current Graphify report and canvas export",
        "",
        "## Quick Start",
        "- [[GRAPH_REPORT]]",
        "- [[graph.canvas]]",
        "- Open any `_COMMUNITY_*.md` note or use Obsidian Graph View.",
        "",
        "## Snapshot",
        f"- Files in corpus: {detect_result.get('total_files', 0):,}",
        f"- Approximate words in corpus: {detect_result.get('total_words', 0):,}",
        f"- Graph nodes: {graph.number_of_nodes():,}",
        f"- Graph edges: {graph.number_of_edges():,}",
        f"- Community groups in graph data: {len(communities):,}",
        f"- Markdown files currently in this vault root: {markdown_count:,}",
        f"- Canvas files currently in this vault root: {canvas_count:,}",
        f"- Exported notes written this pass: {written_count:,}",
        "",
        "#graphify/index #graphify/vault",
        "",
    ]
    (vault_dir / "Home.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    repo = Path.cwd()
    graph_path = repo / "graphify-out" / "graph.json"
    report_path = repo / "graphify-out" / "GRAPH_REPORT.md"
    vault_dir = repo / "graphify-out" / "nazim graph"
    labels_path = repo / ".graphify_labels.json"

    graph_data = json.loads(graph_path.read_text(encoding="utf-8"))
    try:
        graph = json_graph.node_link_graph(graph_data, edges="links")
    except TypeError:
        graph = json_graph.node_link_graph(graph_data)

    communities = communities_from_graph(graph)
    labels = build_labels(graph, communities)

    labels_path.write_text(
        json.dumps({str(cid): label for cid, label in labels.items()}, indent=2),
        encoding="utf-8",
    )

    detect_result = detection_from_report(report_path) or detect(repo)
    cohesion_scores: dict[int, float] = {}
    gods = god_nodes(graph)
    surprises = surprising_connections(graph, communities)
    questions = suggest_questions(graph, communities, labels)
    report = generate_report(
        graph,
        communities,
        cohesion_scores,
        labels,
        gods,
        surprises,
        detect_result,
        {"input": graph_data.get("input_tokens", 0), "output": graph_data.get("output_tokens", 0)},
        repo.name,
        suggested_questions=questions,
    )
    report_path.write_text(report, encoding="utf-8")

    vault_dir.mkdir(parents=True, exist_ok=True)
    obsidian_dir = vault_dir / ".obsidian"
    obsidian_dir.mkdir(exist_ok=True)
    for item in list(vault_dir.iterdir()):
        if item.name == ".obsidian":
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()

    written_count = export.to_obsidian(graph, communities, str(vault_dir), community_labels=labels)
    export.to_canvas(graph, communities, str(vault_dir / "graph.canvas"), community_labels=labels)
    shutil.copy2(report_path, vault_dir / "GRAPH_REPORT.md")
    write_home(vault_dir, graph, communities, written_count, detect_result)
    update_workspace(vault_dir)

    print(f"Communities relabeled: {len(labels)}")
    print(f"Sample: 33 -> {labels.get(33)}")
    print(f"Vault updated: {vault_dir}")


if __name__ == "__main__":
    main()
