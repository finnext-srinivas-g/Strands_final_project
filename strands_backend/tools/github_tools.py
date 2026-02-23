import json
import os
from base64 import b64decode
from collections import Counter
from urllib import error, request

from strands import tool


def _github_get_json(url: str, headers: dict[str, str]) -> tuple[dict | list | None, str | None]:
    req = request.Request(url, headers=headers)
    try:
        with request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8")), None
    except error.HTTPError as exc:
        return None, f"GitHub API error: HTTP {exc.code}"
    except error.URLError:
        return None, "Unable to reach GitHub API."


def _parse_repo_names(repo_names: str) -> list[str]:
    if not repo_names:
        return []
    parsed: list[str] = []
    for item in repo_names.replace("\n", ",").split(","):
        name = item.strip()
        if name and name not in parsed:
            parsed.append(name)
    return parsed


def _file_extension(path: str) -> str:
    leaf = path.rsplit("/", 1)[-1]
    if not leaf:
        return "<no_extension>"
    if leaf.startswith(".") and leaf.count(".") == 1:
        return leaf.lower()
    if "." not in leaf:
        return "<no_extension>"
    return f".{leaf.rsplit('.', 1)[-1].lower()}"


def _resolve_repo_metadata(
    username: str,
    requested_repo_names: list[str],
    safe_limit_repos: int,
    headers: dict[str, str],
) -> tuple[list[dict], str | None]:
    repos_to_scan: list[dict] = []

    if requested_repo_names:
        for repo_name in requested_repo_names[:safe_limit_repos]:
            if not username:
                repos_to_scan.append({"name": repo_name, "error": "GITHUB_USERNAME is missing in backend .env"})
                continue
            endpoint = f"https://api.github.com/repos/{username}/{repo_name}"
            payload, err = _github_get_json(endpoint, headers)
            if err or not isinstance(payload, dict):
                repos_to_scan.append({"name": repo_name, "error": err or "Repository not found or not accessible"})
                continue
            repos_to_scan.append(payload)
        return repos_to_scan, None

    endpoint = f"https://api.github.com/user/repos?per_page={safe_limit_repos}&sort=updated&direction=desc&type=all"
    payload, err = _github_get_json(endpoint, headers)
    if err:
        return [], err
    if not isinstance(payload, list):
        return [], "Unexpected GitHub API response."
    repos_to_scan = [repo for repo in payload if isinstance(repo, dict)]
    return repos_to_scan, None


@tool
def get_my_github_repos(limit: int = 100) -> dict:
    """Fetch repository names for the configured GitHub account from backend .env."""
    token = os.getenv("GITHUB_TOKEN", "").strip()
    username = os.getenv("GITHUB_USERNAME", "").strip()

    if not token:
        return {"error": "GITHUB_TOKEN is missing in backend .env", "repo_names": [], "repo_count": 0}

    safe_limit = max(1, min(limit, 100))
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "strands-agent-github-tool",
        "Authorization": f"Bearer {token}",
    }
    endpoint = f"https://api.github.com/user/repos?per_page={safe_limit}&sort=updated&direction=desc&type=all"

    payload, err = _github_get_json(endpoint, headers)
    if err:
        return {"error": err, "username": username or "not-set", "repo_names": [], "repo_count": 0}
    if not isinstance(payload, list):
        return {"error": "Unexpected GitHub API response.", "username": username or "not-set", "repo_names": [], "repo_count": 0}

    repo_names = [str(repo.get("name", "")).strip() for repo in payload if isinstance(repo, dict) and repo.get("name")]

    return {
        "username": username or "not-set",
        "repo_count": len(repo_names),
        "repo_names": repo_names,
    }


@tool
def get_github_repo_file_types(
    repo_names: str = "",
    limit_repos: int = 10,
    max_extensions_per_repo: int = 20,
) -> dict:
    """
    Return file-type counts for selected repositories.
    Pass repo_names as comma-separated names. If empty, latest repos are used.
    """
    token = os.getenv("GITHUB_TOKEN", "").strip()
    username = os.getenv("GITHUB_USERNAME", "").strip()

    if not token:
        return {"error": "GITHUB_TOKEN is missing in backend .env", "repos": [], "repo_count": 0}

    safe_limit_repos = max(1, min(limit_repos, 30))
    safe_max_extensions = max(1, min(max_extensions_per_repo, 50))

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "strands-agent-github-tool",
        "Authorization": f"Bearer {token}",
    }

    requested_repo_names = _parse_repo_names(repo_names)
    repos_to_scan, repo_err = _resolve_repo_metadata(username, requested_repo_names, safe_limit_repos, headers)
    if repo_err:
        return {"error": repo_err, "username": username or "not-set", "repos": [], "repo_count": 0}

    results: list[dict] = []

    for repo in repos_to_scan:
        repo_name = str(repo.get("name", "")).strip() if isinstance(repo, dict) else ""
        if not repo_name:
            continue

        if isinstance(repo, dict) and repo.get("error"):
            results.append({"repo_name": repo_name, "error": str(repo.get("error"))})
            continue

        owner = ""
        if isinstance(repo, dict):
            owner_info = repo.get("owner")
            if isinstance(owner_info, dict):
                owner = str(owner_info.get("login", "")).strip()
        if not owner:
            owner = username

        default_branch = str(repo.get("default_branch", "main")).strip() if isinstance(repo, dict) else "main"
        if not owner:
            results.append({"repo_name": repo_name, "error": "Repository owner is unavailable"})
            continue

        tree_endpoint = f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/{default_branch}?recursive=1"
        tree_payload, tree_err = _github_get_json(tree_endpoint, headers)
        if tree_err or not isinstance(tree_payload, dict):
            results.append({"repo_name": repo_name, "error": tree_err or "Unable to read repository tree"})
            continue

        tree = tree_payload.get("tree", [])
        if not isinstance(tree, list):
            results.append({"repo_name": repo_name, "error": "Unexpected tree data"})
            continue

        extensions = Counter()
        total_files = 0

        for item in tree:
            if not isinstance(item, dict):
                continue
            if item.get("type") != "blob":
                continue
            path = str(item.get("path", "")).strip()
            if not path:
                continue
            total_files += 1
            extensions[_file_extension(path)] += 1

        sorted_extensions = sorted(extensions.items(), key=lambda x: (-x[1], x[0]))
        results.append(
            {
                "repo_name": repo_name,
                "total_files": total_files,
                "file_type_count": len(sorted_extensions),
                "file_types": [
                    {"extension": ext, "count": count}
                    for ext, count in sorted_extensions[:safe_max_extensions]
                ],
            }
        )

    return {
        "username": username or "not-set",
        "repo_count": len(results),
        "repos": results,
        "selected_repo_names": requested_repo_names,
    }


@tool
def get_github_file_content(
    repo_names: str = "",
    file_name: str = "README.md",
    max_chars: int = 6000,
    limit_repos: int = 5,
) -> str:
    """
    Return text content for a specific file from selected repositories.
    Use repo_names as comma-separated names. file_name can be exact path or file name.
    """
    token = os.getenv("GITHUB_TOKEN", "").strip()
    username = os.getenv("GITHUB_USERNAME", "").strip()

    if not token:
        return json.dumps({"error": "GITHUB_TOKEN is missing in backend .env", "repos": [], "repo_count": 0})

    target = file_name.strip() or "README.md"
    safe_limit_repos = max(1, min(limit_repos, 20))
    safe_max_chars = max(200, min(max_chars, 30000))

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "strands-agent-github-tool",
        "Authorization": f"Bearer {token}",
    }

    requested_repo_names = _parse_repo_names(repo_names)
    repos_to_scan, repo_err = _resolve_repo_metadata(username, requested_repo_names, safe_limit_repos, headers)
    if repo_err:
        return json.dumps({"error": repo_err, "username": username or "not-set", "repos": [], "repo_count": 0})

    results: list[dict] = []

    for repo in repos_to_scan:
        repo_name = str(repo.get("name", "")).strip() if isinstance(repo, dict) else ""
        if not repo_name:
            continue

        if isinstance(repo, dict) and repo.get("error"):
            results.append({"repo_name": repo_name, "error": str(repo.get("error"))})
            continue

        owner = ""
        if isinstance(repo, dict):
            owner_info = repo.get("owner")
            if isinstance(owner_info, dict):
                owner = str(owner_info.get("login", "")).strip()
        if not owner:
            owner = username
        if not owner:
            results.append({"repo_name": repo_name, "error": "Repository owner is unavailable"})
            continue

        normalized_target = target.lower()
        matched_path = target

        # If user passes only a file name, resolve actual path first.
        if "/" not in target:
            default_branch = str(repo.get("default_branch", "main")).strip() if isinstance(repo, dict) else "main"
            tree_endpoint = f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/{default_branch}?recursive=1"
            tree_payload, tree_err = _github_get_json(tree_endpoint, headers)
            if tree_err or not isinstance(tree_payload, dict):
                results.append({"repo_name": repo_name, "error": tree_err or "Unable to read repository tree"})
                continue
            tree = tree_payload.get("tree", [])
            if not isinstance(tree, list):
                results.append({"repo_name": repo_name, "error": "Unexpected tree data"})
                continue
            exact: str | None = None
            first_name_match: str | None = None
            for item in tree:
                if not isinstance(item, dict) or item.get("type") != "blob":
                    continue
                path = str(item.get("path", "")).strip()
                if not path:
                    continue
                if path.lower() == normalized_target:
                    exact = path
                    break
                if path.rsplit("/", 1)[-1].lower() == normalized_target and first_name_match is None:
                    first_name_match = path
            matched_path = exact or first_name_match or target

        content_endpoint = f"https://api.github.com/repos/{owner}/{repo_name}/contents/{matched_path}"
        content_payload, content_err = _github_get_json(content_endpoint, headers)
        if content_err or not isinstance(content_payload, dict):
            results.append(
                {
                    "repo_name": repo_name,
                    "file_name": target,
                    "matched_path": matched_path,
                    "error": content_err or "Unable to fetch file content",
                }
            )
            continue

        if str(content_payload.get("type", "")) != "file":
            results.append(
                {
                    "repo_name": repo_name,
                    "file_name": target,
                    "matched_path": matched_path,
                    "error": "Requested path is not a file",
                }
            )
            continue

        encoding = str(content_payload.get("encoding", "")).strip().lower()
        raw_content = str(content_payload.get("content", ""))

        decoded_text = ""
        if encoding == "base64" and raw_content:
            try:
                decoded_text = b64decode(raw_content, validate=False).decode("utf-8", errors="replace")
            except Exception:
                decoded_text = ""

        if not decoded_text:
            results.append(
                {
                    "repo_name": repo_name,
                    "file_name": target,
                    "matched_path": matched_path,
                    "error": "File content is empty or not decodable as text",
                }
            )
            continue

        truncated = len(decoded_text) > safe_max_chars
        preview = decoded_text[:safe_max_chars]

        results.append(
            {
                "repo_name": repo_name,
                "file_name": target,
                "matched_path": matched_path,
                "size_bytes": int(content_payload.get("size", 0) or 0),
                "truncated": truncated,
                "content": preview,
            }
        )

    result = {
        "username": username or "not-set",
        "repo_count": len(results),
        "selected_repo_names": requested_repo_names,
        "file_name": target,
        "repos": results,
    }
    return json.dumps(result)
