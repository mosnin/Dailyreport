"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, wrapEffect } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import * as THREE from "three";

const waveVertexShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const waveFragmentShader = /* glsl */ `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform float waveContrast;
uniform float waveGain;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

const int OCTAVES = 8;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p - fbm(p + fbm(p2)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  // Grayscale only; the dither pass tints with the gradient AFTER
  // quantization so pastel hues are not saturated into primaries.
  // waveGain lifts highlights past the dither bias; waveContrast > 1
  // expands the dark regions so black stays dominant.
  float shade = pow(clamp(f * waveGain, 0.0, 1.0), waveContrast);
  gl_FragColor = vec4(vec3(shade), 1.0);
}
`;

const ditherFragmentShader = /* glsl */ `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
uniform vec3 colorA;
uniform vec3 colorB;
uniform vec3 colorC;

const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0, 3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0, 16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0, 19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0, 4.0/64.0, 52.0/64.0, 11.0/64.0, 59.0/64.0, 7.0/64.0, 55.0/64.0,
  40.0/64.0, 24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0, 27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0, 1.0/64.0, 49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0, 18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0, 17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0, 58.0/64.0, 6.0/64.0, 54.0/64.0, 9.0/64.0, 57.0/64.0, 5.0/64.0, 53.0/64.0,
  42.0/64.0, 26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0, 25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float bias = 0.2;
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv * resolution, color.rgb);
  // Tint the quantized grayscale with a diagonal three-stop gradient.
  float t = clamp((uv.x + (1.0 - uv.y)) * 0.5, 0.0, 1.0);
  vec3 grad = mix(colorA, colorB, smoothstep(0.0, 0.5, t));
  grad = mix(grad, colorC, smoothstep(0.5, 1.0, t));
  outputColor = vec4(grad * color.rgb, color.a);
}
`;

type RGB = [number, number, number];

class RetroEffectImpl extends Effect {
  public uniforms: Map<string, THREE.Uniform>;
  constructor() {
    const uniforms = new Map<string, THREE.Uniform>([
      ["colorNum", new THREE.Uniform(4.0)],
      ["pixelSize", new THREE.Uniform(2.0)],
      ["colorA", new THREE.Uniform(new THREE.Color(1, 1, 1))],
      ["colorB", new THREE.Uniform(new THREE.Color(1, 1, 1))],
      ["colorC", new THREE.Uniform(new THREE.Color(1, 1, 1))],
    ]);
    super("RetroEffect", ditherFragmentShader, { uniforms } as any);
    this.uniforms = uniforms;
  }
  set colorNum(v: number) { this.uniforms.get("colorNum")!.value = v; }
  get colorNum(): number { return this.uniforms.get("colorNum")!.value; }
  set pixelSize(v: number) { this.uniforms.get("pixelSize")!.value = v; }
  get pixelSize(): number { return this.uniforms.get("pixelSize")!.value; }
  set colorA(v: RGB) { (this.uniforms.get("colorA")!.value as THREE.Color).setRGB(v[0], v[1], v[2]); }
  set colorB(v: RGB) { (this.uniforms.get("colorB")!.value as THREE.Color).setRGB(v[0], v[1], v[2]); }
  set colorC(v: RGB) { (this.uniforms.get("colorC")!.value as THREE.Color).setRGB(v[0], v[1], v[2]); }
}

const RetroEffect = wrapEffect(RetroEffectImpl) as unknown as React.ComponentType<{
  colorNum?: number;
  pixelSize?: number;
  colorA?: RGB;
  colorB?: RGB;
  colorC?: RGB;
}>;

type WaveProps = {
  waveSpeed: number;
  waveFrequency: number;
  waveAmplitude: number;
  waveColor: [number, number, number];
  waveColor2: [number, number, number];
  waveColor3: [number, number, number];
  waveContrast: number;
  waveGain: number;
  colorNum: number;
  pixelSize: number;
  disableAnimation: boolean;
  enableMouseInteraction: boolean;
  mouseRadius: number;
};

function DitheredWaves(props: WaveProps) {
  const {
    waveSpeed, waveFrequency, waveAmplitude, waveColor, waveColor2, waveColor3,
    waveContrast, waveGain, colorNum, pixelSize, disableAnimation, enableMouseInteraction, mouseRadius,
  } = props;

  const mesh = useRef<THREE.Mesh>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { viewport, size, gl } = useThree();

  const waveUniformsRef = useRef({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    waveContrast: new THREE.Uniform(waveContrast),
    waveGain: new THREE.Uniform(waveGain),
    mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
    enableMouseInteraction: new THREE.Uniform(enableMouseInteraction ? 1 : 0),
    mouseRadius: new THREE.Uniform(mouseRadius),
  });

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const w = Math.floor(size.width * dpr);
    const h = Math.floor(size.height * dpr);
    const res = waveUniformsRef.current.resolution.value as THREE.Vector2;
    res.set(w, h);
  }, [size, gl]);

  // Window-level pointer tracking so the canvas can sit behind the UI
  // (pointer-events: none) and still react to the cursor.
  useEffect(() => {
    if (!enableMouseInteraction) return;
    function onMove(e: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      const dpr = gl.getPixelRatio();
      setMousePos({
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      });
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [enableMouseInteraction, gl]);

  useFrame(({ clock }) => {
    const u = waveUniformsRef.current;
    if (!disableAnimation) u.time.value = clock.getElapsedTime();
    u.waveSpeed.value = waveSpeed;
    u.waveFrequency.value = waveFrequency;
    u.waveAmplitude.value = waveAmplitude;
    u.waveContrast.value = waveContrast;
    u.waveGain.value = waveGain;
    u.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0;
    u.mouseRadius.value = mouseRadius;
    if (enableMouseInteraction) {
      (u.mousePos.value as THREE.Vector2).set(mousePos.x, mousePos.y);
    }
  });

  const uniforms = useMemo(() => waveUniformsRef.current, []);

  return (
    <>
      <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={waveVertexShader}
          fragmentShader={waveFragmentShader}
          uniforms={uniforms as any}
        />
      </mesh>
      <EffectComposer>
        <RetroEffect
          colorNum={colorNum}
          pixelSize={pixelSize}
          colorA={waveColor}
          colorB={waveColor2}
          colorC={waveColor3}
        />
      </EffectComposer>
    </>
  );
}

export type DitherProps = {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  waveColor2?: [number, number, number];
  waveColor3?: [number, number, number];
  waveContrast?: number;
  waveGain?: number;
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
};

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  waveColor2 = waveColor,
  waveColor3 = waveColor2,
  waveContrast = 1,
  waveGain = 1,
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
}: DitherProps) {
  return (
    <Canvas
      className="dither-container"
      camera={{ position: [0, 0, 6] }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <DitheredWaves
        waveSpeed={waveSpeed}
        waveFrequency={waveFrequency}
        waveAmplitude={waveAmplitude}
        waveColor={waveColor}
        waveColor2={waveColor2}
        waveColor3={waveColor3}
        waveContrast={waveContrast}
        waveGain={waveGain}
        colorNum={colorNum}
        pixelSize={pixelSize}
        disableAnimation={disableAnimation}
        enableMouseInteraction={enableMouseInteraction}
        mouseRadius={mouseRadius}
      />
    </Canvas>
  );
}
