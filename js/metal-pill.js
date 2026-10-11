/**
 * DinSide - Liquid Metal Pill Border Component
 * Inspired by Cult UI / MetalFx (Paper Shaders liquidMetal engine)
 * 
 * Features:
 * - Single shared WebGL2 liquidMetal offscreen shader instance for 60-120fps performance.
 * - 0% CPU/GPU overhead when idle: RAF loop runs ONLY while user is hovering.
 * - Dynamic punch-out clipping (roundRect + destination-out) for pixel-perfect pill rings.
 * - Interactive mouse reflection tracking (highlights shift toward cursor).
 * - Multi-preset support: 'chromatic' (default), 'silver', 'gold', 'mint'.
 * - Automatic Light / Dark mode color adaptation.
 * - Resilient CSS conic-gradient fallback if WebGL2 is unavailable or reduced motion is active.
 */

(function () {
  'use strict';

  // --- GLSL Shaders ---

  const VERTEX_SHADER_SRC = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;

void main() {
  gl_Position = a_position;
  vec2 uv = gl_Position.xy * 0.5;

  vec2 givenBoxSize = max(u_resolution, vec2(1.0)) * u_pixelRatio;
  v_responsiveBoxGivenSize = givenBoxSize;

  float responsiveRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 responsiveBoxScale = vec2(1.0);

  vec2 boxOrigin = vec2(0.5 - u_originX, u_originY - 0.5);
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  float r = u_rotation * 3.14159265358979323846 / 180.0;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));

  v_responsiveUV = uv * responsiveBoxScale + boxOrigin * (responsiveBoxScale - 1.0) + graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;
}
`;

  const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_colorBack;
uniform vec4 u_colorTint;
uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;

in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;

out vec4 fragColor;

const float PI = 3.14159265358979323846;

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {
  float ch = mix(c2, c1, smoothstep(0.0, 2.0 * blur, stripe_p));
  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe_p));
  border = w[0] + 0.4 * (1.0 - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe_p));
  border = w[0] + 0.5 * (1.0 - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe_p));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe_p));
  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0.0, 1.0, gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + 0.5 * blur, stripe_p));
  ch = mix(ch, 1.0 - min(1.0, (1.0 - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

void main() {
  const float firstFrameOffset = 2.8;
  float t = 0.35 * (u_time + firstFrameOffset);
  vec2 uv = v_responsiveUV + 0.5;
  uv.y = 1.0 - uv.y;

  float cycleWidth = u_repetition * 2.0;
  vec2 borderUV = v_responsiveUV + 0.5;
  vec2 mask = min(borderUV, 1.0 - borderUV);
  vec2 pixel_thickness = min(250.0 / v_responsiveBoxGivenSize, vec2(0.5));
  float maskX = pow(smoothstep(0.0, pixel_thickness.x, mask.x), 0.25);
  float maskY = pow(smoothstep(0.0, pixel_thickness.y, mask.y), 0.25);
  float edge = clamp(1.0 - maskX * maskY, 0.0, 1.0);

  float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  uv = v_responsiveUV;
  if (ratio > 1.0) {
    uv.y /= ratio;
  } else {
    uv.x *= ratio;
  }
  uv += 0.5;
  uv.y = 1.0 - uv.y;

  vec2 rotatedUV = uv - vec2(0.5);
  float angle = (-u_angle + 70.0) * PI / 180.0;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(
    rotatedUV.x * cosA - rotatedUV.y * sinA,
    rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(0.5);

  float opacity = 1.0 - smoothstep(0.9 - 2.0 * fwidth(edge), 0.9, edge);
  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color1 = vec3(0.98, 0.98, 1.0);
  vec3 color2 = vec3(0.1, 0.1, 0.1 + 0.1 * smoothstep(0.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - 0.5;
  float dist = length(grad_uv + vec2(0.0, 0.2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (0.25 - 0.2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1.0 - bump;
  bump *= pow(uv.y, 0.3);

  float thin_strip_1_ratio = 0.12 / cycleWidth * (1.0 - 0.4 * bump);
  float thin_strip_2_ratio = 0.07 / cycleWidth * (1.0 + 0.4 * bump);
  float wide_strip_ratio = (1.0 - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);
  edge += (1.0 - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  direction -= 2.0 * noise * diagBLtoTR * (smoothstep(0.0, 1.0, edge) * (1.0 - smoothstep(0.0, 1.0, edge)));
  direction *= mix(1.0, 1.0 - edge, smoothstep(0.5, 1.0, u_contour));
  direction -= 1.7 * edge * smoothstep(0.5, 1.0, u_contour);
  direction += 0.2 * pow(u_contour, 4.0) * (1.0 - smoothstep(0.0, 1.0, edge));

  bump *= clamp(pow(uv.y, 0.1), 0.3, 1.0);
  direction *= (0.1 + (1.1 - edge) * bump);
  direction *= (0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge)));
  direction += 0.18 * (smoothstep(0.1, 0.2, uv.y) * (1.0 - smoothstep(0.2, 0.4, uv.y)));
  direction += 0.03 * (smoothstep(0.1, 0.2, 1.0 - uv.y) * (1.0 - smoothstep(0.2, 0.4, 1.0 - uv.y)));
  direction *= (0.5 + 0.5 * pow(uv.y, 2.0));
  direction *= cycleWidth;
  direction -= t;

  float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);
  float dispersionRed = colorDispersion + 0.03 * bump * noise;
  dispersionRed += 5.0 * (smoothstep(-0.1, 0.2, uv.y) * (1.0 - smoothstep(0.1, 0.5, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 1.0, bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion * 1.3;
  dispersionBlue += (smoothstep(0.0, 0.4, uv.y) * (1.0 - smoothstep(0.1, 0.8, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 0.8, bump)));
  dispersionBlue -= 0.2 * edge;

  dispersionRed *= (u_shiftRed / 20.0);
  dispersionBlue *= (u_shiftBlue / 20.0);

  float blur = u_softness / 15.0 + 0.3 * u_contour;
  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= 0.02 * smoothstep(0.0, 1.0, edge + bump);

  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r), bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g), bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  vec3 color = vec3(r, g, b) * opacity;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);

  fragColor = vec4(color, opacity);
}
`;

  // --- Presets ---

  const PRESETS = {
    chromatic: {
      dark: {
        colorTint: [0.53, 0.8, 1.0, 0.28], // Cyan/blue iridescent burn
        shiftRed: 0.75,
        shiftBlue: 0.75,
        repetition: 2.0,
        softness: 0.09,
        distortion: 0.1,
        contour: 0.4,
        angle: 90
      },
      light: {
        colorTint: [0.4, 0.69, 1.0, 0.6],
        shiftRed: 0.6,
        shiftBlue: 0.6,
        repetition: 1.8,
        softness: 0.08,
        distortion: 0.08,
        contour: 0.4,
        angle: 90
      }
    },
    silver: {
      dark: {
        colorTint: [1.0, 1.0, 1.0, 0.35],
        shiftRed: 0.1,
        shiftBlue: 0.1,
        repetition: 1.5,
        softness: 0.05,
        distortion: 0.06,
        contour: 0.35,
        angle: 90
      },
      light: {
        colorTint: [1.0, 1.0, 1.0, 0.25],
        shiftRed: 0.1,
        shiftBlue: 0.1,
        repetition: 1.5,
        softness: 0.05,
        distortion: 0.06,
        contour: 0.35,
        angle: 90
      }
    },
    gold: {
      dark: {
        colorTint: [1.0, 0.8, 0.33, 0.8],
        shiftRed: 0.3,
        shiftBlue: 0.3,
        repetition: 1.6,
        softness: 0.06,
        distortion: 0.08,
        contour: 0.4,
        angle: 85
      },
      light: {
        colorTint: [0.97, 0.83, 0.53, 0.7],
        shiftRed: 0.25,
        shiftBlue: 0.25,
        repetition: 1.6,
        softness: 0.06,
        distortion: 0.08,
        contour: 0.4,
        angle: 85
      }
    },
    mint: {
      dark: {
        colorTint: [0.2, 0.83, 0.6, 0.65], // Bright Emerald Mint
        shiftRed: 0.65,
        shiftBlue: 0.65,
        repetition: 1.9,
        softness: 0.08,
        distortion: 0.09,
        contour: 0.4,
        angle: 90
      },
      light: {
        colorTint: [0.12, 0.35, 0.25, 0.5], // Deep Forest Mint
        shiftRed: 0.5,
        shiftBlue: 0.5,
        repetition: 1.8,
        softness: 0.07,
        distortion: 0.08,
        contour: 0.4,
        angle: 90
      }
    }
  };

  // --- Shared WebGL2 Engine ---

  let sharedEngine = null;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`MetalPill: Shader compile failed: ${info}`);
    }
    return shader;
  }

  function createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`MetalPill: Program link failed: ${info}`);
    }
    return program;
  }

  function getSharedEngine() {
    if (sharedEngine) return sharedEngine;

    // Check for reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return null;
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      console.warn('MetalPill: WebGL2 not supported, falling back to CSS conic shimmer');
      return null;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let vs, fs, program;
    try {
      vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      program = createProgram(gl, vs, fs);
    } catch (err) {
      console.warn('MetalPill initialization fallback:', err);
      return null;
    }

    gl.useProgram(program);

    // Fullscreen quad buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uniforms = {};
    const uniformNames = [
      'u_resolution', 'u_pixelRatio', 'u_originX', 'u_originY', 'u_scale',
      'u_rotation', 'u_offsetX', 'u_offsetY', 'u_time', 'u_colorBack',
      'u_colorTint', 'u_softness', 'u_repetition', 'u_shiftRed', 'u_shiftBlue',
      'u_distortion', 'u_contour', 'u_angle'
    ];
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    gl.viewport(0, 0, size, size);

    sharedEngine = {
      canvas,
      gl,
      program,
      uniforms,
      size,
      startTime: performance.now(),
      activePills: new Set(),
      rafId: 0,
      currentPreset: 'chromatic'
    };

    return sharedEngine;
  }

  function updateEngineUniforms(engine, themeMode, presetName, mouseOffset = { x: 0, y: 0 }) {
    const gl = engine.gl;
    const u = engine.uniforms;
    const preset = (PRESETS[presetName] || PRESETS.chromatic)[themeMode] || PRESETS.chromatic.dark;

    gl.uniform2f(u.u_resolution, engine.size, engine.size);
    gl.uniform1f(u.u_pixelRatio, 1.0);
    gl.uniform1f(u.u_originX, 0.5);
    gl.uniform1f(u.u_originY, 0.5);
    gl.uniform1f(u.u_scale, 1.0);
    gl.uniform1f(u.u_rotation, 0.0);
    gl.uniform1f(u.u_offsetX, mouseOffset.x * 0.15);
    gl.uniform1f(u.u_offsetY, mouseOffset.y * 0.15);

    gl.uniform4f(u.u_colorBack, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4fv(u.u_colorTint, preset.colorTint);
    gl.uniform1f(u.u_softness, preset.softness);
    gl.uniform1f(u.u_repetition, preset.repetition);
    gl.uniform1f(u.u_shiftRed, preset.shiftRed);
    gl.uniform1f(u.u_shiftBlue, preset.shiftBlue);
    gl.uniform1f(u.u_distortion, preset.distortion);
    gl.uniform1f(u.u_contour, preset.contour);
    gl.uniform1f(u.u_angle, preset.angle + mouseOffset.x * 12.0);
  }

  function renderLoop(time) {
    if (!sharedEngine || sharedEngine.activePills.size === 0) {
      if (sharedEngine) sharedEngine.rafId = 0;
      return;
    }

    const engine = sharedEngine;
    const gl = engine.gl;
    const elapsed = (time - engine.startTime) / 1000;

    // Determine current theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeMode = isDark ? 'dark' : 'light';

    // Average mouse offset across active pills for specular highlight tilt
    let avgMx = 0, avgMy = 0, count = 0;
    for (const pill of engine.activePills) {
      if (pill.isHovered) {
        avgMx += pill.mouseX || 0;
        avgMy += pill.mouseY || 0;
        count++;
      }
    }
    const mouseOffset = count > 0 ? { x: avgMx / count, y: avgMy / count } : { x: 0, y: 0 };

    // Update WebGL uniforms
    gl.useProgram(engine.program);
    gl.uniform1f(engine.uniforms.u_time, elapsed);
    updateEngineUniforms(engine, themeMode, engine.currentPreset, mouseOffset);

    // Render 128x128 offscreen texture
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Blit onto each active pill's canvas
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    for (const pill of Array.from(engine.activePills)) {
      renderPillFrame(pill, engine.canvas, dpr);

      // Check if pill fade-out finished
      if (!pill.isHovered && pill.opacity <= 0.01) {
        pill.opacity = 0;
        pill.canvas.style.opacity = '0';
        if (pill.glowCanvas) pill.glowCanvas.style.opacity = '0';
        engine.activePills.delete(pill);
      }
    }

    engine.rafId = requestAnimationFrame(renderLoop);
  }

  function renderPillFrame(pill, glCanvas, dpr) {
    const canvas = pill.canvas;
    const ctx = pill.ctx;
    const rect = pill.element.getBoundingClientRect();
    const cssW = Math.round(rect.width);
    const cssH = Math.round(rect.height);

    if (cssW < 2 || cssH < 2) return;

    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (pill.glowCanvas) {
        pill.glowCanvas.width = w;
        pill.glowCanvas.height = h;
      }
    }

    // Smoothly animate opacity
    const targetOpacity = pill.isHovered ? 1.0 : 0.0;
    const fadeSpeed = pill.isHovered ? 0.18 : 0.09;
    pill.opacity += (targetOpacity - pill.opacity) * fadeSpeed;

    canvas.style.opacity = pill.opacity.toFixed(3);
    if (pill.glowCanvas) {
      pill.glowCanvas.style.opacity = (pill.opacity * 0.75).toFixed(3);
    }

    // 1. Clear 2D canvas
    ctx.clearRect(0, 0, w, h);

    // 2. Draw liquid metal shader
    ctx.drawImage(glCanvas, 0, 0, w, h);

    // 3. Punch-out interior (leaving only the metal ring)
    const ringPx = 1.75 * dpr;
    const radius = (cssH / 2) * dpr;
    const innerRadius = Math.max(0, radius - ringPx);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(ringPx, ringPx, w - 2 * ringPx, h - 2 * ringPx, innerRadius);
    } else {
      // Fallback roundRect path
      const rx = ringPx, ry = ringPx, rw = w - 2 * ringPx, rh = h - 2 * ringPx;
      ctx.arc(rx + innerRadius, ry + innerRadius, innerRadius, Math.PI, 1.5 * Math.PI);
      ctx.arc(rx + rw - innerRadius, ry + innerRadius, innerRadius, 1.5 * Math.PI, 2 * Math.PI);
      ctx.arc(rx + rw - innerRadius, ry + rh - innerRadius, innerRadius, 0, 0.5 * Math.PI);
      ctx.arc(rx + innerRadius, ry + rh - innerRadius, innerRadius, 0.5 * Math.PI, Math.PI);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();

    // 4. Render ambient glow onto glow canvas (if present)
    if (pill.glowCanvas && pill.glowCtx && pill.opacity > 0.05) {
      const gctx = pill.glowCtx;
      gctx.clearRect(0, 0, w, h);
      gctx.drawImage(canvas, 0, 0);
    }
  }

  // --- Attach to Element ---

  function attachMetalPill(el) {
    if (el._metalPill) return;

    el.classList.add('metal-pill-host');

    // Create metal ring canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'metal-pill-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    // Create ambient glow canvas
    const glowCanvas = document.createElement('canvas');
    glowCanvas.className = 'metal-pill-glow';
    glowCanvas.setAttribute('aria-hidden', 'true');

    el.appendChild(glowCanvas);
    el.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    const glowCtx = glowCanvas.getContext('2d', { alpha: true });

    const pill = {
      element: el,
      canvas,
      glowCanvas,
      ctx,
      glowCtx,
      opacity: 0,
      isHovered: false,
      mouseX: 0,
      mouseY: 0,
      preset: el.getAttribute('data-metal-preset') || 'chromatic'
    };

    el._metalPill = pill;

    el.addEventListener('mouseenter', () => {
      const engine = getSharedEngine();
      if (!engine) return;

      pill.isHovered = true;
      engine.currentPreset = pill.preset;
      engine.activePills.add(pill);

      if (engine.rafId === 0) {
        engine.rafId = requestAnimationFrame(renderLoop);
      }
    });

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      pill.mouseX = Math.max(-1, Math.min(1, x * 2.0));
      pill.mouseY = Math.max(-1, Math.min(1, y * 2.0));
    });

    el.addEventListener('mouseleave', () => {
      pill.isHovered = false;
      pill.mouseX = 0;
      pill.mouseY = 0;
    });

    // Guard against DOM updates (e.g., i18n text replacement) removing canvases
    const observer = new MutationObserver(() => {
      if (!el.contains(canvas)) {
        el.appendChild(glowCanvas);
        el.appendChild(canvas);
      }
    });
    observer.observe(el, { childList: true });
  }

  // --- Initialize All Targets ---

  function initMetalPills() {
    const targets = document.querySelectorAll('.feature-tags li, [data-metal-pill]');
    targets.forEach(attachMetalPill);
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetalPills);
  } else {
    initMetalPills();
  }

  // Expose API for dynamic elements or presets
  window.MetalPills = {
    init: initMetalPills,
    attach: attachMetalPill,
    PRESETS
  };
})();
