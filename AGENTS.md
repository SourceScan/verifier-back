# Verifier backend

- Use Conventional Commits for commit messages, PR titles, and squash merges.
- Use **Why**, **Change**, and **Validation** sections by default in PR descriptions. Explain the reason, summarize what changed, and report what was actually checked. Reserve comments for decisions, blockers, and review replies.
- Install dependencies, build, and run verification tests in a fresh development VM without production credentials. From `nest/`, run `npm ci`, `npm test -- --runInBand`, and `npm run build` for backend changes.
- Get maintainer review before merging changes to build execution, input validation, code-hash comparisons, or registry writes. Keep on-chain reads for a verification pinned to the same block.
