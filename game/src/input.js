// Keyboard + mouse input handling: held keys, one-shot key presses (consumeKey) and a click as a
// one-shot. Keys are stored by lowercased `event.key`, so ' ' is the space bar and 'arrowleft' an
// arrow key.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function norm(e) {
    return e.key.toLowerCase();
  }

  function onKeyDown(e) {
    const k = norm(e);
    keys.add(k);
    if (e.repeat) return;
    pressed.add(k);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  }
  function onKeyUp(e) {
    keys.delete(norm(e));
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function onMouseDown(e) {
    if (e.button !== 0) return;
    mouse.down = true;
    mouse.clicked = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    pressed.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  return {
    keys,
    mouse,
    /** Take the pending click, if any. */
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
    /** Take one press of any of `names`, clearing every name given. */
    consumeKey(...names) {
      let hit = false;
      for (const n of names) {
        if (pressed.has(n)) hit = true;
        pressed.delete(n);
      }
      return hit;
    },
    /** Whether any of `names` is held now. */
    isDown(...names) {
      for (const n of names) if (keys.has(n)) return true;
      return false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
