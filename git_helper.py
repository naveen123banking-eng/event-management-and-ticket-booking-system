import sys
from pathlib import Path
from dulwich import porcelain
from dulwich.repo import Repo

WORKSPACE = Path(r"D:\Ticket booking app")

def push_repo(remote_url, branch="main"):
    repo_path = str(WORKSPACE)
    repo = Repo(repo_path)
    
    # Configure remote
    try:
        porcelain.remote_add(repo_path, "origin", remote_url)
        print(f"Added remote origin: {remote_url}")
    except Exception:
        # Update existing remote if needed
        config = repo.get_config()
        config.set(("remote", "origin"), "url", remote_url.encode('utf-8'))
        config.write_to_path()
        print(f"Updated remote origin: {remote_url}")

    # Set branch ref to main
    try:
        repo.refs[b"refs/heads/main"] = repo.head()
    except Exception as e:
        print(f"Setting main ref: {e}")

    print(f"Pushing to {remote_url} on branch {branch}...")
    try:
        porcelain.push(repo_path, remote_url, refspecs=["refs/heads/main:refs/heads/main"])
        print("Successfully pushed to remote!")
    except Exception as e:
        print(f"Push error: {e}")
        raise

if __name__ == '__main__':
    if len(sys.argv) > 1:
        remote = sys.argv[1]
        push_repo(remote)
    else:
        print("Usage: python git_helper.py <remote_git_url>")
