# FastOPD project page

Static project page styled after `../beyond-softmax/`. Serve the repository root with `python3 -m http.server 8000`, then open http://localhost:8000/fastopd/.

- `index.html`: paper content, authors, local PDF link, citation.
- `static/css/index.css`: responsive styles; no build or external font dependencies.
- `static/js/index.js`: inference-step comparison (Tables 1–2) and citation copying.
- `static/images/`: figures cropped directly from the supplied preprint (Figures 2, 3, 5, 6).
- `static/papers/FastOPD.pdf`: supplied paper, unchanged.

No arXiv identifier, code repository, conference acceptance, or video URL was provided, so no such links or claims are included. Add confirmed publication metadata to the citation when available. The 451M student parameter count follows Tables 1–2 and the method section; Figure 1 of the supplied draft contains a different parameter label and is not used here. The 78.1% latency reduction compares the two-step student (66 ms) with the ten-step teacher (301 ms).

The intended GitHub Pages path is `/fastopd/`. Creating this directory does not publish it; commit and deploy it through the repository's usual workflow.
