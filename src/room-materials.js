import * as T from "three";

// Small, deterministic, repeating surface maps. These stay sharp close up without
// downloading a second scene's worth of high-resolution photography.
export function createSurfaces(renderer) {
  const maps = [];
  let seed = 481;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  function texture(draw, repeatX = 1, repeatY = 1) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    draw(canvas.getContext("2d"));
    const t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    maps.push(t);
    return t;
  }
  const walnut = texture((c) => {
    c.fillStyle = "#28180f";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {
      const x = random() * 512;
      c.strokeStyle = `rgba(${random() > 0.5 ? "100,65,34" : "18,8,5"},${random() * 0.12})`;
      c.lineWidth = random() * 2 + 0.3;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + 3, 170, x - 2, 340, x + 1, 512);
      c.stroke();
    }
  });
  const stone = texture((c) => {
    c.fillStyle = "#282931";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14000; i++) {
      const a = random() * 0.08;
      c.fillStyle = `rgba(170,170,167,${a})`;
      c.fillRect(random() * 512, random() * 512, random() * 7 + 1, 1);
    }
    for (let i = 0; i < 30; i++) {
      let x = random() * 512,
        y = random() * 512;
      c.beginPath();
      c.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += random() * 42;
        y += random() * 20 - 12;
        c.lineTo(x, y);
      }
      c.strokeStyle = `rgba(143,134,124,${random() * 0.08})`;
      c.lineWidth = 0.5;
      c.stroke();
    }
    c.strokeStyle = "#07090c";
    c.lineWidth = 3;
    c.strokeRect(0, 0, 512, 512);
    c.strokeStyle = "#353235";
    c.lineWidth = 1;
    c.strokeRect(3, 3, 506, 506);
  });
  const leather = texture((c) => {
    c.fillStyle = "#38231e";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 22000; i++) {
      c.fillStyle = `rgba(150,105,80,${random() * 0.12})`;
      c.fillRect(random() * 512, random() * 512, 1, 2);
    }
  });
  const grille = texture((c) => {
    c.fillStyle = "#29272a";
    c.fillRect(0, 0, 512, 512);
    c.fillStyle = "#030406";
    for (let y = 0; y < 512; y += 12)
      for (let x = 0; x < 512; x += 12) {
        c.beginPath();
        c.arc(x + (y % 24 ? 6 : 0), y, 4, 0, Math.PI * 2);
        c.fill();
      }
  });
  const halo = texture((c) => {
    const g = c.createRadialGradient(256, 256, 3, 256, 256, 256);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(0.25, "rgba(255,255,255,0.1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
  });
  const shadow = texture((c) => {
    const g = c.createRadialGradient(256, 256, 50, 256, 256, 256);
    g.addColorStop(0, "rgba(0,0,0,0.9)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
  });
  return {
    walnut,
    stone,
    leather,
    grille,
    halo,
    shadow,
    dispose: () => maps.forEach((t) => t.dispose()),
  };
}
