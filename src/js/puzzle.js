/* ==========================================================================
   Gallery photo sliding puzzle: launched from the lightbox's "玩拼圖"
   button (see gallery.njk/gallery.js), sliced from whatever photo is
   currently showing in #lb-img. Classic 8/15-puzzle mechanics — a fixed
   grid of the photo (3×3 or 4×4), one tile missing, click a tile adjacent
   to the gap to slide it in. Tiles are plain divs sliced from the photo
   via background-size/background-position (no canvas, no drag library).
   ========================================================================== */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var openBtn = document.getElementById('lb-puzzle');
    var lightbox = document.getElementById('lightbox');
    var dialog = document.getElementById('puzzle-dialog');
    var gridEl = document.getElementById('puzzle-grid');
    var gridWrapEl = document.querySelector('.puzzle-grid-wrap');
    var statusTextEl = document.getElementById('puzzle-status-text');
    var badgeEl = document.getElementById('puzzle-badge');
    var titleEl = document.getElementById('puzzle-title');
    var shuffleBtn = document.getElementById('puzzle-shuffle');
    var backBtn = document.getElementById('puzzle-back');
    var difficultyChips = document.getElementById('puzzle-difficulty');
    if (!openBtn || !dialog || !gridEl) return;

    var size = 3;
    var imgSrc = '';
    // tiles[r][c] holds the tile's home index (0..size*size-2, read
    // left-to-right/top-to-bottom like a book) — kept separate from its
    // current (r, c) so a shuffled tile still knows which photo slice it
    // is. -1 marks the empty slot.
    var tiles = [];
    var empty = { r: 0, c: 0 };

    function homePosition(index) {
      return { r: Math.floor(index / size), c: index % size };
    }

    function makeSolved() {
      tiles = [];
      var n = 0;
      for (var r = 0; r < size; r++) {
        var row = [];
        for (var c = 0; c < size; c++) {
          row.push(r === size - 1 && c === size - 1 ? -1 : n++);
        }
        tiles.push(row);
      }
      empty = { r: size - 1, c: size - 1 };
    }

    // Shuffles by replaying random legal slides from the solved state,
    // not by randomizing tile positions outright — every scramble this
    // produces is guaranteed solvable, which a fully random permutation
    // of an 8/15-puzzle is not (exactly half of them aren't).
    function shuffle() {
      makeSolved();
      var moveCount = size * size * 30;
      for (var i = 0; i < moveCount; i++) {
        var neighbors = [];
        var e = empty;
        if (e.r > 0) neighbors.push({ r: e.r - 1, c: e.c });
        if (e.r < size - 1) neighbors.push({ r: e.r + 1, c: e.c });
        if (e.c > 0) neighbors.push({ r: e.r, c: e.c - 1 });
        if (e.c < size - 1) neighbors.push({ r: e.r, c: e.c + 1 });
        var pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        tiles[e.r][e.c] = tiles[pick.r][pick.c];
        tiles[pick.r][pick.c] = -1;
        empty = pick;
      }
      if (statusTextEl) statusTextEl.textContent = '點擊空格旁邊的照片切片，把它們滑回原位';
      render();
    }

    function isSolved() {
      var n = 0;
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          if (r === size - 1 && c === size - 1) {
            if (tiles[r][c] !== -1) return false;
          } else if (tiles[r][c] !== n++) {
            return false;
          }
        }
      }
      return true;
    }

    function tryMove(r, c) {
      var e = empty;
      if (Math.abs(r - e.r) + Math.abs(c - e.c) !== 1) return;
      tiles[e.r][e.c] = tiles[r][c];
      tiles[r][c] = -1;
      empty = { r: r, c: c };
      render();
    }

    // Returns whether the grid is solved, so callers can react without
    // running isSolved() a second time.
    function render() {
      var solved = isSolved();
      gridEl.classList.toggle('is-solved', solved);
      // gridWrapEl carries the win ring-pulse (see .puzzle-grid-wrap.is-
      // solved in pages.css); statusTextEl/badgeEl swap the instructions
      // for the "完成❤️" pill. All three toggle off the moment solved
      // goes false again (a reshuffle), so the animations are free to
      // replay in full on the next solve.
      if (gridWrapEl) gridWrapEl.classList.toggle('is-solved', solved);
      if (statusTextEl) statusTextEl.classList.toggle('is-hidden', solved);
      if (badgeEl) badgeEl.classList.toggle('is-hidden', !solved);
      gridEl.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
      gridEl.innerHTML = '';
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          var index = tiles[r][c];
          // Once solved, the "empty" slot is cosmetically given its real
          // photo slice too (always the last index) so the whole grid
          // reads as one complete photo instead of still having a blank
          // corner — see .puzzle-grid.is-solved in pages.css for the
          // matching gap/corner-radius transition. tiles itself is left
          // untouched (still -1 there), since this is display-only.
          if (solved && index === -1) index = size * size - 1;
          var cell = document.createElement('div');
          cell.className = 'puzzle-tile';
          if (index === -1) {
            cell.classList.add('is-empty');
          } else {
            var home = homePosition(index);
            var pct = size === 1 ? 0 : 100 / (size - 1);
            cell.style.backgroundImage = 'url(' + imgSrc + ')';
            cell.style.backgroundSize = (size * 100) + '% ' + (size * 100) + '%';
            cell.style.backgroundPosition = (home.c * pct) + '% ' + (home.r * pct) + '%';
            if (!solved) {
              (function (rr, cc) {
                cell.addEventListener('click', function () { tryMove(rr, cc); });
              })(r, c);
            }
          }
          gridEl.appendChild(cell);
        }
      }
      return solved;
    }

    function openPuzzle() {
      var img = document.getElementById('lb-img');
      var title = document.getElementById('lb-title');
      imgSrc = img ? img.src : '';
      if (titleEl) titleEl.textContent = title ? title.textContent : '';
      if (lightbox && lightbox.open) lightbox.close();
      shuffle();
      dialog.show();
    }

    customElements.whenDefined('md-dialog').then(function () {
      openBtn.addEventListener('click', openPuzzle);
      if (shuffleBtn) shuffleBtn.addEventListener('click', shuffle);
      // Returns to the same photo in the lightbox rather than just
      // closing outright — its title/date/caption/img were never
      // touched while the puzzle was open, so showing it again picks up
      // exactly where openPuzzle() left it.
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          dialog.close();
          if (lightbox) lightbox.show();
        });
      }
    });

    customElements.whenDefined('md-filter-chip').then(function () {
      if (!difficultyChips) return;
      difficultyChips.addEventListener('click', function (e) {
        var chip = e.target.closest('md-filter-chip');
        if (!chip) return;
        var chips = Array.prototype.slice.call(difficultyChips.querySelectorAll('md-filter-chip'));
        chips.forEach(function (c) { if (c !== chip) c.selected = false; });
        chip.selected = true;
        size = Number(chip.dataset.size) || 3;
        shuffle();
      });
    });
  });
})();
