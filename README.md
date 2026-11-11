# ♞ Knight's Tour Visualizer



An interactive, browser-based visualizer for the classic **Knight's Tour** problem — a chess puzzle where a knight must visit every square on the board exactly once.

---

## How to Run

1. Clone or download this repository.
2. Open `index.html` by **double-clicking** it in your file manager.  
   No build step, no server, no dependencies — it works from the filesystem.
3. Select a board size (default 8 × 8), pick an algorithm, then **click any square** to set the start position.
4. Press **▶ Run** to start the animation.

> Tested on Chrome 124+, Firefox 125+, Edge 124+.

---

## 📂 File Structure

```
knight-tour/
├── index.html    — App shell & UI layout
├── style.css     — All styles (light / dark theme, responsive)
├── script.js     — Algorithms, animation loop, event handlers
└── README.md     — This file
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Board sizes** | 5 × 5 up to 12 × 12 |
| **Algorithms** | Warnsdorff's Heuristic, Backtracking (DFS), Hybrid |
| **Tie-breaking** | First found, Random, Pohl's secondary rule |
| **Animation** | Smooth knight movement, path lines, move numbers |
| **Controls** | Run, Pause/Resume, Step-by-step, Reset, Speed slider |
| **Stats panel** | Moves, backtracks, nodes, time, status |
| **Tour type** | Detects Closed Tour vs Open Tour |
| **Warnsdorff insight** | Toggle to show degree counts on reachable squares |
| **Comparison mode** | Side-by-side table of both algorithms from same start |
| **Dark mode** | One-click theme toggle |
| **Responsive** | Works on tablets; board auto-scales |

---

## 🧠 Algorithm Explanation

### Backtracking (Depth-First Search)

The knight begins on the chosen square. At each step it tries all 8 possible knight moves in a fixed order. If it reaches a square from which no further moves are possible (before visiting all squares), it **backtracks**: it un-visits the last square and tries the next alternative. This is guaranteed to find a solution if one exists, but in the worst case it explores every possible path — exponential in the number of squares.

**Time complexity:** O(8^(n²)) in the worst case for an n × n board.  
**Space complexity:** O(n²) for the recursion/stack.

### Warnsdorff's Heuristic (1823)

H. C. von Warnsdorff's rule: at each step, move the knight to the unvisited square that has the **fewest onward moves** (the lowest *degree*). Intuitively, this keeps the knight away from "dead ends" early and resolves tours in linear time for most boards.

**Tie-breaking options:**
- **First found** — take the first minimum-degree candidate.
- **Random** — shuffle among equal-degree candidates (different tours each run).
- **Pohl's secondary rule** — among ties, prefer the square closest to the board's centre.

**Time complexity:** O(n²) — one pass through the board.  
**Space complexity:** O(n²).  
**Note:** The heuristic is not infallible on all boards; a small fraction of starting positions on small boards may fail.

### Hybrid Algorithm

Uses Warnsdorff's degree ordering to **sort candidates before each DFS expansion**. This dramatically prunes the backtracking tree while preserving correctness (it will still find a solution even if the greedy first choice fails).

---

## 📊 Observed Complexity

| Board | Warnsdorff (nodes) | Backtracking (nodes, typical) |
|---|---|---|
| 5 × 5 | 25 | ~hundreds |
| 6 × 6 | 36 | ~thousands |
| 7 × 7 | 49 | ~tens of thousands |
| 8 × 8 | 64 | > 2 million (capped) |

---

## 📸 Screenshots

*(Replace with actual screenshots after running the app)*

| Light Mode | Dark Mode |
|---|---|
| `screenshots/light.png` | `screenshots/dark.png` |

---

## 👥 Team

| Name | Role |
|---|---|
| Siddharth Shekhar | Algorithm implementation, animation engine, UI |
| Ayan Roy | UI/UX design, stats panel, comparison mode, documentation |

---

## 📄 License

MIT — free to use for educational purposes.

