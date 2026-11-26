
export function initLoginBg3D(options = {}) {
  const root = options.root || document.querySelector(".login-page");

  if (!root) return () => {};

  const layer = document.createElement("div");
  layer.className = "login-bg3d";

  const image = document.createElement("div");
  image.className = "login-bg3d__img";

  layer.appendChild(image);
  root.prepend(layer);

  let x = 0;
  let y = 0;
  let raf;

  const move = (e) => {
    x = (e.clientX / window.innerWidth - 0.5) * 2;
    y = (e.clientY / window.innerHeight - 0.5) * 2;

    image.style.setProperty("--bx", x);
    image.style.setProperty("--by", y);
  };

  window.addEventListener("pointermove", move);

  return () => {
    window.removeEventListener("pointermove", move);
    cancelAnimationFrame(raf);
    layer.remove();
  };
}
