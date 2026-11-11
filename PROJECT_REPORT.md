# Project Report — Knight's Tour Visualizer

**Course:** INT3120 Artificial Intelligence  
**Project Type:** GUI Mini Project  
**Team:** Siddharth Shekhar · Ayan Roy  
**Date:** October 2026  

---

## 1. Aim

To design and implement an interactive, web-based visualizer for the **Knight's Tour Problem** — a classic combinatorial puzzle in which a chess knight must visit every square of an *n × n* board exactly once. The project demonstrates two AI search strategies — exhaustive backtracking (DFS) and Warnsdorff's greedy heuristic — through real-time animation, statistical comparison, and intuitive UI.

---

## 2. Problem Statement

Given an *n × n* chessboard and a starting square, find a sequence of moves for a chess knight such that it visits every square **exactly once**. A **closed tour** additionally requires that the final square is a knight's move away from the starting square.

The Knight's Tour is a specific case of the **Hamiltonian Path Problem**, which is NP-complete in general. However, special structure in the knight's move graph allows highly efficient heuristic solutions.

---

## 3. Algorithms Implemented

### 3.1 Backtracking (Plain DFS)

**Approach:** A depth-first search with explicit undo. The algorithm maintains a stack of (row, col, candidate-index) frames. At each node it tries candidates in the fixed `KNIGHT_MOVES` order; if no candidate succeeds, it pops the frame and marks the square unvisited.

**Pseudocode:**
```
push(start, candidates(start))
while stack not empty:
    frame = top of stack
    if stack size == n²: SOLVED
    if frame has untried candidate [nr, nc]:
        visit [nr, nc]; push([nr, nc], candidates([nr,nc]))
    else:
        pop frame; unvisit [r, c]   ← backtrack
FAILED
```

**Complexity:**
- Time:  O(8^(n²)) worst-case (tries all permutations).
- Space: O(n²) for the stack.

**Observations:** Impractical for n ≥ 7 without enhancements; capped at 2 million nodes.

---

### 3.2 Warnsdorff's Heuristic

**Approach:** Greedy rule due to H. C. von Warnsdorff (1823). At each step, move to the unvisited neighbour with the **minimum degree** (fewest onward moves from that neighbour). Tie-breaking variants: *first found*, *random*, and *Pohl's secondary rule* (prefer the square closest to the board's centre).

**Pseudocode:**
```
visit start
while moves made < n²:
    candidates = unvisited knight-neighbours(current)
    if candidates empty: FAIL
    next = argmin_{c in candidates} degree(c)
    visit next
SOLVED
```

**Complexity:**
- Time:  O(n²) — one degree computation per step, each O(8).
- Space: O(n²) for the visited array.

**Correctness:** Not guaranteed; fails on a very small fraction of (board, start) pairs. Empirically solves 8 × 8 from all starting squares when Pohl's tie-break is used.

---

### 3.3 Hybrid Algorithm

Combines both: before each DFS expansion the candidate list is **sorted by Warnsdorff degree**. This gives the correctness guarantee of backtracking with near-linear average performance for most board sizes.

---

## 4. Working of the Visualizer

1. **User selects** board size (5–12), algorithm, tie-break rule, and options (degree overlay, path lines, speed).
2. **User clicks** a square to set the start; the knight icon (♞) appears.
3. **Run** starts the generator-based animation loop:
   - Each `animTick()` call pulls one action from the solver generator (`visit` / `backtrack` / `solved` / `failed`).
   - The UI is updated and the next tick is scheduled via `setTimeout`.
   - **Pause/Resume** toggles `isPaused`; **Step** executes exactly one `animTick()`.
4. **Colour coding:** start (green), current (yellow), visited (blue), backtracked (red flash).
5. **Live stats** update each tick: moves, backtracks, nodes explored, elapsed time.
6. **Comparison Mode:** runs both algorithms synchronously (backtracking capped at 2 M nodes) and renders a comparison table.

---

## 5. Observations

| Observation | Detail |
|---|---|
| Warnsdorff is very fast | Completes an 8 × 8 tour in < 5 ms from any start |
| Backtracking is impractical on 8 × 8 | Node count explodes; always hits the 2 M cap |
| Hybrid finds solutions reliably | Even on tricky 5 × 5 and 6 × 6 boards |
| Closed tours exist for n ≥ 6 (even n) | 5 × 5 tours are always open |
| Pohl's tie-break improves Warnsdorff | Especially on larger boards and corner starts |
| Animation remains smooth | Generator approach avoids UI freezing |

---

## 6. Conclusion

The project successfully demonstrates how a **greedy heuristic** (Warnsdorff's rule) can reduce an exponentially hard combinatorial problem (knight's tour on a large board) to a near-linear one, while a **backtracking DFS** provides a completeness guarantee at the cost of exponential time. The hybrid approach blends both. The interactive visualizer makes the algorithms tangible: students can observe the greedy degree-guided choices, watch backtracks flash red, and instantly compare algorithm performance. The generator-function architecture ensures the browser remains responsive throughout.

---

## 7. Viva Questions & Answers

**Q1. What is the Knight's Tour Problem?**  
A: Finding a sequence of moves for a chess knight that visits every square of an *n × n* board exactly once. It is a special case of the Hamiltonian Path Problem on the knight's move graph.

**Q2. Why is plain backtracking impractical for 8 × 8?**  
A: The branching factor is up to 8 at each step and the board has 64 squares, giving a worst-case of 8^64 paths — astronomically large. Even with pruning, pure DFS explores millions of nodes before finding a tour.

**Q3. State Warnsdorff's rule in one sentence.**  
A: At each step, move the knight to the unvisited neighbour that has the fewest onward moves (minimum degree).

**Q4. Why does Warnsdorff's rule work so well?**  
A: By always choosing the "least accessible" square next, the knight avoids trapping itself in corners and dead ends. It keeps the most-connected squares available for later, naturally constructing a Hamiltonian path.

**Q5. What is the time complexity of Warnsdorff's algorithm?**  
A: O(n²) — the board has n² squares; at each square we compute degrees of at most 8 neighbours, each in O(8) time, giving O(n² × 8 × 8) = O(n²).

**Q6. What is a closed tour, and for which board sizes does it exist?**  
A: A closed tour is one where the final square is also a knight's move from the starting square, forming a cycle. Closed tours exist for all even *n* ≥ 6. A 5 × 5 board can only have open tours.

**Q7. How does your application prevent the browser from freezing during backtracking?**  
A: The backtracking algorithm is implemented as an ES6 **generator function** that yields one action per call. The animation loop uses `setTimeout` to schedule one step at a time, releasing control back to the browser event loop between steps. The comparison mode caps nodes at 2 million and runs the synchronous solver inside a `setTimeout` callback to keep the UI responsive.

**Q8. What is Pohl's secondary rule for tie-breaking?**  
A: When two candidate squares have equal Warnsdorff degree, Pohl's rule selects the one **closest to the board's centre** (using Euclidean distance). This keeps the knight in the more densely connected central region, further reducing the chance of getting stuck on small boards.

---



