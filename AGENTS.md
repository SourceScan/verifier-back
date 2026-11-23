# Verifier backend

- Use Conventional Commits for commit messages, PR titles, and squash merges.
- Install dependencies, build, and run verification tests in a fresh development VM without production credentials. From `nest/`, run `npm ci`, `npm test -- --runInBand`, and `npm run build` for backend changes.
- Get maintainer review before merging changes to build execution, input validation, code-hash comparisons, or registry writes. Keep on-chain reads for a verification pinned to the same block.
