# Project Rules for NetApp Modeler

- **Auto-Commit and Push:** Stage, commit, and push all modifications to the remote repository dynamically upon code, version, or documentation updates.
- **Rollback Safety:** Use annotated Git release tags (e.g. `v2.x`) for each version bump to ensure clean rollback points are preserved.
- **Version and Bundling Synchronization:** Whenever code changes are made, bump the version identifier in both `index.html` and `README.md` and rebuild the standalone bundle using `build_standalone.py` to keep the distribution in sync.
